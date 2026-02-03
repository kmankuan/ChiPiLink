"""
Content Hub Routes - Endpoints para Curation de Contenido

PLACEHOLDER - Endpoints a implementar:
- GET/POST /content-hub/items - Contenido curado
- GET/POST /content-hub/categories - Categorys por audiencia
- GET/POST /content-hub/playlists - Colecciones de contenido
- GET /content-hub/feed/{category} - Feed por category
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
    {"source_id": "youtube", "name": "YouTube", "icono": "🎬", "color": "#FF0000"},
    {"source_id": "instagram", "name": "Instagram", "icono": "📸", "color": "#E4405F"},
    {"source_id": "tiktok", "name": "TikTok", "icono": "🎵", "color": "#000000"},
    {"source_id": "facebook", "name": "Facebook", "icono": "📘", "color": "#1877F2"},
    {"source_id": "wechat", "name": "WeChat", "icono": "💬", "color": "#07C160"},
    {"source_id": "xiaohongshu", "name": "Xiaohongshu", "icono": "📕", "color": "#FF2442"},
    {"source_id": "telegram", "name": "Telegram", "icono": "✈️", "color": "#0088CC"},
    {"source_id": "twitter", "name": "X/Twitter", "icono": "🐦", "color": "#1DA1F2"},
]

# Categorys por audiencia predefinidas
DEFAULT_CATEGORIES = [
    {"category_id": "ninos", "name": "Para Childs", "nombre_en": "For Kids", "nombre_zh": "儿童内容", "icono": "👶", "orden": 1},
    {"category_id": "padres", "name": "Padres de Familia", "nombre_en": "For Parents", "nombre_zh": "家长内容", "icono": "👨‍👩‍👧", "orden": 2},
    {"category_id": "cultura_local", "name": "Cultura Local", "nombre_en": "Local Culture", "nombre_zh": "当地文化", "icono": "🌴", "orden": 3},
    {"category_id": "cultura_china", "name": "Cultura China", "nombre_en": "Chinese Culture", "nombre_zh": "中国文化", "icono": "🏮", "orden": 4},
    {"category_id": "educativo", "name": "Educativo", "nombre_en": "Educational", "nombre_zh": "教育内容", "icono": "📚", "orden": 5},
    {"category_id": "entretenimiento", "name": "Entretenimiento", "nombre_en": "Entertainment", "nombre_zh": "娱乐", "icono": "🎉", "orden": 6},
    {"category_id": "idiomas", "name": "Aprender Idiomas", "nombre_en": "Language Learning", "nombre_zh": "语言学习", "icono": "🗣️", "orden": 7},
]


# ============== STATUS ==============

@router.get("/status")
async def get_content_hub_status():
    """Get Content Hub module status"""
    return {
        "module": "content_hub",
        "status": "placeholder",
        "message": "Content Hub - Curation de Contenido Multimedia",
        "planned_features": [
            "Importar videos/posts de multiple redes sociales",
            "Categorization por audiencia (childs, padres, etc.)",
            "Embed de videos (YouTube, Instagram, etc.)",
            "Playlists y collections",
            "Feed personalizado por category",
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
    categories = await db.content_categories.find({"active": True}, {"_id": 0}).sort("orden", 1).to_list(50)
    if not categories:
        return DEFAULT_CATEGORIES
    return categories


@router.post("/admin/categories")
async def create_category(category: dict, admin: dict = Depends(get_admin_user)):
    """Create content category - PLACEHOLDER"""
    doc = {
        "category_id": category.get("category_id") or f"cat_{uuid.uuid4().hex[:8]}",
        "name": category.get("name"),
        "nombre_en": category.get("nombre_en"),
        "nombre_zh": category.get("nombre_zh"),
        "description": category.get("description"),
        "icono": category.get("icono"),
        "orden": category.get("orden", 0),
        "active": True
    }
    await db.content_categories.insert_one(doc)
    del doc["_id"]
    return doc


# ============== CONTENT ITEMS ==============

@router.get("/items")
async def get_content_items(
    category: Optional[str] = None,
    source: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = 50
):
    """Get curated content items - PLACEHOLDER"""
    query = {"publicado": True}
    if category:
        query["categorys"] = category
    if source:
        query["source"] = source
    if destacado is not None:
        query["featured"] = destacado
    
    items = await db.content_items.find(query, {"_id": 0}).sort([
        ("featured", -1),
        ("created_at", -1)
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
        "description": item.get("description"),
        "source": item.get("source"),
        "url_original": item.get("url_original"),
        "embed_url": item.get("embed_url"),
        "embed_code": item.get("embed_code"),
        "thumbnail_url": item.get("thumbnail_url"),
        "categorys": item.get("categorys", []),
        "tags": item.get("tags", []),
        "autor_original": item.get("autor_original"),
        "duracion_segundos": item.get("duracion_segundos"),
        "idioma": item.get("idioma"),
        "publicado": item.get("publicado", True),
        "featured": item.get("featured", False),
        "curado_por": admin.get("user_id"),
        "vistas": 0,
        "likes": 0,
        "created_at": datetime.now(timezone.utc)
    }
    await db.content_items.insert_one(doc)
    del doc["_id"]
    return doc


# ============== FEED ==============

@router.get("/feed/{category_id}")
async def get_category_feed(category_id: str, limit: int = 20):
    """Get content feed for specific category/audience - PLACEHOLDER"""
    items = await db.content_items.find(
        {"categorys": category_id, "publicado": True},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return {
        "category_id": category_id,
        "items": items,
        "total": len(items)
    }


# ============== PLAYLISTS ==============

@router.get("/playlists")
async def get_playlists(category: Optional[str] = None):
    """Get content playlists - PLACEHOLDER"""
    query = {"publicada": True}
    if category:
        query["category_id"] = category
    
    playlists = await db.content_playlists.find(query, {"_id": 0}).sort("orden", 1).to_list(50)
    return playlists


@router.post("/admin/playlists")
async def create_playlist(playlist: dict, admin: dict = Depends(get_admin_user)):
    """Create content playlist - PLACEHOLDER"""
    doc = {
        "playlist_id": f"playlist_{uuid.uuid4().hex[:12]}",
        "titulo": playlist.get("titulo"),
        "description": playlist.get("description"),
        "imagen_portada": playlist.get("imagen_portada"),
        "category_id": playlist.get("category_id"),
        "items": playlist.get("items", []),
        "publicada": True,
        "orden": playlist.get("orden", 0),
        "created_at": datetime.now(timezone.utc)
    }
    await db.content_playlists.insert_one(doc)
    del doc["_id"]
    return doc
