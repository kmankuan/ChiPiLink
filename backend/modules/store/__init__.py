"""
Store Module - Products, orders, inventory, categories, students

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/store/
├── models/           # Schemas Pydantic (contratos de datos)
├── repositories/     # Capa de acceso a datos (solo aquí se toca DB)
├── services/         # Lógica de negocio
├── events/           # Event handlers y tipos de eventos
├── routes/           # API endpoints (FastAPI routers) - REFACTORIZADO
└── __init__.py       # Inicialización del módulo

Beneficios de esta arquitectura:
1. Separación clara de responsabilidades
2. Fácil de testear (cada capa se puede mockear)
3. Preparado para extraer como microservicio
4. Comunicación via Event Bus (no dependencias directas)
─────────────────────────────────────────────────────────
"""

# Legacy router (compatibilidad con frontend actual)
from .legacy_routes import router as legacy_router

# New refactored router
from .routes import router as store_refactored_router

# Modelos
from .models import (
    OrderStatus, PaymentStatus, PaymentMethod,
    ProductBase, ProductCreate, ProductUpdate, Product,
    OrderItem, OrderBase, OrderCreate, OrderPublicCreate, Order,
    StudentBase, StudentCreate, Student,
    CategoryBase, CategoryCreate, Category,
    BannerBase, BannerCreate, Banner,
    InventoryUpdate, InventoryAlert
)

# Servicios
from .services import (
    ProductService, product_service,
    OrderService, order_service,
    CategoryService, category_service
)

# Repositorios
from .repositories import (
    ProductRepository,
    OrderRepository,
    CategoryRepository
)

# Eventos
from .events import setup_event_handlers, StoreEvents


def init_module():
    """
    Inicializar el módulo Store.
    Llamar esta función al iniciar la aplicación.
    """
    # Configurar event handlers
    setup_event_handlers()
    
    print("🛒 Store module initialized")


# Alias para compatibilidad
router = legacy_router

__all__ = [
    # Routers
    'router', 'legacy_router', 'store_refactored_router',
    # Enums
    'OrderStatus', 'PaymentStatus', 'PaymentMethod',
    # Product Models
    'ProductBase', 'ProductCreate', 'ProductUpdate', 'Product',
    # Order Models
    'OrderItem', 'OrderBase', 'OrderCreate', 'OrderPublicCreate', 'Order',
    # Student Models
    'StudentBase', 'StudentCreate', 'Student',
    # Category Models
    'CategoryBase', 'CategoryCreate', 'Category',
    # Banner Models
    'BannerBase', 'BannerCreate', 'Banner',
    # Inventory Models
    'InventoryUpdate', 'InventoryAlert',
    # Services
    'ProductService', 'product_service',
    'OrderService', 'order_service',
    'CategoryService', 'category_service',
    # Repositories
    'ProductRepository', 'OrderRepository', 'CategoryRepository',
    # Events
    'setup_event_handlers', 'StoreEvents',
    # Init
    'init_module'
]
