"""
Ranking Seasons - Models for season system
Module: pinpanclub
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class SeasonStatus(str, Enum):
    """Season status"""
    UPCOMING = "upcoming"      # Upcoming season
    ACTIVE = "active"          # Currently active season
    CLOSING = "closing"        # In closing process
    COMPLETED = "completed"    # Completed season


class SeasonType(str, Enum):
    """Season type"""
    MONTHLY = "monthly"        # Monthly
    QUARTERLY = "quarterly"    # Quarterly
    SPECIAL = "special"        # Special event


class SeasonRewardTier(BaseModel):
    """Reward tier by position"""
    position_start: int        # Start position (e.g. 1)
    position_end: int          # End position (e.g. 3)
    bonus_points: int          # Bonus points
    badge: Optional[Dict] = None  # Special badge
    title: Optional[Dict] = None  # Special title
    perks: List[str] = []      # Additional perks
    prize_id: Optional[str] = None  # Physical prize


class RankingSeason(BaseModel):
    """Ranking season definition"""
    season_id: str = Field(default_factory=lambda: f"season_{uuid.uuid4().hex[:8]}")

    # Basic information
    name: Dict[str, str]       # Multi-language name {"es": "...", "en": "..."}
    description: Dict[str, str]  # Multi-language description
    season_type: SeasonType = SeasonType.MONTHLY
    season_number: int = 1     # Season number

    # Dates
    start_date: str            # ISO format
    end_date: str              # ISO format

    # Status
    status: SeasonStatus = SeasonStatus.UPCOMING

    # Configuration
    min_challenges_to_qualify: int = 5  # Minimum challenges to qualify
    min_points_to_qualify: int = 50     # Minimum points to qualify

    # Reward tiers by position
    reward_tiers: List[Dict] = []

    # Final statistics (filled on close)
    final_standings: Optional[List[Dict]] = None
    total_participants: int = 0
    total_challenges_completed: int = 0
    total_points_earned: int = 0

    # Metadata
    created_at: Optional[str] = None
    closed_at: Optional[str] = None
    theme: Optional[Dict] = None  # Visual theme of the season


class SeasonParticipant(BaseModel):
    """Season participant"""
    participant_id: str = Field(default_factory=lambda: f"sp_{uuid.uuid4().hex[:8]}")
    season_id: str
    player_id: str

    # Player info (cached)
    player_info: Optional[Dict] = None

    # Season points (reset each season)
    season_points: int = 0
    challenges_completed: int = 0
    current_streak: int = 0
    best_streak: int = 0

    # Current position
    current_position: Optional[int] = None

    # Final position (on season close)
    final_position: Optional[int] = None
    rewards_claimed: bool = False

    # Timestamps
    joined_at: Optional[str] = None
    last_activity: Optional[str] = None


class SeasonReward(BaseModel):
    """Reward granted at end of a season"""
    reward_id: str = Field(default_factory=lambda: f"sr_{uuid.uuid4().hex[:8]}")
    season_id: str
    player_id: str

    # Position and tier
    final_position: int
    tier_name: str  # "champion", "top3", "top10", etc.

    # Rewards granted
    bonus_points: int = 0
    badge_earned: Optional[Dict] = None
    title_earned: Optional[Dict] = None
    perks_earned: List[str] = []

    # Info
    season_info: Optional[Dict] = None
    player_info: Optional[Dict] = None

    granted_at: Optional[str] = None
    is_notified: bool = False


# ============== DEFAULT SEASON REWARDS ==============

def get_default_season_rewards() -> List[Dict]:
    """Default rewards for seasons"""
    return [
        {
            "tier_name": "champion",
            "position_start": 1,
            "position_end": 1,
            "bonus_points": 1000,
            "badge": {
                "name": {"es": "Champion de Temporada", "en": "Season Champion", "zh": "赛季冠军"},
                "icon": "🏆",
                "rarity": "legendary"
            },
            "title": {"es": "Champion", "en": "Champion", "zh": "冠军"},
            "perks": ["season_champion_frame", "exclusive_emotes", "priority_matchmaking"]
        },
        {
            "tier_name": "top3",
            "position_start": 2,
            "position_end": 3,
            "bonus_points": 500,
            "badge": {
                "name": {"es": "Podio de Temporada", "en": "Season Podium", "zh": "赛季领奖台"},
                "icon": "🥇",
                "rarity": "epic"
            },
            "title": {"es": "Elite", "en": "Elite", "zh": "精英"},
            "perks": ["season_elite_frame"]
        },
        {
            "tier_name": "top10",
            "position_start": 4,
            "position_end": 10,
            "bonus_points": 250,
            "badge": {
                "name": {"es": "Top 10 de Temporada", "en": "Season Top 10", "zh": "赛季前10"},
                "icon": "⭐",
                "rarity": "rare"
            },
            "perks": []
        },
        {
            "tier_name": "top25",
            "position_start": 11,
            "position_end": 25,
            "bonus_points": 100,
            "badge": {
                "name": {"es": "Top 25 de Temporada", "en": "Season Top 25", "zh": "赛季前25"},
                "icon": "🌟",
                "rarity": "common"
            },
            "perks": []
        },
        {
            "tier_name": "participant",
            "position_start": 26,
            "position_end": 9999,
            "bonus_points": 25,
            "badge": None,
            "perks": []
        }
    ]


def get_season_themes() -> List[Dict]:
    """Available themes for seasons"""
    return [
        {
            "id": "spring",
            "name": {"es": "Primavera", "en": "Spring", "zh": "春季"},
            "colors": {"primary": "#4ade80", "secondary": "#86efac"},
            "icon": "🌸"
        },
        {
            "id": "summer",
            "name": {"es": "Verano", "en": "Summer", "zh": "夏季"},
            "colors": {"primary": "#fbbf24", "secondary": "#fcd34d"},
            "icon": "☀️"
        },
        {
            "id": "autumn",
            "name": {"es": "Otoño", "en": "Autumn", "zh": "秋季"},
            "colors": {"primary": "#f97316", "secondary": "#fdba74"},
            "icon": "🍂"
        },
        {
            "id": "winter",
            "name": {"es": "Invierno", "en": "Winter", "zh": "冬季"},
            "colors": {"primary": "#60a5fa", "secondary": "#93c5fd"},
            "icon": "❄️"
        },
        {
            "id": "championship",
            "name": {"es": "Campeonato", "en": "Championship", "zh": "锦标赛"},
            "colors": {"primary": "#a855f7", "secondary": "#c084fc"},
            "icon": "🏆"
        }
    ]
