"""
Ping Pong WebSocket Module - Real-time synchronization for live scoreboards
Provides instant updates to all connected TVs, spectators, and mobile devices
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, List, Set, Optional
from datetime import datetime, timezone
import json
import asyncio
import uuid
import logging

logger = logging.getLogger(__name__)

# Router
pingpong_ws_router = APIRouter(prefix="/pingpong/ws", tags=["Ping Pong WebSocket"])

# ============== CONNECTION MANAGER ==============

class ConnectionManager:
    """Manages WebSocket connections for real-time updates"""
    
    def __init__(self):
        # All active connections
        self.active_connections: Dict[str, WebSocket] = {}
        # Connections grouped by match (for targeted broadcasts)
        self.match_connections: Dict[str, Set[str]] = {}
        # Connections for global updates (all matches)
        self.global_connections: Set[str] = set()
        # Connection metadata
        self.connection_info: Dict[str, dict] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, client_type: str = "spectator", match_id: str = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.connection_info[client_id] = {
            "type": client_type,  # spectator, arbiter, tv, admin
            "match_id": match_id,
            "connected_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Add to appropriate group
        if match_id:
            if match_id not in self.match_connections:
                self.match_connections[match_id] = set()
            self.match_connections[match_id].add(client_id)
        else:
            self.global_connections.add(client_id)
        
        logger.info(f"WebSocket connected: {client_id} ({client_type}) - Match: {match_id or 'global'}")
        
        # Send connection confirmation
        await self.send_personal(client_id, {
            "type": "connected",
            "client_id": client_id,
            "client_type": client_type,
            "match_id": match_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    
    def disconnect(self, client_id: str):
        """Remove a disconnected client"""
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        info = self.connection_info.get(client_id, {})
        match_id = info.get("match_id")
        
        if match_id and match_id in self.match_connections:
            self.match_connections[match_id].discard(client_id)
            if not self.match_connections[match_id]:
                del self.match_connections[match_id]
        
        self.global_connections.discard(client_id)
        
        if client_id in self.connection_info:
            del self.connection_info[client_id]
        
        logger.info(f"WebSocket disconnected: {client_id}")
    
    async def send_personal(self, client_id: str, message: dict):
        """Send message to specific client"""
        if client_id in self.active_connections:
            try:
                await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Error sending to {client_id}: {e}")
                self.disconnect(client_id)
    
    async def broadcast_to_match(self, match_id: str, message: dict):
        """Broadcast message to all clients watching a specific match"""
        if match_id in self.match_connections:
            disconnected = []
            for client_id in self.match_connections[match_id]:
                try:
                    if client_id in self.active_connections:
                        await self.active_connections[client_id].send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting to {client_id}: {e}")
                    disconnected.append(client_id)
            
            # Clean up disconnected clients
            for client_id in disconnected:
                self.disconnect(client_id)
        
        # Also send to global watchers
        await self.broadcast_global(message)
    
    async def broadcast_global(self, message: dict):
        """Broadcast message to all global watchers"""
        disconnected = []
        for client_id in self.global_connections:
            try:
                if client_id in self.active_connections:
                    await self.active_connections[client_id].send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)
    
    async def broadcast_all(self, message: dict):
        """Broadcast to absolutely all connected clients"""
        disconnected = []
        for client_id, websocket in self.active_connections.items():
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {client_id}: {e}")
                disconnected.append(client_id)
        
        for client_id in disconnected:
            self.disconnect(client_id)
    
    def get_stats(self) -> dict:
        """Get connection statistics"""
        return {
            "total_connections": len(self.active_connections),
            "global_watchers": len(self.global_connections),
            "matches_being_watched": len(self.match_connections),
            "connections_by_match": {k: len(v) for k, v in self.match_connections.items()},
            "connections_by_type": self._count_by_type()
        }
    
    def _count_by_type(self) -> dict:
        counts = {"spectator": 0, "arbiter": 0, "tv": 0, "admin": 0}
        for info in self.connection_info.values():
            t = info.get("type", "spectator")
            counts[t] = counts.get(t, 0) + 1
        return counts


# Global connection manager instance
manager = ConnectionManager()


# ============== WEBSOCKET ENDPOINTS ==============

@pingpong_ws_router.websocket("/live")
async def websocket_live(websocket: WebSocket):
    """
    Main WebSocket endpoint for live updates
    Query params:
    - match_id: specific match to watch (optional, omit for all matches)
    - type: client type (spectator, arbiter, tv, admin)
    """
    # Get query parameters
    match_id = websocket.query_params.get("match_id")
    client_type = websocket.query_params.get("type", "spectator")
    client_id = f"{client_type}_{uuid.uuid4().hex[:8]}"
    
    await manager.connect(websocket, client_id, client_type, match_id)
    
    try:
        # Send initial state if watching specific match
        if match_id:
            await send_match_state(client_id, match_id)
        else:
            await send_all_active_matches(client_id)
        
        # Keep connection alive and handle messages
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30)
                await handle_client_message(client_id, data)
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await manager.send_personal(client_id, {"type": "ping", "timestamp": datetime.now(timezone.utc).isoformat()})
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)


@pingpong_ws_router.websocket("/arbiter/{match_id}")
async def websocket_arbiter(websocket: WebSocket, match_id: str):
    """
    WebSocket endpoint specifically for arbiters
    Allows sending score updates that broadcast to all viewers
    """
    client_id = f"arbiter_{uuid.uuid4().hex[:8]}"
    
    await manager.connect(websocket, client_id, "arbiter", match_id)
    
    try:
        # Send current match state
        await send_match_state(client_id, match_id)
        
        while True:
            data = await websocket.receive_json()
            
            # Handle arbiter commands
            if data.get("action") == "point":
                await handle_point(match_id, data, client_id)
            elif data.get("action") == "undo":
                await handle_undo(match_id, client_id)
            elif data.get("action") == "start":
                await handle_start_match(match_id, client_id)
            elif data.get("action") == "pause":
                await handle_pause_match(match_id, client_id)
            elif data.get("action") == "timeout":
                await handle_timeout(match_id, data, client_id)
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"Arbiter WebSocket error: {e}")
        manager.disconnect(client_id)


# ============== HELPER FUNCTIONS ==============

async def send_match_state(client_id: str, match_id: str):
    """Send current match state to a client"""
    from main import db
    
    match = await db.pingpong_matches.find_one(
        {"partido_id": match_id},
        {"_id": 0, "historial_puntos": 0}
    )
    
    if match:
        # Get player info
        player_a = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_a_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
        )
        player_b = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_b_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
        )
        
        match["jugador_a_info"] = player_a
        match["jugador_b_info"] = player_b
        
        await manager.send_personal(client_id, {
            "type": "match_state",
            "match": match,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })


async def send_all_active_matches(client_id: str):
    """Send all active matches to a client"""
    from main import db
    
    matches = await db.pingpong_matches.find(
        {"estado": {"$in": ["en_curso", "pendiente"]}},
        {"_id": 0, "historial_puntos": 0}
    ).to_list(50)
    
    for match in matches:
        player_a = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_a_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        player_b = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_b_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        match["jugador_a_info"] = player_a
        match["jugador_b_info"] = player_b
    
    await manager.send_personal(client_id, {
        "type": "active_matches",
        "matches": matches,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def handle_client_message(client_id: str, data: dict):
    """Handle messages from clients"""
    msg_type = data.get("type")
    
    if msg_type == "pong":
        # Client responding to ping
        pass
    elif msg_type == "subscribe_match":
        # Client wants to watch a specific match
        match_id = data.get("match_id")
        if match_id:
            info = manager.connection_info.get(client_id, {})
            old_match = info.get("match_id")
            
            # Remove from old match group
            if old_match and old_match in manager.match_connections:
                manager.match_connections[old_match].discard(client_id)
            
            # Add to new match group
            if match_id not in manager.match_connections:
                manager.match_connections[match_id] = set()
            manager.match_connections[match_id].add(client_id)
            manager.connection_info[client_id]["match_id"] = match_id
            
            await send_match_state(client_id, match_id)


async def handle_point(match_id: str, data: dict, arbiter_id: str):
    """Handle point scored by arbiter"""
    from main import db
    from routes.pingpong import calcular_sets_necesarios, calcular_estadisticas_partido
    
    jugador = data.get("jugador")  # "a" or "b"
    tipo_punto = data.get("tipo", "normal")
    
    if jugador not in ["a", "b"]:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "Jugador inválido"})
        return
    
    match = await db.pingpong_matches.find_one({"partido_id": match_id})
    if not match:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "Partido no encontrado"})
        return
    
    if match["estado"] != "en_curso":
        await manager.send_personal(arbiter_id, {"type": "error", "message": "El partido no está en curso"})
        return
    
    # Update points
    puntos_a = match["puntos_jugador_a"]
    puntos_b = match["puntos_jugador_b"]
    
    if jugador == "a":
        puntos_a += 1
    else:
        puntos_b += 1
    
    # Record in history
    punto_registro = {
        "tiempo": datetime.now(timezone.utc).isoformat(),
        "set": match["set_actual"],
        "punto_a": puntos_a,
        "punto_b": puntos_b,
        "anotador": jugador,
        "tipo": tipo_punto,
        "saque": match["saque"]
    }
    
    # Check if set is won
    puntos_para_ganar = match["puntos_por_set"]
    diferencia_minima = match["diferencia_minima"]
    sets_para_ganar = calcular_sets_necesarios(match["tipo_partido"])
    
    set_ganado = False
    ganador_set = None
    partido_terminado = False
    ganador_partido = None
    
    if puntos_a >= puntos_para_ganar or puntos_b >= puntos_para_ganar:
        diferencia = abs(puntos_a - puntos_b)
        if diferencia >= diferencia_minima:
            set_ganado = True
            ganador_set = "a" if puntos_a > puntos_b else "b"
    
    sets_a = match["sets_jugador_a"]
    sets_b = match["sets_jugador_b"]
    set_actual = match["set_actual"]
    sets_detalle = match.get("sets_detalle", [])
    
    if set_ganado:
        sets_detalle.append({
            "set": set_actual,
            "puntos_a": puntos_a,
            "puntos_b": puntos_b,
            "ganador": ganador_set
        })
        
        if ganador_set == "a":
            sets_a += 1
        else:
            sets_b += 1
        
        if sets_a >= sets_para_ganar:
            partido_terminado = True
            ganador_partido = "a"
        elif sets_b >= sets_para_ganar:
            partido_terminado = True
            ganador_partido = "b"
        else:
            set_actual += 1
            puntos_a = 0
            puntos_b = 0
    
    # Calculate serve change
    total_puntos_set = puntos_a + puntos_b
    cambio_saque_cada = 2
    if puntos_a >= 10 and puntos_b >= 10:
        cambio_saque_cada = 1
    
    if match["primer_saque"] == "a":
        saque = "a" if (total_puntos_set // cambio_saque_cada) % 2 == 0 else "b"
    else:
        saque = "b" if (total_puntos_set // cambio_saque_cada) % 2 == 0 else "a"
    
    # Prepare update
    update_data = {
        "puntos_jugador_a": puntos_a,
        "puntos_jugador_b": puntos_b,
        "sets_jugador_a": sets_a,
        "sets_jugador_b": sets_b,
        "set_actual": set_actual,
        "sets_detalle": sets_detalle,
        "saque": saque
    }
    
    if partido_terminado:
        ganador_id = match["jugador_a_id"] if ganador_partido == "a" else match["jugador_b_id"]
        update_data["estado"] = "finalizado"
        update_data["fecha_fin"] = datetime.now(timezone.utc)
        update_data["ganador_id"] = ganador_id
        
        if match.get("fecha_inicio"):
            duracion = (datetime.now(timezone.utc) - match["fecha_inicio"]).total_seconds()
            update_data["duracion_segundos"] = int(duracion)
    
    # Update database
    await db.pingpong_matches.update_one(
        {"partido_id": match_id},
        {
            "$set": update_data,
            "$push": {"historial_puntos": punto_registro}
        }
    )
    
    # Get updated match with player info
    updated_match = await db.pingpong_matches.find_one({"partido_id": match_id}, {"_id": 0, "historial_puntos": 0})
    
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_a_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_b_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
    )
    
    updated_match["jugador_a_info"] = player_a
    updated_match["jugador_b_info"] = player_b
    
    # Determine special situations
    situacion = []
    puntos_para_set = match["puntos_por_set"]
    
    if puntos_a >= puntos_para_set - 1 and puntos_a > puntos_b:
        if sets_a == sets_para_ganar - 1:
            situacion.append({"tipo": "match_point", "jugador": "a"})
        else:
            situacion.append({"tipo": "set_point", "jugador": "a"})
    
    if puntos_b >= puntos_para_set - 1 and puntos_b > puntos_a:
        if sets_b == sets_para_ganar - 1:
            situacion.append({"tipo": "match_point", "jugador": "b"})
        else:
            situacion.append({"tipo": "set_point", "jugador": "b"})
    
    if puntos_a >= puntos_para_set - 1 and puntos_b >= puntos_para_set - 1 and puntos_a == puntos_b:
        situacion.append({"tipo": "deuce"})
    
    # Broadcast update to all viewers
    broadcast_msg = {
        "type": "point_scored",
        "match": updated_match,
        "point": {
            "jugador": jugador,
            "tipo": tipo_punto,
            "puntos_a": puntos_a,
            "puntos_b": puntos_b
        },
        "set_ganado": set_ganado,
        "ganador_set": ganador_set,
        "partido_terminado": partido_terminado,
        "ganador_partido": ganador_partido,
        "situacion": situacion,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    await manager.broadcast_to_match(match_id, broadcast_msg)


async def handle_undo(match_id: str, arbiter_id: str):
    """Handle undo last point"""
    from main import db
    
    match = await db.pingpong_matches.find_one({"partido_id": match_id})
    if not match:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "Partido no encontrado"})
        return
    
    historial = match.get("historial_puntos", [])
    if not historial:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "No hay puntos para deshacer"})
        return
    
    ultimo_punto = historial.pop()
    
    puntos_a = ultimo_punto["punto_a"] - (1 if ultimo_punto["anotador"] == "a" else 0)
    puntos_b = ultimo_punto["punto_b"] - (1 if ultimo_punto["anotador"] == "b" else 0)
    
    update_data = {
        "puntos_jugador_a": puntos_a,
        "puntos_jugador_b": puntos_b,
        "historial_puntos": historial,
        "saque": ultimo_punto["saque"]
    }
    
    await db.pingpong_matches.update_one(
        {"partido_id": match_id},
        {"$set": update_data}
    )
    
    # Get updated match
    updated_match = await db.pingpong_matches.find_one({"partido_id": match_id}, {"_id": 0, "historial_puntos": 0})
    
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_a_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_b_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
    )
    
    updated_match["jugador_a_info"] = player_a
    updated_match["jugador_b_info"] = player_b
    
    await manager.broadcast_to_match(match_id, {
        "type": "point_undone",
        "match": updated_match,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def handle_start_match(match_id: str, arbiter_id: str):
    """Handle match start"""
    from main import db
    
    result = await db.pingpong_matches.update_one(
        {"partido_id": match_id, "estado": {"$in": ["pendiente", "pausado"]}},
        {"$set": {"estado": "en_curso", "fecha_inicio": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "No se puede iniciar el partido"})
        return
    
    updated_match = await db.pingpong_matches.find_one({"partido_id": match_id}, {"_id": 0, "historial_puntos": 0})
    
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_a_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": updated_match["jugador_b_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
    )
    
    updated_match["jugador_a_info"] = player_a
    updated_match["jugador_b_info"] = player_b
    
    await manager.broadcast_to_match(match_id, {
        "type": "match_started",
        "match": updated_match,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def handle_pause_match(match_id: str, arbiter_id: str):
    """Handle match pause"""
    from main import db
    
    result = await db.pingpong_matches.update_one(
        {"partido_id": match_id, "estado": "en_curso"},
        {"$set": {"estado": "pausado"}}
    )
    
    if result.modified_count == 0:
        await manager.send_personal(arbiter_id, {"type": "error", "message": "No se puede pausar el partido"})
        return
    
    await manager.broadcast_to_match(match_id, {
        "type": "match_paused",
        "match_id": match_id,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


async def handle_timeout(match_id: str, data: dict, arbiter_id: str):
    """Handle timeout request"""
    jugador = data.get("jugador")
    duracion = data.get("duracion", 60)
    
    await manager.broadcast_to_match(match_id, {
        "type": "timeout",
        "match_id": match_id,
        "jugador": jugador,
        "duracion": duracion,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


# ============== REST ENDPOINTS FOR WEBSOCKET MANAGEMENT ==============

@pingpong_ws_router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket connection statistics"""
    return manager.get_stats()


@pingpong_ws_router.post("/broadcast")
async def broadcast_message(message: dict):
    """Broadcast a message to all connected clients (admin only)"""
    await manager.broadcast_all(message)
    return {"success": True, "message": "Broadcast sent"}
