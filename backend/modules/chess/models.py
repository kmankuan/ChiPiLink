"""
Chess Models - Modelos para el Club de Ajedrez
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class ChessPlayerBase(BaseModel):
    """Modelo base de jugador de ajedrez"""
    nombre: str
    apellido: Optional[str] = None
    apodo: Optional[str] = None
    foto_url: Optional[str] = None
    nivel: str = "principiante"  # principiante, intermedio, avanzado, maestro
    estilo_juego: Optional[str] = None  # agresivo, posicional, tactico, defensivo
    aperturas_favoritas: Optional[List[str]] = None  # Siciliana, Española, etc.
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool = True


class ChessPlayer(ChessPlayerBase):
    """Modelo completo de jugador"""
    model_config = ConfigDict(extra="ignore")
    jugador_id: str = Field(default_factory=lambda: f"chess_{uuid.uuid4().hex[:12]}")
    # Statistics
    partidas_jugadas: int = 0
    partidas_ganadas: int = 0
    partidas_perdidas: int = 0
    partidas_tablas: int = 0
    elo_rating: int = 1200  # Rating ELO estándar de ajedrez
    elo_maximo: int = 1200
    racha_actual: int = 0
    mejor_racha: int = 0
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChessGameBase(BaseModel):
    """Modelo base de partida de ajedrez"""
    torneo_id: Optional[str] = None
    jugador_blancas_id: str
    jugador_negras_id: str
    control_tiempo: str = "10+0"  # Formato: minutos+incremento (10+0, 5+3, 3+2, etc.)
    tipo_partida: str = "rapida"  # bullet, blitz, rapida, clasica
    ronda: Optional[str] = None
    mesa: Optional[str] = None


class ChessGame(ChessGameBase):
    """Modelo completo de partida"""
    model_config = ConfigDict(extra="ignore")
    partida_id: str = Field(default_factory=lambda: f"game_{uuid.uuid4().hex[:12]}")
    estado: str = "pendiente"  # pendiente, en_curso, finalizada, abandonada
    # Result
    resultado: Optional[str] = None  # "1-0", "0-1", "1/2-1/2", None
    ganador_id: Optional[str] = None
    razon_fin: Optional[str] = None  # jaque_mate, abandono, tiempo, tablas_acuerdo, etc.
    # Movimientos en notación algebraica
    pgn: Optional[str] = None  # Notación PGN completa
    movimientos: List[str] = []  # Lista de movimientos
    posicion_actual: Optional[str] = None  # FEN de posición actual
    # Tiempos
    tiempo_blancas_ms: int = 600000  # Tiempo restante en milisegundos
    tiempo_negras_ms: int = 600000
    turno: str = "blancas"  # blancas o negras
    # Fechas
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChessTournament(BaseModel):
    """Modelo de torneo de ajedrez"""
    model_config = ConfigDict(extra="ignore")
    torneo_id: str = Field(default_factory=lambda: f"torneo_chess_{uuid.uuid4().hex[:12]}")
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    lugar: Optional[str] = None
    formato: str = "suizo"  # suizo, eliminacion, round_robin, arena
    control_tiempo: str = "10+0"
    rondas: int = 5
    max_participantes: Optional[int] = None
    premio: Optional[str] = None
    imagen_url: Optional[str] = None
    estado: str = "inscripcion"  # inscripcion, en_curso, finalizado, cancelado
    participantes: List[str] = []
    clasificacion: List[Dict] = []  # [{jugador_id, puntos, desempate}]
    ganador_id: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ChessPuzzle(BaseModel):
    """Modelo de problema/puzzle de ajedrez"""
    model_config = ConfigDict(extra="ignore")
    puzzle_id: str = Field(default_factory=lambda: f"puzzle_{uuid.uuid4().hex[:12]}")
    titulo: Optional[str] = None
    fen: str  # Posición inicial en FEN
    solucion: List[str]  # Movimientos correctos
    dificultad: str = "medio"  # facil, medio, dificil, experto
    tema: Optional[str] = None  # mate_en_2, tactica, final, etc.
    rating: int = 1500  # Rating del puzzle
    intentos: int = 0
    resueltos: int = 0
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
