"""
Achievements - API Routes
Endpoints for logros automáticos
"""
from fastapi import APIRouter, HTTPException
from typing import List

from ..services.achievements_service import achievements_service

router = APIRouter(prefix="/achievements", tags=["Achievements"])


@router.get("/")
async def get_all_achievements():
    """Get todos los logros disponibles"""
    achievements = await achievements_service.get_all_achievements()
    return {"achievements": achievements, "total": len(achievements)}


@router.get("/player/{jugador_id}")
async def get_player_achievements(jugador_id: str):
    """Get logros de a player"""
    achievements = await achievements_service.get_player_achievements(jugador_id)
    return {
        "jugador_id": jugador_id,
        "achievements": achievements,
        "total": len(achievements)
    }


@router.post("/check/{jugador_id}")
async def check_achievements(jugador_id: str):
    """
    Verificar y otorgar logros pendientes para a player.
    Llamar después de completar retos.
    """
    awarded = await achievements_service.check_and_award_achievements(jugador_id)
    return {
        "jugador_id": jugador_id,
        "awarded": awarded,
        "count": len(awarded)
    }


@router.post("/initialize")
async def initialize_achievements():
    """Inicializar logros en la base de datos (admin)"""
    created = await achievements_service.initialize_achievements()
    return {"message": f"{created} logros inicializados", "created": created}
