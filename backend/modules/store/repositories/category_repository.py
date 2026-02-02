"""
Store Module - Category Repository
Acceso a datos de categorías
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import StoreCollections


class CategoryRepository(BaseRepository):
    """
    Repository para categorías de productos.
    """
    
    COLLECTION_NAME = StoreCollections.CATEGORIES
    ID_FIELD = "categoria_id"
    
    # Default categories
    DEFAULT_CATEGORIES = [
        {"categoria_id": "libros", "nombre": "Libros", "icono": "📚", "orden": 1, "activo": True},
        {"categoria_id": "snacks", "nombre": "Snacks", "icono": "🍫", "orden": 2, "activo": True},
        {"categoria_id": "bebidas", "nombre": "Bebidas", "icono": "🥤", "orden": 3, "activo": True},
        {"categoria_id": "preparados", "nombre": "Preparados", "icono": "🌭", "orden": 4, "activo": True},
        {"categoria_id": "uniformes", "nombre": "Uniformes", "icono": "👕", "orden": 5, "activo": True},
        {"categoria_id": "servicios", "nombre": "Servicios", "icono": "🔧", "orden": 6, "activo": True},
    ]
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, category_data: Dict) -> Dict:
        """Create nueva categoría"""
        if not category_data.get("categoria_id"):
            category_data["categoria_id"] = f"cat_{uuid.uuid4().hex[:8]}"
        category_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(category_data)
    
    async def get_by_id(self, categoria_id: str) -> Optional[Dict]:
        """Get categoría por ID"""
        return await self.find_by_id(self.ID_FIELD, categoria_id)
    
    async def get_all_active(self) -> List[Dict]:
        """Get todas las categorías activas"""
        categories = await self.find_many(
            query={"activo": True},
            sort=[("orden", 1)]
        )
        # Return defaults if no categories exist
        if not categories:
            return self.DEFAULT_CATEGORIES
        return categories
    
    async def update_category(self, categoria_id: str, data: Dict) -> bool:
        """Update categoría"""
        return await self.update_by_id(self.ID_FIELD, categoria_id, data)
    
    async def deactivate(self, categoria_id: str) -> bool:
        """Desactivar categoría"""
        return await self.update_category(categoria_id, {"activo": False})
    
    async def count_products(self, categoria_id: str) -> int:
        """Contar productos en una categoría"""
        return await db[StoreCollections.PRODUCTS].count_documents({
            "categoria": categoria_id,
            "activo": True
        })
