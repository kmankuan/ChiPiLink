"""
Community Module - Posts, events, gallery management

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/community/
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
from .routes import router as community_refactored_router

# Modelos nuevos
from .models import (
    PostType, EventStatus, EventType,
    PostBase, PostCreate, PostUpdate, Post,
    CommentBase, CommentCreate, Comment,
    EventBase, EventCreate, EventUpdate, Event,
    AlbumBase, AlbumCreate, AlbumUpdate, Album
)

# Servicios
from .services import (
    PostService, post_service,
    EventService, event_service,
    AlbumService, album_service
)

# Repositorios
from .repositories import (
    PostRepository,
    EventRepository,
    AlbumRepository,
    CommentRepository
)

# Eventos
from .events import setup_event_handlers, CommunityEvents


def init_module():
    """
    Inicializar el module Community.
    Llamar esta function al iniciar la application.
    """
    # Configurar event handlers
    setup_event_handlers()
    
    print("🏘️ Community module initialized")


# Alias for compatibility
router = community_refactored_router

__all__ = [
    # Routers
    'router', 'community_refactored_router',
    # Enums
    'PostType', 'EventStatus', 'EventType',
    # Post Models
    'PostBase', 'PostCreate', 'PostUpdate', 'Post',
    # Comment Models
    'CommentBase', 'CommentCreate', 'Comment',
    # Event Models
    'EventBase', 'EventCreate', 'EventUpdate', 'Event',
    # Album Models
    'AlbumBase', 'AlbumCreate', 'AlbumUpdate', 'Album',
    # Services
    'PostService', 'post_service',
    'EventService', 'event_service',
    'AlbumService', 'album_service',
    # Repositories
    'PostRepository', 'EventRepository', 'AlbumRepository', 'CommentRepository',
    # Events
    'setup_event_handlers', 'CommunityEvents',
    # Init
    'init_module'
]
