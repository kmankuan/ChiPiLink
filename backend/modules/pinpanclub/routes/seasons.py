"""
Ranking Seasons - API Routes
Endpoints for sistema of seasons de ranking
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime, timezone

from ..services.seasons_service import seasons_service
from ..models.seasons import SeasonType

router = APIRouter(prefix="/seasons", tags=["Ranking Seasons"])


# ============== SEASON INFO ==============

@router.get("/current")
async def get_current_season(lang: str = Query("es")):
    """Get the season activa actual"""
    season = await seasons_service.get_current_season()
    
    if not season:
        # Intentar crear/activar a season
        season = await seasons_service.ensure_active_season()
    
    if not season:
        return {"season": None, "message": "No active season"}
    
    # Localizar nombre y descripción
    season["localized_name"] = season["name"].get(lang, season["name"].get("es"))
    season["localized_description"] = season["description"].get(lang, season["description"].get("es"))
    
    return {"season": season}


@router.get("/all")
async def get_all_seasons(
    limit: int = Query(20, ge=1, le=50),
    lang: str = Query("es")
):
    """Get todas seasons"""
    seasons = await seasons_service.get_all_seasons(limit)
    
    # Localizar nombres
    for s in seasons:
        s["localized_name"] = s["name"].get(lang, s["name"].get("es"))
    
    return {
        "seasons": seasons,
        "total": len(seasons)
    }


@router.get("/past")
async def get_past_seasons(
    limit: int = Query(10, ge=1, le=50),
    lang: str = Query("es")
):
    """Get temporadas pasadas completadas"""
    seasons = await seasons_service.get_past_seasons(limit)
    
    for s in seasons:
        s["localized_name"] = s["name"].get(lang, s["name"].get("es"))
    
    return {
        "seasons": seasons,
        "total": len(seasons)
    }


@router.get("/{season_id}")
async def get_season_by_id(season_id: str, lang: str = Query("es")):
    """Get detalles de a season específica"""
    season = await seasons_service.get_season_by_id(season_id)
    
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    
    season["localized_name"] = season["name"].get(lang, season["name"].get("es"))
    season["localized_description"] = season["description"].get(lang, season["description"].get("es"))
    
    return {"season": season}


# ============== LEADERBOARD ==============

@router.get("/current/leaderboard")
async def get_current_season_leaderboard(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get leaderboard of the season actual"""
    season = await seasons_service.get_current_season()
    
    if not season:
        return {"season_id": None, "leaderboard": [], "message": "No active season"}
    
    leaderboard = await seasons_service.get_season_leaderboard(
        season["season_id"], limit, offset
    )
    
    return {
        "season_id": season["season_id"],
        "season_name": season["name"],
        "leaderboard": leaderboard,
        "total": len(leaderboard)
    }


@router.get("/{season_id}/leaderboard")
async def get_season_leaderboard(
    season_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get leaderboard de a season"""
    leaderboard = await seasons_service.get_season_leaderboard(season_id, limit, offset)
    
    return {
        "season_id": season_id,
        "leaderboard": leaderboard,
        "total": len(leaderboard),
        "limit": limit,
        "offset": offset
    }


# ============== PLAYER STATS ==============

@router.get("/player/{jugador_id}/current")
async def get_player_current_season_stats(jugador_id: str):
    """Get statistics of the player en the season actual"""
    stats = await seasons_service.get_player_season_stats(jugador_id)
    
    if not stats:
        season = await seasons_service.get_current_season()
        return {
            "jugador_id": jugador_id,
            "season_id": season["season_id"] if season else None,
            "participating": False,
            "season_points": 0,
            "challenges_completed": 0,
            "current_position": None
        }
    
    return {
        "jugador_id": jugador_id,
        "participating": True,
        **stats
    }


@router.get("/player/{jugador_id}/stats/{season_id}")
async def get_player_season_stats(jugador_id: str, season_id: str):
    """Get statistics of the player en a season específica"""
    stats = await seasons_service.get_player_season_stats(jugador_id, season_id)
    
    if not stats:
        return {
            "jugador_id": jugador_id,
            "season_id": season_id,
            "participating": False
        }
    
    return {
        "jugador_id": jugador_id,
        "participating": True,
        **stats
    }


@router.get("/player/{jugador_id}/rewards")
async def get_player_season_rewards(jugador_id: str):
    """Get all recompensas de temporada de a player"""
    rewards = await seasons_service.get_player_season_rewards(jugador_id)
    
    return {
        "jugador_id": jugador_id,
        "rewards": rewards,
        "total": len(rewards)
    }


# ============== ADMIN ENDPOINTS ==============

@router.post("/create")
async def create_season(
    name_es: str = Query(...),
    name_en: str = Query(...),
    description_es: str = Query(...),
    description_en: str = Query(...),
    start_date: str = Query(..., description="ISO format date"),
    end_date: str = Query(..., description="ISO format date"),
    season_type: str = Query("monthly"),
    theme_id: Optional[str] = Query(None)
):
    """Create una new season (admin)"""
    try:
        start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")
    
    season = await seasons_service.create_season(
        name={"es": name_es, "en": name_en},
        description={"es": description_es, "en": description_en},
        start_date=start_dt,
        end_date=end_dt,
        season_type=SeasonType(season_type),
        theme_id=theme_id
    )
    
    return {"message": "Season created", "season": season}


@router.post("/create-monthly")
async def create_monthly_season(lang: str = Query("es")):
    """Create automáticamente la siguiente temporada mensual (admin)"""
    season = await seasons_service.create_next_monthly_season(lang)
    return {"message": "Monthly season created", "season": season}


@router.post("/{season_id}/activate")
async def activate_season(season_id: str):
    """Activar a season (admin)"""
    success = await seasons_service.activate_season(season_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Season not found or already active")
    
    return {"message": f"Season {season_id} activated"}


@router.post("/{season_id}/close")
async def close_season(season_id: str, lang: str = Query("es")):
    """Cerrar a season y otorgar recompensas (admin)"""
    try:
        result = await seasons_service.close_season(season_id, lang)
        return {
            "message": "Season closed successfully",
            "result": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ensure-active")
async def ensure_active_season():
    """Asegurar que existe a season activa (admin/cron)"""
    season = await seasons_service.ensure_active_season()
    
    if season:
        return {
            "message": "Active season ensured",
            "season_id": season["season_id"],
            "status": season["status"]
        }
    
    return {"message": "Could not ensure active season", "season": None}
