"""
PinpanClub Module
Módulo de Club de Tenis de Mesa preparado para microservicios

─────────────────────────────────────────────────────────
Arquitectura Microservices-Ready:

/modules/pinpanclub/
├── models/           # Schemas Pydantic (contratos de datos)
├── repositories/     # Capa de acceso a datos (solo aquí se toca DB)
├── services/         # Lógica de negocio
├── events/           # Event handlers y tipos de eventos
├── routes/           # API endpoints (FastAPI routers)
└── __init__.py       # Initialization del módulo

Beneficios de esta arquitectura:
1. Separación clara de responsabilidades
2. Fácil de testear (cada capa se puede mockear)
3. Preparado para extraer como microservicio
4. Comunicación via Event Bus (no dependencias directas)
─────────────────────────────────────────────────────────
"""

# Modelos
from .models import (
    Player, PlayerCreate, PlayerUpdate, PlayerLevel,
    Match, MatchCreate, MatchScoreUpdate, MatchState,
    Tournament, TournamentCreate, TournamentFormat,
    Sponsor, SponsorCreate,
    MondayConfig, CanvasLayout
)

# Servicios
from .services import (
    player_service,
    match_service,
    monday_service
)

# Repositorios (para uso avanzado)
from .repositories import (
    PlayerRepository,
    MatchRepository,
    SponsorRepository,
    ConfigRepository,
    LayoutRepository
)

# Eventos
from .events import setup_event_handlers, PinpanClubEvents


def init_module():
    """
    Inicializar el módulo PinpanClub.
    Llamar esta función al iniciar la aplicación.
    """
    # Configurar event handlers
    setup_event_handlers()
    
    print("🏓 PinpanClub module initialized")


__all__ = [
    # Models
    'Player', 'PlayerCreate', 'PlayerUpdate', 'PlayerLevel',
    'Match', 'MatchCreate', 'MatchScoreUpdate', 'MatchState',
    'Tournament', 'TournamentCreate', 'TournamentFormat',
    'Sponsor', 'SponsorCreate',
    'MondayConfig', 'CanvasLayout',
    # Services
    'player_service', 'match_service', 'monday_service',
    # Repositories
    'PlayerRepository', 'MatchRepository', 'SponsorRepository',
    'ConfigRepository', 'LayoutRepository',
    # Events
    'setup_event_handlers', 'PinpanClubEvents',
    # Init
    'init_module'
]
