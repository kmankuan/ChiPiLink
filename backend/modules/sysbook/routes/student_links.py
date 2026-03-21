"""
Multi-User Student Linking + Shared Orders
1. Multiple users can link to the same student (2nd+ requires admin approval)
2. Orders auto-shared with all approved linked users
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_current_user, get_admin_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("sysbook.multi_link")
router = APIRouter(prefix="/student-links", tags=["Sysbook - Student Links"])

C_STUDENTS = "store_students"
C_ORDERS = "store_textbook_orders"
C_LINK_REQUESTS = "store_student_link_requests"


# ═══ Link Request Endpoints ═══

@router.post("/request")
async def request_link(data: dict, user: dict = Depends(get_current_user)):
    """Request to link to an existing student. First link auto-approved, subsequent need admin approval."""
    student_id = data.get("student_id", "")
    relation = data.get("relation", "parent")  # parent, guardian, sibling, tutor, self
    user_id = user.get("sub", user.get("user_id", ""))
    
    if not student_id:
        raise HTTPException(400, "student_id required")
    
    student = await db[C_STUDENTS].find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    
    # Check if already linked
    linked = student.get("linked_users", [])
    if any(lu.get("user_id") == user_id for lu in linked):
        raise HTTPException(400, "Already linked to this student")
    
    # Check if primary owner
    if student.get("user_id") == user_id:
        raise HTTPException(400, "You are the primary owner of this student")
    
    # Check for pending request
    existing = await db[C_LINK_REQUESTS].find_one({
        "student_id": student_id, "user_id": user_id, "status": "pending"
    })
    if existing:
        raise HTTPException(400, "Link request already pending")
    
    # First link (no other linked users and no primary owner) → auto-approve
    has_primary = bool(student.get("user_id"))
    has_linked = len(linked) > 0
    auto_approve = not has_primary and not has_linked
    
    now = datetime.now(timezone.utc).isoformat()
    
    if auto_approve:
        # Auto-approve and add to linked_users
        await db[C_STUDENTS].update_one(
            {"student_id": student_id},
            {"$push": {"linked_users": {
                "user_id": user_id,
                "relation": relation,
                "status": "approved",
                "is_primary": not has_primary,
                "approved_at": now,
                "approved_by": "auto",
            }}}
        )
        # Also auto-share existing orders
        await _share_orders_with_user(student_id, user_id)
        return {"status": "approved", "message": "Linked successfully (auto-approved)"}
    
    # Needs admin approval
    request_doc = {
        "request_id": f"lr_{uuid.uuid4().hex[:10]}",
        "student_id": student_id,
        "student_name": student.get("full_name", student.get("first_name", "")),
        "user_id": user_id,
        "user_name": user.get("name", ""),
        "user_email": user.get("email", ""),
        "relation": relation,
        "status": "pending",
        "created_at": now,
    }
    await db[C_LINK_REQUESTS].insert_one(request_doc)
    
    return {"status": "pending", "message": "Link request sent. Admin approval required.", "request_id": request_doc["request_id"]}


@router.get("/pending")
async def get_pending_requests(admin: dict = Depends(get_admin_user)):
    """Get all pending link requests (admin)."""
    requests = await db[C_LINK_REQUESTS].find(
        {"status": "pending"}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return requests


@router.post("/approve/{request_id}")
async def approve_link(request_id: str, admin: dict = Depends(get_admin_user)):
    """Approve a link request (admin)."""
    req = await db[C_LINK_REQUESTS].find_one({"request_id": request_id, "status": "pending"})
    if not req:
        raise HTTPException(404, "Request not found or already processed")
    
    now = datetime.now(timezone.utc).isoformat()
    admin_id = admin.get("sub", admin.get("user_id", ""))
    
    # Add to student's linked_users
    await db[C_STUDENTS].update_one(
        {"student_id": req["student_id"]},
        {"$push": {"linked_users": {
            "user_id": req["user_id"],
            "relation": req["relation"],
            "status": "approved",
            "is_primary": False,
            "approved_at": now,
            "approved_by": admin_id,
        }}}
    )
    
    # Update request status
    await db[C_LINK_REQUESTS].update_one(
        {"request_id": request_id},
        {"$set": {"status": "approved", "processed_at": now, "processed_by": admin_id}}
    )
    
    # Auto-share existing orders
    await _share_orders_with_user(req["student_id"], req["user_id"])
    
    return {"success": True, "message": f"Link approved for {req.get('user_name', req['user_id'])}"}


@router.post("/reject/{request_id}")
async def reject_link(request_id: str, data: dict = {}, admin: dict = Depends(get_admin_user)):
    """Reject a link request (admin)."""
    now = datetime.now(timezone.utc).isoformat()
    admin_id = admin.get("sub", admin.get("user_id", ""))
    
    result = await db[C_LINK_REQUESTS].update_one(
        {"request_id": request_id, "status": "pending"},
        {"$set": {"status": "rejected", "reason": data.get("reason", ""), "processed_at": now, "processed_by": admin_id}}
    )
    if result.modified_count == 0:
        raise HTTPException(404, "Request not found or already processed")
    
    return {"success": True}


@router.get("/student/{student_id}")
async def get_student_links(student_id: str, user: dict = Depends(get_current_user)):
    """Get all linked users for a student."""
    student = await db[C_STUDENTS].find_one({"student_id": student_id}, {"_id": 0, "linked_users": 1, "user_id": 1})
    if not student:
        raise HTTPException(404, "Student not found")
    
    linked = student.get("linked_users", [])
    # Add primary owner
    if student.get("user_id"):
        primary = {"user_id": student["user_id"], "relation": "primary", "status": "approved", "is_primary": True}
        if not any(lu.get("user_id") == student["user_id"] for lu in linked):
            linked.insert(0, primary)
    
    return linked


@router.delete("/student/{student_id}/user/{user_id}")
async def remove_link(student_id: str, user_id: str, admin: dict = Depends(get_admin_user)):
    """Remove a linked user from a student (admin)."""
    await db[C_STUDENTS].update_one(
        {"student_id": student_id},
        {"$pull": {"linked_users": {"user_id": user_id}}}
    )
    # Also remove from shared orders
    await db[C_ORDERS].update_many(
        {"student_id": student_id},
        {"$pull": {"shared_with": {"user_id": user_id}}}
    )
    return {"success": True}


# ═══ Shared Orders ═══

async def _share_orders_with_user(student_id: str, user_id: str):
    """Add user to shared_with on all orders for this student."""
    await db[C_ORDERS].update_many(
        {"student_id": student_id, "shared_with.user_id": {"$ne": user_id}},
        {"$push": {"shared_with": {"user_id": user_id, "role": "editor", "added_at": datetime.now(timezone.utc).isoformat()}}}
    )
    count = await db[C_ORDERS].count_documents({"student_id": student_id})
    logger.info(f"Shared {count} orders of student {student_id} with user {user_id}")


async def get_user_accessible_student_ids(user_id: str) -> list:
    """Get all student_ids this user can access (primary + linked)."""
    # Primary ownership
    primary = await db[C_STUDENTS].find(
        {"user_id": user_id}, {"_id": 0, "student_id": 1}
    ).to_list(100)
    
    # Linked users
    linked = await db[C_STUDENTS].find(
        {"linked_users": {"$elemMatch": {"user_id": user_id, "status": "approved"}}},
        {"_id": 0, "student_id": 1}
    ).to_list(100)
    
    ids = set()
    for s in primary + linked:
        ids.add(s["student_id"])
    return list(ids)
