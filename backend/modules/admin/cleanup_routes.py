"""
Admin Data Cleanup Routes
Endpoints for previewing and executing test data cleanup.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from core.auth import get_admin_user
from .cleanup_service import cleanup_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cleanup", tags=["admin-cleanup"])


class CleanupRequest(BaseModel):
    student_ids: Optional[List[str]] = None
    order_ids: Optional[List[str]] = None
    demo_only: bool = False
    date_before: Optional[str] = None
    delete_monday_items: bool = True
    collections: Optional[List[str]] = None


@router.post("/preview")
async def preview_cleanup(request: CleanupRequest, admin: dict = Depends(get_admin_user)):
    """Preview what data would be deleted — no actual changes."""
    try:
        result = await cleanup_service.preview(
            student_ids=request.student_ids,
            order_ids=request.order_ids,
            demo_only=request.demo_only,
            date_before=request.date_before,
        )
        return {"status": "preview", "data": result}
    except Exception as e:
        logger.error(f"[Cleanup Preview] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/execute")
async def execute_cleanup(request: CleanupRequest, admin: dict = Depends(get_admin_user)):
    """Execute the cleanup — permanently deletes data."""
    if not request.student_ids and not request.order_ids and not request.demo_only:
        raise HTTPException(
            status_code=400,
            detail="At least one filter is required: student_ids, order_ids, or demo_only"
        )

    try:
        result = await cleanup_service.execute(
            student_ids=request.student_ids,
            order_ids=request.order_ids,
            demo_only=request.demo_only,
            date_before=request.date_before,
            delete_monday_items=request.delete_monday_items,
            collections_to_clean=request.collections,
        )
        admin_email = admin.get("email", "unknown")
        logger.info(f"[Cleanup] Executed by {admin_email}: {result}")
        return {"status": "executed", "results": result, "executed_by": admin_email}
    except Exception as e:
        logger.error(f"[Cleanup Execute] Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/students")
async def list_students_for_cleanup(admin: dict = Depends(get_admin_user)):
    """List ALL students with order counts — for the cleanup UI picker.
    Includes students without orders (those with only enrollment requests)."""
    from core.database import db

    # Get ALL students
    all_students = await db.store_students.find(
        {}, {"_id": 0, "student_id": 1, "full_name": 1, "is_demo": 1, "user_id": 1, "enrollments": 1}
    ).to_list(500)
    student_map = {s["student_id"]: s for s in all_students}

    # Get order stats per student
    pipeline = [
        {"$group": {
            "_id": "$student_id",
            "student_name": {"$first": "$student_name"},
            "order_count": {"$sum": 1},
            "total_amount": {"$sum": "$total_amount"},
            "last_order": {"$max": "$submitted_at"},
            "monday_items": {"$push": "$monday_item_ids"},
        }},
    ]
    order_stats = await db.store_textbook_orders.aggregate(pipeline).to_list(500)
    order_map = {s["_id"]: s for s in order_stats}

    # Get CRM link status
    all_sids = [s["student_id"] for s in all_students]
    links = await db.crm_student_links.find(
        {"student_id": {"$in": all_sids}}, {"_id": 0, "student_id": 1, "monday_item_id": 1}
    ).to_list(200)
    link_map = {l["student_id"]: l.get("monday_item_id") for l in links}

    # Get wallet info per user_id
    all_user_ids = list(set(s.get("user_id") for s in all_students if s.get("user_id")))
    wallet_counts = {}
    txn_counts = {}
    for uid in all_user_ids:
        w = await db.chipi_wallets.find_one({"user_id": uid}, {"_id": 0, "balance_usd": 1})
        t1 = await db.chipi_transactions.count_documents({"user_id": uid})
        t2 = await db.wallet_transactions.count_documents({"user_id": uid})
        wallet_counts[uid] = w.get("balance_usd", 0) if w else None
        txn_counts[uid] = t1 + t2

    result = []
    for s in all_students:
        sid = s["student_id"]
        stat = order_map.get(sid, {})
        enrollments = s.get("enrollments", [])
        pending_requests = sum(1 for e in enrollments if e.get("status") in ("pending", "in_review", "info_required"))
        monday_ids = set()
        for ids_list in stat.get("monday_items", []):
            if isinstance(ids_list, list):
                monday_ids.update(str(i) for i in ids_list if i)
        result.append({
            "student_id": sid,
            "student_name": s.get("full_name", "Unknown"),
            "is_demo": s.get("is_demo", False),
            "user_id": s.get("user_id", ""),
            "order_count": stat.get("order_count", 0),
            "total_amount": stat.get("total_amount", 0),
            "last_order": stat.get("last_order"),
            "pending_requests": pending_requests,
            "monday_item_count": len(monday_ids),
            "crm_linked": sid in link_map,
            "crm_monday_item_id": link_map.get(sid),
            "wallet_balance": wallet_counts.get(s.get("user_id")),
            "wallet_txn_count": txn_counts.get(s.get("user_id"), 0),
        })

    # Sort: most orders first, then by pending requests
    result.sort(key=lambda x: (x["order_count"] + x["pending_requests"]), reverse=True)

    return {"students": result}
