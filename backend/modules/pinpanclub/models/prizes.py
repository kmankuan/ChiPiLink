"""
System for Premios Avanzado - Modelos
Premios configurables más allá de badges: físicos, descuentos, privilegios
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class PrizeType(str, Enum):
    """Tipos de premio"""
    BADGE = "badge"              # Badge digital
    PHYSICAL = "physical"        # Prize físico (trofeo, medalla, etc.)
    DISCOUNT = "discount"        # Store/service discount
    PRIVILEGE = "privilege"      # Privilegio especial (acceso VIP, etc.)
    POINTS = "points"            # Points canjeables
    CUSTOM = "custom"            # Prize personalizado


class PrizeStatus(str, Enum):
    """Estado dthe prize"""
    AVAILABLE = "available"      # Available to win
    CLAIMED = "claimed"          # Reclamado by player
    DELIVERED = "delivered"      # Entregado
    EXPIRED = "expired"          # Expirado


class PrizeConditionType(str, Enum):
    """Tipos de condición to win premio"""
    POSITION = "position"        # By ranking position (1°, 2°, 3°...)
    PARTICIPATION = "participation"  # By participar
    MATCHES_PLAYED = "matches_played"  # By number of matches played
    MATCHES_WON = "matches_won"  # By number of wins
    MATCHES_REFEREED = "matches_refereed"  # By arbitrajes
    STREAK = "streak"            # By win streak
    CHALLENGE = "challenge"      # By completar un reto


# ============== PRIZE DEFINITION ==============

class PrizeCondition(BaseModel):
    """Condición to win un premio"""
    type: PrizeConditionType
    value: int  # Ej: position=1, matches_played=10
    comparison: str = "eq"  # eq, gte, lte


class PrizeDefinition(BaseModel):
    """Definición de un premio configurable"""
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:8]}")
    name: str
    description: Optional[str] = None
    type: PrizeType = PrizeType.BADGE
    icon: str = "🏆"
    
    # Value dthe prize
    value: Optional[str] = None  # Description ofl valor (ej: "20% descuento")
    points_value: int = 0        # Points value if applicable
    
    # Conditions to win
    conditions: List[PrizeCondition] = []
    
    # Aplicable a
    for_players: bool = True
    for_referees: bool = False
    
    # Límites
    max_winners: Optional[int] = None  # None = sin límite
    quantity_available: Optional[int] = None  # For premios físicos
    
    # Vigencia
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    
    # Metadata
    image_url: Optional[str] = None
    redemption_instructions: Optional[str] = None
    
    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class PrizeDefinitionCreate(BaseModel):
    """Create definición de premio"""
    name: str
    description: Optional[str] = None
    type: PrizeType = PrizeType.BADGE
    icon: str = "🏆"
    value: Optional[str] = None
    points_value: int = 0
    conditions: List[Dict] = []
    for_players: bool = True
    for_referees: bool = False
    max_winners: Optional[int] = None
    quantity_available: Optional[int] = None
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    image_url: Optional[str] = None
    redemption_instructions: Optional[str] = None


# ============== AWARDED PRIZE ==============

class AwardedPrize(BaseModel):
    """Premio otorgado a un jugador"""
    award_id: str = Field(default_factory=lambda: f"award_{uuid.uuid4().hex[:8]}")
    prize_id: str
    jugador_id: str
    season_id: Optional[str] = None
    challenge_id: Optional[str] = None
    
    # Info ofl premio (cached)
    prize_info: Optional[Dict] = None
    jugador_info: Optional[Dict] = None
    
    # Estado
    status: PrizeStatus = PrizeStatus.CLAIMED
    
    # Award details
    awarded_for: str  # Description of por qué se otorgó
    position: Optional[int] = None  # Si fue por posición
    
    # Timestamps
    awarded_at: Optional[Any] = None
    claimed_at: Optional[Any] = None
    delivered_at: Optional[Any] = None
    expires_at: Optional[Any] = None


# ============== PRIZE CATALOG ==============

class PrizeCatalog(BaseModel):
    """Catálogo de premios disponibles"""
    catalog_id: str
    name: str
    description: Optional[str] = None
    season_id: Optional[str] = None  # If specific to season
    prizes: List[PrizeDefinition] = []
    is_active: bool = True
    created_at: Optional[Any] = None


# ============== DEFAULT PRIZES ==============

def get_default_prize_catalog() -> List[Dict]:
    """Catálogo de premios por defecto"""
    return [
        {
            "name": "Campeón de Temporada",
            "description": "Premio al primer lugar from ranking",
            "type": "physical",
            "icon": "🥇",
            "value": "Trofeo dorado + Camiseta personalizada",
            "conditions": [{"type": "position", "value": 1, "comparison": "eq"}],
            "for_players": True,
            "for_referees": False,
            "max_winners": 1
        },
        {
            "name": "Subcampeón",
            "description": "Premio al segundo lugar",
            "type": "physical",
            "icon": "🥈",
            "value": "Medalla de plata",
            "conditions": [{"type": "position", "value": 2, "comparison": "eq"}],
            "for_players": True,
            "max_winners": 1
        },
        {
            "name": "Tercer Lugar",
            "description": "Premio al tercer lugar",
            "type": "physical",
            "icon": "🥉",
            "value": "Medalla de bronce",
            "conditions": [{"type": "position", "value": 3, "comparison": "eq"}],
            "for_players": True,
            "max_winners": 1
        },
        {
            "name": "Jugador Activo",
            "description": "Por jugar 10+ partidos en the season",
            "type": "badge",
            "icon": "🏓",
            "conditions": [{"type": "matches_played", "value": 10, "comparison": "gte"}],
            "for_players": True
        },
        {
            "name": "Mejor Árbitro",
            "description": "Árbitro con más partidos dirigidos",
            "type": "privilege",
            "icon": "⚖️",
            "value": "Acceso VIP a torneos",
            "conditions": [{"type": "position", "value": 1, "comparison": "eq"}],
            "for_players": False,
            "for_referees": True,
            "max_winners": 1
        },
        {
            "name": "Colaborador",
            "description": "Por arbitrar 5+ partidos",
            "type": "discount",
            "icon": "👨‍⚖️",
            "value": "10% descuento en inscripciones",
            "conditions": [{"type": "matches_refereed", "value": 5, "comparison": "gte"}],
            "for_referees": True
        },
        {
            "name": "Racha Imparable",
            "description": "Por ganar 5 partidos seguidos",
            "type": "badge",
            "icon": "🔥",
            "conditions": [{"type": "streak", "value": 5, "comparison": "gte"}],
            "for_players": True
        }
    ]
