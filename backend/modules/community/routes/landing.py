"""
Community Module - Landing Routes
Endpoints para datos de landing de comunidad
"""
from fastapi import APIRouter
from datetime import datetime, timezone

from core.database import db
from ..services import post_service, event_service, album_service

router = APIRouter(prefix="/landing", tags=["Community - Landing"])


@router.get("")
async def get_community_landing_data():
    """
    Obtener todos los datos necesarios para la page de landing de comunidad.
    Combina datos de posts, eventos, galería y productos.
    """
    # Featured posts (hero section)
    featured_posts = await post_service.get_published_posts(
        destacado=True,
        limit=5
    )
    
    # Latest news
    news = await post_service.get_published_posts(
        tipo="noticia",
        limit=6
    )
    
    # Announcements
    announcements = await post_service.get_published_posts(
        tipo="anuncio",
        limit=4
    )
    
    # Upcoming events
    events = await event_service.get_events(upcoming=True, limit=5)
    
    # Gallery albums
    albums = await album_service.get_active_albums(limit=4)
    
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
        "destacados": [p.model_dump() for p in featured_posts],
        "noticias": [p.model_dump() for p in news],
        "anuncios": [p.model_dump() for p in announcements],
        "eventos": [e.model_dump() for e in events],
        "galerias": [a.model_dump() for a in albums],
        "productos_destacados": featured_products,
        "productos_promocion": promo_products
    }
