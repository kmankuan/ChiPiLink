"""
Store Module - Category Routes
Endpoints for management of categorys usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from core.auth import get_admin_user
from ..models import Category, CategoryCreate
from ..services import category_service

router = APIRouter(prefix="/categories", tags=["Store - Categories"])


@router.get("", response_model=List[Category])
async def get_categories():
    """Get all categorys activas"""
    return await category_service.get_all_categories()


@router.get("/{category_id}", response_model=Category)
async def get_category(category_id: str):
    """Get category by ID"""
    category = await category_service.get_category(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.get("/{category_id}/landing")
async def get_category_landing(category_id: str):
    """Get datos completos para landing de category"""
    return await category_service.get_category_landing(category_id)


@router.post("", response_model=Category)
async def create_category(
    data: CategoryCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nueva category (solo admin)"""
    return await category_service.create_category(data)


@router.put("/{category_id}", response_model=Category)
async def update_category(
    category_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update category (solo admin)"""
    category = await category_service.update_category(category_id, data)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.delete("/{category_id}")
async def delete_category(
    category_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete category - soft delete (solo admin)"""
    try:
        success = await category_service.delete_category(category_id)
        if not success:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"success": True, "message": "Category eliminada"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
