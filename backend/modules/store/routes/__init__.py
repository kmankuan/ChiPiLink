"""
Store Module - Main Router
Includes all store module routers

REFACTORED: Removed legacy routers (students, vinculacion, orders, pedidos, monday)
- students.py → replaced by textbook_access.py
- vinculacion.py → replaced by textbook_access.py  
- orders.py → replaced by textbook_orders.py
- pedidos.py → REMOVED (legacy pre-order system)
- monday.py → REMOVED (legacy Monday.com integration for pedidos)
"""
from fastapi import APIRouter

from .products import router as products_router
from .categories import router as categories_router
from .inventory import router as inventory_router
from .public import router as public_router
from .landing import router as landing_router
from .bulk_import import router as bulk_import_router
from .private_catalog import router as private_catalog_router
from .textbook_access import router as textbook_access_router
from .form_config import router as form_config_router
from .textbook_orders import router as textbook_orders_router
from .school_year import router as school_year_router
from .order_form_config import router as order_form_config_router
from .inventory_import import router as inventory_import_router
from .analytics import router as analytics_router
from .store_config import router as store_config_router
from .monday_sync import router as monday_sync_router

# Main module router
router = APIRouter(prefix="/store", tags=["Store"])

# Include sub-routers
router.include_router(products_router)
router.include_router(categories_router)
router.include_router(inventory_router)
router.include_router(public_router)
router.include_router(landing_router)
router.include_router(bulk_import_router)
router.include_router(private_catalog_router)
router.include_router(textbook_access_router)
router.include_router(form_config_router)
router.include_router(textbook_orders_router)
router.include_router(school_year_router)
router.include_router(order_form_config_router)
router.include_router(inventory_import_router)
router.include_router(analytics_router)
router.include_router(store_config_router)
router.include_router(monday_sync_router)

# Re-export for compatibility
store_refactored_router = router
