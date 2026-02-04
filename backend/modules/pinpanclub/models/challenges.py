"""
Weekly Challenges - Models
Automatic and configurable weekly challenges
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ChallengeDifficulty(str, Enum):
    """Challenge difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"
    EXTREME = "extreme"


class ChallengeType(str, Enum):
    """Challenge types"""
    MATCHES_PLAYED = "matches_played"      # Play X matches
    MATCHES_WON = "matches_won"            # Win X matches
    MATCHES_REFEREED = "matches_refereed"  # Referee X matches
    WIN_STREAK = "win_streak"              # X win streak
    PLAY_DIFFERENT = "play_different"      # Play against X different opponents
    DAILY_PLAY = "daily_play"              # Play X different days
    COMEBACK = "comeback"                  # Win while behind on score
    PERFECT_GAME = "perfect_game"          # Win without losing points (11-0)
    SOCIAL = "social"                      # Social interactions
    CUSTOM = "custom"                      # Custom challenge


class ChallengeStatus(str, Enum):
    """Challenge status for a player"""
    AVAILABLE = "available"      # Available to start
    IN_PROGRESS = "in_progress"  # In progress
    COMPLETED = "completed"      # Completed
    FAILED = "failed"            # Not completed in time
    EXPIRED = "expired"          # Expired


# ============== CHALLENGE DEFINITION ==============

class ChallengeDefinition(BaseModel):
    """Challenge definition model"""
    challenge_id: str = Field(default_factory=lambda: f"challenge_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    type: ChallengeType
    difficulty: ChallengeDifficulty = ChallengeDifficulty.MEDIUM
    icon: str = "🎯"
    
    # Objective
    target_value: int  # E.g.: 5 matches, 3 wins
    
    # Rewards
    points_reward: int = 0
    badge_id: Optional[str] = None
    prize_id: Optional[str] = None
    
    # Configuration
    is_automatic: bool = True  # If automatically generated
    is_active: bool = True
    is_repeatable: bool = False  # If can be completed multiple times
    
    # Validity
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    duration_days: int = 7  # Default duration: 1 week
    
    # Metadata
    created_by: Optional[str] = None  # Admin who created it (if manual)
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class ChallengeDefinitionCreate(BaseModel):
    """Create challenge definition"""
    name: str
    description: str
    type: ChallengeType
    difficulty: ChallengeDifficulty = ChallengeDifficulty.MEDIUM
    icon: str = "🎯"
    target_value: int
    points_reward: int = 0
    badge_id: Optional[str] = None
    prize_id: Optional[str] = None
    is_automatic: bool = False
    is_repeatable: bool = False
    duration_days: int = 7
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None


# ============== PLAYER CHALLENGE ==============

class PlayerChallenge(BaseModel):
    """Player progress in a challenge"""
    progress_id: str = Field(default_factory=lambda: f"progress_{uuid.uuid4().hex[:8]}")
    challenge_id: str
    player_id: str
    
    # Info (cached)
    challenge_info: Optional[Dict] = None
    player_info: Optional[Dict] = None
    
    # Progress
    current_value: int = 0
    target_value: int = 0
    progress_percent: float = 0.0
    
    # Status
    status: ChallengeStatus = ChallengeStatus.IN_PROGRESS
    
    # Timestamps
    started_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    expires_at: Optional[Any] = None


class PlayerChallengeUpdate(BaseModel):
    """Update challenge progress"""
    current_value: int
    status: Optional[ChallengeStatus] = None


# ============== WEEKLY CHALLENGE SET ==============

class WeeklyChallengeSet(BaseModel):
    """Weekly challenge set"""
    week_id: str = Field(default_factory=lambda: f"week_{uuid.uuid4().hex[:8]}")
    week_number: int
    year: int
    
    # Weekly challenges
    challenges: List[str] = []  # List of challenge_ids
    
    # Statistics
    total_participants: int = 0
    total_completions: int = 0
    
    # Validity
    start_date: str
    end_date: str
    
    is_active: bool = True
    created_at: Optional[Any] = None


# ============== CHALLENGE LEADERBOARD ==============

class ChallengeLeaderboardEntry(BaseModel):
    """Challenge leaderboard entry"""
    player_id: str
    player_info: Optional[Dict] = None
    
    # Statistics
    challenges_completed: int = 0
    total_points: int = 0
    current_streak: int = 0  # Consecutive weeks completing challenges
    
    # Position
    rank: int = 0


class ChallengeLeaderboard(BaseModel):
    """Challenge leaderboard"""
    week_id: Optional[str] = None
    period: str = "weekly"  # weekly, monthly, all_time
    entries: List[ChallengeLeaderboardEntry] = []
    total_participants: int = 0


# ============== AUTO-GENERATED CHALLENGES ==============

def get_auto_challenges() -> List[Dict]:
    """Automatic challenges that can be generated"""
    return [
        {
            "name": "Active Player",
            "description": "Play 5 matches this week",
            "type": "matches_played",
            "difficulty": "easy",
            "icon": "🏓",
            "target_value": 5,
            "points_reward": 50
        },
        {
            "name": "Winning Streak",
            "description": "Win 3 consecutive matches",
            "type": "win_streak",
            "difficulty": "medium",
            "icon": "🔥",
            "target_value": 3,
            "points_reward": 100
        },
        {
            "name": "Collaborator",
            "description": "Referee 3 matches this week",
            "type": "matches_refereed",
            "difficulty": "easy",
            "icon": "⚖️",
            "target_value": 3,
            "points_reward": 75
        },
        {
            "name": "Victorious",
            "description": "Win 5 matches this week",
            "type": "matches_won",
            "difficulty": "medium",
            "icon": "🏆",
            "target_value": 5,
            "points_reward": 100
        },
        {
            "name": "Social Player",
            "description": "Play against 5 different opponents",
            "type": "play_different",
            "difficulty": "medium",
            "icon": "🤝",
            "target_value": 5,
            "points_reward": 80
        },
        {
            "name": "Consistency",
            "description": "Play at least one match on 4 different days",
            "type": "daily_play",
            "difficulty": "medium",
            "icon": "📅",
            "target_value": 4,
            "points_reward": 100
        },
        {
            "name": "Epic Comeback",
            "description": "Win a match after losing the first set",
            "type": "comeback",
            "difficulty": "hard",
            "icon": "💪",
            "target_value": 1,
            "points_reward": 150
        },
        {
            "name": "Perfect Match",
            "description": "Win a match 11-0",
            "type": "perfect_game",
            "difficulty": "extreme",
            "icon": "⭐",
            "target_value": 1,
            "points_reward": 200
        },
        {
            "name": "Marathon Runner",
            "description": "Play 10 matches this week",
            "type": "matches_played",
            "difficulty": "hard",
            "icon": "🏃",
            "target_value": 10,
            "points_reward": 150
        },
        {
            "name": "Undefeated",
            "description": "Win 5 consecutive matches",
            "type": "win_streak",
            "difficulty": "hard",
            "icon": "👑",
            "target_value": 5,
            "points_reward": 200
        }
    ]


def select_weekly_challenges(difficulty_mix: Dict[str, int] = None) -> List[Dict]:
    """
    Select challenges for the week based on difficulty.
    Default: 2 easy, 2 medium, 1 hard
    """
    import random
    
    if difficulty_mix is None:
        difficulty_mix = {"easy": 2, "medium": 2, "hard": 1}
    
    all_challenges = get_auto_challenges()
    selected = []
    
    for difficulty, count in difficulty_mix.items():
        matching = [c for c in all_challenges if c["difficulty"] == difficulty]
        selected.extend(random.sample(matching, min(count, len(matching))))
    
    return selected
