"""
Rapid Pin - Service Layer
Business logic for the spontaneous match system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

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


async def send_challenge_notification(
    recipient_id: str,
    challenger_name: str,
    notification_type: str = "challenge_received"
) -> bool:
    """
    Send push notification de desafío.
    notification_type: 'challenge_received', 'challenge_accepted', 'referee_needed', 'referee_assigned'
    """
    try:
        from modules.notifications.services.push_service import push_notification_service
        
        messages = {
            "challenge_received": {
                "title": "⚔️ ¡Nuevo Desafío!",
                "body": f"{challenger_name} te ha desafiado a un partido de Rapid Pin"
            },
            "challenge_accepted": {
                "title": "✅ ¡Desafío Aceptado!",
                "body": f"{challenger_name} aceptó tu desafío. ¡A buscar referee!"
            },
            "referee_needed": {
                "title": "🏓 ¡Partido esperando referee!",
                "body": f"El partido entre {challenger_name} está esperando un referee"
            },
            "referee_assigned": {
                "title": "🎮 ¡Tu partido está listo!",
                "body": f"{challenger_name} será el referee de tu partido. ¡A jugar!"
            },
            "date_proposed": {
                "title": "📅 Nueva propuesta de fecha",
                "body": f"{challenger_name} propone una nueva fecha para the challenge"
            },
            "date_accepted": {
                "title": "✅ ¡Fecha acordada!",
                "body": f"{challenger_name} aceptó la fecha. El reto está confirmado"
            }
        }
        
        msg = messages.get(notification_type, messages["challenge_received"])
        
        result = await push_notification_service.send_notification(
            user_id=recipient_id,
            category_id="cat_rapidpin",
            title=msg["title"],
            body=msg["body"],
            data={
                "type": notification_type,
                "action": "/rapidpin"
            },
            action_url="/rapidpin"
        )
        
        return result.get("success", False)
    except Exception as e:
        print(f"[RapidPin] Error sending notification: {e}")
        return False


async def send_referee_needed_broadcast(
    player1_name: str,
    player2_name: str,
    exclude_player_ids: list = None
) -> bool:
    """
    Send notification broadcast a todos the users cuando hay un partido esperando referee.
    Excluye a the players involucrados en the match.
    """
    try:
        from modules.notifications.services.push_service import push_notification_service
        from core.database import db
        
        # Get all users with devices, excluding the players in the match
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$user_id"}}
        ]
        
        user_docs = await db["chipi_user_devices"].aggregate(pipeline).to_list(length=10000)
        user_ids = [doc["_id"] for doc in user_docs]
        
        # Exclude the players
        if exclude_player_ids:
            user_ids = [uid for uid in user_ids if uid not in exclude_player_ids]
        
        if not user_ids:
            print("[RapidPin] No users to notify for referee needed")
            return False
        
        title = "⚖️ ¡Se busca referee!"
        body = f"{player1_name} vs {player2_name} esperan un referee. ¡Gana +2 puntos!"
        
        result = await push_notification_service.send_to_users(
            user_ids=user_ids,
            category_id="cat_rapidpin",
            title=title,
            body=body,
            data={
                "type": "referee_needed",
                "action": "/rapidpin"
            },
            action_url="/rapidpin"
        )
        
        print(f"[RapidPin] Referee needed broadcast sent to {result.get('sent', 0)} users")
        return result.get("success", False)
    except Exception as e:
        print(f"[RapidPin] Error sending referee needed broadcast: {e}")
        return False


class RapidPinService(BaseService):
    """
    Servicio principal para Rapid Pin.
    System for partidos espontáneos: 2 jugadores + 1 referee
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.season_repo = RapidPinSeasonRepository()
        self.match_repo = RapidPinMatchRepository()
        self.ranking_repo = RapidPinRankingRepository()
        self.player_repo = PlayerRepository()
    
    async def get_db(self):
        """Get database connection"""
        return get_database()
    
    # ============== SEASON MANAGEMENT ==============
    
    async def create_season(self, data: RapidPinSeasonCreate) -> RapidPinSeason:
        """Create new season Rapid Pin"""
        season_dict = data.model_dump()
        
        # Set premios by default if not provided
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
        """Get season by ID"""
        result = await self.season_repo.get_by_id(season_id)
        return RapidPinSeason(**result) if result else None
    
    async def get_active_seasons(self) -> List[RapidPinSeason]:
        """Get active seasons"""
        results = await self.season_repo.get_active_seasons()
        return [RapidPinSeason(**r) for r in results]
    
    async def get_all_seasons(self) -> List[RapidPinSeason]:
        """Get all seasons"""
        results = await self.season_repo.get_all_seasons()
        return [RapidPinSeason(**r) for r in results]
    
    async def update_season(
        self,
        season_id: str,
        data: RapidPinSeasonUpdate
    ) -> Optional[RapidPinSeason]:
        """Update season"""
        update_data = data.model_dump(exclude_unset=True)
        
        # Convert prizes to dict if necessary
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
        """Close season y calculate final results"""
        season = await self.get_season(season_id)
        if not season:
            raise ValueError("Temporada not found")
        
        if season.estado != RapidPinSeasonStatus.ACTIVE:
            raise ValueError("Season is already closed")
        
        # Get final rankings
        player_ranking = await self.ranking_repo.get_season_ranking(season_id)
        referee_ranking = await self.ranking_repo.get_referee_ranking(season_id)
        
        # Prepare player results
        player_results = []
        for idx, entry in enumerate(player_ranking, start=1):
            # Search corresponding prize
            prize = None
            for p in season.player_prizes:
                if p.position == idx:
                    prize = p
                    break
                elif p.special_type == "participation" and not prize:
                    prize = p  # Participation prize as fallback
            
            player_results.append(RapidPinSeasonResult(
                jugador_id=entry["jugador_id"],
                jugador_info=entry.get("jugador_info"),
                posicion_final=idx,
                puntos_finales=entry["puntos_totales"],
                role="player",
                prize=prize
            ))
        
        # Prepare referee results
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
        
        # Save results and close season
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
        """Register a new match Rapid Pin"""
        # Validaciones
        season = await self.get_season(data.season_id)
        if not season:
            raise ValueError("Temporada not found")
        
        if season.estado != RapidPinSeasonStatus.ACTIVE:
            raise ValueError("Season is not active")
        
        # Validate all 3 participants are different
        participants = {data.jugador_a_id, data.jugador_b_id, data.arbitro_id}
        if len(participants) != 3:
            raise ValueError("All 3 participants must be different people")
        
        # Validate that winner is one of the players
        if data.ganador_id not in [data.jugador_a_id, data.jugador_b_id]:
            raise ValueError("Winner must be one of the players")
        
        # Validate that registerer is one of the participants
        if data.registrado_por_id not in participants:
            raise ValueError("Only a participant can register the match")
        
        # Get player info
        jugador_a = await self.player_repo.get_by_id(data.jugador_a_id)
        jugador_b = await self.player_repo.get_by_id(data.jugador_b_id)
        arbitro = await self.player_repo.get_by_id(data.arbitro_id)
        
        # Determine loser
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
        
        # Points (to be applied upon confirmation)
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
        """Confirm a pending match"""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise ValueError("Match not found")
        
        if match["estado"] != RapidPinMatchStatus.PENDING:
            raise ValueError("Match was already processed")
        
        # Validate confirmer is a different participant from registrant
        participants = {match["jugador_a_id"], match["jugador_b_id"], match["arbitro_id"]}
        if confirmado_por_id not in participants:
            raise ValueError("Only a participant can confirm the match")
        
        if confirmado_por_id == match["registrado_por_id"]:
            raise ValueError("You cannot confirm a match you registered")
        
        # Confirm the match
        success = await self.match_repo.confirm_match(match_id, confirmado_por_id)
        if not success:
            raise ValueError("Error confirming the match")
        
        # Apply points
        await self._apply_match_points(match)
        
        # Update match with points
        await self.match_repo.update(match_id, {
            "puntos_ganador": RAPID_PIN_SCORING["victory"],
            "puntos_perdedor": RAPID_PIN_SCORING["defeat"],
            "puntos_arbitro": RAPID_PIN_SCORING["referee"]
        })
        
        # Increment season match counter
        await self.season_repo.increment_stats(match["season_id"], matches=1)
        
        # Recalculate positions
        await self.ranking_repo.recalculate_positions(match["season_id"])
        
        self.log_info(f"Rapid Pin match confirmed: {match_id}")
        
        # Return updated match
        updated_match = await self.match_repo.get_by_id(match_id)
        return RapidPinMatch(**updated_match)
    
    async def _apply_match_points(self, match: Dict):
        """Apply points after de confirmar un partido"""
        season_id = match["season_id"]
        ganador_id = match["ganador_id"]
        perdedor_id = match["perdedor_id"]
        arbitro_id = match["arbitro_id"]
        
        # Ensure ranking entries exist for all 3 participants
        ganador_ranking = await self.ranking_repo.get_or_create(
            season_id, ganador_id, match.get("jugador_a_info") if ganador_id == match["jugador_a_id"] else match.get("jugador_b_info")
        )
        perdedor_ranking = await self.ranking_repo.get_or_create(
            season_id, perdedor_id, match.get("jugador_b_info") if perdedor_id == match["jugador_b_id"] else match.get("jugador_a_info")
        )
        arbitro_ranking = await self.ranking_repo.get_or_create(
            season_id, arbitro_id, match.get("arbitro_info")
        )
        
        # Update winner stats
        await self.ranking_repo.update_player_stats(
            ganador_ranking["ranking_id"],
            is_winner=True,
            points=RAPID_PIN_SCORING["victory"]
        )
        
        # Update loser stats
        await self.ranking_repo.update_player_stats(
            perdedor_ranking["ranking_id"],
            is_winner=False,
            points=RAPID_PIN_SCORING["defeat"]
        )
        
        # Update referee stats
        await self.ranking_repo.update_referee_stats(
            arbitro_ranking["ranking_id"],
            points=RAPID_PIN_SCORING["referee"]
        )
        
        # Update unique participant counters in season
        counts = await self.ranking_repo.get_season_participants_count(season_id)
        season = await self.season_repo.get_by_id(season_id)
        if season:
            await self.season_repo.update(season_id, {
                "total_players": counts["players"],
                "total_referees": counts["referees"]
            })
    
    async def get_match(self, match_id: str) -> Optional[RapidPinMatch]:
        """Get match by ID"""
        result = await self.match_repo.get_by_id(match_id)
        return RapidPinMatch(**result) if result else None
    
    async def get_season_matches(
        self,
        season_id: str,
        estado: Optional[str] = None,
        limit: int = 50
    ) -> List[RapidPinMatch]:
        """Get partidos de una temporada"""
        results = await self.match_repo.get_season_matches(season_id, estado, limit)
        return [RapidPinMatch(**r) for r in results]
    
    async def get_pending_confirmations(
        self,
        season_id: str,
        user_id: str
    ) -> List[RapidPinMatch]:
        """Get matches pending confirmation para un usuario"""
        results = await self.match_repo.get_pending_matches_for_user(season_id, user_id)
        return [RapidPinMatch(**r) for r in results]
    
    async def get_all_pending_confirmations(self, user_id: str) -> List[RapidPinMatch]:
        """Get TODOS the matches pendientes de confirmación para un usuario (all seasons)"""
        results = await self.match_repo.get_all_pending_matches_for_user(user_id)
        return [RapidPinMatch(**r) for r in results]
    
    # ============== RANKING ==============
    
    async def get_ranking(self, season_id: str) -> RapidPinRankingTable:
        """Get tabla de ranking completa"""
        season = await self.get_season(season_id)
        if not season:
            raise ValueError("Temporada not found")
        
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
        """Get ranking de referees"""
        results = await self.ranking_repo.get_referee_ranking(season_id)
        return [RapidPinRankingEntry(**r) for r in results]
    
    async def get_player_stats(
        self,
        season_id: str,
        jugador_id: str
    ) -> Optional[Dict]:
        """Get player statistics en una temporada"""
        ranking = await self.ranking_repo.get_player_ranking(season_id, jugador_id)
        if not ranking:
            return None
        
        # Get match history
        matches = await self.match_repo.get_player_matches(season_id, jugador_id)
        
        return {
            "ranking": RapidPinRankingEntry(**ranking),
            "recent_matches": [RapidPinMatch(**m) for m in matches]
        }
    
    # ============== CHALLENGE & QUEUE SYSTEM ==============
    
    def _get_player_info(self, player_data: Optional[Dict]) -> Optional[Dict]:
        """Extraer info relevante of the player"""
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
            raise ValueError("You cannot challenge yourself")
        
        # Verify temporada activa
        season = await self.season_repo.get_by_id(season_id)
        if not season:
            raise ValueError("Temporada not found")
        if season.get("estado") != "active":
            raise ValueError("Season is not active")
        
        # Verify that does not haya ya un desafío pendiente entre estos jugadores
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
            raise ValueError("Already exists un desafío o partido pendiente entre estos jugadores")
        
        # Get player info
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
        
        # Remove MongoDB _id before returning
        queue_entry.pop("_id", None)
        
        # Send push notification to opponent
        challenger_name = challenger_info.get("apodo") or challenger_info.get("nombre", "Un jugador") if challenger_info else "Un jugador"
        await send_challenge_notification(
            recipient_id=opponent_id,
            challenger_name=challenger_name,
            notification_type="challenge_received"
        )
        
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
        Crear partido directamente in queue (admin/mod).
        Salta la fase de desafío, va directo a WAITING_REFEREE.
        """
        import uuid
        
        if player1_id == player2_id:
            raise ValueError("Los jugadores deben ser diferentes")
        
        # Verify temporada activa
        season = await self.season_repo.get_by_id(season_id)
        if not season:
            raise ValueError("Temporada not found")
        if season.get("estado") != "active":
            raise ValueError("Season is not active")
        
        # Get player info
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
            "status": "waiting",  # Directo a esperando referee
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
        
        # Remove MongoDB _id before returning
        queue_entry.pop("_id", None)
        
        # Send broadcast to all users that a match is waiting for referee
        player1_info_data = queue_entry.get("player1_info") or {}
        player2_info_data = queue_entry.get("player2_info") or {}
        player1_name = player1_info_data.get("nickname") or player1_info_data.get("nombre", "Jugador 1")
        player2_name = player2_info_data.get("nickname") or player2_info_data.get("nombre", "Jugador 2")
        
        await send_referee_needed_broadcast(
            player1_name=player1_name,
            player2_name=player2_name,
            exclude_player_ids=[player1_id, player2_id]
        )
        
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
            raise ValueError("Desafío not found")
        
        if queue_entry["status"] != "challenge_pending":
            raise ValueError("Este desafío ya fue procesado")
        
        # Verify permisos: solo player2 o admin/mod
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
        
        # Send push notification to challenger that their challenge was accepted
        accepter_info = queue_entry.get("player2_info") or {}
        accepter_name = accepter_info.get("nickname") or accepter_info.get("nombre", "Tu oponente")
        await send_challenge_notification(
            recipient_id=queue_entry["player1_id"],
            challenger_name=accepter_name,
            notification_type="challenge_accepted"
        )
        
        # Send broadcast to all users that a match is waiting for referee
        player1_info = queue_entry.get("player1_info") or {}
        player1_name = player1_info.get("nickname") or player1_info.get("nombre", "Jugador 1")
        player2_name = accepter_info.get("nickname") or accepter_info.get("nombre", "Jugador 2")
        
        await send_referee_needed_broadcast(
            player1_name=player1_name,
            player2_name=player2_name,
            exclude_player_ids=[queue_entry["player1_id"], queue_entry["player2_id"]]
        )
        
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
            raise ValueError("Desafío not found")
        
        if queue_entry["status"] != "challenge_pending":
            raise ValueError("Este desafío ya fue procesado")
        
        # Only player2 puede rechazar
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
        """Get partidos in queue con filtros"""
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
        Asignar referee a partido in queue.
        - Cualquier usuario logueado puede asignarse
        - Admin/Mod pueden asignar a cualquiera
        """
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Match not found in queue")
        
        if queue_entry["status"] != "waiting":
            raise ValueError("Este partido no está esperando referee")
        
        # Verify referee is not one of the players
        if referee_id in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("El referee no puede ser uno de the players")
        
        # Get info of the referee
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
        
        # Notify both players that referee is assigned
        referee_name = referee_info.get("apodo") or referee_info.get("nombre", "Un referee") if referee_info else "Un referee"
        await send_challenge_notification(
            recipient_id=queue_entry["player1_id"],
            challenger_name=referee_name,
            notification_type="referee_assigned"
        )
        await send_challenge_notification(
            recipient_id=queue_entry["player2_id"],
            challenger_name=referee_name,
            notification_type="referee_assigned"
        )
        
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
        """Completar partido from queue y registrarlo como partido oficial"""
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Match not found in queue")
        
        if queue_entry["status"] != "assigned":
            raise ValueError("El partido debe tener referee asignado to completese")
        
        # Verify winner is one of the players
        if ganador_id not in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("Winner must be one of the players")
        
        # Determine loser
        perdedor_id = queue_entry["player2_id"] if ganador_id == queue_entry["player1_id"] else queue_entry["player1_id"]
        
        # Registrar the match oficial
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
        
        # Mark as completed in queue
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
        """Cancelar partido in queue"""
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Match not found in queue")
        
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
        """Get feed public de Rapid Pin"""
        db = await self.get_db()
        
        # Get temporada activa
        active_seasons = await self.get_active_seasons()
        active_season = active_seasons[0] if active_seasons else None
        
        # Statistics generales
        stats = {
            "total_seasons": await db["rapidpin_seasons"].count_documents({}),
            "total_matches": await db["rapidpin_matches"].count_documents({"estado": "validated"}),
            "active_season": active_season.model_dump() if active_season else None
        }
        
        # Matchs recientes (lasts 10 validados)
        recent_matches = []
        if active_season:
            matches_cursor = db["rapidpin_matches"].find(
                {"season_id": active_season.season_id, "estado": "validated"},
                {"_id": 0}
            ).sort("fecha_confirmacion", -1).limit(10)
            recent_matches = await matches_cursor.to_list(length=10)
        
        # Top jugadores of the season activa
        top_players = []
        if active_season:
            ranking_cursor = db["rapidpin_ranking"].find(
                {"season_id": active_season.season_id},
                {"_id": 0}
            ).sort("puntos_totales", -1).limit(10)
            top_players = await ranking_cursor.to_list(length=10)
        
        # Matchs in queue esperando referee
        waiting_matches = await self.get_queue_matches(
            season_id=active_season.season_id if active_season else None,
            status="waiting"
        )
        
        # Matchs in progress (con referee asignado)
        in_progress_matches = await self.get_queue_matches(
            season_id=active_season.season_id if active_season else None,
            status="assigned"
        )
        
        # Challenges pending acceptance
        pending_challenges = await self.get_queue_matches(
            season_id=active_season.season_id if active_season else None,
            status="challenge_pending"
        )
        
        return {
            "success": True,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "stats": stats,
            "active_season": active_season.model_dump() if active_season else None,
            "recent_matches": recent_matches,
            "top_players": top_players,
            "pending_challenges": pending_challenges,
            "waiting_for_referee": waiting_matches,
            "in_progress": in_progress_matches,
            "queued_challenges": await self.get_queue_matches(
                season_id=active_season.season_id if active_season else None,
                status="queued"
            ),
            "date_negotiation": await self.get_queue_matches(
                season_id=active_season.season_id if active_season else None,
                status="date_negotiation"
            ),
            "scoring_rules": RAPID_PIN_SCORING
        }
    
    # ============== DATE NEGOTIATION METHODS ==============
    
    async def create_challenge_with_date(
        self,
        season_id: str,
        challenger_id: str,
        opponent_id: str,
        proposed_date: str,
        message: str = None
    ) -> Dict:
        """
        Crear desafío con propuesta de fecha inicial.
        El reto inicia en estado date_negotiation.
        """
        db = await self.get_db()
        
        # Validaciones básicas
        if challenger_id == opponent_id:
            raise ValueError("You cannot challenge yourself")
        
        # Verify that does not exista un desafío activo entre estos jugadores
        existing = await db["rapidpin_queue"].find_one({
            "$or": [
                {"player1_id": challenger_id, "player2_id": opponent_id},
                {"player1_id": opponent_id, "player2_id": challenger_id}
            ],
            "status": {"$in": ["challenge_pending", "date_negotiation", "waiting", "assigned", "queued"]}
        })
        
        if existing:
            raise ValueError("Already exists un desafío o partido pendiente entre estos jugadores")
        
        # Get player info
        challenger_info = await self.player_repo.get_by_id(challenger_id)
        opponent_info = await self.player_repo.get_by_id(opponent_id)
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Create initial date history
        date_history = [{
            "proposed_date": proposed_date,
            "proposed_by_id": challenger_id,
            "proposed_by_name": challenger_info.get("apodo") or challenger_info.get("nombre") if challenger_info else "Retador",
            "message": message,
            "created_at": now,
            "status": "pending"
        }]
        
        queue_entry = {
            "queue_id": f"queue_{uuid.uuid4().hex[:12]}",
            "season_id": season_id,
            "player1_id": challenger_id,
            "player2_id": opponent_id,
            "player1_info": self._get_player_info(challenger_info),
            "player2_info": self._get_player_info(opponent_info),
            "referee_id": None,
            "referee_info": None,
            "status": "date_negotiation",
            "created_at": now,
            "created_by_id": challenger_id,
            "created_by_role": "player",
            "proposed_date": proposed_date,
            "proposed_by_id": challenger_id,
            "date_history": date_history,
            "agreed_date": None,
            "accepted_at": None,
            "accepted_by_id": None,
            "assigned_at": None,
            "assigned_by_id": None,
            "completed_at": None,
            "cancelled_at": None,
            "cancelled_by_id": None,
            "decline_reason": None,
            "notes": None,
            "match_id": None,
            "likes_count": 0,
            "comments_count": 0
        }
        
        await db["rapidpin_queue"].insert_one(queue_entry)
        self.log_info(f"Challenge with date created: {queue_entry['queue_id']} - {challenger_id} vs {opponent_id}")
        
        queue_entry.pop("_id", None)
        
        # Notify al oponente
        challenger_name = challenger_info.get("apodo") or challenger_info.get("nombre", "Un jugador") if challenger_info else "Un jugador"
        await send_challenge_notification(
            recipient_id=opponent_id,
            challenger_name=challenger_name,
            notification_type="date_proposed"
        )
        
        return queue_entry
    
    async def respond_to_date(
        self,
        queue_id: str,
        user_id: str,
        action: str,  # "accept", "counter", "queue"
        counter_date: str = None,
        message: str = None
    ) -> Dict:
        """
        Respond to a date proposal.
        - accept: Accepts the proposed date -> goes to waiting
        - counter: Proposes another date -> continues in date_negotiation
        - queue: Put in queue to resume later -> goes to queued
        """
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Challenge not found")
        
        if queue_entry["status"] not in ["date_negotiation", "queued"]:
            raise ValueError("This challenge is not in negotiation phase de fecha")
        
        # Verify is one of the players
        if user_id not in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("Only challenge players can respond")
        
        # Verify is not the same person who proposed
        if action in ["accept", "counter"] and user_id == queue_entry.get("proposed_by_id"):
            raise ValueError("You must wait for the other player response")
        
        now = datetime.now(timezone.utc).isoformat()
        other_player_id = queue_entry["player2_id"] if user_id == queue_entry["player1_id"] else queue_entry["player1_id"]
        
        # Get user info
        user_info = await self.player_repo.get_by_id(user_id)
        user_name = user_info.get("apodo") or user_info.get("nombre", "Un jugador") if user_info else "Un jugador"
        
        # Update date history
        date_history = queue_entry.get("date_history", [])
        if date_history and len(date_history) > 0:
            date_history[-1]["status"] = action
            date_history[-1]["responded_at"] = now
            date_history[-1]["response_by_id"] = user_id
        
        update_data = {
            "date_history": date_history
        }
        
        if action == "accept":
            # Accept date - move to waiting
            update_data["status"] = "waiting"
            update_data["agreed_date"] = queue_entry.get("proposed_date")
            update_data["accepted_at"] = now
            update_data["accepted_by_id"] = user_id
            
            # Notify the other player
            await send_challenge_notification(
                recipient_id=other_player_id,
                challenger_name=user_name,
                notification_type="date_accepted"
            )
            
            # Broadcast to find referee
            player1_info = queue_entry.get("player1_info") or {}
            player2_info = queue_entry.get("player2_info") or {}
            player1_name = player1_info.get("nickname") or player1_info.get("nombre", "Jugador 1")
            player2_name = player2_info.get("nickname") or player2_info.get("nombre", "Jugador 2")
            
            await send_referee_needed_broadcast(
                player1_name=player1_name,
                player2_name=player2_name,
                exclude_player_ids=[queue_entry["player1_id"], queue_entry["player2_id"]]
            )
            
        elif action == "counter":
            if not counter_date:
                raise ValueError("You must propose an alternative date")
            
            # Add new proposal to history
            date_history.append({
                "proposed_date": counter_date,
                "proposed_by_id": user_id,
                "proposed_by_name": user_name,
                "message": message,
                "created_at": now,
                "status": "pending"
            })
            
            update_data["proposed_date"] = counter_date
            update_data["proposed_by_id"] = user_id
            update_data["date_history"] = date_history
            update_data["status"] = "date_negotiation"
            
            # Notify the other player
            await send_challenge_notification(
                recipient_id=other_player_id,
                challenger_name=user_name,
                notification_type="date_proposed"
            )
            
        elif action == "queue":
            # Put in queue to resume later
            update_data["status"] = "queued"
            
        await db["rapidpin_queue"].update_one(
            {"queue_id": queue_id},
            {"$set": update_data}
        )
        
        self.log_info(f"Date response for {queue_id}: {action} by {user_id}")
        
        updated = await db["rapidpin_queue"].find_one({"queue_id": queue_id}, {"_id": 0})
        return updated
    
    async def resume_from_queue(
        self,
        queue_id: str,
        user_id: str,
        proposed_date: str,
        message: str = None
    ) -> Dict:
        """
        Resume a challenge from queue proposing new date.
        """
        db = await self.get_db()
        
        queue_entry = await db["rapidpin_queue"].find_one(
            {"queue_id": queue_id},
            {"_id": 0}
        )
        
        if not queue_entry:
            raise ValueError("Challenge not found")
        
        if queue_entry["status"] != "queued":
            raise ValueError("This challenge is not in queue")
        
        if user_id not in [queue_entry["player1_id"], queue_entry["player2_id"]]:
            raise ValueError("Only challenge players can resume it")
        
        # Use respond_to_date with action=counter to propose new date
        return await self.respond_to_date(
            queue_id=queue_id,
            user_id=user_id,
            action="counter",
            counter_date=proposed_date,
            message=message
        )
    
    # ============== LIKES & COMMENTS METHODS ==============
    
    async def get_comment_config(self) -> Dict:
        """Get comment configuration"""
        db = await self.get_db()
        
        config = await db["rapidpin_config"].find_one(
            {"config_id": "comment_config"},
            {"_id": 0}
        )
        
        if not config:
            # Create configuration by default
            config = {
                "config_id": "comment_config",
                "max_comment_length": 280,
                "require_approval_for_flagged_users": True,
                "warning_message": {
                    "es": "Recuerda mantener un ambiente respetuoso. Los comentarios inapropiados pueden resultar en sanciones.",
                    "en": "Remember to keep a respectful environment. Inappropriate comments may result in sanctions.",
                    "zh": "请保持尊重的环境。不当评论可能会导致处罚。"
                }
            }
            await db["rapidpin_config"].insert_one(config)
            config.pop("_id", None)
        
        return config
    
    async def update_comment_config(self, updates: Dict) -> Dict:
        """Update comment configuration (admin)"""
        db = await self.get_db()
        
        await db["rapidpin_config"].update_one(
            {"config_id": "comment_config"},
            {"$set": updates},
            upsert=True
        )
        
        return await self.get_comment_config()
    
    async def toggle_like(self, queue_id: str, user_id: str, user_name: str = None) -> Dict:
        """Toggle like on a challenge"""
        db = await self.get_db()
        
        # Verify that the challenge existe
        queue_entry = await db["rapidpin_queue"].find_one({"queue_id": queue_id})
        if not queue_entry:
            raise ValueError("Challenge not found")
        
        # Check if like already exists
        existing = await db["rapidpin_reactions"].find_one({
            "queue_id": queue_id,
            "user_id": user_id,
            "reaction_type": "like"
        })
        
        if existing:
            # Remove like
            await db["rapidpin_reactions"].delete_one({"_id": existing["_id"]})
            await db["rapidpin_queue"].update_one(
                {"queue_id": queue_id},
                {"$inc": {"likes_count": -1}}
            )
            new_count = queue_entry.get("likes_count", 1) - 1
            action = "unliked"
        else:
            # Give like
            reaction = {
                "reaction_id": f"react_{uuid.uuid4().hex[:8]}",
                "queue_id": queue_id,
                "user_id": user_id,
                "reaction_type": "like",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db["rapidpin_reactions"].insert_one(reaction)
            await db["rapidpin_queue"].update_one(
                {"queue_id": queue_id},
                {"$inc": {"likes_count": 1}}
            )
            new_count = queue_entry.get("likes_count", 0) + 1
            action = "liked"
        
        # Emit WebSocket event
        try:
            from modules.realtime.services import emit_like_event
            await emit_like_event(
                queue_id=queue_id,
                user_id=user_id,
                user_name=user_name or "Usuario",
                action=action,
                new_count=new_count,
                player_ids=[queue_entry.get("player1_id"), queue_entry.get("player2_id")]
            )
        except Exception as e:
            self.log_error(f"Error emitting like event: {e}")
        
        return {"action": action, "likes_count": new_count}
    
    async def check_user_liked(self, queue_id: str, user_id: str) -> bool:
        """Check if user already liked"""
        db = await self.get_db()
        
        existing = await db["rapidpin_reactions"].find_one({
            "queue_id": queue_id,
            "user_id": user_id,
            "reaction_type": "like"
        })
        
        return existing is not None
    
    async def add_comment(
        self,
        queue_id: str,
        user_id: str,
        content: str,
        user_info: Dict = None
    ) -> Dict:
        """Agregar comentario on a challenge"""
        db = await self.get_db()
        
        # Verify that the challenge existe
        queue_entry = await db["rapidpin_queue"].find_one({"queue_id": queue_id})
        if not queue_entry:
            raise ValueError("Challenge not found")
        
        # Get config
        config = await self.get_comment_config()
        max_length = config.get("max_comment_length", 280)
        
        # Validate length
        if len(content) > max_length:
            raise ValueError(f"Comment exceeds the limit de {max_length} characters")
        
        # Check if user is flagged (has sanctions)
        user_moderation = await db["user_moderations"].find_one({
            "user_id": user_id,
            "status": {"$in": ["warning", "sanctioned"]}
        })
        
        is_moderated = False
        is_approved = True
        
        if user_moderation and config.get("require_approval_for_flagged_users", True):
            is_moderated = True
            is_approved = False
        
        now = datetime.now(timezone.utc).isoformat()
        
        comment = {
            "comment_id": f"comment_{uuid.uuid4().hex[:8]}",
            "queue_id": queue_id,
            "user_id": user_id,
            "user_info": user_info,
            "content": content,
            "is_moderated": is_moderated,
            "is_approved": is_approved,
            "is_hidden": False,
            "moderation_reason": None,
            "created_at": now,
            "updated_at": now
        }
        
        await db["rapidpin_comments"].insert_one(comment)
        
        # Only increment counter if approved
        new_count = queue_entry.get("comments_count", 0)
        if is_approved:
            await db["rapidpin_queue"].update_one(
                {"queue_id": queue_id},
                {"$inc": {"comments_count": 1}}
            )
            new_count += 1
            
            # Emit WebSocket event only for approved comments
            try:
                from modules.realtime.services import emit_comment_event
                user_name = (user_info or {}).get("nombre", "Usuario")
                await emit_comment_event(
                    queue_id=queue_id,
                    comment_id=comment["comment_id"],
                    user_id=user_id,
                    user_name=user_name,
                    content=content,
                    new_count=new_count
                )
            except Exception as e:
                self.log_error(f"Error emitting comment event: {e}")
        
        comment.pop("_id", None)
        
        return {
            "comment": comment,
            "is_pending_moderation": is_moderated and not is_approved,
            "warning_message": config.get("warning_message", {})
        }
    
    async def get_comments(
        self,
        queue_id: str,
        include_hidden: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        """Get challenge comments"""
        db = await self.get_db()
        
        query = {"queue_id": queue_id, "is_approved": True}
        if not include_hidden:
            query["is_hidden"] = False
        
        cursor = db["rapidpin_comments"].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def moderate_comment(
        self,
        comment_id: str,
        action: str,  # "approve", "reject", "hide"
        moderator_id: str,
        reason: str = None
    ) -> Dict:
        """Moderate a comment (admin/mod)"""
        db = await self.get_db()
        
        comment = await db["rapidpin_comments"].find_one(
            {"comment_id": comment_id},
            {"_id": 0}
        )
        
        if not comment:
            raise ValueError("Comment not found")
        
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "moderation_reason": reason
        }
        
        was_approved = comment.get("is_approved", True)
        
        if action == "approve":
            update_data["is_approved"] = True
            update_data["is_moderated"] = False
            
            # Increment counter if not previously approved
            if not was_approved:
                await db["rapidpin_queue"].update_one(
                    {"queue_id": comment["queue_id"]},
                    {"$inc": {"comments_count": 1}}
                )
                
        elif action == "reject":
            update_data["is_approved"] = False
            update_data["is_hidden"] = True
            
        elif action == "hide":
            update_data["is_hidden"] = True
            
            # Decrement counter if was approved
            if was_approved:
                await db["rapidpin_queue"].update_one(
                    {"queue_id": comment["queue_id"]},
                    {"$inc": {"comments_count": -1}}
                )
        
        await db["rapidpin_comments"].update_one(
            {"comment_id": comment_id},
            {"$set": update_data}
        )
        
        return await db["rapidpin_comments"].find_one({"comment_id": comment_id}, {"_id": 0})
    
    async def get_pending_comments(self, limit: int = 50) -> List[Dict]:
        """Get comments pending moderation"""
        db = await self.get_db()
        
        cursor = db["rapidpin_comments"].find(
            {"is_moderated": True, "is_approved": False},
            {"_id": 0}
        ).sort("created_at", 1).limit(limit)
        
        return await cursor.to_list(length=limit)


# Singleton instance
rapidpin_service = RapidPinService()
