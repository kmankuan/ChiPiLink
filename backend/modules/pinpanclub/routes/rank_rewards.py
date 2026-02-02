"""
Rank Rewards - API Routes
Endpoints for system for recompensas por rango
"""
from fastapi import APIRouter, Query
from typing import Optional

from ..services.rank_rewards_service import rank_rewards_service

router = APIRouter(prefix="/rank-rewards", tags=["Rank Rewards"])


@router.get("/info")
async def get_rank_rewards_info(lang: str = Query("es", description="Language code (es, en, zh)")):
    """
    Obtener información de todos los rangos y sus recompensas.
    Útil para mostrar en la UI qué recompensas hay disponibles.
    """
    rewards_info = await rank_rewards_service.get_rank_rewards_info(lang)
    return {
        "ranks": rewards_info,
        "total_ranks": len(rewards_info),
        "lang": lang
    }


@router.get("/player/{jugador_id}/history")
async def get_player_rank_history(jugador_id: str):
    """Get historial de rangos y recompensas de a player"""
    history = await rank_rewards_service.get_player_rank_history(jugador_id)
    return {
        "jugador_id": jugador_id,
        "history": history,
        "total_promotions": len(history)
    }


@router.post("/check-promotion/{jugador_id}")
async def check_rank_promotion(
    jugador_id: str,
    old_points: int = Query(..., description="Previous point total"),
    new_points: int = Query(..., description="New point total"),
    lang: str = Query("es", description="Language code")
):
    """
    Verificar si hubo promoción de rango y otorgar recompensas.
    Normalmente llamado internamente después de completar retos.
    """
    result = await rank_rewards_service.check_rank_promotion(
        jugador_id, old_points, new_points, lang
    )
    
    if result:
        return {
            "promoted": True,
            "promotion": result
        }
    
    return {
        "promoted": False,
        "message": "No rank promotion"
    }


@router.get("/current/{jugador_id}")
async def get_current_rank_info(
    jugador_id: str,
    lang: str = Query("es", description="Language code")
):
    """Get información del rango actual de a player"""
    from core.database import db
    
    # Get puntos actuales
    entry = await db.pinpanclub_challenges_leaderboard.find_one(
        {"jugador_id": jugador_id},
        {"_id": 0}
    )
    
    total_points = entry.get("total_points", 0) if entry else 0
    
    # Get rango actual
    current_rank = rank_rewards_service.get_rank_by_points(total_points)
    
    # Get recompensas ya recibidas
    history = await rank_rewards_service.get_player_rank_history(jugador_id)
    earned_ranks = [h["rank_id"] for h in history]
    
    # Info of recompensas del rango actual
    all_rewards = await rank_rewards_service.get_rank_rewards_info(lang)
    current_reward_info = next(
        (r for r in all_rewards if r["id"] == current_rank["id"]),
        None
    )
    
    # Siguiente rango
    next_rank = None
    next_reward = None
    points_to_next = 0
    
    if current_rank["index"] < 6:  # Not max rank
        next_rank_data = all_rewards[current_rank["index"] + 1]
        next_rank = {
            "id": next_rank_data["id"],
            "name": next_rank_data["name"],
            "icon": next_rank_data["icon"],
            "min_points": next_rank_data["min_points"]
        }
        next_reward = next_rank_data.get("reward")
        points_to_next = next_rank_data["min_points"] - total_points
    
    return {
        "jugador_id": jugador_id,
        "total_points": total_points,
        "current_rank": {
            "id": current_rank["id"],
            "name": current_rank["name"].get(lang, current_rank["name"].get("es")),
            "icon": current_rank["icon"],
            "reward_earned": current_rank["id"] in earned_ranks
        },
        "current_reward": current_reward_info.get("reward") if current_reward_info else None,
        "next_rank": next_rank,
        "next_reward": next_reward,
        "points_to_next": points_to_next,
        "earned_ranks": earned_ranks,
        "lang": lang
    }
