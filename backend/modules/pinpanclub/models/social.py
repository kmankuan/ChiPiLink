"""
Social Features - Models
Follow players, comments, reactions
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ReactionType(str, Enum):
    """Reaction types"""
    CLAP = "clap"           # 👏
    FIRE = "fire"           # 🔥
    TROPHY = "trophy"       # 🏆
    HEART = "heart"         # ❤️
    WOW = "wow"             # 😮


class ActivityType(str, Enum):
    """Activity feed types"""
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
    """Follow relationship between players"""
    follow_id: str = Field(default_factory=lambda: f"follow_{uuid.uuid4().hex[:8]}")
    follower_id: str      # Who follows
    following_id: str     # Who is followed
    
    # Info (cached)
    follower_info: Optional[Dict] = None
    following_info: Optional[Dict] = None
    
    created_at: Optional[Any] = None


class FollowCreate(BaseModel):
    """Create follow"""
    follower_id: str
    following_id: str


class FollowStats(BaseModel):
    """Follower statistics"""
    player_id: str
    followers_count: int = 0
    following_count: int = 0


# ============== COMMENT ==============

class Comment(BaseModel):
    """Comment on player profile"""
    comment_id: str = Field(default_factory=lambda: f"comment_{uuid.uuid4().hex[:8]}")
    author_id: str
    target_id: str        # Player or match
    target_type: str      # "player" or "match"
    content: str

    # Author info (cached)
    author_info: Optional[Dict] = None

    # Reactions to the comment
    reactions: Dict[str, int] = {}  # {"clap": 5, "fire": 2}

    # Status
    is_edited: bool = False
    is_deleted: bool = False
    
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class CommentCreate(BaseModel):
    """Create comment"""
    author_id: str
    target_id: str
    target_type: str = "player"
    content: str


class CommentUpdate(BaseModel):
    """Update comment"""
    content: str


# ============== REACTION ==============

class Reaction(BaseModel):
    """Reaction to a match or comment"""
    reaction_id: str = Field(default_factory=lambda: f"reaction_{uuid.uuid4().hex[:8]}")
    user_id: str
    target_id: str        # Match o Comment ID
    target_type: str      # "match" o "comment"
    reaction_type: ReactionType
    
    created_at: Optional[Any] = None


class ReactionCreate(BaseModel):
    """Create reaction"""
    user_id: str
    target_id: str
    target_type: str
    reaction_type: ReactionType


class ReactionSummary(BaseModel):
    """Reactions summary"""
    target_id: str
    total: int = 0
    by_type: Dict[str, int] = {}  # {"clap": 10, "fire": 5}
    user_reacted: Optional[str] = None  # Current user reaction type


# ============== ACTIVITY FEED ==============

class ActivityFeedItem(BaseModel):
    """Activity feed item"""
    activity_id: str = Field(default_factory=lambda: f"activity_{uuid.uuid4().hex[:8]}")
    player_id: str
    activity_type: ActivityType

    # Player info
    player_info: Optional[Dict] = None

    # Activity-specific data
    data: Dict = {}  # E.g.: {"match_id": "...", "opponent": "...", "score": "11-5"}

    # Generated description
    description: str = ""
    
    # Reactions
    reactions: Dict[str, int] = {}
    
    created_at: Optional[Any] = None


class ActivityFeedCreate(BaseModel):
    """Create feed activity"""
    player_id: str
    activity_type: ActivityType
    data: Dict = {}
    description: str = ""


# ============== NOTIFICATION ==============

class NotificationType(str, Enum):
    """Notification types"""
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
    """User notification"""
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:8]}")
    user_id: str
    type: NotificationType
    title: str
    message: str

    # Additional data
    data: Dict = {}  # E.g.: {"match_id": "...", "from_user": "..."}

    # Status
    is_read: bool = False
    is_pushed: bool = False  # If already sent via WebSocket

    # Navigation
    action_url: Optional[str] = None
    
    created_at: Optional[Any] = None
    read_at: Optional[Any] = None


class NotificationCreate(BaseModel):
    """Create notification"""

    user_id: str
    type: NotificationType
    title: str
    message: str
    data: Dict = {}
    action_url: Optional[str] = None
