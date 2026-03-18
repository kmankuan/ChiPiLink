"""
Auth Module - Main Router
Agrega todos los routers del module de authentication
"""
from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .auth_config import router as auth_config_router

# Router principal del module Auth (refactorizado)
router = APIRouter(prefix="/auth-v2", tags=["Auth"])

# Include sub-routers
router.include_router(auth_router)
router.include_router(users_router)
router.include_router(auth_config_router)

# Re-export for compatibility
auth_refactored_router = router
