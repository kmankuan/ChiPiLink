"""
Order Form Configuration Routes
API endpoints for managing textbook order form fields
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import List, Optional
import uuid
import os
from datetime import datetime, timezone

from core.auth import get_current_user, get_admin_user
from core.database import db
from ..services.order_form_config_service import order_form_config_service
from ..models.order_form_config import CreateFieldRequest, UpdateFieldRequest

router = APIRouter(prefix="/order-form-config", tags=["Store - Order Form Config"])

# File upload directory
UPLOAD_DIR = "/app/uploads/payment_receipts"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ============== PUBLIC ENDPOINTS ==============

@router.get("/fields")
async def get_form_fields(
    current_user: dict = Depends(get_current_user)
):
    """Get active form fields for the order form"""
    fields = await order_form_config_service.get_fields(include_inactive=False)
    return {"fields": fields}


@router.get("/field-types")
async def get_field_types():
    """Get available field types"""
    types = await order_form_config_service.get_field_types()
    return {"types": types}


@router.post("/upload-file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload a file (e.g., payment receipt)"""
    # Validate file extension
    allowed_extensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Validate file size (max 10MB)
    max_size = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")
    
    # Generate unique filename
    unique_id = uuid.uuid4().hex[:12]
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{unique_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    # Save file
    with open(file_path, "wb") as f:
        f.write(content)
    
    return {
        "file_id": unique_id,
        "filename": safe_filename,
        "original_name": file.filename,
        "path": file_path,
        "size": len(content),
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/config")
async def get_full_config(
    current_user: dict = Depends(get_admin_user)
):
    """Get full form configuration (admin only)"""
    config = await order_form_config_service.get_config()
    return config


@router.get("/admin/fields")
async def get_all_fields(
    include_inactive: bool = False,
    current_user: dict = Depends(get_admin_user)
):
    """Get all form fields including inactive (admin only)"""
    fields = await order_form_config_service.get_fields(include_inactive=include_inactive)
    return {"fields": fields}


@router.post("/admin/fields")
async def create_field(
    field_data: CreateFieldRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Create a new form field (admin only)"""
    field = await order_form_config_service.add_field(field_data)
    return {"field": field, "message": "Field created successfully"}


@router.put("/admin/fields/{field_id}")
async def update_field(
    field_id: str,
    field_data: UpdateFieldRequest,
    current_user: dict = Depends(get_admin_user)
):
    """Update a form field (admin only)"""
    field = await order_form_config_service.update_field(field_id, field_data)
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"field": field, "message": "Field updated successfully"}


@router.delete("/admin/fields/{field_id}")
async def delete_field(
    field_id: str,
    hard_delete: bool = False,
    current_user: dict = Depends(get_admin_user)
):
    """Delete a form field (admin only)"""
    if hard_delete:
        success = await order_form_config_service.hard_delete_field(field_id)
    else:
        success = await order_form_config_service.delete_field(field_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Field not found")
    
    return {"message": "Field deleted successfully"}


@router.put("/admin/fields/reorder")
async def reorder_fields(
    field_ids: List[str],
    current_user: dict = Depends(get_admin_user)
):
    """Reorder form fields (admin only)"""
    fields = await order_form_config_service.reorder_fields(field_ids)
    return {"fields": fields, "message": "Fields reordered successfully"}
