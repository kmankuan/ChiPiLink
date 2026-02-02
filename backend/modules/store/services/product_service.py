"""
Store Module - Product Service
Lógica de negocio para productos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.events import event_bus, Event, EventPriority, StoreEvents
from ..repositories import ProductRepository
from ..models import ProductCreate, ProductUpdate, Product


class ProductService(BaseService):
    """
    Servicio para gestión de productos.
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
                "libro_id": result["libro_id"],
                "nombre": result["nombre"],
                "categoria": result.get("categoria")
            }
        )
        
        self.log_info(f"Product created: {result['libro_id']}")
        return Product(**result)
    
    async def get_product(self, libro_id: str) -> Optional[Product]:
        """Get producto por ID"""
        result = await self.repository.get_by_id(libro_id)
        return Product(**result) if result else None
    
    async def get_all_products(
        self,
        categoria: Optional[str] = None,
        grado: Optional[str] = None,
        materia: Optional[str] = None,
        skip: int = 0,
        limit: int = 500
    ) -> List[Product]:
        """Get productos activos"""
        results = await self.repository.get_all_active(
            categoria=categoria,
            grado=grado,
            materia=materia,
            skip=skip,
            limit=limit
        )
        return [Product(**r) for r in results]
    
    async def get_featured_products(
        self,
        categoria: Optional[str] = None,
        limit: int = 10
    ) -> List[Product]:
        """Get productos destacados"""
        results = await self.repository.get_featured(categoria, limit)
        return [Product(**r) for r in results]
    
    async def get_promotional_products(
        self,
        categoria: Optional[str] = None,
        limit: int = 10
    ) -> List[Product]:
        """Get productos en promoción"""
        results = await self.repository.get_promotions(categoria, limit)
        return [Product(**r) for r in results]
    
    async def get_newest_products(
        self,
        categoria: Optional[str] = None,
        limit: int = 8
    ) -> List[Product]:
        """Get productos más nuevos"""
        results = await self.repository.get_newest(categoria, limit)
        return [Product(**r) for r in results]
    
    async def search_products(self, query: str) -> List[Product]:
        """Search productos"""
        results = await self.repository.search(query)
        return [Product(**r) for r in results]
    
    async def update_product(
        self,
        libro_id: str,
        data: ProductUpdate
    ) -> Optional[Product]:
        """
        Actualizar producto.
        Emite evento: store.product.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_product(libro_id)
        
        success = await self.repository.update_product(libro_id, update_data)
        
        if success:
            await self.emit_event(
                StoreEvents.PRODUCT_UPDATED,
                {"libro_id": libro_id, "updated_fields": list(update_data.keys())}
            )
            return await self.get_product(libro_id)
        
        return None
    
    async def update_inventory(
        self,
        libro_id: str,
        cantidad: int
    ) -> Optional[Product]:
        """Update inventario del producto"""
        success = await self.repository.update_inventory(libro_id, cantidad)
        
        if success:
            product = await self.get_product(libro_id)
            
            # Check for low stock
            if product and product.cantidad_inventario < 10:
                await self.emit_event(
                    StoreEvents.PRODUCT_LOW_STOCK,
                    {
                        "libro_id": libro_id,
                        "nombre": product.nombre,
                        "cantidad": product.cantidad_inventario
                    },
                    priority=EventPriority.HIGH
                )
            
            return product
        
        return None
    
    async def decrement_inventory(self, libro_id: str, cantidad: int) -> bool:
        """Decrementar inventario (para pedidos)"""
        success = await self.repository.decrement_inventory(libro_id, cantidad)
        
        if success:
            product = await self.get_product(libro_id)
            if product and product.cantidad_inventario < 10:
                await self.emit_event(
                    StoreEvents.PRODUCT_LOW_STOCK,
                    {
                        "libro_id": libro_id,
                        "nombre": product.nombre,
                        "cantidad": product.cantidad_inventario
                    },
                    priority=EventPriority.HIGH
                )
        
        return success
    
    async def get_low_stock_products(self, threshold: int = 10) -> List[Product]:
        """Get productos con bajo stock"""
        results = await self.repository.get_low_stock(threshold)
        return [Product(**r) for r in results]
    
    async def deactivate_product(self, libro_id: str) -> bool:
        """Desactivar producto"""
        return await self.repository.deactivate(libro_id)
    
    async def get_inventory_stats(self) -> Dict:
        """Get estadísticas de inventario"""
        products = await self.repository.get_all_active()
        low_stock = await self.repository.get_low_stock()
        
        return {
            "total_productos": len(products),
            "productos_bajo_stock": len(low_stock),
            "alertas_bajo_stock": [
                {
                    "libro_id": p["libro_id"],
                    "nombre": p["nombre"],
                    "cantidad": p.get("cantidad_inventario", 0)
                }
                for p in low_stock
            ]
        }


# Instancia singleton del servicio
product_service = ProductService()
