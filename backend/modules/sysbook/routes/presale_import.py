"""
Sysbook Module - Pre-Sale Import Routes
Admin endpoints for importing pre-sale orders from Monday.com
Uses background jobs to avoid HTTP timeout on large boards.
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
import asyncio
import uuid
from datetime import datetime, timezone
from core.auth import get_admin_user
from core.database import db
from modules.sysbook.services.presale_import_service import presale_import_service
from modules.store.services.monday_config_service import monday_config_service

router = APIRouter(prefix="/presale-import", tags=["Sysbook - Pre-Sale Import"])

# In-memory job store (survives within same process)
_jobs = {}


async def _run_preview_job(job_id: str, board_id: str):
    """Background task for preview"""
    try:
        _jobs[job_id]["status"] = "running"
        result = await presale_import_service.preview_import(board_id)
        _jobs[job_id].update({"status": "done", "result": result})
    except Exception as e:
        _jobs[job_id].update({"status": "error", "error": str(e)})


async def _run_import_job(job_id: str, board_id: str, admin_user_id: str, cached_items=None):
    """Background task for import"""
    try:
        _jobs[job_id]["status"] = "running"
        result = await presale_import_service.import_presale_orders(board_id, admin_user_id, cached_items=cached_items)
        _jobs[job_id].update({"status": "done", "result": result})
    except Exception as e:
        _jobs[job_id].update({"status": "error", "error": str(e)})


@router.get("/preview")
async def preview_import(admin: dict = Depends(get_admin_user)):
    """Start preview as background job — returns job_id immediately"""
    board_config = await monday_config_service.get_config()
    board_id = board_config.get("board_id")
    if not board_id:
        raise HTTPException(400, "Textbook Orders Monday.com board not configured")
    job_id = f"pj_{uuid.uuid4().hex[:8]}"
    _jobs[job_id] = {"status": "starting", "created_at": datetime.now(timezone.utc).isoformat()}
    asyncio.create_task(_run_preview_job(job_id, board_id))
    return {"job_id": job_id, "status": "starting"}


@router.get("/job/{job_id}")
async def get_job_status(job_id: str, admin: dict = Depends(get_admin_user)):
    """Poll for job status"""
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.post("/execute")
async def execute_import(
    data: dict = Body(default={}),
    admin: dict = Depends(get_admin_user)
):
    """Start import as background job — returns job_id immediately"""
    board_config = await monday_config_service.get_config()
    board_id = board_config.get("board_id")
    if not board_id:
        raise HTTPException(400, "Textbook Orders Monday.com board not configured")
    admin_user_id = admin.get("user_id", "admin")
    cached_items = data.get("items") if data else None
    job_id = f"ij_{uuid.uuid4().hex[:8]}"
    _jobs[job_id] = {"status": "starting", "created_at": datetime.now(timezone.utc).isoformat()}
    asyncio.create_task(_run_import_job(job_id, board_id, admin_user_id, cached_items))
    return {"job_id": job_id, "status": "starting"}


@router.get("/orders")
async def get_presale_orders(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all pre-sale imported orders. Filter by status: unlinked, linked"""
    orders = await presale_import_service.get_presale_orders(status)
    return {"orders": orders, "count": len(orders)}


@router.post("/sync-inventory")
async def sync_presale_to_inventory(admin: dict = Depends(get_admin_user)):
    """Sync presale orders to inventory: create missing products and set reserved_quantity"""
    try:
        result = await presale_import_service.sync_presale_to_inventory()
        return result
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[presale] Sync to inventory failed: {e}")
        raise HTTPException(500, f"Error syncing presale to inventory: {str(e)}")


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


@router.post("/unlink")
async def unlink_order(
    data: dict = Body(...),
    admin: dict = Depends(get_admin_user)
):
    """Unlink a previously linked order — returns it to awaiting_link"""
    order_id = data.get("order_id")
    if not order_id:
        raise HTTPException(400, "order_id is required")
    admin_user_id = admin.get("user_id", "admin")
    try:
        result = await presale_import_service.unlink_order(order_id, admin_user_id)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/suggestions")
async def get_suggestions(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get link suggestions for admin review. Filter by status: pending, confirmed, rejected"""
    suggestions = await presale_import_service.get_suggestions(status)
    pending_count = sum(1 for s in suggestions if s.get("status") == "pending")
    return {"suggestions": suggestions, "count": len(suggestions), "pending_count": pending_count}


@router.post("/suggestions/{suggestion_id}/confirm")
async def confirm_suggestion(
    suggestion_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin confirms a link suggestion — links the order to the student"""
    admin_user_id = admin.get("user_id", "admin")
    try:
        result = await presale_import_service.confirm_suggestion(suggestion_id, admin_user_id)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/suggestions/{suggestion_id}/reject")
async def reject_suggestion(
    suggestion_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin rejects a link suggestion"""
    admin_user_id = admin.get("user_id", "admin")
    try:
        result = await presale_import_service.reject_suggestion(suggestion_id, admin_user_id)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
