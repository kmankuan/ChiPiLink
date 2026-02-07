"""
TXB (Textbook) Inventory — Monday.com Adapter
Handles inventory board updates: find by book code and increment, or create new.
Config namespace: store.textbook_orders.txb_inventory
"""
from typing import Dict, List
import logging
import json

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.config_manager import monday_config

logger = logging.getLogger(__name__)

# Config key for TXB inventory
TXB_INVENTORY_KEY = "store.textbook_orders.txb_inventory"


class TxbInventoryAdapter(BaseMondayAdapter):
    """Adapter for textbook inventory board — tracks ordered quantities"""

    MODULE = "store"
    ENTITY = "textbook_orders"

    async def get_txb_inventory_config(self) -> Dict:
        """Get TXB inventory board configuration"""
        config = await monday_config.get(TXB_INVENTORY_KEY)
        return {
            "board_id": config.get("board_id"),
            "enabled": config.get("enabled", False),
            "group_id": config.get("group_id"),
            "column_mapping": config.get("column_mapping", {
                "code": None,
                "name": None,
                "ordered_count": None,
                "grade": None,
                "publisher": None,
                "unit_price": None,
            }),
        }

    async def save_txb_inventory_config(self, data: Dict) -> bool:
        """Save TXB inventory board configuration"""
        return await monday_config.save(TXB_INVENTORY_KEY, data)

    async def update_inventory(self, ordered_items: List[Dict]) -> Dict:
        """Update TXB inventory board after an order is placed.
        For each book: find by code and increment count, or create new row.
        """
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        enabled = config.get("enabled", False)
        col_map = config.get("column_mapping", {})

        if not enabled or not board_id:
            return {"updated": 0, "created": 0, "skipped": True}

        code_col = col_map.get("code")
        count_col = col_map.get("ordered_count")
        name_col = col_map.get("name")

        if not code_col or not count_col:
            return {"updated": 0, "created": 0, "error": "Column mapping incomplete (need code + ordered_count)"}

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
                # Search for existing item by book code
                found = await self.client.search_items_by_column(board_id, code_col, book_code)

                if found:
                    existing = found[0]
                    existing_id = existing["id"]
                    current_count = 0

                    for col in existing.get("column_values", []):
                        if col.get("id") == count_col:
                            try:
                                current_count = int(float(col.get("text", "0") or "0"))
                            except (ValueError, TypeError):
                                current_count = 0
                            break

                    new_count = current_count + quantity
                    await self.client.update_column_values(
                        board_id, existing_id, {count_col: str(new_count)}
                    )
                    updated += 1
                    logger.info(f"TXB Inventory: '{book_code}' count {current_count} -> {new_count}")

                else:
                    # Create new row
                    new_values = {
                        code_col: book_code,
                        count_col: str(quantity),
                    }
                    if name_col:
                        new_values[name_col] = book_name
                    if col_map.get("grade") and item.get("grade"):
                        new_values[col_map["grade"]] = item["grade"]
                    if col_map.get("publisher") and item.get("publisher"):
                        new_values[col_map["publisher"]] = item["publisher"]
                    if col_map.get("unit_price") and item.get("price"):
                        new_values[col_map["unit_price"]] = str(item["price"])

                    await self.client.create_item(board_id, book_name, new_values)
                    created += 1
                    logger.info(f"TXB Inventory: created '{book_code}' with count {quantity}")

            except Exception as e:
                logger.error(f"TXB Inventory error for '{book_code}': {e}")

        return {"updated": updated, "created": created}


# Singleton
txb_inventory_adapter = TxbInventoryAdapter()
