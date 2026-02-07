"""
Textbook Order Models
Models for managing textbook orders from approved students
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class OrderStatus(str, Enum):
    DRAFT = "draft"           # User is selecting books
    SUBMITTED = "submitted"   # User submitted, pending admin review
    PROCESSING = "processing" # Admin is processing
    READY = "ready"          # Ready for pickup/delivery
    DELIVERED = "delivered"   # Order completed
    CANCELLED = "cancelled"


class OrderItemStatus(str, Enum):
    AVAILABLE = "available"              # Can be ordered
    ORDERED = "ordered"                  # Already ordered, locked
    PROCESSING = "processing"            # Being prepared / in process
    READY_FOR_PICKUP = "ready_for_pickup"  # Ready to deliver
    DELIVERED = "delivered"              # Successfully delivered
    ISSUE = "issue"                      # Problem with this item
    OUT_OF_STOCK = "out_of_stock"        # No inventory
    REORDER_REQUESTED = "reorder_requested"  # User requested reorder
    REORDER_APPROVED = "reorder_approved"    # Admin approved reorder


# Maps Monday.com subitem status labels → app OrderItemStatus
# Configurable via admin, these are sensible defaults
DEFAULT_STATUS_MAPPING = {
    "Pendiente": OrderItemStatus.ORDERED.value,
    "Pending": OrderItemStatus.ORDERED.value,
    "En Proceso": OrderItemStatus.PROCESSING.value,
    "Working on it": OrderItemStatus.PROCESSING.value,
    "Listo": OrderItemStatus.READY_FOR_PICKUP.value,
    "Ready": OrderItemStatus.READY_FOR_PICKUP.value,
    "Entregado": OrderItemStatus.DELIVERED.value,
    "Done": OrderItemStatus.DELIVERED.value,
    "Delivered": OrderItemStatus.DELIVERED.value,
    "Problema": OrderItemStatus.ISSUE.value,
    "Stuck": OrderItemStatus.ISSUE.value,
}


class OrderItem(BaseModel):
    """Individual book item in an order"""
    book_id: str
    book_code: str
    book_name: str
    price: float
    quantity_ordered: int = 0
    max_quantity: int = 1  # Admin can increase for reorders
    status: OrderItemStatus = OrderItemStatus.AVAILABLE
    ordered_at: Optional[str] = None
    notes: Optional[str] = None
    monday_subitem_id: Optional[str] = None  # Links to Monday.com subitem


class OrderItemCreate(BaseModel):
    """Request to add/update item in order"""
    book_id: str
    quantity: Optional[int] = 1
    quantity_ordered: Optional[int] = None  # Alternative field name from frontend
    book_name: Optional[str] = None  # Optional, frontend may send this
    price: Optional[float] = None  # Optional, frontend may send this
    
    def get_quantity(self) -> int:
        """Get the quantity, preferring quantity_ordered if set"""
        if self.quantity_ordered is not None:
            return self.quantity_ordered
        return self.quantity or 1


class ReorderRequest(BaseModel):
    """Request for reordering a book"""
    reason: str = ""  # Why user needs to reorder


class SubmitOrderRequest(BaseModel):
    """Request to submit an order"""
    student_id: str
    items: List[OrderItemCreate]
    form_data: Optional[dict] = None
    uploaded_files: Optional[dict] = None
    notes: Optional[str] = None


class StudentOrderResponse(BaseModel):
    """Response for student order view"""
    order_id: str
    student_id: str
    student_name: str
    grade: str
    year: int
    items: List[OrderItem]
    total_amount: float
    status: OrderStatus
    submitted_at: Optional[str] = None
    monday_item_id: Optional[str] = None
    created_at: str
    updated_at: str


class AdminOrderStatsResponse(BaseModel):
    """Statistics for admin dashboard"""
    total_orders: int
    orders_by_status: dict
    orders_by_grade: dict
    top_books: List[dict]
    total_revenue: float
    pending_reorder_requests: int


class AdminSetMaxQuantity(BaseModel):
    """Admin request to set max quantity for a student's book"""
    max_quantity: int = Field(ge=1, le=10)
    admin_notes: Optional[str] = None
