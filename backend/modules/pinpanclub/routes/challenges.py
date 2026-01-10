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
    """Obtener todos los retos activos"""
    return await challenge_service.get_all_challenges()


@router.get("/definitions/{challenge_id}", response_model=ChallengeDefinition)
async def get_challenge(challenge_id: str):
    """Obtener definición de un reto"""
    challenge = await challenge_service.get_challenge(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Reto no encontrado")
    return challenge


@router.post("/definitions", response_model=ChallengeDefinition)
async def create_challenge(
    data: ChallengeDefinitionCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear un reto personalizado (solo admin)"""
    return await challenge_service.create_challenge(data)


@router.put("/definitions/{challenge_id}", response_model=ChallengeDefinition)
async def update_challenge(
    challenge_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar un reto (solo admin)"""
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
    """Obtener retos de la semana actual"""
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
    """Obtener retos de un jugador"""
    challenges = await challenge_service.get_player_challenges(jugador_id, status)
    stats = await challenge_service.get_player_stats(jugador_id)
    
    return {
        "jugador_id": jugador_id,
        "challenges": challenges,
        "stats": stats
    }


@router.get("/player/{jugador_id}/active")
async def get_active_challenges(jugador_id: str):
    """Obtener retos activos de un jugador"""
    challenges = await challenge_service.get_player_challenges(jugador_id, "in_progress")
    return {"jugador_id": jugador_id, "active_challenges": challenges}


@router.get("/player/{jugador_id}/stats")
async def get_player_challenge_stats(jugador_id: str):
    """Obtener estadísticas de retos del jugador"""
    stats = await challenge_service.get_player_stats(jugador_id)
    rank = await challenge_service.get_player_rank(jugador_id)
    return {
        "jugador_id": jugador_id,
        "stats": stats,
        "rank": rank
    }


# ============== LEADERBOARD ==============

@router.get("/leaderboard", response_model=ChallengeLeaderboard)
async def get_leaderboard(limit: int = Query(50, ge=1, le=100)):
    """Obtener leaderboard de retos"""
    return await challenge_service.get_leaderboard(limit)
