"""
Community Module - Main Router
Agrega todos los routers del module de comunidad
"""
from fastapi import APIRouter

from .posts import router as posts_router
from .events import router as events_router
from .gallery import router as gallery_router
from .landing import router as landing_router
from .telegram_feed import router as telegram_feed_router

# Main router for Community module (refactored)
router = APIRouter(prefix="/community-v2", tags=["Community"])

# Include sub-routers
router.include_router(posts_router)
router.include_router(events_router)
router.include_router(gallery_router)
router.include_router(landing_router)
router.include_router(telegram_feed_router)

# Re-export for compatibility
community_refactored_router = router
