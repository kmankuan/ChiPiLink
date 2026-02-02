"""
Community Module - Event Routes
Endpoints para eventos usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List

from core.auth import get_admin_user, get_current_user
from ..models import Event, EventCreate, EventUpdate
from ..services import event_service

router = APIRouter(prefix="/events", tags=["Community - Events"])


@router.get("", response_model=List[Event])
async def get_events(
    upcoming: bool = True,
    limit: int = Query(10, ge=1, le=50)
):
    """Get eventos"""
    return await event_service.get_events(upcoming=upcoming, limit=limit)


@router.get("/{evento_id}", response_model=Event)
async def get_event(evento_id: str):
    """Get evento by ID"""
    event = await event_service.get_event(evento_id)
    if not event:
        raise HTTPException(status_code=404, detail="Evento not found")
    return event


@router.post("/{evento_id}/register")
async def register_for_event(
    evento_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Registrarse para un evento"""
    try:
        success = await event_service.register_for_event(
            evento_id=evento_id,
            usuario_id=current_user["user_id"],
            nombre=current_user.get("nombre", "")
        )
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ADMIN ROUTES ==============

@router.get("/admin/all", response_model=List[Event])
async def get_all_events(
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """Get todos los eventos (admin)"""
    return await event_service.get_all_events(limit=limit)


@router.post("/admin", response_model=Event)
async def create_event(
    data: EventCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nuevo evento (admin)"""
    return await event_service.create_event(data)


@router.put("/admin/{evento_id}", response_model=Event)
async def update_event(
    evento_id: str,
    data: EventUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update evento (admin)"""
    event = await event_service.update_event(evento_id, data)
    if not event:
        raise HTTPException(status_code=404, detail="Evento not found")
    return event


@router.delete("/admin/{evento_id}")
async def delete_event(
    evento_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete evento (admin)"""
    success = await event_service.delete_event(evento_id)
    if not success:
        raise HTTPException(status_code=404, detail="Evento not found")
    return {"success": True}
