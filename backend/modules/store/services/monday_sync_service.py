"""
Monday.com Sync Service
Handles webhook processing, subitem status sync, and inventory board updates.
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import httpx
import json

from core.database import db
from core.config import MONDAY_API_KEY
from .monday_config_service import monday_config_service
from ..models.textbook_order import OrderItemStatus, DEFAULT_STATUS_MAPPING

logger = logging.getLogger(__name__)

MONDAY_API_URL = "https://api.monday.com/v2"


class MondaySyncService:
    """Handles bidirectional sync between app and Monday.com"""

    async def _get_api_key(self) -> Optional[str]:
        """Get active Monday.com API key"""
        try:
            ws_config = await monday_config_service.get_workspaces()
            active_id = ws_config.get("active_workspace_id")
            for ws in ws_config.get("workspaces", []):
                if ws.get("workspace_id") == active_id and ws.get("api_key"):
                    return ws["api_key"]
        except Exception as e:
            logger.debug(f"Could not load workspace config: {e}")
        return MONDAY_API_KEY or None

    async def _monday_request(self, query: str) -> dict:
        """Execute a Monday.com GraphQL request"""
        api_key = await self._get_api_key()
        if not api_key:
            raise ValueError("Monday.com API key not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                MONDAY_API_URL,
                json={"query": query},
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json"
                },
                timeout=20.0
            )
            data = response.json()

        if "errors" in data:
            logger.error(f"Monday.com API error: {data['errors']}")
            raise ValueError(f"Monday.com error: {data['errors']}")

        return data.get("data", {})

    # ========== WEBHOOK REGISTRATION ==========

    async def register_webhook(self, board_id: str, webhook_url: str) -> dict:
        """Register a webhook with Monday.com for subitem status changes"""
        query = f'''
        mutation {{
            create_webhook (
                board_id: {board_id},
                url: "{webhook_url}",
                event: change_subitem_column_value
            ) {{
                id
                board_id
            }}
        }}
        '''

        data = await self._monday_request(query)
        webhook = data.get("create_webhook", {})
        webhook_id = webhook.get("id")

        if webhook_id:
            await monday_config_service.save_webhook_config({
                "webhook_id": webhook_id,
                "webhook_url": webhook_url,
                "board_id": board_id,
                "registered_at": datetime.now(timezone.utc).isoformat()
            })
            logger.info(f"Registered Monday.com webhook {webhook_id} for board {board_id}")

        return {"webhook_id": webhook_id, "board_id": board_id}

    async def unregister_webhook(self) -> bool:
        """Remove existing webhook"""
        wh_config = await monday_config_service.get_webhook_config()
        webhook_id = wh_config.get("webhook_id")
        if not webhook_id:
            return True

        try:
            query = f'mutation {{ delete_webhook (id: {webhook_id}) {{ id }} }}'
            await self._monday_request(query)
        except Exception as e:
            logger.warning(f"Could not delete webhook {webhook_id}: {e}")

        await monday_config_service.save_webhook_config({
            "webhook_id": None,
            "webhook_url": None,
            "registered_at": None
        })
        return True

    # ========== SUBITEM STATUS SYNC (Webhook handler) ==========

    async def process_webhook_event(self, event: dict) -> dict:
        """Process a Monday.com webhook event for subitem status change"""
        pulse_id = str(event.get("pulseId", ""))
        column_id = event.get("columnId", "")
        column_value = event.get("value", {})

        new_label = ""
        if isinstance(column_value, dict):
            new_label = column_value.get("label", {}).get("text", "") if isinstance(column_value.get("label"), dict) else str(column_value.get("label", ""))
        elif isinstance(column_value, str):
            new_label = column_value

        logger.info(f"Webhook: subitem {pulse_id}, column {column_id}, new value: {new_label}")

        if not pulse_id or not new_label:
            return {"processed": False, "reason": "Missing subitem ID or status label"}

        # Get status mapping config
        config = await monday_config_service.get_config()
        status_mapping = config.get("status_mapping", DEFAULT_STATUS_MAPPING)

        new_app_status = status_mapping.get(new_label)
        if not new_app_status:
            logger.warning(f"No status mapping for Monday.com label: '{new_label}'")
            return {"processed": False, "reason": f"Unknown status label: {new_label}"}

        # Find the order containing this subitem
        order = await db.store_textbook_orders.find_one(
            {"items.monday_subitem_id": pulse_id},
            {"_id": 0}
        )

        if not order:
            logger.warning(f"No order found with subitem {pulse_id}")
            return {"processed": False, "reason": "Order not found for subitem"}

        # Update the matching item's status
        items = order.get("items", [])
        updated = False
        for item in items:
            if item.get("monday_subitem_id") == pulse_id:
                old_status = item.get("status")
                item["status"] = new_app_status
                item["status_updated_at"] = datetime.now(timezone.utc).isoformat()
                item["status_source"] = "monday_webhook"
                updated = True
                logger.info(f"Updated book '{item.get('book_name')}' status: {old_status} → {new_app_status}")
                break

        if updated:
            await db.store_textbook_orders.update_one(
                {"order_id": order["order_id"]},
                {"$set": {
                    "items": items,
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )

        return {
            "processed": updated,
            "order_id": order.get("order_id"),
            "new_status": new_app_status
        }

    async def sync_order_statuses(self, order_id: str) -> dict:
        """Manual sync: fetch subitem statuses from Monday.com and update order"""
        order = await db.store_textbook_orders.find_one(
            {"order_id": order_id}, {"_id": 0}
        )
        if not order:
            raise ValueError("Order not found")

        monday_item_ids = order.get("monday_item_ids", [])
        if not monday_item_ids:
            return {"synced": False, "reason": "Order not linked to Monday.com"}

        config = await monday_config_service.get_config()
        status_mapping = config.get("status_mapping", DEFAULT_STATUS_MAPPING)
        subitem_mapping = config.get("subitem_column_mapping", {})
        status_col_id = subitem_mapping.get("estado", "status")

        items_updated = 0
        items = order.get("items", [])

        for monday_item_id in monday_item_ids:
            query = f'''query {{
                items(ids: [{monday_item_id}]) {{
                    subitems {{
                        id
                        name
                        column_values {{
                            id
                            text
                            value
                        }}
                    }}
                }}
            }}'''

            try:
                data = await self._monday_request(query)
                monday_items = data.get("items", [])
                if not monday_items:
                    continue

                subitems = monday_items[0].get("subitems", [])

                for subitem in subitems:
                    subitem_id = str(subitem.get("id"))
                    status_text = ""

                    for col in subitem.get("column_values", []):
                        if col.get("id") == status_col_id:
                            status_text = col.get("text", "")
                            break

                    if not status_text:
                        continue

                    new_status = status_mapping.get(status_text)
                    if not new_status:
                        continue

                    for item in items:
                        if item.get("monday_subitem_id") == subitem_id:
                            if item.get("status") != new_status:
                                item["status"] = new_status
                                item["status_updated_at"] = datetime.now(timezone.utc).isoformat()
                                item["status_source"] = "manual_sync"
                                items_updated += 1
                            break

            except Exception as e:
                logger.error(f"Error syncing Monday.com item {monday_item_id}: {e}")

        if items_updated > 0:
            await db.store_textbook_orders.update_one(
                {"order_id": order_id},
                {"$set": {
                    "items": items,
                    "last_synced_at": datetime.now(timezone.utc).isoformat()
                }}
            )

        return {"synced": True, "items_updated": items_updated}

    # ========== INVENTORY BOARD UPDATE ==========

    async def update_inventory_board(self, ordered_items: List[Dict]) -> dict:
        """Update inventory board: increment ordered count for each textbook.
        If the book doesn't exist on the board, create a new row.
        """
        inv_config = await monday_config_service.get_inventory_config()
        board_id = inv_config.get("board_id")
        enabled = inv_config.get("enabled", False)
        col_map = inv_config.get("column_mapping", {})

        if not enabled or not board_id:
            logger.info("Inventory board not configured or disabled, skipping")
            return {"updated": 0, "created": 0, "skipped": True}

        code_col = col_map.get("code")
        ordered_count_col = col_map.get("ordered_count")
        name_col = col_map.get("name")

        if not code_col or not ordered_count_col:
            logger.warning("Inventory board column mapping incomplete (need code + ordered_count)")
            return {"updated": 0, "created": 0, "error": "Column mapping incomplete"}

        updated = 0
        created = 0

        for item in ordered_items:
            book_code = item.get("book_code", "")
            book_name = item.get("book_name", "")
            quantity = item.get("quantity_ordered", 1)

            if not book_code:
                logger.warning(f"Skipping inventory update for '{book_name}': no book code")
                continue

            try:
                # Search for existing item by book code on the inventory board
                search_query = f'''query {{
                    items_page_by_column_values (
                        board_id: {board_id},
                        limit: 1,
                        columns: [{{column_id: "{code_col}", column_values: ["{book_code}"]}}]
                    ) {{
                        items {{
                            id
                            name
                            column_values {{
                                id
                                text
                                value
                            }}
                        }}
                    }}
                }}'''

                data = await self._monday_request(search_query)
                found_items = data.get("items_page_by_column_values", {}).get("items", [])

                if found_items:
                    # Item exists — read current count and increment
                    existing_item = found_items[0]
                    existing_id = existing_item["id"]
                    current_count = 0

                    for col in existing_item.get("column_values", []):
                        if col.get("id") == ordered_count_col:
                            try:
                                current_count = int(float(col.get("text", "0") or "0"))
                            except (ValueError, TypeError):
                                current_count = 0
                            break

                    new_count = current_count + quantity
                    update_values = json.dumps({ordered_count_col: str(new_count)})

                    update_query = f'''mutation {{
                        change_multiple_column_values (
                            board_id: {board_id},
                            item_id: {existing_id},
                            column_values: {json.dumps(update_values)}
                        ) {{
                            id
                        }}
                    }}'''

                    await self._monday_request(update_query)
                    updated += 1
                    logger.info(f"Inventory: incremented '{book_code}' count {current_count} → {new_count}")

                else:
                    # Item doesn't exist — create new row
                    new_values = {
                        code_col: book_code,
                        ordered_count_col: str(quantity),
                    }
                    if name_col:
                        new_values[name_col] = book_name

                    grade_col = col_map.get("grade")
                    if grade_col and item.get("grade"):
                        new_values[grade_col] = item["grade"]

                    new_values_json = json.dumps(new_values)
                    create_query = f'''mutation {{
                        create_item (
                            board_id: {board_id},
                            item_name: "{book_name}",
                            column_values: {json.dumps(new_values_json)}
                        ) {{
                            id
                        }}
                    }}'''

                    await self._monday_request(create_query)
                    created += 1
                    logger.info(f"Inventory: created new item '{book_code}' with count {quantity}")

            except Exception as e:
                logger.error(f"Error updating inventory for '{book_code}': {e}")

        return {"updated": updated, "created": created}


# Singleton
monday_sync_service = MondaySyncService()
