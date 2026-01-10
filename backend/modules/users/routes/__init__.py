"""
Users Module Routes
"""
from fastapi import APIRouter

from .users import router as users_router
from .wallet import router as wallet_router
from .memberships import router as memberships_router
from .qr_code import router as qr_router

# Main router for the users module
router = APIRouter()

# Include sub-routers
router.include_router(users_router)
router.include_router(wallet_router)
router.include_router(memberships_router)
router.include_router(qr_router)

__all__ = ["router"]
