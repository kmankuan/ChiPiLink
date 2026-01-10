"""
Super Pin Ranking - API Routes
Endpoints para el sistema de ranking
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.superpin import (
    SuperPinLeague, SuperPinLeagueCreate, SuperPinLeagueUpdate,
    SuperPinMatch, SuperPinMatchCreate,
    PlayerCheckIn, PlayerCheckInCreate,
    RankingTable, RankingEntry,
    SeasonTournament, SeasonTournamentCreate,
    CheckInMethod
)
from ..services.superpin_service import superpin_service

router = APIRouter(prefix="/superpin", tags=["Super Pin Ranking"])


# ============== LEAGUES ==============

@router.get("/leagues", response_model=List[SuperPinLeague])
async def get_leagues(active_only: bool = False):
    """Obtener todas las ligas o solo las activas"""
    if active_only:
        return await superpin_service.get_active_leagues()
    return await superpin_service.get_all_leagues()


@router.get("/leagues/{liga_id}", response_model=SuperPinLeague)
async def get_league(liga_id: str):
    """Obtener liga por ID"""
    league = await superpin_service.get_league(liga_id)
    if not league:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    return league


@router.post("/leagues", response_model=SuperPinLeague)
async def create_league(
    data: SuperPinLeagueCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear nueva liga (solo admin)"""
    return await superpin_service.create_league(data)


@router.put("/leagues/{liga_id}", response_model=SuperPinLeague)
async def update_league(
    liga_id: str,
    data: SuperPinLeagueUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar liga (solo admin)"""
    league = await superpin_service.update_league(liga_id, data)
    if not league:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    return league


@router.post("/leagues/{liga_id}/activate", response_model=SuperPinLeague)
async def activate_league(
    liga_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Activar liga (solo admin)"""
    league = await superpin_service.activate_league(liga_id)
    if not league:
        raise HTTPException(status_code=404, detail="Liga no encontrada")
    return league


# ============== CHECK-IN ==============

@router.get("/leagues/{liga_id}/available-players", response_model=List[PlayerCheckIn])
async def get_available_players(liga_id: str):
    """Obtener jugadores disponibles (con check-in activo)"""
    return await superpin_service.get_available_players(liga_id)


@router.post("/leagues/{liga_id}/checkin", response_model=PlayerCheckIn)
async def check_in(
    liga_id: str,
    jugador_id: str,
    method: CheckInMethod = CheckInMethod.MANUAL,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    qr_code: Optional[str] = None
):
    """Registrar check-in de jugador"""
    # Validar geolocalización si es el método
    if method == CheckInMethod.GEOLOCATION:
        if not latitude or not longitude:
            raise HTTPException(
                status_code=400,
                detail="Latitud y longitud requeridas para check-in por geolocalización"
            )
        is_valid = await superpin_service.validate_geolocation(liga_id, latitude, longitude)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Ubicación fuera del rango permitido"
            )
    
    data = PlayerCheckInCreate(
        jugador_id=jugador_id,
        liga_id=liga_id,
        method=method,
        latitude=latitude,
        longitude=longitude,
        qr_code=qr_code
    )
    
    return await superpin_service.check_in_player(data)


@router.post("/leagues/{liga_id}/checkout")
async def check_out(liga_id: str, jugador_id: str):
    """Registrar check-out de jugador"""
    success = await superpin_service.check_out_player(liga_id, jugador_id)
    return {"success": success}


# ============== MATCHES ==============

@router.post("/matches", response_model=SuperPinMatch)
async def create_match(data: SuperPinMatchCreate):
    """Crear nuevo partido Super Pin"""
    return await superpin_service.create_match(data)


@router.get("/matches/{partido_id}", response_model=SuperPinMatch)
async def get_match(partido_id: str):
    """Obtener partido por ID"""
    match = await superpin_service.get_match(partido_id)
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return match


@router.post("/matches/{partido_id}/start", response_model=SuperPinMatch)
async def start_match(partido_id: str):
    """Iniciar partido"""
    match = await superpin_service.start_match(partido_id)
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    return match


@router.post("/matches/{partido_id}/point")
async def record_point(
    partido_id: str,
    jugador: str,  # 'a' o 'b'
    ace: bool = False,
    error_forzado: bool = False,
    punto_saque: bool = False
):
    """Registrar punto en el partido"""
    if jugador not in ['a', 'b']:
        raise HTTPException(status_code=400, detail="Jugador debe ser 'a' o 'b'")
    
    # Estadísticas avanzadas opcionales
    stats = {}
    if ace:
        stats[f"aces_{jugador}"] = 1
    if punto_saque:
        stats[f"puntos_saque_{jugador}"] = 1
    
    try:
        result = await superpin_service.record_point(partido_id, jugador, stats if stats else None)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leagues/{liga_id}/matches")
async def get_league_matches(
    liga_id: str,
    estado: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Obtener partidos de una liga"""
    matches = await superpin_service.match_repo.get_league_matches(liga_id, estado, limit)
    return matches


# ============== RANKING ==============

@router.get("/leagues/{liga_id}/ranking", response_model=RankingTable)
async def get_ranking(liga_id: str):
    """Obtener tabla de ranking de una liga"""
    try:
        return await superpin_service.get_ranking(liga_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/leagues/{liga_id}/ranking/{jugador_id}")
async def get_player_stats(liga_id: str, jugador_id: str):
    """Obtener estadísticas de un jugador en una liga"""
    stats = await superpin_service.get_player_stats(liga_id, jugador_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Jugador no encontrado en esta liga")
    return stats


@router.get("/leagues/{liga_id}/head-to-head")
async def get_head_to_head(
    liga_id: str,
    jugador_a_id: str,
    jugador_b_id: str
):
    """Obtener historial entre dos jugadores"""
    matches = await superpin_service.match_repo.get_head_to_head(
        liga_id, jugador_a_id, jugador_b_id
    )
    
    # Calcular estadísticas
    wins_a = sum(1 for m in matches if m.get("ganador_id") == jugador_a_id)
    wins_b = sum(1 for m in matches if m.get("ganador_id") == jugador_b_id)
    
    return {
        "total_matches": len(matches),
        "wins_a": wins_a,
        "wins_b": wins_b,
        "matches": matches
    }


# ============== SEASON TOURNAMENT ==============

@router.post("/tournaments", response_model=SeasonTournament)
async def create_tournament(
    data: SeasonTournamentCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear torneo de fin de temporada (solo admin)"""
    try:
        return await superpin_service.create_season_tournament(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leagues/{liga_id}/tournaments")
async def get_league_tournaments(liga_id: str):
    """Obtener torneos de una liga"""
    return await superpin_service.tournament_repo.get_league_tournaments(liga_id)


@router.get("/tournaments/{torneo_id}", response_model=SeasonTournament)
async def get_tournament(torneo_id: str):
    """Obtener torneo por ID"""
    tournament = await superpin_service.tournament_repo.get_by_id(torneo_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return SeasonTournament(**tournament)


@router.post("/tournaments/{torneo_id}/generate-brackets")
async def generate_brackets(torneo_id: str, admin: dict = Depends(get_admin_user)):
    """Generar brackets para torneo de eliminación"""
    try:
        result = await superpin_service.generate_tournament_brackets(torneo_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{torneo_id}/matches/{match_id}/result")
async def update_match_result(
    torneo_id: str,
    match_id: str,
    winner_id: str,
    score_a: int = 0,
    score_b: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar resultado de un partido del torneo"""
    try:
        result = await superpin_service.update_tournament_match(
            torneo_id, match_id, winner_id, score_a, score_b
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tournaments/{torneo_id}/brackets")
async def get_tournament_brackets(torneo_id: str):
    """Obtener brackets de un torneo"""
    tournament = await superpin_service.get_tournament_with_brackets(torneo_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return {
        "torneo_id": tournament.get("torneo_id"),
        "nombre": tournament.get("nombre"),
        "estado": tournament.get("estado"),
        "brackets": tournament.get("brackets", []),
        "participantes": tournament.get("participantes", []),
        "resultados_finales": tournament.get("resultados_finales", [])
    }


# ============== BADGES ==============

@router.get("/badges/recent")
async def get_recent_badges(limit: int = 20):
    """Obtener badges más recientes (feed)"""
    return await superpin_service.get_recent_badges(limit)


@router.get("/badges/leaderboard")
async def get_badge_leaderboard(liga_id: str = None, limit: int = 10):
    """Obtener ranking de jugadores por badges"""
    return await superpin_service.get_badge_leaderboard(liga_id, limit)


@router.get("/players/{jugador_id}/badges")
async def get_player_badges(jugador_id: str):
    """Obtener todos los badges de un jugador"""
    badges = await superpin_service.get_player_badges(jugador_id)
    return {"jugador_id": jugador_id, "badges": badges, "total": len(badges)}


@router.post("/tournaments/{torneo_id}/award-badges")
async def award_tournament_badges(torneo_id: str, admin: dict = Depends(get_admin_user)):
    """Otorgar badges a los ganadores de un torneo finalizado"""
    badges = await superpin_service.award_tournament_badges(torneo_id)
    return {"awarded_badges": badges, "total": len(badges)}


@router.get("/badges/definitions")
async def get_badge_definitions():
    """Obtener todas las definiciones de badges"""
    from ..models.superpin import BADGE_DEFINITIONS
    return BADGE_DEFINITIONS


# ============== PLAYER STATISTICS ==============

@router.get("/players/{jugador_id}/statistics")
async def get_player_statistics(jugador_id: str, liga_id: str = None):
    """Obtener estadísticas detalladas de un jugador"""
    stats = await superpin_service.get_player_statistics(jugador_id, liga_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return stats


@router.get("/head-to-head")
async def get_head_to_head(jugador_a_id: str, jugador_b_id: str):
    """Obtener estadísticas de enfrentamientos directos"""
    return await superpin_service.get_head_to_head(jugador_a_id, jugador_b_id)
