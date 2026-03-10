"""
Pre-Sale Import Service
Handles importing pre-sale orders from Monday.com into the app,
and auto-linking them when students are registered.
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import uuid
import re

from core.database import db
from core.config import MONDAY_API_KEY
from modules.integrations.monday.core_client import monday_client
from modules.store.services.monday_config_service import monday_config_service

logger = logging.getLogger(__name__)

# Monday.com column IDs for Textbook Orders board
ESTUDIANTE_COL = "text_mm026sg3"
GRADO_COL = "color_mm02xhw1"
SYNC_TRIGGER_COL = "color_mm0mnmrs"

# Status labels on the sync trigger column that mean "ready to import"
SYNC_TRIGGER_LABELS = ["Ready", "ready", "Listo", "listo"]

# Keywords to auto-detect the "Date Paid" column (case-insensitive match on column title/id)
DATE_PAID_KEYWORDS = ["date_paid", "paid", "pago", "fecha_pago", "fecha_pagado", "payment_date"]


class PreSaleImportService:
    """Import pre-sale orders from Monday.com and auto-link on registration"""

    def __init__(self):
        # Default subitem price column — will be loaded from config
        self._subitem_price_col = "numeric_mm02v6ym"

    async def _load_subitem_config(self):
        """Load subitem column mapping from monday_configs"""
        config = await db.monday_configs.find_one(
            {"key": "store.textbook_orders.board"}, {"_id": 0}
        )
        if config:
            sub_map = config.get("data", {}).get("subitem_column_mapping", {})
            if sub_map.get("price"):
                self._subitem_price_col = sub_map["price"]

    async def fetch_importable_items(self, board_id: str) -> List[Dict]:
        """Fetch items from Monday.com board that are marked for import via the trigger column.
        Includes subitems inline to avoid N+1 API calls."""
        items = await monday_client.get_board_items(board_id, limit=500, include_subitems=True)
        importable = []
        for item in items:
            cols = {c["id"]: c for c in item.get("column_values", [])}
            trigger_col = cols.get(SYNC_TRIGGER_COL, {})
            trigger_text = trigger_col.get("text", "").strip()
            if trigger_text and trigger_text in SYNC_TRIGGER_LABELS:
                importable.append(item)
        logger.info(f"[presale] Board {board_id}: fetched {len(items)} total items, {len(importable)} ready for import")
        return importable

    async def preview_import(self, board_id: str) -> Dict:
        """Preview what would be imported — no DB changes"""
        await self._load_subitem_config()
        items = await self.fetch_importable_items(board_id)
        previews = []
        for item in items:
            parsed = await self._parse_monday_item_safe(item, board_id)
            if parsed:
                previews.append(parsed)
        return {"count": len(previews), "items": previews}

    async def import_presale_orders(self, board_id: str, admin_user_id: str, cached_items: List[Dict] = None) -> Dict:
        """Import pre-sale orders from Monday.com into the app.
        If cached_items (from preview) are provided, skip re-fetching from Monday.com."""
        import asyncio
        await self._load_subitem_config()

        # Use cached preview data if available, otherwise fetch fresh
        if cached_items is not None and len(cached_items) > 0:
            logger.info(f"[presale] Using {len(cached_items)} cached preview items (skipping Monday.com re-fetch)")
            parsed_items = cached_items
        else:
            items = await self.fetch_importable_items(board_id)
            parsed_items = []
            for item in items:
                parsed = await self._parse_monday_item_safe(item, board_id)
                if parsed:
                    parsed_items.append(parsed)

        imported = []
        skipped = []
        errors = []
        total = len(parsed_items)
        logger.info(f"[presale] Starting import of {total} orders from board {board_id}")

        for idx, parsed in enumerate(parsed_items):
            monday_item_id = str(parsed.get("monday_item_id", ""))
            try:
                # Skip if already imported
                existing = await db.store_textbook_orders.find_one(
                    {"monday_item_ids": monday_item_id}, {"_id": 0, "order_id": 1}
                )
                if existing:
                    skipped.append({"monday_id": monday_item_id, "reason": "already_imported", "order_id": existing.get("order_id")})
                    continue

                order = await self._create_presale_order(parsed, monday_item_id, admin_user_id)
                imported.append({
                    "order_id": order["order_id"],
                    "monday_id": monday_item_id,
                    "student_name": parsed["student_name"],
                    "grade": parsed["grade"],
                    "items_count": len(parsed["items"]),
                    "total": parsed["total"]
                })
                logger.info(f"[presale] Imported {idx+1}/{total}: {parsed['student_name']} ({len(parsed['items'])} items)")

                # Update Monday.com trigger column to "Done" to prevent re-import
                # Throttle these calls to respect rate limits
                try:
                    if idx > 0 and idx % 5 == 0:
                        await asyncio.sleep(1)  # Extra pause every 5 items
                    await monday_client.update_column_values(
                        board_id, monday_item_id,
                        {SYNC_TRIGGER_COL: {"label": "Done"}},
                        create_labels_if_missing=True
                    )
                except Exception as e:
                    logger.warning(f"Failed to update trigger column for item {monday_item_id}: {e}")
                    # Rate limit on trigger update — pause and continue
                    err_str = str(e).lower()
                    if "rate" in err_str or "complexity" in err_str or "budget" in err_str:
                        await asyncio.sleep(3)

            except Exception as e:
                logger.error(f"Error importing Monday item {monday_item_id} ({idx+1}/{total}): {e}")
                errors.append({"monday_id": monday_item_id, "error": str(e)})
                err_str = str(e).lower()
                if "rate" in err_str or "complexity" in err_str or "budget" in err_str:
                    logger.info(f"[presale] Rate limit hit at item {idx+1}/{total}, pausing 5s...")
                    await asyncio.sleep(5)

        logger.info(f"[presale] Import complete: {len(imported)} imported, {len(skipped)} skipped, {len(errors)} errors")

        # NOTE: Textbook board sync removed from auto-import (too many API calls overwhelm the server).
        # Admin can manually sync via the "Sync Textbooks Board" button.

        return {
            "imported": len(imported),
            "skipped": len(skipped),
            "errors": len(errors),
            "details": {"imported": imported, "skipped": skipped, "errors": errors}
        }

    async def _parse_monday_item_safe(self, item: Dict, board_id: str) -> Optional[Dict]:
        """Parse a Monday.com item with retry on failure (rate limits, timeouts)"""
        import asyncio
        for attempt in range(3):
            try:
                return await self._parse_monday_item(item, board_id)
            except Exception as e:
                err_str = str(e).lower()
                if attempt < 2 and any(kw in err_str for kw in ["rate", "complexity", "budget", "timeout", "failed after"]):
                    wait = (attempt + 1) * 3  # 3s, 6s
                    logger.warning(f"[presale] Parse attempt {attempt+1} failed for item {item.get('id')}: {e}, retrying in {wait}s...")
                    await asyncio.sleep(wait)
                else:
                    logger.error(f"[presale] Parse failed for item {item.get('id')} after {attempt+1} attempts: {e}")
                    return None
        return None

    async def _parse_monday_item(self, item: Dict, board_id: str) -> Optional[Dict]:
        """Parse a Monday.com item into order data"""
        monday_item_id = str(item.get("id", ""))
        item_name = item.get("name", "")  # Parent/client name
        cols = {c["id"]: c for c in item.get("column_values", [])}

        student_name = cols.get(ESTUDIANTE_COL, {}).get("text", "").strip()
        grade_text = cols.get(GRADO_COL, {}).get("text", "").strip()

        if not student_name:
            student_name = item_name  # Fallback to item name

        # Parse grade from label text
        grade = self._normalize_grade(grade_text)

        # Auto-detect Date Paid column
        paid_date = None
        for col_data in item.get("column_values", []):
            col_id = col_data.get("id", "").lower()
            col_type = col_data.get("type", "").lower()
            col_title = col_data.get("title", "").lower() if col_data.get("title") else ""
            col_text = (col_data.get("text") or "").strip()

            # Match by column type (date) + keyword in id or title
            is_date_col = col_type == "date" or col_id.startswith("date")
            has_paid_keyword = any(kw in col_id or kw in col_title for kw in DATE_PAID_KEYWORDS)
            if is_date_col and has_paid_keyword and col_text:
                paid_date = col_text
                break
            # Also check for any date column with "paid"/"pago" in its text-based id
            if not paid_date and has_paid_keyword and col_text:
                paid_date = col_text

        # Use subitems from inline data (included in get_board_items), fallback to separate API call
        subitems = item.get("subitems") or []
        if not subitems:
            subitems = await monday_client.get_subitems(monday_item_id)
        items = []
        total = 0.0

        for si in subitems:
            si_name = si.get("name", "").strip()
            si_id = str(si.get("id", ""))

            # Parse book code + name from subitem name
            book_code, book_name = self._parse_subitem_name(si_name)

            # Try to match to inventory
            match = await self._match_book(book_code, book_name, grade)

            # Parse quantity and price from subitem columns
            quantity = 1
            price = 0.0
            # Parse price from the configured subitem price column
            for col in si.get("column_values", []):
                text = (col.get("text") or "").strip()
                raw_value = (col.get("value") or "").strip().strip('"')
                col_id = col.get("id", "")
                col_type = col.get("type", "").lower()

                # Check against configured price column first
                if col_id == self._subitem_price_col:
                    # Try text first, then raw value as fallback
                    for candidate in [text, raw_value]:
                        if not candidate:
                            continue
                        try:
                            price = float(candidate.replace(",", "").replace("$", ""))
                            break
                        except ValueError:
                            continue
                    continue

                # Skip empty columns
                if not text and not raw_value:
                    continue

                # Fallback: detect numeric columns for quantity
                is_numeric = col_type in ("numbers", "numeric") or col_id.startswith("numbers") or col_id.startswith("numeric")
                is_qty = "cantidad" in col_id.lower() or "quantity" in col_id.lower() or "qty" in col_id.lower()
                if is_qty or (is_numeric and col_id != self._subitem_price_col):
                    try:
                        val = float((text or raw_value).replace(",", ""))
                        if val < 100:
                            quantity = max(1, int(val))
                    except ValueError:
                        pass

            if match:
                price = price or match.get("price", 0)
                book_id = match.get("product_id", "") or match.get("book_id", "")
                book_code = match.get("code", book_code)
                book_name = match.get("name", book_name)
                matched = True
            else:
                book_id = f"unmatched_{uuid.uuid4().hex[:8]}"
                matched = False

            subtotal = price * quantity
            total += subtotal

            items.append({
                "book_id": book_id,
                "book_code": book_code,
                "book_name": book_name,
                "price": price,
                "quantity_ordered": quantity,
                "max_quantity": quantity,
                "status": "ordered",
                "ordered_at": datetime.now(timezone.utc).isoformat(),
                "monday_subitem_id": si_id,
                "matched": matched,
            })

        return {
            "parent_name": item_name,
            "student_name": student_name,
            "grade": grade,
            "items": items,
            "total": total,
            "monday_item_id": monday_item_id,
            "paid_date": paid_date,
        }

    async def _create_presale_order(self, parsed: Dict, monday_item_id: str, admin_user_id: str) -> Dict:
        """Create an awaiting_link pre-sale order in the database"""
        now = datetime.now(timezone.utc).isoformat()
        order_id = f"ord_{uuid.uuid4().hex[:12]}"
        year = datetime.now(timezone.utc).year

        order = {
            "order_id": order_id,
            "user_id": None,  # No user yet
            "student_id": None,  # No linked student yet
            "student_name": parsed["student_name"],
            "parent_name": parsed["parent_name"],
            "grade": parsed["grade"],
            "year": year,
            "items": parsed["items"],
            "total_amount": parsed["total"],
            "status": "awaiting_link",
            "source": "monday_import",
            "is_presale": True,
            "monday_item_id": monday_item_id,
            "monday_item_ids": [monday_item_id],
            "imported_by": admin_user_id,
            "imported_at": now,
            "link_status": "unlinked",
            "paid_date": parsed.get("paid_date"),
            "created_at": now,
            "updated_at": now,
        }
        await db.store_textbook_orders.insert_one(order)
        order.pop("_id", None)

        # Auto-create inventory products for unmatched items, then set reserved_quantity
        for item in parsed["items"]:
            qty = item.get("quantity_ordered", 1)
            if not item.get("matched") or item.get("book_id", "").startswith("unmatched_"):
                # Check if a product with same code already exists (may have been created by a prior order in this batch)
                code = item.get("book_code", "")
                name = item.get("book_name", "")
                grade = parsed.get("grade", "")
                existing = None
                if code:
                    existing = await db.store_products.find_one(
                        {"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}, "is_sysbook": True},
                        {"_id": 0, "book_id": 1}
                    )
                if not existing and name:
                    existing = await db.store_products.find_one(
                        {"name": {"$regex": f"^{re.escape(name[:40])}", "$options": "i"}, "is_sysbook": True, "grade": grade},
                        {"_id": 0, "book_id": 1}
                    )
                if existing:
                    new_book_id = existing["book_id"]
                else:
                    new_book_id = f"book_{uuid.uuid4().hex[:12]}"
                    new_product = {
                        "book_id": new_book_id,
                        "name": name,
                        "code": code,
                        "grade": grade,
                        "price": item.get("price", 0),
                        "inventory_quantity": 0,
                        "reserved_quantity": 0,
                        "is_sysbook": True,
                        "active": True,
                        "created_at": now,
                        "source": "presale_import",
                    }
                    await db.store_products.insert_one(new_product)
                    logger.info(f"[presale] Auto-created product {new_book_id}: {code} - {name} (grade {grade})")
                # Update the order item with the real book_id
                item["book_id"] = new_book_id
                item["matched"] = True

            # Increment reserved_quantity
            await db.store_products.update_one(
                {"book_id": item["book_id"]},
                {"$inc": {"reserved_quantity": qty}}
            )

        # Save the updated items (with corrected book_ids) back to the order
        await db.store_textbook_orders.update_one(
            {"order_id": order_id},
            {"$set": {"items": order["items"]}}
        )

        logger.info(f"Created pre-sale order {order_id} for {parsed['student_name']} (grade {parsed['grade']})")
        return order

    async def suggest_link(self, student_id: str, student_name: str, grade: str, user_id: str) -> Optional[Dict]:
        """Create a link SUGGESTION when a student is registered/linked.
        Does NOT auto-link. Admin must confirm.
        """
        name_lower = student_name.strip().lower()
        name_parts = name_lower.split()

        candidates = await db.store_textbook_orders.find(
            {
                "status": "awaiting_link",
                "link_status": "unlinked",
                "grade": {"$in": self._grade_variants(grade)},
            },
            {"_id": 0}
        ).to_list(100)

        best_match = None
        best_score = 0

        for order in candidates:
            order_name = (order.get("student_name") or "").strip().lower()
            score = self._name_match_score(name_lower, name_parts, order_name)
            if score > best_score and score >= 0.6:  # Lower threshold for suggestions
                best_score = score
                best_match = order

        if best_match:
            order_id = best_match["order_id"]
            now = datetime.now(timezone.utc).isoformat()
            suggestion = {
                "suggestion_id": f"sug_{uuid.uuid4().hex[:10]}",
                "order_id": order_id,
                "student_id": student_id,
                "student_name": student_name,
                "user_id": user_id,
                "order_student_name": best_match.get("student_name"),
                "grade": grade,
                "match_score": round(best_score, 2),
                "status": "pending",  # pending, confirmed, rejected
                "created_at": now,
            }
            await db.presale_link_suggestions.insert_one(suggestion)
            suggestion.pop("_id", None)
            logger.info(f"Created link suggestion for order {order_id} -> student {student_id} (score: {best_score:.2f})")
            return suggestion

        return None

    async def get_suggestions(self, status_filter: str = None) -> List[Dict]:
        """Get all pending link suggestions for admin review"""
        query = {}
        if status_filter:
            query["status"] = status_filter
        suggestions = await db.presale_link_suggestions.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
        # Enrich with order details
        for s in suggestions:
            order = await db.store_textbook_orders.find_one(
                {"order_id": s.get("order_id")},
                {"_id": 0, "student_name": 1, "parent_name": 1, "grade": 1, "total_amount": 1, "items": 1, "link_status": 1}
            )
            if order:
                s["order_details"] = order
        return suggestions

    async def confirm_suggestion(self, suggestion_id: str, admin_user_id: str) -> Dict:
        """Admin confirms a link suggestion — actually links the order"""
        suggestion = await db.presale_link_suggestions.find_one(
            {"suggestion_id": suggestion_id}, {"_id": 0}
        )
        if not suggestion:
            raise ValueError("Suggestion not found")
        if suggestion.get("status") != "pending":
            raise ValueError(f"Suggestion already {suggestion.get('status')}")

        order_id = suggestion["order_id"]
        order = await db.store_textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise ValueError("Order not found")
        if order.get("link_status") == "linked":
            raise ValueError("Order already linked to another student")

        now = datetime.now(timezone.utc).isoformat()
        # Link the order
        await db.store_textbook_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "user_id": suggestion.get("user_id"),
                "student_id": suggestion["student_id"],
                "status": "submitted",
                "link_status": "linked",
                "linked_at": now,
                "linked_method": "suggestion_confirmed",
                "linked_by_admin": admin_user_id,
                "updated_at": now,
            }}
        )
        # Update suggestion status
        await db.presale_link_suggestions.update_one(
            {"suggestion_id": suggestion_id},
            {"$set": {"status": "confirmed", "confirmed_at": now, "confirmed_by": admin_user_id}}
        )
        logger.info(f"Admin {admin_user_id} confirmed link suggestion {suggestion_id} for order {order_id}")
        return {"suggestion_id": suggestion_id, "order_id": order_id, "linked": True}

    async def reject_suggestion(self, suggestion_id: str, admin_user_id: str) -> Dict:
        """Admin rejects a link suggestion"""
        suggestion = await db.presale_link_suggestions.find_one(
            {"suggestion_id": suggestion_id}, {"_id": 0}
        )
        if not suggestion:
            raise ValueError("Suggestion not found")

        now = datetime.now(timezone.utc).isoformat()
        await db.presale_link_suggestions.update_one(
            {"suggestion_id": suggestion_id},
            {"$set": {"status": "rejected", "rejected_at": now, "rejected_by": admin_user_id}}
        )
        logger.info(f"Admin {admin_user_id} rejected link suggestion {suggestion_id}")
        return {"suggestion_id": suggestion_id, "rejected": True}

    async def unlink_order(self, order_id: str, admin_user_id: str) -> Dict:
        """Admin unlinks a previously linked order — returns it to awaiting_link"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise ValueError("Order not found")
        if order.get("link_status") != "linked":
            raise ValueError("Order is not linked")

        now = datetime.now(timezone.utc).isoformat()
        await db.store_textbook_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "user_id": None,
                "student_id": None,
                "status": "awaiting_link",
                "link_status": "unlinked",
                "unlinked_at": now,
                "unlinked_by": admin_user_id,
                "linked_at": None,
                "linked_method": None,
                "linked_by_admin": None,
                "updated_at": now,
            }}
        )
        logger.info(f"Admin {admin_user_id} unlinked order {order_id}")
        return {"order_id": order_id, "unlinked": True}

    async def manual_link(self, order_id: str, student_id: str, user_id: str, admin_user_id: str) -> Dict:
        """Admin manually links a pre-sale order to a student"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise ValueError("Order not found")
        if order.get("link_status") == "linked":
            raise ValueError("Order already linked")

        now = datetime.now(timezone.utc).isoformat()
        await db.store_textbook_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "user_id": user_id,
                "student_id": student_id,
                "status": "submitted",
                "link_status": "linked",
                "linked_at": now,
                "linked_method": "manual",
                "linked_by_admin": admin_user_id,
                "updated_at": now,
            }}
        )
        logger.info(f"Admin {admin_user_id} manually linked order {order_id} to student {student_id}")
        return {"order_id": order_id, "linked": True}

    async def get_presale_orders(self, status_filter: str = None) -> List[Dict]:
        """Get all pre-sale imported orders"""
        query = {"source": "monday_import"}
        if status_filter == "unlinked":
            query["link_status"] = "unlinked"
        elif status_filter == "linked":
            query["link_status"] = "linked"
        orders = await db.store_textbook_orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return orders

    async def sync_presale_to_inventory(self) -> Dict:
        """Sync presale orders to inventory:
        1. Aggregate all presale order items by book_code+book_name+grade
        2. Create inventory products for unmatched books
        3. Re-link presale order items to inventory products (update book_id + matched)
        4. Recalculate reserved_quantity on all affected inventory products
        """
        now = datetime.now(timezone.utc).isoformat()
        orders = await db.store_textbook_orders.find(
            {"source": "monday_import"}, {"_id": 0}
        ).to_list(1000)

        if not orders:
            return {"created": 0, "matched": 0, "updated_orders": 0, "message": "No presale orders found"}

        # Step 1: Aggregate unique books from presale items
        # key = (book_code, book_name, grade) -> {total_qty, order_refs}
        from collections import defaultdict
        book_agg = defaultdict(lambda: {"total_qty": 0, "order_refs": [], "price": 0.0, "book_name": "", "book_code": "", "grade": ""})

        for order in orders:
            grade = order.get("grade", "")
            for item in order.get("items", []):
                code = item.get("book_code", "")
                name = item.get("book_name", "")
                key = f"{code}||{name}||{grade}"
                book_agg[key]["total_qty"] += item.get("quantity_ordered", 1)
                book_agg[key]["order_refs"].append(order["order_id"])
                book_agg[key]["book_code"] = code
                book_agg[key]["book_name"] = name
                book_agg[key]["grade"] = grade
                if item.get("price", 0) > book_agg[key]["price"]:
                    book_agg[key]["price"] = item["price"]

        created_count = 0
        matched_count = 0
        # Map from (code, name, grade) -> book_id for re-linking
        book_id_map = {}

        # Step 2: For each unique book, find or create inventory product
        for key, agg in book_agg.items():
            code = agg["book_code"]
            name = agg["book_name"]
            grade = agg["grade"]

            # Try to find existing product by code or name+grade
            existing = None
            if code:
                existing = await db.store_products.find_one(
                    {"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}, "is_sysbook": True},
                    {"_id": 0, "book_id": 1}
                )
            if not existing and name and grade:
                existing = await db.store_products.find_one(
                    {"name": {"$regex": f"^{re.escape(name[:40])}", "$options": "i"},
                     "grade": {"$regex": f"^{re.escape(grade)}$", "$options": "i"},
                     "is_sysbook": True},
                    {"_id": 0, "book_id": 1}
                )

            if existing:
                book_id = existing["book_id"]
                matched_count += 1
            else:
                # Create new inventory product
                book_id = f"book_{uuid.uuid4().hex[:12]}"
                product = {
                    "book_id": book_id,
                    "name": name,
                    "code": code,
                    "grade": grade,
                    "price": agg["price"],
                    "inventory_quantity": 0,
                    "reserved_quantity": 0,
                    "is_sysbook": True,
                    "active": True,
                    "created_at": now,
                    "source": "presale_sync",
                }
                await db.store_products.insert_one(product)
                created_count += 1

            book_id_map[key] = book_id

        # Step 3: Reset all reserved_quantity on sysbook products to 0, then recalculate
        await db.store_products.update_many(
            {"is_sysbook": True},
            {"$set": {"reserved_quantity": 0}}
        )

        # Step 4: Re-link presale order items and recalculate reserved_quantity
        updated_orders = 0
        reserved_totals = defaultdict(int)

        for order in orders:
            grade = order.get("grade", "")
            items = order.get("items", [])
            changed = False

            for item in items:
                code = item.get("book_code", "")
                name = item.get("book_name", "")
                key = f"{code}||{name}||{grade}"
                new_book_id = book_id_map.get(key)

                if new_book_id:
                    old_book_id = item.get("book_id", "")
                    if old_book_id != new_book_id or not item.get("matched"):
                        item["book_id"] = new_book_id
                        item["matched"] = True
                        changed = True
                    reserved_totals[new_book_id] += item.get("quantity_ordered", 1)

            if changed:
                await db.store_textbook_orders.update_one(
                    {"order_id": order["order_id"]},
                    {"$set": {"items": items, "updated_at": now}}
                )
                updated_orders += 1

        # Step 5: Set reserved_quantity on each product
        for book_id, total_reserved in reserved_totals.items():
            await db.store_products.update_one(
                {"book_id": book_id},
                {"$set": {"reserved_quantity": total_reserved}}
            )

        logger.info(f"[presale-sync] Created {created_count} products, matched {matched_count} existing, updated {updated_orders} orders, reserved quantities set for {len(reserved_totals)} products")
        return {
            "created": created_count,
            "matched": matched_count,
            "updated_orders": updated_orders,
            "products_with_reservations": len(reserved_totals),
            "total_reserved_units": sum(reserved_totals.values()),
        }

    # ---- Helper methods ----

    def _normalize_grade(self, grade_text: str) -> str:
        """Normalize Monday.com grade label to app format"""
        if not grade_text:
            return ""
        g = grade_text.strip()
        # Map Spanish ordinals and common labels
        mappings = {
            "1ro": "1", "2do": "2", "3ro": "3", "4to": "4", "5to": "5",
            "6to": "6", "7mo": "7", "8vo": "8", "9no": "9", "10mo": "10",
            "11vo": "11", "12vo": "12",
            "K4": "K4", "K5": "K5", "PK": "PK",
            "Kinder": "K5", "Pre-K": "PK",
        }
        return mappings.get(g, g)

    def _grade_variants(self, grade: str) -> List[str]:
        """Generate all variants of a grade for matching"""
        g = str(grade).strip()
        variants = [g]
        # Add common variants
        grade_map = {
            "1": ["1", "G1", "1ro"], "2": ["2", "G2", "2do"], "3": ["3", "G3", "3ro"],
            "4": ["4", "G4", "4to"], "5": ["5", "G5", "5to"], "6": ["6", "G6", "6to"],
            "7": ["7", "G7", "7mo"], "8": ["8", "G8", "8vo"], "9": ["9", "G9", "9no"],
            "10": ["10", "G10", "10mo"], "11": ["11", "G11", "11vo"], "12": ["12", "G12", "12vo"],
        }
        for key, vals in grade_map.items():
            if g in vals:
                variants = vals
                break
        return list(set(variants))

    def _parse_subitem_name(self, name: str) -> tuple:
        """Parse 'CODE - Book Name' or 'CODE Book Name' from subitem name.
        Codes can contain letters, digits, hyphens, underscores, slashes.
        Examples: 'G11-1 Writing & Grammar...', 'G10/11-2 Biology Text...'
        Returns (book_code, book_name)"""
        if not name:
            return ("", "")
        # Try "CODE - Name" pattern
        if " - " in name:
            parts = name.split(" - ", 1)
            code = parts[0].strip()
            bname = parts[1].strip() if len(parts) > 1 else name
            if re.match(r'^[A-Z0-9][A-Z0-9\-_/]{1,}', code):
                return (code, bname)
        # Try "CODE Name" (code is alphanumeric prefix with hyphens/slashes/underscores)
        match = re.match(r'^([A-Z0-9][A-Z0-9\-_/]*\d)\s+(.+)', name)
        if match:
            return (match.group(1), match.group(2))
        # Fallback: looser pattern — code must start with letter, end with digit
        match = re.match(r'^([A-Za-z][A-Za-z0-9\-_/]*\d)\s+(.+)', name)
        if match:
            return (match.group(1), match.group(2))
        return ("", name)

    async def _match_book(self, code: str, name: str, grade: str) -> Optional[Dict]:
        """Try to match a book to inventory by code or name.
        IMPORTANT: Name-based matching is always grade-scoped to prevent cross-grade mismatches."""
        PROJ = {"_id": 0, "product_id": 1, "book_id": 1, "code": 1, "name": 1, "price": 1, "grade": 1}

        # 1. Exact code match (code is globally unique, so no grade filter needed)
        if code:
            product = await db.store_products.find_one(
                {"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}, "is_sysbook": True},
                PROJ
            )
            if product:
                return product

            # 1b. Partial code match — code contains "/" which might be stored differently
            alt_code = code.replace("/", "-")
            if alt_code != code:
                product = await db.store_products.find_one(
                    {"code": {"$regex": f"^{re.escape(alt_code)}$", "$options": "i"}, "is_sysbook": True},
                    PROJ
                )
                if product:
                    return product

            # 1c. Try code contained in inventory code (still exact code, no grade needed)
            product = await db.store_products.find_one(
                {"code": {"$regex": re.escape(code), "$options": "i"}, "is_sysbook": True},
                PROJ
            )
            if product:
                return product

            # Code exists but no match found — DO NOT fall through to fuzzy name matching
            # This prevents cross-grade mismatches. Caller will auto-create a new product.
            return None

        # FALLBACK: Only used when no code is available
        # 2. Try extracting a code-like pattern from the name itself
        if not code and name:
            code_in_name = re.match(r'^([A-Za-z]\d+[/\-]?\d*[/\-]\d+)', name)
            if code_in_name:
                extracted_code = code_in_name.group(1)
                product = await db.store_products.find_one(
                    {"code": {"$regex": f"^{re.escape(extracted_code)}$", "$options": "i"}, "is_sysbook": True},
                    PROJ
                )
                if product:
                    return product
                alt = extracted_code.replace("/", "-")
                if alt != extracted_code:
                    product = await db.store_products.find_one(
                        {"code": {"$regex": f"^{re.escape(alt)}$", "$options": "i"}, "is_sysbook": True},
                        PROJ
                    )
                    if product:
                        return product

        # 3. Name-based matching — MUST match grade to avoid cross-grade mismatches
        if name and grade:
            grade_filter = {"grade": {"$regex": f"^{re.escape(grade)}$", "$options": "i"}, "is_sysbook": True}

            # 3a. Exact name prefix match within same grade
            products = await db.store_products.find(
                {**grade_filter, "name": {"$regex": re.escape(name[:30]), "$options": "i"}},
                PROJ
            ).to_list(5)
            if len(products) == 1:
                return products[0]
            if len(products) > 1:
                # Pick best match by name similarity
                best = min(products, key=lambda p: abs(len(name) - len(p.get("name", ""))))
                return best

            # 3b. Word-overlap fuzzy match within same grade
            name_words = set(w.lower() for w in re.findall(r'[a-zA-Z]{3,}', name))
            if len(name_words) >= 2:
                word_regex = "|".join(re.escape(w) for w in list(name_words)[:4])
                candidates = await db.store_products.find(
                    {**grade_filter, "name": {"$regex": word_regex, "$options": "i"}},
                    PROJ
                ).to_list(20)
                if candidates:
                    best = None
                    best_score = 0
                    for p in candidates:
                        p_words = set(w.lower() for w in re.findall(r'[a-zA-Z]{3,}', p.get("name", "")))
                        overlap = len(name_words & p_words)
                        score = overlap / max(len(name_words), 1)
                        if score > best_score:
                            best_score = score
                            best = p
                    if best and best_score >= 0.5:
                        return best

        return None

    def _name_match_score(self, name_lower: str, name_parts: List[str], order_name: str) -> float:
        """Calculate a matching score between student name and order name.
        Handles: 'John Smith' vs 'John Smith', 'Smith John' vs 'John Smith',
        or partial matches like 'John' matching 'John Edward Smith'
        """
        if not name_lower or not order_name:
            return 0.0
        order_lower = order_name.lower()
        # Exact match
        if name_lower == order_lower:
            return 1.0
        order_parts = order_lower.split()
        # All parts of one name appear in the other
        if all(p in order_lower for p in name_parts):
            return 0.95
        if all(p in name_lower for p in order_parts):
            return 0.95
        # Count matching parts
        matching = sum(1 for p in name_parts if p in order_parts)
        total = max(len(name_parts), len(order_parts))
        if total == 0:
            return 0.0
        return matching / total


    # ═══════════════════════════════════════════════════════════
    # RECONCILIATION — Compare Monday board vs imported orders
    # ═══════════════════════════════════════════════════════════

    async def reconcile(self, board_id: str) -> Dict:
        """
        Scan ALL Monday items and compare against imported orders.
        Returns categorized results:
        - synced: all subitems match
        - has_new_items: Monday has subitems not in the order
        - missing_import: Monday item marked Done but no order exists
        - not_imported: Monday item not yet marked Ready (informational)
        """
        await self._load_subitem_config()

        # Fetch ALL items from Monday board (not just "Ready" ones)
        all_items = await monday_client.get_board_items(board_id, limit=500, include_subitems=True)
        logger.info(f"[reconcile] Fetched {len(all_items)} total items from board {board_id}")

        # Get all imported orders with their monday_item_ids
        imported_orders = await db.store_textbook_orders.find(
            {"source": "monday_import"},
            {"_id": 0, "order_id": 1, "monday_item_id": 1, "monday_item_ids": 1,
             "student_name": 1, "grade": 1, "items": 1, "status": 1, "print_count": 1}
        ).to_list(2000)

        # Build lookup: monday_item_id → order
        order_by_monday_id = {}
        for order in imported_orders:
            mid = str(order.get("monday_item_id", ""))
            if mid:
                order_by_monday_id[mid] = order
            for mid2 in order.get("monday_item_ids", []):
                order_by_monday_id[str(mid2)] = order

        results = {
            "synced": [],
            "has_new_items": [],
            "missing_import": [],
            "not_imported": [],
            "total_monday_items": len(all_items),
            "total_imported_orders": len(imported_orders),
        }

        for item in all_items:
            monday_item_id = str(item.get("id", ""))
            item_name = item.get("name", "")
            cols = {c["id"]: c for c in item.get("column_values", [])}
            student_name = cols.get(ESTUDIANTE_COL, {}).get("text", "").strip() or item_name
            grade_text = cols.get(GRADO_COL, {}).get("text", "").strip()
            grade = self._normalize_grade(grade_text)
            trigger_text = cols.get(SYNC_TRIGGER_COL, {}).get("text", "").strip()

            monday_subitems = item.get("subitems") or []
            monday_subitem_ids = set(str(si.get("id", "")) for si in monday_subitems)
            monday_subitem_names = {str(si.get("id", "")): si.get("name", "") for si in monday_subitems}

            existing_order = order_by_monday_id.get(monday_item_id)

            entry = {
                "monday_item_id": monday_item_id,
                "student_name": student_name,
                "grade": grade,
                "monday_subitems_count": len(monday_subitems),
                "sync_column": trigger_text,
            }

            if existing_order:
                # Order exists — compare subitems
                order_subitem_ids = set(
                    str(it.get("monday_subitem_id", ""))
                    for it in existing_order.get("items", [])
                    if it.get("monday_subitem_id")
                )
                existing_count = len(order_subitem_ids)
                new_subitem_ids = monday_subitem_ids - order_subitem_ids
                removed_subitem_ids = order_subitem_ids - monday_subitem_ids

                entry["order_id"] = existing_order["order_id"]
                entry["order_status"] = existing_order.get("status", "")
                entry["order_items_count"] = existing_count
                entry["print_count"] = existing_order.get("print_count", 0)

                if new_subitem_ids:
                    # Has new items not in the order
                    new_items_detail = []
                    for si in monday_subitems:
                        si_id = str(si.get("id", ""))
                        if si_id in new_subitem_ids:
                            si_name = si.get("name", "")
                            book_code, book_name = self._parse_subitem_name(si_name)
                            # Parse price
                            price = 0.0
                            for col in si.get("column_values", []):
                                if col.get("id") == self._subitem_price_col:
                                    try:
                                        price = float((col.get("text") or "0").replace(",", "").replace("$", ""))
                                    except ValueError:
                                        pass
                            new_items_detail.append({
                                "monday_subitem_id": si_id,
                                "name": si_name,
                                "book_code": book_code,
                                "book_name": book_name,
                                "price": price,
                                "quantity": 1,
                            })
                    entry["new_items"] = new_items_detail
                    entry["new_items_count"] = len(new_items_detail)
                    results["has_new_items"].append(entry)
                else:
                    entry["new_items_count"] = 0
                    results["synced"].append(entry)
            else:
                # No order exists for this Monday item
                if trigger_text in ["Done", "done", "Hecho"]:
                    # Was marked Done but never imported
                    entry["reason"] = "marked_done_but_not_imported"
                    results["missing_import"].append(entry)
                elif trigger_text in SYNC_TRIGGER_LABELS:
                    entry["reason"] = "ready_not_yet_imported"
                    results["not_imported"].append(entry)
                else:
                    entry["reason"] = f"sync_column={trigger_text or 'empty'}"
                    results["not_imported"].append(entry)

        logger.info(
            f"[reconcile] Results: {len(results['synced'])} synced, "
            f"{len(results['has_new_items'])} with new items, "
            f"{len(results['missing_import'])} missing, "
            f"{len(results['not_imported'])} not imported"
        )
        return results

    async def merge_new_items(self, order_id: str, monday_item_id: str,
                               new_items: List[Dict], admin_user_id: str) -> Dict:
        """Merge new subitems into an existing order"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
        if not order:
            raise ValueError(f"Order {order_id} not found")

        existing_items = order.get("items", [])
        existing_subitem_ids = set(
            str(it.get("monday_subitem_id", "")) for it in existing_items if it.get("monday_subitem_id")
        )

        added = []
        skipped = []
        total_added_amount = 0.0

        for ni in new_items:
            si_id = str(ni.get("monday_subitem_id", ""))
            if si_id in existing_subitem_ids:
                skipped.append({"subitem_id": si_id, "reason": "already_exists"})
                continue

            book_code = ni.get("book_code", "")
            book_name = ni.get("book_name", ni.get("name", ""))
            price = float(ni.get("price", 0))
            quantity = int(ni.get("quantity", 1))
            grade = order.get("grade", "")

            # Try to match to inventory
            match = await self._match_book(book_code, book_name, grade)
            if match:
                book_id = match.get("product_id", "") or match.get("book_id", "")
                book_code = match.get("code", book_code)
                book_name = match.get("name", book_name)
                price = price or match.get("price", 0)
                matched = True
            else:
                book_id = f"unmatched_{uuid.uuid4().hex[:8]}"
                matched = False

            new_item = {
                "book_id": book_id,
                "book_code": book_code,
                "book_name": book_name,
                "price": price,
                "quantity_ordered": quantity,
                "max_quantity": quantity,
                "status": "ordered",
                "ordered_at": datetime.now(timezone.utc).isoformat(),
                "monday_subitem_id": si_id,
                "matched": matched,
                "merged_at": datetime.now(timezone.utc).isoformat(),
                "merged_by": admin_user_id,
            }
            existing_items.append(new_item)
            total_added_amount += price * quantity
            added.append({"subitem_id": si_id, "book_name": book_name, "price": price})

        # Update order
        now = datetime.now(timezone.utc).isoformat()
        new_total = float(order.get("total_amount", 0)) + total_added_amount
        await db.store_textbook_orders.update_one(
            {"order_id": order_id},
            {"$set": {
                "items": existing_items,
                "total_amount": new_total,
                "updated_at": now,
                "last_merge_at": now,
                "last_merge_by": admin_user_id,
            }}
        )

        logger.info(f"[reconcile] Merged {len(added)} new items into order {order_id}")
        return {
            "success": True,
            "order_id": order_id,
            "added": len(added),
            "skipped": len(skipped),
            "new_total": new_total,
            "details": {"added": added, "skipped": skipped},
        }

    async def import_specific_items(self, board_id: str, monday_item_ids: List[str],
                                     admin_user_id: str) -> Dict:
        """Import specific Monday items by ID (for missing imports)"""
        await self._load_subitem_config()
        all_items = await monday_client.get_board_items(board_id, limit=500, include_subitems=True)

        target_items = [it for it in all_items if str(it.get("id", "")) in monday_item_ids]
        if not target_items:
            return {"imported": 0, "errors": [{"error": "No matching items found on Monday board"}]}

        imported = []
        errors = []
        for item in target_items:
            mid = str(item.get("id", ""))
            try:
                existing = await db.store_textbook_orders.find_one(
                    {"monday_item_ids": mid}, {"_id": 0, "order_id": 1}
                )
                if existing:
                    errors.append({"monday_id": mid, "error": "already_imported", "order_id": existing["order_id"]})
                    continue

                parsed = await self._parse_monday_item_safe(item, board_id)
                if not parsed:
                    errors.append({"monday_id": mid, "error": "parse_failed"})
                    continue

                order = await self._create_presale_order(parsed, mid, admin_user_id)
                imported.append({
                    "order_id": order["order_id"],
                    "monday_id": mid,
                    "student_name": parsed["student_name"],
                    "items_count": len(parsed["items"]),
                })
            except Exception as e:
                errors.append({"monday_id": mid, "error": str(e)})

        return {"imported": len(imported), "errors": errors, "details": imported}


# Singleton
presale_import_service = PreSaleImportService()
