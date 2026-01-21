"""
Form Configuration Routes
API endpoints for managing dynamic form configurations
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.auth import get_admin_user
from ..models.form_config import (
    FormFieldCreate, FormFieldUpdate, ReorderFieldsRequest
)
from ..services.form_config_service import form_config_service

router = APIRouter(prefix="/form-config", tags=["Store - Form Configuration"])


# ============== PUBLIC ENDPOINTS ==============

@router.get("/{form_type}")
async def get_form_config(form_type: str):
    """
    Get form configuration for a specific form type.
    Returns all active fields with their configurations.
    Public endpoint - used by forms to render fields.
    """
    result = await form_config_service.get_form_fields(form_type, include_inactive=False)
    return result


@router.get("/{form_type}/field-types")
async def get_field_types():
    """Get available field types for form configuration"""
    return {"field_types": form_config_service.get_field_types()}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/{form_type}")
async def get_form_config_admin(
    form_type: str,
    include_inactive: bool = Query(False, description="Include inactive fields"),
    admin: dict = Depends(get_admin_user)
):
    """
    Get form configuration with all fields (admin view).
    Includes inactive fields when requested.
    """
    result = await form_config_service.get_form_fields(form_type, include_inactive)
    return result


@router.post("/admin/{form_type}/fields")
async def create_form_field(
    form_type: str,
    data: FormFieldCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new form field"""
    try:
        result = await form_config_service.create_field(
            form_type=form_type,
            data=data,
            admin_id=admin["user_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/fields/{field_id}")
async def update_form_field(
    field_id: str,
    data: FormFieldUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a form field"""
    try:
        result = await form_config_service.update_field(
            field_id=field_id,
            data=data,
            admin_id=admin["user_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/fields/{field_id}")
async def delete_form_field(
    field_id: str,
    hard: bool = Query(False, description="Permanently delete the field"),
    admin: dict = Depends(get_admin_user)
):
    """Delete a form field (soft delete by default)"""
    try:
        success = await form_config_service.delete_field(
            field_id=field_id,
            admin_id=admin["user_id"],
            hard=hard
        )
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/fields/{field_id}/toggle")
async def toggle_field_active(
    field_id: str,
    is_active: bool = Query(..., description="New active status"),
    admin: dict = Depends(get_admin_user)
):
    """Toggle a field's active status"""
    try:
        result = await form_config_service.toggle_field_active(
            field_id=field_id,
            is_active=is_active,
            admin_id=admin["user_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{form_type}/reorder")
async def reorder_fields(
    form_type: str,
    data: ReorderFieldsRequest,
    admin: dict = Depends(get_admin_user)
):
    """Reorder form fields"""
    success = await form_config_service.reorder_fields(
        form_type=form_type,
        field_orders=data.field_orders,
        admin_id=admin["user_id"]
    )
    return {"success": success}


@router.get("/admin/fields/{field_id}")
async def get_field_detail(
    field_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get detailed information about a specific field"""
    result = await form_config_service.get_field(field_id)
    if not result:
        raise HTTPException(status_code=404, detail="Field not found")
    return result
