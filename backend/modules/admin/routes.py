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
    existing_admin = await db.users.find_one({"es_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Already exists un administrador")
    
    admin_doc = {
        "user_id": f"admin_{uuid.uuid4().hex[:8]}",
        "email": admin_data.get("email"),
        "nombre": admin_data.get("nombre", "Administrador"),
        "contrasena_hash": hash_password(admin_data.get("contrasena")),
        "es_admin": True,
        "estudiantes": [],
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    
    return {"success": True, "message": "Administrador creado exitosamente"}


@router.post("/seed")
async def seed_data(admin: dict = Depends(get_admin_user)):
    """Seed initial data for development/testing"""
    seeded = []
    
    # Seed categories if empty
    cat_count = await db.categorias.count_documents({})
    if cat_count == 0:
        categorias = [
            {"categoria_id": "libros", "nombre": "Libros", "icono": "\ud83d\udcda", "orden": 1, "activo": True},
            {"categoria_id": "snacks", "nombre": "Snacks", "icono": "\ud83c\udf6b", "orden": 2, "activo": True},
            {"categoria_id": "bebidas", "nombre": "Bebidas", "icono": "\ud83e\udd64", "orden": 3, "activo": True},
            {"categoria_id": "preparados", "nombre": "Preparados", "icono": "\ud83c\udf2d", "orden": 4, "activo": True},
            {"categoria_id": "uniformes", "nombre": "Uniformes", "icono": "\ud83d\udc55", "orden": 5, "activo": True},
            {"categoria_id": "servicios", "nombre": "Servicios", "icono": "\ud83d\udd27", "orden": 6, "activo": True},
        ]
        await db.categorias.insert_many(categorias)
        seeded.append("categorias")
    
    # Seed sample products if empty
    libro_count = await db.libros.count_documents({})
    if libro_count == 0:
        libros = [
            {
                "libro_id": f"libro_{uuid.uuid4().hex[:12]}",
                "nombre": "Matem\u00e1ticas 1",
                "descripcion": "Libro de matem\u00e1ticas para primer grado",
                "categoria": "libros",
                "grado": "1",
                "materia": "matematicas",
                "precio": 25.00,
                "cantidad_inventario": 50,
                "activo": True,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            },
            {
                "libro_id": f"libro_{uuid.uuid4().hex[:12]}",
                "nombre": "Espa\u00f1ol 1",
                "descripcion": "Libro de espa\u00f1ol para primer grado",
                "categoria": "libros",
                "grado": "1",
                "materia": "espanol",
                "precio": 22.00,
                "cantidad_inventario": 45,
                "activo": True,
                "fecha_creacion": datetime.now(timezone.utc).isoformat()
            },
        ]
        await db.libros.insert_many(libros)
        seeded.append("libros")
    
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
        query["leida"] = leidas
    if tipo:
        query["tipo"] = tipo
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort(
        "fecha_creacion", -1
    ).to_list(limite)
    
    # Count unread
    no_leidas = await db.notifications.count_documents({"leida": False})
    
    return {
        "notifications": notifications,
        "no_leidas": no_leidas
    }


@router.put("/notifications/{notificacion_id}/leer")
async def marcar_leida(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Mark notification as read"""
    result = await db.notifications.update_one(
        {"notificacion_id": notificacion_id},
        {"$set": {"leida": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificaci\u00f3n not found")
    return {"success": True}


@router.put("/notifications/leer-todas")
async def marcar_todas_leidas(admin: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"leida": False},
        {"$set": {"leida": True}}
    )
    return {"success": True}


@router.delete("/notifications/{notificacion_id}")
async def delete_notificacion(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a notification"""
    result = await db.notifications.delete_one({"notificacion_id": notificacion_id})
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
            "nombre": "Formulario de Pedido",
            "campos": [],
            "activo": True
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
        {"form_id": form_id, "activo": True},
        {"_id": 0}
    )
    if not config:
        return {
            "form_id": form_id,
            "nombre": "Formulario de Pedido",
            "campos": [],
            "activo": True
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
    total_products = await db.libros.count_documents({"activo": True})
    low_stock_products = await db.libros.count_documents({
        "activo": True,
        "cantidad_inventario": {"$lt": 10}
    })
    
    # Users stats
    total_users = await db.users.count_documents({"is_admin": False})
    
    # Notifications stats
    unread_notifications = await db.notifications.count_documents({"leida": False})
    
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
            "products": await db.libros.count_documents({"es_demo": True}),
            "students": await db.estudiantes_sincronizados.count_documents({"es_demo": True}),
            "orders": await db.textbook_orders.count_documents({"es_demo": True}),
            "total_products": await db.libros.count_documents({"es_catalogo_privado": True}),
            "total_students": await db.estudiantes_sincronizados.count_documents({}),
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
            "public_products": await db.libros.count_documents({
                "activo": True,
                "$or": [{"es_catalogo_privado": {"$exists": False}}, {"es_catalogo_privado": False}]
            }),
            "private_products": await db.libros.count_documents({
                "es_catalogo_privado": True,
                "activo": True
            }),
            "students": await db.estudiantes_sincronizados.count_documents({}),
            "orders_pending": await db.textbook_orders.count_documents({"status": "pending"}),
            "student_requests_approved": await db.store_textbook_access_students.count_documents({"status": "approved"}),
            "student_requests_pending": await db.store_textbook_access_requests.count_documents({"status": "pending"})
        }
        
        return stats
    except Exception as e:
        logger.error(f"Error getting Unatienda stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))