"""
Notification Routes Module
"""
from fastapi import APIRouter

from .notifications import router as notifications_router
from .posts import router as posts_router

router = APIRouter()

router.include_router(notifications_router)
router.include_router(posts_router)

__all__ = ["router"]
