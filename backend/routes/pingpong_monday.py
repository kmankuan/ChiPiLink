"""
Ping Pong + Monday.com Integration Routes
Sincroniza jugadores, partidos y resultados con Monday.com
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx
import json
import logging

from core.database import db
from core.auth import get_admin_user
from core.config import MONDAY_API_KEY

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pingpong/monday", tags=["Ping Pong Monday.com Integration"])

# ============== MODELS ==============

class MondayConfig(BaseModel):
    """Configuración de Monday.com para Ping Pong"""
    players_board_id: Optional[str] = None
    matches_board_id: Optional[str] = None
    tournaments_board_id: Optional[str] = None
    auto_sync_players: bool = False
    auto_sync_matches: bool = True
    auto_sync_results: bool = True


class SyncResult(BaseModel):
    """Resultado de sincronización"""
    success: bool
    synced_count: int
    failed_count: int
    errors: List[str] = []
    details: List[Dict] = []


# ============== HELPER FUNCTIONS ==============

async def get_pingpong_monday_config():
    """Obtener configuración de Monday.com para Ping Pong"""
    config = await db.app_config.find_one({"config_key": "pingpong_monday_config"})
    if config:
        return MondayConfig(**config.get("value", {}))
    return MondayConfig()


async def save_pingpong_monday_config(config: MondayConfig):
    """Guardar configuración de Monday.com para Ping Pong"""
    await db.app_config.update_one(
        {"config_key": "pingpong_monday_config"},
        {
            "$set": {
                "config_key": "pingpong_monday_config",
                "value": config.dict(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )


async def monday_graphql_request(query: str) -> Dict:
    """Ejecutar query GraphQL a Monday.com"""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="Monday.com API Key no configurada")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": query},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if response.status_code != 200:
                logger.error(f"Monday.com API error: {response.status_code} - {result}")
                raise HTTPException(status_code=response.status_code, detail=str(result))
            
            if "errors" in result:
                logger.error(f"Monday.com GraphQL errors: {result['errors']}")
                raise HTTPException(status_code=400, detail=result["errors"][0].get("message", "Error de Monday.com"))
            
            return result
        except httpx.RequestError as e:
            logger.error(f"Monday.com request error: {e}")
            raise HTTPException(status_code=500, detail=f"Error de conexión: {str(e)}")


async def create_monday_item(board_id: str, item_name: str, column_values: Dict, group_id: str = None) -> Dict:
    """Crear un ítem en Monday.com"""
    # Escapar comillas dobles en el JSON
    column_values_json = json.dumps(column_values)
    escaped_json = column_values_json.replace('"', '\\"')
    
    group_part = f', group_id: "{group_id}"' if group_id else ""
    
    mutation = f'''
    mutation {{
        create_item (
            board_id: {board_id},
            item_name: "{item_name}"{group_part},
            column_values: "{escaped_json}"
        ) {{
            id
            name
        }}
    }}
    '''
    
    return await monday_graphql_request(mutation)


async def update_monday_item(board_id: str, item_id: str, column_values: Dict) -> Dict:
    """Actualizar un ítem en Monday.com"""
    column_values_json = json.dumps(column_values)
    escaped_json = column_values_json.replace('"', '\\"')
    
    mutation = f'''
    mutation {{
        change_multiple_column_values (
            board_id: {board_id},
            item_id: {item_id},
            column_values: "{escaped_json}"
        ) {{
            id
            name
        }}
    }}
    '''
    
    return await monday_graphql_request(mutation)


async def get_board_columns(board_id: str) -> List[Dict]:
    """Obtener columnas de un board de Monday.com"""
    query = f'''
    query {{
        boards(ids: [{board_id}]) {{
            id
            name
            columns {{
                id
                title
                type
            }}
            groups {{
                id
                title
            }}
        }}
    }}
    '''
    
    result = await monday_graphql_request(query)
    
    if result.get("data", {}).get("boards"):
        return result["data"]["boards"][0]
    return None


# ============== CONFIGURATION ROUTES ==============

@router.get("/config")
async def get_config(admin: dict = Depends(get_admin_user)):
    """Obtener configuración de integración Monday.com para Ping Pong"""
    config = await get_pingpong_monday_config()
    
    # Verificar si hay API key configurada
    has_api_key = bool(MONDAY_API_KEY)
    
    return {
        "has_api_key": has_api_key,
        "config": config.dict()
    }


@router.put("/config")
async def update_config(config: MondayConfig, admin: dict = Depends(get_admin_user)):
    """Actualizar configuración de integración"""
    await save_pingpong_monday_config(config)
    return {"success": True, "message": "Configuración guardada"}


@router.get("/boards")
async def get_available_boards(admin: dict = Depends(get_admin_user)):
    """Obtener lista de tableros disponibles en Monday.com"""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="API Key de Monday.com no configurada")
    
    query = '''
    query {
        boards(limit: 50) {
            id
            name
            items_count
            columns {
                id
                title
                type
            }
            groups {
                id
                title
            }
        }
    }
    '''
    
    result = await monday_graphql_request(query)
    boards = result.get("data", {}).get("boards", [])
    
    return {
        "boards": boards
    }


@router.get("/board/{board_id}/structure")
async def get_board_structure(board_id: str, admin: dict = Depends(get_admin_user)):
    """Obtener estructura detallada de un tablero específico"""
    board = await get_board_columns(board_id)
    
    if not board:
        raise HTTPException(status_code=404, detail="Tablero not found")
    
    return board


# ============== SYNC ROUTES ==============

@router.post("/sync/players")
async def sync_players_to_monday(
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    """Sincronizar todos los jugadores a Monday.com"""
    config = await get_pingpong_monday_config()
    
    if not config.players_board_id:
        raise HTTPException(status_code=400, detail="Board ID de jugadores no configurado")
    
    # Obtener jugadores
    players = await db.pingpong_players.find({"activo": True}, {"_id": 0}).to_list(500)
    
    if not players:
        return SyncResult(success=True, synced_count=0, failed_count=0, details=[])
    
    synced = 0
    failed = 0
    errors = []
    details = []
    
    for player in players:
        try:
            # Verificar si ya está sincronizado
            if player.get("monday_item_id"):
                details.append({
                    "jugador_id": player["jugador_id"],
                    "status": "skipped",
                    "reason": "Ya sincronizado"
                })
                continue
            
            # Preparar datos para Monday.com
            nombre_completo = f"{player.get('nombre', '')} {player.get('apellido', '')}".strip()
            if player.get("apodo"):
                nombre_completo += f" ({player['apodo']})"
            
            column_values = {
                "text": player.get("nombre", ""),  # Nombre
                "text4": player.get("email", ""),  # Email
                "numbers": str(player.get("elo_rating", 1000)),  # ELO
                "status": {"label": player.get("nivel", "principiante")}  # Nivel
            }
            
            # Crear ítem en Monday.com
            result = await create_monday_item(
                board_id=config.players_board_id,
                item_name=nombre_completo,
                column_values=column_values
            )
            
            if result.get("data", {}).get("create_item"):
                monday_item_id = result["data"]["create_item"]["id"]
                
                # Actualizar jugador con el ID de Monday
                await db.pingpong_players.update_one(
                    {"jugador_id": player["jugador_id"]},
                    {"$set": {"monday_item_id": monday_item_id}}
                )
                
                synced += 1
                details.append({
                    "jugador_id": player["jugador_id"],
                    "status": "success",
                    "monday_item_id": monday_item_id
                })
            else:
                failed += 1
                errors.append(f"Error creando jugador {player['jugador_id']}")
                
        except Exception as e:
            failed += 1
            errors.append(f"Error con jugador {player['jugador_id']}: {str(e)}")
            details.append({
                "jugador_id": player["jugador_id"],
                "status": "error",
                "error": str(e)
            })
    
    return SyncResult(
        success=failed == 0,
        synced_count=synced,
        failed_count=failed,
        errors=errors,
        details=details
    )


@router.post("/sync/match/{partido_id}")
async def sync_match_to_monday(
    partido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Sincronizar un partido específico a Monday.com"""
    config = await get_pingpong_monday_config()
    
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board ID de partidos no configurado")
    
    # Obtener partido
    match = await db.pingpong_matches.find_one({"partido_id": partido_id}, {"_id": 0})
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Obtener información de jugadores
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_a_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_b_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1}
    )
    
    nombre_a = player_a.get("apodo") or player_a.get("nombre", "Jugador A") if player_a else "Jugador A"
    nombre_b = player_b.get("apodo") or player_b.get("nombre", "Jugador B") if player_b else "Jugador B"
    
    # Preparar nombre del ítem
    item_name = f"{nombre_a} vs {nombre_b}"
    
    # Mapear estado
    estado_map = {
        "pendiente": "Pendiente",
        "en_curso": "En Curso",
        "pausado": "Pausado",
        "finalizado": "Finalizado",
        "cancelado": "Cancelado"
    }
    
    # Preparar resultado
    resultado = ""
    if match["estado"] == "finalizado":
        resultado = f"{match.get('sets_jugador_a', 0)}-{match.get('sets_jugador_b', 0)}"
    elif match["estado"] == "en_curso":
        resultado = f"{match.get('puntos_jugador_a', 0)}-{match.get('puntos_jugador_b', 0)} (Set {match.get('set_actual', 1)})"
    
    column_values = {
        "text": nombre_a,  # Jugador A
        "text4": nombre_b,  # Jugador B
        "text0": resultado,  # Resultado
        "status": {"label": estado_map.get(match["estado"], "Pendiente")},
        "text6": match.get("mesa", ""),  # Mesa
        "text7": match.get("ronda", "")  # Ronda
    }
    
    try:
        if match.get("monday_item_id"):
            # Actualizar ítem existente
            result = await update_monday_item(
                board_id=config.matches_board_id,
                item_id=match["monday_item_id"],
                column_values=column_values
            )
            action = "updated"
        else:
            # Crear nuevo ítem
            result = await create_monday_item(
                board_id=config.matches_board_id,
                item_name=item_name,
                column_values=column_values
            )
            
            if result.get("data", {}).get("create_item"):
                monday_item_id = result["data"]["create_item"]["id"]
                
                # Guardar el ID de Monday en el partido
                await db.pingpong_matches.update_one(
                    {"partido_id": partido_id},
                    {"$set": {"monday_item_id": monday_item_id}}
                )
            
            action = "created"
        
        return {
            "success": True,
            "action": action,
            "partido_id": partido_id,
            "monday_item_id": match.get("monday_item_id") or result.get("data", {}).get("create_item", {}).get("id")
        }
        
    except Exception as e:
        logger.error(f"Error sincronizando partido {partido_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync/matches/active")
async def sync_active_matches(admin: dict = Depends(get_admin_user)):
    """Sincronizar todos los partidos activos (pendientes y en curso)"""
    config = await get_pingpong_monday_config()
    
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board ID de partidos no configurado")
    
    # Obtener partidos activos
    matches = await db.pingpong_matches.find(
        {"estado": {"$in": ["pendiente", "en_curso", "pausado"]}},
        {"_id": 0}
    ).to_list(100)
    
    synced = 0
    failed = 0
    errors = []
    
    for match in matches:
        try:
            await sync_match_to_monday(match["partido_id"], admin)
            synced += 1
        except Exception as e:
            failed += 1
            errors.append(f"Partido {match['partido_id']}: {str(e)}")
    
    return SyncResult(
        success=failed == 0,
        synced_count=synced,
        failed_count=failed,
        errors=errors
    )


@router.post("/sync/results")
async def sync_completed_matches(admin: dict = Depends(get_admin_user)):
    """Sincronizar resultados de partidos finalizados"""
    config = await get_pingpong_monday_config()
    
    if not config.matches_board_id:
        raise HTTPException(status_code=400, detail="Board ID de partidos no configurado")
    
    # Obtener partidos finalizados que tienen monday_item_id
    matches = await db.pingpong_matches.find(
        {
            "estado": "finalizado",
            "monday_item_id": {"$exists": True, "$ne": None}
        },
        {"_id": 0}
    ).to_list(100)
    
    synced = 0
    failed = 0
    errors = []
    
    for match in matches:
        try:
            # Obtener nombres de jugadores
            player_a = await db.pingpong_players.find_one(
                {"jugador_id": match["jugador_a_id"]},
                {"_id": 0, "nombre": 1, "apodo": 1}
            )
            player_b = await db.pingpong_players.find_one(
                {"jugador_id": match["jugador_b_id"]},
                {"_id": 0, "nombre": 1, "apodo": 1}
            )
            
            nombre_a = player_a.get("apodo") or player_a.get("nombre", "A") if player_a else "A"
            nombre_b = player_b.get("apodo") or player_b.get("nombre", "B") if player_b else "B"
            
            # Determinar ganador
            ganador = ""
            if match.get("ganador_id"):
                if match["ganador_id"] == match["jugador_a_id"]:
                    ganador = nombre_a
                else:
                    ganador = nombre_b
            
            resultado = f"{match.get('sets_jugador_a', 0)}-{match.get('sets_jugador_b', 0)}"
            
            column_values = {
                "text0": resultado,  # Resultado
                "status": {"label": "Finalizado"},
                "text8": ganador  # Ganador
            }
            
            await update_monday_item(
                board_id=config.matches_board_id,
                item_id=match["monday_item_id"],
                column_values=column_values
            )
            
            synced += 1
            
        except Exception as e:
            failed += 1
            errors.append(f"Partido {match['partido_id']}: {str(e)}")
    
    return SyncResult(
        success=failed == 0,
        synced_count=synced,
        failed_count=failed,
        errors=errors
    )


# ============== STATUS AND TEST ==============

@router.get("/status")
async def get_integration_status(admin: dict = Depends(get_admin_user)):
    """Obtener estado de la integración"""
    config = await get_pingpong_monday_config()
    
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
    
    # Verificar conexión
    if MONDAY_API_KEY:
        try:
            query = "query { me { name } }"
            result = await monday_graphql_request(query)
            if result.get("data", {}).get("me"):
                status["connection_status"] = "connected"
                status["monday_user"] = result["data"]["me"]["name"]
            else:
                status["connection_status"] = "error"
        except Exception as e:
            status["connection_status"] = "error"
            status["connection_error"] = str(e)
    else:
        status["connection_status"] = "not_configured"
    
    return status


@router.post("/test")
async def test_monday_connection(admin: dict = Depends(get_admin_user)):
    """Probar conexión con Monday.com"""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="API Key de Monday.com no configurada")
    
    try:
        query = '''
        query {
            me {
                name
                email
            }
            boards(limit: 5) {
                id
                name
            }
        }
        '''
        
        result = await monday_graphql_request(query)
        
        return {
            "success": True,
            "user": result.get("data", {}).get("me"),
            "sample_boards": result.get("data", {}).get("boards", [])
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== STATS ==============

@router.get("/stats")
async def get_sync_stats(admin: dict = Depends(get_admin_user)):
    """Get statistics de sincronización"""
    config = await get_pingpong_monday_config()
    
    # Contar jugadores sincronizados
    total_players = await db.pingpong_players.count_documents({"activo": True})
    synced_players = await db.pingpong_players.count_documents({
        "activo": True,
        "monday_item_id": {"$exists": True, "$ne": None}
    })
    
    # Contar partidos sincronizados
    total_matches = await db.pingpong_matches.count_documents({})
    synced_matches = await db.pingpong_matches.count_documents({
        "monday_item_id": {"$exists": True, "$ne": None}
    })
    
    # Partidos por estado
    matches_by_status = {}
    for estado in ["pendiente", "en_curso", "pausado", "finalizado", "cancelado"]:
        count = await db.pingpong_matches.count_documents({"estado": estado})
        matches_by_status[estado] = count
    
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
            "by_status": matches_by_status
        },
        "config": {
            "players_board_id": config.players_board_id,
            "matches_board_id": config.matches_board_id,
            "tournaments_board_id": config.tournaments_board_id
        }
    }
