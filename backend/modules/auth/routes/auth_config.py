"""
Auth Configuration Routes - Manage authentication methods
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Optional
from pydantic import BaseModel
from datetime import datetime, timezone

from core.database import db
from core.auth import get_admin_user

router = APIRouter(prefix="/auth-config", tags=["Auth Config"])

# ============== MODELS ==============

class AuthMethodConfig(BaseModel):
    """Configuration for a single auth method"""
    enabled: bool = True
    visible: bool = True  # Show in UI
    label: Optional[str] = None  # Custom label
    order: int = 0  # Display order


class AuthConfigRequest(BaseModel):
    """Full auth configuration request"""
    email_password: AuthMethodConfig = AuthMethodConfig(enabled=True, visible=True, order=1)
    google: AuthMethodConfig = AuthMethodConfig(enabled=True, visible=True, order=2)
    # Future methods
    facebook: AuthMethodConfig = AuthMethodConfig(enabled=False, visible=False, order=3)
    apple: AuthMethodConfig = AuthMethodConfig(enabled=False, visible=False, order=4)
    
    # Registration fields config
    registration_fields: Dict = {
        "nombre": {"required": True, "visible": True},
        "email": {"required": True, "visible": True},
        "telefono": {"required": False, "visible": True},
        "direccion": {"required": False, "visible": False},  # Hidden by default, captured via geolocation
        "contrasena": {"required": True, "visible": True}
    }
    
    # Auto-capture location on registration
    auto_capture_location: bool = True


# ============== CONFIG KEY ==============
AUTH_CONFIG_KEY = "auth_methods_config"


# ============== ENDPOINTS ==============

@router.get("/methods")
async def get_auth_config(admin: dict = Depends(get_admin_user)):
    """
    Get authentication methods configuration (admin only)
    """
    config = await db.site_config.find_one(
        {"config_type": AUTH_CONFIG_KEY},
        {"_id": 0}
    )
    
    if not config:
        # Return default config
        return {
            "email_password": {"enabled": True, "visible": True, "label": None, "order": 1},
            "google": {"enabled": True, "visible": True, "label": "Continuar con Google", "order": 2},
            "facebook": {"enabled": False, "visible": False, "label": None, "order": 3},
            "apple": {"enabled": False, "visible": False, "label": None, "order": 4},
            "registration_fields": {
                "nombre": {"required": True, "visible": True, "label": "Nombre completo"},
                "email": {"required": True, "visible": True, "label": "Correo electronic"},
                "telefono": {"required": False, "visible": True, "label": "Teléfono"},
                "direccion": {"required": False, "visible": False, "label": "Dirección"},
                "contrasena": {"required": True, "visible": True, "label": "Contraseña"}
            },
            "auto_capture_location": True
        }
    
    return config.get("value", {})


@router.put("/methods")
async def update_auth_config(
    config: AuthConfigRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Update authentication methods configuration (admin only)
    """
    config_data = config.dict()
    
    await db.site_config.update_one(
        {"config_type": AUTH_CONFIG_KEY},
        {
            "$set": {
                "config_type": AUTH_CONFIG_KEY,
                "value": config_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin.get("user_id")
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Configuración guardada"}


@router.get("/methods/public")
async def get_public_auth_config():
    """
    Get public authentication methods configuration (no auth required)
    Only returns enabled and visible methods
    """
    config = await db.site_config.find_one(
        {"config_type": AUTH_CONFIG_KEY},
        {"_id": 0}
    )
    
    if not config:
        # Default public config
        return {
            "methods": [
                {"id": "email_password", "enabled": True, "visible": True, "label": None, "order": 1},
                {"id": "google", "enabled": True, "visible": True, "label": "Continuar con Google", "order": 2}
            ],
            "registration_fields": {
                "nombre": {"required": True, "visible": True, "label": "Nombre completo"},
                "email": {"required": True, "visible": True, "label": "Correo electronic"},
                "telefono": {"required": False, "visible": True, "label": "Teléfono"},
                "direccion": {"required": False, "visible": False, "label": "Dirección"},
                "contrasena": {"required": True, "visible": True, "label": "Contraseña"}
            },
            "auto_capture_location": True
        }
    
    value = config.get("value", {})
    
    # Build methods list (only enabled and visible)
    methods = []
    for method_id in ["email_password", "google", "facebook", "apple"]:
        method = value.get(method_id, {})
        if method.get("enabled") and method.get("visible"):
            methods.append({
                "id": method_id,
                "enabled": method.get("enabled", False),
                "visible": method.get("visible", False),
                "label": method.get("label"),
                "order": method.get("order", 99)
            })
    
    # Sort by order
    methods.sort(key=lambda x: x.get("order", 99))
    
    return {
        "methods": methods,
        "registration_fields": value.get("registration_fields", {}),
        "auto_capture_location": value.get("auto_capture_location", True)
    }


@router.post("/toggle/{method_id}")
async def toggle_auth_method(
    method_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Quick toggle for enabling/disabling an auth method
    """
    if method_id not in ["email_password", "google", "facebook", "apple"]:
        raise HTTPException(status_code=400, detail="Método invalid")
    
    config = await db.site_config.find_one(
        {"config_type": AUTH_CONFIG_KEY},
        {"_id": 0}
    )
    
    current_value = config.get("value", {}) if config else {}
    method_config = current_value.get(method_id, {"enabled": True, "visible": True})
    
    # Toggle both enabled and visible
    new_state = not method_config.get("visible", True)
    method_config["enabled"] = new_state
    method_config["visible"] = new_state
    
    current_value[method_id] = method_config
    
    await db.site_config.update_one(
        {"config_type": AUTH_CONFIG_KEY},
        {
            "$set": {
                "config_type": AUTH_CONFIG_KEY,
                "value": current_value,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin.get("user_id")
            }
        },
        upsert=True
    )
    
    return {
        "success": True,
        "method": method_id,
        "enabled": new_state,
        "visible": new_state
    }
