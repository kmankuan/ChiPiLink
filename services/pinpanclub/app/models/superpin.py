"""
Super Pin Ranking - Models
Individual ranking system with configurable leagues
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


# ============== ENUMS ==============

class ScoringSystem(str, Enum):
    """Scoring system types"""
    SIMPLE = "simple"          # +3 win, +1 loss
    ELO = "elo"                # ELO system (like chess)
    CUSTOM = "custom"          # Custom


class CheckInMethod(str, Enum):
    """Check-in method types"""
    MANUAL = "manual"          # Manual registration
    QR_CODE = "qr_code"        # QR code scan
    GEOLOCATION = "geolocation"  # GPS/location
    ANY = "any"                # Any method


class StatsLevel(str, Enum):
    """Statistics level"""
    BASIC = "basic"            # Only sets won/lost
    STANDARD = "standard"      # Points per set
    ADVANCED = "advanced"      # Complete statistics (aces, errors, etc.)


class LeagueStatus(str, Enum):
    """League status"""
    DRAFT = "draft"            # In configuration
    ACTIVE = "active"          # Active
    PAUSED = "paused"          # Paused
    FINISHED = "finished"      # Finished


class TournamentType(str, Enum):
    """Final tournament type"""
    TOP_N = "top_n"            # Only top N players
    ALL_PLAYERS = "all_players"  # All players
    BY_CATEGORY = "by_category"  # By categories based on ranking


class MatchType(str, Enum):
    """Match type"""
    CASUAL = "casual"          # Casual match
    RANKED = "ranked"          # Counts for ranking
    TOURNAMENT = "tournament"  # Tournament match


# ============== CONFIGURATION MODELS ==============

class ScoringConfig(BaseModel):
    """Scoring system configuration"""
    system: ScoringSystem = ScoringSystem.SIMPLE
    
    # Simple scoring
    points_win: int = 3
    points_loss: int = 1
    points_draw: int = 0  # If applicable
    bonus_streak: int = 0  # Bonus for win streak
    
    # ELO config
    elo_k_factor: int = 32  # K factor for ELO calculation
    elo_initial: int = 1000  # Initial ELO
    
    # Custom scoring rules
    custom_rules: Optional[Dict[str, Any]] = None


class CheckInConfig(BaseModel):
    """Check-in configuration"""
    method: CheckInMethod = CheckInMethod.MANUAL
    require_referee: bool = False  # Requires referee/witness
    referee_can_be_player: bool = True  # Another player can be referee
    
    # Geolocation config
    club_latitude: Optional[float] = None
    club_longitude: Optional[float] = None
    radius_meters: int = 100  # Allowed radius
    
    # QR config
    qr_code_secret: Optional[str] = None
    qr_expiry_minutes: int = 5
    
    # Auto checkout
    auto_checkout_hours: int = 8  # Automatic checkout after X hours


class StatsConfig(BaseModel):
    """Statistics configuration"""
    level: StatsLevel = StatsLevel.STANDARD
    track_aces: bool = False
    track_errors: bool = False
    track_serve_points: bool = False
    track_rally_length: bool = False
    track_timeouts: bool = False


class TournamentConfig(BaseModel):
    """Final tournament configuration"""
    tournament_type: TournamentType = TournamentType.TOP_N
    top_n_players: int = 8  # If TOP_N
    categories: List[Dict[str, Any]] = []  # If BY_CATEGORY
    # E.g.: [{"name": "A", "min_rank": 1, "max_rank": 8}, ...]
    format: str = "single_elimination"  # single_elimination, double_elimination, round_robin
    third_place_match: bool = True  # Third place match


class PrizeConfig(BaseModel):
    """Prize configuration"""
    prize_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    position: Optional[int] = None  # 1, 2, 3, 4... or None for special prizes
    special_type: Optional[str] = None  # 'best_progress', 'most_matches', etc.
    reward: Optional[str] = None  # Prize description
    icon: Optional[str] = None  # Emoji or icon URL


# ============== LEAGUE MODEL ==============

class SuperPinLeagueBase(BaseModel):
    """Base Super Pin league model"""
    name: str
    description: Optional[str] = None
    season: str  # E.g.: "2025", "Q1-2025"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    image_url: Optional[str] = None


class SuperPinLeagueCreate(SuperPinLeagueBase):
    """Create new league"""
    scoring_config: Optional[ScoringConfig] = None
    checkin_config: Optional[CheckInConfig] = None
    stats_config: Optional[StatsConfig] = None
    tournament_config: Optional[TournamentConfig] = None
    prizes: Optional[List[PrizeConfig]] = None


class SuperPinLeagueUpdate(BaseModel):
    """Update league"""
    name: Optional[str] = None
    description: Optional[str] = None
    season: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    image_url: Optional[str] = None
    status: Optional[LeagueStatus] = None
    scoring_config: Optional[ScoringConfig] = None
    checkin_config: Optional[CheckInConfig] = None
    stats_config: Optional[StatsConfig] = None
    tournament_config: Optional[TournamentConfig] = None
    prizes: Optional[List[PrizeConfig]] = None


class SuperPinLeague(SuperPinLeagueBase):
    """Complete Super Pin league model"""
    model_config = ConfigDict(from_attributes=True)
    
    league_id: str
    status: LeagueStatus = LeagueStatus.DRAFT
    scoring_config: ScoringConfig = Field(default_factory=ScoringConfig)
    checkin_config: CheckInConfig = Field(default_factory=CheckInConfig)
    stats_config: StatsConfig = Field(default_factory=StatsConfig)
    tournament_config: TournamentConfig = Field(default_factory=TournamentConfig)
    prizes: List[PrizeConfig] = []
    total_matches: int = 0
    total_players: int = 0
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== PLAYER CHECK-IN MODEL ==============

class PlayerCheckInCreate(BaseModel):
    """Create player check-in"""
    player_id: str
    league_id: str
    method: CheckInMethod = CheckInMethod.MANUAL
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    qr_code: Optional[str] = None


class PlayerCheckIn(BaseModel):
    """Player check-in model"""
    model_config = ConfigDict(from_attributes=True)
    
    checkin_id: str
    player_id: str
    league_id: str
    method: CheckInMethod
    check_in_time: Any
    check_out_time: Optional[Any] = None
    is_active: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    player_info: Optional[Dict] = None


# ============== SUPER PIN MATCH MODEL ==============

class SuperPinMatchCreate(BaseModel):
    """Create Super Pin match"""
    league_id: str
    player_a_id: str
    player_b_id: str
    referee_id: Optional[str] = None
    match_type: MatchType = MatchType.RANKED
    best_of: int = 3  # Best of 3/5/7
    points_per_set: int = 11


class SuperPinMatchStats(BaseModel):
    """Advanced match statistics"""
    aces_a: int = 0
    aces_b: int = 0
    errors_a: int = 0
    errors_b: int = 0
    serve_points_a: int = 0
    serve_points_b: int = 0
    longest_rally: int = 0
    timeouts_a: int = 0
    timeouts_b: int = 0


class SuperPinMatch(BaseModel):
    """Complete Super Pin match model"""
    model_config = ConfigDict(from_attributes=True)
    
    match_id: str
    league_id: str
    match_type: MatchType
    
    # Players
    player_a_id: str
    player_b_id: str
    referee_id: Optional[str] = None
    
    # Configuration
    best_of: int = 3
    points_per_set: int = 11
    
    # Score
    status: str = "pending"  # pending, in_progress, finished, cancelled
    points_player_a: int = 0
    points_player_b: int = 0
    sets_player_a: int = 0
    sets_player_b: int = 0
    current_set: int = 1
    sets_history: List[Dict] = []
    
    # Result
    winner_id: Optional[str] = None
    
    # Ranking points awarded
    winner_points: int = 0
    loser_points: int = 0
    elo_change_a: int = 0
    elo_change_b: int = 0
    
    # Advanced statistics
    stats: Optional[SuperPinMatchStats] = None
    
    # Additional info
    player_a_info: Optional[Dict] = None
    player_b_info: Optional[Dict] = None
    referee_info: Optional[Dict] = None
    
    # Timestamps
    start_date: Optional[Any] = None
    end_date: Optional[Any] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== RANKING MODEL ==============

class RankingEntry(BaseModel):
    """Ranking entry model"""
    model_config = ConfigDict(from_attributes=True)
    
    ranking_id: str
    league_id: str
    player_id: str
    
    # Position
    position: int
    previous_position: Optional[int] = None
    position_change: int = 0  # +2, -1, 0
    
    # Points
    total_points: int = 0
    elo_rating: int = 1000
    
    # Statistics
    matches_played: int = 0
    matches_won: int = 0
    matches_lost: int = 0
    sets_won: int = 0
    sets_lost: int = 0
    current_streak: int = 0  # +N wins, -N losses
    best_streak: int = 0
    
    # Player info
    player_info: Optional[Dict] = None
    
    # Timestamps
    last_match_date: Optional[Any] = None
    updated_at: Optional[Any] = None


class RankingTable(BaseModel):
    """Complete ranking table"""
    league_id: str
    league_name: str
    season: str
    total_players: int
    total_matches: int
    scoring_system: ScoringSystem
    entries: List[RankingEntry]
    last_updated: Optional[Any] = None


# ============== SEASON TOURNAMENT MODEL ==============

class SeasonTournamentCreate(BaseModel):
    """Create season tournament"""
    league_id: str
    name: str
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None


class SeasonTournament(BaseModel):
    """Season-end tournament model"""
    model_config = ConfigDict(from_attributes=True)
    
    tournament_id: str
    league_id: str
    name: str
    description: Optional[str] = None
    
    # Configuration (inherited from league)
    tournament_config: TournamentConfig
    prizes: List[PrizeConfig] = []
    
    # Status
    status: str = "pending"  # pending, in_progress, finished
    
    # Participants (copied from ranking when creating tournament)
    participants: List[Dict] = []  # [{player_id, ranking_position, ...}]
    
    # Brackets/Matches
    brackets: List[Dict] = []
    matches: List[str] = []
    
    # Final results
    final_results: List[Dict] = []  # [{position, player_id, prize}]
    
    # Timestamps
    start_date: Optional[Any] = None
    end_date: Optional[Any] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== SPECIAL PRIZE TYPES ==============

class SpecialPrizeTypes:
    """Predefined special prize types"""
    BEST_PROGRESS = "best_progress"  # Biggest rise in ranking
    MOST_MATCHES = "most_matches"  # Most matches played
    BEST_STREAK = "best_streak"  # Best win streak
    BEST_SPORTSMANSHIP = "best_sportsmanship"  # Voted by players
    BEST_COMEBACK = "best_comeback"  # Best comeback
    ROOKIE_OF_THE_YEAR = "rookie_of_the_year"  # Best new player
