"""
Weekly Challenges - Modelos
Retos semanales automatics y configurables
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class ChallengeDifficulty(str, Enum):
    """Dificultad dthe challenge"""
    EASY = "easy"           # Easy
    MEDIUM = "medium"       # Medio
    HARD = "hard"           # Difficult
    EXTREME = "extreme"     # Extremo


class ChallengeType(str, Enum):
    """Tipos de reto"""
    MATCHES_PLAYED = "matches_played"      # Jugar X partidos
    MATCHES_WON = "matches_won"            # Ganar X partidos
    MATCHES_REFEREED = "matches_refereed"  # Arbitrar X partidos
    WIN_STREAK = "win_streak"              # X win streak
    PLAY_DIFFERENT = "play_different"      # Jugar contra X oponentes diferentes
    DAILY_PLAY = "daily_play"              # Jugar X days diferentes
    COMEBACK = "comeback"                  # Win while behind on score
    PERFECT_GAME = "perfect_game"          # Ganar sin perder puntos (11-0)
    SOCIAL = "social"                      # Interactions sociales
    CUSTOM = "custom"                      # Personalizado


class ChallengeStatus(str, Enum):
    """Estado dthe challenge para un jugador"""
    AVAILABLE = "available"    # Available to start
    IN_PROGRESS = "in_progress"  # In progreso
    COMPLETED = "completed"    # Completado
    FAILED = "failed"          # No completado a tiempo
    EXPIRED = "expired"        # Expirado


# ============== CHALLENGE DEFINITION ==============

class ChallengeDefinition(BaseModel):
    """Definition de un reto"""
    challenge_id: str = Field(default_factory=lambda: f"challenge_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    type: ChallengeType
    difficulty: ChallengeDifficulty = ChallengeDifficulty.MEDIUM
    icon: str = "🎯"
    
    # Objetivo
    target_value: int  # Ej: 5 partidos, 3 victorias
    
    # Recompensas
    points_reward: int = 0
    badge_id: Optional[str] = None
    prize_id: Optional[str] = None
    
    # Configuration
    is_automatic: bool = True  # Si es generado automaticmente
    is_active: bool = True
    is_repeatable: bool = False  # If can be completed multiple times
    
    # Vigencia
    valid_from: Optional[str] = None
    valid_until: Optional[str] = None
    duration_days: int = 7  # Duration by default: 1 semana
    
    # Metadata
    created_by: Optional[str] = None  # Admin que lo created (si es manual)
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


class ChallengeDefinitionCreate(BaseModel):
    """Create definition de reto"""
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
    """Progreso de un jugador en un reto"""
    progress_id: str = Field(default_factory=lambda: f"progress_{uuid.uuid4().hex[:8]}")
    challenge_id: str
    jugador_id: str
    
    # Info (cached)
    challenge_info: Optional[Dict] = None
    jugador_info: Optional[Dict] = None
    
    # Progreso
    current_value: int = 0
    target_value: int = 0
    progress_percent: float = 0.0
    
    # Estado
    status: ChallengeStatus = ChallengeStatus.IN_PROGRESS
    
    # Timestamps
    started_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    expires_at: Optional[Any] = None


class PlayerChallengeUpdate(BaseModel):
    """Update progreso de reto"""
    current_value: int
    status: Optional[ChallengeStatus] = None


# ============== WEEKLY CHALLENGE SET ==============

class WeeklyChallengeSet(BaseModel):
    """Conjunto de retos de la semana"""
    week_id: str = Field(default_factory=lambda: f"week_{uuid.uuid4().hex[:8]}")
    week_number: int
    year: int
    
    # Weekly challenges
    challenges: List[str] = []  # List of challenge_ids
    
    # Statistics
    total_participants: int = 0
    total_completions: int = 0
    
    # Vigencia
    start_date: str
    end_date: str
    
    is_active: bool = True
    created_at: Optional[Any] = None


# ============== CHALLENGE LEADERBOARD ==============

class ChallengeLeaderboardEntry(BaseModel):
    """Entrada en el leaderboard de retos"""
    jugador_id: str
    jugador_info: Optional[Dict] = None
    
    # Statistics
    challenges_completed: int = 0
    total_points: int = 0
    current_streak: int = 0  # Semanas consecutivas completando retos
    
    # Position
    rank: int = 0


class ChallengeLeaderboard(BaseModel):
    """Leaderboard de retos"""
    week_id: Optional[str] = None
    period: str = "weekly"  # weekly, monthly, all_time
    entries: List[ChallengeLeaderboardEntry] = []
    total_participants: int = 0


# ============== AUTO-GENERATED CHALLENGES ==============

def get_auto_challenges() -> List[Dict]:
    """Retos automatics que se pueden generar"""
    return [
        {
            "name": "Jugador Activo",
            "description": "Juega 5 partidos esta semana",
            "type": "matches_played",
            "difficulty": "easy",
            "icon": "🏓",
            "target_value": 5,
            "points_reward": 50
        },
        {
            "name": "Racha Ganadora",
            "description": "Gana 3 partidos seguidos",
            "type": "win_streak",
            "difficulty": "medium",
            "icon": "🔥",
            "target_value": 3,
            "points_reward": 100
        },
        {
            "name": "Colaborador",
            "description": "Arbitra 3 partidos esta semana",
            "type": "matches_refereed",
            "difficulty": "easy",
            "icon": "⚖️",
            "target_value": 3,
            "points_reward": 75
        },
        {
            "name": "Victorioso",
            "description": "Gana 5 partidos esta semana",
            "type": "matches_won",
            "difficulty": "medium",
            "icon": "🏆",
            "target_value": 5,
            "points_reward": 100
        },
        {
            "name": "Social Player",
            "description": "Juega contra 5 oponentes diferentes",
            "type": "play_different",
            "difficulty": "medium",
            "icon": "🤝",
            "target_value": 5,
            "points_reward": 80
        },
        {
            "name": "Constancia",
            "description": "Juega al menos un partido 4 days diferentes",
            "type": "daily_play",
            "difficulty": "medium",
            "icon": "📅",
            "target_value": 4,
            "points_reward": 100
        },
        {
            "name": "Remontada Epic",
            "description": "Gana un partido after de perder el primer set",
            "type": "comeback",
            "difficulty": "hard",
            "icon": "💪",
            "target_value": 1,
            "points_reward": 150
        },
        {
            "name": "Partido Perfecto",
            "description": "Gana un partido 11-0",
            "type": "perfect_game",
            "difficulty": "extreme",
            "icon": "⭐",
            "target_value": 1,
            "points_reward": 200
        },
        {
            "name": "Maratonista",
            "description": "Juega 10 partidos esta semana",
            "type": "matches_played",
            "difficulty": "hard",
            "icon": "🏃",
            "target_value": 10,
            "points_reward": 150
        },
        {
            "name": "Invicto",
            "description": "Gana 5 partidos seguidos",
            "type": "win_streak",
            "difficulty": "hard",
            "icon": "👑",
            "target_value": 5,
            "points_reward": 200
        }
    ]


def select_weekly_challenges(difficulty_mix: Dict[str, int] = None) -> List[Dict]:
    """
    Selecciona retos para la semana based on en dificultad.
    Por defecto: 2 easyes, 2 medios, 1 difficult
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
