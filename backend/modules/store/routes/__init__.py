"""
Store Module - Main Router
Agrega todos los routers del módulo de tienda
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

# Router principal del módulo Store (refactorizado)
router = APIRouter(prefix="/store", tags=["Store"])

# Incluir sub-routers
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

# Re-exportar para compatibilidad
store_refactored_router = router
