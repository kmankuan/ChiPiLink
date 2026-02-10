"""
Admin Routes - Notifications, form config, setup endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.auth import get_admin_user, hash_password
from core.config import FRONTEND_URL
from .models import Notificacion, NotificacionCreate, ConfiguracionNotificaciones

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ============== SETUP ROUTES ==============

@router.post("/setup")
async def setup_admin(admin_data: dict):
    """Initial admin setup - only works if no admin exists"""
    existing_admin = await db.users.find_one({"is_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Already exists un administrador")
    
    admin_doc = {
        "user_id": f"admin_{uuid.uuid4().hex[:8]}",
        "email": admin_data.get("email"),
        "name": admin_data.get("name", "Administrador"),
        "contrasena_hash": hash_password(admin_data.get("contrasena")),
        "is_admin": True,
        "estudiantes": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    
    return {"success": True, "message": "Administrador creado exitosamente"}


@router.post("/seed")
async def seed_data(admin: dict = Depends(get_admin_user)):
    """Seed initial data for development/testing"""
    seeded = []
    
    # Seed categories if empty
    cat_count = await db.store_categories.count_documents({})
    if cat_count == 0:
        categorys = [
            {"category_id": "books", "name": "Books", "icono": "\ud83d\udcda", "orden": 1, "active": True},
            {"category_id": "snacks", "name": "Snacks", "icono": "\ud83c\udf6b", "orden": 2, "active": True},
            {"category_id": "beverages", "name": "Beverages", "icono": "\ud83e\udd64", "orden": 3, "active": True},
            {"category_id": "prepared", "name": "Prepared", "icono": "\ud83c\udf2d", "orden": 4, "active": True},
            {"category_id": "uniforms", "name": "Uniforms", "icono": "\ud83d\udc55", "orden": 5, "active": True},
            {"category_id": "services", "name": "Services", "icono": "\ud83d\udd27", "orden": 6, "active": True},
        ]
        await db.store_categories.insert_many(categorys)
        seeded.append("categorys")
    
    # Seed sample products if empty
    product_count = await db.store_products.count_documents({})
    if product_count == 0:
        sample_products = [
            {
                "book_id": f"book_{uuid.uuid4().hex[:12]}",
                "name": "Mathematics 1",
                "description": "Mathematics textbook for first grade",
                "category": "books",
                "grade": "1",
                "subject": "mathematics",
                "price": 25.00,
                "inventory_quantity": 50,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "book_id": f"book_{uuid.uuid4().hex[:12]}",
                "name": "Spanish 1",
                "description": "Spanish textbook for first grade",
                "category": "books",
                "grade": "1",
                "subject": "spanish",
                "price": 22.00,
                "inventory_quantity": 45,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
        ]
        await db.store_products.insert_many(sample_products)
        seeded.append("products")
    
    return {"success": True, "seeded": seeded}


# ============== NOTIFICATIONS ROUTES ==============

@router.get("/notifications")
async def get_notifications(
    leidas: Optional[bool] = None,
    tipo: Optional[str] = None,
    limite: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get notifications for admin"""
    query = {}
    if leidas is not None:
        query["read"] = leidas
    if tipo:
        query["tipo"] = tipo
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort(
        "created_at", -1
    ).to_list(limite)
    
    # Count unread
    unread_count = await db.notifications.count_documents({"read": False})
    
    return {
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.put("/notifications/{notification_id}/leer")
async def marcar_leida(notification_id: str, admin: dict = Depends(get_admin_user)):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificaci\u00f3n not found")
    return {"success": True}


@router.put("/notifications/leer-todas")
async def marcar_todas_leidas(admin: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"read": False},
        {"$set": {"read": True}}
    )
    return {"success": True}


@router.delete("/notifications/{notification_id}")
async def delete_notificacion(notification_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({"notification_id": notification_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notificaci\u00f3n not found")
    return {"success": True}


@router.get("/notifications/config")
async def get_notifications_config(admin: dict = Depends(get_admin_user)):
    """Get notification preferences"""
    config = await db.app_config.find_one({"config_key": "notifications"}, {"_id": 0})
    if not config:
        return ConfiguracionNotificaciones().model_dump()
    return config.get("value", ConfiguracionNotificaciones().model_dump())


@router.put("/notifications/config")
async def update_notifications_config(
    config: ConfiguracionNotificaciones,
    admin: dict = Depends(get_admin_user)
):
    """Update notification preferences"""
    await db.app_config.update_one(
        {"config_key": "notifications"},
        {"$set": {
            "config_key": "notifications",
            "value": config.model_dump(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"success": True}


# ============== FORM CONFIGURATION ROUTES ==============

@router.get("/form-config/{form_id}")
async def get_form_config(form_id: str, admin: dict = Depends(get_admin_user)):
    """Get form configuration"""
    config = await db.form_configs.find_one({"form_id": form_id}, {"_id": 0})
    if not config:
        # Return default config
        return {
            "form_id": form_id,
            "name": "Formulario de Pedido",
            "campos": [],
            "active": True
        }
    return config


@router.put("/form-config/{form_id}")
async def update_form_config(form_id: str, config: dict, admin: dict = Depends(get_admin_user)):
    """Update form configuration"""
    config["form_id"] = form_id
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.form_configs.update_one(
        {"form_id": form_id},
        {"$set": config},
        upsert=True
    )
    return {"success": True}


@router.get("/form-config/{form_id}/embed-code")
async def get_embed_code(form_id: str, admin: dict = Depends(get_admin_user)):
    """Generate embed code for public form"""
    embed_url = f"{FRONTEND_URL}/embed/{form_id}"
    
    iframe_code = f'''<iframe 
  src="{embed_url}" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; max-width: 600px;">
</iframe>'''
    
    script_code = f'''<div id="form-container-{form_id}"></div>
<script src="{FRONTEND_URL}/embed.js" data-form-id="{form_id}"></script>'''
    
    return {
        "embed_url": embed_url,
        "iframe_code": iframe_code,
        "script_code": script_code
    }


# ============== PUBLIC FORM CONFIG ROUTES ==============

@router.get("/public/form-config/{form_id}")
async def get_public_form_config(form_id: str):
    """Get form configuration for public forms (no auth)"""
    config = await db.form_configs.find_one(
        {"form_id": form_id, "active": True},
        {"_id": 0}
    )
    if not config:
        return {
            "form_id": form_id,
            "name": "Formulario de Pedido",
            "campos": [],
            "active": True
        }
    return config


# ============== DASHBOARD STATS ==============

@router.get("/dashboard/stats")
async def get_dashboard_stats(admin: dict = Depends(get_admin_user)):
    """Get dashboard statistics"""
    # Orders stats
    total_orders = await db.textbook_orders.count_documents({})
    pending_orders = await db.textbook_orders.count_documents({"status": "pending"})
    
    # Products stats
    total_products = await db.store_products.count_documents({"active": True})
    low_stock_products = await db.store_products.count_documents({
        "active": True,
        "inventory_quantity": {"$lt": 10}
    })
    
    # Users stats
    total_users = await db.users.count_documents({"is_admin": False})
    
    # Notifications stats
    unread_notifications = await db.notifications.count_documents({"read": False})
    
    return {
        "orders": {
            "total": total_orders,
            "pending": pending_orders
        },
        "products": {
            "total": total_products,
            "low_stock": low_stock_products
        },
        "users": {
            "total": total_users
        },
        "notifications": {
            "unread": unread_notifications
        }
    }




# ============== LANDING PAGE CONFIG ==============

@router.get("/landing-page/config")
async def get_landing_page_config(admin: dict = Depends(get_admin_user)):
    """Get landing page block configuration"""
    config = await db.site_config.find_one(
        {"config_type": "landing_page_blocks"},
        {"_id": 0}
    )
    if not config:
        return {"blocks": {}}
    return {"blocks": config.get("blocks", {})}


@router.put("/landing-page/config")
async def update_landing_page_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update landing page block configuration"""
    blocks = data.get("blocks", {})
    
    await db.site_config.update_one(
        {"config_type": "landing_page_blocks"},
        {
            "$set": {
                "config_type": "landing_page_blocks",
                "blocks": blocks,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin.get("user_id")
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Configuration guardada"}


# ============== UNATIENDA DEMO DATA ==============

@router.post("/unatienda/demo-data")
async def generate_unatienda_demo_data(admin: dict = Depends(get_admin_user)):
    """Generate demo data for Unatienda private catalog"""
    try:
        from scripts.generate_unatienda_demo import generate_all_demo_data
        
        result = await generate_all_demo_data()
        
        return {
            "success": True,
            "message": "Datos de demo generados exitosamente",
            "data": {
                "productos": result["products"],
                "estudiantes": result["students"],
                "pedidos": result["orders"]
            }
        }
    except Exception as e:
        logger.error(f"Error generando datos demo de Unatienda: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/unatienda/demo-data")
async def clear_unatienda_demo_data(admin: dict = Depends(get_admin_user)):
    """Clear demo data for Unatienda private catalog"""
    try:
        from scripts.generate_unatienda_demo import clear_demo_data
        
        result = await clear_demo_data()
        
        return {
            "success": True,
            "message": "Datos de demo eliminados",
            "data": result
        }
    except Exception as e:
        logger.error(f"Error eliminando datos demo de Unatienda: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unatienda/demo-stats")
async def get_unatienda_demo_stats(admin: dict = Depends(get_admin_user)):
    """Get statistics for Unatienda demo data"""
    try:
        stats = {
            "products": await db.store_products.count_documents({"is_demo": True}),
            "students": await db.synced_students.count_documents({"is_demo": True}),
            "orders": await db.textbook_orders.count_documents({"is_demo": True}),
            "total_products": await db.store_products.count_documents({"is_private_catalog": True}),
            "total_students": await db.synced_students.count_documents({}),
            "total_orders": await db.textbook_orders.count_documents({})
        }
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error getting Unatienda stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unatienda/stats")
async def get_unatienda_stats(admin: dict = Depends(get_admin_user)):
    """Get overall statistics for Unatienda module"""
    try:
        stats = {
            "public_products": await db.store_products.count_documents({
                "active": True,
                "$or": [{"is_private_catalog": {"$exists": False}}, {"is_private_catalog": False}]
            }),
            "private_products": await db.store_products.count_documents({
                "is_private_catalog": True,
                "active": True
            }),
            "students": await db.synced_students.count_documents({}),
            "orders_pending": await db.textbook_orders.count_documents({"status": "pending"}),
            "student_requests_approved": await db.store_textbook_access_students.count_documents({"status": "approved"}),
            "student_requests_pending": await db.store_textbook_access_requests.count_documents({"status": "pending"})
        }
        
        return stats
    except Exception as e:
        logger.error(f"Error getting Unatienda stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== MODULE STATUS ROUTES (Service Layer) ==============

from .services.module_status_service import module_status_service
from .services.ui_style_service import ui_style_service


@router.get("/module-status")
async def get_module_statuses(admin: dict = Depends(get_admin_user)):
    """Get module statuses (admin view with defaults)"""
    return await module_status_service.get_statuses()


@router.put("/module-status")
async def update_module_statuses(data: dict, admin: dict = Depends(get_admin_user)):
    """Update module statuses"""
    await module_status_service.update_statuses(data.get("statuses", {}), admin.get("user_id"))
    return {"success": True, "message": "Module statuses updated"}


# ============== UI STYLE ROUTES (Service Layer) ==============


@router.get("/ui-style")
async def get_ui_style(admin: dict = Depends(get_admin_user)):
    """Get UI style configuration"""
    return await ui_style_service.get_style()


@router.put("/ui-style")
async def update_ui_style(data: dict, admin: dict = Depends(get_admin_user)):
    """Update UI style configuration"""
    await ui_style_service.update_style(data.get("style", {}), admin.get("user_id"))
    return {"success": True, "message": "UI style updated"}