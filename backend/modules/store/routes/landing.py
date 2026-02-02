"""
Store Module - Category Landing Routes
Endpoints for pages de landing de categorys y banners
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.auth import get_admin_user
from core.database import db
from ..services import category_service, product_service

router = APIRouter(prefix="/landing", tags=["Store - Landing"])


@router.get("/category/{categoria}")
async def get_category_landing_data(categoria: str):
    """Get todos los datos para landing de category"""
    return await category_service.get_category_landing(categoria)


@router.get("/banners/{categoria}")
async def get_category_banners(categoria: str):
    """Get banners activos de una category"""
    now = datetime.now(timezone.utc)
    query = {
        "categoria": categoria,
        "activo": True,
        "$or": [
            {"fecha_inicio": None, "fecha_fin": None},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": None},
            {"fecha_inicio": None, "fecha_fin": {"$gte": now}},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": {"$gte": now}}
        ]
    }
    banners = await db.category_banners.find(query, {"_id": 0}).sort("orden", 1).to_list(20)
    return banners


@router.get("/featured/{categoria}")
async def get_category_featured(categoria: str, limit: int = Query(10, ge=1, le=50)):
    """Get productos destacados de una category"""
    return await product_service.get_featured_products(categoria, limit)


@router.get("/promotions/{categoria}")
async def get_category_promotions(categoria: str, limit: int = Query(10, ge=1, le=50)):
    """Get productos en promotion de una category"""
    return await product_service.get_promotional_products(categoria, limit)


@router.get("/newest/{categoria}")
async def get_category_newest(categoria: str, limit: int = Query(8, ge=1, le=50)):
    """Get productos more nuevos de una category"""
    return await product_service.get_newest_products(categoria, limit)


# ============== ADMIN BANNER MANAGEMENT ==============

@router.get("/admin/banners")
async def get_all_banners(admin: dict = Depends(get_admin_user)):
    """Get todos los banners (admin)"""
    banners = await db.category_banners.find({}, {"_id": 0}).sort(
        [("categoria", 1), ("orden", 1)]
    ).to_list(100)
    return banners


@router.post("/admin/banners")
async def create_banner(banner: dict, admin: dict = Depends(get_admin_user)):
    """Create nuevo banner (admin)"""
    doc = {
        "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
        "categoria": banner.get("categoria"),
        "titulo": banner.get("titulo"),
        "subtitulo": banner.get("subtitulo"),
        "imagen_url": banner.get("imagen_url"),
        "link_url": banner.get("link_url"),
        "activo": banner.get("activo", True),
        "orden": banner.get("orden", 0),
        "fecha_inicio": banner.get("fecha_inicio"),
        "fecha_fin": banner.get("fecha_fin"),
        "creado_por": "admin",
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.category_banners.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/admin/banners/{banner_id}")
async def update_banner(
    banner_id: str,
    banner: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update banner (admin)"""
    update_data = {
        k: v for k, v in banner.items()
        if k not in ["banner_id", "_id", "fecha_creacion"]
    }
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.category_banners.update_one(
        {"banner_id": banner_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    updated = await db.category_banners.find_one({"banner_id": banner_id}, {"_id": 0})
    return updated


@router.delete("/admin/banners/{banner_id}")
async def delete_banner(banner_id: str, admin: dict = Depends(get_admin_user)):
    """Delete banner (admin)"""
    result = await db.category_banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner not found")
    return {"success": True}


# ============== VENDOR PERMISSIONS ==============

@router.get("/admin/vendor-permissions")
async def get_all_vendor_permissions(admin: dict = Depends(get_admin_user)):
    """Get todos los permisos de vendors (admin)"""
    permissions = await db.vendor_permissions.find({}, {"_id": 0}).to_list(100)
    return permissions


@router.get("/admin/vendor-permissions/{vendor_id}")
async def get_vendor_permissions(vendor_id: str, admin: dict = Depends(get_admin_user)):
    """Get permisos de un vendor specific"""
    permissions = await db.vendor_permissions.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not permissions:
        return {
            "vendor_id": vendor_id,
            "puede_crear_banners": False,
            "puede_destacar_productos": False,
            "puede_crear_promociones": False,
            "puede_publicar_noticias": False,
            "max_banners": 3,
            "max_productos_destacados": 5
        }
    return permissions


@router.put("/admin/vendor-permissions/{vendor_id}")
async def update_vendor_permissions(
    vendor_id: str,
    data: dict,
    admin: dict = Depends(get_admin_user)
):
    """Update permisos de vendor (admin)"""
    update_data = {
        "vendor_id": vendor_id,
        "puede_crear_banners": data.get("puede_crear_banners", False),
        "puede_destacar_productos": data.get("puede_destacar_productos", False),
        "puede_crear_promociones": data.get("puede_crear_promociones", False),
        "puede_publicar_noticias": data.get("puede_publicar_noticias", False),
        "max_banners": data.get("max_banners", 3),
        "max_productos_destacados": data.get("max_productos_destacados", 5),
        "fecha_actualizacion": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_permissions.update_one(
        {"vendor_id": vendor_id},
        {"$set": update_data},
        upsert=True
    )
    return {"success": True, "permissions": update_data}
