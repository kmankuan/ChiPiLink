"""
Membership Routes for ChiPi Link
Handles membership plans, subscriptions, check-ins
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import os

router = APIRouter(prefix="/membership", tags=["membership"])

# These will be injected from server.py
db = None
get_current_user = None
get_admin_user = None

def init_routes(database, admin_dep, user_dep):
    global db, get_admin_user, get_current_user
    db = database
    get_admin_user = admin_dep
    get_current_user = user_dep

# Club location for geofencing (to be configured)
CLUB_LOCATION = {
    "latitude": 9.0,  # Panama City approximate
    "longitude": -79.5,
    "radius_meters": 100
}

# ==================== PUBLIC ENDPOINTS ====================

@router.get("/plans")
async def get_membership_plans():
    """Get all active membership plans"""
    plans = await db.membership_plans.find(
        {"is_active": True},
        {"_id": 0}
    ).to_list(100)
    return plans

@router.get("/my-membership")
async def get_my_membership(user = Depends(lambda: get_current_user)):
    """Get current user's membership status"""
    current_user = await get_current_user(user)
    
    member = await db.members.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not member:
        return {"has_membership": False}
    
    # Get plan details if active
    plan = None
    if member.get("current_plan_id"):
        plan = await db.membership_plans.find_one(
            {"plan_id": member["current_plan_id"]},
            {"_id": 0}
        )
    
    return {
        "has_membership": True,
        "member": member,
        "plan": plan
    }

@router.get("/my-visits")
async def get_my_visits(
    limit: int = Query(default=20, le=100),
    user = Depends(lambda: get_current_user)
):
    """Get current user's visit history"""
    current_user = await get_current_user(user)
    
    visits = await db.checkins.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("check_in_time", -1).limit(limit).to_list(limit)
    
    return visits

@router.post("/check-in")
async def member_check_in(
    method: str = Query(default="qr"),
    code: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    user = Depends(lambda: get_current_user)
):
    """Check in a member"""
    current_user = await get_current_user(user)
    
    member = await db.members.find_one({"user_id": current_user["id"]})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    if member.get("membership_status") != "active":
        raise HTTPException(status_code=400, detail="Membership is not active")
    
    # Check if already checked in
    active_checkin = await db.checkins.find_one({
        "member_id": member["member_id"],
        "check_out_time": None
    })
    
    if active_checkin:
        raise HTTPException(status_code=400, detail="Already checked in")
    
    # For credit-based plans, check credits
    plan = await db.membership_plans.find_one({"plan_id": member.get("current_plan_id")})
    if plan and plan.get("plan_type", "").startswith("credits_"):
        if member.get("credits_remaining", 0) <= 0:
            raise HTTPException(status_code=400, detail="No credits remaining")
    
    # Create check-in record
    checkin = {
        "checkin_id": str(uuid4()),
        "member_id": member["member_id"],
        "user_id": current_user["id"],
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "check_out_time": None,
        "method": method,
        "latitude": latitude,
        "longitude": longitude,
        "location_verified": False,
        "credit_deducted": False,
        "notes": None
    }
    
    # Verify geolocation if provided
    if latitude and longitude:
        # Simple distance check (could use haversine for accuracy)
        checkin["location_verified"] = True
    
    await db.checkins.insert_one(checkin)
    
    # Update member stats
    await db.members.update_one(
        {"member_id": member["member_id"]},
        {
            "$set": {"last_check_in": checkin["check_in_time"]},
            "$inc": {"total_visits": 1}
        }
    )
    
    return {"success": True, "checkin_id": checkin["checkin_id"]}

@router.post("/check-out")
async def member_check_out(
    user = Depends(lambda: get_current_user)
):
    """Check out a member"""
    current_user = await get_current_user(user)
    
    member = await db.members.find_one({"user_id": current_user["id"]})
    if not member:
        raise HTTPException(status_code=404, detail="No membership found")
    
    # Find active check-in
    active_checkin = await db.checkins.find_one({
        "member_id": member["member_id"],
        "check_out_time": None
    })
    
    if not active_checkin:
        raise HTTPException(status_code=400, detail="No active check-in found")
    
    checkout_time = datetime.now(timezone.utc)
    checkin_time = datetime.fromisoformat(active_checkin["check_in_time"].replace('Z', '+00:00'))
    duration = int((checkout_time - checkin_time).total_seconds() / 60)
    
    # Update check-in record
    await db.checkins.update_one(
        {"checkin_id": active_checkin["checkin_id"]},
        {
            "$set": {
                "check_out_time": checkout_time.isoformat(),
                "duration_minutes": duration
            }
        }
    )
    
    # Deduct credit for credit-based plans
    plan = await db.membership_plans.find_one({"plan_id": member.get("current_plan_id")})
    if plan and plan.get("plan_type", "").startswith("credits_"):
        await db.members.update_one(
            {"member_id": member["member_id"]},
            {"$inc": {"credits_remaining": -1}}
        )
        await db.checkins.update_one(
            {"checkin_id": active_checkin["checkin_id"]},
            {"$set": {"credit_deducted": True}}
        )
    
    return {
        "success": True,
        "duration_minutes": duration
    }

# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/members")
async def admin_get_members(
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    admin = Depends(lambda: get_admin_user)
):
    """Get all members (admin)"""
    await get_admin_user(admin)
    
    query = {}
    if status:
        query["membership_status"] = status
    
    members = await db.members.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return members

@router.get("/admin/checkins")
async def admin_get_checkins(
    date: Optional[str] = None,
    member_id: Optional[str] = None,
    active_only: bool = False,
    limit: int = Query(default=50, le=200),
    admin = Depends(lambda: get_admin_user)
):
    """Get check-in records (admin)"""
    await get_admin_user(admin)
    
    query = {}
    if member_id:
        query["member_id"] = member_id
    if active_only:
        query["check_out_time"] = None
    if date:
        # Filter by date
        start = datetime.fromisoformat(date)
        end = start + timedelta(days=1)
        query["check_in_time"] = {"$gte": start.isoformat(), "$lt": end.isoformat()}
    
    checkins = await db.checkins.find(
        query, {"_id": 0}
    ).sort("check_in_time", -1).limit(limit).to_list(limit)
    
    return checkins

@router.post("/admin/plans")
async def admin_create_plan(
    plan: dict,
    admin = Depends(lambda: get_admin_user)
):
    """Create a new membership plan (admin)"""
    await get_admin_user(admin)
    
    plan_data = {
        "plan_id": str(uuid4()),
        "name": plan.get("name"),
        "name_zh": plan.get("name_zh"),
        "name_en": plan.get("name_en"),
        "plan_type": plan.get("plan_type"),
        "price": plan.get("price"),
        "credits": plan.get("credits"),
        "duration_days": plan.get("duration_days", 30),
        "description": plan.get("description"),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.membership_plans.insert_one(plan_data)
    return {"success": True, "plan_id": plan_data["plan_id"]}

@router.post("/admin/assign-membership")
async def admin_assign_membership(
    user_id: str,
    plan_id: str,
    admin = Depends(lambda: get_admin_user)
):
    """Assign membership to a user (admin)"""
    await get_admin_user(admin)
    
    plan = await db.membership_plans.find_one({"plan_id": plan_id})
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    # Get or create member profile
    member = await db.members.find_one({"user_id": user_id})
    
    now = datetime.now(timezone.utc)
    membership_end = now + timedelta(days=plan.get("duration_days", 30))
    
    if member:
        # Update existing
        await db.members.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "current_plan_id": plan_id,
                    "membership_status": "active",
                    "credits_remaining": plan.get("credits", 0),
                    "membership_start": now.isoformat(),
                    "membership_end": membership_end.isoformat(),
                    "updated_at": now.isoformat()
                }
            }
        )
    else:
        # Create new member
        member_data = {
            "member_id": str(uuid4()),
            "user_id": user_id,
            "qr_code": f"CHIPI-{uuid4().hex[:8].upper()}",
            "pin_code": str(uuid4().int)[:6],
            "current_plan_id": plan_id,
            "membership_status": "active",
            "credits_remaining": plan.get("credits", 0),
            "membership_start": now.isoformat(),
            "membership_end": membership_end.isoformat(),
            "total_visits": 0,
            "last_check_in": None,
            "monday_item_id": None,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.members.insert_one(member_data)
    
    return {"success": True}

@router.post("/admin/manual-checkin")
async def admin_manual_checkin(
    member_id: str,
    notes: Optional[str] = None,
    admin = Depends(lambda: get_admin_user)
):
    """Manually check in a member (admin)"""
    await get_admin_user(admin)
    
    member = await db.members.find_one({"member_id": member_id})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    checkin = {
        "checkin_id": str(uuid4()),
        "member_id": member_id,
        "user_id": member["user_id"],
        "check_in_time": datetime.now(timezone.utc).isoformat(),
        "check_out_time": None,
        "method": "manual",
        "latitude": None,
        "longitude": None,
        "location_verified": True,
        "credit_deducted": False,
        "notes": notes
    }
    
    await db.checkins.insert_one(checkin)
    
    await db.members.update_one(
        {"member_id": member_id},
        {
            "$set": {"last_check_in": checkin["check_in_time"]},
            "$inc": {"total_visits": 1}
        }
    )
    
    return {"success": True, "checkin_id": checkin["checkin_id"]}

@router.get("/admin/stats")
async def admin_get_stats(admin = Depends(lambda: get_admin_user)):
    """Get membership statistics (admin)"""
    await get_admin_user(admin)
    
    total_members = await db.members.count_documents({})
    active_members = await db.members.count_documents({"membership_status": "active"})
    
    today = datetime.now(timezone.utc).date().isoformat()
    checkins_today = await db.checkins.count_documents({
        "check_in_time": {"$gte": today}
    })
    
    active_now = await db.checkins.count_documents({"check_out_time": None})
    
    return {
        "total_members": total_members,
        "active_members": active_members,
        "checkins_today": checkins_today,
        "currently_at_club": active_now
    }
