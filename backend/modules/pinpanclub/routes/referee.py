"""
PinPanClub - Referee & Settings & Hall of Fame Routes
Unified referee system + global leaderboard endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from core.auth import get_current_user, get_admin_user
from ..services.settings_service import pinpan_settings_service

router = APIRouter(prefix="/referee", tags=["Referee & Leaderboard"])


# ============== GLOBAL SETTINGS (Admin) ==============

@router.get("/settings")
async def get_settings():
    """Get global PinPanClub referee settings"""
    return await pinpan_settings_service.get_settings()


@router.put("/settings/{game_type}")
async def update_referee_settings(
    game_type: str,
    updates: dict,
    user=Depends(get_admin_user)
):
    """Update referee settings for a specific game type (admin only)"""
    valid_types = ("league", "rapidpin", "arena", "casual")
    if game_type not in valid_types:
        raise HTTPException(400, f"game_type must be one of: {valid_types}")
    result = await pinpan_settings_service.update_referee_settings(
        game_type, updates, updated_by=user.get("user_id")
    )
    return result


# ============== REFEREE PROFILES ==============

@router.get("/profiles")
async def get_referee_leaderboard(limit: int = Query(20, ge=1, le=100)):
    """Get top referees ranked by points"""
    return await pinpan_settings_service.get_referee_leaderboard(limit)


@router.get("/profiles/{player_id}")
async def get_referee_profile(player_id: str):
    """Get a specific referee profile"""
    profile = await pinpan_settings_service.get_referee_profile(player_id)
    if not profile:
        raise HTTPException(404, "Referee profile not found")
    return profile


@router.post("/record-activity")
async def record_referee_activity(data: dict, user=Depends(get_current_user)):
    """Record a referee activity (called internally after match finishes)"""
    player_id = data.get("player_id") or user.get("user_id")
    game_type = data.get("game_type", "casual")
    player_name = data.get("player_name", user.get("name", ""))
    player_avatar = data.get("player_avatar")
    result = await pinpan_settings_service.record_referee_activity(
        player_id, game_type, player_name, player_avatar
    )
    return result


# ============== REFEREE RATING ==============

@router.post("/rate")
async def rate_referee(data: dict, user=Depends(get_current_user)):
    """Rate a referee after a match"""
    match_id = data.get("match_id")
    referee_id = data.get("referee_id")
    rating = data.get("rating", 5)
    comment = data.get("comment")

    if not match_id or not referee_id:
        raise HTTPException(400, "match_id and referee_id are required")
    if not 1 <= rating <= 5:
        raise HTTPException(400, "rating must be between 1 and 5")

    result = await pinpan_settings_service.rate_referee(
        match_id, referee_id, rated_by=user.get("user_id"),
        rating=rating, comment=comment
    )
    return result


# ============== HALL OF FAME - ALL-TIME LEADERBOARD ==============

@router.get("/hall-of-fame")
async def get_hall_of_fame(
    mode: Optional[str] = Query(None, description="Filter: arena, league, rapidpin, referee, or None for combined"),
    limit: int = Query(50, ge=1, le=100)
):
    """Get the all-time Hall of Fame leaderboard"""
    return await pinpan_settings_service.get_hall_of_fame(mode, limit)


@router.get("/hall-of-fame/{player_id}")
async def get_player_hall_of_fame(player_id: str):
    """Get a player's combined Hall of Fame stats"""
    stats = await pinpan_settings_service.get_player_hall_of_fame(player_id)
    if not stats:
        raise HTTPException(404, "Player not found in Hall of Fame")
    return stats


@router.post("/hall-of-fame/refresh")
async def refresh_hall_of_fame(user=Depends(get_admin_user)):
    """Rebuild the Hall of Fame leaderboard from all sources (admin only)"""
    result = await pinpan_settings_service.rebuild_hall_of_fame()
    return {"success": True, "entries_updated": result}
