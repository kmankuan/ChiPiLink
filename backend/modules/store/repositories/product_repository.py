"""
Store Module - Product Repository
Acceso a datos de productos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import StoreCollections


class ProductRepository(BaseRepository):
    """
    Repository para productos de la tienda.
    """
    
    COLLECTION_NAME = StoreCollections.PRODUCTS
    ID_FIELD = "book_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, product_data: Dict) -> Dict:
        """Create nuevo producto"""
        product_data["book_id"] = f"libro_{uuid.uuid4().hex[:12]}"
        product_data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(product_data)
    
    async def get_by_id(self, book_id: str) -> Optional[Dict]:
        """Get producto by ID"""
        return await self.find_by_id(self.ID_FIELD, book_id)
    
    async def get_all_active(
        self,
        category: Optional[str] = None,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
        skip: int = 0,
        limit: int = 500
    ) -> List[Dict]:
        """Get active products with optional filters"""
        query = {"active": True}
        
        if category:
            query["category"] = category
        
        if grade:
            query["$or"] = [{"grade": grade}, {"grades": grade}]
        
        if subject:
            query["subject"] = subject
        
        return await self.find_many(query=query, skip=skip, limit=limit)
    
    async def get_by_category(self, category: str, limit: int = 100) -> List[Dict]:
        """Get productos por category"""
        return await self.find_many(
            query={"category": category, "active": True},
            limit=limit
        )
    
    async def get_featured(self, category: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get productos destacados"""
        query = {"featured": True, "active": True}
        if category:
            query["category"] = category
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("featured_order", 1)]
        )
    
    async def get_promotions(self, category: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """Get productos en promotion"""
        query = {
            "on_sale": True,
            "active": True,
            "sale_price": {"$ne": None}
        }
        if category:
            query["category"] = category
        return await self.find_many(query=query, limit=limit)
    
    async def get_newest(self, category: Optional[str] = None, limit: int = 8) -> List[Dict]:
        """Get productos more nuevos"""
        query = {"active": True}
        if category:
            query["category"] = category
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def search(self, query_text: str, limit: int = 50) -> List[Dict]:
        """Search productos"""
        return await self.find_many(
            query={
                "$or": [
                    {"name": {"$regex": query_text, "$options": "i"}},
                    {"description": {"$regex": query_text, "$options": "i"}}
                ],
                "active": True
            },
            limit=limit
        )
    
    async def update_product(self, book_id: str, data: Dict) -> bool:
        """Update producto"""
        return await self.update_by_id(self.ID_FIELD, book_id, data)
    
    async def update_inventory(self, book_id: str, cantidad: int) -> bool:
        """Update inventario"""
        return await self.update_product(book_id, {"inventory_quantity": cantidad})
    
    async def decrement_inventory(self, book_id: str, cantidad: int) -> bool:
        """Decrementar inventario"""
        result = await self._collection.update_one(
            {self.ID_FIELD: book_id},
            {"$inc": {"inventory_quantity": -cantidad}}
        )
        return result.modified_count > 0
    
    async def get_low_stock(self, threshold: int = 10) -> List[Dict]:
        """Get productos con bajo stock"""
        return await self.find_many(
            query={
                "active": True,
                "inventory_quantity": {"$lt": threshold}
            }
        )
    
    async def deactivate(self, book_id: str) -> bool:
        """Desactivar producto (soft delete)"""
        return await self.update_product(book_id, {"active": False})
