"""
PinpanClub - Main Router
Agrega todos los routers del módulo
"""
from fastapi import APIRouter

from .players import router as players_router
from .matches import router as matches_router
from .monday import router as monday_router
from .sponsors import router as sponsors_router
from .canvas import router as canvas_router
from .websocket import ws_router

# Router principal del módulo
router = APIRouter(prefix="/pinpanclub", tags=["PinpanClub"])

# Incluir sub-routers
router.include_router(players_router)
router.include_router(matches_router)
router.include_router(monday_router)
router.include_router(sponsors_router)
router.include_router(canvas_router)
router.include_router(ws_router)

# Re-exportar para compatibilidad con rutas antiguas
pinpanclub_router = router
