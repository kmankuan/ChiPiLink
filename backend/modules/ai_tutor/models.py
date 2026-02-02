"""
AI Tutor Models - Modelos para el Tutor Inteligente
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class TutorConfig(BaseModel):
    """Configuración del AI Tutor"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = "ai_tutor_main"
    # LLM Configuration
    llm_provider: str = "openai"  # openai, anthropic, google
    llm_model: str = "gpt-4o"  # Modelo a usar
    # Voice Configuration
    tts_provider: str = "openai"  # openai, elevenlabs, google
    tts_voice: str = "alloy"  # Voz para TTS
    stt_provider: str = "openai"  # openai, google, whisper
    # Tutor Personality
    nombre_tutor: str = "Profesora Ana"
    personalidad: str = "amigable"  # amigable, estricto, motivador
    idioma_principal: str = "es"  # Idioma del tutor
    # Settings
    activo: bool = False
    max_intentos_pronunciacion: int = 3
    umbral_pronunciacion_correcta: float = 0.8  # 80% de precisión


class TutorSession(BaseModel):
    """Sesión de tutoría"""
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: f"tutor_{uuid.uuid4().hex[:12]}")
    estudiante_id: str
    estudiante_nombre: Optional[str] = None
    # Tema de la sesión
    tema: str  # "vocabulario_ingles", "pronunciacion", "gramatica", etc.
    subtema: Optional[str] = None  # "colores", "números", etc.
    nivel: str = "basico"  # basico, intermedio, avanzado
    idioma_objetivo: str = "en"  # Idioma que está aprendiendo
    # Estado
    estado: str = "activa"  # activa, pausada, completada
    progreso: int = 0  # 0-100%
    # Contenido de la sesión
    items_total: int = 0
    items_completados: int = 0
    items_correctos: int = 0
    # Fechas
    fecha_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_fin: Optional[datetime] = None
    duracion_minutos: int = 0


class VocabularyItem(BaseModel):
    """Item de vocabulario para practicar"""
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"vocab_{uuid.uuid4().hex[:12]}")
    # Contenido
    palabra: str  # Palabra en idioma objetivo
    traduccion: str  # Traducción
    pronunciacion_fonetica: Optional[str] = None  # Guía fonética
    audio_url: Optional[str] = None  # Audio de pronunciación correcta
    imagen_url: Optional[str] = None  # Imagen ilustrativa
    ejemplo_oracion: Optional[str] = None
    # Categorización
    categoria: Optional[str] = None  # colores, animales, números, etc.
    nivel: str = "basico"
    idioma_origen: str = "es"
    idioma_destino: str = "en"


class PronunciationAttempt(BaseModel):
    """Intento de pronunciación del estudiante"""
    model_config = ConfigDict(extra="ignore")
    attempt_id: str = Field(default_factory=lambda: f"pron_{uuid.uuid4().hex[:12]}")
    session_id: str
    estudiante_id: str
    item_id: str
    # Audio del estudiante
    audio_estudiante_url: Optional[str] = None
    texto_esperado: str
    texto_reconocido: Optional[str] = None  # Lo que el STT reconoció
    # Evaluación
    score: float = 0.0  # 0.0 a 1.0
    es_correcto: bool = False
    feedback: Optional[str] = None  # Feedback del tutor
    # Metadata
    intento_numero: int = 1
    fecha: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LessonPlan(BaseModel):
    """Plan de lección generado por el tutor"""
    model_config = ConfigDict(extra="ignore")
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:12]}")
    estudiante_id: str
    # Contenido
    titulo: str
    descripcion: Optional[str] = None
    tema: str
    nivel: str
    idioma: str
    # Items del plan
    items: List[str] = []  # Lista de item_ids
    duracion_estimada_minutos: int = 15
    # Estado
    completado: bool = False
    progreso: int = 0
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_completado: Optional[datetime] = None


class StudentProgress(BaseModel):
    """Progreso del estudiante en el tutor"""
    model_config = ConfigDict(extra="ignore")
    estudiante_id: str
    # Estadísticas generales
    total_sesiones: int = 0
    total_minutos: int = 0
    palabras_aprendidas: int = 0
    palabras_dominadas: int = 0
    # By idioma
    progreso_por_idioma: Dict[str, Dict] = {}  # {"en": {"nivel": "basico", "palabras": 50}}
    # Racha
    racha_dias: int = 0
    mejor_racha: int = 0
    ultima_sesion: Optional[datetime] = None
    # Achievements
    logros: List[str] = []
