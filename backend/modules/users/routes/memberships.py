"""
Membership API Routes - Management of membresías y visitas
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.users.services.membership_service import membership_service
from modules.users.models.user_models import MembershipType, VisitType

router = APIRouter(prefix="/memberships", tags=["Memberships"])


# ============== PYDANTIC MODELS ==============

class CreatePlanRequest(BaseModel):
    name: dict  # {"es": "...", "en": "...", "zh": "..."}
    description: dict = {}
    membership_type: str
    price: float
    price_in_points: Optional[int] = None
    total_visits: Optional[int] = None
    duration_days: int = 30
    applicable_user_types: List[str] = []
    bonus_points: int = 0
    auto_renew: bool = False
    is_featured: bool = False


class PurchaseMembershipRequest(BaseModel):
    plan_id: str
    pay_with_points: bool = False


class CheckInRequest(BaseModel):
    check_in_method: str = "manual"
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class UpdateVisitConfigRequest(BaseModel):
    min_duration_minutes: Optional[int] = None
    quick_visit_max_minutes: Optional[int] = None
    require_checkout: Optional[bool] = None
    auto_checkout_hours: Optional[int] = None


# ============== PLANS ==============

@router.get("/plans")
async def get_plans(
    user_type_id: Optional[str] = None,
    active_only: bool = Query(True),
    lang: str = Query("es")
):
    """Get planes de membresía disponibles"""
    plans = await membership_service.get_plans(
        active_only=active_only,
        user_type_id=user_type_id
    )
    
    return {
        "success": True,
        "plans": plans,
        "count": len(plans)
    }


@router.get("/plans/{plan_id}")
async def get_plan(plan_id: str):
    """Get detalle de un plan"""
    plan = await membership_service.get_plan(plan_id)
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"success": True, "plan": plan}


@router.post("/plans")
async def create_plan(
    data: CreatePlanRequest,
    admin=Depends(get_admin_user)
):
    """Create un nuevo plan de membresía (admin)"""
    try:
        MembershipType(data.membership_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid membership type: {data.membership_type}")
    
    try:
        plan = await membership_service.create_plan(data.model_dump())
        return {"success": True, "plan": plan}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/plans/{plan_id}")
async def update_plan(
    plan_id: str,
    updates: dict,
    admin=Depends(get_admin_user)
):
    """Update un plan (admin)"""
    plan = await membership_service.update_plan(plan_id, updates)
    
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"success": True, "plan": plan}


@router.delete("/plans/{plan_id}")
async def delete_plan(
    plan_id: str,
    admin=Depends(get_admin_user)
):
    """Desactivar un plan (admin)"""
    success = await membership_service.delete_plan(plan_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Plan not found")
    
    return {"success": True, "message": "Plan deactivated"}


@router.post("/plans/initialize")
async def initialize_plans(admin=Depends(get_admin_user)):
    """Inicializar planes by default (admin)"""
    count = await membership_service.initialize_default_plans()
    return {"success": True, "initialized": count}


# ============== USER MEMBERSHIPS ==============

@router.get("/me")
async def get_my_memberships(
    active_only: bool = Query(True),
    user=Depends(get_current_user)
):
    """Get mis membresías"""
    memberships = await membership_service.get_user_memberships(
        user_id=user["user_id"],
        active_only=active_only
    )
    
    return {
        "success": True,
        "memberships": memberships,
        "count": len(memberships)
    }


@router.get("/me/active")
async def get_my_active_membership(user=Depends(get_current_user)):
    """Get mi membresía activa"""
    membership = await membership_service.get_active_membership(user["user_id"])
    
    return {
        "success": True,
        "membership": membership,
        "has_active": membership is not None
    }


@router.post("/purchase")
async def purchase_membership(
    data: PurchaseMembershipRequest,
    user=Depends(get_current_user)
):
    """Comprar una membresía"""
    try:
        membership = await membership_service.purchase_membership(
            user_id=user["user_id"],
            plan_id=data.plan_id,
            paid_with_points=data.pay_with_points
        )
        
        return {"success": True, "membership": membership}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{membership_id}")
async def get_membership(
    membership_id: str,
    user=Depends(get_current_user)
):
    """Get detalle de una membresía"""
    membership = await membership_service.get_membership(membership_id)
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    # Verify ownership al usuario
    if membership["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your membership")
    
    # Get plan
    plan = await membership_service.get_plan(membership["plan_id"])
    membership["plan_info"] = plan
    
    return {"success": True, "membership": membership}


@router.post("/{membership_id}/cancel")
async def cancel_membership(
    membership_id: str,
    reason: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Cancelar una membresía"""
    membership = await membership_service.get_membership(membership_id)
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    if membership["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your membership")
    
    success = await membership_service.cancel_membership(membership_id, reason)
    
    return {"success": success, "message": "Membership cancelled"}


# ============== VISITS / CHECK-IN ==============

@router.get("/visits/config")
async def get_visit_config():
    """Get configuración de visitas"""
    config = await membership_service.get_visit_config()
    return {"success": True, "config": config}


@router.put("/visits/config")
async def update_visit_config(
    data: UpdateVisitConfigRequest,
    admin=Depends(get_admin_user)
):
    """Update configuración de visitas (admin)"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    config = await membership_service.update_visit_config(updates)
    return {"success": True, "config": config}


@router.post("/visits/checkin")
async def check_in(
    data: CheckInRequest,
    user=Depends(get_current_user)
):
    """Register entrada al club"""
    result = await membership_service.check_in(
        user_id=user["user_id"],
        check_in_method=data.check_in_method,
        latitude=data.latitude,
        longitude=data.longitude
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, "visit": result}


@router.post("/visits/checkout")
async def check_out(
    notes: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Register salida del club"""
    try:
        visit = await membership_service.check_out(
            user_id=user["user_id"],
            notes=notes
        )
        
        return {"success": True, "visit": visit}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/visits/me")
async def get_my_visits(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """Get mi historial de visitas"""
    visits = await membership_service.get_user_visits(
        user_id=user["user_id"],
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "visits": visits,
        "count": len(visits)
    }


@router.get("/visits/stats")
async def get_my_visit_stats(user=Depends(get_current_user)):
    """Get estadísticas de mis visitas"""
    stats = await membership_service.get_visit_stats(user["user_id"])
    return {"success": True, "stats": stats}


@router.get("/visits/current")
async def get_current_visitors(admin=Depends(get_admin_user)):
    """Get usuarios actualmente en el club (admin)"""
    visitors = await membership_service.get_current_visitors()
    
    return {
        "success": True,
        "visitors": visitors,
        "count": len(visitors)
    }


# ============== ADMIN ==============

@router.get("/admin/user/{user_id}")
async def admin_get_user_memberships(
    user_id: str,
    active_only: bool = Query(False),
    admin=Depends(get_admin_user)
):
    """Get membresías de un usuario (admin)"""
    memberships = await membership_service.get_user_memberships(
        user_id=user_id,
        active_only=active_only
    )
    
    return {
        "success": True,
        "memberships": memberships,
        "count": len(memberships)
    }


@router.post("/admin/grant")
async def admin_grant_membership(
    user_id: str = Query(...),
    plan_id: str = Query(...),
    sponsored_by: Optional[str] = None,
    sponsor_note: Optional[str] = None,
    admin=Depends(get_admin_user)
):
    """Otorgar membresía a un usuario (admin/cortesía)"""
    try:
        membership = await membership_service.purchase_membership(
            user_id=user_id,
            plan_id=plan_id,
            sponsored_by=sponsored_by or admin["user_id"],
            sponsor_note=sponsor_note
        )
        
        return {"success": True, "membership": membership}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/add-visits/{membership_id}")
async def admin_add_visits(
    membership_id: str,
    visits: int = Query(..., gt=0),
    reason: Optional[str] = None,
    admin=Depends(get_admin_user)
):
    """Agregar visitas a una membresía (admin)"""
    membership = await membership_service.add_visits(
        membership_id=membership_id,
        visits=visits,
        reason=reason
    )
    
    if not membership:
        raise HTTPException(status_code=404, detail="Membership not found")
    
    return {"success": True, "membership": membership}


@router.post("/admin/checkin/{user_id}")
async def admin_check_in(
    user_id: str,
    registered_by: str = Query(None),
    admin=Depends(get_admin_user)
):
    """Register entrada de un usuario (admin)"""
    result = await membership_service.check_in(
        user_id=user_id,
        check_in_method="manual",
        registered_by=registered_by or admin["user_id"]
    )
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, "visit": result}


@router.post("/admin/checkout/{user_id}")
async def admin_check_out(
    user_id: str,
    notes: Optional[str] = None,
    admin=Depends(get_admin_user)
):
    """Register salida de un usuario (admin)"""
    try:
        visit = await membership_service.check_out(
            user_id=user_id,
            notes=notes
        )
        
        return {"success": True, "visit": visit}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
