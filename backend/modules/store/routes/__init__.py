"""
Store Module - Main Router
Includes all store module routers
"""
from fastapi import APIRouter

from .products import router as products_router
from .orders import router as orders_router
from .categories import router as categories_router
from .inventory import router as inventory_router
from .students import router as students_router
from .public import router as public_router
from .landing import router as landing_router
from .bulk_import import router as bulk_import_router
from .vinculacion import router as vinculacion_router
from .pedidos import router as pedidos_router
from .monday import router as monday_router
from .catalogo_privado import router as catalogo_privado_router
from .textbook_access import router as textbook_access_router
from .form_config import router as form_config_router
from .textbook_orders import router as textbook_orders_router

# Main module router
router = APIRouter(prefix="/store", tags=["Store"])

# Include sub-routers
router.include_router(products_router)
router.include_router(orders_router)
router.include_router(categories_router)
router.include_router(inventory_router)
router.include_router(students_router)
router.include_router(public_router)
router.include_router(landing_router)
router.include_router(bulk_import_router)
router.include_router(vinculacion_router)
router.include_router(pedidos_router)
router.include_router(monday_router)
router.include_router(catalogo_privado_router)
router.include_router(textbook_access_router)
router.include_router(form_config_router)
router.include_router(textbook_orders_router)

# Re-export for compatibility
store_refactored_router = router
