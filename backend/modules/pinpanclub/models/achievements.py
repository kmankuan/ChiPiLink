"""
Achievements - Modelos
Sistema de logros automáticos basados en retos completados
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class AchievementType(str, Enum):
    """Tipos de logro"""
    CHALLENGE_MASTER = "challenge_master"     # Completar X retos
    WEEKLY_CHAMPION = "weekly_champion"       # Completar todos los retos de una semana
    STREAK_KEEPER = "streak_keeper"           # Completar retos X semanas seguidas
    POINTS_MILESTONE = "points_milestone"     # Alcanzar X puntos de retos
    DIFFICULTY_MASTER = "difficulty_master"   # Completar X retos de cierta dificultad
    FIRST_CHALLENGE = "first_challenge"       # Completar el primer reto
    SOCIAL_BUTTERFLY = "social_butterfly"     # Logros sociales


class AchievementRarity(str, Enum):
    """Rareza del logro"""
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


class Achievement(BaseModel):
    """Definición de un logro"""
    achievement_id: str = Field(default_factory=lambda: f"achv_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    type: AchievementType
    rarity: AchievementRarity = AchievementRarity.COMMON
    icon: str = "🏅"
    
    # Requisitos
    requirement_type: str  # "challenges_completed", "points_reached", "streak_weeks", etc.
    requirement_value: int
    requirement_difficulty: Optional[str] = None  # Si es específico de dificultad
    
    # Recompensas
    points_reward: int = 0
    prize_id: Optional[str] = None
    
    is_active: bool = True
    is_secret: bool = False  # Logros secretos no se muestran hasta obtenerlos
    
    created_at: Optional[Any] = None


class PlayerAchievement(BaseModel):
    """Logro obtenido por un jugador"""
    player_achievement_id: str = Field(default_factory=lambda: f"pa_{uuid.uuid4().hex[:8]}")
    jugador_id: str
    achievement_id: str
    
    # Info cached
    achievement_info: Optional[Dict] = None
    jugador_info: Optional[Dict] = None
    
    # Cuándo se obtuvo
    earned_at: Optional[Any] = None
    
    # Si el logro tiene niveles (bronce, plata, oro)
    level: int = 1
    
    # Si ya fue notificado
    is_notified: bool = False


# ============== DEFINICIONES DE LOGROS AUTOMÁTICOS ==============

def get_challenge_achievements() -> List[Dict]:
    """Logros relacionados con retos"""
    return [
        # Primer reto
        {
            "name": "Principiante",
            "description": "Completa tu primer reto",
            "type": "first_challenge",
            "rarity": "common",
            "icon": "🌟",
            "requirement_type": "challenges_completed",
            "requirement_value": 1,
            "points_reward": 10
        },
        # Retos completados
        {
            "name": "Retador",
            "description": "Completa 5 retos",
            "type": "challenge_master",
            "rarity": "common",
            "icon": "🎯",
            "requirement_type": "challenges_completed",
            "requirement_value": 5,
            "points_reward": 25
        },
        {
            "name": "Maestro de Retos",
            "description": "Completa 25 retos",
            "type": "challenge_master",
            "rarity": "rare",
            "icon": "🎖️",
            "requirement_type": "challenges_completed",
            "requirement_value": 25,
            "points_reward": 100
        },
        {
            "name": "Leyenda de Retos",
            "description": "Completa 100 retos",
            "type": "challenge_master",
            "rarity": "legendary",
            "icon": "👑",
            "requirement_type": "challenges_completed",
            "requirement_value": 100,
            "points_reward": 500
        },
        # Semana perfecta
        {
            "name": "Semana Perfecta",
            "description": "Completa todos los retos de una semana",
            "type": "weekly_champion",
            "rarity": "epic",
            "icon": "⭐",
            "requirement_type": "weekly_complete",
            "requirement_value": 1,
            "points_reward": 200
        },
        # Racha semanal
        {
            "name": "Constante",
            "description": "Completa al menos un reto 3 semanas seguidas",
            "type": "streak_keeper",
            "rarity": "rare",
            "icon": "🔥",
            "requirement_type": "streak_weeks",
            "requirement_value": 3,
            "points_reward": 75
        },
        {
            "name": "Imparable",
            "description": "Completa al menos un reto 10 semanas seguidas",
            "type": "streak_keeper",
            "rarity": "epic",
            "icon": "💎",
            "requirement_type": "streak_weeks",
            "requirement_value": 10,
            "points_reward": 300
        },
        # Puntos acumulados
        {
            "name": "Coleccionista",
            "description": "Acumula 500 puntos de retos",
            "type": "points_milestone",
            "rarity": "rare",
            "icon": "💰",
            "requirement_type": "points_reached",
            "requirement_value": 500,
            "points_reward": 50
        },
        {
            "name": "Gran Coleccionista",
            "description": "Acumula 2000 puntos de retos",
            "type": "points_milestone",
            "rarity": "epic",
            "icon": "🏦",
            "requirement_type": "points_reached",
            "requirement_value": 2000,
            "points_reward": 200
        },
        # Dificultad específica
        {
            "name": "Valiente",
            "description": "Completa 5 retos difíciles",
            "type": "difficulty_master",
            "rarity": "rare",
            "icon": "💪",
            "requirement_type": "difficulty_challenges",
            "requirement_value": 5,
            "requirement_difficulty": "hard",
            "points_reward": 100
        },
        {
            "name": "Intrépido",
            "description": "Completa 3 retos extremos",
            "type": "difficulty_master",
            "rarity": "epic",
            "icon": "🦁",
            "requirement_type": "difficulty_challenges",
            "requirement_value": 3,
            "requirement_difficulty": "extreme",
            "points_reward": 200
        }
    ]
