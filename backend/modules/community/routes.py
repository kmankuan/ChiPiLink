"""
Community Routes - Posts, events, gallery endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.auth import get_admin_user, get_optional_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/community", tags=["Community"])


# ============== PUBLIC POST ROUTES ==============

@router.get("/posts")
async def get_community_posts(
    tipo: Optional[str] = None,
    destacado: Optional[bool] = None,
    limit: int = 20
):
    """Get published community posts (public)"""
    now = datetime.now(timezone.utc)
    query = {
        "publicado": True,
        "$or": [
            {"fecha_expiracion": None},
            {"fecha_expiracion": {"$gte": now}}
        ]
    }
    if tipo:
        query["tipo"] = tipo
    if destacado is not None:
        query["destacado"] = destacado
    
    posts = await db.community_posts.find(query, {"_id": 0}).sort([
        ("destacado", -1),
        ("fecha_publicacion", -1)
    ]).to_list(limit)
    return posts


@router.get("/posts/{post_id}")
async def get_community_post(post_id: str):
    """Get a single community post and increment views"""
    post = await db.community_posts.find_one({"post_id": post_id, "publicado": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    # Increment views
    await db.community_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"vistas": 1}}
    )
    post["vistas"] = post.get("vistas", 0) + 1
    return post


@router.post("/posts/{post_id}/like")
async def like_post(post_id: str):
    """Like a post"""
    result = await db.community_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"likes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return {"success": True}


# ============== COMMENTS ROUTES ==============

@router.get("/posts/{post_id}/comments")
async def get_post_comments(post_id: str):
    """Get comments for a post"""
    comments = await db.community_comments.find(
        {"post_id": post_id, "aprobado": True},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(100)
    return comments


@router.post("/posts/{post_id}/comments")
async def add_comment(post_id: str, comment: dict, user: Optional[dict] = Depends(get_optional_user)):
    """Add a comment to a post"""
    # Check if post exists and allows comments
    post = await db.community_posts.find_one({"post_id": post_id, "publicado": True})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if not post.get("permite_comentarios", True):
        raise HTTPException(status_code=400, detail="Este post no permite comentarios")
    
    doc = {
        "comment_id": f"comment_{uuid.uuid4().hex[:12]}",
        "post_id": post_id,
        "usuario_id": user.get("cliente_id") if user else None,
        "nombre_usuario": comment.get("nombre_usuario") or (user.get("nombre") if user else "Anónimo"),
        "contenido": comment.get("contenido"),
        "fecha_creacion": datetime.now(timezone.utc),
        "aprobado": True,  # Auto-approve for now
        "likes": 0
    }
    await db.community_comments.insert_one(doc)
    del doc["_id"]
    return doc


# ============== PUBLIC EVENTS ROUTES ==============

@router.get("/events")
async def get_community_events(upcoming: bool = True, limit: int = 10):
    """Get community events"""
    now = datetime.now(timezone.utc)
    query = {"estado": {"$ne": "cancelado"}}
    
    if upcoming:
        query["fecha_inicio"] = {"$gte": now}
        sort_order = 1  # Ascending for upcoming
    else:
        sort_order = -1  # Descending for past
    
    events = await db.community_events.find(query, {"_id": 0}).sort([
        ("destacado", -1),
        ("fecha_inicio", sort_order)
    ]).to_list(limit)
    return events


@router.get("/events/{evento_id}")
async def get_community_event(evento_id: str):
    """Get a single event"""
    event = await db.community_events.find_one({"evento_id": evento_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return event


# ============== PUBLIC GALLERY ROUTES ==============

@router.get("/gallery")
async def get_gallery_albums():
    """Get all active gallery albums"""
    albums = await db.gallery_albums.find({"activo": True}, {"_id": 0}).sort("orden", 1).to_list(50)
    return albums


@router.get("/gallery/{album_id}")
async def get_gallery_album(album_id: str):
    """Get a single gallery album"""
    album = await db.gallery_albums.find_one({"album_id": album_id}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="\u00c1lbum no encontrado")
    return album


# ============== LANDING DATA ROUTE ==============

@router.get("/landing")
async def get_community_landing_data():
    """Get all data needed for the community landing page"""
    now = datetime.now(timezone.utc)
    
    # Featured posts (hero section)
    featured_posts = await db.community_posts.find(
        {"publicado": True, "destacado": True},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(5)
    
    # Latest news
    news = await db.community_posts.find(
        {"publicado": True, "tipo": "noticia"},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(6)
    
    # Announcements
    announcements = await db.community_posts.find(
        {"publicado": True, "tipo": "anuncio"},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(4)
    
    # Upcoming events
    events = await db.community_events.find(
        {"fecha_inicio": {"$gte": now}, "estado": {"$ne": "cancelado"}},
        {"_id": 0}
    ).sort([("destacado", -1), ("fecha_inicio", 1)]).to_list(5)
    
    # Gallery albums
    albums = await db.gallery_albums.find(
        {"activo": True},
        {"_id": 0}
    ).sort("orden", 1).to_list(4)
    
    # Featured products from store (limited)
    featured_products = await db.libros.find(
        {"destacado": True, "activo": True},
        {"_id": 0}
    ).sort("orden_destacado", 1).to_list(4)
    
    # Promotional products
    promo_products = await db.libros.find(
        {"en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}},
        {"_id": 0}
    ).to_list(4)
    
    return {
        "destacados": featured_posts,
        "noticias": news,
        "anuncios": announcements,
        "eventos": events,
        "galerias": albums,
        "productos_destacados": featured_products,
        "productos_promocion": promo_products
    }


# ============== ADMIN POST ROUTES ==============

@router.get("/admin/posts")
async def get_all_community_posts(admin: dict = Depends(get_admin_user)):
    """Get all community posts (admin)"""
    posts = await db.community_posts.find({}, {"_id": 0}).sort("fecha_creacion", -1).to_list(100)
    return posts


@router.post("/admin/posts")
async def create_community_post(post: dict, admin: dict = Depends(get_admin_user)):
    """Create a new community post"""
    doc = {
        "post_id": f"post_{uuid.uuid4().hex[:12]}",
        "tipo": post.get("tipo", "noticia"),
        "titulo": post.get("titulo"),
        "contenido": post.get("contenido"),
        "resumen": post.get("resumen"),
        "imagen_url": post.get("imagen_url"),
        "imagen_galeria": post.get("imagen_galeria"),
        "video_url": post.get("video_url"),
        "fecha_evento": post.get("fecha_evento"),
        "lugar_evento": post.get("lugar_evento"),
        "publicado": post.get("publicado", False),
        "destacado": post.get("destacado", False),
        "orden": post.get("orden", 0),
        "fecha_publicacion": datetime.now(timezone.utc) if post.get("publicado") else None,
        "fecha_expiracion": post.get("fecha_expiracion"),
        "tags": post.get("tags"),
        "categoria": post.get("categoria"),
        "permite_comentarios": post.get("permite_comentarios", True),
        "fuente": "admin",
        "creado_por": admin.get("cliente_id"),
        "fecha_creacion": datetime.now(timezone.utc),
        "vistas": 0,
        "likes": 0
    }
    await db.community_posts.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/admin/posts/{post_id}")
async def update_community_post(post_id: str, post: dict, admin: dict = Depends(get_admin_user)):
    """Update a community post"""
    existing = await db.community_posts.find_one({"post_id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    update_data = {k: v for k, v in post.items() if k not in ["post_id", "_id", "fecha_creacion"]}
    
    # Set publication date if being published for first time
    if post.get("publicado") and not existing.get("fecha_publicacion"):
        update_data["fecha_publicacion"] = datetime.now(timezone.utc)
    
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    await db.community_posts.update_one(
        {"post_id": post_id},
        {"$set": update_data}
    )
    
    updated = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0})
    return updated


@router.delete("/admin/posts/{post_id}")
async def delete_community_post(post_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a community post"""
    result = await db.community_posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    # Also delete comments
    await db.community_comments.delete_many({"post_id": post_id})
    return {"success": True}


# ============== ADMIN EVENTS ROUTES ==============

@router.post("/admin/events")
async def create_community_event(event: dict, admin: dict = Depends(get_admin_user)):
    """Create a new community event"""
    # Parse dates
    fecha_inicio = event.get("fecha_inicio")
    if isinstance(fecha_inicio, str):
        fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    fecha_fin = event.get("fecha_fin")
    if isinstance(fecha_fin, str):
        fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    doc = {
        "evento_id": f"evento_{uuid.uuid4().hex[:12]}",
        "titulo": event.get("titulo"),
        "descripcion": event.get("descripcion"),
        "tipo": event.get("tipo", "otro"),
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "lugar": event.get("lugar"),
        "imagen_url": event.get("imagen_url"),
        "requiere_inscripcion": event.get("requiere_inscripcion", False),
        "max_participantes": event.get("max_participantes"),
        "inscripciones": [],
        "estado": "programado",
        "destacado": event.get("destacado", False),
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.community_events.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/admin/events/{evento_id}")
async def update_community_event(evento_id: str, event: dict, admin: dict = Depends(get_admin_user)):
    """Update a community event"""
    update_data = {k: v for k, v in event.items() if k not in ["evento_id", "_id", "fecha_creacion"]}
    
    result = await db.community_events.update_one(
        {"evento_id": evento_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    updated = await db.community_events.find_one({"evento_id": evento_id}, {"_id": 0})
    return updated


@router.delete("/admin/events/{evento_id}")
async def delete_community_event(evento_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a community event"""
    result = await db.community_events.delete_one({"evento_id": evento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"success": True}


# ============== ADMIN GALLERY ROUTES ==============

@router.post("/admin/gallery")
async def create_gallery_album(album: dict, admin: dict = Depends(get_admin_user)):
    """Create a new gallery album"""
    doc = {
        "album_id": f"album_{uuid.uuid4().hex[:12]}",
        "titulo": album.get("titulo"),
        "descripcion": album.get("descripcion"),
        "google_photos_url": album.get("google_photos_url"),
        "google_photos_album_id": album.get("google_photos_album_id"),
        "fotos": album.get("fotos", []),
        "imagen_portada": album.get("imagen_portada"),
        "orden": album.get("orden", 0),
        "activo": album.get("activo", True),
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.gallery_albums.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/admin/gallery/{album_id}")
async def update_gallery_album(album_id: str, album: dict, admin: dict = Depends(get_admin_user)):
    """Update a gallery album"""
    update_data = {k: v for k, v in album.items() if k not in ["album_id", "_id", "fecha_creacion"]}
    
    result = await db.gallery_albums.update_one(
        {"album_id": album_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="\u00c1lbum no encontrado")
    
    updated = await db.gallery_albums.find_one({"album_id": album_id}, {"_id": 0})
    return updated


@router.delete("/admin/gallery/{album_id}")
async def delete_gallery_album(album_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a gallery album"""
    result = await db.gallery_albums.delete_one({"album_id": album_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="\u00c1lbum no encontrado")
    return {"success": True}
