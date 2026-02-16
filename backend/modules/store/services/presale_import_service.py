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
from ..services.monday_config_service import monday_config_service

logger = logging.getLogger(__name__)

# Monday.com column IDs for Textbook Orders board
ESTUDIANTE_COL = "text_mm026sg3"
GRADO_COL = "color_mm02xhw1"
SYNC_TRIGGER_COL = "color_mm0mnmrs"

# Status labels on the sync trigger column that mean "ready to import"
SYNC_TRIGGER_LABELS = ["Ready", "Sync", "Import", "Listo", "ready", "sync", "import", "listo"]


class PreSaleImportService:
    """Import pre-sale orders from Monday.com and auto-link on registration"""

    async def fetch_importable_items(self, board_id: str) -> List[Dict]:
        """Fetch items from Monday.com board that are marked for import via the trigger column"""
        items = await monday_client.get_board_items(board_id, limit=200)
        importable = []
        for item in items:
            cols = {c["id"]: c for c in item.get("column_values", [])}
            trigger_col = cols.get(SYNC_TRIGGER_COL, {})
            trigger_text = trigger_col.get("text", "").strip()
            if trigger_text and trigger_text in SYNC_TRIGGER_LABELS:
                importable.append(item)
        return importable

    async def preview_import(self, board_id: str) -> Dict:
        """Preview what would be imported — no DB changes"""
        items = await self.fetch_importable_items(board_id)
        previews = []
        for item in items:
            parsed = await self._parse_monday_item(item, board_id)
            if parsed:
                previews.append(parsed)
        return {"count": len(previews), "items": previews}

    async def import_presale_orders(self, board_id: str, admin_user_id: str) -> Dict:
        """Import pre-sale orders from Monday.com into the app"""
        items = await self.fetch_importable_items(board_id)
        imported = []
        skipped = []
        errors = []

        for item in items:
            monday_item_id = str(item.get("id", ""))
            try:
                # Skip if already imported
                existing = await db.store_textbook_orders.find_one(
                    {"monday_item_ids": monday_item_id}, {"_id": 0, "order_id": 1}
                )
                if existing:
                    skipped.append({"monday_id": monday_item_id, "reason": "already_imported", "order_id": existing.get("order_id")})
                    continue

                parsed = await self._parse_monday_item(item, board_id)
                if not parsed:
                    skipped.append({"monday_id": monday_item_id, "reason": "parse_failed"})
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

                # Update Monday.com trigger column to "Done" to prevent re-import
                try:
                    await monday_client.update_column_values(
                        board_id, monday_item_id,
                        {SYNC_TRIGGER_COL: {"label": "Done"}},
                        create_labels_if_missing=True
                    )
                except Exception as e:
                    logger.warning(f"Failed to update trigger column for item {monday_item_id}: {e}")

            except Exception as e:
                logger.error(f"Error importing Monday item {monday_item_id}: {e}")
                errors.append({"monday_id": monday_item_id, "error": str(e)})

        return {
            "imported": len(imported),
            "skipped": len(skipped),
            "errors": len(errors),
            "details": {"imported": imported, "skipped": skipped, "errors": errors}
        }

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

        # Fetch subitems (each = a book)
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
            for col in si.get("column_values", []):
                text = col.get("text", "").strip()
                if not text:
                    continue
                # Try to detect quantity columns
                if col.get("id", "").startswith("numbers") or "cantidad" in col.get("id", "").lower() or "quantity" in col.get("id", "").lower():
                    try:
                        val = float(text.replace(",", ""))
                        if val < 100:  # Likely quantity
                            quantity = max(1, int(val))
                        else:  # Likely price
                            price = val
                    except ValueError:
                        pass

            if match:
                price = price or match.get("price", 0)
                book_id = match.get("product_id", "")
                book_code = match.get("code", book_code)
                book_name = match.get("name", book_name)
            else:
                book_id = f"unmatched_{uuid.uuid4().hex[:8]}"

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
                "matched": match is not None,
            })

        return {
            "parent_name": item_name,
            "student_name": student_name,
            "grade": grade,
            "items": items,
            "total": total,
            "monday_item_id": monday_item_id,
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
            "monday_item_ids": [monday_item_id],
            "imported_by": admin_user_id,
            "imported_at": now,
            "link_status": "unlinked",
            "created_at": now,
            "updated_at": now,
        }
        await db.store_textbook_orders.insert_one(order)
        order.pop("_id", None)
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
        Returns (book_code, book_name)"""
        if not name:
            return ("", "")
        # Try "CODE - Name" pattern
        if " - " in name:
            parts = name.split(" - ", 1)
            code = parts[0].strip()
            bname = parts[1].strip() if len(parts) > 1 else name
            if re.match(r'^[A-Z0-9\-_]{2,}', code):
                return (code, bname)
        # Try "CODE Name" (code is uppercase/alphanumeric prefix)
        match = re.match(r'^([A-Z0-9\-_]{2,})\s+(.+)', name)
        if match:
            return (match.group(1), match.group(2))
        return ("", name)

    async def _match_book(self, code: str, name: str, grade: str) -> Optional[Dict]:
        """Try to match a book to inventory by code or name"""
        # 1. Try exact code match
        if code:
            product = await db.store_products.find_one(
                {"code": {"$regex": f"^{re.escape(code)}$", "$options": "i"}, "is_private_catalog": True},
                {"_id": 0, "product_id": 1, "code": 1, "name": 1, "price": 1}
            )
            if product:
                return product

        # 2. Try name match (case-insensitive contains)
        if name:
            products = await db.store_products.find(
                {"name": {"$regex": re.escape(name[:30]), "$options": "i"}, "is_private_catalog": True},
                {"_id": 0, "product_id": 1, "code": 1, "name": 1, "price": 1}
            ).to_list(5)
            if len(products) == 1:
                return products[0]
            # If multiple matches, try to narrow by grade
            if products and grade:
                for p in products:
                    if grade.lower() in (p.get("grade", "") or "").lower():
                        return p
                return products[0]  # Return first match

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


# Singleton
presale_import_service = PreSaleImportService()
