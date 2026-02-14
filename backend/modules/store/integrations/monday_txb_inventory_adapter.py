"""
TXB (Textbook) Inventory — Monday.com Adapter
Full bidirectional sync between app inventory and Monday.com board.

Features:
- Full sync: push all textbooks to Monday.com (create or update)
- Per-student order subitems (existing behavior)
- Stock column sync: app → Monday.com when stock changes
- Webhook handler: Monday.com → app when stock column changes
- Grade-based grouping on Monday.com
- Per-column sync: sync individual columns to Monday.com

Config namespace: store.textbook_orders.txb_inventory
"""
from typing import Dict, List, Optional
import logging
import json
import asyncio
from datetime import datetime, timezone

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.config_manager import monday_config
from core.database import db

logger = logging.getLogger(__name__)

TXB_INVENTORY_KEY = "store.textbook_orders.txb_inventory"

# In-memory tracking for background column sync tasks
_column_sync_tasks: Dict[str, asyncio.Task] = {}


class TxbInventoryAdapter(BaseMondayAdapter):
    """Adapter for textbook inventory board — bidirectional sync with Monday.com"""

    MODULE = "store"
    ENTITY = "textbook_orders"

    async def get_txb_inventory_config(self) -> Dict:
        """Get TXB inventory board configuration"""
        config = await monday_config.get(TXB_INVENTORY_KEY)
        return {
            "board_id": config.get("board_id"),
            "enabled": config.get("enabled", False),
            "group_id": config.get("group_id"),
            "use_grade_groups": config.get("use_grade_groups", False),
            "column_mapping": config.get("column_mapping", {
                "code": None,
                "name": None,
                "grade": None,
                "publisher": None,
                "unit_price": None,
                "stock_quantity": None,
                "subject": None,
                "status": None,
            }),
            "subitem_column_mapping": config.get("subitem_column_mapping", {
                "quantity": None,
                "date": None,
            }),
            "webhook_config": config.get("webhook_config", {
                "webhook_id": None,
                "webhook_url": None,
                "stock_column_id": None,
            }),
            "create_item_webhook_config": config.get("create_item_webhook_config", {
                "webhook_id": None,
                "webhook_url": None,
            }),
            "last_full_sync": config.get("last_full_sync"),
            "sync_stats": config.get("sync_stats", {}),
        }

    async def save_txb_inventory_config(self, data: Dict) -> bool:
        """Save TXB inventory board configuration"""
        return await monday_config.save(TXB_INVENTORY_KEY, data)

    # ──────────── Full Sync: Push all textbooks to Monday.com ────────────

    async def full_sync(self) -> Dict:
        """Push all private catalog textbooks to Monday.com board.
        Creates new items or updates existing ones. Returns sync stats."""
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        enabled = config.get("enabled", False)
        col_map = config.get("column_mapping", {})
        use_grade_groups = config.get("use_grade_groups", False)

        if not enabled or not board_id:
            return {"error": "TXB inventory board not configured or disabled", "synced": 0}

        code_col = col_map.get("code")
        if not code_col:
            return {"error": "Book code column not mapped", "synced": 0}

        # Fetch all private catalog textbooks
        textbooks = await db.store_products.find(
            {"is_private_catalog": True, "active": True, "archived": {"$ne": True}},
            {"_id": 0}
        ).sort([("grade", 1), ("name", 1)]).to_list(500)

        if not textbooks:
            return {"synced": 0, "message": "No active textbooks found"}

        # Fetch column types for proper value formatting
        col_types = await self._get_board_column_types(board_id)

        # If using grade groups, fetch existing groups from the board
        grade_group_map = {}
        if use_grade_groups:
            grade_group_map = await self._get_or_create_grade_groups(board_id, textbooks)

        created = 0
        updated = 0
        failed = 0
        items_map = {}  # book_code -> monday_item_id

        for book in textbooks:
            book_code = book.get("code", "")
            if not book_code:
                book_code = book.get("book_id", "")

            try:
                # Search for existing item
                found = await self.client.search_items_by_column(board_id, code_col, book_code)

                # Build column values
                col_values = self._build_column_values(book, col_map, col_types)

                if found:
                    # Update existing item
                    item_id = found[0]["id"]
                    await self.client.update_column_values(board_id, item_id, col_values)
                    updated += 1
                    items_map[book_code] = item_id
                    logger.info(f"TXB Sync: updated '{book_code}' (item {item_id})")
                else:
                    # Create new item
                    group_id = None
                    if use_grade_groups:
                        grade = book.get("grade", "Other")
                        group_id = grade_group_map.get(grade, config.get("group_id"))

                    item_name = book.get("name", book_code)
                    item_id = await self.client.create_item(
                        board_id, item_name, col_values, group_id
                    )
                    if item_id:
                        created += 1
                        items_map[book_code] = item_id
                        logger.info(f"TXB Sync: created '{book_code}' (item {item_id})")
                    else:
                        failed += 1
                        logger.error(f"TXB Sync: failed to create '{book_code}'")

            except Exception as e:
                failed += 1
                logger.error(f"TXB Sync error for '{book_code}': {e}")

        # Store sync results
        sync_stats = {
            "created": created,
            "updated": updated,
            "failed": failed,
            "total_textbooks": len(textbooks),
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }
        await monday_config.save(TXB_INVENTORY_KEY, {
            **config,
            "last_full_sync": datetime.now(timezone.utc).isoformat(),
            "sync_stats": sync_stats,
        })

        # Save monday_item_id references on products for future updates
        for book_code, item_id in items_map.items():
            await db.store_products.update_one(
                {"$or": [{"code": book_code}, {"book_id": book_code}], "is_private_catalog": True},
                {"$set": {"monday_item_id": str(item_id)}}
            )

        return sync_stats

    # ──────────── Per-Column Sync (Background Task) ────────────

    async def start_column_sync(self, column_key: str) -> Dict:
        """Start a per-column sync as a background task. Returns immediately."""
        global _column_sync_tasks

        # Pre-validate before launching background task
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        enabled = config.get("enabled", False)
        col_map = config.get("column_mapping", {})

        if not enabled or not board_id:
            return {"error": "TXB inventory board not configured or disabled"}

        col_id = col_map.get(column_key)
        if column_key in ("stock_quantity", "stock"):
            col_id = col_map.get("stock_quantity") or col_map.get("stock")
        if not col_id:
            return {"error": f"Column '{column_key}' is not mapped"}

        code_col = col_map.get("code")
        if not code_col:
            return {"error": "Book code column not mapped"}

        # Check if already running
        existing = _column_sync_tasks.get(column_key)
        if existing and not existing.done():
            return {"status": "already_running", "column": column_key}

        # Set initial status in DB
        await db.monday_column_sync_status.update_one(
            {"column_key": column_key},
            {"$set": {
                "column_key": column_key,
                "status": "running",
                "updated": 0, "skipped": 0, "failed": 0, "total": 0,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "finished_at": None, "error": None,
            }},
            upsert=True,
        )

        # Launch background task
        task = asyncio.create_task(self._run_column_sync(column_key))
        _column_sync_tasks[column_key] = task

        return {"status": "started", "column": column_key}

    async def get_column_sync_status(self, column_key: str = None) -> Dict:
        """Get status of a running or completed column sync."""
        if column_key:
            doc = await db.monday_column_sync_status.find_one(
                {"column_key": column_key}, {"_id": 0}
            )
            return doc or {"status": "idle", "column_key": column_key}
        # Return all
        docs = await db.monday_column_sync_status.find({}, {"_id": 0}).to_list(20)
        return {"syncs": docs}

    async def _run_column_sync(self, column_key: str):
        """Background task: sync a single column across all textbooks."""
        try:
            config = await self.get_txb_inventory_config()
            board_id = config.get("board_id")
            col_map = config.get("column_mapping", {})
            code_col = col_map.get("code")

            textbooks = await db.store_products.find(
                {"is_private_catalog": True, "active": True, "archived": {"$ne": True}},
                {"_id": 0}
            ).to_list(500)

            total = len(textbooks)
            await db.monday_column_sync_status.update_one(
                {"column_key": column_key},
                {"$set": {"total": total}},
            )

            if not textbooks:
                await self._finish_column_sync(column_key, 0, 0, 0, total)
                return

            col_types = await self._get_board_column_types(board_id)

            updated = 0
            skipped = 0
            failed = 0

            for book in textbooks:
                book_code = book.get("code", "") or book.get("book_id", "")
                monday_item_id = book.get("monday_item_id")

                if not monday_item_id:
                    try:
                        found = await self.client.search_items_by_column(board_id, code_col, book_code)
                        if found:
                            monday_item_id = found[0]["id"]
                            await db.store_products.update_one(
                                {"$or": [{"code": book_code}, {"book_id": book_code}], "is_private_catalog": True},
                                {"$set": {"monday_item_id": str(monday_item_id)}}
                            )
                    except Exception:
                        pass

                if not monday_item_id:
                    skipped += 1
                    continue

                col_values = self._build_single_column_value(book, column_key, col_map, col_types)
                if not col_values:
                    skipped += 1
                    continue

                try:
                    needs_labels = self._needs_create_labels(col_values, col_types)
                    await self.client.update_column_values(
                        board_id, monday_item_id, col_values,
                        create_labels_if_missing=needs_labels
                    )
                    updated += 1
                    logger.info(f"Column sync '{column_key}': updated '{book_code}' (item {monday_item_id})")
                except Exception as e:
                    failed += 1
                    logger.error(f"Column sync '{column_key}' error for '{book_code}': {e}")

            await self._finish_column_sync(column_key, updated, skipped, failed, total)

        except Exception as e:
            logger.error(f"Column sync '{column_key}' background task error: {e}")
            await db.monday_column_sync_status.update_one(
                {"column_key": column_key},
                {"$set": {"status": "error", "error": str(e),
                          "finished_at": datetime.now(timezone.utc).isoformat()}},
            )

    async def _finish_column_sync(self, column_key, updated, skipped, failed, total):
        await db.monday_column_sync_status.update_one(
            {"column_key": column_key},
            {"$set": {
                "status": "completed",
                "updated": updated, "skipped": skipped, "failed": failed, "total": total,
                "finished_at": datetime.now(timezone.utc).isoformat(),
            }},
        )

    async def _get_board_column_types(self, board_id: str) -> Dict[str, str]:
        """Fetch column types from Monday.com board. Returns {column_id: column_type}."""
        try:
            data = await self.client.execute(
                f'query {{ boards(ids: [{board_id}]) {{ columns {{ id type }} }} }}'
            )
            boards = data.get("boards", [])
            if boards:
                return {c["id"]: c["type"] for c in boards[0].get("columns", [])}
        except Exception as e:
            logger.warning(f"Failed to fetch column types for board {board_id}: {e}")
        return {}

    def _format_column_value(self, value, col_type: str):
        """Format a value according to its Monday.com column type."""
        if not value and value != 0:
            return value
        if col_type == "dropdown":
            # Dropdown columns: use {"labels": ["value"]} with create_labels_if_missing
            return {"labels": [str(value)]}
        if col_type in ("color", "status"):
            # Status columns: use {"label": "value"}
            return {"label": str(value)}
        # Text, numbers, etc. — pass as string
        return str(value) if value is not None else value

    def _needs_create_labels(self, col_values: Dict, col_types: Dict) -> bool:
        """Check if any column value is a dropdown/status type needing create_labels_if_missing."""
        for col_id in col_values:
            ct = col_types.get(col_id, "text")
            if ct in ("dropdown", "color", "status"):
                return True
        return False

    def _build_column_values(self, book: Dict, col_map: Dict, col_types: Dict = None) -> Dict:
        """Build Monday.com column values from a textbook document.
        Handles different column types (text, number, dropdown, status)."""
        values = {}
        col_types = col_types or {}
        stock_col = col_map.get("stock_quantity") or col_map.get("stock")

        field_map = {
            "code": book.get("code", book.get("book_id", "")),
            "name": book.get("name", ""),
            "grade": book.get("grade", ""),
            "publisher": book.get("publisher", ""),
            "subject": book.get("subject", ""),
            "unit_price": str(book.get("price", 0)),
        }

        for field, value in field_map.items():
            col_id = col_map.get(field)
            if col_id and value is not None:
                ct = col_types.get(col_id, "text")
                values[col_id] = self._format_column_value(value, ct)

        # Stock quantity — set as number
        if stock_col:
            values[stock_col] = str(book.get("inventory_quantity", 0))

        return values

    def _build_single_column_value(self, book: Dict, column_key: str, col_map: Dict, col_types: Dict = None) -> Dict:
        """Build Monday.com value for a single column from a textbook."""
        col_types = col_types or {}
        col_id = col_map.get(column_key)
        if column_key in ("stock_quantity", "stock"):
            col_id = col_map.get("stock_quantity") or col_map.get("stock")
        if not col_id:
            return {}

        ct = col_types.get(col_id, "text")

        field_source = {
            "code": book.get("code", book.get("book_id", "")),
            "name": book.get("name", ""),
            "grade": book.get("grade", ""),
            "publisher": book.get("publisher", ""),
            "subject": book.get("subject", ""),
            "unit_price": str(book.get("price", 0)),
            "stock_quantity": str(book.get("inventory_quantity", 0)),
        }

        value = field_source.get(column_key)
        if value is None:
            return {}

        return {col_id: self._format_column_value(value, ct)}

    async def _get_or_create_grade_groups(self, board_id: str, textbooks: List[Dict]) -> Dict:
        """Get or create Monday.com groups by grade. Returns {grade: group_id}."""
        grades = sorted(set(b.get("grade", "Other") for b in textbooks if b.get("grade")))
        existing_groups = await self.client.get_board_groups(board_id)
        group_map = {g["title"]: g["id"] for g in existing_groups}

        result = {}
        for grade in grades:
            grade_label = f"Grade {grade}" if not grade.startswith("G") else grade
            if grade_label in group_map:
                result[grade] = group_map[grade_label]
            else:
                # Create new group
                try:
                    data = await self.client.execute(
                        f'mutation {{ create_group (board_id: {board_id}, group_name: "{grade_label}") {{ id }} }}'
                    )
                    gid = data.get("create_group", {}).get("id")
                    if gid:
                        result[grade] = gid
                        logger.info(f"Created Monday.com group '{grade_label}' ({gid})")
                except Exception as e:
                    logger.warning(f"Failed to create group '{grade_label}': {e}")

        return result

    # ──────────── Stock Sync: App → Monday.com ────────────

    async def sync_stock_to_monday(self, book_id: str, new_quantity: int) -> Dict:
        """Push a stock change from the app to Monday.com."""
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        enabled = config.get("enabled", False)
        col_map = config.get("column_mapping", {})

        if not enabled or not board_id:
            return {"synced": False, "reason": "Not configured"}

        # Handle both legacy 'stock' and new 'stock_quantity' keys
        stock_col = col_map.get("stock_quantity") or col_map.get("stock")
        if not stock_col:
            return {"synced": False, "reason": "Stock column not mapped"}

        # Get product's monday_item_id
        product = await db.store_products.find_one(
            {"book_id": book_id, "is_private_catalog": True},
            {"_id": 0, "monday_item_id": 1, "code": 1, "name": 1}
        )
        if not product:
            return {"synced": False, "reason": "Product not found"}

        monday_item_id = product.get("monday_item_id")
        if not monday_item_id:
            # Try to find by code
            code_col = col_map.get("code")
            book_code = product.get("code", book_id)
            if code_col and book_code:
                found = await self.client.search_items_by_column(board_id, code_col, book_code)
                if found:
                    monday_item_id = found[0]["id"]
                    await db.store_products.update_one(
                        {"book_id": book_id},
                        {"$set": {"monday_item_id": str(monday_item_id)}}
                    )

        if not monday_item_id:
            return {"synced": False, "reason": "No Monday.com item linked"}

        try:
            col_values = {stock_col: str(new_quantity)}
            await self.client.update_column_values(board_id, monday_item_id, col_values)
            logger.info(f"Stock synced to Monday: {book_id} = {new_quantity}")
            return {"synced": True, "monday_item_id": monday_item_id}
        except Exception as e:
            logger.error(f"Stock sync to Monday failed for {book_id}: {e}")
            return {"synced": False, "reason": str(e)}

    # ──────────── Webhook: Monday.com → App (stock changes) ────────────

    async def handle_stock_webhook(self, event: dict) -> Dict:
        """Process Monday.com webhook for column value changes on the TXB board.
        Updates local inventory when stock is changed on Monday.com."""
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        col_map = config.get("column_mapping", {})
        stock_col = col_map.get("stock_quantity") or col_map.get("stock")

        if not board_id or not stock_col:
            return {"processed": False, "reason": "Not configured"}

        # Extract event data
        pulse_id = str(event.get("pulseId", ""))
        column_id = event.get("columnId", "")
        column_value = event.get("value", {})

        # Only process changes to the stock column
        if column_id != stock_col:
            return {"processed": False, "reason": f"Column {column_id} is not stock column"}

        # Parse new stock value
        new_stock = 0
        if isinstance(column_value, dict):
            # Number column value format
            raw = column_value.get("value") or column_value.get("text", "0")
            try:
                new_stock = int(float(str(raw)))
            except (ValueError, TypeError):
                return {"processed": False, "reason": f"Invalid stock value: {raw}"}
        elif isinstance(column_value, (int, float)):
            new_stock = int(column_value)
        elif isinstance(column_value, str):
            try:
                new_stock = int(float(column_value))
            except (ValueError, TypeError):
                return {"processed": False, "reason": f"Invalid stock value: {column_value}"}

        # Find the product by monday_item_id
        product = await db.store_products.find_one(
            {"monday_item_id": pulse_id, "is_private_catalog": True},
            {"_id": 0, "book_id": 1, "name": 1, "inventory_quantity": 1}
        )

        if not product:
            # Fallback: search by looking up the item code from Monday.com
            code_col = col_map.get("code")
            if code_col:
                try:
                    items = await self.client.execute(
                        f'query {{ items(ids: [{pulse_id}]) {{ column_values {{ id text }} }} }}'
                    )
                    item_cols = items.get("items", [{}])[0].get("column_values", [])
                    code_value = next((c["text"] for c in item_cols if c["id"] == code_col), None)
                    if code_value:
                        product = await db.store_products.find_one(
                            {"code": code_value, "is_private_catalog": True},
                            {"_id": 0, "book_id": 1, "name": 1, "inventory_quantity": 1}
                        )
                        if product:
                            # Link for future lookups
                            await db.store_products.update_one(
                                {"book_id": product["book_id"]},
                                {"$set": {"monday_item_id": pulse_id}}
                            )
                except Exception as e:
                    logger.error(f"Webhook lookup error: {e}")

        if not product:
            return {"processed": False, "reason": f"No product found for Monday item {pulse_id}"}

        old_stock = product.get("inventory_quantity", 0)
        book_id = product["book_id"]

        if old_stock == new_stock:
            return {"processed": True, "no_change": True, "book_id": book_id}

        # Update stock in the app
        await db.store_products.update_one(
            {"book_id": book_id},
            {"$set": {
                "inventory_quantity": new_stock,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        # Log the movement
        import uuid
        movement = {
            "movement_id": str(uuid.uuid4())[:12],
            "book_id": book_id,
            "product_name": product.get("name", "Unknown"),
            "type": "addition" if new_stock > old_stock else "removal",
            "quantity_change": new_stock - old_stock,
            "old_quantity": old_stock,
            "new_quantity": new_stock,
            "reason": "monday_webhook",
            "notes": f"Stock updated via Monday.com (item {pulse_id})",
            "admin_id": "monday_webhook",
            "admin_name": "Monday.com",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.inventory_movements.insert_one(movement)

        logger.info(f"Stock webhook: {book_id} '{product.get('name')}' {old_stock} → {new_stock}")

        return {
            "processed": True,
            "book_id": book_id,
            "product_name": product.get("name"),
            "old_stock": old_stock,
            "new_stock": new_stock,
        }

    # ──────────── Webhook: Monday.com → App (new item created) ────────────

    async def handle_create_item_webhook(self, event: dict) -> Dict:
        """Process Monday.com webhook for create_item events on the TXB board.
        Fetches the new item's column values and creates a product in the private catalog."""
        import uuid

        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")
        col_map = config.get("column_mapping", {})

        if not board_id:
            return {"processed": False, "reason": "Not configured"}

        pulse_id = str(event.get("pulseId", ""))
        pulse_name = event.get("pulseName", "")

        if not pulse_id:
            return {"processed": False, "reason": "No pulseId in event"}

        # Check if product already exists with this monday_item_id
        existing = await db.store_products.find_one(
            {"monday_item_id": pulse_id, "is_private_catalog": True},
            {"_id": 0, "book_id": 1}
        )
        if existing:
            return {"processed": True, "skipped": True, "reason": "Item already exists", "book_id": existing["book_id"]}

        # Fetch item's column values from Monday.com
        try:
            data = await self.client.execute(
                f'query {{ items(ids: [{pulse_id}]) {{ name group {{ id title }} column_values {{ id text value type }} }} }}'
            )
            items = data.get("items", [])
            if not items:
                return {"processed": False, "reason": f"Item {pulse_id} not found on Monday.com"}

            item = items[0]
            item_name = item.get("name", pulse_name)
            col_values = {c["id"]: c.get("text", "") for c in item.get("column_values", [])}
            group = item.get("group", {})
        except Exception as e:
            logger.error(f"Create item webhook - failed to fetch item {pulse_id}: {e}")
            return {"processed": False, "reason": f"API error: {e}"}

        # Build reverse column mapping: monday_col_id → field_name
        reverse_map = {v: k for k, v in col_map.items() if v}

        # Extract product fields from column values
        product_data = {
            "name": item_name,
            "book_id": f"txb_{uuid.uuid4().hex[:8]}",
            "is_private_catalog": True,
            "active": True,
            "archived": False,
            "monday_item_id": pulse_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "source": "monday_webhook",
        }

        for col_id, text_value in col_values.items():
            field = reverse_map.get(col_id)
            if not field or not text_value:
                continue

            if field == "code":
                product_data["code"] = text_value
            elif field == "grade":
                product_data["grade"] = text_value
            elif field == "publisher":
                product_data["publisher"] = text_value
            elif field == "subject":
                product_data["subject"] = text_value
            elif field in ("unit_price", "price"):
                try:
                    product_data["price"] = float(text_value.replace(",", "").replace("$", ""))
                except (ValueError, TypeError):
                    pass
            elif field in ("stock_quantity", "stock"):
                try:
                    product_data["inventory_quantity"] = int(float(text_value))
                except (ValueError, TypeError):
                    product_data["inventory_quantity"] = 0

        # If code column was found, also check for existing product by code
        if product_data.get("code"):
            existing_by_code = await db.store_products.find_one(
                {"code": product_data["code"], "is_private_catalog": True},
                {"_id": 0, "book_id": 1}
            )
            if existing_by_code:
                # Link existing product instead of creating duplicate
                await db.store_products.update_one(
                    {"book_id": existing_by_code["book_id"]},
                    {"$set": {"monday_item_id": pulse_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                return {
                    "processed": True,
                    "action": "linked",
                    "book_id": existing_by_code["book_id"],
                    "product_name": item_name,
                }

        # Extract grade from group title if not found in columns
        if not product_data.get("grade") and group:
            group_title = group.get("title", "")
            if group_title.startswith("Grade "):
                product_data["grade"] = group_title.replace("Grade ", "")
            elif group_title.startswith("G"):
                product_data["grade"] = group_title

        # Set defaults
        product_data.setdefault("inventory_quantity", 0)
        product_data.setdefault("price", 0)
        product_data.setdefault("code", product_data["book_id"])

        # Insert into database
        await db.store_products.insert_one(product_data)
        # Remove _id from inserted doc side-effect
        product_data.pop("_id", None)

        # Log the import as an inventory movement
        movement = {
            "movement_id": str(uuid.uuid4())[:12],
            "book_id": product_data["book_id"],
            "product_name": product_data["name"],
            "type": "import",
            "quantity_change": product_data.get("inventory_quantity", 0),
            "old_quantity": 0,
            "new_quantity": product_data.get("inventory_quantity", 0),
            "reason": "monday_webhook",
            "notes": f"New textbook imported from Monday.com (item {pulse_id})",
            "admin_id": "monday_webhook",
            "admin_name": "Monday.com",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.inventory_movements.insert_one(movement)

        logger.info(f"Create item webhook: imported '{item_name}' as {product_data['book_id']}")

        return {
            "processed": True,
            "action": "created",
            "book_id": product_data["book_id"],
            "product_name": product_data["name"],
            "grade": product_data.get("grade"),
            "stock": product_data.get("inventory_quantity", 0),
        }

    # ──────────── Register/Unregister Webhooks ────────────

    async def register_stock_webhook(self, webhook_url: str) -> Dict:
        """Register a webhook for column value changes on the TXB inventory board."""
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")

        if not board_id:
            return {"error": "Board not configured"}

        try:
            wh_id = await self.client.register_webhook(
                board_id, webhook_url, event="change_column_value"
            )
            if wh_id:
                config["webhook_config"] = {
                    "webhook_id": wh_id,
                    "webhook_url": webhook_url,
                    "stock_column_id": config.get("column_mapping", {}).get("stock_quantity"),
                    "registered_at": datetime.now(timezone.utc).isoformat(),
                }
                await self.save_txb_inventory_config(config)
                return {"success": True, "webhook_id": wh_id}
            return {"error": "Failed to register webhook"}
        except Exception as e:
            return {"error": str(e)}

    async def register_create_item_webhook(self, webhook_url: str) -> Dict:
        """Register a webhook for create_item events on the TXB inventory board."""
        config = await self.get_txb_inventory_config()
        board_id = config.get("board_id")

        if not board_id:
            return {"error": "Board not configured"}

        try:
            wh_id = await self.client.register_webhook(
                board_id, webhook_url, event="create_item"
            )
            if wh_id:
                config.setdefault("create_item_webhook_config", {})
                config["create_item_webhook_config"] = {
                    "webhook_id": wh_id,
                    "webhook_url": webhook_url,
                    "registered_at": datetime.now(timezone.utc).isoformat(),
                }
                await self.save_txb_inventory_config(config)
                return {"success": True, "webhook_id": wh_id}
            return {"error": "Failed to register webhook"}
        except Exception as e:
            return {"error": str(e)}

    async def unregister_stock_webhook(self) -> Dict:
        """Remove the stock change webhook."""
        config = await self.get_txb_inventory_config()
        wh_config = config.get("webhook_config", {})
        wh_id = wh_config.get("webhook_id")

        if wh_id:
            await self.client.delete_webhook(wh_id)

        config["webhook_config"] = {
            "webhook_id": None,
            "webhook_url": None,
            "stock_column_id": None,
        }
        await self.save_txb_inventory_config(config)
        return {"success": True}

    async def unregister_create_item_webhook(self) -> Dict:
        """Remove the create_item webhook."""
        config = await self.get_txb_inventory_config()
        wh_config = config.get("create_item_webhook_config", {})
        wh_id = wh_config.get("webhook_id")

        if wh_id:
            await self.client.delete_webhook(wh_id)

        config["create_item_webhook_config"] = {
            "webhook_id": None,
            "webhook_url": None,
        }
        await self.save_txb_inventory_config(config)
        return {"success": True}

    # ──────────── Existing: Per-student order subitem creation ────────────

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

        subitem_name = student_name
        if order_reference:
            subitem_name = f"{student_name} - {order_reference}"

        items_created = 0
        subitems_created = 0

        for item in ordered_items:
            book_code = item.get("book_code", "")
            book_name = item.get("book_name", "")
            quantity = item.get("quantity_ordered", 1)

            if not book_code:
                logger.warning(f"Skipping inventory update for '{book_name}': no book code")
                continue

            try:
                found = await self.client.search_items_by_column(board_id, code_col, book_code)

                if found:
                    parent_item_id = found[0]["id"]
                else:
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

                # Create subitem
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
                else:
                    logger.error(f"TXB Inventory: failed to create subitem for '{book_code}'")

            except Exception as e:
                logger.error(f"TXB Inventory error for '{book_code}': {e}")

        return {"subitems_created": subitems_created, "items_created": items_created}


# Singleton
txb_inventory_adapter = TxbInventoryAdapter()
