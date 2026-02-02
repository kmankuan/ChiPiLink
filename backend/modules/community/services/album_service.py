"""
Community Module - Album Service
Business logic para álbumes de galería
"""
from typing import List, Optional

from core.base import BaseService
from ..repositories import AlbumRepository
from ..models import Album, AlbumCreate, AlbumUpdate


class AlbumService(BaseService):
    """
    Service for management of álbumes de galería.
    """
    
    MODULE_NAME = "community"
    
    def __init__(self):
        super().__init__()
        self.repository = AlbumRepository()
    
    async def get_active_albums(self, limit: int = 50) -> List[Album]:
        """Get álbumes activos"""
        results = await self.repository.get_active_albums(limit=limit)
        return [Album(**r) for r in results]
    
    async def get_album(self, album_id: str) -> Optional[Album]:
        """Get álbum by ID"""
        result = await self.repository.get_by_id(album_id)
        return Album(**result) if result else None
    
    async def get_all_albums(self, limit: int = 100) -> List[Album]:
        """Get todos los álbumes (admin)"""
        results = await self.repository.get_all_albums(limit=limit)
        return [Album(**r) for r in results]
    
    async def create_album(self, data: AlbumCreate) -> Album:
        """Create nuevo álbum"""
        album_dict = data.model_dump()
        result = await self.repository.create(album_dict)
        self.log_info(f"Album created: {result['album_id']}")
        return Album(**result)
    
    async def update_album(self, album_id: str, data: AlbumUpdate) -> Optional[Album]:
        """Update álbum"""
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_album(album_id)
        
        success = await self.repository.update_album(album_id, update_data)
        
        if success:
            return await self.get_album(album_id)
        
        return None
    
    async def delete_album(self, album_id: str) -> bool:
        """Delete álbum"""
        return await self.repository.delete_album(album_id)


# Instancia singleton del servicio
album_service = AlbumService()
