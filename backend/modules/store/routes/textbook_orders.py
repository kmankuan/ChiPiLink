"""
Textbook Order Routes
API endpoints for textbook ordering system
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.auth import get_current_user, get_admin_user
from ..services.textbook_order_service import textbook_order_service
from ..models.textbook_order import (
    OrderStatus, SubmitOrderRequest, ReorderRequest, AdminSetMaxQuantity
)

router = APIRouter(prefix="/textbook-orders", tags=["Store - Textbook Orders"])


# ============== USER ENDPOINTS ==============

@router.get("/student/{student_id}")
async def get_student_order(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get or create order for a student.
    Returns the textbook list for the student's grade with current selections.
    """
    try:
        order = await textbook_order_service.get_or_create_order(
            user_id=current_user["user_id"],
            student_id=student_id
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{order_id}/items/{book_id}")
async def update_item_selection(
    order_id: str,
    book_id: str,
    quantity: int = Query(ge=0, le=10),
    current_user: dict = Depends(get_current_user)
):
    """
    Update item selection in a draft order.
    Set quantity to 0 to deselect, 1 to select.
    """
    try:
        order = await textbook_order_service.update_item_selection(
            user_id=current_user["user_id"],
            order_id=order_id,
            book_id=book_id,
            quantity=quantity
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/submit")
async def submit_order(
    order_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit order - locks selected items and sends to Monday.com.
    After submission, selected items cannot be modified.
    """
    try:
        order = await textbook_order_service.submit_order(
            user_id=current_user["user_id"],
            order_id=order_id,
            notes=notes
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{order_id}/reorder/{book_id}")
async def request_reorder(
    order_id: str,
    book_id: str,
    request: ReorderRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Request to reorder a book that was already ordered.
    Admin must approve before user can order again.
    """
    try:
        order = await textbook_order_service.request_reorder(
            user_id=current_user["user_id"],
            order_id=order_id,
            book_id=book_id,
            reason=request.reason
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-orders")
async def get_my_orders(
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all orders for the current user"""
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"Getting orders for user_id: {current_user.get('user_id')}")
    
    orders = await textbook_order_service.get_user_orders(
        user_id=current_user["user_id"],
        year=year
    )
    
    logger.info(f"Found {len(orders)} orders for user {current_user.get('user_id')}")
    return {"orders": orders, "user_id": current_user.get("user_id")}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def get_all_orders(
    status: Optional[str] = None,
    grade: Optional[str] = None,
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all orders (admin view)"""
    orders = await textbook_order_service.get_all_orders(
        status=status,
        grade=grade,
        year=year
    )
    return {"orders": orders}


@router.get("/admin/stats")
async def get_order_stats(
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get order statistics"""
    stats = await textbook_order_service.get_order_stats(year)
    return stats


@router.get("/admin/pending-reorders")
async def get_pending_reorders(
    admin: dict = Depends(get_admin_user)
):
    """Get all pending reorder requests"""
    reorders = await textbook_order_service.get_pending_reorders()
    return {"reorders": reorders}


@router.put("/admin/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    admin: dict = Depends(get_admin_user)
):
    """Update order status"""
    try:
        order = await textbook_order_service.admin_update_order_status(
            admin_id=admin["user_id"],
            order_id=order_id,
            status=status
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/{order_id}/items/{book_id}/approve-reorder")
async def approve_reorder(
    order_id: str,
    book_id: str,
    data: AdminSetMaxQuantity,
    admin: dict = Depends(get_admin_user)
):
    """Approve reorder request and set new max quantity"""
    try:
        order = await textbook_order_service.admin_approve_reorder(
            admin_id=admin["user_id"],
            order_id=order_id,
            book_id=book_id,
            max_quantity=data.max_quantity,
            admin_notes=data.admin_notes
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/{order_id}")
async def get_order_details(
    order_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get order details (admin view)"""
    order = await textbook_order_service.order_repo.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
