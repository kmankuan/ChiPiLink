"""
PinPanClub Settings & Referee Configuration
Global settings for referee requirements and engagement features
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List, Any
from datetime import datetime, timezone


# ============== REFEREE SETTINGS ==============

class RefereeSettings(BaseModel):
    """Per-game-type referee configuration"""
    required: bool = True       # Is referee required for this game type?
    points_awarded: int = 2     # Points referee earns per match
    allow_self_referee: bool = False  # Can a player referee their own match?


class PinPanSettings(BaseModel):
    """Global PinPanClub settings document"""
    model_config = ConfigDict(from_attributes=True)

    settings_id: str = "pinpanclub_global"
    referee_config: Dict[str, Dict] = {
        "league": {"required": True, "points_awarded": 2, "allow_self_referee": False},
        "rapidpin": {"required": True, "points_awarded": 2, "allow_self_referee": False},
        "arena": {"required": True, "points_awarded": 3, "allow_self_referee": False},
        "casual": {"required": True, "points_awarded": 1, "allow_self_referee": False},
    }
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class RefereeSettingsUpdate(BaseModel):
    """Update referee settings for a specific game type"""
    game_type: str  # league, rapidpin, arena, casual
    required: Optional[bool] = None
    points_awarded: Optional[int] = None
    allow_self_referee: Optional[bool] = None


# ============== REFEREE PROFILE ==============

class RefereeProfile(BaseModel):
    """Referee stats and engagement data for a player"""
    model_config = ConfigDict(from_attributes=True)

    player_id: str
    total_matches_refereed: int = 0
    total_points_earned: int = 0

    # Breakdown by game type
    league_matches: int = 0
    rapidpin_matches: int = 0
    arena_matches: int = 0
    casual_matches: int = 0

    # Engagement
    current_streak: int = 0     # Consecutive days with a referee assignment
    best_streak: int = 0
    avg_rating: float = 0.0     # Average rating from players (1-5)
    total_ratings: int = 0
    last_refereed_at: Optional[str] = None

    # Badges earned
    badges: List[str] = []

    # Player info cache
    player_name: str = ""
    player_avatar: Optional[str] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RefereeRating(BaseModel):
    """A player's rating of a referee after a match"""
    match_id: str
    referee_id: str
    rated_by: str
    rating: int = 5  # 1-5
    comment: Optional[str] = None


# ============== ALL-TIME LEADERBOARD ==============

class ArenaLeaderboardEntry(BaseModel):
    """All-time Arena tournament performance"""
    model_config = ConfigDict(from_attributes=True)

    player_id: str
    player_name: str = ""
    player_avatar: Optional[str] = None

    tournaments_played: int = 0
    tournaments_won: int = 0
    runner_up: int = 0
    third_place: int = 0
    matches_played: int = 0
    matches_won: int = 0
    total_points: int = 0  # 10 for win, 6 for runner-up, 4 for 3rd, 1 per match won

    # Referee stats in Arena
    arena_matches_refereed: int = 0
    arena_referee_points: int = 0

    updated_at: Optional[str] = None
