"""
Store Module - Product Repository
Acceso a datos de productos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class ProductRepository(BaseRepository):
    """
    Repository para productos de la tienda.
    """
    
    COLLECTION_NAME = "libros"
    ID_FIELD = "libro_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, product_data: Dict) -> Dict:
        """Crear nuevo producto"""
        product_data["libro_id"] = f"libro_{uuid.uuid4().hex[:12]}"
        product_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(product_data)
    
    async def get_by_id(self, libro_id: str) -> Optional[Dict]:
        """Obtener producto por ID"""
        return await self.find_by_id(self.ID_FIELD, libro_id)
    
    async def get_all_active(
        self,
        categoria: Optional[str] = None,
        grado: Optional[str] = None,
        materia: Optional[str] = None,
        skip: int = 0,
        limit: int = 500
    ) -> List[Dict]:
        """Obtener productos activos con filtros opcionales"""
        query = {"activo": True}
        
        if categoria:
            query["categoria"] = categoria
        
        if grado:
            query["$or"] = [{"grado": grado}, {"grados": grado}]
        
        if materia:
            query["materia"] = materia
        
        return await self.find_many(query=query, skip=skip, limit=limit)
    
    async def get_by_category(self, categoria: str, limit: int = 100) -> List[Dict]:
        """Obtener productos por categoría"""
        return await self.find_many(
            query={"categoria": categoria, "activo": True},
            limit=limit
        )
    
    async def get_featured(self, categoria: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Obtener productos destacados"""
        query = {"destacado": True, "activo": True}
        if categoria:
            query["categoria"] = categoria
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("orden_destacado", 1)]
        )
    
    async def get_promotions(self, categoria: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Obtener productos en promoción"""
        query = {
            "en_promocion": True,
            "activo": True,
            "precio_oferta": {"$ne": None}
        }
        if categoria:
            query["categoria"] = categoria
        return await self.find_many(query=query, limit=limit)
    
    async def get_newest(self, categoria: Optional[str] = None, limit: int = 8) -> List[Dict]:
        """Obtener productos más nuevos"""
        query = {"activo": True}
        if categoria:
            query["categoria"] = categoria
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("fecha_creacion", -1)]
        )
    
    async def search(self, query_text: str, limit: int = 50) -> List[Dict]:
        """Buscar productos"""
        return await self.find_many(
            query={
                "$or": [
                    {"nombre": {"$regex": query_text, "$options": "i"}},
                    {"descripcion": {"$regex": query_text, "$options": "i"}}
                ],
                "activo": True
            },
            limit=limit
        )
    
    async def update_product(self, libro_id: str, data: Dict) -> bool:
        """Actualizar producto"""
        return await self.update_by_id(self.ID_FIELD, libro_id, data)
    
    async def update_inventory(self, libro_id: str, cantidad: int) -> bool:
        """Actualizar inventario"""
        return await self.update_product(libro_id, {"cantidad_inventario": cantidad})
    
    async def decrement_inventory(self, libro_id: str, cantidad: int) -> bool:
        """Decrementar inventario"""
        result = await self._collection.update_one(
            {self.ID_FIELD: libro_id},
            {"$inc": {"cantidad_inventario": -cantidad}}
        )
        return result.modified_count > 0
    
    async def get_low_stock(self, threshold: int = 10) -> List[Dict]:
        """Obtener productos con bajo stock"""
        return await self.find_many(
            query={
                "activo": True,
                "cantidad_inventario": {"$lt": threshold}
            }
        )
    
    async def deactivate(self, libro_id: str) -> bool:
        """Desactivar producto (soft delete)"""
        return await self.update_product(libro_id, {"activo": False})
