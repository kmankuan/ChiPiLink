"""
PinpanClub - Config Repository
Acceso a datos de configuración
"""
from typing import Optional, Dict, Any
from core.base import BaseRepository
from core.database import db
from core.constants import CoreCollections, PinpanClubCollections
import uuid


class ConfigRepository(BaseRepository):
    """
    Repository para configuración de PinpanClub.
    Maneja configuraciones de Monday.com, layouts, etc.
    """
    
    COLLECTION_NAME = CoreCollections.APP_CONFIG
    ID_FIELD = "config_key"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def get_config(self, config_key: str) -> Optional[Dict]:
        """Get configuración por clave"""
        doc = await self.find_one({"config_key": config_key})
        return doc.get("value") if doc else None
    
    async def set_config(self, config_key: str, value: Any) -> bool:
        """Save configuración"""
        return await self.update_one(
            {"config_key": config_key},
            {"$set": {"config_key": config_key, "value": value}},
            upsert=True
        )
    
    async def get_monday_config(self) -> Dict:
        """Get configuración de Monday.com"""
        config = await self.get_config("monday_integration")
        return config or {
            "players_board_id": None,
            "matches_board_id": None,
            "tournaments_board_id": None,
            "auto_sync_players": False,
            "auto_sync_matches": True,
            "auto_sync_results": True
        }
    
    async def set_monday_config(self, config: Dict) -> bool:
        """Save configuración de Monday.com"""
        return await self.set_config("monday_integration", config)


class LayoutRepository(BaseRepository):
    """
    Repository para layouts del canvas.
    """
    
    COLLECTION_NAME = PinpanClubCollections.LAYOUTS
    ID_FIELD = "layout_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, layout_data: Dict) -> Dict:
        """Create nuevo layout"""
        layout_data["layout_id"] = str(uuid.uuid4())
        return await self.insert_one(layout_data)
    
    async def get_by_id(self, layout_id: str) -> Optional[Dict]:
        """Get layout por ID"""
        return await self.find_by_id(self.ID_FIELD, layout_id)
    
    async def get_default(self) -> Optional[Dict]:
        """Get layout por defecto"""
        return await self.find_one({"is_default": True})
    
    async def update_layout(self, layout_id: str, data: Dict) -> bool:
        """Update layout"""
        return await self.update_by_id(self.ID_FIELD, layout_id, data)
    
    async def set_default(self, layout_id: str) -> bool:
        """Establecer layout como default"""
        # Quitar default de otros
        await self._collection.update_many(
            {"is_default": True},
            {"$set": {"is_default": False}}
        )
        # Establecer nuevo default
        return await self.update_layout(layout_id, {"is_default": True})
