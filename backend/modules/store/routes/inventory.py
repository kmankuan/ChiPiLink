"""
Store Module - Inventory Routes
Endpoints for management of inventario usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List

from core.auth import get_admin_user
from ..models import Product
from ..services import product_service

router = APIRouter(prefix="/inventory", tags=["Store - Inventory"])


@router.get("")
async def get_inventory(admin: dict = Depends(get_admin_user)):
    """Get status of the inventario (admin)"""
    return await product_service.get_inventory_stats()


@router.get("/low-stock", response_model=List[Product])
async def get_low_stock(
    threshold: int = Query(10, ge=1, le=100),
    admin: dict = Depends(get_admin_user)
):
    """Get productos con bajo stock (admin)"""
    return await product_service.get_low_stock_products(threshold)


@router.put("/{book_id}")
async def update_inventory(
    book_id: str,
    cantidad: int,
    admin: dict = Depends(get_admin_user)
):
    """Update inventario de un producto (admin)"""
    product = await product_service.update_inventory(book_id, cantidad)
    if not product:
        raise HTTPException(status_code=404, detail="Producto not found")
    return {
        "success": True,
        "book_id": book_id,
        "nueva_cantidad": cantidad
    }
