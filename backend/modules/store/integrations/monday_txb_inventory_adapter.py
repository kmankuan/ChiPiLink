"""
TXB (Textbook) Inventory — Monday.com Adapter
Handles textbooks board sync: find textbook by code, create subitem per student order.
Each subitem = one student who ordered that textbook. Monday.com auto-counts subitems.
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
    """Adapter for textbook inventory board — creates subitems per student order"""

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
                "grade": None,
                "publisher": None,
                "unit_price": None,
            }),
            "subitem_column_mapping": config.get("subitem_column_mapping", {
                "quantity": None,
                "date": None,
            }),
        }

    async def save_txb_inventory_config(self, data: Dict) -> bool:
        """Save TXB inventory board configuration"""
        return await monday_config.save(TXB_INVENTORY_KEY, data)

    async def update_inventory(
        self,
        ordered_items: List[Dict],
        student_name: str = "",
        order_reference: str = ""
    ) -> Dict:
        """Update TXB inventory board after an order is placed.
        For each book: find by code on the textbooks board, create if missing,
        then add a subitem with the student name + order reference.
        """
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        enabled = config.get("enabled", False)
        col_map = config.get("column_mapping", {})
        sub_col_map = config.get("subitem_column_mapping", {})

        if not enabled or not board_id:
            return {"subitems_created": 0, "items_created": 0, "skipped": True}

        code_col = col_map.get("code")
        if not code_col:
            return {"subitems_created": 0, "items_created": 0, "error": "Column mapping incomplete (need code)"}

        # Build subitem name: "Student Name - ORD-XXXX"
        subitem_name = student_name
        if order_reference:
            subitem_name = f"{student_name} - {order_reference}"

        items_created = 0
        subitems_created = 0

        from datetime import datetime, timezone

        for item in ordered_items:
            book_code = item.get("book_code", "")
            book_name = item.get("book_name", "")
            quantity = item.get("quantity_ordered", 1)

            if not book_code:
                logger.warning(f"Skipping inventory update for '{book_name}': no book code")
                continue

            try:
                # 1. Search for existing textbook item by book code
                found = await self.client.search_items_by_column(board_id, code_col, book_code)

                if found:
                    parent_item_id = found[0]["id"]
                    logger.info(f"TXB Inventory: found '{book_code}' as item {parent_item_id}")
                else:
                    # 2. Create new textbook item if not found
                    new_values = {}
                    if code_col:
                        new_values[code_col] = book_code
                    name_col = col_map.get("name")
                    if name_col:
                        new_values[name_col] = book_name
                    if col_map.get("grade") and item.get("grade"):
                        new_values[col_map["grade"]] = item["grade"]
                    if col_map.get("publisher") and item.get("publisher"):
                        new_values[col_map["publisher"]] = item["publisher"]
                    if col_map.get("unit_price") and item.get("price"):
                        new_values[col_map["unit_price"]] = str(item["price"])

                    group_id = config.get("group_id")
                    parent_item_id = await self.client.create_item(
                        board_id, book_name or book_code, new_values, group_id
                    )
                    if not parent_item_id:
                        logger.error(f"TXB Inventory: failed to create item for '{book_code}'")
                        continue
                    items_created += 1
                    logger.info(f"TXB Inventory: created '{book_code}' as item {parent_item_id}")

                # 3. Create subitem under the textbook item with student name
                subitem_values = {}
                qty_col = sub_col_map.get("quantity")
                if qty_col:
                    subitem_values[qty_col] = str(quantity)
                date_col = sub_col_map.get("date")
                if date_col:
                    subitem_values[date_col] = {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}

                sub_id = await self.client.create_subitem(
                    parent_item_id, subitem_name, subitem_values
                )
                if sub_id:
                    subitems_created += 1
                    logger.info(f"TXB Inventory: created subitem '{subitem_name}' under '{book_code}'")
                else:
                    logger.error(f"TXB Inventory: failed to create subitem for '{book_code}'")

            except Exception as e:
                logger.error(f"TXB Inventory error for '{book_code}': {e}")

        return {"subitems_created": subitems_created, "items_created": items_created}


# Singleton
txb_inventory_adapter = TxbInventoryAdapter()
