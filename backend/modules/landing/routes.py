"""
Landing Routes - Page builder and site configuration endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_admin_user
from .models import (
    BloquePagina, 
    ConfiguracionSitio, 
    ReorderBlocksRequest,
    BLOCK_TEMPLATES
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Landing Page"])


# ============== PUBLIC ROUTES ==============

@router.get("/public/site-config")
async def get_public_site_config():
    """Get site configuration (public)"""
    config = await db.site_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        default = ConfiguracionSitio()
        return default.model_dump()
    return config


@router.get("/public/landing-page")
async def get_public_landing_page():
    """Get landing page blocks (public) - only returns published blocks"""
    page = await db.paginas.find_one({"pagina_id": "landing"}, {"_id": 0})
    if not page:
        # Return empty page with default blocks
        return {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [],
            "publicada": True
        }
    
    # Filter only published and active blocks for public view
    if page.get("bloques"):
        page["bloques"] = [
            b for b in page["bloques"] 
            if b.get("activo", True) and b.get("publicado", True)
        ]
    
    return page


# ============== ADMIN ROUTES ==============

@router.get("/admin/site-config")
async def get_site_config(admin: dict = Depends(get_admin_user)):
    """Get site configuration (admin)"""
    config = await db.site_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        default = ConfiguracionSitio()
        return default.model_dump()
    return config


@router.put("/admin/site-config")
async def update_site_config(config: ConfiguracionSitio, admin: dict = Depends(get_admin_user)):
    """Update site configuration"""
    config_dict = config.model_dump()
    config_dict["config_id"] = "main"
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.site_config.update_one(
        {"config_id": "main"},
        {"$set": config_dict},
        upsert=True
    )
    return {"success": True, "config": config_dict}


@router.get("/admin/block-templates")
async def get_block_templates(admin: dict = Depends(get_admin_user)):
    """Get available block templates"""
    return BLOCK_TEMPLATES


@router.get("/admin/landing-page")
async def get_landing_page(admin: dict = Depends(get_admin_user)):
    """Get landing page with all blocks (admin)"""
    page = await db.paginas.find_one({"pagina_id": "landing"}, {"_id": 0})
    if not page:
        return {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [],
            "publicada": True
        }
    return page


@router.post("/admin/landing-page/blocks")
async def add_block(
    tipo: str,
    orden: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Add a new block to landing page"""
    if tipo not in BLOCK_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Tipo de bloque '{tipo}' no válido")
    
    template = BLOCK_TEMPLATES[tipo]
    
    # Get current page
    page = await db.paginas.find_one({"pagina_id": "landing"})
    
    # Calculate order
    if page and page.get("bloques"):
        if orden is None:
            orden = max(b.get("orden", 0) for b in page["bloques"]) + 1
    else:
        orden = 0
    
    # Create new block
    new_block = BloquePagina(
        tipo=tipo,
        orden=orden,
        config=template["config_default"].copy()
    ).model_dump()
    
    if page:
        await db.paginas.update_one(
            {"pagina_id": "landing"},
            {
                "$push": {"bloques": new_block},
                "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        new_page = {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [new_block],
            "publicada": True,
            "fecha_actualizacion": datetime.now(timezone.utc).isoformat()
        }
        await db.paginas.insert_one(new_page)
    
    return {"success": True, "block": new_block}


@router.put("/admin/landing-page/blocks/reorder")
async def reorder_blocks(request: ReorderBlocksRequest, admin: dict = Depends(get_admin_user)):
    """Reorder blocks - expects {orders: [{bloque_id, orden}]}"""
    for item in request.orders:
        await db.paginas.update_one(
            {"pagina_id": "landing", "bloques.bloque_id": item.bloque_id},
            {"$set": {"bloques.$.orden": item.orden}}
        )
    
    await db.paginas.update_one(
        {"pagina_id": "landing"},
        {"$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}


@router.put("/admin/landing-page/blocks/{bloque_id}")
async def update_block(
    bloque_id: str,
    config: dict,
    activo: Optional[bool] = None,
    publicado: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """Update block configuration"""
    update_doc = {"bloques.$.config": config}
    if activo is not None:
        update_doc["bloques.$.activo"] = activo
    if publicado is not None:
        update_doc["bloques.$.publicado"] = publicado
    update_doc["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.paginas.update_one(
        {"pagina_id": "landing", "bloques.bloque_id": bloque_id},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True}


@router.put("/admin/landing-page/blocks/{bloque_id}/publish")
async def toggle_block_publish(bloque_id: str, publicado: bool, admin: dict = Depends(get_admin_user)):
    """Toggle block publish status (Publicado/En construcción)"""
    result = await db.paginas.update_one(
        {"pagina_id": "landing", "bloques.bloque_id": bloque_id},
        {"$set": {
            "bloques.$.publicado": publicado,
            "fecha_actualizacion": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True, "publicado": publicado}


@router.delete("/admin/landing-page/blocks/{bloque_id}")
async def delete_block(bloque_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a block from landing page"""
    result = await db.paginas.update_one(
        {"pagina_id": "landing"},
        {
            "$pull": {"bloques": {"bloque_id": bloque_id}},
            "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True}


@router.put("/admin/landing-page/publish")
async def toggle_publish_landing(publicada: bool, admin: dict = Depends(get_admin_user)):
    """Toggle landing page published status"""
    await db.paginas.update_one(
        {"pagina_id": "landing"},
        {"$set": {"publicada": publicada, "fecha_actualizacion": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True, "publicada": publicada}
