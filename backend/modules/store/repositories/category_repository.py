"""
Store Module - Category Repository
Acceso a datos de categorys
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import StoreCollections


class CategoryRepository(BaseRepository):
    """
    Repository para categorys de productos.
    """
    
    COLLECTION_NAME = StoreCollections.CATEGORIES
    ID_FIELD = "category_id"
    
    # Default categories
    DEFAULT_CATEGORIES = [
        {"category_id": "libros", "name": "Libros", "icono": "📚", "orden": 1, "active": True},
        {"category_id": "snacks", "name": "Snacks", "icono": "🍫", "orden": 2, "active": True},
        {"category_id": "bebidas", "name": "Bebidas", "icono": "🥤", "orden": 3, "active": True},
        {"category_id": "preparados", "name": "Preparados", "icono": "🌭", "orden": 4, "active": True},
        {"category_id": "uniformes", "name": "Uniformes", "icono": "👕", "orden": 5, "active": True},
        {"category_id": "servicios", "name": "Servicios", "icono": "🔧", "orden": 6, "active": True},
    ]
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, category_data: Dict) -> Dict:
        """Create nueva category"""
        if not category_data.get("category_id"):
            category_data["category_id"] = f"cat_{uuid.uuid4().hex[:8]}"
        category_data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(category_data)
    
    async def get_by_id(self, category_id: str) -> Optional[Dict]:
        """Get category by ID"""
        return await self.find_by_id(self.ID_FIELD, category_id)
    
    async def get_all_active(self) -> List[Dict]:
        """Get all categorys activas"""
        categories = await self.find_many(
            query={"active": True},
            sort=[("orden", 1)]
        )
        # Return defaults if no categories exist
        if not categories:
            return self.DEFAULT_CATEGORIES
        return categories
    
    async def update_category(self, category_id: str, data: Dict) -> bool:
        """Update category"""
        return await self.update_by_id(self.ID_FIELD, category_id, data)
    
    async def deactivate(self, category_id: str) -> bool:
        """Desactivar category"""
        return await self.update_category(category_id, {"active": False})
    
    async def count_products(self, category_id: str) -> int:
        """Contar productos en una category"""
        return await db[StoreCollections.PRODUCTS].count_documents({
            "category": category_id,
            "active": True
        })
