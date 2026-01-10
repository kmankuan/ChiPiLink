"""
Rapid Pin - Repository Layer
Acceso a datos para el sistema Rapid Pin
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections


class RapidPinSeasonRepository(BaseRepository):
    """Repositorio para temporadas Rapid Pin"""
    
    COLLECTION_NAME = PinpanClubCollections.RAPIDPIN_SEASONS
    ID_FIELD = "season_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, season_data: Dict) -> Dict:
        """Crear nueva temporada"""
        season_data["season_id"] = f"rps_{uuid.uuid4().hex[:12]}"
        season_data["created_at"] = datetime.now(timezone.utc).isoformat()
        season_data["updated_at"] = season_data["created_at"]
        return await self.insert_one(season_data)
    
    async def get_by_id(self, season_id: str) -> Optional[Dict]:
        """Obtener temporada por ID"""
        return await self.find_one({self.ID_FIELD: season_id})
    
    async def update(self, season_id: str, data: Dict) -> bool:
        """Actualizar temporada"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, season_id, data)
    
    async def get_active_seasons(self) -> List[Dict]:
        """Obtener temporadas activas"""
        return await self.find_many(
            query={"estado": "active"},
            sort=[("fecha_inicio", -1)]
        )
    
    async def get_all_seasons(self) -> List[Dict]:
        """Obtener todas las temporadas"""
        return await self.find_many(
            query={},
            sort=[("created_at", -1)]
        )
    
    async def close_season(self, season_id: str, final_results: Dict) -> bool:
        """Cerrar temporada y guardar resultados"""
        return await self.update(
            season_id,
            {
                "estado": "closed",
                "closed_at": datetime.now(timezone.utc).isoformat(),
                "final_results": final_results
            }
        )
    
    async def increment_stats(
        self,
        season_id: str,
        matches: int = 0,
        players: int = 0,
        referees: int = 0
    ) -> bool:
        """Incrementar estadísticas de la temporada"""
        update = {}
        if matches:
            update["total_matches"] = matches
        if players:
            update["total_players"] = players
        if referees:
            update["total_referees"] = referees
        
        if not update:
            return True
        
        result = await self._collection.update_one(
            {self.ID_FIELD: season_id},
            {"$inc": update}
        )
        return result.modified_count > 0


class RapidPinMatchRepository(BaseRepository):
    """Repositorio para partidos Rapid Pin"""
    
    COLLECTION_NAME = PinpanClubCollections.RAPIDPIN_MATCHES
    ID_FIELD = "match_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, match_data: Dict) -> Dict:
        """Crear nuevo partido"""
        match_data["match_id"] = f"rpm_{uuid.uuid4().hex[:12]}"
        match_data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(match_data)
    
    async def get_by_id(self, match_id: str) -> Optional[Dict]:
        """Obtener partido por ID"""
        return await self.find_one({self.ID_FIELD: match_id})
    
    async def update(self, match_id: str, data: Dict) -> bool:
        """Actualizar partido"""
        return await self.update_by_id(self.ID_FIELD, match_id, data)
    
    async def get_season_matches(
        self,
        season_id: str,
        estado: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Obtener partidos de una temporada"""
        query = {"season_id": season_id}
        if estado:
            query["estado"] = estado
        
        return await self.find_many(
            query=query,
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def get_pending_matches_for_user(
        self,
        season_id: str,
        user_id: str
    ) -> List[Dict]:
        """Obtener partidos pendientes de confirmación donde el usuario participa"""
        return await self.find_many(
            query={
                "season_id": season_id,
                "estado": "pending",
                "$or": [
                    {"jugador_a_id": user_id},
                    {"jugador_b_id": user_id},
                    {"arbitro_id": user_id}
                ],
                "registrado_por_id": {"$ne": user_id}  # No puede confirmar su propio registro
            },
            sort=[("created_at", -1)]
        )
    
    async def get_player_matches(
        self,
        season_id: str,
        jugador_id: str,
        limit: int = 20
    ) -> List[Dict]:
        """Obtener partidos de un jugador (como jugador o árbitro)"""
        return await self.find_many(
            query={
                "season_id": season_id,
                "estado": "validated",
                "$or": [
                    {"jugador_a_id": jugador_id},
                    {"jugador_b_id": jugador_id},
                    {"arbitro_id": jugador_id}
                ]
            },
            sort=[("fecha_partido", -1)],
            limit=limit
        )
    
    async def confirm_match(
        self,
        match_id: str,
        confirmado_por_id: str
    ) -> bool:
        """Confirmar un partido pendiente"""
        result = await self._collection.update_one(
            {
                self.ID_FIELD: match_id,
                "estado": "pending"
            },
            {
                "$set": {
                    "estado": "validated",
                    "confirmado_por_id": confirmado_por_id,
                    "fecha_confirmacion": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def get_validated_matches_count(self, season_id: str) -> int:
        """Contar partidos validados en una temporada"""
        return await self._collection.count_documents({
            "season_id": season_id,
            "estado": "validated"
        })


class RapidPinRankingRepository(BaseRepository):
    """Repositorio para rankings Rapid Pin"""
    
    COLLECTION_NAME = PinpanClubCollections.RAPIDPIN_RANKINGS
    ID_FIELD = "ranking_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, ranking_data: Dict) -> Dict:
        """Crear nueva entrada de ranking"""
        ranking_data["ranking_id"] = f"rpr_{uuid.uuid4().hex[:12]}"
        ranking_data["created_at"] = datetime.now(timezone.utc).isoformat()
        ranking_data["updated_at"] = ranking_data["created_at"]
        return await self.insert_one(ranking_data)
    
    async def get_or_create(
        self,
        season_id: str,
        jugador_id: str,
        jugador_info: Dict = None
    ) -> Dict:
        """Obtener o crear entrada de ranking para un jugador"""
        existing = await self.find_one({
            "season_id": season_id,
            "jugador_id": jugador_id
        })
        
        if existing:
            return existing
        
        # Crear nueva entrada
        ranking_data = {
            "season_id": season_id,
            "jugador_id": jugador_id,
            "jugador_info": jugador_info,
            "posicion": 0,
            "puntos_totales": 0,
            "partidos_jugados": 0,
            "partidos_ganados": 0,
            "partidos_perdidos": 0,
            "puntos_como_jugador": 0,
            "partidos_arbitrados": 0,
            "puntos_como_arbitro": 0
        }
        
        return await self.create(ranking_data)
    
    async def get_player_ranking(
        self,
        season_id: str,
        jugador_id: str
    ) -> Optional[Dict]:
        """Obtener ranking de un jugador específico"""
        return await self.find_one({
            "season_id": season_id,
            "jugador_id": jugador_id
        })
    
    async def get_season_ranking(
        self,
        season_id: str,
        sort_by: str = "puntos_totales"
    ) -> List[Dict]:
        """Obtener ranking completo de una temporada"""
        return await self.find_many(
            query={"season_id": season_id},
            sort=[(sort_by, -1), ("partidos_jugados", -1)]
        )
    
    async def get_referee_ranking(self, season_id: str) -> List[Dict]:
        """Obtener ranking de árbitros (por partidos arbitrados)"""
        return await self.find_many(
            query={
                "season_id": season_id,
                "partidos_arbitrados": {"$gt": 0}
            },
            sort=[("partidos_arbitrados", -1), ("puntos_como_arbitro", -1)]
        )
    
    async def update_player_stats(
        self,
        ranking_id: str,
        is_winner: bool,
        points: int
    ) -> bool:
        """Actualizar estadísticas de jugador después de un partido"""
        inc_data = {
            "puntos_totales": points,
            "puntos_como_jugador": points,
            "partidos_jugados": 1
        }
        
        if is_winner:
            inc_data["partidos_ganados"] = 1
        else:
            inc_data["partidos_perdidos"] = 1
        
        result = await self._collection.update_one(
            {self.ID_FIELD: ranking_id},
            {
                "$inc": inc_data,
                "$set": {
                    "last_activity": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def update_referee_stats(
        self,
        ranking_id: str,
        points: int
    ) -> bool:
        """Actualizar estadísticas de árbitro"""
        result = await self._collection.update_one(
            {self.ID_FIELD: ranking_id},
            {
                "$inc": {
                    "puntos_totales": points,
                    "puntos_como_arbitro": points,
                    "partidos_arbitrados": 1
                },
                "$set": {
                    "last_activity": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def recalculate_positions(self, season_id: str) -> bool:
        """Recalcular posiciones del ranking"""
        # Obtener todos los rankings ordenados
        rankings = await self.get_season_ranking(season_id)
        
        # Actualizar posiciones
        for idx, ranking in enumerate(rankings, start=1):
            await self._collection.update_one(
                {self.ID_FIELD: ranking["ranking_id"]},
                {"$set": {"posicion": idx}}
            )
        
        return True
    
    async def get_season_participants_count(self, season_id: str) -> Dict:
        """Obtener conteo de participantes únicos"""
        players = await self._collection.count_documents({
            "season_id": season_id,
            "partidos_jugados": {"$gt": 0}
        })
        
        referees = await self._collection.count_documents({
            "season_id": season_id,
            "partidos_arbitrados": {"$gt": 0}
        })
        
        return {"players": players, "referees": referees}
