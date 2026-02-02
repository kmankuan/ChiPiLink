"""
PinpanClub - Match Routes
Endpoints for gestión of matches
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models import Match, MatchCreate, MatchScoreUpdate, MatchState
from ..services import match_service

router = APIRouter(prefix="/matches", tags=["PinpanClub - Matches"])


@router.get("", response_model=List[Match])
async def get_matches(
    estado: Optional[MatchState] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Get lista of matches"""
    if estado:
        return await match_service.get_matches_by_state(estado, limit)
    return await match_service.get_active_matches()


@router.get("/active", response_model=List[Match])
async def get_active_matches():
    """Get partidos active (en curso o pausados)"""
    return await match_service.get_active_matches()


@router.get("/active/all")
async def get_all_active_matches():
    """Get todos matches active para TV/Canvas"""
    matches = await match_service.get_active_matches()
    return [m.model_dump() for m in matches]


@router.get("/stats")
async def get_match_stats():
    """Get statistics of matches"""
    return await match_service.get_stats()


@router.get("/{partido_id}", response_model=Match)
async def get_match(partido_id: str):
    """Get match by ID"""
    match = await match_service.get_match(partido_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("", response_model=Match)
async def create_match(
    data: MatchCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create new match (solo admin)"""
    return await match_service.create_match(data)


@router.post("/{partido_id}/start", response_model=Match)
async def start_match(
    partido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Start match"""
    match = await match_service.start_match(partido_id)
    if not match:
        raise HTTPException(status_code=400, detail="No se puede iniciar the match")
    return match


@router.post("/{partido_id}/score", response_model=Match)
async def update_score(
    partido_id: str,
    data: MatchScoreUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update puntuación dthe match"""
    match = await match_service.update_score(partido_id, data.accion)
    if not match:
        raise HTTPException(status_code=400, detail="No se puede actualizar the match")
    return match


@router.post("/{partido_id}/cancel")
async def cancel_match(
    partido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Cancelar partido"""
    success = await match_service.cancel_match(partido_id)
    if not success:
        raise HTTPException(status_code=400, detail="No se puede cancelar the match")
    return {"success": True, "message": "Partido cancelado"}
