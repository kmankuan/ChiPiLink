"""
Store Module - Category Routes
Endpoints for gestión de categorías usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from core.auth import get_admin_user
from ..models import Category, CategoryCreate
from ..services import category_service

router = APIRouter(prefix="/categories", tags=["Store - Categories"])


@router.get("", response_model=List[Category])
async def get_categories():
    """Get todas las categorías activas"""
    return await category_service.get_all_categories()


@router.get("/{categoria_id}", response_model=Category)
async def get_category(categoria_id: str):
    """Get categoría por ID"""
    category = await category_service.get_category(categoria_id)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return category


@router.get("/{categoria_id}/landing")
async def get_category_landing(categoria_id: str):
    """Get datos completos para landing de categoría"""
    return await category_service.get_category_landing(categoria_id)


@router.post("", response_model=Category)
async def create_category(
    data: CategoryCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nueva categoría (solo admin)"""
    return await category_service.create_category(data)


@router.put("/{categoria_id}", response_model=Category)
async def update_category(
    categoria_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update categoría (solo admin)"""
    category = await category_service.update_category(categoria_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    return category


@router.delete("/{categoria_id}")
async def delete_category(
    categoria_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete categoría - soft delete (solo admin)"""
    try:
        success = await category_service.delete_category(categoria_id)
        if not success:
            raise HTTPException(status_code=404, detail="Categoría no encontrada")
        return {"success": True, "message": "Categoría eliminada"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
