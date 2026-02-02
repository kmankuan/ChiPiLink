"""
Prizes - Repository Layer
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from core.database import db
from core.base import BaseRepository


class PrizeDefinitionRepository(BaseRepository):
    """Repository for definiciones de premios"""
    
    COLLECTION_NAME = "pinpanclub_prize_definitions"
    ID_FIELD = "prize_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["prize_id"] = f"prize_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(data)
    
    async def get_by_id(self, prize_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: prize_id})
    
    async def update(self, prize_id: str, data: Dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, prize_id, data)
    
    async def get_all_prizes(self) -> List[Dict]:
        return await self.find_many(query={}, sort=[("created_at", -1)])
    
    async def get_prizes_for_season(self, season_id: str) -> List[Dict]:
        return await self.find_many(
            query={"$or": [{"season_id": season_id}, {"season_id": None}]}
        )
    
    async def get_prizes_by_type(self, prize_type: str) -> List[Dict]:
        return await self.find_many(query={"type": prize_type})


class AwardedPrizeRepository(BaseRepository):
    """Repository for premios otorgados"""
    
    COLLECTION_NAME = "pinpanclub_awarded_prizes"
    ID_FIELD = "award_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["award_id"] = f"award_{uuid.uuid4().hex[:8]}"
        data["awarded_at"] = datetime.now(timezone.utc).isoformat()
        data["status"] = "claimed"
        return await self.insert_one(data)
    
    async def get_by_id(self, award_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: award_id})
    
    async def update_status(self, award_id: str, status: str) -> bool:
        update = {"status": status}
        if status == "delivered":
            update["delivered_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, award_id, update)
    
    async def get_player_prizes(
        self, 
        jugador_id: str,
        status: str = None,
        limit: int = 50
    ) -> List[Dict]:
        query = {"jugador_id": jugador_id}
        if status:
            query["status"] = status
        return await self.find_many(
            query=query,
            sort=[("awarded_at", -1)],
            limit=limit
        )
    
    async def get_season_prizes(self, season_id: str) -> List[Dict]:
        return await self.find_many(
            query={"season_id": season_id},
            sort=[("position", 1)]
        )
    
    async def count_prize_winners(self, prize_id: str) -> int:
        return await self._collection.count_documents({"prize_id": prize_id})


class PrizeCatalogRepository(BaseRepository):
    """Repository for catálogos de premios"""
    
    COLLECTION_NAME = "pinpanclub_prize_catalogs"
    ID_FIELD = "catalog_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["catalog_id"] = f"catalog_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_by_id(self, catalog_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: catalog_id})
    
    async def get_active_catalog(self) -> Optional[Dict]:
        return await self.find_one({"is_active": True})
    
    async def get_season_catalog(self, season_id: str) -> Optional[Dict]:
        return await self.find_one({"season_id": season_id, "is_active": True})
