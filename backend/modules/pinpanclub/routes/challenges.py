"""
Weekly Challenges - API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.challenges import (
    ChallengeDefinition, ChallengeDefinitionCreate,
    PlayerChallenge,
    WeeklyChallengeSet,
    ChallengeLeaderboard
)
from ..services.challenges_service import challenge_service

router = APIRouter(prefix="/challenges", tags=["Challenges"])


# ============== CHALLENGE DEFINITIONS ==============

@router.get("/definitions", response_model=List[ChallengeDefinition])
async def get_all_challenges():
    """Get todos los retos activos"""
    return await challenge_service.get_all_challenges()


@router.get("/definitions/{challenge_id}", response_model=ChallengeDefinition)
async def get_challenge(challenge_id: str):
    """Get definición de un reto"""
    challenge = await challenge_service.get_challenge(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    return challenge


@router.post("/definitions", response_model=ChallengeDefinition)
async def create_challenge(
    data: ChallengeDefinitionCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create un reto personalizado (solo admin)"""
    return await challenge_service.create_challenge(data)


@router.put("/definitions/{challenge_id}", response_model=ChallengeDefinition)
async def update_challenge(
    challenge_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update un reto (solo admin)"""
    challenge = await challenge_service.update_challenge(challenge_id, data)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    return challenge


@router.delete("/definitions/{challenge_id}")
async def deactivate_challenge(
    challenge_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Desactivar un reto (solo admin)"""
    success = await challenge_service.deactivate_challenge(challenge_id)
    return {"success": success}


# ============== WEEKLY CHALLENGES ==============

@router.get("/weekly")
async def get_weekly_challenges():
    """Get retos de la semana actual"""
    week = await challenge_service.get_current_week()
    challenges = await challenge_service.get_weekly_challenges()
    
    return {
        "week": week,
        "challenges": challenges
    }


@router.post("/weekly/generate")
async def generate_weekly_challenges(admin: dict = Depends(get_admin_user)):
    """Generar retos de la semana (solo admin)"""
    week = await challenge_service.create_weekly_set(auto_generate=True)
    challenges = await challenge_service.get_weekly_challenges()
    
    return {
        "week": week,
        "challenges": challenges
    }


# ============== PLAYER CHALLENGES ==============

@router.post("/start/{challenge_id}", response_model=PlayerChallenge)
async def start_challenge(challenge_id: str, jugador_id: str):
    """Iniciar un reto para un jugador"""
    try:
        return await challenge_service.start_challenge(jugador_id, challenge_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/player/{jugador_id}")
async def get_player_challenges(
    jugador_id: str,
    status: Optional[str] = None
):
    """Get retos de un jugador"""
    challenges = await challenge_service.get_player_challenges(jugador_id, status)
    stats = await challenge_service.get_player_stats(jugador_id)
    
    return {
        "jugador_id": jugador_id,
        "challenges": challenges,
        "stats": stats
    }


@router.get("/player/{jugador_id}/active")
async def get_active_challenges(jugador_id: str):
    """Get retos activos de un jugador"""
    challenges = await challenge_service.get_player_challenges(jugador_id, "in_progress")
    return {"jugador_id": jugador_id, "active_challenges": challenges}


@router.get("/player/{jugador_id}/stats")
async def get_player_challenge_stats(jugador_id: str):
    """Get estadísticas de retos del jugador"""
    stats = await challenge_service.get_player_stats(jugador_id)
    rank = await challenge_service.get_player_rank(jugador_id)
    return {
        "jugador_id": jugador_id,
        "stats": stats,
        "rank": rank
    }


# ============== LEADERBOARD ==============

@router.get("/leaderboard")
async def get_leaderboard(
    limit: int = 20,
    offset: int = 0,
    jugador_id: Optional[str] = None
):
    """Get leaderboard de retos"""
    leaderboard = await challenge_service.get_leaderboard(limit, offset)
    return {
        "leaderboard": leaderboard,
        "total": len(leaderboard),
        "limit": limit,
        "offset": offset
    }


@router.get("/player/{jugador_id}/rank")
async def get_player_rank(jugador_id: str):
    """Get información de rango de un jugador"""
    from core.database import db
    
    # Obtener entrada del leaderboard
    entry = await db.pinpanclub_challenges_leaderboard.find_one(
        {"jugador_id": jugador_id},
        {"_id": 0}
    )
    
    total_points = entry.get("total_points", 0) if entry else 0
    challenges_completed = entry.get("challenges_completed", 0) if entry else 0
    current_streak = entry.get("current_streak", 0) if entry else 0
    
    # Calcular rank basado en puntos
    ranks = [
        {"id": "bronze", "name": "Bronce", "min": 0, "max": 99, "icon": "🥉"},
        {"id": "silver", "name": "Plata", "min": 100, "max": 299, "icon": "🥈"},
        {"id": "gold", "name": "Oro", "min": 300, "max": 599, "icon": "🥇"},
        {"id": "platinum", "name": "Platino", "min": 600, "max": 999, "icon": "💎"},
        {"id": "diamond", "name": "Diamante", "min": 1000, "max": 1999, "icon": "💠"},
        {"id": "master", "name": "Maestro", "min": 2000, "max": 4999, "icon": "👑"},
        {"id": "grandmaster", "name": "Gran Maestro", "min": 5000, "max": float('inf'), "icon": "🏆"}
    ]
    
    current_rank = ranks[0]
    next_rank = ranks[1] if len(ranks) > 1 else None
    
    for i, rank in enumerate(ranks):
        if total_points >= rank["min"]:
            current_rank = rank
            next_rank = ranks[i + 1] if i + 1 < len(ranks) else None
    
    # Calcular progreso
    progress = 0
    points_to_next = 0
    if next_rank:
        range_size = next_rank["min"] - current_rank["min"]
        progress_points = total_points - current_rank["min"]
        progress = min(round((progress_points / range_size) * 100), 100)
        points_to_next = next_rank["min"] - total_points
    else:
        progress = 100
    
    return {
        "jugador_id": jugador_id,
        "total_points": total_points,
        "challenges_completed": challenges_completed,
        "current_streak": current_streak,
        "current_rank": current_rank,
        "next_rank": next_rank,
        "progress": progress,
        "points_to_next": points_to_next
    }
