"""
Store Module - Product Routes
Endpoints para gestión de productos usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_admin_user
from ..models import Product, ProductCreate, ProductUpdate
from ..services import product_service

router = APIRouter(prefix="/products", tags=["Store - Products"])


@router.get("", response_model=List[Product])
async def get_products(
    categoria: Optional[str] = None,
    grado: Optional[str] = None,
    materia: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(500, ge=1, le=1000)
):
    """Obtener productos activos con filtros opcionales"""
    return await product_service.get_all_products(
        categoria=categoria,
        grado=grado,
        materia=materia,
        skip=skip,
        limit=limit
    )


@router.get("/featured", response_model=List[Product])
async def get_featured_products(
    categoria: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Obtener productos destacados"""
    return await product_service.get_featured_products(categoria, limit)


@router.get("/promotions", response_model=List[Product])
async def get_promotional_products(
    categoria: Optional[str] = None,
    limit: int = Query(10, ge=1, le=50)
):
    """Obtener productos en promoción"""
    return await product_service.get_promotional_products(categoria, limit)


@router.get("/newest", response_model=List[Product])
async def get_newest_products(
    categoria: Optional[str] = None,
    limit: int = Query(8, ge=1, le=50)
):
    """Obtener productos más nuevos"""
    return await product_service.get_newest_products(categoria, limit)


@router.get("/search")
async def search_products(q: str = Query(..., min_length=2)):
    """Buscar productos por nombre o descripción"""
    return await product_service.search_products(q)


@router.get("/{libro_id}", response_model=Product)
async def get_product(libro_id: str):
    """Obtener producto por ID"""
    product = await product_service.get_product(libro_id)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.post("", response_model=Product)
async def create_product(
    data: ProductCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear nuevo producto (solo admin)"""
    return await product_service.create_product(data)


@router.put("/{libro_id}", response_model=Product)
async def update_product(
    libro_id: str,
    data: ProductUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar producto (solo admin)"""
    product = await product_service.update_product(libro_id, data)
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return product


@router.delete("/{libro_id}")
async def deactivate_product(
    libro_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Desactivar producto - soft delete (solo admin)"""
    success = await product_service.deactivate_product(libro_id)
    if not success:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True, "message": "Producto desactivado"}


@router.put("/{libro_id}/featured")
async def toggle_featured(
    libro_id: str,
    destacado: bool,
    orden: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Marcar/desmarcar producto como destacado (solo admin)"""
    product = await product_service.update_product(
        libro_id,
        ProductUpdate(destacado=destacado, orden_destacado=orden)
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}


@router.put("/{libro_id}/promotion")
async def toggle_promotion(
    libro_id: str,
    en_promocion: bool,
    precio_oferta: Optional[float] = None,
    admin: dict = Depends(get_admin_user)
):
    """Marcar/desmarcar producto en promoción (solo admin)"""
    product = await product_service.update_product(
        libro_id,
        ProductUpdate(en_promocion=en_promocion, precio_oferta=precio_oferta)
    )
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}
