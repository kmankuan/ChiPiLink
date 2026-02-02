"""
PinpanClub - Player Routes
Endpoints for gestión of players
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models import Player, PlayerCreate, PlayerUpdate
from ..services import player_service

router = APIRouter(prefix="/players", tags=["PinpanClub - Players"])


@router.get("", response_model=List[Player])
async def get_players(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    search: Optional[str] = None
):
    """Get lista of players activos"""
    if search:
        return await player_service.search_players(search)
    return await player_service.get_all_players(skip=skip, limit=limit)


@router.get("/rankings", response_model=List[Player])
async def get_rankings(
    limit: int = Query(50, ge=1, le=100)
):
    """Get ranking of players por ELO"""
    return await player_service.get_rankings(limit=limit)


@router.get("/{jugador_id}", response_model=Player)
async def get_player(jugador_id: str):
    """Get jugador por ID"""
    player = await player_service.get_player(jugador_id)
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return player


@router.post("", response_model=Player)
async def create_player(
    data: PlayerCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nuevo jugador (solo admin)"""
    return await player_service.create_player(data)


@router.put("/{jugador_id}", response_model=Player)
async def update_player(
    jugador_id: str,
    data: PlayerUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update jugador (solo admin)"""
    player = await player_service.update_player(jugador_id, data)
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return player


@router.delete("/{jugador_id}")
async def deactivate_player(
    jugador_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Desactivar jugador (soft delete, solo admin)"""
    success = await player_service.deactivate_player(jugador_id)
    if not success:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return {"success": True, "message": "Jugador desactivado"}
