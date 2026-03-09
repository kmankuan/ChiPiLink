"""
Store Module (Unatienda) - Main Router
Public store routes only. Sysbook-specific routes have been moved to modules/sysbook/.
"""
from fastapi import APIRouter

from .products import router as products_router
from .categories import router as categories_router
from .inventory import router as inventory_router
from .public import router as public_router
from .landing import router as landing_router
from .form_config import router as form_config_router
from .order_form_config import router as order_form_config_router
from .inventory_import import router as inventory_import_router
from .analytics import router as analytics_router
from .store_config import router as store_config_router
from .monday_sync import router as monday_sync_router
from .order_summary_config import router as order_summary_config_router
from .stock_orders import router as stock_orders_router
from .crm_chat import router as crm_chat_router
from .store_checkout_form_config import router as store_checkout_form_router

# Main module router
router = APIRouter(prefix="/store", tags=["Store"])

# Unatienda-specific routes
router.include_router(products_router)
router.include_router(categories_router)
router.include_router(inventory_router)
router.include_router(public_router)
router.include_router(landing_router)
router.include_router(form_config_router)
router.include_router(order_form_config_router)
router.include_router(inventory_import_router)
router.include_router(analytics_router)
router.include_router(store_config_router)
router.include_router(monday_sync_router)
router.include_router(order_summary_config_router)
router.include_router(stock_orders_router)
router.include_router(crm_chat_router)
router.include_router(store_checkout_form_router)

# Re-export for compatibility
store_refactored_router = router
