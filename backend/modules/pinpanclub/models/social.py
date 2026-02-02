"""
Social Features - Modelos
Seguir jugadores, comentarios, reacciones
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ReactionType(str, Enum):
    """Tipos de reacción"""
    CLAP = "clap"           # 👏
    FIRE = "fire"           # 🔥
    TROPHY = "trophy"       # 🏆
    HEART = "heart"         # ❤️
    WOW = "wow"             # 😮


class ActivityType(str, Enum):
    """Tipos de actividad en el feed"""
    MATCH_WON = "match_won"
    MATCH_PLAYED = "match_played"
    BADGE_EARNED = "badge_earned"
    PRIZE_WON = "prize_won"
    CHALLENGE_COMPLETED = "challenge_completed"
    STREAK_ACHIEVED = "streak_achieved"
    RANKING_UP = "ranking_up"
    NEW_FOLLOWER = "new_follower"


# ============== FOLLOW ==============

class Follow(BaseModel):
    """Relación de seguimiento entre jugadores"""
    follow_id: str = Field(default_factory=lambda: f"follow_{uuid.uuid4().hex[:8]}")
    follower_id: str      # Quien sigue
    following_id: str     # A quien sigue
    
    # Info (cached)
    follower_info: Optional[Dict] = None
    following_info: Optional[Dict] = None
    
    created_at: Optional[Any] = None


class FollowCreate(BaseModel):
    """Create seguimiento"""
    follower_id: str
    following_id: str


class FollowStats(BaseModel):
    """Estadísticas de seguidores"""
    jugador_id: str
    followers_count: int = 0
    following_count: int = 0


# ============== COMMENT ==============

class Comment(BaseModel):
    """Comentario en perfil de jugador"""
    comment_id: str = Field(default_factory=lambda: f"comment_{uuid.uuid4().hex[:8]}")
    author_id: str
    target_id: str        # Player o partido
    target_type: str      # "player" o "match"
    content: str
    
    # Info ofl autor (cached)
    author_info: Optional[Dict] = None
    
    # Reacciones al comentario
    reactions: Dict[str, int] = {}  # {"clap": 5, "fire": 2}
    
    # Estado
    is_edited: bool = False
    is_deleted: bool = False
    
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class CommentCreate(BaseModel):
    """Create comentario"""
    author_id: str
    target_id: str
    target_type: str = "player"
    content: str


class CommentUpdate(BaseModel):
    """Update comentario"""
    content: str


# ============== REACTION ==============

class Reaction(BaseModel):
    """Reacción a un partido o comentario"""
    reaction_id: str = Field(default_factory=lambda: f"reaction_{uuid.uuid4().hex[:8]}")
    user_id: str
    target_id: str        # Match o Comment ID
    target_type: str      # "match" o "comment"
    reaction_type: ReactionType
    
    created_at: Optional[Any] = None


class ReactionCreate(BaseModel):
    """Create reacción"""
    user_id: str
    target_id: str
    target_type: str
    reaction_type: ReactionType


class ReactionSummary(BaseModel):
    """Resumen de reacciones"""
    target_id: str
    total: int = 0
    by_type: Dict[str, int] = {}  # {"clap": 10, "fire": 5}
    user_reacted: Optional[str] = None  # Type of reacción del current user


# ============== ACTIVITY FEED ==============

class ActivityFeedItem(BaseModel):
    """Item del feed de actividad"""
    activity_id: str = Field(default_factory=lambda: f"activity_{uuid.uuid4().hex[:8]}")
    jugador_id: str
    activity_type: ActivityType
    
    # Info of the player
    jugador_info: Optional[Dict] = None
    
    # Data específicos de la actividad
    data: Dict = {}  # Ej: {"match_id": "...", "opponent": "...", "score": "11-5"}
    
    # Descripción generada
    description: str = ""
    
    # Reacciones
    reactions: Dict[str, int] = {}
    
    created_at: Optional[Any] = None


class ActivityFeedCreate(BaseModel):
    """Create actividad en feed"""
    jugador_id: str
    activity_type: ActivityType
    data: Dict = {}
    description: str = ""


# ============== NOTIFICATION ==============

class NotificationType(str, Enum):
    """Tipos de notificación"""
    MATCH_PENDING = "match_pending"
    MATCH_CONFIRMED = "match_confirmed"
    NEW_FOLLOWER = "new_follower"
    NEW_COMMENT = "new_comment"
    NEW_REACTION = "new_reaction"
    BADGE_EARNED = "badge_earned"
    PRIZE_WON = "prize_won"
    CHALLENGE_AVAILABLE = "challenge_available"
    CHALLENGE_COMPLETED = "challenge_completed"
    SEASON_ENDING = "season_ending"
    SEASON_CLOSED = "season_closed"


class Notification(BaseModel):
    """Notificación para usuario"""
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:8]}")
    user_id: str
    type: NotificationType
    title: str
    message: str
    
    # Data adicionales
    data: Dict = {}  # Ej: {"match_id": "...", "from_user": "..."}
    
    # Estado
    is_read: bool = False
    is_pushed: bool = False  # Si ya se envió por WebSocket
    
    # Navegación
    action_url: Optional[str] = None
    
    created_at: Optional[Any] = None
    read_at: Optional[Any] = None


class NotificationCreate(BaseModel):
    """Create notificación"""
    user_id: str
    type: NotificationType
    title: str
    message: str
    data: Dict = {}
    action_url: Optional[str] = None
