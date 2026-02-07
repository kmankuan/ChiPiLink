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
from ..models.textbook_order import OrderItemStatus, DEFAULT_STATUS_MAPPING
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
        item_name = f"{order['student_name']} - {order['grade']} - ${total:.2f}"
        items_text = ", ".join([f"{i['book_name']} (x{i['quantity_ordered']})" for i in selected_items])

        grade = order["grade"]
        grade_map = {str(i): f"Grade {i}" for i in range(1, 13)}
        grade_map.update({"K4": "K4", "K5": "K5"})
        monday_grade = grade_map.get(grade, f"Grade {grade}" if grade.isdigit() else grade)

        # Build column values from mapping
        column_values = {}
        field_map = {
            "student": order["student_name"],
            "guardian": f"{user_name} ({user_email})",
            "grade": {"labels": [monday_grade]},
            "books": items_text[:2000],
            "total": total,
            "status": {"label": "Working on it"},
            "order_id": order["order_id"],
            "date": {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        }
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
                    "status": {"label": "Pendiente"},
                }
                for field, value in sub_fields.items():
                    col_id = subitem_mapping.get(field)
                    if col_id:
                        subitem_values[col_id] = value

                try:
                    sub_id = await self.client.create_subitem(
                        item_id, f"{item['book_name']} (x{item['quantity_ordered']})",
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

    async def sync_order_statuses(self, order_id: str) -> dict:
        """Manual sync: fetch all subitem statuses from Monday.com"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise ValueError("Order not found")

        monday_item_ids = order.get("monday_item_ids", [])
        if not monday_item_ids:
            return {"synced": False, "reason": "Order not linked to Monday.com"}

        status_mapping = await self.get_status_mapping() or DEFAULT_STATUS_MAPPING
        board_config = await self.get_board_config()
        sub_mapping = board_config.get("subitem_column_mapping", {})
        status_col = sub_mapping.get("status", "status")

        items = order.get("items", [])
        items_updated = 0

        for mid in monday_item_ids:
            try:
                subitems = await self.client.get_subitems(mid)
                for si in subitems:
                    si_id = str(si.get("id"))
                    status_text = ""
                    for col in si.get("column_values", []):
                        if col.get("id") == status_col:
                            status_text = col.get("text", "")
                            break
                    if not status_text:
                        continue
                    new_status = status_mapping.get(status_text)
                    if not new_status:
                        continue
                    for item in items:
                        if item.get("monday_subitem_id") == si_id and item.get("status") != new_status:
                            item["status"] = new_status
                            item["status_updated_at"] = datetime.now(timezone.utc).isoformat()
                            item["status_source"] = "manual_sync"
                            items_updated += 1
                            break
            except Exception as e:
                logger.error(f"Error syncing item {mid}: {e}")

        if items_updated:
            await db.store_textbook_orders.update_one(
                {"order_id": order_id},
                {"$set": {"items": items, "last_synced_at": datetime.now(timezone.utc).isoformat()}}
            )

        return {"synced": True, "items_updated": items_updated}


# Singleton
textbook_monday_adapter = TextbookMondayAdapter()
