"""
TextbookBoardSync — Syncs order data to the TB2026-Textbooks Monday.com board.
Each textbook on the board gets subitems for each student who purchased it.
"""
import logging
import asyncio
from typing import Dict, List, Optional
from datetime import datetime, timezone
from core.database import db
from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

TEXTBOOKS_BOARD_ID = "18397140920"


class TextbookBoardSync:

    async def _get_board_items_map(self) -> Dict[str, str]:
        """Get mapping of book_code → monday_item_id from the Textbooks board.
        Caches in DB for performance."""
        cache = await db.app_config.find_one({"key": "textbooks_board_map"}, {"_id": 0})
        if cache and cache.get("map"):
            # Use cache if less than 1 hour old
            cached_at = cache.get("cached_at", "")
            if cached_at:
                try:
                    age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)).total_seconds()
                    if age < 3600:
                        return cache["map"]
                except Exception:
                    pass

        # Fetch from Monday.com
        items = await monday_client.get_board_items(TEXTBOOKS_BOARD_ID, limit=500)
        code_map = {}
        for item in items:
            item_id = str(item.get("id", ""))
            name = item.get("name", "")
            # Try to extract code from item name or columns
            code = ""
            for col in item.get("column_values", []):
                if col.get("id") in ("text", "code", "texto"):
                    code = col.get("text", "")
                    break
            # Also try parsing code from name (e.g., "G5-1 Science 5")
            if not code and " " in name:
                parts = name.split(" ", 1)
                if parts[0] and "-" in parts[0]:
                    code = parts[0]
            if code:
                code_map[code] = item_id
            # Also map by full name
            code_map[name] = item_id

        # Cache the map
        await db.app_config.update_one(
            {"key": "textbooks_board_map"},
            {"$set": {"key": "textbooks_board_map", "map": code_map, "cached_at": datetime.now(timezone.utc).isoformat(), "item_count": len(code_map)}},
            upsert=True,
        )
        logger.info(f"[textbook_sync] Built board map: {len(code_map)} items")
        return code_map

    async def sync_order_to_textbooks_board(self, order: Dict) -> Dict:
        """Sync a single order's items to the Textbooks board as subitems."""
        order_id = order.get("order_id", "")
        student_name = order.get("student_name", "Unknown")
        items = order.get("items", [])
        grade = order.get("grade", "")

        board_map = await self._get_board_items_map()
        synced = 0
        skipped = 0
        errors = 0

        for item in items:
            qty = item.get("quantity_ordered", 0)
            if qty <= 0:
                continue

            book_code = item.get("book_code", "")
            book_name = item.get("book_name", "")

            # Find matching Monday.com item by code or name
            monday_item_id = board_map.get(book_code) or board_map.get(book_name)
            if not monday_item_id:
                logger.debug(f"[textbook_sync] No board match for code={book_code} name={book_name}")
                skipped += 1
                continue

            # Check if subitem already exists for this student+order
            sync_key = f"{order_id}_{item.get('book_id', '')}"
            existing = await db.textbook_board_subitems.find_one(
                {"sync_key": sync_key}, {"_id": 0}
            )
            if existing:
                skipped += 1
                continue

            # Create subitem on Monday.com
            try:
                subitem_name = student_name
                subitem_id = await monday_client.create_subitem(
                    parent_item_id=monday_item_id,
                    item_name=subitem_name,
                    column_values=None,
                )
                if subitem_id:
                    # Track the sync
                    await db.textbook_board_subitems.insert_one({
                        "sync_key": sync_key,
                        "order_id": order_id,
                        "book_id": item.get("book_id", ""),
                        "book_code": book_code,
                        "student_name": student_name,
                        "grade": grade,
                        "monday_parent_item_id": monday_item_id,
                        "monday_subitem_id": subitem_id,
                        "synced_at": datetime.now(timezone.utc).isoformat(),
                    })
                    synced += 1
                    logger.info(f"[textbook_sync] Created subitem {subitem_id} for {student_name} → {book_code}")
                else:
                    errors += 1
            except Exception as e:
                logger.error(f"[textbook_sync] Error creating subitem for {book_code}: {e}")
                errors += 1

            # Throttle to avoid rate limits
            await asyncio.sleep(0.3)

        return {"order_id": order_id, "synced": synced, "skipped": skipped, "errors": errors}

    async def remove_item_from_board(self, order_id: str, book_id: str) -> bool:
        """Remove a subitem from the Textbooks board when an item is removed from an order."""
        sync_key = f"{order_id}_{book_id}"
        record = await db.textbook_board_subitems.find_one({"sync_key": sync_key}, {"_id": 0})
        if not record:
            return False

        subitem_id = record.get("monday_subitem_id")
        if subitem_id:
            try:
                await monday_client.delete_item(subitem_id)
                logger.info(f"[textbook_sync] Deleted subitem {subitem_id} for order={order_id} book={book_id}")
            except Exception as e:
                logger.warning(f"[textbook_sync] Failed to delete subitem {subitem_id}: {e}")

        await db.textbook_board_subitems.delete_one({"sync_key": sync_key})
        return True

    async def add_item_to_board(self, order_id: str, order: Dict, book_id: str) -> Optional[str]:
        """Add a subitem to the Textbooks board when an item is added to an order."""
        student_name = order.get("student_name", "Unknown")
        item = next((i for i in order.get("items", []) if i.get("book_id") == book_id), None)
        if not item or item.get("quantity_ordered", 0) <= 0:
            return None

        board_map = await self._get_board_items_map()
        book_code = item.get("book_code", "")
        book_name = item.get("book_name", "")
        monday_item_id = board_map.get(book_code) or board_map.get(book_name)
        if not monday_item_id:
            return None

        sync_key = f"{order_id}_{book_id}"
        try:
            subitem_id = await monday_client.create_subitem(
                parent_item_id=monday_item_id,
                item_name=student_name,
            )
            if subitem_id:
                await db.textbook_board_subitems.insert_one({
                    "sync_key": sync_key,
                    "order_id": order_id,
                    "book_id": book_id,
                    "book_code": book_code,
                    "student_name": student_name,
                    "grade": order.get("grade", ""),
                    "monday_parent_item_id": monday_item_id,
                    "monday_subitem_id": subitem_id,
                    "synced_at": datetime.now(timezone.utc).isoformat(),
                })
                return subitem_id
        except Exception as e:
            logger.error(f"[textbook_sync] Error adding subitem: {e}")
        return None

    async def sync_all_unsynced(self) -> Dict:
        """Find all orders with ordered items not yet synced to the Textbooks board and sync them."""
        # Get all orders that have ordered items
        orders = await db.store_textbook_orders.find(
            {"items": {"$elemMatch": {"quantity_ordered": {"$gt": 0}}}},
            {"_id": 0}
        ).to_list(500)

        total_synced = 0
        total_skipped = 0
        total_errors = 0
        orders_processed = 0

        for order in orders:
            result = await self.sync_order_to_textbooks_board(order)
            total_synced += result["synced"]
            total_skipped += result["skipped"]
            total_errors += result["errors"]
            if result["synced"] > 0:
                orders_processed += 1

        return {
            "orders_checked": len(orders),
            "orders_synced": orders_processed,
            "items_synced": total_synced,
            "items_skipped": total_skipped,
            "errors": total_errors,
        }

    async def invalidate_cache(self):
        """Force refresh of the board items map."""
        await db.app_config.delete_one({"key": "textbooks_board_map"})


textbook_board_sync = TextbookBoardSync()
