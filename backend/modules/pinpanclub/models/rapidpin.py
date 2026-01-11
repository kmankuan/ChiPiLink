"""
Rapid Pin - Modelos
Sistema de partidos espontáneos sin organización
2 jugadores + 1 árbitro = Partido válido
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class RapidPinMatchStatus(str, Enum):
    """Estado del partido Rapid Pin"""
    PENDING = "pending"          # Registrado, esperando confirmación
    VALIDATED = "validated"      # Confirmado por otra persona
    DISPUTED = "disputed"        # En disputa
    CANCELLED = "cancelled"      # Cancelado


class RapidPinSeasonStatus(str, Enum):
    """Estado de la temporada"""
    ACTIVE = "active"            # Temporada activa
    CLOSED = "closed"            # Temporada cerrada (ranking fijo)
    ARCHIVED = "archived"        # Archivada


class RapidPinRole(str, Enum):
    """Rol en un partido Rapid Pin"""
    PLAYER = "player"            # Jugador
    REFEREE = "referee"          # Árbitro


class RapidPinQueueStatus(str, Enum):
    """Estado de la cola de partidos esperando árbitro"""
    WAITING = "waiting"          # Esperando árbitro
    ASSIGNED = "assigned"        # Árbitro asignado, partido en curso
    COMPLETED = "completed"      # Partido completado
    CANCELLED = "cancelled"      # Cancelado


# ============== SCORING CONSTANTS ==============

RAPID_PIN_SCORING = {
    "victory": 3,    # Puntos por victoria
    "defeat": 1,     # Puntos por derrota
    "referee": 2     # Puntos por arbitrar
}


# ============== PRIZE CONFIGURATION ==============

class RapidPinPrize(BaseModel):
    """Premio configurable para Rapid Pin"""
    prize_id: str = Field(default_factory=lambda: f"prize_{uuid.uuid4().hex[:8]}")
    position: Optional[int] = None  # 1, 2, 3... o None para premios especiales
    role: str = "player"            # "player" o "referee"
    name: str
    description: Optional[str] = None
    icon: str = "🏆"
    special_type: Optional[str] = None  # "participation", "most_refereed", etc.


# ============== SEASON MODEL ==============

class RapidPinSeasonCreate(BaseModel):
    """Crear temporada Rapid Pin"""
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: str  # ISO format
    fecha_fin: str     # ISO format - fecha tope para cerrar ranking
    
    # Premios configurables
    player_prizes: Optional[List[RapidPinPrize]] = None
    referee_prizes: Optional[List[RapidPinPrize]] = None


class RapidPinSeasonUpdate(BaseModel):
    """Actualizar temporada"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_fin: Optional[str] = None
    estado: Optional[RapidPinSeasonStatus] = None
    player_prizes: Optional[List[RapidPinPrize]] = None
    referee_prizes: Optional[List[RapidPinPrize]] = None


class RapidPinSeason(BaseModel):
    """Temporada Rapid Pin completa"""
    model_config = ConfigDict(from_attributes=True)
    
    season_id: str
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: str
    fecha_fin: str
    estado: RapidPinSeasonStatus = RapidPinSeasonStatus.ACTIVE
    
    # Premios
    player_prizes: List[RapidPinPrize] = []
    referee_prizes: List[RapidPinPrize] = []
    
    # Estadísticas
    total_matches: int = 0
    total_players: int = 0
    total_referees: int = 0
    
    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    closed_at: Optional[Any] = None


# ============== MATCH MODEL ==============

class RapidPinMatchCreate(BaseModel):
    """Registrar partido Rapid Pin"""
    season_id: str
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: str
    
    # Resultado
    ganador_id: str  # ID del ganador (jugador_a o jugador_b)
    score_ganador: int = 11  # Puntos del ganador
    score_perdedor: int = 0  # Puntos del perdedor
    
    # Quién registra el partido
    registrado_por_id: str  # Uno de los 3 participantes
    
    # Notas opcionales
    notas: Optional[str] = None


class RapidPinMatch(BaseModel):
    """Partido Rapid Pin completo"""
    model_config = ConfigDict(from_attributes=True)
    
    match_id: str
    season_id: str
    
    # Participantes
    jugador_a_id: str
    jugador_b_id: str
    arbitro_id: str
    
    # Info de participantes (cached)
    jugador_a_info: Optional[Dict] = None
    jugador_b_info: Optional[Dict] = None
    arbitro_info: Optional[Dict] = None
    
    # Resultado
    ganador_id: str
    perdedor_id: str
    score_ganador: int
    score_perdedor: int
    
    # Estado de validación
    estado: RapidPinMatchStatus = RapidPinMatchStatus.PENDING
    registrado_por_id: str
    confirmado_por_id: Optional[str] = None  # Segunda persona que confirma
    
    # Puntos otorgados (solo cuando está validado)
    puntos_ganador: int = 0
    puntos_perdedor: int = 0
    puntos_arbitro: int = 0
    
    # Notas
    notas: Optional[str] = None
    
    # Timestamps
    fecha_partido: Optional[Any] = None
    fecha_confirmacion: Optional[Any] = None
    created_at: Optional[Any] = None


# ============== RANKING MODEL ==============

class RapidPinRankingEntry(BaseModel):
    """Entrada en el ranking Rapid Pin"""
    model_config = ConfigDict(from_attributes=True)
    
    ranking_id: str
    season_id: str
    jugador_id: str
    
    # Posición
    posicion: int = 0
    
    # Puntos totales (victorias + derrotas + arbitrajes)
    puntos_totales: int = 0
    
    # Estadísticas como jugador
    partidos_jugados: int = 0
    partidos_ganados: int = 0
    partidos_perdidos: int = 0
    puntos_como_jugador: int = 0  # Solo victorias + derrotas
    
    # Estadísticas como árbitro
    partidos_arbitrados: int = 0
    puntos_como_arbitro: int = 0
    
    # Info del jugador
    jugador_info: Optional[Dict] = None
    
    # Timestamps
    last_activity: Optional[Any] = None
    updated_at: Optional[Any] = None


class RapidPinRankingTable(BaseModel):
    """Tabla de ranking completa"""
    season_id: str
    season_nombre: str
    estado: RapidPinSeasonStatus
    fecha_fin: str
    total_participantes: int
    total_partidos: int
    entries: List[RapidPinRankingEntry]
    last_updated: Optional[Any] = None


# ============== SEASON RESULTS ==============

class RapidPinSeasonResult(BaseModel):
    """Resultado final de temporada"""
    jugador_id: str
    jugador_info: Optional[Dict] = None
    posicion_final: int
    puntos_finales: int
    role: str  # "player" o "referee"
    prize: Optional[RapidPinPrize] = None


class RapidPinSeasonFinalResults(BaseModel):
    """Resultados finales de una temporada cerrada"""
    season_id: str
    season_nombre: str
    fecha_cierre: str
    player_results: List[RapidPinSeasonResult] = []
    referee_results: List[RapidPinSeasonResult] = []
    total_matches: int = 0


# ============== DEFAULT PRIZES ==============

def get_default_player_prizes() -> List[RapidPinPrize]:
    """Premios por defecto para jugadores"""
    return [
        RapidPinPrize(
            position=1,
            role="player",
            name="Campeón Rapid Pin",
            description="Primer lugar en el ranking de jugadores",
            icon="🥇"
        ),
        RapidPinPrize(
            position=2,
            role="player",
            name="Subcampeón Rapid Pin",
            description="Segundo lugar en el ranking de jugadores",
            icon="🥈"
        ),
        RapidPinPrize(
            position=3,
            role="player",
            name="Tercer Lugar",
            description="Tercer lugar en el ranking de jugadores",
            icon="🥉"
        ),
        RapidPinPrize(
            position=None,
            role="player",
            name="Participante Rapid Pin",
            description="Premio por participación",
            icon="🏓",
            special_type="participation"
        )
    ]


def get_default_referee_prizes() -> List[RapidPinPrize]:
    """Premios por defecto para árbitros"""
    return [
        RapidPinPrize(
            position=1,
            role="referee",
            name="Mejor Árbitro",
            description="Más partidos arbitrados en la temporada",
            icon="⚖️"
        ),
        RapidPinPrize(
            position=None,
            role="referee",
            name="Árbitro Participante",
            description="Premio por colaborar como árbitro",
            icon="👨‍⚖️",
            special_type="participation"
        )
    ]


# ============== MATCH QUEUE (Waiting for Referee) ==============

class RapidPinMatchQueueCreate(BaseModel):
    """Crear partido en cola esperando árbitro"""
    season_id: str
    player1_id: str
    player2_id: str
    created_by_id: str
    notes: Optional[str] = None  # Notas opcionales (ubicación, etc.)


class RapidPinMatchQueue(BaseModel):
    """Partido en cola esperando árbitro"""
    model_config = ConfigDict(from_attributes=True)
    
    queue_id: str = Field(default_factory=lambda: f"queue_{uuid.uuid4().hex[:12]}")
    season_id: str
    
    # Jugadores
    player1_id: str
    player2_id: str
    player1_info: Optional[Dict] = None
    player2_info: Optional[Dict] = None
    
    # Árbitro (cuando se asigne)
    referee_id: Optional[str] = None
    referee_info: Optional[Dict] = None
    
    # Estado
    status: RapidPinQueueStatus = RapidPinQueueStatus.WAITING
    
    # Timestamps
    created_at: Optional[Any] = None
    created_by_id: str = ""
    assigned_at: Optional[Any] = None
    completed_at: Optional[Any] = None
    
    # Notas
    notes: Optional[str] = None
    
    # Match ID cuando se complete
    match_id: Optional[str] = None


class RapidPinQueueAssign(BaseModel):
    """Asignar árbitro a partido en cola"""
    referee_id: str


class RapidPinQueueComplete(BaseModel):
    """Completar partido de la cola con resultado"""
    ganador_id: str
    score_ganador: int = 11
    score_perdedor: int = 0

