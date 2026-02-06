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


@router.get("/newest", response_model=List[Product])
async def get_newest_products(
    category: Optional[str] = None,
    limit: int = Query(8, ge=1, le=50)
):
    """Get productos more nuevos"""
    return await product_service.get_newest_products(category, limit)


@router.get("/search")
async def search_products(q: str = Query(..., min_length=2)):
    """Search productos by name o description"""
    return await product_service.search_products(q)


@router.get("/grades")
async def get_available_grades():
    """Get available grades for filtering"""
    grades_list = await db.store_products.distinct("grade", {"active": True})
    return {"grades": sorted([g for g in grades_list if g])}


@router.get("/subjects")
async def get_available_subjects():
    """Get available subjects for filtering"""
    subjects_list = await db.store_products.distinct("subject", {"active": True})
    return {"subjects": sorted([s for s in subjects_list if s])}


@router.get("/{book_id}", response_model=Product)
async def get_product(book_id: str):
    """Get producto by ID"""
    product = await product_service.get_product(book_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto not found")
    return product


@router.post("", response_model=Product)
async def create_product(
    data: ProductCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nuevo producto (solo admin)"""
    return await product_service.create_product(data)


@router.put("/{book_id}", response_model=Product)
async def update_product(
    book_id: str,
    data: ProductUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update producto (solo admin)"""
    product = await product_service.update_product(book_id, data)
    if not product:
        raise HTTPException(status_code=404, detail="Producto not found")
    return product


@router.delete("/{book_id}")
async def deactivate_product(
    book_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Desactivar producto - soft delete (solo admin)"""
    success = await product_service.deactivate_product(book_id)
    if not success:
        raise HTTPException(status_code=404, detail="Producto not found")
    return {"success": True, "message": "Producto desactivado"}


@router.put("/{book_id}/featured")
async def toggle_featured(
    book_id: str,
    featured: bool,
    orden: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Marcar/desmarcar producto como destacado (solo admin)"""
    product = await product_service.update_product(
        book_id,
        ProductUpdate(destacado=destacado, featured_order=orden)
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto not found")
    return {"success": True}


@router.put("/{book_id}/promotion")
async def toggle_promotion(
    book_id: str,
    on_sale: bool,
    sale_price: Optional[float] = None,
    admin: dict = Depends(get_admin_user)
):
    """Marcar/desmarcar producto en promotion (solo admin)"""
    product = await product_service.update_product(
        book_id,
        ProductUpdate(on_sale=on_sale, sale_price=sale_price)
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto not found")
    return {"success": True}
