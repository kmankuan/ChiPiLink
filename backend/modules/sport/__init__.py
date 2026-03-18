"""
Sport Module — Router Registration
"""
from .routes import router
from .tournament_routes import router as tournament_router

__all__ = ["router", "tournament_router"]
