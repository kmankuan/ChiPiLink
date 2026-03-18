"""
Sysbook Routes — /api/sysbook/*
All school textbook management routes consolidated here.
"""
from fastapi import APIRouter

# Sysbook-native routes
from .inventory import router as inventory_router
from .stock_orders import router as stock_orders_router
from .analytics import router as analytics_router
from .alerts import router as alerts_router
from .browse import router as browse_router
from .access import router as access_router
from .orders import router as orders_router
from .presale_import import router as presale_import_router
from .school_year import router as school_year_router
from .bulk_import import router as bulk_import_router

# Still shared from store (generic store infrastructure)
from modules.store.routes.inventory_import import router as inventory_import_router
from modules.store.routes.form_config import router as form_config_router
from modules.store.routes.order_form_config import router as order_form_config_router
from modules.store.routes.monday_sync import router as monday_sync_router

router = APIRouter(prefix="/sysbook", tags=["Sysbook"])

# Core sysbook routes
router.include_router(inventory_router)
router.include_router(stock_orders_router)
router.include_router(analytics_router)
router.include_router(alerts_router)
router.include_router(browse_router)
router.include_router(access_router)
router.include_router(orders_router)
router.include_router(presale_import_router)
router.include_router(school_year_router)
router.include_router(bulk_import_router)

# Shared store infrastructure routes
router.include_router(inventory_import_router)
router.include_router(form_config_router)
router.include_router(order_form_config_router)
router.include_router(monday_sync_router)
