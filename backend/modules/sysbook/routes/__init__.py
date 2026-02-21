"""
Sysbook Routes — /api/sysbook/*
"""
from fastapi import APIRouter

from .inventory import router as inventory_router
from .stock_orders import router as stock_orders_router
from .analytics import router as analytics_router
from .alerts import router as alerts_router

# Re-use store routes that are already textbook-specific
from modules.store.routes.inventory_import import router as inventory_import_router
from modules.store.routes.textbook_access import router as textbook_access_router
from modules.store.routes.form_config import router as form_config_router
from modules.store.routes.textbook_orders import router as textbook_orders_router
from modules.store.routes.school_year import router as school_year_router
from modules.store.routes.order_form_config import router as order_form_config_router
from modules.store.routes.presale_import import router as presale_import_router
from modules.store.routes.monday_sync import router as monday_sync_router

router = APIRouter(prefix="/sysbook", tags=["Sysbook"])

# New Sysbook-specific routes
router.include_router(inventory_router)
router.include_router(stock_orders_router)
router.include_router(analytics_router)
router.include_router(alerts_router)

# Re-mounted store routes (already PCA-scoped)
router.include_router(inventory_import_router)
router.include_router(textbook_access_router)
router.include_router(form_config_router)
router.include_router(textbook_orders_router)
router.include_router(school_year_router)
router.include_router(order_form_config_router)
router.include_router(presale_import_router)
router.include_router(monday_sync_router)
