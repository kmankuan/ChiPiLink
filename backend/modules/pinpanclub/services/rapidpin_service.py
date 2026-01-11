"""
Rapid Pin - Service Layer
Lógica de negocio para el sistema de partidos espontáneos
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from core.database import get_database
from ..repositories.rapidpin_repository import (
    RapidPinSeasonRepository,
    RapidPinMatchRepository,
    RapidPinRankingRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.rapidpin import (
    RapidPinSeason, RapidPinSeasonCreate, RapidPinSeasonUpdate,
    RapidPinMatch, RapidPinMatchCreate,
    RapidPinRankingEntry, RapidPinRankingTable,
    RapidPinSeasonResult, RapidPinSeasonFinalResults,
    RapidPinMatchStatus, RapidPinSeasonStatus,
    RAPID_PIN_SCORING,
    get_default_player_prizes, get_default_referee_prizes
)


class RapidPinService(BaseService):
    """
    Servicio principal para Rapid Pin.
    Sistema de partidos espontáneos: 2 jugadores + 1 árbitro
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.season_repo = RapidPinSeasonRepository()
        self.match_repo = RapidPinMatchRepository()
        self.ranking_repo = RapidPinRankingRepository()
        self.player_repo = PlayerRepository()
    
    async def get_db(self):
        """Obtener conexión a la base de datos"""
        return get_database()
    
    # ============== SEASON MANAGEMENT ==============
    
    async def create_season(self, data: RapidPinSeasonCreate) -> RapidPinSeason:
        """Crear nueva temporada Rapid Pin"""
        season_dict = data.model_dump()
        
        # Establecer premios por defecto si no se proporcionan
        if not season_dict.get("player_prizes"):
            season_dict["player_prizes"] = [p.model_dump() for p in get_default_player_prizes()]
        else:
            season_dict["player_prizes"] = [
                p.model_dump() if hasattr(p, 'model_dump') else p 
                for p in season_dict["player_prizes"]
            ]
        
        if not season_dict.get("referee_prizes"):
            season_dict["referee_prizes"] = [p.model_dump() for p in get_default_referee_prizes()]
        else:
            season_dict["referee_prizes"] = [
                p.model_dump() if hasattr(p, 'model_dump') else p 
                for p in season_dict["referee_prizes"]
            ]
        
        season_dict["estado"] = RapidPinSeasonStatus.ACTIVE
        season_dict["total_matches"] = 0
        season_dict["total_players"] = 0
        season_dict["total_referees"] = 0
        
        result = await self.season_repo.create(season_dict)
        self.log_info(f"Rapid Pin season created: {result['season_id']}")
        
        return RapidPinSeason(**result)
    
    async def get_season(self, season_id: str) -> Optional[RapidPinSeason]:
        """Obtener temporada por ID"""
        result = await self.season_repo.get_by_id(season_id)
        return RapidPinSeason(**result) if result else None
    
    async def get_active_seasons(self) -> List[RapidPinSeason]:
        """Obtener temporadas activas"""
        results = await self.season_repo.get_active_seasons()
        return [RapidPinSeason(**r) for r in results]
    
    async def get_all_seasons(self) -> List[RapidPinSeason]:
        """Obtener todas las temporadas"""
        results = await self.season_repo.get_all_seasons()
        return [RapidPinSeason(**r) for r in results]
    
    async def update_season(
        self,
        season_id: str,
        data: RapidPinSeasonUpdate
    ) -> Optional[RapidPinSeason]:
        """Actualizar temporada"""
        update_data = data.model_dump(exclude_unset=True)
        
        # Convertir premios a dict si es necesario
        if "player_prizes" in update_data and update_data["player_prizes"]:
            update_data["player_prizes"] = [
                p.model_dump() if hasattr(p, 'model_dump') else p 
                for p in update_data["player_prizes"]
            ]
        if "referee_prizes" in update_data and update_data["referee_prizes"]:
            update_data["referee_prizes"] = [
                p.model_dump() if hasattr(p, 'model_dump') else p 
                for p in update_data["referee_prizes"]
            ]
        
        if not update_data:
            return await self.get_season(season_id)
        
        success = await self.season_repo.update(season_id, update_data)
        
        if success:
            return await self.get_season(season_id)
        return None
    
    async def close_season(self, season_id: str) -> RapidPinSeasonFinalResults:
        """Cerrar temporada y calcular resultados finales"""
        season = await self.get_season(season_id)
        if not season:
            raise ValueError("Temporada no encontrada")
        
        if season.estado != RapidPinSeasonStatus.ACTIVE:
            raise ValueError("La temporada ya está cerrada")
        
        # Obtener rankings finales
        player_ranking = await self.ranking_repo.get_season_ranking(season_id)
        referee_ranking = await self.ranking_repo.get_referee_ranking(season_id)
        
        # Preparar resultados de jugadores
        player_results = []
        for idx, entry in enumerate(player_ranking, start=1):
            # Buscar premio correspondiente
            prize = None
            for p in season.player_prizes:
                if p.position == idx:
                    prize = p
                    break
                elif p.special_type == "participation" and not prize:
                    prize = p  # Premio de participación como fallback
            
            player_results.append(RapidPinSeasonResult(
                jugador_id=entry["jugador_id"],
                jugador_info=entry.get("jugador_info"),
                posicion_final=idx,
                puntos_finales=entry["puntos_totales"],
                role="player",
                prize=prize
            ))
        
        # Preparar resultados de árbitros
        referee_results = []
        for idx, entry in enumerate(referee_ranking, start=1):
            prize = None
            for p in season.referee_prizes:
                if p.position == idx:
                    prize = p
                    break
                elif p.special_type == "participation" and not prize:
                    prize = p
            
            referee_results.append(RapidPinSeasonResult(
                jugador_id=entry["jugador_id"],
                jugador_info=entry.get("jugador_info"),
                posicion_final=idx,
                puntos_finales=entry["partidos_arbitrados"],
                role="referee",
                prize=prize
            ))
        
        # Guardar resultados y cerrar temporada
        final_results = RapidPinSeasonFinalResults(
            season_id=season_id,
            season_nombre=season.nombre,
            fecha_cierre=datetime.now(timezone.utc).isoformat(),
            player_results=player_results,
            referee_results=referee_results,
            total_matches=season.total_matches
        )
        
        await self.season_repo.close_season(
            season_id, 
            final_results.model_dump()
        )
        
        self.log_info(f"Rapid Pin season closed: {season_id}")
        
        return final_results
    
    # ============== MATCH MANAGEMENT ==============
    
    async def register_match(self, data: RapidPinMatchCreate) -> RapidPinMatch:
        """Registrar un nuevo partido Rapid Pin"""
        # Validaciones
        season = await self.get_season(data.season_id)
        if not season:
            raise ValueError("Temporada no encontrada")
        
        if season.estado != RapidPinSeasonStatus.ACTIVE:
            raise ValueError("La temporada no está activa")
        
        # Validar que los 3 participantes son diferentes
        participants = {data.jugador_a_id, data.jugador_b_id, data.arbitro_id}
        if len(participants) != 3:
            raise ValueError("Los 3 participantes deben ser personas diferentes")
        
        # Validar que el ganador es uno de los jugadores
        if data.ganador_id not in [data.jugador_a_id, data.jugador_b_id]:
            raise ValueError("El ganador debe ser uno de los jugadores")
        
        # Validar que quien registra es uno de los participantes
        if data.registrado_por_id not in participants:
            raise ValueError("Solo un participante puede registrar el partido")
        
        # Obtener info de jugadores
        jugador_a = await self.player_repo.get_by_id(data.jugador_a_id)
        jugador_b = await self.player_repo.get_by_id(data.jugador_b_id)
        arbitro = await self.player_repo.get_by_id(data.arbitro_id)
        
        # Determinar perdedor
        perdedor_id = data.jugador_b_id if data.ganador_id == data.jugador_a_id else data.jugador_a_id
        
        match_dict = data.model_dump()
        match_dict["perdedor_id"] = perdedor_id
        match_dict["estado"] = RapidPinMatchStatus.PENDING
        match_dict["fecha_partido"] = datetime.now(timezone.utc).isoformat()
        match_dict["jugador_a_info"] = {
            "nombre": jugador_a.get("nombre") if jugador_a else "Desconocido",
            "apodo": jugador_a.get("apodo") if jugador_a else None
        }
        match_dict["jugador_b_info"] = {
            "nombre": jugador_b.get("nombre") if jugador_b else "Desconocido",
            "apodo": jugador_b.get("apodo") if jugador_b else None
        }
        match_dict["arbitro_info"] = {
            "nombre": arbitro.get("nombre") if arbitro else "Desconocido",
            "apodo": arbitro.get("apodo") if arbitro else None
        }
        
        # Puntos (se aplicarán cuando se confirme)
        match_dict["puntos_ganador"] = 0
        match_dict["puntos_perdedor"] = 0
        match_dict["puntos_arbitro"] = 0
        
        result = await self.match_repo.create(match_dict)
        
        self.log_info(f"Rapid Pin match registered: {result['match_id']} (pending confirmation)")
        
        return RapidPinMatch(**result)
    
    async def confirm_match(
        self,
        match_id: str,
        confirmado_por_id: str
    ) -> RapidPinMatch:
        """Confirmar un partido pendiente"""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise ValueError("Partido no encontrado")
        
        if match["estado"] != RapidPinMatchStatus.PENDING:
            raise ValueError("El partido ya fue procesado")
        
        # Validar que quien confirma es un participante diferente al que registró
        participants = {match["jugador_a_id"], match["jugador_b_id"], match["arbitro_id"]}
        if confirmado_por_id not in participants:
            raise ValueError("Solo un participante puede confirmar el partido")
        
        if confirmado_por_id == match["registrado_por_id"]:
            raise ValueError("No puedes confirmar un partido que tú registraste")
        
        # Confirmar el partido
        success = await self.match_repo.confirm_match(match_id, confirmado_por_id)
        if not success:
            raise ValueError("Error al confirmar el partido")
        
        # Aplicar puntos
        await self._apply_match_points(match)
        
        # Actualizar partido con los puntos
        await self.match_repo.update(match_id, {
            "puntos_ganador": RAPID_PIN_SCORING["victory"],
            "puntos_perdedor": RAPID_PIN_SCORING["defeat"],
            "puntos_arbitro": RAPID_PIN_SCORING["referee"]
        })
        
        # Incrementar contador de partidos de la temporada
        await self.season_repo.increment_stats(match["season_id"], matches=1)
        
        # Recalcular posiciones
        await self.ranking_repo.recalculate_positions(match["season_id"])
        
        self.log_info(f"Rapid Pin match confirmed: {match_id}")
        
        # Retornar partido actualizado
        updated_match = await self.match_repo.get_by_id(match_id)
        return RapidPinMatch(**updated_match)
    
    async def _apply_match_points(self, match: Dict):
        """Aplicar puntos después de confirmar un partido"""
        season_id = match["season_id"]
        ganador_id = match["ganador_id"]
        perdedor_id = match["perdedor_id"]
        arbitro_id = match["arbitro_id"]
        
        # Asegurar que existen entradas de ranking para los 3 participantes
        ganador_ranking = await self.ranking_repo.get_or_create(
            season_id, ganador_id, match.get("jugador_a_info") if ganador_id == match["jugador_a_id"] else match.get("jugador_b_info")
        )
        perdedor_ranking = await self.ranking_repo.get_or_create(
            season_id, perdedor_id, match.get("jugador_b_info") if perdedor_id == match["jugador_b_id"] else match.get("jugador_a_info")
        )
        arbitro_ranking = await self.ranking_repo.get_or_create(
            season_id, arbitro_id, match.get("arbitro_info")
        )
        
        # Actualizar estadísticas del ganador
        await self.ranking_repo.update_player_stats(
            ganador_ranking["ranking_id"],
            is_winner=True,
            points=RAPID_PIN_SCORING["victory"]
        )
        
        # Actualizar estadísticas del perdedor
        await self.ranking_repo.update_player_stats(
            perdedor_ranking["ranking_id"],
            is_winner=False,
            points=RAPID_PIN_SCORING["defeat"]
        )
        
        # Actualizar estadísticas del árbitro
        await self.ranking_repo.update_referee_stats(
            arbitro_ranking["ranking_id"],
            points=RAPID_PIN_SCORING["referee"]
        )
        
        # Actualizar contadores de participantes únicos en la temporada
        counts = await self.ranking_repo.get_season_participants_count(season_id)
        season = await self.season_repo.get_by_id(season_id)
        if season:
            await self.season_repo.update(season_id, {
                "total_players": counts["players"],
                "total_referees": counts["referees"]
            })
    
    async def get_match(self, match_id: str) -> Optional[RapidPinMatch]:
        """Obtener partido por ID"""
        result = await self.match_repo.get_by_id(match_id)
        return RapidPinMatch(**result) if result else None
    
    async def get_season_matches(
        self,
        season_id: str,
        estado: Optional[str] = None,
        limit: int = 50
    ) -> List[RapidPinMatch]:
        """Obtener partidos de una temporada"""
        results = await self.match_repo.get_season_matches(season_id, estado, limit)
        return [RapidPinMatch(**r) for r in results]
    
    async def get_pending_confirmations(
        self,
        season_id: str,
        user_id: str
    ) -> List[RapidPinMatch]:
        """Obtener partidos pendientes de confirmación para un usuario"""
        results = await self.match_repo.get_pending_matches_for_user(season_id, user_id)
        return [RapidPinMatch(**r) for r in results]
    
    async def get_all_pending_confirmations(self, user_id: str) -> List[RapidPinMatch]:
        """Obtener TODOS los partidos pendientes de confirmación para un usuario (todas las temporadas)"""
        results = await self.match_repo.get_all_pending_matches_for_user(user_id)
        return [RapidPinMatch(**r) for r in results]
    
    # ============== RANKING ==============
    
    async def get_ranking(self, season_id: str) -> RapidPinRankingTable:
        """Obtener tabla de ranking completa"""
        season = await self.get_season(season_id)
        if not season:
            raise ValueError("Temporada no encontrada")
        
        entries = await self.ranking_repo.get_season_ranking(season_id)
        
        return RapidPinRankingTable(
            season_id=season_id,
            season_nombre=season.nombre,
            estado=season.estado,
            fecha_fin=season.fecha_fin,
            total_participantes=len(entries),
            total_partidos=season.total_matches,
            entries=[RapidPinRankingEntry(**e) for e in entries],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    
    async def get_referee_ranking(self, season_id: str) -> List[RapidPinRankingEntry]:
        """Obtener ranking de árbitros"""
        results = await self.ranking_repo.get_referee_ranking(season_id)
        return [RapidPinRankingEntry(**r) for r in results]
    
    async def get_player_stats(
        self,
        season_id: str,
        jugador_id: str
    ) -> Optional[Dict]:
        """Obtener estadísticas de un jugador en una temporada"""
        ranking = await self.ranking_repo.get_player_ranking(season_id, jugador_id)
        if not ranking:
            return None
        
        # Obtener historial de partidos
        matches = await self.match_repo.get_player_matches(season_id, jugador_id)
        
        return {
            "ranking": RapidPinRankingEntry(**ranking),
            "recent_matches": [RapidPinMatch(**m) for m in matches]
        }
    
    # ============== CHALLENGE & QUEUE SYSTEM ==============
    
    def _get_player_info(self, player_data: Optional[Dict]) -> Optional[Dict]:
        """Extraer info relevante del jugador"""
        if not player_data:
            return None
        return {
            "player_id": player_data.get("player_id"),
            "nombre": player_data.get("nombre"),
            "nickname": player_data.get("nickname"),
            "avatar": player_data.get("avatar")
        }
    
    async def create_challenge(
        self,
        season_id: str,
        challenger_id: str,
        opponent_id: str,
        notes: Optional[str] = None
    ) -> Dict:
        """
        Crear desafío de jugador a jugador.
        Estado: CHALLENGE_PENDING hasta que el oponente acepte.
        """
        import uuid
        
        if challenger_id == opponent_id:
            raise ValueError("No puedes desafiarte a ti mismo")
        
        # Verificar temporada activa
        season = await self.season_repo.get_by_id(season_id)
        if not season:
            raise ValueError("Temporada no encontrada")
        if season.get("estado") != "active":
            raise ValueError("La temporada no está activa")
        
        # Verificar que no haya ya un desafío pendiente entre estos jugadores
        db = await self.get_db()
        existing = await db["rapidpin_queue"].find_one({
            "season_id": season_id,
            "status": {"$in": ["challenge_pending", "waiting", "assigned"]},
            "$or": [
                {"player1_id": challenger_id, "player2_id": opponent_id},
                {"player1_id": opponent_id, "player2_id": challenger_id}
            ]
        })
        if existing:
            raise ValueError("Ya existe un desafío o partido pendiente entre estos jugadores")
        
        # Obtener info de jugadores
        challenger_info = await self.player_repo.get_by_id(challenger_id)
        opponent_info = await self.player_repo.get_by_id(opponent_id)
        
        queue_entry = {
            "queue_id": f"queue_{uuid.uuid4().hex[:12]}",
            "season_id": season_id,
            "player1_id": challenger_id,
            "player2_id": opponent_id,
            "player1_info": self._get_player_info(challenger_info),
            "player2_info": self._get_player_info(opponent_info),
            "referee_id": None,
            "referee_info": None,
            "status": "challenge_pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by_id": challenger_id,
            "created_by_role": "player",
            "accepted_at": None,
            "accepted_by_id": None,
            "assigned_at": None,
            "assigned_by_id": None,
            "completed_at": None,
            "cancelled_at": None,
            "cancelled_by_id": None,
            "decline_reason": None,
            "notes": notes,
            "match_id": None
        }
        
        await db["rapidpin_queue"].insert_one(queue_entry)
        self.log_info(f"Challenge created: {queue_entry['queue_id']} - {challenger_id} vs {opponent_id}")
        
        return queue_entry
    
    async def create_queue_match(
        self,
        season_id: str,
        player1_id: str,
        player2_id: str,
        created_by_id: str,
        created_by_role: str = "admin",
        notes: Optional[str] = None
    ) -> Dict:
        """
        Crear partido directamente en cola (admin/mod).
        Salta la fase de desafío, va directo a WAITING_REFEREE.
        """
        import uuid
        
        if player1_id == player2_id:
            raise ValueError("Los jugadores deben ser diferentes")
        
        # Verificar temporada activa
        season = await self.season_repo.get_by_id(season_id)
        if not season:
            raise ValueError("Temporada no encontrada")
        if season.get("estado") != "active":
            raise ValueError("La temporada no está activa")
        
        # Obtener info de jugadores
        player1_info = await self.player_repo.get_by_id(player1_id)
        player2_info = await self.player_repo.get_by_id(player2_id)
        
        db = await self.get_db()
        
        queue_entry = {
            "queue_id": f"queue_{uuid.uuid4().hex[:12]}",
            "season_id": season_id,
            "player1_id": player1_id,
            "player2_id": player2_id,
            "player1_info": self._get_player_info(player1_info),
            "player2_info": self._get_player_info(player2_info),
            "referee_id": None,
            "referee_info": None,
            "status": "waiting",  # Directo a esperando árbitro
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by_id": created_by_id,
            "created_by_role": created_by_role,
            "accepted_at": datetime.now(timezone.utc).isoformat(),  # Auto-aceptado
            "accepted_by_id": created_by_id,
            "assigned_at": None,
            "assigned_by_id": None,
            "completed_at": None,
            "cancelled_at": None,
            "cancelled_by_id": None,
            "decline_reason": None,
            "notes": notes,
            "match_id": None
        }
        
        await db["rapidpin_queue"].insert_one(queue_entry)
        self.log_info(f"Queue match created by {created_by_role}: {queue_entry['queue_id']}")
        
        return queue_entry
    
    async def accept_challenge(
        self,
        queue_id: str,
        user_id: str,
        user_role: str = "player"
    ) -> Dict:
        """
        Aceptar desafío.
        - El oponente (player2) puede aceptar
        - Admin/Mod pueden forzar aceptación
        """
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Desafío no encontrado")
        
        if queue_entry["status"] != "challenge_pending":
            raise ValueError("Este desafío ya fue procesado")
        
        # Verificar permisos: solo player2 o admin/mod
        is_opponent = user_id == queue_entry["player2_id"]
        is_privileged = user_role in ["admin", "moderator"]
        
        if not is_opponent and not is_privileged:
            raise ValueError("Solo el oponente o un admin/moderador puede aceptar este desafío")
        
        update_data = {
            "status": "waiting",
            "accepted_at": datetime.now(timezone.utc).isoformat(),
            "accepted_by_id": user_id
        }
        
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": update_data}
        )
        
        self.log_info(f"Challenge {queue_id} accepted by {user_id} (role: {user_role})")
        
        updated = await db["rapidpin_queue"].find_one({"queue_id": queue_id}, {"_id": 0})
        return updated
    
    async def decline_challenge(
        self,
        queue_id: str,
        user_id: str,
        reason: Optional[str] = None
    ) -> Dict:
        """Rechazar desafío"""
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Desafío no encontrado")
        
        if queue_entry["status"] != "challenge_pending":
            raise ValueError("Este desafío ya fue procesado")
        
        # Solo player2 puede rechazar
        if user_id != queue_entry["player2_id"]:
            raise ValueError("Solo el oponente puede rechazar el desafío")
        
        update_data = {
            "status": "declined",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by_id": user_id,
            "decline_reason": reason
        }
        
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": update_data}
        )
        
        self.log_info(f"Challenge {queue_id} declined by {user_id}")
        
        return {"queue_id": queue_id, "status": "declined", "reason": reason}
    
    async def get_queue_matches(
        self,
        season_id: Optional[str] = None,
        status: Optional[str] = None,
        player_id: Optional[str] = None
    ) -> List[Dict]:
        """Obtener partidos en cola con filtros"""
        db = await self.get_db()
        
        query = {}
        if season_id:
            query["season_id"] = season_id
        if status:
            if status == "active":
                query["status"] = {"$in": ["challenge_pending", "waiting", "assigned"]}
            else:
                query["status"] = status
        if player_id:
            query["$or"] = [
                {"player1_id": player_id},
                {"player2_id": player_id}
            ]
        
        cursor = db["rapidpin_queue"].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(50)
        
        return await cursor.to_list(length=50)
    
    async def assign_referee(
        self, 
        queue_id: str, 
        referee_id: str,
        assigned_by_id: Optional[str] = None,
        assigned_by_role: str = "player"
    ) -> Dict:
        """
        Asignar árbitro a partido en cola.
        - Cualquier usuario logueado puede asignarse
        - Admin/Mod pueden asignar a cualquiera
        """
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Partido no encontrado en cola")
        
        if queue_entry["status"] != "waiting":
            raise ValueError("Este partido no está esperando árbitro")
        
        # Verificar que el árbitro no sea uno de los jugadores
        if referee_id in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("El árbitro no puede ser uno de los jugadores")
        
        # Obtener info del árbitro
        referee_info = await self.player_repo.get_by_id(referee_id)
        
        update_data = {
            "referee_id": referee_id,
            "referee_info": self._get_player_info(referee_info),
            "status": "assigned",
            "assigned_at": datetime.now(timezone.utc).isoformat(),
            "assigned_by_id": assigned_by_id or referee_id
        }
        
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": update_data}
        )
        
        self.log_info(f"Referee {referee_id} assigned to queue {queue_id} by {assigned_by_id or referee_id}")
        
        updated = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        return updated
    
    async def complete_queue_match(
        self,
        queue_id: str,
        ganador_id: str,
        score_ganador: int = 11,
        score_perdedor: int = 0
    ) -> Dict:
        """Completar partido de la cola y registrarlo como partido oficial"""
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Partido no encontrado en cola")
        
        if queue_entry["status"] != "assigned":
            raise ValueError("El partido debe tener árbitro asignado para completarse")
        
        # Verificar que el ganador sea uno de los jugadores
        if ganador_id not in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("El ganador debe ser uno de los jugadores")
        
        # Determinar perdedor
        perdedor_id = queue_entry["player2_id"] if ganador_id == queue_entry["player1_id"] else queue_entry["player1_id"]
        
        # Registrar el partido oficial
        match_data = RapidPinMatchCreate(
            season_id=queue_entry["season_id"],
            jugador_a_id=queue_entry["player1_id"],
            jugador_b_id=queue_entry["player2_id"],
            arbitro_id=queue_entry["referee_id"],
            ganador_id=ganador_id,
            score_ganador=score_ganador,
            score_perdedor=score_perdedor,
            registrado_por_id=queue_entry["referee_id"]
        )
        
        match = await self.register_match(match_data)
        
        # Marcar como completado en la cola
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": {
                "status": "completed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "match_id": match.match_id
            }}
        )
        
        self.log_info(f"Queue match {queue_id} completed with match {match.match_id}")
        
        return {
            "queue_id": queue_id,
            "match_id": match.match_id,
            "status": "completed",
            "ganador_id": ganador_id,
            "score": f"{score_ganador}-{score_perdedor}"
        }
    
    async def cancel_queue_match(self, queue_id: str, cancelled_by_id: str) -> Dict:
        """Cancelar partido en cola"""
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Partido no encontrado en cola")
        
        if queue_entry["status"] in ["completed", "cancelled"]:
            raise ValueError("No se puede cancelar un partido ya completado o cancelado")
        
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": {
                "status": "cancelled",
                "cancelled_by_id": cancelled_by_id,
                "cancelled_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        self.log_info(f"Queue match {queue_id} cancelled by {cancelled_by_id}")
        
        return {"queue_id": queue_id, "status": "cancelled"}
    
    # ============== PUBLIC FEED ==============
    
    async def get_public_feed(self) -> Dict:
        """Obtener feed público de Rapid Pin"""
        db = await self.get_db()
        
        # Obtener temporada activa
        active_seasons = await self.get_active_seasons()
        active_season = active_seasons[0] if active_seasons else None
        
        # Estadísticas generales
        stats = {
            "total_seasons": await db["rapidpin_seasons"].count_documents({}),
            "total_matches": await db["rapidpin_matches"].count_documents({"estado": "validated"}),
            "active_season": active_season.model_dump() if active_season else None
        }
        
        # Partidos recientes (últimos 10 validados)
        recent_matches = []
        if active_season:
            matches_cursor = db["rapidpin_matches"].find(
                {"season_id": active_season.season_id, "estado": "validated"},
                {"_id": 0}
            ).sort("fecha_confirmacion", -1).limit(10)
            recent_matches = await matches_cursor.to_list(length=10)
        
        # Top jugadores de la temporada activa
        top_players = []
        if active_season:
            ranking_cursor = db["rapidpin_ranking"].find(
                {"season_id": active_season.season_id},
                {"_id": 0}
            ).sort("puntos_totales", -1).limit(10)
            top_players = await ranking_cursor.to_list(length=10)
        
        # Partidos en cola esperando árbitro
        waiting_matches = await self.get_queue_matches(
            season_id=active_season.season_id if active_season else None,
            status="waiting"
        )
        
        # Partidos en progreso (con árbitro asignado)
        in_progress_matches = await self.get_queue_matches(
            season_id=active_season.season_id if active_season else None,
            status="assigned"
        )
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stats": stats,
            "active_season": active_season.model_dump() if active_season else None,
            "recent_matches": recent_matches,
            "top_players": top_players,
            "waiting_for_referee": waiting_matches,
            "in_progress": in_progress_matches,
            "scoring_rules": RAPID_PIN_SCORING
        }


# Instancia singleton
rapidpin_service = RapidPinService()
