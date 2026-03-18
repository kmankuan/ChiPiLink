"""
Admin Module - Notifications, form config, setup, seed data, menu
"""
from .routes import router
from .menu_routes import router as menu_router

__all__ = ["router", "menu_router"]
