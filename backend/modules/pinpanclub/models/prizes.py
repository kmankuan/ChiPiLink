"""
Advanced Prize System - Models
Configurable prizes beyond badges: physical, discounts, privileges
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class PrizeType(str, Enum):
    """Prize types"""
    BADGE = "badge"              # Digital badge
    PHYSICAL = "physical"        # Physical prize (trophy, medal, etc.)
    DISCOUNT = "discount"        # Store/service discount
    PRIVILEGE = "privilege"      # Special privilege (VIP access, etc.)
    POINTS = "points"            # Redeemable points
    CUSTOM = "custom"            # Custom prize


class PrizeStatus(str, Enum):
    """Prize status"""
    AVAILABLE = "available"      # Available to win
    CLAIMED = "claimed"          # Claimed by player
    DELIVERED = "delivered"      # Delivered
    EXPIRED = "expired"          # Expired


class PrizeConditionType(str, Enum):
    """Prize winning condition types"""
    POSITION = "position"        # By ranking position (1st, 2nd, 3rd...)
    PARTICIPATION = "participation"  # By participating
    MATCHES_PLAYED = "matches_played"  # By number of matches played
    MATCHES_WON = "matches_won"  # By number of wins
    MATCHES_REFEREED = "matches_refereed"  # By refereeing
    STREAK = "streak"            # By win streak
    CHALLENGE = "challenge"      # By completing a challenge


# ============== PRIZE DEFINITION ==============

class PrizeCondition(BaseModel):
    """Condition to win a prize"""
    type: PrizeConditionType
    value: int  # E.g.: position=1, matches_played=10
    comparison: str = "eq"  # eq, gte, lte


class PrizeDefinition(BaseModel):
    """Configurable prize definition"""
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:8]}")
    name: str
    description: Optional[str] = None
    type: PrizeType = PrizeType.BADGE
    icon: str = "🏆"

    # Prize value
    value: Optional[str] = None  # Value description (e.g. "20% discount")
    points_value: int = 0        # Points value if applicable

    # Conditions to win
    conditions: List[PrizeCondition] = []

    # Applicable to
    for_players: bool = True
    for_referees: bool = False

    # Limits
    max_winners: Optional[int] = None  # None = no limit
    quantity_available: Optional[int] = None  # For physical prizes

    # Validity
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None

    # Metadata
    image_url: Optional[str] = None
    redemption_instructions: Optional[str] = None

    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class PrizeDefinitionCreate(BaseModel):
    """Create prize definition"""
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
    """Prize awarded to a player"""
    award_id: str = Field(default_factory=lambda: f"award_{uuid.uuid4().hex[:8]}")
    prize_id: str
    player_id: str
    season_id: Optional[str] = None
    challenge_id: Optional[str] = None

    # Prize info (cached)
    prize_info: Optional[Dict] = None
    player_info: Optional[Dict] = None

    # Status
    status: PrizeStatus = PrizeStatus.CLAIMED

    # Award details
    awarded_for: str  # Description of why it was granted
    position: Optional[int] = None  # If by position

    # Timestamps
    awarded_at: Optional[Any] = None
    claimed_at: Optional[Any] = None
    delivered_at: Optional[Any] = None
    expires_at: Optional[Any] = None


# ============== PRIZE CATALOG ==============

class PrizeCatalog(BaseModel):
    """Available prize catalog"""
    catalog_id: str
    name: str
    description: Optional[str] = None
    season_id: Optional[str] = None  # If specific to season
    prizes: List[PrizeDefinition] = []
    is_active: bool = True
    created_at: Optional[Any] = None


# ============== DEFAULT PRIZES ==============

def get_default_prize_catalog() -> List[Dict]:
    """Default prize catalog"""
    return [
        {
            "name": "Season Champion",
            "description": "First place in ranking",
            "type": "physical",
            "icon": "🥇",
            "value": "Golden trophy + Custom t-shirt",
            "conditions": [{"type": "position", "value": 1, "comparison": "eq"}],
            "for_players": True,
            "for_referees": False,
            "max_winners": 1
        },
        {
            "name": "Runner-up",
            "description": "Second place",
            "type": "physical",
            "icon": "🥈",
            "value": "Silver medal",
            "conditions": [{"type": "position", "value": 2, "comparison": "eq"}],
            "for_players": True,
            "max_winners": 1
        },
        {
            "name": "Third Place",
            "description": "Third place",
            "type": "physical",
            "icon": "🥉",
            "value": "Bronze medal",
            "conditions": [{"type": "position", "value": 3, "comparison": "eq"}],
            "for_players": True,
            "max_winners": 1
        },
        {
            "name": "Active Player",
            "description": "Played 10+ matches in the season",
            "type": "badge",
            "icon": "🏓",
            "conditions": [{"type": "matches_played", "value": 10, "comparison": "gte"}],
            "for_players": True
        },
        {
            "name": "Best Referee",
            "description": "Referee with most matches officiated",
            "type": "privilege",
            "icon": "⚖️",
            "value": "VIP tournament access",
            "conditions": [{"type": "position", "value": 1, "comparison": "eq"}],
            "for_players": False,
            "for_referees": True,
            "max_winners": 1
        },
        {
            "name": "Collaborator",
            "description": "Refereed 5+ matches",
            "type": "discount",
            "icon": "👨‍⚖️",
            "value": "10% registration discount",
            "conditions": [{"type": "matches_refereed", "value": 5, "comparison": "gte"}],
            "for_referees": True
        },
        {
            "name": "Unstoppable Streak",
            "description": "Won 5 matches in a row",
            "type": "badge",
            "icon": "🔥",
            "conditions": [{"type": "streak", "value": 5, "comparison": "gte"}],
            "for_players": True
        }
    ]
