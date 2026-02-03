"""
Store Module - Category Service
Business logic para categorys
"""
from typing import List, Optional, Dict

from core.base import BaseService
from ..repositories import CategoryRepository, ProductRepository
from ..models import CategoryCreate, Category


class CategoryService(BaseService):
    """
    Service for management of categorys.
    """
    
    MODULE_NAME = "store"
    
    def __init__(self):
        super().__init__()
        self.repository = CategoryRepository()
        self.product_repository = ProductRepository()
    
    async def create_category(self, data: CategoryCreate) -> Category:
        """Create nueva category"""
        category_dict = data.model_dump()
        result = await self.repository.create(category_dict)
        self.log_info(f"Category created: {result['category_id']}")
        return Category(**result)
    
    async def get_category(self, category_id: str) -> Optional[Category]:
        """Get category by ID"""
        result = await self.repository.get_by_id(category_id)
        return Category(**result) if result else None
    
    async def get_all_categories(self) -> List[Category]:
        """Get all categorys activas"""
        results = await self.repository.get_all_active()
        return [Category(**r) for r in results]
    
    async def update_category(
        self,
        category_id: str,
        data: Dict
    ) -> Optional[Category]:
        """Update category"""
        # Remove campos nulos
        update_data = {k: v for k, v in data.items() if v is not None}
        
        if not update_data:
            return await self.get_category(category_id)
        
        success = await self.repository.update_category(category_id, update_data)
        
        if success:
            return await self.get_category(category_id)
        
        return None
    
    async def delete_category(self, category_id: str) -> bool:
        """
        Eliminar category (soft delete).
        Verifica that does not tenga productos activos.
        """
        # Verify productos
        product_count = await self.repository.count_products(category_id)
        if product_count > 0:
            raise ValueError(f"No se puede eliminar. Hay {product_count} productos en esta category.")
        
        return await self.repository.deactivate(category_id)
    
    async def get_category_landing(self, category_id: str) -> Dict:
        """Get datos completos para landing de category"""
        category = await self.get_category(category_id)
        
        # Get productos
        featured = await self.product_repository.get_featured(category_id)
        promotions = await self.product_repository.get_promotions(category_id)
        newest = await self.product_repository.get_newest(category_id)
        total = await self.product_repository.count({"category": category_id, "active": True})
        
        return {
            "category": category.model_dump() if category else None,
            "destacados": featured,
            "promociones": promotions,
            "novedades": newest,
            "total_productos": total
        }


# Service singleton instance
category_service = CategoryService()
