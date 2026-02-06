"""
Store Configuration Routes
Manages store settings including visibility configurations
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from core.auth.middleware import get_current_user, require_admin
from core.database import get_database

router = APIRouter(prefix="/store-config", tags=["Store - Configuration"])

# Database collection name
CONFIG_COLLECTION = "store_configuration"

# Default configuration
DEFAULT_CONFIG = {
    "textbooks_public_visibility": True,  # Show textbooks category to non-logged users
    "textbooks_category_enabled": True,   # Enable/disable the entire textbooks category
    "require_student_validation": True,   # Require validated student to order textbooks
    "show_prices_to_public": False,       # Show prices to non-logged users
    "allow_guest_checkout": False,        # Allow checkout without login (for regular products)
    "maintenance_mode": False,            # Store maintenance mode
    "textbooks_category_label": {
        "en": "School Textbooks",
        "es": "Textos Escolares",
        "zh": "学校教科书"
    },
    "textbooks_login_message": {
        "en": "Login to access exclusive school textbooks",
        "es": "Inicia sesión para acceder a textos escolares exclusivos",
        "zh": "登录以访问专属学校教科书"
    }
}

class StoreConfigUpdate(BaseModel):
    textbooks_public_visibility: Optional[bool] = None
    textbooks_category_enabled: Optional[bool] = None
    require_student_validation: Optional[bool] = None
    show_prices_to_public: Optional[bool] = None
    allow_guest_checkout: Optional[bool] = None
    maintenance_mode: Optional[bool] = None
    textbooks_category_label: Optional[dict] = None
    textbooks_login_message: Optional[dict] = None

class StoreConfigResponse(BaseModel):
    config: dict
    last_updated: Optional[str] = None
    updated_by: Optional[str] = None


@router.get("/public", response_model=dict)
async def get_public_config():
    """Get public store configuration (no auth required)"""
    db = get_database()
    
    config = await db[CONFIG_COLLECTION].find_one({"_id": "main_config"})
    
    if not config:
        return {
            "textbooks_public_visibility": DEFAULT_CONFIG["textbooks_public_visibility"],
            "textbooks_category_enabled": DEFAULT_CONFIG["textbooks_category_enabled"],
            "show_prices_to_public": DEFAULT_CONFIG["show_prices_to_public"],
            "textbooks_category_label": DEFAULT_CONFIG["textbooks_category_label"],
            "textbooks_login_message": DEFAULT_CONFIG["textbooks_login_message"],
            "maintenance_mode": DEFAULT_CONFIG["maintenance_mode"]
        }
    
    return {
        "textbooks_public_visibility": config.get("textbooks_public_visibility", DEFAULT_CONFIG["textbooks_public_visibility"]),
        "textbooks_category_enabled": config.get("textbooks_category_enabled", DEFAULT_CONFIG["textbooks_category_enabled"]),
        "show_prices_to_public": config.get("show_prices_to_public", DEFAULT_CONFIG["show_prices_to_public"]),
        "textbooks_category_label": config.get("textbooks_category_label", DEFAULT_CONFIG["textbooks_category_label"]),
        "textbooks_login_message": config.get("textbooks_login_message", DEFAULT_CONFIG["textbooks_login_message"]),
        "maintenance_mode": config.get("maintenance_mode", DEFAULT_CONFIG["maintenance_mode"])
    }


@router.get("/admin", response_model=StoreConfigResponse)
async def get_admin_config(current_user: dict = Depends(require_admin)):
    """Get full store configuration (admin only)"""
    db = get_database()
    
    config = await db[CONFIG_COLLECTION].find_one({"_id": "main_config"})
    
    if not config:
        return StoreConfigResponse(
            config=DEFAULT_CONFIG,
            last_updated=None,
            updated_by=None
        )
    
    return StoreConfigResponse(
        config={k: v for k, v in config.items() if k != "_id"},
        last_updated=config.get("last_updated"),
        updated_by=config.get("updated_by")
    )


@router.put("/admin", response_model=StoreConfigResponse)
async def update_config(
    update: StoreConfigUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update store configuration (admin only)"""
    db = get_database()
    
    # Get current config or use defaults
    current = await db[CONFIG_COLLECTION].find_one({"_id": "main_config"})
    if not current:
        current = DEFAULT_CONFIG.copy()
    
    # Build update dict from non-None fields
    update_data = {}
    for field, value in update.model_dump().items():
        if value is not None:
            update_data[field] = value
    
    # Add metadata
    update_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_by"] = current_user.get("user_id", "unknown")
    
    # Upsert config
    await db[CONFIG_COLLECTION].update_one(
        {"_id": "main_config"},
        {"$set": update_data},
        upsert=True
    )
    
    # Fetch updated config
    updated = await db[CONFIG_COLLECTION].find_one({"_id": "main_config"})
    
    return StoreConfigResponse(
        config={k: v for k, v in updated.items() if k != "_id"},
        last_updated=updated.get("last_updated"),
        updated_by=updated.get("updated_by")
    )


@router.post("/admin/reset", response_model=StoreConfigResponse)
async def reset_config(current_user: dict = Depends(require_admin)):
    """Reset store configuration to defaults (admin only)"""
    db = get_database()
    
    reset_data = DEFAULT_CONFIG.copy()
    reset_data["last_updated"] = datetime.now(timezone.utc).isoformat()
    reset_data["updated_by"] = current_user.get("user_id", "unknown")
    reset_data["reset_at"] = datetime.now(timezone.utc).isoformat()
    
    await db[CONFIG_COLLECTION].update_one(
        {"_id": "main_config"},
        {"$set": reset_data},
        upsert=True
    )
    
    return StoreConfigResponse(
        config=DEFAULT_CONFIG,
        last_updated=reset_data["last_updated"],
        updated_by=reset_data["updated_by"]
    )
