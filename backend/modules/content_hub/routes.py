"""
Content Hub Routes - Endpoints para Curación de Contenido

PLACEHOLDER - Endpoints a implementar:
- GET/POST /content-hub/items - Contenido curado
- GET/POST /content-hub/categories - Categorías por audiencia
- GET/POST /content-hub/playlists - Colecciones de contenido
- GET /content-hub/feed/{category} - Feed por categoría
- POST /content-hub/import - Importar desde URL
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.auth import get_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content-hub", tags=["Content Hub"])

# Supported content sources
CONTENT_SOURCES = [
    {"source_id": "youtube", "nombre": "YouTube", "icono": "🎬", "color": "#FF0000"},
    {"source_id": "instagram", "nombre": "Instagram", "icono": "📸", "color": "#E4405F"},
    {"source_id": "tiktok", "nombre": "TikTok", "icono": "🎵", "color": "#000000"},
    {"source_id": "facebook", "nombre": "Facebook", "icono": "📘", "color": "#1877F2"},
    {"source_id": "wechat", "nombre": "WeChat", "icono": "💬", "color": "#07C160"},
    {"source_id": "xiaohongshu", "nombre": "Xiaohongshu", "icono": "📕", "color": "#FF2442"},
    {"source_id": "telegram", "nombre": "Telegram", "icono": "✈️", "color": "#0088CC"},
    {"source_id": "twitter", "nombre": "X/Twitter", "icono": "🐦", "color": "#1DA1F2"},
]

# Categorías por audiencia predefinidas
DEFAULT_CATEGORIES = [
    {"category_id": "ninos", "nombre": "Para Niños", "nombre_en": "For Kids", "nombre_zh": "儿童内容", "icono": "👶", "orden": 1},
    {"category_id": "padres", "nombre": "Padres de Familia", "nombre_en": "For Parents", "nombre_zh": "家长内容", "icono": "👨‍👩‍👧", "orden": 2},
    {"category_id": "cultura_local", "nombre": "Cultura Local", "nombre_en": "Local Culture", "nombre_zh": "当地文化", "icono": "🌴", "orden": 3},
    {"category_id": "cultura_china", "nombre": "Cultura China", "nombre_en": "Chinese Culture", "nombre_zh": "中国文化", "icono": "🏮", "orden": 4},
    {"category_id": "educativo", "nombre": "Educativo", "nombre_en": "Educational", "nombre_zh": "教育内容", "icono": "📚", "orden": 5},
    {"category_id": "entretenimiento", "nombre": "Entretenimiento", "nombre_en": "Entertainment", "nombre_zh": "娱乐", "icono": "🎉", "orden": 6},
    {"category_id": "idiomas", "nombre": "Aprender Idiomas", "nombre_en": "Language Learning", "nombre_zh": "语言学习", "icono": "🗣️", "orden": 7},
]


# ============== STATUS ==============

@router.get("/status")
async def get_content_hub_status():
    """Get Content Hub module status"""
    return {
        "module": "content_hub",
        "status": "placeholder",
        "message": "Content Hub - Curación de Contenido Multimedia",
        "planned_features": [
            "Importar videos/posts de múltiples redes sociales",
            "Categorización por audiencia (niños, padres, etc.)",
            "Embed de videos (YouTube, Instagram, etc.)",
            "Playlists y colecciones",
            "Feed personalizado por categoría",
            "Preview con thumbnails"
        ],
        "supported_sources": CONTENT_SOURCES
    }


# ============== SOURCES ==============

@router.get("/sources")
async def get_content_sources():
    """Get supported content sources"""
    return CONTENT_SOURCES


# ============== CATEGORIES ==============

@router.get("/categories")
async def get_categories():
    """Get content categories (audiences)"""
    categories = await db.content_categories.find({"activo": True}, {"_id": 0}).sort("orden", 1).to_list(50)
    if not categories:
        return DEFAULT_CATEGORIES
    return categories


@router.post("/admin/categories")
async def create_category(category: dict, admin: dict = Depends(get_admin_user)):
    """Create content category - PLACEHOLDER"""
    doc = {
        "category_id": category.get("category_id") or f"cat_{uuid.uuid4().hex[:8]}",
        "nombre": category.get("nombre"),
        "nombre_en": category.get("nombre_en"),
        "nombre_zh": category.get("nombre_zh"),
        "descripcion": category.get("descripcion"),
        "icono": category.get("icono"),
        "orden": category.get("orden", 0),
        "activo": True
    }
    await db.content_categories.insert_one(doc)
    del doc["_id"]
    return doc


# ============== CONTENT ITEMS ==============

@router.get("/items")
async def get_content_items(
    categoria: Optional[str] = None,
    source: Optional[str] = None,
    destacado: Optional[bool] = None,
    limit: int = 50
):
    """Get curated content items - PLACEHOLDER"""
    query = {"publicado": True}
    if categoria:
        query["categorias"] = categoria
    if source:
        query["source"] = source
    if destacado is not None:
        query["destacado"] = destacado
    
    items = await db.content_items.find(query, {"_id": 0}).sort([
        ("destacado", -1),
        ("fecha_creacion", -1)
    ]).to_list(limit)
    return items


@router.get("/items/{content_id}")
async def get_content_item(content_id: str):
    """Get single content item - PLACEHOLDER"""
    item = await db.content_items.find_one({"content_id": content_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Contenido not found")
    
    # Increment views
    await db.content_items.update_one(
        {"content_id": content_id},
        {"$inc": {"vistas": 1}}
    )
    return item


@router.post("/admin/items")
async def create_content_item(item: dict, admin: dict = Depends(get_admin_user)):
    """Create curated content item - PLACEHOLDER"""
    doc = {
        "content_id": f"content_{uuid.uuid4().hex[:12]}",
        "titulo": item.get("titulo"),
        "descripcion": item.get("descripcion"),
        "source": item.get("source"),
        "url_original": item.get("url_original"),
        "embed_url": item.get("embed_url"),
        "embed_code": item.get("embed_code"),
        "thumbnail_url": item.get("thumbnail_url"),
        "categorias": item.get("categorias", []),
        "tags": item.get("tags", []),
        "autor_original": item.get("autor_original"),
        "duracion_segundos": item.get("duracion_segundos"),
        "idioma": item.get("idioma"),
        "publicado": item.get("publicado", True),
        "destacado": item.get("destacado", False),
        "curado_por": admin.get("user_id"),
        "vistas": 0,
        "likes": 0,
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.content_items.insert_one(doc)
    del doc["_id"]
    return doc


# ============== FEED ==============

@router.get("/feed/{category_id}")
async def get_category_feed(category_id: str, limit: int = 20):
    """Get content feed for specific category/audience - PLACEHOLDER"""
    items = await db.content_items.find(
        {"categorias": category_id, "publicado": True},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(limit)
    
    return {
        "category_id": category_id,
        "items": items,
        "total": len(items)
    }


# ============== PLAYLISTS ==============

@router.get("/playlists")
async def get_playlists(categoria: Optional[str] = None):
    """Get content playlists - PLACEHOLDER"""
    query = {"publicada": True}
    if categoria:
        query["categoria_id"] = categoria
    
    playlists = await db.content_playlists.find(query, {"_id": 0}).sort("orden", 1).to_list(50)
    return playlists


@router.post("/admin/playlists")
async def create_playlist(playlist: dict, admin: dict = Depends(get_admin_user)):
    """Create content playlist - PLACEHOLDER"""
    doc = {
        "playlist_id": f"playlist_{uuid.uuid4().hex[:12]}",
        "titulo": playlist.get("titulo"),
        "descripcion": playlist.get("descripcion"),
        "imagen_portada": playlist.get("imagen_portada"),
        "categoria_id": playlist.get("categoria_id"),
        "items": playlist.get("items", []),
        "publicada": True,
        "orden": playlist.get("orden", 0),
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.content_playlists.insert_one(doc)
    del doc["_id"]
    return doc
