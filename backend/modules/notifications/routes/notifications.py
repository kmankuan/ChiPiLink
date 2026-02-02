"""
Push Notifications API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.notifications.services.push_service import push_notification_service

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ============== PYDANTIC MODELS ==============

class RegisterDeviceRequest(BaseModel):
    device_token: str
    provider: str = "fcm"  # "fcm" or "onesignal"
    device_info: dict = {}


class UpdatePreferencesRequest(BaseModel):
    push_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    quiet_hours: Optional[dict] = None


class UpdateCategoryPreferenceRequest(BaseModel):
    enabled: Optional[bool] = None
    push: Optional[bool] = None
    email: Optional[bool] = None


class CreateCategoryRequest(BaseModel):
    name: dict  # {"es": "...", "en": "...", "zh": "..."}
    description: dict = {}
    icon: str = "🔔"
    color: str = "#6366f1"
    default_enabled: bool = True
    default_provider: str = "auto"
    priority: str = "normal"
    module: str = "general"


class SendNotificationRequest(BaseModel):
    user_id: str
    category_id: str
    title: str
    body: str
    data: dict = {}
    image_url: Optional[str] = None
    action_url: Optional[str] = None


class SendBulkNotificationRequest(BaseModel):
    user_ids: Optional[List[str]] = None
    send_to_all: bool = False
    category_id: str
    title: str
    body: str
    data: dict = {}
    image_url: Optional[str] = None
    action_url: Optional[str] = None


class UpdateProviderConfigRequest(BaseModel):
    enabled: Optional[bool] = None
    api_key: Optional[str] = None
    app_id: Optional[str] = None
    project_id: Optional[str] = None
    weight: Optional[int] = None
    rate_limit: Optional[int] = None


# ============== USER ENDPOINTS ==============

@router.post("/devices/register")
async def register_device(
    data: RegisterDeviceRequest,
    user=Depends(get_current_user)
):
    """Registrar dispositivo para recibir push notifications"""
    device = await push_notification_service.register_device(
        user_id=user["user_id"],
        device_token=data.device_token,
        provider=data.provider,
        device_info=data.device_info
    )
    
    return {"success": True, "device": device}


@router.get("/devices")
async def get_my_devices(user=Depends(get_current_user)):
    """Obtener mis dispositivos registrados"""
    devices = await push_notification_service.get_user_devices(user["user_id"])
    return {"success": True, "devices": devices, "count": len(devices)}


@router.delete("/devices/{device_token}")
async def remove_device(
    device_token: str,
    user=Depends(get_current_user)
):
    """Eliminar un dispositivo"""
    success = await push_notification_service.deactivate_device(device_token)
    return {"success": success}


@router.get("/preferences")
async def get_my_preferences(user=Depends(get_current_user)):
    """Obtener mis preferencias de notificación"""
    prefs = await push_notification_service.get_user_preferences(user["user_id"])
    return {"success": True, "preferences": prefs}


@router.put("/preferences")
async def update_my_preferences(
    data: UpdatePreferencesRequest,
    user=Depends(get_current_user)
):
    """Actualizar mis preferencias de notificación"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    prefs = await push_notification_service.update_user_preferences(
        user_id=user["user_id"],
        updates=updates
    )
    
    return {"success": True, "preferences": prefs}


@router.put("/preferences/category/{category_id}")
async def update_category_preference(
    category_id: str,
    data: UpdateCategoryPreferenceRequest,
    user=Depends(get_current_user)
):
    """Actualizar preferencia de una categoría específica"""
    prefs = await push_notification_service.update_category_preference(
        user_id=user["user_id"],
        category_id=category_id,
        enabled=data.enabled,
        push=data.push,
        email=data.email
    )
    
    return {"success": True, "preferences": prefs}


@router.get("/history")
async def get_my_notification_history(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """Obtener historial de notificaciones recibidas"""
    logs = await push_notification_service.get_notification_logs(
        user_id=user["user_id"],
        limit=limit,
        offset=offset
    )
    
    return {"success": True, "notifications": logs, "count": len(logs)}


# ============== CATEGORIES (PUBLIC) ==============

@router.get("/categories")
async def get_categories(active_only: bool = Query(True)):
    """Obtener categorías de notificación"""
    categories = await push_notification_service.get_categories(active_only=active_only)
    return {"success": True, "categories": categories, "count": len(categories)}


@router.get("/categories/{category_id}")
async def get_category(category_id: str):
    """Obtener una categoría específica"""
    category = await push_notification_service.get_category(category_id)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True, "category": category}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/config")
async def get_config(admin=Depends(get_admin_user)):
    """Obtener configuración de proveedores (admin)"""
    config = await push_notification_service.get_config()
    
    # Ocultar API keys en respuesta
    safe_config = config.copy()
    for provider in ["fcm", "onesignal"]:
        if provider in safe_config:
            if safe_config[provider].get("api_key"):
                safe_config[provider]["api_key"] = "***hidden***"
    
    return {"success": True, "config": safe_config}


@router.put("/admin/config/{provider}")
async def update_provider_config(
    provider: str,
    data: UpdateProviderConfigRequest,
    admin=Depends(get_admin_user)
):
    """Actualizar configuración de un proveedor (admin)"""
    if provider not in ["fcm", "onesignal"]:
        raise HTTPException(status_code=400, detail="Invalid provider")
    
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    config = await push_notification_service.update_provider_config(provider, updates)
    
    return {"success": True, "message": f"{provider} config updated"}


@router.post("/admin/categories")
async def create_category(
    data: CreateCategoryRequest,
    admin=Depends(get_admin_user)
):
    """Crear nueva categoría de notificación (admin)"""
    category = await push_notification_service.create_category(data.model_dump())
    return {"success": True, "category": category}


@router.put("/admin/categories/{category_id}")
async def update_category(
    category_id: str,
    updates: dict,
    admin=Depends(get_admin_user)
):
    """Actualizar categoría (admin)"""
    category = await push_notification_service.update_category(category_id, updates)
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True, "category": category}


@router.delete("/admin/categories/{category_id}")
async def delete_category(
    category_id: str,
    admin=Depends(get_admin_user)
):
    """Eliminar categoría (admin)"""
    success = await push_notification_service.delete_category(category_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"success": True, "message": "Category deleted"}


@router.post("/admin/send")
async def send_notification(
    data: SendNotificationRequest,
    admin=Depends(get_admin_user)
):
    """Enviar notificación a un usuario (admin)"""
    result = await push_notification_service.send_notification(
        user_id=data.user_id,
        category_id=data.category_id,
        title=data.title,
        body=data.body,
        data=data.data,
        image_url=data.image_url,
        action_url=data.action_url
    )
    
    return result


@router.post("/admin/send/bulk")
async def send_bulk_notification(
    data: SendBulkNotificationRequest,
    admin=Depends(get_admin_user)
):
    """Enviar notificación masiva (admin)"""
    if data.send_to_all:
        result = await push_notification_service.send_to_all(
            category_id=data.category_id,
            title=data.title,
            body=data.body,
            data=data.data,
            image_url=data.image_url,
            action_url=data.action_url
        )
    elif data.user_ids:
        result = await push_notification_service.send_to_users(
            user_ids=data.user_ids,
            category_id=data.category_id,
            title=data.title,
            body=data.body,
            data=data.data,
            image_url=data.image_url,
            action_url=data.action_url
        )
    else:
        raise HTTPException(status_code=400, detail="Provide user_ids or set send_to_all=true")
    
    return result


@router.get("/admin/logs")
async def get_notification_logs(
    user_id: Optional[str] = None,
    category_id: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    admin=Depends(get_admin_user)
):
    """Obtener logs de notificaciones (admin)"""
    logs = await push_notification_service.get_notification_logs(
        user_id=user_id,
        category_id=category_id,
        limit=limit,
        offset=offset
    )
    
    return {"success": True, "logs": logs, "count": len(logs)}


@router.get("/admin/templates")
async def get_templates(
    category_id: Optional[str] = None,
    admin=Depends(get_admin_user)
):
    """Obtener plantillas de notificación (admin)"""
    templates = await push_notification_service.get_templates(category_id=category_id)
    return {"success": True, "templates": templates, "count": len(templates)}


@router.post("/admin/initialize")
async def initialize_notifications(admin=Depends(get_admin_user)):
    """Inicializar sistema de notificaciones (admin)"""
    await push_notification_service.initialize()
    
    return {
        "success": True,
        "message": "Notification system initialized"
    }


class TestPushRequest(BaseModel):
    title: str = "Test Notification"
    body: str = "This is a test push notification from ChiPi Link"
    segment: str = "Subscribed Users"


@router.post("/admin/test-push")
async def test_push_notification(
    data: TestPushRequest,
    admin=Depends(get_admin_user)
):
    """Enviar notificación push de prueba a un segmento de OneSignal (admin)"""
    from modules.notifications.providers.push_providers import OneSignalProvider
    import os
    
    # Get config from environment
    app_id = os.environ.get("ONESIGNAL_APP_ID")
    api_key = os.environ.get("ONESIGNAL_API_KEY")
    
    if not app_id or not api_key:
        return {
            "success": False,
            "error": "OneSignal not configured. Set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY in .env"
        }
    
    provider = OneSignalProvider({
        "app_id": app_id,
        "api_key": api_key
    })
    
    result = await provider.send_to_segment(
        segments=[data.segment],
        title=data.title,
        body=data.body,
        data={"test": True, "from": "ChiPi Link Admin"},
        action_url="https://textflow-103.preview.emergentagent.com"
    )
    
    return {
        "success": result.get("success", False),
        "provider": "onesignal",
        "segment": data.segment,
        "notification_id": result.get("notification_id"),
        "recipients": result.get("recipients", 0),
        "errors": result.get("errors", [])
    }
