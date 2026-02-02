"""
PinpanClub - Player Repository
Acceso a datos de jugadores
"""
from typing import List, Optional, Dict
from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections
import uuid


class PlayerRepository(BaseRepository):
    """
    Repository para jugadores de PinpanClub.
    Maneja todas las operations de base de datos para jugadores.
    """
    
    COLLECTION_NAME = PinpanClubCollections.PLAYERS
    ID_FIELD = "jugador_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, player_data: Dict) -> Dict:
        """Create new player"""
        player_data["jugador_id"] = str(uuid.uuid4())
        player_data["elo_rating"] = player_data.get("elo_rating", 1000)
        player_data["partidos_jugados"] = 0
        player_data["partidos_ganados"] = 0
        player_data["partidos_perdidos"] = 0
        player_data["activo"] = True
        
        return await self.insert_one(player_data)
    
    async def get_by_id(self, jugador_id: str) -> Optional[Dict]:
        """Get jugador by ID"""
        return await self.find_by_id(self.ID_FIELD, jugador_id)
    
    async def get_all_active(self, skip: int = 0, limit: int = 100) -> List[Dict]:
        """Get all players activos"""
        return await self.find_many(
            query={"activo": True},
            skip=skip,
            limit=limit,
            sort=[("elo_rating", -1)]
        )
    
    async def get_rankings(self, limit: int = 50) -> List[Dict]:
        """Get ranking de jugadores por ELO"""
        return await self.find_many(
            query={"activo": True, "partidos_jugados": {"$gt": 0}},
            limit=limit,
            sort=[("elo_rating", -1)]
        )
    
    async def update_player(self, jugador_id: str, data: Dict) -> bool:
        """Update datos de jugador"""
        return await self.update_by_id(self.ID_FIELD, jugador_id, data)
    
    async def update_stats(
        self,
        jugador_id: str,
        won: bool,
        elo_change: int
    ) -> bool:
        """Update estadísticas después de un partido"""
        update = {
            "$inc": {
                "partidos_jugados": 1,
                "partidos_ganados": 1 if won else 0,
                "partidos_perdidos": 0 if won else 1,
                "elo_rating": elo_change
            }
        }
        
        result = await self._collection.update_one(
            {self.ID_FIELD: jugador_id},
            update
        )
        return result.modified_count > 0
    
    async def search(self, query: str, limit: int = 20) -> List[Dict]:
        """Search jugadores by name o apodo"""
        search_filter = {
            "$or": [
                {"nombre": {"$regex": query, "$options": "i"}},
                {"apellido": {"$regex": query, "$options": "i"}},
                {"apodo": {"$regex": query, "$options": "i"}}
            ],
            "activo": True
        }
        return await self.find_many(query=search_filter, limit=limit)
    
    async def deactivate(self, jugador_id: str) -> bool:
        """Desactivar jugador (soft delete)"""
        return await self.update_player(jugador_id, {"activo": False})
    
    async def get_not_synced_to_monday(self) -> List[Dict]:
        """Get jugadores no sincronizados con Monday.com"""
        return await self.find_many(
            query={
                "activo": True,
                "$or": [
                    {"monday_item_id": {"$exists": False}},
                    {"monday_item_id": None}
                ]
            }
        )
    
    async def set_monday_item_id(self, jugador_id: str, monday_item_id: str) -> bool:
        """Establecer ID de Monday.com"""
        return await self.update_player(jugador_id, {"monday_item_id": monday_item_id})
