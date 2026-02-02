"""
PinpanClub - Match Repository
Acceso a datos de partidos
"""
from typing import List, Optional, Dict
from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections
import uuid


class MatchRepository(BaseRepository):
    """
    Repository para partidos de PinpanClub.
    Maneja todas las operaciones de base de datos para partidos.
    """
    
    COLLECTION_NAME = PinpanClubCollections.MATCHES
    ID_FIELD = "partido_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, match_data: Dict) -> Dict:
        """Create new match"""
        match_data["partido_id"] = str(uuid.uuid4())
        match_data["estado"] = "pendiente"
        match_data["puntos_jugador_a"] = 0
        match_data["puntos_jugador_b"] = 0
        match_data["sets_jugador_a"] = 0
        match_data["sets_jugador_b"] = 0
        match_data["set_actual"] = 1
        match_data["historial_sets"] = []
        
        return await self.insert_one(match_data)
    
    async def get_by_id(self, partido_id: str) -> Optional[Dict]:
        """Get partido by ID"""
        return await self.find_by_id(self.ID_FIELD, partido_id)
    
    async def get_active_matches(self) -> List[Dict]:
        """Get partidos activos (en curso o pausados)"""
        return await self.find_many(
            query={"estado": {"$in": ["en_curso", "pausado"]}},
            sort=[("created_at", -1)]
        )
    
    async def get_by_state(self, estado: str, limit: int = 50) -> List[Dict]:
        """Get partidos by status"""
        return await self.find_many(
            query={"estado": estado},
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_player(self, jugador_id: str, limit: int = 50) -> List[Dict]:
        """Get partidos de un jugador"""
        return await self.find_many(
            query={
                "$or": [
                    {"jugador_a_id": jugador_id},
                    {"jugador_b_id": jugador_id}
                ]
            },
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_by_tournament(self, torneo_id: str) -> List[Dict]:
        """Get partidos de un torneo"""
        return await self.find_many(
            query={"torneo_id": torneo_id},
            sort=[("ronda", 1), ("created_at", 1)]
        )
    
    async def update_match(self, partido_id: str, data: Dict) -> bool:
        """Update datos de partido"""
        return await self.update_by_id(self.ID_FIELD, partido_id, data)
    
    async def update_score(
        self,
        partido_id: str,
        puntos_a: int,
        puntos_b: int,
        sets_a: int,
        sets_b: int,
        set_actual: int,
        historial: List[Dict]
    ) -> bool:
        """Update puntuación dthe match"""
        return await self.update_match(partido_id, {
            "puntos_jugador_a": puntos_a,
            "puntos_jugador_b": puntos_b,
            "sets_jugador_a": sets_a,
            "sets_jugador_b": sets_b,
            "set_actual": set_actual,
            "historial_sets": historial
        })
    
    async def start_match(self, partido_id: str, fecha_inicio: str) -> bool:
        """Iniciar partido"""
        return await self.update_match(partido_id, {
            "estado": "en_curso",
            "fecha_inicio": fecha_inicio
        })
    
    async def finish_match(
        self,
        partido_id: str,
        ganador_id: str,
        fecha_fin: str
    ) -> bool:
        """Finalizar partido"""
        return await self.update_match(partido_id, {
            "estado": "finalizado",
            "ganador_id": ganador_id,
            "fecha_fin": fecha_fin
        })
    
    async def cancel_match(self, partido_id: str) -> bool:
        """Cancelar partido"""
        return await self.update_match(partido_id, {"estado": "cancelado"})
    
    async def get_not_synced_to_monday(self) -> List[Dict]:
        """Get partidos no sincronizados con Monday.com"""
        return await self.find_many(
            query={
                "estado": {"$in": ["pendiente", "en_curso", "pausado"]},
                "$or": [
                    {"monday_item_id": {"$exists": False}},
                    {"monday_item_id": None}
                ]
            }
        )
    
    async def get_finished_with_monday_id(self) -> List[Dict]:
        """Get partidos finalizados that hasn monday_item_id"""
        return await self.find_many(
            query={
                "estado": "finalizado",
                "monday_item_id": {"$exists": True, "$ne": None}
            }
        )
    
    async def set_monday_item_id(self, partido_id: str, monday_item_id: str) -> bool:
        """Establecer ID de Monday.com"""
        return await self.update_match(partido_id, {"monday_item_id": monday_item_id})
    
    async def count_by_state(self) -> Dict[str, int]:
        """Contar partidos by status"""
        pipeline = [
            {"$group": {"_id": "$estado", "count": {"$sum": 1}}}
        ]
        results = await self.aggregate(pipeline)
        return {r["_id"]: r["count"] for r in results}
