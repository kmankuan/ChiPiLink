"""
PinpanClub - Match Service
Business logic for matches
"""
from typing import List, Optional, Dict, Set
from datetime import datetime, timezone
import asyncio

from core.base import BaseService
from core.events import PinpanClubEvents, EventPriority
from ..repositories import MatchRepository, PlayerRepository
from ..models import MatchCreate, Match, MatchState


class MatchService(BaseService):
    """
    Service for match management.
    Contains all business logic related to matches.
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.repository = MatchRepository()
        self.player_repository = PlayerRepository()
        self._websocket_connections: Dict[str, Set] = {}  # match_id -> set of websockets
    
    async def create_match(self, data: MatchCreate) -> Match:
        """
        Create new match.
        Emits event: pinpanclub.match.created
        """
        match_dict = data.model_dump()
        
        # Get player info
        player_a = await self.player_repository.get_by_id(data.player_a_id)
        player_b = await self.player_repository.get_by_id(data.player_b_id)
        
        if player_a:
            match_dict["player_a_info"] = {
                "name": player_a.get("name"),
                "last_name": player_a.get("last_name"),
                "nickname": player_a.get("nickname"),
                "elo_rating": player_a.get("elo_rating")
            }
        
        if player_b:
            match_dict["player_b_info"] = {
                "name": player_b.get("name"),
                "last_name": player_b.get("last_name"),
                "nickname": player_b.get("nickname"),
                "elo_rating": player_b.get("elo_rating")
            }
        
        result = await self.repository.create(match_dict)
        
        # Emit event
        await self.emit_event(
            PinpanClubEvents.MATCH_CREATED,
            {
                "match_id": result["match_id"],
                "player_a_id": data.player_a_id,
                "player_b_id": data.player_b_id,
                "best_of": data.best_of
            }
        )
        
        self.log_info(f"Match created: {result['match_id']}")
        return Match(**result)
    
    async def get_match(self, match_id: str) -> Optional[Match]:
        """Get match by ID"""
        result = await self.repository.get_by_id(match_id)
        return Match(**result) if result else None
    
    async def get_active_matches(self) -> List[Match]:
        """Get active matches"""
        results = await self.repository.get_active_matches()
        return [Match(**r) for r in results]
    
    async def get_matches_by_state(
        self,
        status: MatchState,
        limit: int = 50
    ) -> List[Match]:
        """Get matches by status"""
        results = await self.repository.get_by_state(status.value, limit)
        return [Match(**r) for r in results]
    
    async def start_match(self, match_id: str) -> Optional[Match]:
        """
        Start match.
        Emits event: pinpanclub.match.started
        """
        match = await self.get_match(match_id)
        if not match or match.status != MatchState.PENDING:
            return None
        
        start_date = datetime.now(timezone.utc).isoformat()
        await self.repository.start_match(match_id, start_date)
        
        await self.emit_event(
            PinpanClubEvents.MATCH_STARTED,
            {"match_id": match_id, "start_date": start_date},
            priority=EventPriority.HIGH
        )
        
        return await self.get_match(match_id)
    
    async def update_score(
        self,
        partido_id: str,
        accion: str
    ) -> Optional[Match]:
        """
        Actualizar score dthe match.
        Maneja logic de sets y determina ganador.
        Emite eventos: score_updated, set_completed, match_finished
        """
        match = await self.get_match(partido_id)
        if not match or match.estado not in [MatchState.PENDIENTE, MatchState.EN_CURSO, MatchState.PAUSADO]:
            return None
        
        # If first point, start the match
        if match.estado == MatchState.PENDIENTE:
            await self.start_match(partido_id)
            match = await self.get_match(partido_id)
        
        puntos_a = match.points_player_a
        puntos_b = match.points_player_b
        sets_a = match.sets_jugador_a
        sets_b = match.sets_jugador_b
        set_actual = match.set_actual
        historial = match.historial_sets.copy() if match.historial_sets else []
        
        # Procesar action
        if accion == "punto_a":
            puntos_a += 1
        elif accion == "punto_b":
            puntos_b += 1
        elif accion == "undo":
            # Implementar undo if necessary
            pass
        elif accion == "reset_set":
            puntos_a = 0
            puntos_b = 0
        
        # Verify if set was completed
        puntos_para_ganar = match.puntos_por_set
        set_completado = False
        ganador_set = None
        
        if puntos_a >= puntos_para_ganar or puntos_b >= puntos_para_ganar:
            if abs(puntos_a - puntos_b) >= 2:
                set_completado = True
                if puntos_a > puntos_b:
                    sets_a += 1
                    ganador_set = "a"
                else:
                    sets_b += 1
                    ganador_set = "b"
                
                # Save to history
                historial.append({
                    "set": set_actual,
                    "puntos_a": puntos_a,
                    "puntos_b": puntos_b,
                    "ganador": ganador_set
                })
                
                # Reset points for new set
                puntos_a = 0
                puntos_b = 0
                set_actual += 1
        
        # Update in repository
        await self.repository.update_score(
            partido_id, puntos_a, puntos_b,
            sets_a, sets_b, set_actual, historial
        )
        
        # Emit score updated event
        await self.emit_event(
            PinpanClubEvents.MATCH_SCORE_UPDATED,
            {
                "partido_id": partido_id,
                "puntos_a": puntos_a,
                "puntos_b": puntos_b,
                "sets_a": sets_a,
                "sets_b": sets_b,
                "set_actual": set_actual
            },
            priority=EventPriority.HIGH
        )
        
        # Si se completed set, emitir evento
        if set_completado:
            await self.emit_event(
                PinpanClubEvents.MATCH_SET_COMPLETED,
                {
                    "partido_id": partido_id,
                    "set_number": set_actual - 1,
                    "ganador_set": ganador_set,
                    "sets_a": sets_a,
                    "sets_b": sets_b
                }
            )
        
        # Verify si ended the match
        sets_para_ganar = (match.mejor_de // 2) + 1
        if sets_a >= sets_para_ganar or sets_b >= sets_para_ganar:
            winner_id = match.player_a_id if sets_a > sets_b else match.player_b_id
            await self._finish_match(partido_id, winner_id, match)
        
        # Notify WebSockets
        await self._broadcast_to_match(partido_id)
        
        return await self.get_match(partido_id)
    
    async def _finish_match(
        self,
        partido_id: str,
        winner_id: str,
        match: Match
    ) -> None:
        """Finalizar partido y actualizar ELOs"""
        fecha_fin = datetime.now(timezone.utc).isoformat()
        await self.repository.finish_match(partido_id, winner_id, fecha_fin)
        
        # Emit match finished event
        await self.emit_event(
            PinpanClubEvents.MATCH_FINISHED,
            {
                "partido_id": partido_id,
                "winner_id": winner_id,
                "fecha_fin": fecha_fin,
                "player_a_id": match.player_a_id,
                "player_b_id": match.player_b_id
            },
            priority=EventPriority.CRITICAL
        )
        
        self.log_info(f"Match finished: {partido_id}, winner: {winner_id}")
    
    async def cancel_match(self, partido_id: str) -> bool:
        """
        Cancelar partido.
        Emite evento: pinpanclub.match.cancelled
        """
        success = await self.repository.cancel_match(partido_id)
        
        if success:
            await self.emit_event(
                PinpanClubEvents.MATCH_CANCELLED,
                {"partido_id": partido_id}
            )
        
        return success
    
    # WebSocket management
    def register_websocket(self, partido_id: str, websocket) -> None:
        """Register connection WebSocket para un partido"""
        if partido_id not in self._websocket_connections:
            self._websocket_connections[partido_id] = set()
        self._websocket_connections[partido_id].add(websocket)
    
    def unregister_websocket(self, partido_id: str, websocket) -> None:
        """Desregistrar connection WebSocket"""
        if partido_id in self._websocket_connections:
            self._websocket_connections[partido_id].discard(websocket)
    
    async def _broadcast_to_match(self, partido_id: str) -> None:
        """Send update a todos los WebSockets de un partido"""
        if partido_id not in self._websocket_connections:
            return
        
        match = await self.get_match(partido_id)
        if not match:
            return
        
        message = match.model_dump()
        dead_connections = set()
        
        for ws in self._websocket_connections[partido_id]:
            try:
                await ws.send_json(message)
            except Exception:
                dead_connections.add(ws)
        
        # Clean connections muertas
        for ws in dead_connections:
            self._websocket_connections[partido_id].discard(ws)
    
    async def get_stats(self) -> Dict:
        """Get statistics de partidos"""
        by_state = await self.repository.count_by_state()
        total = sum(by_state.values())
        
        return {
            "total": total,
            "by_state": by_state,
            "active_websockets": sum(
                len(conns) for conns in self._websocket_connections.values()
            )
        }


# Service singleton instance
match_service = MatchService()
