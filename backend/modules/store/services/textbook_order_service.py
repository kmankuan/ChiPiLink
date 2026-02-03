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
        # Handle grade format variations
        grade_queries = [grade]
        
        # Map simple grades to full format
        grade_mappings = {
            "1": ["1", "1er Grado", "1ro"],
            "2": ["2", "2do Grado", "2do"],
            "3": ["3", "3er Grado", "3ro"],
            "4": ["4", "4to Grado", "4to"],
            "5": ["5", "5to Grado", "5to"],
            "6": ["6", "6to Grado", "6to"],
            "7": ["7", "7mo Grado", "7mo"],
            "8": ["8", "8vo Grado", "8vo"],
            "9": ["9", "9no Grado", "9no"],
            "10": ["10", "10mo Grado", "10mo"],
            "11": ["11", "11vo Grado", "11vo"],
            "12": ["12", "12vo Grado", "12vo"],
            "K": ["K", "Kinder", "Kindergarten"],
            "K3": ["K3", "Pre-K3"],
            "K4": ["K4", "Pre-K4"],
            "K5": ["K5", "Pre-K5", "Kinder"],
            "PK": ["PK", "Pre-Kinder", "Pre-K"],
        }
        
        if grade in grade_mappings:
            grade_queries = grade_mappings[grade]
        
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
        
        return books
    
    async def get_or_create_order(
        self, 
        user_id: str, 
        student_id: str
    ) -> Dict:
        """Get existing order or create a new one for a student"""
        # Verify student belongs to user and is approved
        student = await self.student_repo.get_by_id(student_id)
        if not student:
            raise ValueError("Student not found")
        
        if student.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Check if student has approved enrollment for current year
        current_year = self.get_current_year()
        enrollments = student.get("enrollments", [])
        current_enrollment = next(
            (e for e in enrollments if e.get("year") == current_year and e.get("status") == "approved"),
            None
        )
        
        if not current_enrollment:
            raise ValueError("Student must have approved enrollment to order textbooks")
        
        grade = current_enrollment.get("grade", "")
        
        # Check if order already exists
        existing_order = await self.order_repo.get_by_student(student_id, current_year)
        
        if existing_order:
            # Refresh items with latest book data
            return await self._refresh_order_items(existing_order)
        
        # Create new order with all books for this grade
        books = await self.get_books_for_grade(grade)
        
        items = []
        for book in books:
            inventory = book.get("inventory_quantity", 0) - book.get("cantidad_reservada", 0)
            status = OrderItemStatus.AVAILABLE.value if inventory > 0 else OrderItemStatus.OUT_OF_STOCK.value
            
            items.append({
                "book_id": book["libro_id"],
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
        books = await self.get_books_for_grade(grade)
        books_dict = {b["libro_id"]: b for b in books}
        
        existing_items = {item["book_id"]: item for item in order.get("items", [])}
        updated_items = []
        
        for book_id, book in books_dict.items():
            inventory = book.get("inventory_quantity", 0) - book.get("cantidad_reservada", 0)
            
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
        
        # Status: "partial" if there are more items available, "submitted" if all items ordered or none left
        new_status = OrderStatus.DRAFT.value if available_items else OrderStatus.SUBMITTED.value
        
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
        """Send order to Monday.com board with items as subitems and summary as update
        Uses configuration from Integrations -> Monday.com -> Pedidos de Libros
        """
        # Get Monday.com configuration from the store config service
        monday_config = await monday_config_service.get_config()
        board_id = monday_config.get("board_id")
        column_mapping = monday_config.get("column_mapping", {})
        subitems_enabled = monday_config.get("subitems_enabled", False)
        subitem_mapping = monday_config.get("subitem_column_mapping", {})
        
        # Get active API key
        workspaces_config = await monday_config_service.get_workspaces()
        api_key = None
        active_workspace_id = workspaces_config.get("active_workspace_id")
        
        for ws in workspaces_config.get("workspaces", []):
            if ws.get("workspace_id") == active_workspace_id and ws.get("api_key"):
                api_key = ws["api_key"]
                break
        
        # Fallback to env API key if no workspace configured
        if not api_key:
            api_key = MONDAY_API_KEY
        
        if not api_key or not board_id:
            logger.warning("Monday.com not configured - go to Admin -> Integraciones -> Monday.com -> Pedidos de Libros")
            raise ValueError("Monday.com not configured. Please configure in Admin -> Integraciones -> Monday.com")
        
        # Use submission total if provided, otherwise calculate from order
        total = submission_total if submission_total is not None else order['total_amount']
        
        # Create main item with order info
        item_name = f"{order['student_name']} - {order['grade']} - ${total:.2f}"
        
        # Build items list for text column
        items_text = ", ".join([f"{item['book_name']} (x{item['quantity_ordered']})" for item in selected_items])
        
        # Map grade to Monday.com dropdown labels (if dropdown is used)
        grade = order["grade"]
        grade_mapping = {
            "K4": "K4", "K5": "K5",
            "1": "Grado 1", "1er Grado": "Grado 1", "1ro": "Grado 1",
            "2": "Grado 2", "2do Grado": "Grado 2", "2do": "Grado 2",
            "3": "Grado 3", "3er Grado": "Grado 3", "3ro": "Grado 3",
            "4": "Grado 4", "4to Grado": "Grado 4", "4to": "Grado 4",
            "5": "Grado 5", "5to Grado": "Grado 5", "5to": "Grado 5",
            "6": "Grado 6", "6to Grado": "Grado 6", "6to": "Grado 6",
            "7": "Grado 7", "7mo Grado": "Grado 7", "7mo": "Grado 7",
            "8": "Grado 8", "8vo Grado": "Grado 8", "8vo": "Grado 8",
            "9": "Grado 9", "9no Grado": "Grado 9", "9no": "Grado 9",
            "10": "Grado 10", "10mo Grado": "Grado 10", "10mo": "Grado 10",
            "11": "Grado 11", "11vo Grado": "Grado 11", "11vo": "Grado 11",
            "12": "Grado 12", "12vo Grado": "Grado 12", "12vo": "Grado 12",
        }
        monday_grade = grade_mapping.get(grade, f"Grado {grade}" if grade.isdigit() else grade)
        
        # Build column values using configured mapping
        column_values = {}
        
        # Map fields based on configuration
        if column_mapping.get("estudiante"):
            column_values[column_mapping["estudiante"]] = order["student_name"]
        if column_mapping.get("acudiente"):
            column_values[column_mapping["acudiente"]] = f"{user_name} ({user_email})"
        if column_mapping.get("grade"):
            # Try dropdown format first, fall back to text
            col_id = column_mapping["grade"]
            column_values[col_id] = {"labels": [monday_grade]}
        if column_mapping.get("libros"):
            column_values[column_mapping["libros"]] = items_text[:2000]
        if column_mapping.get("total"):
            column_values[column_mapping["total"]] = total
        if column_mapping.get("estado"):
            column_values[column_mapping["estado"]] = {"label": "Working on it"}
        if column_mapping.get("pedido_id"):
            column_values[column_mapping["pedido_id"]] = order["order_id"]
        if column_mapping.get("fecha"):
            column_values[column_mapping["fecha"]] = {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
        
        column_values_json = json.dumps(column_values)
        
        async with httpx.AsyncClient() as client:
            # Create main item
            mutation = f'''
            mutation {{
                create_item (
                    board_id: {board_id},
                    item_name: "{item_name}",
                    column_values: {json.dumps(column_values_json)}
                ) {{
                    id
                }}
            }}
            '''
            
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if "errors" in result:
                logger.error(f"Monday.com error: {result['errors']}")
                raise ValueError(f"Monday.com error: {result['errors']}")
            
            item_id = result.get("data", {}).get("create_item", {}).get("id")
            
            if not item_id:
                raise ValueError("Failed to create Monday.com item")
            
            logger.info(f"Created Monday.com item {item_id} for order {order['order_id']}")
            
            # Create Update (comment) with order summary
            summary_lines = [
                f"📦 **Nuevo Pedido de Textos**",
                f"",
                f"**Estudiante:** {order['student_name']}",
                f"**Grado:** {order['grade']}",
                f"**Year Escolar:** {order['year']}",
                f"",
                f"**Cliente:** {user_name}",
                f"**Email:** {user_email}",
                f"",
                f"**Libros Solicitados:**",
            ]
            
            for item in selected_items:
                summary_lines.append(f"• {item['book_name']} - ${item['price']:.2f} x{item['quantity_ordered']}")
            
            summary_lines.extend([
                f"",
                f"**Total:** ${total:.2f}",
                f"**Order ID:** {order['order_id']}",
            ])
            
            summary_text = "\\n".join(summary_lines)
            
            # Add update to item
            update_mutation = f'''
            mutation {{
                create_update (
                    item_id: {item_id},
                    body: "{summary_text}"
                ) {{
                    id
                }}
            }}
            '''
            
            try:
                update_response = await client.post(
                    "https://api.monday.com/v2",
                    json={"query": update_mutation},
                    headers={
                        "Authorization": api_key,
                        "Content-Type": "application/json"
                    },
                    timeout=15.0
                )
                
                update_result = update_response.json()
                if "errors" in update_result:
                    logger.warning(f"Failed to create update: {update_result['errors']}")
                else:
                    logger.info(f"Added update to Monday.com item {item_id}")
            except Exception as e:
                logger.warning(f"Failed to add update: {e}")
            
            # Create subitems for each book if enabled
            subitems = []
            if subitems_enabled:
                for item in selected_items:
                    subitem_name = f"{item['book_name']} (x{item['quantity_ordered']})"
                    
                    # Build subitem column values from mapping
                    subitem_values = {}
                    if subitem_mapping.get("cantidad"):
                        subitem_values[subitem_mapping["cantidad"]] = item["quantity_ordered"]
                    if subitem_mapping.get("precio_unitario"):
                        subitem_values[subitem_mapping["precio_unitario"]] = item["price"]
                    if subitem_mapping.get("subtotal"):
                        subitem_values[subitem_mapping["subtotal"]] = item["price"] * item["quantity_ordered"]
                    if subitem_mapping.get("code"):
                        subitem_values[subitem_mapping["code"]] = item.get("book_code", "")
                    
                    subitem_values_json = json.dumps(subitem_values)
                    
                    subitem_mutation = f'''
                    mutation {{
                        create_subitem (
                            parent_item_id: {item_id},
                            item_name: "{subitem_name}",
                            column_values: {json.dumps(subitem_values_json)}
                        ) {{
                            id
                        }}
                    }}
                    '''
                    
                    try:
                        sub_response = await client.post(
                            "https://api.monday.com/v2",
                            json={"query": subitem_mutation},
                            headers={
                                "Authorization": api_key,
                                "Content-Type": "application/json"
                            },
                            timeout=10.0
                        )
                        
                        sub_result = sub_response.json()
                        subitem_id = sub_result.get("data", {}).get("create_subitem", {}).get("id")
                        
                        if subitem_id:
                            subitems.append({
                                "book_id": item["book_id"],
                                "monday_subitem_id": subitem_id
                            })
                    except Exception as e:
                        logger.error(f"Failed to create subitem: {e}")
            
            return {
                "item_id": item_id,
                "subitems": subitems
            }
    
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


# Singleton instance
textbook_order_service = TextbookOrderService()
