"""
Rapid Pin - Models
System for spontaneous matches without organization
2 players + 1 referee = Valid match
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class RapidPinMatchStatus(str, Enum):
    """Rapid Pin match status"""
    PENDING = "pending"          # Registered, waiting for confirmation
    VALIDATED = "validated"      # Confirmed by another person
    DISPUTED = "disputed"        # In dispute
    CANCELLED = "cancelled"      # Cancelled


class RapidPinSeasonStatus(str, Enum):
    """Season status"""
    ACTIVE = "active"            # Active season
    CLOSED = "closed"            # Closed season (fixed ranking)
    ARCHIVED = "archived"        # Archived


class RapidPinRole(str, Enum):
    """Role in a Rapid Pin match"""
    PLAYER = "player"            # Player
    REFEREE = "referee"          # Referee


class RapidPinQueueStatus(str, Enum):
    """Match queue status"""
    CHALLENGE_PENDING = "challenge_pending"  # Challenge sent, waiting for acceptance
    DATE_NEGOTIATION = "date_negotiation"    # Negotiating match date
    QUEUED = "queued"                        # Challenge queued (no agreed date)
    WAITING_REFEREE = "waiting"              # Date agreed, waiting for referee
    ASSIGNED = "assigned"                    # Referee assigned, match in progress
    COMPLETED = "completed"                  # Match completed
    CANCELLED = "cancelled"                  # Cancelled
    DECLINED = "declined"                    # Challenge declined


class DateProposalStatus(str, Enum):
    """Date proposal status"""
    PENDING = "pending"      # Waiting for response
    ACCEPTED = "accepted"    # Accepted
    COUNTERED = "countered"  # Counter-proposal sent


# ============== SCORING CONSTANTS ==============

RAPID_PIN_SCORING = {
    "victory": 3,    # Points for victory
    "defeat": 1,     # Points for defeat
    "referee": 2     # Points for refereeing
}


# ============== PRIZE CONFIGURATION ==============

class RapidPinPrize(BaseModel):
    """Configurable prize for Rapid Pin"""
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:8]}")
    position: Optional[int] = None  # 1, 2, 3... or None for special prizes
    role: str = "player"            # "player" or "referee"
    name: str
    description: Optional[str] = None
    icon: str = "🏆"
    special_type: Optional[str] = None  # "participation", "most_refereed", etc.


# ============== SEASON MODEL ==============

class RapidPinSeasonCreate(BaseModel):
    """Create Rapid Pin season"""
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: str  # ISO format
    fecha_fin: str     # ISO format - deadline to close ranking
    
    # Configurable prizes
    player_prizes: Optional[List[RapidPinPrize]] = None
    referee_prizes: Optional[List[RapidPinPrize]] = None


class RapidPinSeasonUpdate(BaseModel):
    """Update season"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_fin: Optional[str] = None
    estado: Optional[RapidPinSeasonStatus] = None
    player_prizes: Optional[List[RapidPinPrize]] = None
    referee_prizes: Optional[List[RapidPinPrize]] = None


class RapidPinSeason(BaseModel):
    """Complete Rapid Pin season"""
    model_config = ConfigDict(from_attributes=True)
    
    season_id: str
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: str
    fecha_fin: str
    estado: RapidPinSeasonStatus = RapidPinSeasonStatus.ACTIVE
    
    # Prizes
    player_prizes: List[RapidPinPrize] = []
    referee_prizes: List[RapidPinPrize] = []
    
    # Statistics
    total_matches: int = 0
    total_players: int = 0
    total_referees: int = 0
    
    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    closed_at: Optional[Any] = None


# ============== MATCH MODEL ==============

class RapidPinMatchCreate(BaseModel):
    """Register Rapid Pin match"""
    season_id: str
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: str
    
    # Result
    ganador_id: str  # Winner ID (jugador_a or jugador_b)
    score_ganador: int = 11  # Winner's score
    score_perdedor: int = 0  # Loser's score
    
    # Who registers the match
    registrado_por_id: str  # One of the 3 participants
    
    # Optional notes
    notas: Optional[str] = None


class RapidPinMatch(BaseModel):
    """Complete Rapid Pin match"""
    model_config = ConfigDict(from_attributes=True)
    
    match_id: str
    season_id: str
    
    # Participants
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: str
    
    # Participant info (cached)
    jugador_a_info: Optional[Dict] = None
    jugador_b_info: Optional[Dict] = None
    arbitro_info: Optional[Dict] = None
    
    # Result
    ganador_id: str
    perdedor_id: str
    score_ganador: int
    score_perdedor: int
    
    # Validation status
    estado: RapidPinMatchStatus = RapidPinMatchStatus.PENDING
    registrado_por_id: str
    confirmado_por_id: Optional[str] = None  # Second person who confirms
    
    # Points awarded (only when validated)
    puntos_ganador: int = 0
    puntos_perdedor: int = 0
    puntos_arbitro: int = 0
    
    # Notes
    notas: Optional[str] = None
    
    # Timestamps
    fecha_partido: Optional[Any] = None
    fecha_confirmacion: Optional[Any] = None
    created_at: Optional[Any] = None


# ============== RANKING MODEL ==============

class RapidPinRankingEntry(BaseModel):
    """Rapid Pin ranking entry"""
    model_config = ConfigDict(from_attributes=True)
    
    ranking_id: str
    season_id: str
    jugador_id: str
    
    # Position
    posicion: int = 0
    
    # Total points (victories + defeats + refereeing)
    puntos_totales: int = 0
    
    # Statistics as player
    partidos_jugados: int = 0
    partidos_ganados: int = 0
    partidos_perdidos: int = 0
    puntos_como_jugador: int = 0  # Only victories + defeats
    
    # Statistics as referee
    partidos_arbitrados: int = 0
    puntos_como_arbitro: int = 0
    
    # Player info
    jugador_info: Optional[Dict] = None
    
    # Timestamps
    last_activity: Optional[Any] = None
    updated_at: Optional[Any] = None


class RapidPinRankingTable(BaseModel):
    """Complete ranking table"""
    season_id: str
    season_nombre: str
    estado: RapidPinSeasonStatus
    fecha_fin: str
    total_participantes: int
    total_partidos: int
    entries: List[RapidPinRankingEntry]
    last_updated: Optional[Any] = None


# ============== SEASON RESULTS ==============

class RapidPinSeasonResult(BaseModel):
    """Final season result"""
    jugador_id: str
    jugador_info: Optional[Dict] = None
    posicion_final: int
    puntos_finales: int
    role: str  # "player" or "referee"
    prize: Optional[RapidPinPrize] = None


class RapidPinSeasonFinalResults(BaseModel):
    """Final results of a closed season"""
    season_id: str
    season_nombre: str
    fecha_cierre: str
    player_results: List[RapidPinSeasonResult] = []
    referee_results: List[RapidPinSeasonResult] = []
    total_matches: int = 0


# ============== DEFAULT PRIZES ==============

def get_default_player_prizes() -> List[RapidPinPrize]:
    """Default prizes for players"""
    return [
        RapidPinPrize(
            position=1,
            role="player",
            name="Rapid Pin Champion",
            description="First place in player ranking",
            icon="🥇"
        ),
        RapidPinPrize(
            position=2,
            role="player",
            name="Rapid Pin Runner-up",
            description="Second place in player ranking",
            icon="🥈"
        ),
        RapidPinPrize(
            position=3,
            role="player",
            name="Third Place",
            description="Third place in player ranking",
            icon="🥉"
        ),
        RapidPinPrize(
            position=None,
            role="player",
            name="Rapid Pin Participant",
            description="Participation award",
            icon="🏓",
            special_type="participation"
        )
    ]


def get_default_referee_prizes() -> List[RapidPinPrize]:
    """Default prizes for referees"""
    return [
        RapidPinPrize(
            position=1,
            role="referee",
            name="Best Referee",
            description="Most matches refereed in the season",
            icon="⚖️"
        ),
        RapidPinPrize(
            position=None,
            role="referee",
            name="Participating Referee",
            description="Award for collaborating as referee",
            icon="👨‍⚖️",
            special_type="participation"
        )
    ]


# ============== MATCH QUEUE (Challenge & Referee System) ==============

class RapidPinChallengeCreate(BaseModel):
    """Create challenge to another player"""
    season_id: str
    challenger_id: str      # Who challenges
    opponent_id: str        # Who is challenged
    notes: Optional[str] = None


class RapidPinMatchQueueCreate(BaseModel):
    """Create match in queue (admin/mod) - Skips challenge phase"""
    season_id: str
    player1_id: str
    player2_id: str
    created_by_id: str
    notes: Optional[str] = None


class RapidPinMatchQueue(BaseModel):
    """Match in queue / Challenge"""
    model_config = ConfigDict(from_attributes=True)
    
    queue_id: str = Field(default_factory=lambda: f"queue_{uuid.uuid4().hex[:12]}")
    season_id: str
    
    # Players
    player1_id: str  # Challenger / Player 1
    player2_id: str  # Opponent / Player 2
    player1_info: Optional[Dict] = None
    player2_info: Optional[Dict] = None
    
    # Referee (when assigned)
    referee_id: Optional[str] = None
    referee_info: Optional[Dict] = None
    
    # Status
    status: RapidPinQueueStatus = RapidPinQueueStatus.CHALLENGE_PENDING
    
    # Timestamps
    created_at: Optional[Any] = None
    created_by_id: str = ""
    created_by_role: str = "player"  # player, moderator, admin
    
    # Acceptance
    accepted_at: Optional[Any] = None
    accepted_by_id: Optional[str] = None  # Who accepted (player 2 or admin/mod)
    
    # Referee
    assigned_at: Optional[Any] = None
    assigned_by_id: Optional[str] = None  # Who assigned (referee themselves or admin/mod)
    
    # Completed
    completed_at: Optional[Any] = None
    
    # Cancelled/Declined
    cancelled_at: Optional[Any] = None
    cancelled_by_id: Optional[str] = None
    decline_reason: Optional[str] = None
    
    # Notes
    notes: Optional[str] = None
    
    # Match ID when completed
    match_id: Optional[str] = None
    
    # === Date negotiation ===
    proposed_date: Optional[str] = None           # Proposed date (ISO format)
    proposed_by_id: Optional[str] = None          # Who proposed the current date
    date_history: List[Dict] = []                 # History of date proposals
    agreed_date: Optional[str] = None             # Final agreed date
    
    # === Public interactions ===
    likes_count: int = 0
    comments_count: int = 0


class RapidPinAcceptChallenge(BaseModel):
    """Accept or decline challenge"""
    accepted: bool = True
    decline_reason: Optional[str] = None


class RapidPinQueueAssign(BaseModel):
    """Assign referee to queued match"""
    referee_id: str


class RapidPinQueueComplete(BaseModel):
    """Completar partido from queue con resultado"""
    ganador_id: str
    score_ganador: int = 11
    score_perdedor: int = 0


# ============== DATE NEGOTIATION MODELS ==============

class DateProposal(BaseModel):
    """Propuesta de fecha"""
    proposal_id: str = Field(default_factory=lambda: f"prop_{uuid.uuid4().hex[:8]}")
    queue_id: str
    proposed_by_id: str
    proposed_date: str          # ISO format
    message: Optional[str] = None
    status: DateProposalStatus = DateProposalStatus.PENDING
    created_at: Optional[Any] = None
    responded_at: Optional[Any] = None
    response_by_id: Optional[str] = None


class DateProposalCreate(BaseModel):
    """Create propuesta de fecha"""
    proposed_date: str  # ISO format (YYYY-MM-DDTHH:MM)
    message: Optional[str] = None


class DateProposalResponse(BaseModel):
    """Responder a propuesta de fecha"""
    action: str  # "accept", "counter", "queue" (poner in queue)
    counter_date: Optional[str] = None  # Only si action = "counter"
    message: Optional[str] = None


# ============== LIKES & COMMENTS MODELS ==============

class ChallengeReaction(BaseModel):
    """Like/reacción on a challenge"""
    reaction_id: str = Field(default_factory=lambda: f"react_{uuid.uuid4().hex[:8]}")
    queue_id: str
    user_id: str
    user_info: Optional[Dict] = None
    reaction_type: str = "like"  # Extensible a otros tipos
    created_at: Optional[Any] = None


class ChallengeComment(BaseModel):
    """Comentario en un reto"""
    comment_id: str = Field(default_factory=lambda: f"comment_{uuid.uuid4().hex[:8]}")
    queue_id: str
    user_id: str
    user_info: Optional[Dict] = None
    content: str
    is_moderated: bool = False        # If under moderation
    is_approved: bool = True          # If approved (default: True for direct publication)
    is_hidden: bool = False           # Si fue ocultado por moderador
    moderation_reason: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class ChallengeCommentCreate(BaseModel):
    """Create comentario"""
    content: str = Field(..., max_length=500)  # Will be validated with configurable limit


class ChallengeCommentModerationConfig(BaseModel):
    """Configuración de moderación de comentarios"""
    config_id: str = "rapidpin_comment_config"
    max_comment_length: int = 280
    require_approval_for_new_users: bool = False
    require_approval_for_flagged_users: bool = True
    warning_message: Dict[str, str] = {
        "es": "Recuerda mantener un ambiente respetuoso. Los comentarios inapropiados pueden resultar en sanciones.",
        "en": "Remember to keep a respectful environment. Inappropriate comments may result in sanctions.",
        "zh": "请保持尊重的环境。不当评论可能会导致处罚。"
    }

