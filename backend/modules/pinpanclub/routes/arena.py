"""
PinPan Arena - API Routes
Endpoints for the unified tournament system
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.arena import (
    Tournament, TournamentCreate, TournamentUpdate,
    TournamentFormat, TournamentStatus, ArenaMatch
)
from ..services.arena_service import arena_service

router = APIRouter(prefix="/arena", tags=["PinPan Arena"])


# ============== TOURNAMENTS ==============

@router.get("/tournaments")
async def list_tournaments(status: Optional[str] = None):
    """List all tournaments, optionally filtered by status"""
    return await arena_service.list_tournaments(status=status)


@router.get("/tournaments/active")
async def get_active_tournaments():
    """Get currently active tournaments (open registration or in progress)"""
    return await arena_service.get_active_tournaments()


@router.get("/tournaments/{tournament_id}")
async def get_tournament(tournament_id: str):
    """Get tournament details"""
    t = await arena_service.get_tournament(tournament_id)
    if not t:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return t


@router.post("/tournaments")
async def create_tournament(data: TournamentCreate, user: dict = Depends(get_current_user)):
    """Create a new tournament (admin/moderator only)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can create tournaments")
    return await arena_service.create_tournament(data, created_by=user.get("user_id"))


@router.put("/tournaments/{tournament_id}")
async def update_tournament(tournament_id: str, data: TournamentUpdate, user: dict = Depends(get_current_user)):
    """Update tournament settings (admin/moderator only)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can update tournaments")
    result = await arena_service.update_tournament(tournament_id, data)
    if not result:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return result


@router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    """Delete a tournament (admin only)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can delete tournaments")
    success = await arena_service.delete_tournament(tournament_id)
    if not success:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {"success": True}


# ============== REGISTRATION ==============

@router.post("/tournaments/{tournament_id}/open-registration")
async def open_registration(tournament_id: str, user: dict = Depends(get_current_user)):
    """Open registration for a tournament (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can manage registration")
    result = await arena_service.open_registration(tournament_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return result


@router.post("/tournaments/{tournament_id}/close-registration")
async def close_registration(tournament_id: str, user: dict = Depends(get_current_user)):
    """Close registration for a tournament (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can manage registration")
    result = await arena_service.close_registration(tournament_id)
    if not result:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return result


@router.post("/tournaments/{tournament_id}/register")
async def register_player(tournament_id: str, user: dict = Depends(get_current_user)):
    """Register the current user as a participant"""
    player_id = user.get("player_id") or user.get("user_id")
    try:
        return await arena_service.register_player(tournament_id, player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{tournament_id}/register/{player_id}")
async def register_specific_player(tournament_id: str, player_id: str, user: dict = Depends(get_current_user)):
    """Register a specific player (admin/moderator can register others)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins/moderators can register other players")
    try:
        return await arena_service.register_player(tournament_id, player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{tournament_id}/withdraw")
async def withdraw_player(tournament_id: str, user: dict = Depends(get_current_user)):
    """Withdraw the current user from a tournament"""
    player_id = user.get("player_id") or user.get("user_id")
    try:
        return await arena_service.withdraw_player(tournament_id, player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== SEEDING & BRACKETS ==============

@router.post("/tournaments/{tournament_id}/apply-seeding")
async def apply_seeding(tournament_id: str, user: dict = Depends(get_current_user)):
    """Apply seeding to participants (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can apply seeding")
    try:
        return await arena_service.apply_seeding(tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{tournament_id}/generate-brackets")
async def generate_brackets(tournament_id: str, user: dict = Depends(get_current_user)):
    """Generate brackets/schedule and start the tournament (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can generate brackets")
    try:
        return await arena_service.generate_brackets(tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{tournament_id}/generate-knockout")
async def generate_knockout(tournament_id: str, user: dict = Depends(get_current_user)):
    """Generate knockout bracket from group stage results (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can generate knockout brackets")
    try:
        return await arena_service.generate_knockout_from_groups(tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== MATCHES ==============

@router.get("/tournaments/{tournament_id}/matches")
async def get_tournament_matches(tournament_id: str):
    """Get all matches for a tournament"""
    return await arena_service.get_tournament_matches(tournament_id)


@router.get("/matches/{match_id}")
async def get_match(match_id: str):
    """Get a specific match"""
    m = await arena_service.get_match(match_id)
    if not m:
        raise HTTPException(status_code=404, detail="Match not found")
    return m


@router.post("/tournaments/{tournament_id}/matches/{match_id}/result")
async def submit_match_result(
    tournament_id: str,
    match_id: str,
    winner_id: str = Query(...),
    score_a: int = Query(0),
    score_b: int = Query(0),
    user: dict = Depends(get_current_user)
):
    """Submit match result and advance bracket (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can submit results")
    try:
        return await arena_service.submit_match_result(
            tournament_id, match_id, winner_id, score_a, score_b
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== RAPIDPIN MODE ==============

@router.post("/tournaments/{tournament_id}/rapidpin-match")
async def submit_rapidpin_match(
    tournament_id: str,
    player_a_id: str = Query(...),
    player_b_id: str = Query(...),
    winner_id: str = Query(...),
    score_a: int = Query(0),
    score_b: int = Query(0),
    user: dict = Depends(get_current_user)
):
    """Submit a spontaneous match result in RapidPin tournament mode"""
    try:
        return await arena_service.submit_rapidpin_match(
            tournament_id, player_a_id, player_b_id, winner_id, score_a, score_b
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== TOURNAMENT LIFECYCLE ==============

@router.post("/tournaments/{tournament_id}/complete")
async def complete_tournament(tournament_id: str, user: dict = Depends(get_current_user)):
    """Manually complete/finalize a tournament (admin/moderator)"""
    role = user.get("role", "user")
    if role not in ["admin", "super_admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Only admins and moderators can complete tournaments")
    try:
        return await arena_service.complete_tournament(tournament_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
