"""
Ranking Seasons - Modelos para system for temporadas
Módulo: pinpanclub
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class SeasonStatus(str, Enum):
    """Estado de una temporada"""
    UPCOMING = "upcoming"      # Próxima temporada
    ACTIVE = "active"          # Season actual activa
    CLOSING = "closing"        # In proceso de cierre
    COMPLETED = "completed"    # Season finalizada


class SeasonType(str, Enum):
    """Tipo de temporada"""
    MONTHLY = "monthly"        # Mensual
    QUARTERLY = "quarterly"    # Trimestral
    SPECIAL = "special"        # Evento especial


class SeasonRewardTier(BaseModel):
    """Nivel de recompensa por posición"""
    position_start: int        # Posición inicial (ej: 1)
    position_end: int          # Posición final (ej: 3)
    bonus_points: int          # Points bonus
    badge: Optional[Dict] = None  # Badge especial
    title: Optional[Dict] = None  # Título especial
    perks: List[str] = []      # Beneficios adicionales
    prize_id: Optional[str] = None  # Prize físico


class RankingSeason(BaseModel):
    """Definición de una temporada de ranking"""
    season_id: str = Field(default_factory=lambda: f"season_{uuid.uuid4().hex[:8]}")
    
    # Information básica
    name: Dict[str, str]       # Nombre multi-idioma {"es": "...", "en": "..."}
    description: Dict[str, str]  # Descripción multi-idioma
    season_type: SeasonType = SeasonType.MONTHLY
    season_number: int = 1     # Number of temporada
    
    # Fechas
    start_date: str            # ISO format
    end_date: str              # ISO format
    
    # Estado
    status: SeasonStatus = SeasonStatus.UPCOMING
    
    # Configuration
    min_challenges_to_qualify: int = 5  # Mínimo de retos para calificar
    min_points_to_qualify: int = 50     # Mínimo de puntos para calificar
    
    # Recompensas por posición
    reward_tiers: List[Dict] = []
    
    # Statistics finales (se llenan al cerrar)
    final_standings: Optional[List[Dict]] = None
    total_participants: int = 0
    total_challenges_completed: int = 0
    total_points_earned: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    closed_at: Optional[str] = None
    theme: Optional[Dict] = None  # Tema visual de la temporada


class SeasonParticipant(BaseModel):
    """Participante en una temporada"""
    participant_id: str = Field(default_factory=lambda: f"sp_{uuid.uuid4().hex[:8]}")
    season_id: str
    jugador_id: str
    
    # Info del jugador (cached)
    jugador_info: Optional[Dict] = None
    
    # Points de la temporada (se reinician cada temporada)
    season_points: int = 0
    challenges_completed: int = 0
    current_streak: int = 0
    best_streak: int = 0
    
    # Posición actual
    current_position: Optional[int] = None
    
    # Posición final (al cerrar temporada)
    final_position: Optional[int] = None
    rewards_claimed: bool = False
    
    # Timestamps
    joined_at: Optional[str] = None
    last_activity: Optional[str] = None


class SeasonReward(BaseModel):
    """Recompensa otorgada al final de una temporada"""
    reward_id: str = Field(default_factory=lambda: f"sr_{uuid.uuid4().hex[:8]}")
    season_id: str
    jugador_id: str
    
    # Posición y tier
    final_position: int
    tier_name: str  # "champion", "top3", "top10", etc.
    
    # Recompensas otorgadas
    bonus_points: int = 0
    badge_earned: Optional[Dict] = None
    title_earned: Optional[Dict] = None
    perks_earned: List[str] = []
    
    # Info
    season_info: Optional[Dict] = None
    jugador_info: Optional[Dict] = None
    
    granted_at: Optional[str] = None
    is_notified: bool = False


# ============== DEFINICIONES DE RECOMPENSAS POR DEFECTO ==============

def get_default_season_rewards() -> List[Dict]:
    """Recompensas por defecto para temporadas"""
    return [
        {
            "tier_name": "champion",
            "position_start": 1,
            "position_end": 1,
            "bonus_points": 1000,
            "badge": {
                "name": {"es": "Campeón de Temporada", "en": "Season Champion", "zh": "赛季冠军"},
                "icon": "🏆",
                "rarity": "legendary"
            },
            "title": {"es": "Campeón", "en": "Champion", "zh": "冠军"},
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
            "title": {"es": "Élite", "en": "Elite", "zh": "精英"},
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
    """Temas disponibles para temporadas"""
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
