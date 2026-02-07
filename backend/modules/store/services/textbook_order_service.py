"""
Textbook Order Service
Business logic for textbook ordering system
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import logging
import httpx
import json

from core.base import BaseService
from core.database import db
from core.config import MONDAY_API_KEY
from ..repositories.textbook_order_repository import textbook_order_repository
from ..repositories.textbook_access_repository import student_record_repository
from .textbook_access_service import textbook_access_service
from .monday_config_service import monday_config_service
from ..models.textbook_order import (
    OrderStatus, OrderItemStatus, OrderItem,
    SubmitOrderRequest, ReorderRequest
)

logger = logging.getLogger(__name__)


class TextbookOrderService(BaseService):
    """Service for managing textbook orders"""
    
    MODULE_NAME = "textbook_order"
    
    def __init__(self):
        super().__init__()
        self.order_repo = textbook_order_repository
        self.student_repo = student_record_repository
    
    def get_current_year(self) -> int:
        """Get current school year"""
        return datetime.now(timezone.utc).year
    
    async def get_books_for_grade(self, grade: str) -> List[Dict]:
        """Get all books for a specific grade"""
        logger.info(f"[get_books_for_grade] Looking for books for grade: {grade}")
        
        # Handle grade format variations
        grade_queries = [grade]
        
        # Map simple grades to all possible format variations
        # Supports: numeric ("3"), prefixed ("G3"), ordinal ("3rd Grade"), Spanish ("3er Grado")
        grade_mappings = {
            "1": ["1", "G1", "1st Grade", "1er Grado", "Grade 1", "Grado 1"],
            "2": ["2", "G2", "2nd Grade", "2do Grado", "Grade 2", "Grado 2"],
            "3": ["3", "G3", "3rd Grade", "3er Grado", "Grade 3", "Grado 3"],
            "4": ["4", "G4", "4th Grade", "4to Grado", "Grade 4", "Grado 4"],
            "5": ["5", "G5", "5th Grade", "5to Grado", "Grade 5", "Grado 5"],
            "6": ["6", "G6", "6th Grade", "6to Grado", "Grade 6", "Grado 6"],
            "7": ["7", "G7", "7th Grade", "7mo Grado", "Grade 7", "Grado 7"],
            "8": ["8", "G8", "8th Grade", "8vo Grado", "Grade 8", "Grado 8"],
            "9": ["9", "G9", "9th Grade", "9no Grado", "Grade 9", "Grado 9"],
            "10": ["10", "G10", "10th Grade", "10mo Grado", "Grade 10", "Grado 10"],
            "11": ["11", "G11", "11th Grade", "11vo Grado", "Grade 11", "Grado 11"],
            "12": ["12", "G12", "12th Grade", "12vo Grado", "Grade 12", "Grado 12"],
            "K": ["K", "Kinder", "Kindergarten"],
            "K3": ["K3", "Pre-K3", "PK3"],
            "K4": ["K4", "Pre-K4", "PK4"],
            "K5": ["K5", "Pre-K5", "PK5", "Kinder"],
            "PK": ["PK", "Pre-Kinder", "Pre-K"],
            # Also handle reverse mappings (if student has "G3", map to all "3" variants)
            "G1": ["G1", "1", "1st Grade", "1er Grado", "Grade 1", "Grado 1"],
            "G2": ["G2", "2", "2nd Grade", "2do Grado", "Grade 2", "Grado 2"],
            "G3": ["G3", "3", "3rd Grade", "3er Grado", "Grade 3", "Grado 3"],
            "G4": ["G4", "4", "4th Grade", "4to Grado", "Grade 4", "Grado 4"],
            "G5": ["G5", "5", "5th Grade", "5to Grado", "Grade 5", "Grado 5"],
            "G6": ["G6", "6", "6th Grade", "6to Grado", "Grade 6", "Grado 6"],
            "G7": ["G7", "7", "7th Grade", "7mo Grado", "Grade 7", "Grado 7"],
            "G8": ["G8", "8", "8th Grade", "8vo Grado", "Grade 8", "Grado 8"],
            "G9": ["G9", "9", "9th Grade", "9no Grado", "Grade 9", "Grado 9"],
            "G10": ["G10", "10", "10th Grade", "10mo Grado", "Grade 10", "Grado 10"],
            "G11": ["G11", "11", "11th Grade", "11vo Grado", "Grade 11", "Grado 11"],
            "G12": ["G12", "12", "12th Grade", "12vo Grado", "Grade 12", "Grado 12"],
        }
        
        if grade in grade_mappings:
            grade_queries = grade_mappings[grade]
        
        logger.info(f"[get_books_for_grade] Query grades: {grade_queries}")
        
        # Query using English field names only
        books = await db.store_products.find(
            {
                "active": True,
                "is_private_catalog": True,
                "$or": [
                    {"grade": {"$in": grade_queries}},
                    {"grades": {"$in": grade_queries}}
                ]
            },
            {"_id": 0}
        ).sort("name", 1).to_list(200)
        
        logger.info(f"[get_books_for_grade] Found {len(books)} books")
        if len(books) > 0:
            logger.info(f"[get_books_for_grade] First book: {books[0].get('name')} - grade: {books[0].get('grade')}")
        else:
            # Debug: check what products exist
            total_private = await db.store_products.count_documents({"is_private_catalog": True})
            total_active = await db.store_products.count_documents({"active": True})
            logger.warning(f"[get_books_for_grade] No books found! is_private_catalog={total_private}, active={total_active}")
        
        return books
    
    async def get_or_create_order(
        self, 
        user_id: str, 
        student_id: str
    ) -> Dict:
        """Get existing order or create a new one for a student"""
        logger.info(f"[get_or_create_order] user_id={user_id}, student_id={student_id}")
        
        # Verify student belongs to user and is approved
        student = await self.student_repo.get_by_id(student_id)
        if not student:
            logger.warning(f"[get_or_create_order] Student not found: {student_id}")
            raise ValueError("Student not found")
        
        logger.info(f"[get_or_create_order] Found student: {student.get('full_name')}, user_id={student.get('user_id')}")
        
        if student.get("user_id") != user_id:
            logger.warning(f"[get_or_create_order] Access denied - student user_id={student.get('user_id')}, request user_id={user_id}")
            raise ValueError("Access denied")
        
        # Check if student has approved enrollment for current year
        current_year = self.get_current_year()
        enrollments = student.get("enrollments", [])
        logger.info(f"[get_or_create_order] Current year={current_year}, enrollments count={len(enrollments)}")
        logger.info(f"[get_or_create_order] Enrollments: {enrollments}")
        
        # Find approved enrollment for current year
        current_enrollment = next(
            (e for e in enrollments if e.get("year") == current_year and e.get("status") == "approved"),
            None
        )
        
        if not current_enrollment:
            logger.warning(f"[get_or_create_order] No approved enrollment found for year {current_year}")
            logger.warning(f"[get_or_create_order] Available enrollments: {[(e.get('year'), e.get('status')) for e in enrollments]}")
            raise ValueError("Student must have approved enrollment to order textbooks")
        
        grade = current_enrollment.get("grade", "")
        logger.info(f"[get_or_create_order] Found enrollment - grade={grade}, year={current_year}")
        
        # Check if order already exists
        existing_order = await self.order_repo.get_by_student(student_id, current_year)
        
        if existing_order:
            logger.info(f"[get_or_create_order] Found existing order: {existing_order.get('order_id')}")
            # Refresh items with latest book data
            return await self._refresh_order_items(existing_order)
        
        # Create new order with all books for this grade
        logger.info(f"[get_or_create_order] No existing order, fetching books for grade={grade}")
        books = await self.get_books_for_grade(grade)
        logger.info(f"[get_or_create_order] Found {len(books)} books for grade {grade}")
        
        items = []
        for book in books:
            inventory = book.get("inventory_quantity", 0) - book.get("reserved_quantity", 0)
            status = OrderItemStatus.AVAILABLE.value if inventory > 0 else OrderItemStatus.OUT_OF_STOCK.value
            
            items.append({
                "book_id": book["book_id"],
                "book_code": book.get("code", ""),
                "book_name": book["name"],
                "price": float(book.get("price", 0)),
                "quantity_ordered": 0,
                "max_quantity": 1,
                "status": status,
                "ordered_at": None,
                "notes": None
            })
        
        order_data = {
            "user_id": user_id,
            "student_id": student_id,
            "student_name": student.get("full_name", ""),
            "school_id": student.get("school_id", ""),
            "grade": grade,
            "year": current_year,
            "items": items,
            "total_amount": 0,
            "status": OrderStatus.DRAFT.value,
            "submitted_at": None,
            "monday_item_id": None,
            "monday_subitems": []
        }
        
        return await self.order_repo.create(order_data)
    
    async def _refresh_order_items(self, order: Dict) -> Dict:
        """Refresh order items with latest book/inventory data"""
        grade = order.get("grade", "")
        logger.info(f"[_refresh_order_items] Refreshing order {order.get('order_id')} for grade={grade}")
        
        books = await self.get_books_for_grade(grade)
        logger.info(f"[_refresh_order_items] Found {len(books)} books for grade {grade}")
        
        books_dict = {b["book_id"]: b for b in books}
        
        existing_items = {item["book_id"]: item for item in order.get("items", [])}
        logger.info(f"[_refresh_order_items] Existing items count: {len(existing_items)}")
        
        updated_items = []
        
        for book_id, book in books_dict.items():
            inventory = book.get("inventory_quantity", 0) - book.get("reserved_quantity", 0)
            
            if book_id in existing_items:
                item = existing_items[book_id]
                # Update price and availability
                item["price"] = float(book.get("price", 0))
                item["book_name"] = book["name"]
                
                # Only update status if not already ordered
                if item["status"] not in [OrderItemStatus.ORDERED.value]:
                    if inventory <= 0:
                        item["status"] = OrderItemStatus.OUT_OF_STOCK.value
                    elif item["status"] == OrderItemStatus.OUT_OF_STOCK.value:
                        item["status"] = OrderItemStatus.AVAILABLE.value
                
                updated_items.append(item)
            else:
                # New book added to catalog
                status = OrderItemStatus.AVAILABLE.value if inventory > 0 else OrderItemStatus.OUT_OF_STOCK.value
                updated_items.append({
                    "book_id": book_id,
                    "book_code": book.get("code", ""),
                    "book_name": book["name"],
                    "price": float(book.get("price", 0)),
                    "quantity_ordered": 0,
                    "max_quantity": 1,
                    "status": status,
                    "ordered_at": None,
                    "notes": None
                })
        
        # Recalculate total
        total = sum(
            item["price"] * item["quantity_ordered"] 
            for item in updated_items 
            if item["quantity_ordered"] > 0
        )
        
        order["items"] = updated_items
        order["total_amount"] = total
        
        await self.order_repo.update_order(order["order_id"], {
            "items": updated_items,
            "total_amount": total
        })
        
        return order
    
    async def update_item_selection(
        self,
        user_id: str,
        order_id: str,
        book_id: str,
        quantity: int
    ) -> Dict:
        """Update item selection for available or reorder-approved items"""
        order = await self.order_repo.get_by_id(order_id)
        
        if not order:
            raise ValueError("Order not found")
        
        if order.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Find and update the item
        items = order.get("items", [])
        item_found = False
        
        for item in items:
            if item["book_id"] == book_id:
                item_found = True
                
                # Check if item can be modified based on status
                item_status = item.get("status", "")
                
                # Items that CANNOT be modified
                if item_status == OrderItemStatus.ORDERED.value:
                    raise ValueError("This book has already been ordered. Request a reorder if needed.")
                
                if item_status == OrderItemStatus.REORDER_REQUESTED.value:
                    raise ValueError("Reorder request is pending admin approval")
                
                if item_status == OrderItemStatus.OUT_OF_STOCK.value and quantity > 0:
                    raise ValueError("This book is out of stock")
                
                # Items that CAN be modified: available, reorder_approved
                allowed_statuses = [
                    OrderItemStatus.AVAILABLE.value,
                    OrderItemStatus.REORDER_APPROVED.value
                ]
                
                if item_status not in allowed_statuses:
                    raise ValueError(f"Cannot modify item with status: {item_status}")
                
                # Validate quantity
                if quantity < 0:
                    quantity = 0
                if quantity > item.get("max_quantity", 1):
                    raise ValueError(f"Maximum quantity allowed is {item.get('max_quantity', 1)}")
                
                item["quantity_ordered"] = quantity
                break
        
        if not item_found:
            raise ValueError("Book not found in order")
        
        # Recalculate total
        total = sum(
            item["price"] * item["quantity_ordered"] 
            for item in items 
            if item["quantity_ordered"] > 0
        )
        
        await self.order_repo.update_order(order_id, {
            "items": items,
            "total_amount": total
        })
        
        order["items"] = items
        order["total_amount"] = total
        
        return order
    
    async def submit_order(
        self,
        user_id: str,
        order_id: str,
        notes: Optional[str] = None
    ) -> Dict:
        """Submit order - locks selected items and sends to Monday.com
        Supports partial submissions: user can submit some items now and others later
        """
        order = await self.order_repo.get_by_id(order_id)
        
        if not order:
            raise ValueError("Order not found")
        
        if order.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Get items that are newly selected (not yet ordered)
        items = order.get("items", [])
        new_selected_items = [
            item for item in items 
            if item.get("quantity_ordered", 0) > 0 and item["status"] != OrderItemStatus.ORDERED.value
        ]
        
        if not new_selected_items:
            raise ValueError("Please select at least one new book to order")
        
        # Lock newly selected items
        now = datetime.now(timezone.utc).isoformat()
        for item in items:
            if item.get("quantity_ordered", 0) > 0 and item["status"] != OrderItemStatus.ORDERED.value:
                item["status"] = OrderItemStatus.ORDERED.value
                item["ordered_at"] = now
        
        # Check if there are still available items that can be ordered later
        available_items = [
            item for item in items 
            if item["status"] == OrderItemStatus.AVAILABLE.value or item["status"] == OrderItemStatus.REORDER_APPROVED.value
        ]
        
        # Calculateste total for this submission
        submission_total = sum(
            item["price"] * item["quantity_ordered"] 
            for item in new_selected_items
        )
        
        # Get user info for Monday.com
        user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0})
        user_name = user.get("name", "") if user else ""
        user_email = user.get("email", "") if user else ""
        
        # Send to Monday.com
        monday_item_id = None
        monday_subitems = []
        
        try:
            monday_result = await self._send_to_monday(
                order=order,
                selected_items=new_selected_items,
                user_name=user_name,
                user_email=user_email,
                submission_total=submission_total
            )
            monday_item_id = monday_result.get("item_id")
            monday_subitems = monday_result.get("subitems", [])
        except Exception as e:
            logger.error(f"Failed to send to Monday.com: {e}")
            # Continue even if Monday fails - we can retry later

        # Link monday_subitem_id to each book item in the order
        if monday_subitems:
            subitem_map = {s["book_id"]: s["monday_subitem_id"] for s in monday_subitems}
            for item in items:
                if item["book_id"] in subitem_map:
                    item["monday_subitem_id"] = subitem_map[item["book_id"]]
        
        # Track submission history
        submissions = order.get("submissions", [])
        submissions.append({
            "submitted_at": now,
            "items": [{"book_id": i["book_id"], "book_name": i["book_name"], "price": i["price"]} for i in new_selected_items],
            "total": submission_total,
            "monday_item_id": monday_item_id
        })
        
        # Recalculate overall total (all ordered items)
        total_amount = sum(
            item["price"] * item["quantity_ordered"] 
            for item in items 
            if item["status"] == OrderItemStatus.ORDERED.value
        )
        
        # Status: always "submitted" after any submission - user has made a purchase
        new_status = OrderStatus.SUBMITTED.value
        
        # Update order
        await self.order_repo.update_order(order_id, {
            "items": items,
            "status": new_status,
            "last_submitted_at": now,
            "submissions": submissions,
            "notes": notes,
            "total_amount": total_amount,
            "monday_item_ids": order.get("monday_item_ids", []) + ([monday_item_id] if monday_item_id else [])
        })
        
        # Send notification
        await self._notify_order_submitted(order, user_name, user_email)
        
        order["items"] = items
        order["status"] = new_status
        order["last_submitted_at"] = now
        order["total_amount"] = total_amount
        order["submission_total"] = submission_total
        order["items_ordered_now"] = len(new_selected_items)
        order["items_available"] = len(available_items)
        
        self.log_info(f"Order {order_id} partial submission by user {user_id}: {len(new_selected_items)} items, ${submission_total:.2f}")
        
        return order
    
    async def _send_to_monday(
        self,
        order: Dict,
        selected_items: List[Dict],
        user_name: str,
        user_email: str,
        submission_total: float = None
    ) -> Dict:
        """Send order to Monday.com — delegates to adapter architecture.
        Creates item + subitems on orders board, then updates TXB inventory board.
        """
        from .monday_sync_service import monday_sync_service

        # 1. Sync order to Monday.com (item + subitems + update)
        result = await monday_sync_service.sync_order_to_monday(
            order, selected_items, user_name, user_email, submission_total
        )

        # 2. Update TXB inventory board — create subitems per student (non-blocking)
        try:
            student_name = order.get("student_name", "")
            order_reference = order.get("order_id", "")
            inv_items = [{
                "book_code": item.get("book_code", ""),
                "book_name": item["book_name"],
                "quantity_ordered": item["quantity_ordered"],
                "grade": order.get("grade", ""),
                "price": item.get("price"),
            } for item in selected_items]
            inv_result = await monday_sync_service.update_inventory_board(
                inv_items, student_name=student_name, order_reference=order_reference
            )
            logger.info(f"TXB Inventory update: {inv_result}")
        except Exception as e:
            logger.warning(f"TXB Inventory update failed (non-blocking): {e}")

        return result
    
    async def request_reorder(
        self,
        user_id: str,
        order_id: str,
        book_id: str,
        reason: str
    ) -> Dict:
        """Request to reorder a book that was already ordered"""
        order = await self.order_repo.get_by_id(order_id)
        
        if not order:
            raise ValueError("Order not found")
        
        if order.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Find the item
        items = order.get("items", [])
        item_found = False
        
        for item in items:
            if item["book_id"] == book_id:
                item_found = True
                
                if item["status"] != OrderItemStatus.ORDERED.value:
                    raise ValueError("This book has not been ordered yet")
                
                if item["quantity_ordered"] >= item["max_quantity"]:
                    item["status"] = OrderItemStatus.REORDER_REQUESTED.value
                    item["reorder_reason"] = reason
                    item["reorder_requested_at"] = datetime.now(timezone.utc).isoformat()
                else:
                    raise ValueError("You can still order more of this book")
                break
        
        if not item_found:
            raise ValueError("Book not found in order")
        
        await self.order_repo.update_order(order_id, {"items": items})
        
        # Notify admin
        await self._notify_reorder_request(order, book_id, reason)
        
        order["items"] = items
        return order
    
    async def admin_approve_reorder(
        self,
        admin_id: str,
        order_id: str,
        book_id: str,
        max_quantity: int,
        admin_notes: Optional[str] = None
    ) -> Dict:
        """Admin approves reorder request"""
        order = await self.order_repo.get_by_id(order_id)
        
        if not order:
            raise ValueError("Order not found")
        
        items = order.get("items", [])
        item_found = False
        
        for item in items:
            if item["book_id"] == book_id:
                item_found = True
                item["max_quantity"] = max_quantity
                item["status"] = OrderItemStatus.REORDER_APPROVED.value
                item["reorder_approved_by"] = admin_id
                item["reorder_approved_at"] = datetime.now(timezone.utc).isoformat()
                item["admin_notes"] = admin_notes
                break
        
        if not item_found:
            raise ValueError("Book not found in order")
        
        await self.order_repo.update_order(order_id, {"items": items})
        
        # Notify user
        await self._notify_reorder_approved(order, book_id)
        
        order["items"] = items
        return order
    
    async def admin_update_order_status(
        self,
        admin_id: str,
        order_id: str,
        status: OrderStatus
    ) -> Dict:
        """Admin updates order status"""
        order = await self.order_repo.get_by_id(order_id)
        
        if not order:
            raise ValueError("Order not found")
        
        await self.order_repo.update_order(order_id, {
            "status": status.value,
            "status_updated_by": admin_id,
            "status_updated_at": datetime.now(timezone.utc).isoformat()
        })
        
        order["status"] = status.value
        return order
    
    async def get_user_orders(self, user_id: str, year: Optional[int] = None) -> List[Dict]:
        """Get all orders for a user"""
        return await self.order_repo.get_by_user(user_id, year)
    
    async def get_all_orders(
        self,
        status: Optional[str] = None,
        grade: Optional[str] = None,
        year: Optional[int] = None
    ) -> List[Dict]:
        """Get all orders (admin view)"""
        orders = await self.order_repo.get_all(status, grade, year)
        
        # Enrich with user info
        for order in orders:
            user = await db.auth_users.find_one(
                {"user_id": order.get("user_id")},
                {"_id": 0, "name": 1, "email": 1}
            )
            if user:
                order["user_name"] = user.get("name", "")
                order["user_email"] = user.get("email", "")
        
        return orders
    
    async def get_order_stats(self, year: Optional[int] = None) -> Dict:
        """Get order statistics"""
        stats = await self.order_repo.get_stats(year)
        stats["total_orders"] = sum(stats.get("orders_by_status", {}).values())
        return stats
    
    async def get_pending_reorders(self) -> List[Dict]:
        """Get all pending reorder requests"""
        reorders = await self.order_repo.get_pending_reorders()
        
        # Enrich with user info
        for reorder in reorders:
            user = await db.auth_users.find_one(
                {"user_id": reorder.get("user_id")},
                {"_id": 0, "name": 1, "email": 1}
            )
            if user:
                reorder["user_name"] = user.get("name", "")
                reorder["user_email"] = user.get("email", "")
        
        return reorders
    
    # ============== NOTIFICATIONS ==============
    
    async def _notify_order_submitted(self, order: Dict, user_name: str, user_email: str):
        """Notify about order submission"""
        try:
            notification = {
                "type": "textbook_order_submitted",
                "title": "Nuevo Pedido de Textos",
                "message": f"{user_name} ha enviado un pedido para {order['student_name']} ({order['grade']})",
                "data": {
                    "order_id": order["order_id"],
                    "student_name": order["student_name"],
                    "total": order["total_amount"]
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.notifications.insert_one(notification)
            logger.info(f"Order submitted notification: {notification['message']}")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    async def _notify_reorder_request(self, order: Dict, book_id: str, reason: str):
        """Notify admin about reorder request"""
        try:
            book = next((i for i in order["items"] if i["book_id"] == book_id), None)
            book_name = book["book_name"] if book else "Unknown"
            
            notification = {
                "type": "textbook_reorder_request",
                "title": "Solicitud de Recompra",
                "message": f"Solicitud de recompra para {book_name} - {order['student_name']}",
                "data": {
                    "order_id": order["order_id"],
                    "book_id": book_id,
                    "reason": reason
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.notifications.insert_one(notification)
            logger.info(f"Reorder request notification: {notification['message']}")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    async def _notify_reorder_approved(self, order: Dict, book_id: str):
        """Notify user about reorder approval"""
        try:
            book = next((i for i in order["items"] if i["book_id"] == book_id), None)
            book_name = book["book_name"] if book else "Unknown"
            
            notification = {
                "type": "textbook_reorder_approved",
                "title": "Recompra Aprobada",
                "message": f"Tu request de recompra para {book_name} ha sido aprobada",
                "data": {
                    "order_id": order["order_id"],
                    "book_id": book_id
                },
                "user_id": order["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.core_notifications.insert_one(notification)
            logger.info(f"Reorder approved notification: {notification['message']}")
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    async def _get_monday_api_key(self) -> Optional[str]:
        """Get active Monday.com API key from workspace config or env fallback"""
        try:
            workspaces_config = await monday_config_service.get_workspaces()
            active_workspace_id = workspaces_config.get("active_workspace_id")
            for ws in workspaces_config.get("workspaces", []):
                if ws.get("workspace_id") == active_workspace_id and ws.get("api_key"):
                    return ws["api_key"]
        except Exception as e:
            logger.debug(f"Could not load workspace config: {e}")
        return MONDAY_API_KEY or None

    async def get_monday_updates(self, order_id: str, user_id: str) -> dict:
        """Fetch chat messages: local DB + Monday.com Updates if linked"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id})
        if not order:
            raise ValueError("Order not found")
        if order["user_id"] != user_id:
            raise ValueError("Access denied")

        monday_item_ids = order.get("monday_item_ids", [])
        has_monday_item = bool(monday_item_ids)
        updates = []

        # Fetch from Monday.com if item is linked
        if has_monday_item:
            item_id = monday_item_ids[0]
            api_key = await self._get_monday_api_key()
            if api_key:
                query = f'''query {{ items(ids: [{item_id}]) {{ updates {{ id body text_body creator {{ name }} created_at }} }} }}'''
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://api.monday.com/v2",
                            json={"query": query},
                            headers={"Authorization": api_key, "Content-Type": "application/json"},
                            timeout=15.0
                        )
                        data = response.json()

                    items = data.get("data", {}).get("items", [])
                    raw_updates = items[0].get("updates", []) if items else []

                    for u in raw_updates:
                        updates.append({
                            "id": u.get("id"),
                            "body": u.get("text_body") or u.get("body", ""),
                            "author": u.get("creator", {}).get("name", "Staff"),
                            "created_at": u.get("created_at"),
                            "is_staff": True
                        })
                except Exception as e:
                    logger.error(f"Error fetching Monday.com updates: {e}")

        # Always fetch local user messages
        local_msgs = await db.order_messages.find(
            {"order_id": order_id},
            {"_id": 0}
        ).sort("created_at", 1).to_list(200)

        for msg in local_msgs:
            updates.append({
                "id": msg.get("message_id"),
                "body": msg.get("message", ""),
                "author": msg.get("author_name", "You"),
                "created_at": msg.get("created_at"),
                "is_staff": False
            })

        # Sort all chronologically
        updates.sort(key=lambda x: x.get("created_at", ""))

        return {"updates": updates, "has_monday_item": has_monday_item}

    async def post_monday_update(self, order_id: str, user_id: str, message: str) -> dict:
        """Post a chat message — stores locally and syncs to Monday.com if linked"""
        import uuid

        order = await db.store_textbook_orders.find_one({"order_id": order_id})
        if not order:
            raise ValueError("Order not found")
        if order["user_id"] != user_id:
            raise ValueError("Access denied")

        # Get user info from correct collection
        user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "email": 1})
        author_name = user.get("name", user.get("email", "User")) if user else "User"

        monday_item_ids = order.get("monday_item_ids", [])
        monday_posted = False

        if monday_item_ids:
            item_id = monday_item_ids[0]
            api_key = await self._get_monday_api_key()
            if api_key:
                escaped = message.replace('"', '\\"').replace('\n', '\\n')
                mutation = f'mutation {{ create_update(item_id: {item_id}, body: "[{author_name}]: {escaped}") {{ id }} }}'
                try:
                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://api.monday.com/v2",
                            json={"query": mutation},
                            headers={"Authorization": api_key, "Content-Type": "application/json"},
                            timeout=15.0
                        )
                        data = response.json()
                        if data.get("data", {}).get("create_update", {}).get("id"):
                            monday_posted = True
                except Exception as e:
                    logger.error(f"Error posting Monday.com update: {e}")

        # Store locally — auto-mark as read by sender
        msg_doc = {
            "message_id": f"msg_{uuid.uuid4().hex[:12]}",
            "order_id": order_id,
            "user_id": user_id,
            "author_name": author_name,
            "message": message,
            "is_staff": False,
            "monday_posted": monday_posted,
            "read_by": [user_id],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.order_messages.insert_one(msg_doc)
        del msg_doc["_id"]

        return {"success": True, "monday_posted": monday_posted, "message": msg_doc}

    async def mark_order_messages_read(self, order_id: str, user_id: str) -> dict:
        """Mark all messages in an order as read by this user"""
        order = await db.store_textbook_orders.find_one({"order_id": order_id})
        if not order:
            raise ValueError("Order not found")
        if order["user_id"] != user_id:
            raise ValueError("Access denied")

        result = await db.order_messages.update_many(
            {"order_id": order_id, "read_by": {"$ne": user_id}},
            {"$addToSet": {"read_by": user_id}}
        )

        return {"marked_read": result.modified_count}

    async def get_unread_counts(self, user_id: str) -> dict:
        """Get unread message counts per order and total for a user"""
        # Find all orders belonging to this user
        orders = await db.store_textbook_orders.find(
            {"user_id": user_id},
            {"_id": 0, "order_id": 1, "student_name": 1}
        ).to_list(100)

        order_ids = [o["order_id"] for o in orders]
        if not order_ids:
            return {"total_unread": 0, "per_order": {}}

        # Count unread messages: messages NOT read by this user
        pipeline = [
            {"$match": {
                "order_id": {"$in": order_ids},
                "read_by": {"$not": {"$elemMatch": {"$eq": user_id}}}
            }},
            {"$group": {"_id": "$order_id", "count": {"$sum": 1}}}
        ]

        cursor = db.order_messages.aggregate(pipeline)
        results = await cursor.to_list(100)

        per_order = {r["_id"]: r["count"] for r in results}
        total = sum(per_order.values())

        return {"total_unread": total, "per_order": per_order}


# Singleton instance
textbook_order_service = TextbookOrderService()
