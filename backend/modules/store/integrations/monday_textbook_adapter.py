"""
Textbook Orders — Monday.com Adapter
Handles: order sync, subitems per book, subitem status webhook, chat/updates.
Config namespace: store.textbook_orders.*
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import json

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.config_manager import monday_config
from core.database import db

logger = logging.getLogger(__name__)


class TextbookMondayAdapter(BaseMondayAdapter):
    """Monday.com adapter for textbook orders"""

    MODULE = "store"
    ENTITY = "textbook_orders"

    # ---- Order Sync ----

    async def sync_order_to_monday(
        self, order: Dict, selected_items: List[Dict],
        user_name: str, user_email: str, submission_total: float = None
    ) -> Dict:
        """Create item + subitems on Monday.com for a textbook order"""
        board_config = await self.get_board_config()
        board_id = board_config.get("board_id")
        group_id = board_config.get("group_id")
        column_mapping = board_config.get("column_mapping", {})
        subitems_enabled = board_config.get("subitems_enabled", False)
        subitem_mapping = board_config.get("subitem_column_mapping", {})

        if not board_id:
            raise ValueError("Monday.com textbook orders board not configured")

        total = submission_total if submission_total is not None else order.get("total_amount", 0)
        order_ref = order['order_id'][-8:]
        item_name = f"{order['student_name']} - {order['grade']} - ${total:.2f} ({order_ref})"
        items_text = ", ".join([f"{i['book_name']} (x{i['quantity_ordered']})" for i in selected_items])

        # Grade → Monday.com status label (must match board labels exactly)
        grade = str(order["grade"])
        grade_label_map = {
            "1": "G1", "2": "G2", "3": "G3", "4": "G4", "5": "G5",
            "6": "G6", "7": "G7", "8": "G8", "9": "G9", "10": "G10",
            "11": "G11", "12": "G12", "K4": "K4", "K5": "K5",
        }
        monday_grade_label = grade_label_map.get(grade, f"G{grade}" if grade.isdigit() else grade)

        # Build column values from mapping
        column_values = {}
        field_map = {
            "student": order["student_name"],
            "guardian": f"{user_name} ({user_email})",
            "grade": {"label": monday_grade_label},
            "books": items_text[:2000],
            "total": total,
            "status": {"label": "Working on it"},
            "order_id": order["order_id"],
            "date": {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
            "notes": order.get("form_data", {}).get("notes", ""),
        }
        
        # Handle email column (requires special format)
        if user_email:
            field_map["email"] = {"email": user_email, "text": user_email}
        
        # Handle phone column (requires E.164 format)
        import re
        phone = order.get("form_data", {}).get("phone", "")
        if phone:
            clean_phone = re.sub(r'[^\d+]', '', phone)
            field_map["phone"] = {"phone": clean_phone, "text": phone}
        
        for field, value in field_map.items():
            col_id = column_mapping.get(field)
            if col_id:
                column_values[col_id] = value

        # 1. Create main item
        item_id = await self.client.create_item(
            board_id, item_name, column_values, group_id
        )
        if not item_id:
            raise ValueError("Failed to create Monday.com item")

        logger.info(f"Created Monday.com item {item_id} for order {order['order_id']}")

        # 2. Create order summary Update
        summary = self._build_order_summary(order, selected_items, user_name, user_email, total)
        try:
            await self.client.create_update(item_id, summary)
        except Exception as e:
            logger.warning(f"Failed to create order update: {e}")

        # 3. Create subitems for each book
        subitems = []
        if subitems_enabled:
            for item in selected_items:
                subitem_values = {}
                sub_fields = {
                    "quantity": item["quantity_ordered"],
                    "unit_price": item["price"],
                    "subtotal": item["price"] * item["quantity_ordered"],
                    "code": item.get("book_code", ""),
                    "status": {"label": "Recibido"},
                }
                for field, value in sub_fields.items():
                    col_id = subitem_mapping.get(field)
                    if col_id:
                        subitem_values[col_id] = value

                try:
                    book_code = item.get("book_code", "")
                    book_name = item["book_name"]
                    sub_name = f"{book_code} {book_name}" if book_code else book_name
                    sub_id = await self.client.create_subitem(
                        item_id, sub_name,
                        subitem_values
                    )
                    if sub_id:
                        subitems.append({"book_id": item["book_id"], "monday_subitem_id": sub_id})
                except Exception as e:
                    logger.error(f"Failed to create subitem for {item['book_name']}: {e}")

        return {"item_id": item_id, "subitems": subitems}

    def _build_order_summary(
        self, order: Dict, items: List[Dict],
        user_name: str, user_email: str, total: float
    ) -> str:
        lines = [
            "New Textbook Order",
            "",
            f"Student: {order['student_name']}",
            f"Grade: {order['grade']}",
            f"School Year: {order['year']}",
            "",
            f"Client: {user_name}",
            f"Email: {user_email}",
            "",
            "Books Ordered:",
        ]
        for item in items:
            lines.append(f"  - {item['book_name']} - ${item['price']:.2f} x{item['quantity_ordered']}")
        lines.extend(["", f"Total: ${total:.2f}", f"Order ID: {order['order_id']}"])
        return "\n".join(lines)

    # ---- Subitem Status Sync (webhook handler) ----

    async def handle_subitem_status_webhook(self, event: dict) -> dict:
        """Process a webhook event for subitem status change"""
        pulse_id = str(event.get("pulseId", ""))
        column_value = event.get("value", {})

        new_label = ""
        if isinstance(column_value, dict):
            label_data = column_value.get("label", {})
            new_label = label_data.get("text", "") if isinstance(label_data, dict) else str(label_data)
        elif isinstance(column_value, str):
            new_label = column_value

        if not pulse_id or not new_label:
            return {"processed": False, "reason": "Missing subitem ID or status label"}

        # Get status mapping
        from modules.sysbook.models.textbook_order import DEFAULT_STATUS_MAPPING
        status_mapping = await self.get_status_mapping() or DEFAULT_STATUS_MAPPING
        new_app_status = status_mapping.get(new_label)
        if not new_app_status:
            return {"processed": False, "reason": f"Unknown status label: {new_label}"}

        # Find order containing this subitem
        order = await db.store_textbook_orders.find_one(
            {"items.monday_subitem_id": pulse_id}, {"_id": 0}
        )
        if not order:
            return {"processed": False, "reason": "Order not found for subitem"}

        # Update matching item status
        items = order.get("items", [])
        updated = False
        for item in items:
            if item.get("monday_subitem_id") == pulse_id:
                item["status"] = new_app_status
                item["status_updated_at"] = datetime.now(timezone.utc).isoformat()
                item["status_source"] = "monday_webhook"
                updated = True
                logger.info(f"Book '{item.get('book_name')}' status -> {new_app_status}")
                break

        if updated:
            await db.store_textbook_orders.update_one(
                {"order_id": order["order_id"]},
                {"$set": {"items": items, "last_synced_at": datetime.now(timezone.utc).isoformat()}}
            )

        return {"processed": updated, "order_id": order.get("order_id"), "new_status": new_app_status}

    # ---- Order-Level Status Sync (parent item webhook) ----

    # Default mapping from Monday.com order status labels → app order statuses
    ORDER_STATUS_MAPPING = {
        "Working on it": "processing",
        "Procesando": "processing",
        "Listo": "ready",
        "Ready": "ready",
        "Entregado": "delivered",
        "Delivered": "delivered",
        "Done": "delivered",
        "Cancelled": "cancelled",
        "Cancelado": "cancelled",
        "Stuck": "processing",
        "Awaiting Link": "awaiting_link",
        "Submitted": "submitted",
        "Recibido": "submitted",
    }

    async def get_order_status_mapping(self) -> Dict:
        """Get the order-level status mapping (Monday label → app status)"""
        config = await monday_config.get(self._key("order_status_mapping"))
        return config.get("mapping", self.ORDER_STATUS_MAPPING)

    async def save_order_status_mapping(self, mapping: Dict) -> bool:
        return await monday_config.save(self._key("order_status_mapping"), {"mapping": mapping})

    async def handle_order_status_webhook(self, event: dict) -> dict:
        """Process a webhook event for parent item (order) status change.
        Distinguishes from subitem events by checking parentItemId."""
        parent_item_id = event.get("parentItemId")
        pulse_id = str(event.get("pulseId", ""))
        column_id = event.get("columnId", "")

        # If parentItemId exists, this is a subitem event → delegate to existing handler
        if parent_item_id:
            return await self.handle_subitem_status_webhook(event)

        # This is a parent item event — extract the new status label
        column_value = event.get("value", {})
        new_label = ""
        if isinstance(column_value, dict):
            label_data = column_value.get("label", {})
            new_label = label_data.get("text", "") if isinstance(label_data, dict) else str(label_data)
        elif isinstance(column_value, str):
            new_label = column_value

        if not pulse_id or not new_label:
            return {"processed": False, "reason": "Missing item ID or status label"}

        # Map Monday.com label to app status
        order_mapping = await self.get_order_status_mapping()
        new_app_status = order_mapping.get(new_label)
        if not new_app_status:
            logger.info(f"[order_status_webhook] Unknown order status label: '{new_label}'. Registered: {list(order_mapping.keys())}")
            return {"processed": False, "reason": f"Unknown order status label: {new_label}"}

        # Find order by monday_item_id
        order = await db.store_textbook_orders.find_one(
            {"$or": [
                {"monday_item_id": pulse_id},
                {"monday_item_ids": pulse_id},
            ]},
            {"_id": 0}
        )
        if not order:
            return {"processed": False, "reason": f"No order linked to Monday item {pulse_id}"}

        old_status = order.get("status", "")
        if old_status == new_app_status:
            return {"processed": False, "reason": "Status unchanged"}

        # Update order status
        now = datetime.now(timezone.utc).isoformat()
        await db.store_textbook_orders.update_one(
            {"order_id": order["order_id"]},
            {"$set": {
                "status": new_app_status,
                "status_updated_at": now,
                "status_source": "monday_webhook",
                "last_synced_at": now,
            }}
        )

        logger.info(f"[order_status_webhook] Order {order['order_id']} status: {old_status} → {new_app_status} (from Monday label '{new_label}')")

        # Fire push notification to the user
        try:
            from modules.notifications.push_helpers import notify_order_status
            import asyncio as _asyncio
            user_id = order.get("user_id")
            if user_id:
                _asyncio.create_task(notify_order_status(
                    user_id, order.get("student_name", ""), order["order_id"], new_app_status
                ))
        except Exception:
            pass

        return {
            "processed": True,
            "order_id": order["order_id"],
            "old_status": old_status,
            "new_status": new_app_status,
            "monday_label": new_label,
        }


# Singleton
textbook_monday_adapter = TextbookMondayAdapter()
