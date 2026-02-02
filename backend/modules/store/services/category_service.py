"""
Store Module - Category Service
Business logic para categorías
"""
from typing import List, Optional, Dict

from core.base import BaseService
from ..repositories import CategoryRepository, ProductRepository
from ..models import CategoryCreate, Category


class CategoryService(BaseService):
    """
    Service for management of categorías.
    """
    
    MODULE_NAME = "store"
    
    def __init__(self):
        super().__init__()
        self.repository = CategoryRepository()
        self.product_repository = ProductRepository()
    
    async def create_category(self, data: CategoryCreate) -> Category:
        """Create nueva categoría"""
        category_dict = data.model_dump()
        result = await self.repository.create(category_dict)
        self.log_info(f"Category created: {result['categoria_id']}")
        return Category(**result)
    
    async def get_category(self, categoria_id: str) -> Optional[Category]:
        """Get categoría by ID"""
        result = await self.repository.get_by_id(categoria_id)
        return Category(**result) if result else None
    
    async def get_all_categories(self) -> List[Category]:
        """Get todas las categorías activas"""
        results = await self.repository.get_all_active()
        return [Category(**r) for r in results]
    
    async def update_category(
        self,
        categoria_id: str,
        data: Dict
    ) -> Optional[Category]:
        """Update categoría"""
        # Remove campos nulos
        update_data = {k: v for k, v in data.items() if v is not None}
        
        if not update_data:
            return await self.get_category(categoria_id)
        
        success = await self.repository.update_category(categoria_id, update_data)
        
        if success:
            return await self.get_category(categoria_id)
        
        return None
    
    async def delete_category(self, categoria_id: str) -> bool:
        """
        Eliminar categoría (soft delete).
        Verifica that does not tenga productos activos.
        """
        # Verify productos
        product_count = await self.repository.count_products(categoria_id)
        if product_count > 0:
            raise ValueError(f"No se puede eliminar. Hay {product_count} productos en esta categoría.")
        
        return await self.repository.deactivate(categoria_id)
    
    async def get_category_landing(self, categoria_id: str) -> Dict:
        """Get datos completos para landing de categoría"""
        category = await self.get_category(categoria_id)
        
        # Get productos
        featured = await self.product_repository.get_featured(categoria_id)
        promotions = await self.product_repository.get_promotions(categoria_id)
        newest = await self.product_repository.get_newest(categoria_id)
        total = await self.product_repository.count({"categoria": categoria_id, "activo": True})
        
        return {
            "categoria": category.model_dump() if category else None,
            "destacados": featured,
            "promociones": promotions,
            "novedades": newest,
            "total_productos": total
        }


# Instancia singleton del servicio
category_service = CategoryService()
