"""
Auth Module - User authentication and session management

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/auth/
├── models/           # Pydantic schemas (data contracts)
├── repositories/     # Data access layer (only touch DB here)
├── services/         # Business logic
├── events/           # Event handlers and event types
├── routes/           # API endpoints (FastAPI routers)
└── __init__.py       # Module initialization

Beneficios de esta arquitectura:
1. Separation clara de responsabilidades
2. Easy de testear (cada capa se puede mockear)
3. Preparado para extraer como microservicio
4. Communication via Event Bus (no dependencias directas)
─────────────────────────────────────────────────────────
"""

# Refactored router (microservices-ready)
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
    Inicializar el module Auth.
    Llamar esta function al iniciar la application.
    """
    # Configurar event handlers
    setup_event_handlers()
    
    print("🔐 Auth module initialized")


# Alias for compatibility
router = auth_refactored_router

__all__ = [
    # Routers
    'router', 'auth_refactored_router',
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
