"""
Super Pin Ranking - Modelos
System for ranking individual con ligas configurables
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum


# ============== ENUMS ==============

class ScoringSystem(str, Enum):
    """System for score"""
    SIMPLE = "simple"          # +3 victoria, +1 derrota
    ELO = "elo"                # Sistema ELO (como ajedrez)
    CUSTOM = "custom"          # Personalizado


class CheckInMethod(str, Enum):
    """Method de check-in"""
    MANUAL = "manual"          # Record manual
    QR_CODE = "qr_code"        # QR code scan
    GEOLOCATION = "geolocation"  # GPS/location
    ANY = "any"                # Cualquier method


class StatsLevel(str, Enum):
    """Nivel de statistics"""
    BASIC = "basic"            # Only sets ganados/perdidos
    STANDARD = "standard"      # Points por set
    ADVANCED = "advanced"      # Statistics completas (aces, errores, etc.)


class LeagueStatus(str, Enum):
    """Estado of the league"""
    DRAFT = "draft"            # In configuration
    ACTIVE = "active"          # Activa
    PAUSED = "paused"          # Pausada
    FINISHED = "finished"      # Finalizada


class TournamentType(str, Enum):
    """Tipo de torneo final"""
    TOP_N = "top_n"            # Only top N players
    ALL_PLAYERS = "all_players"  # All the players
    BY_CATEGORY = "by_category"  # By categorys according to ranking


class MatchType(str, Enum):
    """Tipo de partido"""
    CASUAL = "casual"          # Match casual
    RANKED = "ranked"          # Counts for ranking
    TOURNAMENT = "tournament"  # Tournament match


# ============== CONFIGURATION MODELS ==============

class ScoringConfig(BaseModel):
    """Configuration del system for score"""
    system: ScoringSystem = ScoringSystem.SIMPLE
    
    # Simple scoring
    points_win: int = 3
    points_loss: int = 1
    points_draw: int = 0  # Si aplica
    bonus_streak: int = 0  # Bonus for win streak
    
    # ELO config
    elo_k_factor: int = 32  # K factor for ELO calculation
    elo_initial: int = 1000  # ELO inicial
    
    # Custom scoring rules
    custom_rules: Optional[Dict[str, Any]] = None


class CheckInConfig(BaseModel):
    """Configuration de check-in"""
    method: CheckInMethod = CheckInMethod.MANUAL  # Legacy - keep for compatibility
    methods: List[str] = ["manual"]  # List of methods permitidos
    require_referee: bool = False  # Requiere referee/testigo
    referee_can_be_player: bool = True  # Another player can be referee
    
    # Geolocation config
    club_latitude: Optional[float] = None
    club_longitude: Optional[float] = None
    radius_meters: int = 100  # Radio permitido
    
    # QR config
    qr_code_secret: Optional[str] = None
    qr_expiry_minutes: int = 5
    
    # Auto checkout
    auto_checkout_hours: int = 8  # Auto checkout after X hours


class StatsConfig(BaseModel):
    """Configuration de statistics"""
    level: StatsLevel = StatsLevel.STANDARD
    track_aces: bool = False
    track_errors: bool = False
    track_serve_points: bool = False
    track_rally_length: bool = False
    track_timeouts: bool = False


class TournamentConfig(BaseModel):
    """Configuration dthe tournament final"""
    tournament_type: TournamentType = TournamentType.TOP_N
    top_n_players: int = 8  # Si es TOP_N
    categories: List[Dict[str, Any]] = []  # Si es BY_CATEGORY
    # Ej: [{"name": "A", "min_rank": 1, "max_rank": 8}, ...]
    format: str = "eliminacion_simple"  # eliminacion_simple, eliminacion_doble, round_robin
    third_place_match: bool = True  # Match por 3er lugar


class PrizeConfig(BaseModel):
    """Configuration de premios"""
    prize_id: Optional[str] = None
    name: str
    description: Optional[str] = None
    position: Optional[int] = None  # 1, 2, 3, 4... o None para especiales
    special_type: Optional[str] = None  # 'mejor_progreso', 'mas_partidos', etc.
    reward: Optional[str] = None  # Description ofl premio
    icon: Optional[str] = None  # Emoji or icon URL


# ============== LEAGUE MODEL ==============

class SuperPinLeagueBase(BaseModel):
    """Base para liga Super Pin"""
    nombre: str
    descripcion: Optional[str] = None
    temporada: str  # Ej: "2025", "Q1-2025"
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
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
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    temporada: Optional[str] = None
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    image_url: Optional[str] = None
    estado: Optional[LeagueStatus] = None
    scoring_config: Optional[ScoringConfig] = None
    checkin_config: Optional[CheckInConfig] = None
    stats_config: Optional[StatsConfig] = None
    tournament_config: Optional[TournamentConfig] = None
    prizes: Optional[List[PrizeConfig]] = None


class SuperPinLeague(SuperPinLeagueBase):
    """Liga Super Pin completa"""
    model_config = ConfigDict(from_attributes=True)
    
    liga_id: str
    estado: LeagueStatus = LeagueStatus.DRAFT
    scoring_config: ScoringConfig = Field(default_factory=ScoringConfig)
    checkin_config: CheckInConfig = Field(default_factory=CheckInConfig)
    stats_config: StatsConfig = Field(default_factory=StatsConfig)
    tournament_config: TournamentConfig = Field(default_factory=TournamentConfig)
    prizes: List[PrizeConfig] = []
    total_partidos: int = 0
    total_jugadores: int = 0
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== PLAYER CHECK-IN MODEL ==============

class PlayerCheckInCreate(BaseModel):
    """Create check-in de jugador"""
    jugador_id: str
    liga_id: str
    method: CheckInMethod = CheckInMethod.MANUAL
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    qr_code: Optional[str] = None


class PlayerCheckIn(BaseModel):
    """Check-in de jugador"""
    model_config = ConfigDict(from_attributes=True)
    
    checkin_id: str
    jugador_id: str
    liga_id: str
    method: CheckInMethod
    check_in_time: Any
    check_out_time: Optional[Any] = None
    is_active: bool = True
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    jugador_info: Optional[Dict] = None


# ============== SUPER PIN MATCH MODEL ==============

class SuperPinMatchCreate(BaseModel):
    """Create Super Pin match"""
    liga_id: str
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: Optional[str] = None
    match_type: MatchType = MatchType.RANKED
    mejor_de: int = 3  # Best of 3/5/7
    puntos_por_set: int = 11


class SuperPinMatchStats(BaseModel):
    """Statistics avanzadas dthe match"""
    aces_a: int = 0
    aces_b: int = 0
    errores_a: int = 0
    errores_b: int = 0
    puntos_saque_a: int = 0
    puntos_saque_b: int = 0
    rally_mas_largo: int = 0
    timeouts_a: int = 0
    timeouts_b: int = 0


class SuperPinMatch(BaseModel):
    """Partido Super Pin completo"""
    model_config = ConfigDict(from_attributes=True)
    
    partido_id: str
    liga_id: str
    match_type: MatchType
    
    # Playeres
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: Optional[str] = None
    
    # Configuration
    mejor_de: int = 3
    puntos_por_set: int = 11
    
    # Marcador
    estado: str = "pendiente"  # pendiente, en_curso, finalizado, cancelado
    puntos_jugador_a: int = 0
    puntos_jugador_b: int = 0
    sets_jugador_a: int = 0
    sets_jugador_b: int = 0
    set_actual: int = 1
    historial_sets: List[Dict] = []
    
    # Result
    ganador_id: Optional[str] = None
    
    # Ranking points awarded
    puntos_ganador: int = 0
    puntos_perdedor: int = 0
    elo_change_a: int = 0
    elo_change_b: int = 0
    
    # Statistics avanzadas
    stats: Optional[SuperPinMatchStats] = None
    
    # Info adicional
    jugador_a_info: Optional[Dict] = None
    jugador_b_info: Optional[Dict] = None
    arbitro_info: Optional[Dict] = None
    
    # Timestamps
    fecha_inicio: Optional[Any] = None
    fecha_fin: Optional[Any] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== RANKING MODEL ==============

class RankingEntry(BaseModel):
    """Entrada in ranking"""
    model_config = ConfigDict(from_attributes=True)
    
    ranking_id: str
    liga_id: str
    jugador_id: str
    
    # Position
    posicion: int
    posicion_anterior: Optional[int] = None
    cambio_posicion: int = 0  # +2, -1, 0
    
    # Points
    puntos_totales: int = 0
    elo_rating: int = 1000
    
    # Statistics
    partidos_jugados: int = 0
    partidos_ganados: int = 0
    partidos_perdidos: int = 0
    sets_ganados: int = 0
    sets_perdidos: int = 0
    racha_actual: int = 0  # +N victorias, -N derrotas
    mejor_racha: int = 0
    
    # Info jugador
    jugador_info: Optional[Dict] = None
    
    # Timestamps
    last_match_date: Optional[Any] = None
    updated_at: Optional[Any] = None


class RankingTable(BaseModel):
    """Tabla de ranking completa"""
    liga_id: str
    liga_nombre: str
    temporada: str
    total_jugadores: int
    total_partidos: int
    scoring_system: ScoringSystem
    entries: List[RankingEntry]
    last_updated: Optional[Any] = None


# ============== SEASON TOURNAMENT MODEL ==============

class SeasonTournamentCreate(BaseModel):
    """Create season tournament"""
    liga_id: str
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: str
    fecha_fin: Optional[str] = None


class SeasonTournament(BaseModel):
    """Torneo de fin de temporada"""
    model_config = ConfigDict(from_attributes=True)
    
    torneo_id: str
    liga_id: str
    nombre: str
    descripcion: Optional[str] = None
    
    # Configuration (heredada of the league)
    tournament_config: TournamentConfig
    prizes: List[PrizeConfig] = []
    
    # Estado
    estado: str = "pendiente"  # pendiente, en_curso, finalizado
    
    # Participants (copied from ranking when creating tournament)
    participantes: List[Dict] = []  # [{jugador_id, posicion_ranking, ...}]
    
    # Brackets/Partidos
    brackets: List[Dict] = []
    partidos: List[str] = []
    
    # Results
    resultados_finales: List[Dict] = []  # [{posicion, jugador_id, premio}]
    
    # Timestamps
    fecha_inicio: Optional[Any] = None
    fecha_fin: Optional[Any] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== SPECIAL PRIZE TYPES ==============

class SpecialPrizeTypes:
    """Tipos de premios especiales predefinidos"""
    MEJOR_PROGRESO = "mejor_progreso"  # Biggest ranking climb
    MAS_PARTIDOS = "mas_partidos"  # More partidos jugados
    MEJOR_RACHA = "mejor_racha"  # Best win streak
    MEJOR_DEPORTIVIDAD = "mejor_deportividad"  # Votado by playeres
    MEJOR_COMEBACK = "mejor_comeback"  # Mejor remontada
    ROOKIE_DEL_ANO = "rookie_del_ano"  # Mejor jugador nuevo


# ============== PLAYER BADGES ==============

class BadgeType(str, Enum):
    """Tipos de badges"""
    TOURNAMENT_CHAMPION = "tournament_champion"      # 🏆 Champion de torneo
    TOURNAMENT_RUNNER_UP = "tournament_runner_up"    # 🥈 Runner-up
    TOURNAMENT_THIRD = "tournament_third"            # 🥉 Tercer lugar
    SEASON_MVP = "season_mvp"                        # ⭐ MVP de temporada
    WIN_STREAK_5 = "win_streak_5"                    # 🔥 Racha de 5 victorias
    WIN_STREAK_10 = "win_streak_10"                  # 🔥🔥 Racha de 10 victorias
    MATCHES_50 = "matches_50"                        # 🎮 50 partidos jugados
    MATCHES_100 = "matches_100"                      # 🎮🎮 100 partidos jugados
    FIRST_WIN = "first_win"                          # 🌟 Primera victoria
    PERFECT_SET = "perfect_set"                      # 💯 Set perfecto (11-0)
    COMEBACK_KING = "comeback_king"                  # 👑 Rey de remontadas


class PlayerBadge(BaseModel):
    """Badge/logro de un jugador"""
    model_config = ConfigDict(from_attributes=True)
    
    badge_id: str
    jugador_id: str
    badge_type: str
    name: str
    description: Optional[str] = None
    icon: str  # Emoji o URL
    earned_at: Optional[Any] = None
    
    # Badge context
    liga_id: Optional[str] = None
    torneo_id: Optional[str] = None
    partido_id: Optional[str] = None
    temporada: Optional[str] = None
    
    # Metadatos adicionales
    metadata: Dict[str, Any] = {}


class PlayerBadgeCreate(BaseModel):
    """Create badge para jugador"""
    jugador_id: str
    badge_type: str
    liga_id: Optional[str] = None
    torneo_id: Optional[str] = None
    partido_id: Optional[str] = None
    temporada: Optional[str] = None
    metadata: Dict[str, Any] = {}


# Badge definitions with icons and descriptions
BADGE_DEFINITIONS = {
    BadgeType.TOURNAMENT_CHAMPION: {
        "name": "Champion de Torneo",
        "name_en": "Tournament Champion",
        "name_zh": "锦标赛冠军",
        "icon": "🏆",
        "description": "Ganador de un torneo de temporada",
        "rarity": "legendary"
    },
    BadgeType.TOURNAMENT_RUNNER_UP: {
        "name": "Runner-up",
        "name_en": "Runner-up",
        "name_zh": "亚军",
        "icon": "🥈",
        "description": "Segundo lugar en torneo",
        "rarity": "epic"
    },
    BadgeType.TOURNAMENT_THIRD: {
        "name": "Tercer Lugar",
        "name_en": "Third Place",
        "name_zh": "季军",
        "icon": "🥉",
        "description": "Tercer lugar en torneo",
        "rarity": "rare"
    },
    BadgeType.SEASON_MVP: {
        "name": "MVP de Temporada",
        "name_en": "Season MVP",
        "name_zh": "赛季MVP",
        "icon": "⭐",
        "description": "Jugador more valioso of the season",
        "rarity": "legendary"
    },
    BadgeType.WIN_STREAK_5: {
        "name": "Racha de Fuego",
        "name_en": "On Fire",
        "name_zh": "火热连胜",
        "icon": "🔥",
        "description": "5 victorias consecutivas",
        "rarity": "rare"
    },
    BadgeType.WIN_STREAK_10: {
        "name": "Imparable",
        "name_en": "Unstoppable",
        "name_zh": "势不可挡",
        "icon": "🔥",
        "description": "10 victorias consecutivas",
        "rarity": "epic"
    },
    BadgeType.MATCHES_50: {
        "name": "Veterano",
        "name_en": "Veteran",
        "name_zh": "老将",
        "icon": "🎮",
        "description": "50 partidos jugados",
        "rarity": "common"
    },
    BadgeType.MATCHES_100: {
        "name": "Leyenda",
        "name_en": "Legend",
        "name_zh": "传奇",
        "icon": "🎮",
        "description": "100 partidos jugados",
        "rarity": "epic"
    },
    BadgeType.FIRST_WIN: {
        "name": "Primera Victoria",
        "name_en": "First Win",
        "name_zh": "首胜",
        "icon": "🌟",
        "description": "Primera victoria en Super Pin",
        "rarity": "common"
    },
    BadgeType.PERFECT_SET: {
        "name": "Set Perfecto",
        "name_en": "Perfect Set",
        "name_zh": "完美一局",
        "icon": "💯",
        "description": "Ganar un set 11-0",
        "rarity": "rare"
    },
    BadgeType.COMEBACK_KING: {
        "name": "Rey de Remontadas",
        "name_en": "Comeback King",
        "name_zh": "逆转之王",
        "icon": "👑",
        "description": "Remontar estando 0-2 en sets",
        "rarity": "epic"
    }
}
