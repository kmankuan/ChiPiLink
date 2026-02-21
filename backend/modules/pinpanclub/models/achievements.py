"""
Achievements - Models
Automatic achievement system based on completed challenges
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class AchievementType(str, Enum):
    """Achievement types"""
    CHALLENGE_MASTER = "challenge_master"     # Complete X challenges
    WEEKLY_CHAMPION = "weekly_champion"       # Complete all challenges in a week
    STREAK_KEEPER = "streak_keeper"           # Complete challenges X weeks in a row
    POINTS_MILESTONE = "points_milestone"     # Reach X challenge points
    DIFFICULTY_MASTER = "difficulty_master"   # Complete X challenges of certain difficulty
    FIRST_CHALLENGE = "first_challenge"       # Complete the first challenge
    SOCIAL_BUTTERFLY = "social_butterfly"     # Social achievements


class AchievementRarity(str, Enum):
    """Achievement rarity"""
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class Achievement(BaseModel):
    """Achievement definition"""
    achievement_id: str = Field(default_factory=lambda: f"achv_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    type: AchievementType
    rarity: AchievementRarity = AchievementRarity.COMMON
    icon: str = "🏅"

    # Requirements
    requirement_type: str  # "challenges_completed", "points_reached", "streak_weeks", etc.
    requirement_value: int
    requirement_difficulty: Optional[str] = None  # If specific to difficulty

    # Rewards
    points_reward: int = 0
    prize_id: Optional[str] = None

    is_active: bool = True
    is_secret: bool = False  # Secret achievements not shown until earned
    
    created_at: Optional[Any] = None


class PlayerAchievement(BaseModel):
    """Achievement earned by a player"""
    player_achievement_id: str = Field(default_factory=lambda: f"pa_{uuid.uuid4().hex[:8]}")
    player_id: str
    achievement_id: str

    # Cached info
    achievement_info: Optional[Dict] = None
    player_info: Optional[Dict] = None

    # When earned
    earned_at: Optional[Any] = None

    # If the achievement has levels (bronze, silver, gold)
    level: int = 1

    # If already notified
    is_notified: bool = False


# ============== AUTOMATIC ACHIEVEMENT DEFINITIONS ==============

def get_challenge_achievements() -> List[Dict]:
    """Challenge-related achievements"""
    return [
        # First challenge
        {
            "name": "Beginner",
            "description": "Complete your first challenge",
            "type": "first_challenge",
            "rarity": "common",
            "icon": "🌟",
            "requirement_type": "challenges_completed",
            "requirement_value": 1,
            "points_reward": 10
        },
        # Challenges completed
        {
            "name": "Challenger",
            "description": "Complete 5 challenges",
            "type": "challenge_master",
            "rarity": "common",
            "icon": "🎯",
            "requirement_type": "challenges_completed",
            "requirement_value": 5,
            "points_reward": 25
        },
        {
            "name": "Challenge Master",
            "description": "Complete 25 challenges",
            "type": "challenge_master",
            "rarity": "rare",
            "icon": "🎖️",
            "requirement_type": "challenges_completed",
            "requirement_value": 25,
            "points_reward": 100
        },
        {
            "name": "Challenge Legend",
            "description": "Complete 100 challenges",
            "type": "challenge_master",
            "rarity": "legendary",
            "icon": "👑",
            "requirement_type": "challenges_completed",
            "requirement_value": 100,
            "points_reward": 500
        },
        # Perfect week
        {
            "name": "Perfect Week",
            "description": "Complete all challenges in a week",
            "type": "weekly_champion",
            "rarity": "epic",
            "icon": "⭐",
            "requirement_type": "weekly_complete",
            "requirement_value": 1,
            "points_reward": 200
        },
        # Weekly streak
        {
            "name": "Consistent",
            "description": "Complete at least one challenge 3 weeks in a row",
            "type": "streak_keeper",
            "rarity": "rare",
            "icon": "🔥",
            "requirement_type": "streak_weeks",
            "requirement_value": 3,
            "points_reward": 75
        },
        {
            "name": "Unstoppable",
            "description": "Complete at least one challenge 10 weeks in a row",
            "type": "streak_keeper",
            "rarity": "epic",
            "icon": "💎",
            "requirement_type": "streak_weeks",
            "requirement_value": 10,
            "points_reward": 300
        },
        # Accumulated points
        {
            "name": "Collector",
            "description": "Accumulate 500 challenge points",
            "type": "points_milestone",
            "rarity": "rare",
            "icon": "💰",
            "requirement_type": "points_reached",
            "requirement_value": 500,
            "points_reward": 50
        },
        {
            "name": "Grand Collector",
            "description": "Accumulate 2000 challenge points",
            "type": "points_milestone",
            "rarity": "epic",
            "icon": "🏦",
            "requirement_type": "points_reached",
            "requirement_value": 2000,
            "points_reward": 200
        },
        # Specific difficulty
        {
            "name": "Brave",
            "description": "Complete 5 hard challenges",
            "type": "difficulty_master",
            "rarity": "rare",
            "icon": "💪",
            "requirement_type": "difficulty_challenges",
            "requirement_value": 5,
            "requirement_difficulty": "hard",
            "points_reward": 100
        },
        {
            "name": "Intrepid",
            "description": "Complete 3 extreme challenges",
            "type": "difficulty_master",
            "rarity": "epic",
            "icon": "🦁",
            "requirement_type": "difficulty_challenges",
            "requirement_value": 3,
            "requirement_difficulty": "extreme",
            "points_reward": 200
        }
    ]
