"""
PinpanClub - Player Routes
Endpoints for management of players
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
    """Get lista of players active"""
    if search:
        return await player_service.search_players(search)
    return await player_service.get_all_players(skip=skip, limit=limit)


@router.get("/rankings", response_model=List[Player])
async def get_rankings(
    limit: int = Query(50, ge=1, le=100)
):
    """Get ranking of players por ELO"""
    return await player_service.get_rankings(limit=limit)


@router.get("/{player_id}", response_model=Player)
async def get_player(player_id: str):
    """Get jugador by ID"""
    player = await player_service.get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.post("", response_model=Player)
async def create_player(
    data: PlayerCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create new player (solo admin)"""
    return await player_service.create_player(data)


@router.put("/{player_id}", response_model=Player)
async def update_player(
    player_id: str,
    data: PlayerUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update jugador (solo admin)"""
    player = await player_service.update_player(player_id, data)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@router.delete("/{player_id}")
async def deactivate_player(
    player_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Desactivar jugador (soft delete, solo admin)"""
    success = await player_service.deactivate_player(player_id)
    if not success:
        raise HTTPException(status_code=404, detail="Player not found")
    return {"success": True, "message": "Jugador desactivado"}


@router.post("/{player_id}/link-user")
async def link_player_to_user(player_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Link a player profile to a registered user account (admin only)"""
    from core.database import db
    from core.constants import PinpanClubCollections, AuthCollections
    
    user_id = data.get("user_id")
    if not user_id:
        raise HTTPException(400, "user_id required")
    
    # Verify player exists
    player = await db[PinpanClubCollections.PLAYERS].find_one({"player_id": player_id}, {"_id": 0})
    if not player:
        raise HTTPException(404, "Player not found")
    
    # Verify user exists
    user = await db[AuthCollections.USERS].find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(404, "User not found")
    
    # Link
    await db[PinpanClubCollections.PLAYERS].update_one(
        {"player_id": player_id},
        {"$set": {
            "linked_user_id": user_id,
            "linked_user_email": user.get("email", ""),
            "linked_user_name": f"{user.get('name', '')} {user.get('last_name', '')}".strip(),
        }}
    )
    return {"success": True, "player_id": player_id, "linked_to": user_id}

