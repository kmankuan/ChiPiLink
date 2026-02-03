"""
Store Module - Product Service
Business logic para productos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.events import event_bus, Event, EventPriority, StoreEvents
from ..repositories import ProductRepository
from ..models import ProductCreate, ProductUpdate, Product


class ProductService(BaseService):
    """
    Service for management of productos.
    """
    
    MODULE_NAME = "store"
    
    def __init__(self):
        super().__init__()
        self.repository = ProductRepository()
    
    async def create_product(self, data: ProductCreate) -> Product:
        """
        Crear nuevo producto.
        Emite evento: store.product.created
        """
        product_dict = data.model_dump()
        result = await self.repository.create(product_dict)
        
        await self.emit_event(
            StoreEvents.PRODUCT_CREATED,
            {
                "book_id": result["book_id"],
                "name": result["name"],
                "category": result.get("category")
            }
        )
        
        self.log_info(f"Product created: {result['book_id']}")
        return Product(**result)
    
    async def get_product(self, book_id: str) -> Optional[Product]:
        """Get producto by ID"""
        result = await self.repository.get_by_id(book_id)
        return Product(**result) if result else None
    
    async def get_all_products(
        self,
        category: Optional[str] = None,
        grade: Optional[str] = None,
        subject: Optional[str] = None,
        skip: int = 0,
        limit: int = 500
    ) -> List[Product]:
        """Get productos activos"""
        results = await self.repository.get_all_active(
            category=category,
            grado=grade,
            materia=materia,
            skip=skip,
            limit=limit
        )
        return [Product(**r) for r in results]
    
    async def get_featured_products(
        self,
        category: Optional[str] = None,
        limit: int = 10
    ) -> List[Product]:
        """Get productos destacados"""
        results = await self.repository.get_featured(category, limit)
        return [Product(**r) for r in results]
    
    async def get_promotional_products(
        self,
        category: Optional[str] = None,
        limit: int = 10
    ) -> List[Product]:
        """Get productos en promotion"""
        results = await self.repository.get_promotions(category, limit)
        return [Product(**r) for r in results]
    
    async def get_newest_products(
        self,
        category: Optional[str] = None,
        limit: int = 8
    ) -> List[Product]:
        """Get productos more nuevos"""
        results = await self.repository.get_newest(category, limit)
        return [Product(**r) for r in results]
    
    async def search_products(self, query: str) -> List[Product]:
        """Search productos"""
        results = await self.repository.search(query)
        return [Product(**r) for r in results]
    
    async def update_product(
        self,
        book_id: str,
        data: ProductUpdate
    ) -> Optional[Product]:
        """
        Actualizar producto.
        Emite evento: store.product.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_product(book_id)
        
        success = await self.repository.update_product(book_id, update_data)
        
        if success:
            await self.emit_event(
                StoreEvents.PRODUCT_UPDATED,
                {"book_id": book_id, "updated_fields": list(update_data.keys())}
            )
            return await self.get_product(book_id)
        
        return None
    
    async def update_inventory(
        self,
        book_id: str,
        cantidad: int
    ) -> Optional[Product]:
        """Update inventario del producto"""
        success = await self.repository.update_inventory(book_id, cantidad)
        
        if success:
            product = await self.get_product(book_id)
            
            # Check for low stock
            if product and product.inventory_quantity < 10:
                await self.emit_event(
                    StoreEvents.PRODUCT_LOW_STOCK,
                    {
                        "book_id": book_id,
                        "name": product.name,
                        "cantidad": product.inventory_quantity
                    },
                    priority=EventPriority.HIGH
                )
            
            return product
        
        return None
    
    async def decrement_inventory(self, book_id: str, cantidad: int) -> bool:
        """Decrementar inventario (para pedidos)"""
        success = await self.repository.decrement_inventory(book_id, cantidad)
        
        if success:
            product = await self.get_product(book_id)
            if product and product.inventory_quantity < 10:
                await self.emit_event(
                    StoreEvents.PRODUCT_LOW_STOCK,
                    {
                        "book_id": book_id,
                        "name": product.name,
                        "cantidad": product.inventory_quantity
                    },
                    priority=EventPriority.HIGH
                )
        
        return success
    
    async def get_low_stock_products(self, threshold: int = 10) -> List[Product]:
        """Get productos con bajo stock"""
        results = await self.repository.get_low_stock(threshold)
        return [Product(**r) for r in results]
    
    async def deactivate_product(self, book_id: str) -> bool:
        """Desactivar producto"""
        return await self.repository.deactivate(book_id)
    
    async def get_inventory_stats(self) -> Dict:
        """Get statistics de inventario"""
        products = await self.repository.get_all_active()
        low_stock = await self.repository.get_low_stock()
        
        return {
            "total_productos": len(products),
            "productos_bajo_stock": len(low_stock),
            "alertas_bajo_stock": [
                {
                    "book_id": p["book_id"],
                    "name": p["name"],
                    "cantidad": p.get("inventory_quantity", 0)
                }
                for p in low_stock
            ]
        }


# Service singleton instance
product_service = ProductService()
