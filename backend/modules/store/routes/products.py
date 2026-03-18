"""
Store Module - Product Routes
Endpoints for product management using Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging

from core.auth import get_admin_user
from core.database import db
from ..models import Product, ProductCreate, ProductUpdate
from ..services import product_service

router = APIRouter(prefix="/products", tags=["Store - Products"])
logger = logging.getLogger(__name__)


@router.get("/admin/diagnostic")
async def diagnostic_products(
    admin: dict = Depends(get_admin_user)
):
    """
    Diagnostic endpoint to debug product loading issues.
    Returns sample products with all field names to identify data issues.
    """
    try:
        # Get raw products directly from DB to see actual field names
        raw_products = await db.store_products.find({}).limit(5).to_list(5)
        
        # Convert ObjectIds to strings
        samples = []
        for p in raw_products:
            p["_id"] = str(p["_id"]) if "_id" in p else None
            samples.append(p)
        
        # Get field statistics
        total = await db.store_products.count_documents({})
        with_name = await db.store_products.count_documents({"name": {"$exists": True, "$ne": None}})
        with_nombre = await db.store_products.count_documents({"nombre": {"$exists": True}})
        with_active_true = await db.store_products.count_documents({"active": True})
        with_active_false = await db.store_products.count_documents({"active": False})
        with_activo = await db.store_products.count_documents({"activo": {"$exists": True}})
        
        return {
            "total_products": total,
            "field_counts": {
                "has_name": with_name,
                "has_nombre_spanish": with_nombre,
                "active_true": with_active_true,
                "active_false": with_active_false,
                "has_activo_spanish": with_activo
            },
            "sample_products": samples,
            "sample_field_names": list(samples[0].keys()) if samples else []
        }
    except Exception as e:
        logger.error(f"Diagnostic error: {e}")
        import traceback
        return {
            "error": str(e),
            "traceback": traceback.format_exc()
        }


@router.get("")
async def get_products(
    category: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000)
):
    """Get active products with optional filters"""
    try:
        return await product_service.get_all_products(
            category=category,
            grade=grade,
            subject=subject,
            skip=skip,
            limit=limit
        )
    except Exception as e:
        logger.error(f"Error fetching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/featured")
async def get_featured_products(
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Get featured products"""
    try:
        return await product_service.get_featured_products(category, limit)
    except Exception as e:
        logger.error(f"Error fetching featured products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/promotions")
async def get_promotional_products(
    category: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Get promotional products"""
    try:
        return await product_service.get_promotional_products(category, limit)
    except Exception as e:
        logger.error(f"Error fetching promotional products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/newest")
async def get_newest_products(
    category: Optional[str] = None,
    limit: int = Query(8, ge=1, le=50)
):
    """Get newest products"""
    try:
        return await product_service.get_newest_products(category, limit)
    except Exception as e:
        logger.error(f"Error fetching newest products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_products(q: str = Query(..., min_length=2)):
    """Search products by name or description"""
    try:
        return await product_service.search_products(q)
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grades")
async def get_available_grades():
    """Get available grades for filtering"""
    try:
        grades_list = await db.store_products.distinct("grade", {"active": True})
        return {"grades": sorted([g for g in grades_list if g])}
    except Exception as e:
        logger.error(f"Error fetching grades: {e}")
        return {"grades": []}


@router.get("/subjects")
async def get_available_subjects():
    """Get available subjects for filtering"""
    try:
        subjects_list = await db.store_products.distinct("subject", {"active": True})
        return {"subjects": sorted([s for s in subjects_list if s])}
    except Exception as e:
        logger.error(f"Error fetching subjects: {e}")
        return {"subjects": []}


@router.get("/{book_id}")
async def get_product(book_id: str):
    """Get product by ID"""
    try:
        product = await product_service.get_product(book_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching product {book_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def create_product(
    data: ProductCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create new product (admin only)"""
    try:
        return await product_service.create_product(data)
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{book_id}")
async def update_product(
    book_id: str,
    data: ProductUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update product (admin only)"""
    try:
        product = await product_service.update_product(book_id, data)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating product {book_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{book_id}")
async def deactivate_product(
    book_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Deactivate product - soft delete (admin only)"""
    try:
        success = await product_service.deactivate_product(book_id)
        if not success:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"success": True, "message": "Product deactivated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deactivating product {book_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{book_id}/featured")
async def toggle_featured(
    book_id: str,
    featured: bool,
    orden: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Toggle product featured status (admin only)"""
    try:
        product = await product_service.update_product(
            book_id,
            ProductUpdate(featured=featured, featured_order=orden)
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling featured for {book_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{book_id}/promotion")
async def toggle_promotion(
    book_id: str,
    on_sale: bool,
    sale_price: Optional[float] = None,
    admin: dict = Depends(get_admin_user)
):
    """Toggle product promotion status (admin only)"""
    try:
        product = await product_service.update_product(
            book_id,
            ProductUpdate(on_sale=on_sale, sale_price=sale_price)
        )
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling promotion for {book_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
