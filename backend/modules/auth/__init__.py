"""
Auth Module - User authentication and session management

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/auth/
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
from .routes import router as auth_refactored_router

# Modelos nuevos
from .models import (
    UserBase, UserCreate, UserUpdate, User,
    LoginRequest, TokenResponse, SessionData,
    Session,
    PasswordResetRequest, PasswordResetConfirm, ChangePasswordRequest
)

# Servicios
from .services import (
    AuthService, auth_service,
    UserService, user_service
)

# Repositorios
from .repositories import (
    UserRepository,
    SessionRepository
)

# Eventos
from .events import setup_event_handlers, AuthEvents


def init_module():
    """
    Inicializar el módulo Auth.
    Llamar esta función al iniciar la aplicación.
    """
    # Configurar event handlers
    setup_event_handlers()
    
    print("🔐 Auth module initialized")


# Alias para compatibilidad
router = legacy_router

__all__ = [
    # Routers
    'router', 'legacy_router', 'auth_refactored_router',
    # User Models
    'UserBase', 'UserCreate', 'UserUpdate', 'User',
    # Auth Models
    'LoginRequest', 'TokenResponse', 'SessionData',
    # Session Models
    'Session',
    # Password Models
    'PasswordResetRequest', 'PasswordResetConfirm', 'ChangePasswordRequest',
    # Services
    'AuthService', 'auth_service',
    'UserService', 'user_service',
    # Repositories
    'UserRepository', 'SessionRepository',
    # Events
    'setup_event_handlers', 'AuthEvents',
    # Init
    'init_module'
]
