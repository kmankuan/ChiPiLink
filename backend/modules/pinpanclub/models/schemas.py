"""
PinpanClub - Pydantic Models
Schema definitions for the module
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ============== ENUMS ==============

class PlayerLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    PROFESSIONAL = "professional"


class MatchState(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    PAUSED = "paused"
    FINISHED = "finished"
    CANCELLED = "cancelled"


class TournamentFormat(str, Enum):
    SINGLE_ELIMINATION = "single_elimination"
    DOUBLE_ELIMINATION = "double_elimination"
    ROUND_ROBIN = "round_robin"
    SWISS = "swiss"


# ============== PLAYER MODELS ==============

class PlayerBase(BaseModel):
    """Base player model"""
    name: str
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    level: PlayerLevel = PlayerLevel.BEGINNER


class PlayerCreate(PlayerBase):
    """Create new player"""
    pass


class PlayerUpdate(BaseModel):
    """Update player"""
    name: Optional[str] = None
    last_name: Optional[str] = None
    nickname: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    photo_url: Optional[str] = None
    level: Optional[PlayerLevel] = None


class Player(PlayerBase):
    """Complete player model"""
    model_config = ConfigDict(from_attributes=True)
    
    player_id: str
    elo_rating: int = 1000
    matches_played: int = 0
    matches_won: int = 0
    matches_lost: int = 0
    active: bool = True
    monday_item_id: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== MATCH MODELS ==============

class MatchBase(BaseModel):
    """Base match model"""
    player_a_id: str
    player_b_id: str
    best_of: int = 5  # Best of 5 sets
    points_per_set: int = 11
    table: Optional[str] = None
    round: Optional[str] = None
    tournament_id: Optional[str] = None


class MatchCreate(MatchBase):
    """Create new match"""
    pass


class MatchScoreUpdate(BaseModel):
    """Update score"""
    action: str  # 'point_a', 'point_b', 'undo', 'reset_set'


class Match(MatchBase):
    """Partido completo"""
    model_config = ConfigDict(from_attributes=True)
    
    partido_id: str
    estado: MatchState = MatchState.PENDIENTE
    points_player_a: int = 0
    points_player_b: int = 0
    sets_jugador_a: int = 0
    sets_jugador_b: int = 0
    set_actual: int = 1
    historial_sets: List[Dict] = []
    winner_id: Optional[str] = None
    fecha_inicio: Optional[Any] = None  # Can be string or datetime
    fecha_fin: Optional[Any] = None  # Can be string or datetime
    monday_item_id: Optional[str] = None
    player_a_info: Optional[Dict] = None
    player_b_info: Optional[Dict] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== TOURNAMENT MODELS ==============

class TournamentBase(BaseModel):
    """Base para torneo"""
    name: str
    description: Optional[str] = None
    formato: TournamentFormat = TournamentFormat.ELIMINACION_SIMPLE
    max_participantes: Optional[int] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None


class TournamentCreate(TournamentBase):
    """Create new tournament"""
    pass


class Tournament(TournamentBase):
    """Torneo completo"""
    model_config = ConfigDict(from_attributes=True)
    
    torneo_id: str
    estado: str = "inscripcion"
    participantes: List[str] = []
    partidos: List[str] = []
    winner_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== SPONSOR MODELS ==============

class SponsorBase(BaseModel):
    """Base para patrocinador"""
    name: str
    logo_url: str
    website_url: Optional[str] = None
    posicion: str = "horizontal"  # horizontal, square, header
    orden: int = 0


class SponsorCreate(SponsorBase):
    """Create nuevo patrocinador"""
    pass


class Sponsor(SponsorBase):
    """Patrocinador completo"""
    model_config = ConfigDict(from_attributes=True)
    
    sponsor_id: str
    active: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== CONFIG MODELS ==============

class MondayConfig(BaseModel):
    """Configuration de Monday.com"""
    players_board_id: Optional[str] = None
    matches_board_id: Optional[str] = None
    tournaments_board_id: Optional[str] = None
    auto_sync_players: bool = False
    auto_sync_matches: bool = True
    auto_sync_results: bool = True


class CanvasLayout(BaseModel):
    """Layout del canvas"""
    layout_id: str
    name: str
    layout_data: Dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
