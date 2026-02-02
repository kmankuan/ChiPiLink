"""
Store Module - Products, orders, inventory, categories, students

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/store/
├── models/           # Pydantic schemas (data contracts)
├── repositories/     # Data access layer (only touch DB here)
├── services/         # Business logic
├── events/           # Event handlers and event types
├── routes/           # API endpoints (FastAPI routers)
└── __init__.py       # Module initialization

Beneficios de esta arquitectura:
1. Separación clara de responsabilidades
2. Fácil de testear (cada capa se puede mockear)
3. Preparado para extraer como microservicio
4. Comunicación via Event Bus (no dependencias directas)
─────────────────────────────────────────────────────────
"""

# Refactored router (microservices-ready)
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
router = store_refactored_router

__all__ = [
    # Routers
    'router', 'store_refactored_router',
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
