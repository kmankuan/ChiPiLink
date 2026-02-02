"""
Community Module - Album Repository
Acceso a datos de álbumes de galería
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import CommunityCollections


class AlbumRepository(BaseRepository):
    """
    Repository para álbumes de galería.
    """
    
    COLLECTION_NAME = CommunityCollections.ALBUMS
    ID_FIELD = "album_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, album_data: Dict) -> Dict:
        """Create nuevo álbum"""
        album_data["album_id"] = f"album_{uuid.uuid4().hex[:12]}"
        album_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(album_data)
    
    async def get_by_id(self, album_id: str) -> Optional[Dict]:
        """Get álbum by ID"""
        return await self.find_one({self.ID_FIELD: album_id})
    
    async def get_active_albums(self, limit: int = 50) -> List[Dict]:
        """Get álbumes activos"""
        return await self.find_many(
            query={"activo": True},
            limit=limit,
            sort=[("orden", 1)]
        )
    
    async def get_all_albums(self, limit: int = 100) -> List[Dict]:
        """Get todos los álbumes (admin)"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("orden", 1)]
        )
    
    async def update_album(self, album_id: str, data: Dict) -> bool:
        """Update álbum"""
        return await self.update_by_id(self.ID_FIELD, album_id, data)
    
    async def delete_album(self, album_id: str) -> bool:
        """Delete álbum"""
        return await self.delete_by_id(self.ID_FIELD, album_id)
