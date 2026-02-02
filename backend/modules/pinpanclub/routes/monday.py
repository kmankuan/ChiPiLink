"""
PinpanClub - Monday.com Integration Routes
Endpoints for integración con Monday.com
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, List

from core.auth import get_admin_user
from core.config import MONDAY_API_KEY
from ..models import MondayConfig
from ..services import monday_service
from ..repositories import PlayerRepository, MatchRepository

router = APIRouter(prefix="/monday", tags=["PinpanClub - Monday.com"])


@router.get("/status")
async def get_integration_status(admin: dict = Depends(get_admin_user)):
    """Get estado de la integración con Monday.com"""
    config = await monday_service.get_config()
    
    status = {
        "api_key_configured": bool(MONDAY_API_KEY),
        "players_board_configured": bool(config.players_board_id),
        "matches_board_configured": bool(config.matches_board_id),
        "tournaments_board_configured": bool(config.tournaments_board_id),
        "auto_sync_enabled": {
            "players": config.auto_sync_players,
            "matches": config.auto_sync_matches,
            "results": config.auto_sync_results
        },
        "connection_status": "unknown"
    }
    
    if MONDAY_API_KEY:
        try:
            result = await monday_service.test_connection()
            status["connection_status"] = "connected"
            status["monday_user"] = result.get("user", {}).get("name")
        except Exception as e:
            status["connection_status"] = "error"
            status["connection_error"] = str(e)
    else:
        status["connection_status"] = "not_configured"
    
    return status


@router.get("/config")
async def get_config(admin: dict = Depends(get_admin_user)):
    """Get configuración de Monday.com"""
    config = await monday_service.get_config()
    return {
        "has_api_key": bool(MONDAY_API_KEY),
        "config": config.model_dump()
    }


@router.put("/config")
async def update_config(
    config: MondayConfig,
    admin: dict = Depends(get_admin_user)
):
    """Update configuración de Monday.com"""
    await monday_service.save_config(config)
    return {"success": True, "message": "Configuración guardada"}


@router.get("/boards")
async def get_available_boards(admin: dict = Depends(get_admin_user)):
    """Get lista de tableros de Monday.com"""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="API Key no configurada")
    
    boards = await monday_service.get_boards()
    return {"boards": boards}


@router.post("/test")
async def test_connection(admin: dict = Depends(get_admin_user)):
    """Probar conexión con Monday.com"""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="API Key no configurada")
    
    try:
        result = await monday_service.test_connection()
        return {
            "success": True,
            "user": result.get("user"),
            "sample_boards": result.get("sample_boards", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/players")
async def sync_players(admin: dict = Depends(get_admin_user)):
    """Sincronizar todos players pendientes"""
    config = await monday_service.get_config()
    if not config.players_board_id:
        raise HTTPException(status_code=400, detail="Board of players no configurado")
    
    result = await monday_service.sync_all_players()
    return {
        "success": result["failed"] == 0,
        "synced_count": result["synced"],
        "failed_count": result["failed"],
        "errors": []
    }


@router.post("/sync/matches/active")
async def sync_active_matches(admin: dict = Depends(get_admin_user)):
    """Sincronizar todos matches active"""
    config = await monday_service.get_config()
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board of matches no configurado")
    
    result = await monday_service.sync_all_active_matches()
    return {
        "success": result["failed"] == 0,
        "synced_count": result["synced"],
        "failed_count": result["failed"],
        "errors": []
    }


@router.post("/sync/match/{partido_id}")
async def sync_single_match(
    partido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Sincronizar a match específico"""
    config = await monday_service.get_config()
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board of matches no configurado")
    
    monday_id = await monday_service.sync_match(partido_id)
    if not monday_id:
        raise HTTPException(status_code=400, detail="Error sincronizando partido")
    
    return {
        "success": True,
        "partido_id": partido_id,
        "monday_item_id": monday_id
    }


@router.post("/sync/results")
async def sync_completed_results(admin: dict = Depends(get_admin_user)):
    """Sincronizar resultados of matches finalizados"""
    config = await monday_service.get_config()
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board of matches no configurado")
    
    # Get finished matches with monday_item_id
    match_repo = MatchRepository()
    matches = await match_repo.get_finished_with_monday_id()
    
    synced = 0
    failed = 0
    
    for match in matches:
        try:
            success = await monday_service.sync_match_result(match["partido_id"])
            if success:
                synced += 1
            else:
                failed += 1
        except Exception:
            failed += 1
    
    return {
        "success": failed == 0,
        "synced_count": synced,
        "failed_count": failed,
        "errors": []
    }


@router.get("/players")
async def get_monday_players(admin: dict = Depends(get_admin_user)):
    """Get jugadores desde Monday.com (para selección en partidos)"""
    config = await monday_service.get_config()
    if not config.players_board_id:
        return {"players": [], "message": "Board of players no configurado en Monday.com"}
    
    if not MONDAY_API_KEY:
        return {"players": [], "message": "API Key de Monday.com no configurada"}
    
    try:
        players = await monday_service.get_players_from_monday()
        return {"players": players}
    except Exception as e:
        return {"players": [], "error": str(e)}


@router.get("/stats")
async def get_sync_stats(admin: dict = Depends(get_admin_user)):
    """Get estadísticas de sincronización"""
    config = await monday_service.get_config()
    
    player_repo = PlayerRepository()
    match_repo = MatchRepository()
    
    # Contar jugadores
    total_players = await player_repo.count({"activo": True})
    synced_players = await player_repo.count({
        "activo": True,
        "monday_item_id": {"$exists": True, "$ne": None}
    })
    
    # Contar partidos
    total_matches = await match_repo.count({})
    synced_matches = await match_repo.count({
        "monday_item_id": {"$exists": True, "$ne": None}
    })
    matches_by_state = await match_repo.count_by_state()
    
    return {
        "players": {
            "total": total_players,
            "synced": synced_players,
            "pending": total_players - synced_players
        },
        "matches": {
            "total": total_matches,
            "synced": synced_matches,
            "pending": total_matches - synced_matches,
            "by_status": matches_by_state
        },
        "config": {
            "players_board_id": config.players_board_id,
            "matches_board_id": config.matches_board_id,
            "tournaments_board_id": config.tournaments_board_id
        }
    }
