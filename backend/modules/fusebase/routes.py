"""
FuseBase Routes - Endpoints para integration con FuseBase

PLACEHOLDER - Endpoints a implementar:
- GET /fusebase/status - Estado de la integration
- GET/PUT /fusebase/config - Configuration
- GET /fusebase/embed-url - URL de embed para frontend
- GET /fusebase/documents - Documentos sincronizados
- GET /fusebase/categories - Categorys de documentos
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_admin_user
from .models import FuseBaseConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fusebase", tags=["FuseBase Documents"])


# ============== STATUS ==============

@router.get("/status")
async def get_fusebase_status():
    """Get FuseBase integration status"""
    config = await db.app_config.find_one({"config_key": "fusebase"}, {"_id": 0})
    
    if not config or not config.get("value", {}).get("embed_url"):
        return {
            "module": "fusebase",
            "status": "not_configured",
            "configured": False,
            "activo": False,
            "message": "FuseBase no configurado. Configure la URL de embed o API."
        }
    
    value = config.get("value", {})
    return {
        "module": "fusebase",
        "status": "configured" if value.get("activo") else "inactive",
        "configured": True,
        "activo": value.get("activo", False),
        "embed_enabled": value.get("embed_enabled", False),
        "workspace_id": value.get("workspace_id")
    }


# ============== CONFIGURATION ==============

@router.get("/config")
async def get_fusebase_config(admin: dict = Depends(get_admin_user)):
    """Get FuseBase configuration (admin only)"""
    config = await db.app_config.find_one({"config_key": "fusebase"}, {"_id": 0})
    
    if not config:
        return FuseBaseConfig().model_dump()
    
    return config.get("value", FuseBaseConfig().model_dump())


@router.put("/config")
async def update_fusebase_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update FuseBase configuration"""
    config["fecha_configuracion"] = datetime.now(timezone.utc).isoformat()
    
    await db.app_config.update_one(
        {"config_key": "fusebase"},
        {"$set": {
            "config_key": "fusebase",
            "value": config,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuration de FuseBase actualizada"}


# ============== EMBED ==============

@router.get("/embed-url")
async def get_embed_url():
    """Get FuseBase embed URL for frontend (public)"""
    config = await db.app_config.find_one({"config_key": "fusebase"})
    
    if not config or not config.get("value", {}).get("activo"):
        return {
            "activo": False,
            "embed_url": None,
            "message": "FuseBase no activo"
        }
    
    value = config["value"]
    
    return {
        "activo": True,
        "embed_url": value.get("embed_url"),
        "tema": value.get("tema", "light"),
        "mostrar_navegacion": value.get("mostrar_navegacion", True)
    }


# ============== DOCUMENTS (PLACEHOLDER) ==============

@router.get("/documents")
async def get_documents(
    categoria: Optional[str] = None,
    publico: Optional[bool] = None,
    limit: int = 50
):
    """Get FuseBase documents - PLACEHOLDER"""
    query = {}
    if categoria:
        query["categoria"] = categoria
    if publico is not None:
        query["publico"] = publico
    
    documents = await db.fusebase_documents.find(query, {"_id": 0}).sort("orden", 1).to_list(limit)
    
    return {
        "documents": documents,
        "total": len(documents),
        "message": "Documentos - Placeholder. Configure FuseBase para sincronizar."
    }


@router.get("/categories")
async def get_document_categories():
    """Get document categories"""
    categories = await db.fusebase_categories.find({"activo": True}, {"_id": 0}).sort("orden", 1).to_list(50)
    
    if not categories:
        # Default categories
        categories = [
            {"category_id": "general", "nombre": "General", "icono": "📄", "orden": 1},
            {"category_id": "guias", "nombre": "Guías y Tutoriales", "icono": "📖", "orden": 2},
            {"category_id": "politicas", "nombre": "Políticas y Procedimientos", "icono": "📋", "orden": 3},
            {"category_id": "recursos", "nombre": "Recursos", "icono": "📦", "orden": 4},
        ]
    
    return categories


# ============== INTEGRATION INFO ==============

@router.get("/integration-info")
async def get_integration_info():
    """Get information about FuseBase integration options"""
    return {
        "module": "fusebase",
        "description": "Integration con FuseBase para documentos y wikis",
        "integration_options": {
            "embed": {
                "description": "Embeber workspace completo de FuseBase",
                "required": ["embed_url"],
                "features": ["Wiki completa", "Documentos", "Navigation integrada"]
            },
            "api": {
                "description": "Sincronizar documentos via API",
                "required": ["api_url", "api_key"],
                "features": ["Lista de documentos", "Búsqueda", "Organización personalizada"]
            }
        },
        "setup_steps": [
            "1. Obtener URL de embed o API key de FuseBase",
            "2. Configurar en /api/fusebase/config",
            "3. Los documentos estarán disponibles en la app"
        ]
    }
