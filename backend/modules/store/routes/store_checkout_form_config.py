"""
Store Checkout Form Configuration Routes
API endpoints for managing public store checkout form fields
Reuses the same form config pattern as textbook order forms
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List

from core.auth import get_current_user, get_admin_user
from ..services.store_checkout_form_service import store_checkout_form_service
from ..models.order_form_config import CreateFieldRequest, UpdateFieldRequest

router = APIRouter(prefix="/checkout-form-config", tags=["Platform Store - Checkout Form Config"])


# ============== PUBLIC ENDPOINTS ==============

@router.get("/fields")
async def get_form_fields(current_user: dict = Depends(get_current_user)):
    """Get active checkout form fields for the public store"""
    fields = await store_checkout_form_service.get_fields(include_inactive=False)
    return {"fields": fields}


@router.get("/field-types")
async def get_field_types():
    """Get available field types"""
    types = await store_checkout_form_service.get_field_types()
    return {"types": types}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/fields")
async def get_all_fields(
    include_inactive: bool = False,
    current_user: dict = Depends(get_admin_user)
):
    """Get all checkout form fields including inactive (admin only)"""
    fields = await store_checkout_form_service.get_fields(include_inactive=include_inactive)
    return {"fields": fields}


@router.post("/admin/fields")
async def create_field(
    field_data: CreateFieldRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Create a new checkout form field (admin only)"""
    field = await store_checkout_form_service.add_field(field_data)
    return {"field": field, "message": "Field created successfully"}


@router.put("/admin/fields/{field_id}")
async def update_field(
    field_id: str,
    field_data: UpdateFieldRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Update a checkout form field (admin only)"""
    field = await store_checkout_form_service.update_field(field_id, field_data)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"field": field, "message": "Field updated successfully"}


@router.delete("/admin/fields/{field_id}")
async def delete_field(
    field_id: str,
    hard_delete: bool = False,
    current_user: dict = Depends(get_admin_user)
):
    """Delete a checkout form field (admin only)"""
    if hard_delete:
        success = await store_checkout_form_service.hard_delete_field(field_id)
    else:
        success = await store_checkout_form_service.delete_field(field_id)
    if not success:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"message": "Field deleted successfully"}
