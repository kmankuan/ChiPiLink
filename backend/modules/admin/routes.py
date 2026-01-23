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


# ============== DATABASE MIGRATION ==============

@router.post("/migrate-database")
async def migrate_database(admin: dict = Depends(get_admin_user)):
    """
    Run database migration to rename collections to new naming standard.
    Only accessible by admin users.
    """
    logger.info(f"Database migration started by admin: {admin.get('email')}")
    
    # Migration mappings: old_name -> new_name
    COLLECTION_RENAMES = {
        'schools': 'store_schools',
        'textbook_access_students': 'store_students',
        'form_field_configs': 'store_form_configs',
        'users_profiles': 'user_profiles',
    }
    
    # Collections to delete (deprecated)
    COLLECTIONS_TO_DELETE = [
        'usuarios',
        'vinculaciones', 
        'store_orders',
    ]
    
    renamed = []
    deleted = []
    errors = []
    
    try:
        existing_collections = await db.client[db.db_name].list_collection_names()
        
        # Rename collections
        for old_name, new_name in COLLECTION_RENAMES.items():
            try:
                if old_name in existing_collections and new_name not in existing_collections:
                    # Create backup
                    backup_name = f"_backup_{old_name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
                    docs = await db.client[db.db_name][old_name].find({}).to_list(None)
                    if docs:
                        await db.client[db.db_name][backup_name].insert_many(docs)
                        logger.info(f"Backed up {len(docs)} docs to {backup_name}")
                    
                    # Rename
                    await db.client[db.db_name][old_name].rename(new_name)
                    renamed.append({"from": old_name, "to": new_name, "backup": backup_name})
                    logger.info(f"Renamed {old_name} -> {new_name}")
                elif new_name in existing_collections:
                    logger.info(f"Collection {new_name} already exists, skipping {old_name}")
                else:
                    logger.info(f"Collection {old_name} does not exist, skipping")
            except Exception as e:
                errors.append(f"Error renaming {old_name}: {str(e)}")
                logger.error(f"Error renaming {old_name}: {e}")
        
        # Delete deprecated collections
        for coll_name in COLLECTIONS_TO_DELETE:
            try:
                if coll_name in existing_collections:
                    count = await db.client[db.db_name][coll_name].count_documents({})
                    if count > 0:
                        # Backup first
                        backup_name = f"_backup_{coll_name}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
                        docs = await db.client[db.db_name][coll_name].find({}).to_list(None)
                        await db.client[db.db_name][backup_name].insert_many(docs)
                    
                    await db.client[db.db_name][coll_name].drop()
                    deleted.append({"collection": coll_name, "docs": count})
                    logger.info(f"Deleted {coll_name} ({count} docs)")
            except Exception as e:
                errors.append(f"Error deleting {coll_name}: {str(e)}")
                logger.error(f"Error deleting {coll_name}: {e}")
        
        logger.info(f"Migration complete. Renamed: {len(renamed)}, Deleted: {len(deleted)}")
        
        return {
            "success": True,
            "renamed": renamed,
            "deleted": deleted,
            "errors": errors if errors else None,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")


# ============== SETUP ROUTES ==============

@router.post("/setup")
async def setup_admin(admin_data: dict):
    """Initial admin setup - only works if no admin exists"""
    existing_admin = await db.clientes.find_one({"es_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Ya existe un administrador")
    
    admin_doc = {
        "cliente_id": f"admin_{uuid.uuid4().hex[:8]}",
        "email": admin_data.get("email"),
        "nombre": admin_data.get("nombre", "Administrador"),
        "contrasena_hash": hash_password(admin_data.get("contrasena")),
        "es_admin": True,
        "estudiantes": [],
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clientes.insert_one(admin_doc)
    
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

@router.get("/notificaciones")
async def get_notificaciones(
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
    
    notificaciones = await db.notificaciones.find(query, {"_id": 0}).sort(
        "fecha_creacion", -1
    ).to_list(limite)
    
    # Count unread
    no_leidas = await db.notificaciones.count_documents({"leida": False})
    
    return {
        "notificaciones": notificaciones,
        "no_leidas": no_leidas
    }


@router.put("/notificaciones/{notificacion_id}/leer")
async def marcar_leida(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Mark notification as read"""
    result = await db.notificaciones.update_one(
        {"notificacion_id": notificacion_id},
        {"$set": {"leida": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notificaci\u00f3n no encontrada")
    return {"success": True}


@router.put("/notificaciones/leer-todas")
async def marcar_todas_leidas(admin: dict = Depends(get_admin_user)):
    """Mark all notifications as read"""
    await db.notificaciones.update_many(
        {"leida": False},
        {"$set": {"leida": True}}
    )
    return {"success": True}


@router.delete("/notificaciones/{notificacion_id}")
async def delete_notificacion(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a notification"""
    result = await db.notificaciones.delete_one({"notificacion_id": notificacion_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Notificaci\u00f3n no encontrada")
    return {"success": True}


@router.get("/notificaciones/config")
async def get_notificaciones_config(admin: dict = Depends(get_admin_user)):
    """Get notification preferences"""
    config = await db.app_config.find_one({"config_key": "notificaciones"}, {"_id": 0})
    if not config:
        return ConfiguracionNotificaciones().model_dump()
    return config.get("value", ConfiguracionNotificaciones().model_dump())


@router.put("/notificaciones/config")
async def update_notificaciones_config(
    config: ConfiguracionNotificaciones,
    admin: dict = Depends(get_admin_user)
):
    """Update notification preferences"""
    await db.app_config.update_one(
        {"config_key": "notificaciones"},
        {"$set": {
            "config_key": "notificaciones",
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
    total_pedidos = await db.pedidos.count_documents({})
    pedidos_pendientes = await db.pedidos.count_documents({"estado": "pendiente"})
    
    # Products stats
    total_productos = await db.libros.count_documents({"activo": True})
    productos_bajo_stock = await db.libros.count_documents({
        "activo": True,
        "cantidad_inventario": {"$lt": 10}
    })
    
    # Users stats
    total_usuarios = await db.clientes.count_documents({"es_admin": False})
    
    # Notifications
    notificaciones_no_leidas = await db.notificaciones.count_documents({"leida": False})
    
    return {
        "pedidos": {
            "total": total_pedidos,
            "pendientes": pedidos_pendientes
        },
        "productos": {
            "total": total_productos,
            "bajo_stock": productos_bajo_stock
        },
        "usuarios": {
            "total": total_usuarios
        },
        "notificaciones": {
            "no_leidas": notificaciones_no_leidas
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
                "updated_by": admin.get("cliente_id")
            }
        },
        upsert=True
    )
    
    return {"success": True, "message": "Configuración guardada"}


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
            "productos": await db.libros.count_documents({"es_demo": True}),
            "estudiantes": await db.estudiantes_sincronizados.count_documents({"es_demo": True}),
            "pedidos": await db.pedidos_libros.count_documents({"es_demo": True}),
            "productos_total": await db.libros.count_documents({"es_catalogo_privado": True}),
            "estudiantes_total": await db.estudiantes_sincronizados.count_documents({}),
            "pedidos_total": await db.pedidos_libros.count_documents({})
        }
        
        return {
            "success": True,
            "stats": stats
        }
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de Unatienda: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/unatienda/stats")
async def get_unatienda_stats(admin: dict = Depends(get_admin_user)):
    """Get overall statistics for Unatienda module"""
    try:
        stats = {
            "productos_publicos": await db.libros.count_documents({
                "activo": True,
                "$or": [{"es_catalogo_privado": {"$exists": False}}, {"es_catalogo_privado": False}]
            }),
            "productos_privados": await db.libros.count_documents({
                "es_catalogo_privado": True,
                "activo": True
            }),
            "estudiantes": await db.estudiantes_sincronizados.count_documents({}),
            "pedidos_pendientes": await db.pedidos_libros.count_documents({"estado": "pendiente"}),
            "vinculaciones_activas": await db.vinculaciones.count_documents({"estado": "aprobada", "activo": True}),
            "vinculaciones_pendientes": await db.vinculaciones.count_documents({"estado": "pendiente"})
        }
        
        return stats
    except Exception as e:
        logger.error(f"Error obteniendo estadísticas de Unatienda: {e}")
        raise HTTPException(status_code=500, detail=str(e))