"""
PinpanClub - Sponsor Repository
Acceso a datos de patrocinadores
"""
from typing import List, Optional, Dict
from core.base import BaseRepository
from core.database import db
import uuid


class SponsorRepository(BaseRepository):
    """
    Repository para patrocinadores de PinpanClub.
    """
    
    COLLECTION_NAME = "pinpanclub_sponsors"
    ID_FIELD = "sponsor_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, sponsor_data: Dict) -> Dict:
        """Crear nuevo patrocinador"""
        sponsor_data["sponsor_id"] = str(uuid.uuid4())
        sponsor_data["activo"] = True
        return await self.insert_one(sponsor_data)
    
    async def get_by_id(self, sponsor_id: str) -> Optional[Dict]:
        """Obtener patrocinador por ID"""
        return await self.find_by_id(self.ID_FIELD, sponsor_id)
    
    async def get_all_active(self) -> List[Dict]:
        """Obtener todos los patrocinadores activos"""
        return await self.find_many(
            query={"activo": True},
            sort=[("orden", 1)]
        )
    
    async def get_by_position(self, posicion: str) -> List[Dict]:
        """Obtener patrocinadores por posición"""
        return await self.find_many(
            query={"activo": True, "posicion": posicion},
            sort=[("orden", 1)]
        )
    
    async def update_sponsor(self, sponsor_id: str, data: Dict) -> bool:
        """Actualizar patrocinador"""
        return await self.update_by_id(self.ID_FIELD, sponsor_id, data)
    
    async def deactivate(self, sponsor_id: str) -> bool:
        """Desactivar patrocinador"""
        return await self.update_sponsor(sponsor_id, {"activo": False})
    
    async def reorder(self, sponsor_id: str, new_order: int) -> bool:
        """Cambiar orden de patrocinador"""
        return await self.update_sponsor(sponsor_id, {"orden": new_order})
