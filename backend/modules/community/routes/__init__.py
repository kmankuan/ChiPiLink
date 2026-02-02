"""
Community Module - Main Router
Agrega todos los routers del módulo de comunidad
"""
from fastapi import APIRouter

from .posts import router as posts_router
from .events import router as events_router
from .gallery import router as gallery_router
from .landing import router as landing_router

# Router principal del módulo Community (refactorizado)
router = APIRouter(prefix="/community-v2", tags=["Community"])

# Include sub-routers
router.include_router(posts_router)
router.include_router(events_router)
router.include_router(gallery_router)
router.include_router(landing_router)

# Re-exportar para compatibilidad
community_refactored_router = router
