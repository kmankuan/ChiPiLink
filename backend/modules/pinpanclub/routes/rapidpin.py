"""
Rapid Pin - API Routes
Endpoints para el sistema de partidos espontáneos
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.rapidpin import (
    RapidPinSeason, RapidPinSeasonCreate, RapidPinSeasonUpdate,
    RapidPinMatch, RapidPinMatchCreate,
    RapidPinRankingTable, RapidPinRankingEntry,
    RapidPinSeasonFinalResults, RAPID_PIN_SCORING
)
from ..services.rapidpin_service import rapidpin_service

router = APIRouter(prefix="/rapidpin", tags=["Rapid Pin"])


# ============== SEASONS ==============

@router.get("/seasons", response_model=List[RapidPinSeason])
async def get_seasons(active_only: bool = False):
    """Obtener todas las temporadas o solo las activas"""
    if active_only:
        return await rapidpin_service.get_active_seasons()
    return await rapidpin_service.get_all_seasons()


@router.get("/seasons/{season_id}", response_model=RapidPinSeason)
async def get_season(season_id: str):
    """Obtener temporada por ID"""
    season = await rapidpin_service.get_season(season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    return season


@router.post("/seasons", response_model=RapidPinSeason)
async def create_season(
    data: RapidPinSeasonCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear nueva temporada (solo admin)"""
    return await rapidpin_service.create_season(data)


@router.put("/seasons/{season_id}", response_model=RapidPinSeason)
async def update_season(
    season_id: str,
    data: RapidPinSeasonUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar temporada (solo admin)"""
    season = await rapidpin_service.update_season(season_id, data)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    return season


@router.post("/seasons/{season_id}/close", response_model=RapidPinSeasonFinalResults)
async def close_season(
    season_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Cerrar temporada y calcular resultados finales (solo admin)"""
    try:
        return await rapidpin_service.close_season(season_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== MATCHES ==============

@router.post("/matches", response_model=RapidPinMatch)
async def register_match(data: RapidPinMatchCreate):
    """
    Registrar un nuevo partido Rapid Pin.
    El partido queda en estado 'pending' hasta que otro participante lo confirme.
    """
    try:
        return await rapidpin_service.register_match(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/matches/{match_id}/confirm", response_model=RapidPinMatch)
async def confirm_match(
    match_id: str,
    confirmado_por_id: str
):
    """
    Confirmar un partido pendiente.
    Solo puede confirmar un participante diferente al que lo registró.
    """
    try:
        return await rapidpin_service.confirm_match(match_id, confirmado_por_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/matches/{match_id}", response_model=RapidPinMatch)
async def get_match(match_id: str):
    """Obtener partido por ID"""
    match = await rapidpin_service.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return match


@router.get("/seasons/{season_id}/matches", response_model=List[RapidPinMatch])
async def get_season_matches(
    season_id: str,
    estado: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Obtener partidos de una temporada"""
    return await rapidpin_service.get_season_matches(season_id, estado, limit)


@router.get("/seasons/{season_id}/pending/{user_id}")
async def get_pending_confirmations(
    season_id: str,
    user_id: str
):
    """
    Obtener partidos pendientes de confirmación para un usuario.
    Retorna partidos donde el usuario participa pero no fue quien lo registró.
    """
    matches = await rapidpin_service.get_pending_confirmations(season_id, user_id)
    return {
        "user_id": user_id,
        "pending_matches": matches,
        "total": len(matches)
    }


@router.get("/pending/{user_id}")
async def get_all_pending_confirmations(user_id: str):
    """
    Obtener TODOS los partidos pendientes de confirmación para un usuario.
    Retorna partidos de todas las temporadas donde el usuario participa pero no fue quien lo registró.
    """
    matches = await rapidpin_service.get_all_pending_confirmations(user_id)
    return {
        "user_id": user_id,
        "pending_matches": matches,
        "total": len(matches)
    }


# ============== RANKING ==============

@router.get("/seasons/{season_id}/ranking", response_model=RapidPinRankingTable)
async def get_ranking(season_id: str):
    """Obtener tabla de ranking de jugadores"""
    try:
        return await rapidpin_service.get_ranking(season_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/seasons/{season_id}/ranking/referees", response_model=List[RapidPinRankingEntry])
async def get_referee_ranking(season_id: str):
    """Obtener ranking de árbitros"""
    return await rapidpin_service.get_referee_ranking(season_id)


@router.get("/seasons/{season_id}/players/{jugador_id}/stats")
async def get_player_stats(season_id: str, jugador_id: str):
    """Obtener estadísticas de un jugador en una temporada"""
    stats = await rapidpin_service.get_player_stats(season_id, jugador_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Jugador no encontrado en esta temporada")
    return stats


# ============== CONFIG ==============

@router.get("/scoring")
async def get_scoring_config():
    """Obtener configuración de puntuación de Rapid Pin"""
    return {
        "scoring": RAPID_PIN_SCORING,
        "rules": {
            "participants": "2 jugadores + 1 árbitro",
            "validation": "Requiere confirmación de 1 participante adicional",
            "points_victory": RAPID_PIN_SCORING["victory"],
            "points_defeat": RAPID_PIN_SCORING["defeat"],
            "points_referee": RAPID_PIN_SCORING["referee"]
        }
    }
