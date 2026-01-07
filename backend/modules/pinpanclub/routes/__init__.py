"""
PinpanClub - Main Router
Agrega todos los routers del módulo
"""
from fastapi import APIRouter

from .players import router as players_router
from .matches import router as matches_router
from .monday import router as monday_router

# Router principal del módulo
router = APIRouter(prefix="/pinpanclub", tags=["PinpanClub"])

# Incluir sub-routers
router.include_router(players_router)
router.include_router(matches_router)
router.include_router(monday_router)

# Re-exportar para compatibilidad con rutas antiguas
pinpanclub_router = router
