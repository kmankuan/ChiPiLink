"""
Rapid Pin - Service Layer
Lógica de negocio para el sistema de partidos espontáneos
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
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


# Instancia singleton
rapidpin_service = RapidPinService()
