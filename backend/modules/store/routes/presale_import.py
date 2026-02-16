"""
Pre-Sale Import Routes
Admin endpoints for importing pre-sale orders from Monday.com
and managing the linking workflow.
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
from core.auth import get_admin_user
from ..services.presale_import_service import presale_import_service
from ..services.monday_config_service import monday_config_service

router = APIRouter(prefix="/presale-import", tags=["Store - Pre-Sale Import"])


@router.get("/preview")
async def preview_import(admin: dict = Depends(get_admin_user)):
    """Preview items from Monday.com that are ready to import (trigger column set)"""
    board_config = await monday_config_service.get_config()
    board_id = board_config.get("board_id")
    if not board_id:
        raise HTTPException(400, "Textbook Orders Monday.com board not configured")
    result = await presale_import_service.preview_import(board_id)
    return result


@router.post("/execute")
async def execute_import(admin: dict = Depends(get_admin_user)):
    """Import pre-sale orders from Monday.com into the app as awaiting_link orders"""
    board_config = await monday_config_service.get_config()
    board_id = board_config.get("board_id")
    if not board_id:
        raise HTTPException(400, "Textbook Orders Monday.com board not configured")
    admin_user_id = admin.get("user_id", "admin")
    result = await presale_import_service.import_presale_orders(board_id, admin_user_id)
    return result


@router.get("/orders")
async def get_presale_orders(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all pre-sale imported orders. Filter by status: unlinked, linked"""
    orders = await presale_import_service.get_presale_orders(status)
    return {"orders": orders, "count": len(orders)}


@router.post("/link")
async def manual_link_order(
    data: dict = Body(...),
    admin: dict = Depends(get_admin_user)
):
    """Manually link a pre-sale order to a student"""
    order_id = data.get("order_id")
    student_id = data.get("student_id")
    user_id = data.get("user_id")
    if not order_id or not student_id:
        raise HTTPException(400, "order_id and student_id are required")
    admin_user_id = admin.get("user_id", "admin")
    try:
        result = await presale_import_service.manual_link(order_id, student_id, user_id, admin_user_id)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
