"""
Community Module - Event Repository
Acceso a datos de eventos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class EventRepository(BaseRepository):
    """
    Repository para eventos de comunidad.
    """
    
    COLLECTION_NAME = "community_events"
    ID_FIELD = "evento_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, event_data: Dict) -> Dict:
        """Create nuevo evento"""
        event_data["evento_id"] = f"evento_{uuid.uuid4().hex[:12]}"
        event_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        event_data["estado"] = event_data.get("estado", "programado")
        event_data["inscripciones"] = []
        return await self.insert_one(event_data)
    
    async def get_by_id(self, evento_id: str) -> Optional[Dict]:
        """Get evento by ID"""
        return await self.find_one({self.ID_FIELD: evento_id})
    
    async def get_upcoming_events(self, limit: int = 10) -> List[Dict]:
        """Get eventos next"""
        now = datetime.now(timezone.utc).isoformat()
        return await self.find_many(
            query={
                "fecha_inicio": {"$gte": now},
                "estado": {"$ne": "cancelado"}
            },
            limit=limit,
            sort=[("destacado", -1), ("fecha_inicio", 1)]
        )
    
    async def get_past_events(self, limit: int = 10) -> List[Dict]:
        """Get eventos pasados"""
        now = datetime.now(timezone.utc).isoformat()
        return await self.find_many(
            query={
                "fecha_inicio": {"$lt": now},
                "estado": {"$ne": "cancelado"}
            },
            limit=limit,
            sort=[("fecha_inicio", -1)]
        )
    
    async def get_all_events(self, limit: int = 100) -> List[Dict]:
        """Get todos los eventos (admin)"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("fecha_inicio", -1)]
        )
    
    async def update_event(self, evento_id: str, data: Dict) -> bool:
        """Update evento"""
        return await self.update_by_id(self.ID_FIELD, evento_id, data)
    
    async def add_inscription(self, evento_id: str, inscription: Dict) -> bool:
        """Agregar registration a evento"""
        result = await self._collection.update_one(
            {"evento_id": evento_id},
            {"$push": {"inscripciones": inscription}}
        )
        return result.modified_count > 0
    
    async def delete_event(self, evento_id: str) -> bool:
        """Delete evento"""
        return await self.delete_by_id(self.ID_FIELD, evento_id)
