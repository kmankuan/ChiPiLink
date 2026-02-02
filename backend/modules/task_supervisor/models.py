"""
Task Supervisor Models - Modelos para el Supervisor de Tareas
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone, time
import uuid


class TaskSupervisorConfig(BaseModel):
    """Configuración del Task Supervisor"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = "task_supervisor_main"
    # Monday.com Integration
    monday_board_id: Optional[str] = None  # Specific board for tasks
    monday_group_id: Optional[str] = None  # Grupo specific (opcional)
    # Voice Configuration
    tts_enabled: bool = True
    tts_provider: str = "openai"  # openai, elevenlabs, browser
    tts_voice: str = "nova"  # Child-friendly voice
    tts_language: str = "es"  # Idioma principal
    volumen: int = 80  # 0-100
    # Reminder Configuration
    recordatorios_activos: bool = True
    intervalo_recordatorio_minutos: int = 5
    max_recordatorios: int = 3
    # Gamification
    gamificacion_activa: bool = True
    puntos_por_tarea: int = 10
    puntos_bonus_tiempo: int = 5  # If finished before time
    # Display Configuration
    modo_pantalla: str = "kiosk"  # kiosk, normal, minimal
    mostrar_reloj: bool = True
    tema: str = "light"  # light, dark, colorful
    # Status
    activo: bool = False


class SupervisedPerson(BaseModel):
    """Persona supervisada (niño/estudiante)"""
    model_config = ConfigDict(extra="ignore")
    person_id: str = Field(default_factory=lambda: f"person_{uuid.uuid4().hex[:12]}")
    nombre: str
    apodo: Optional[str] = None  # Short name for announcements
    foto_url: Optional[str] = None
    tipo: str = "nino"  # nino, estudiante
    edad: Optional[int] = None
    # Monday.com link
    monday_user_id: Optional[str] = None
    monday_assignee_name: Optional[str] = None  # Name in Monday
    # Preferences
    voz_preferida: Optional[str] = None
    volumen_personalizado: Optional[int] = None
    horario_activo_inicio: Optional[time] = None
    horario_activo_fin: Optional[time] = None
    # Gamification
    puntos_totales: int = 0
    racha_dias: int = 0
    logros: List[str] = []
    # Status
    activo: bool = True
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class SupervisedTask(BaseModel):
    """Tarea supervisada (sincronizada con Monday.com)"""
    model_config = ConfigDict(extra="ignore")
    task_id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    monday_item_id: Optional[str] = None  # ID in Monday.com
    # Info
    titulo: str
    descripcion: Optional[str] = None
    instrucciones_voz: Optional[str] = None  # Text for TTS
    icono: Optional[str] = None
    color: Optional[str] = None
    # Asignación
    asignado_a: Optional[str] = None  # person_id
    asignado_nombre: Optional[str] = None
    # Tiempo
    duracion_estimada_minutos: int = 15
    hora_programada: Optional[datetime] = None
    fecha_limite: Optional[datetime] = None
    # Estado
    estado: str = "pendiente"  # pendiente, en_progreso, completada, vencida
    prioridad: str = "normal"  # baja, normal, alta, urgente
    # Progreso
    porcentaje_completado: int = 0
    fecha_inicio_real: Optional[datetime] = None
    fecha_fin_real: Optional[datetime] = None
    # Recordatorios
    recordatorios_enviados: int = 0
    ultimo_recordatorio: Optional[datetime] = None
    # Points
    puntos_otorgados: int = 0
    bonus_tiempo: bool = False
    # Sync
    ultima_sincronizacion: Optional[datetime] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VoiceAnnouncement(BaseModel):
    """Anuncio de voz programado o enviado"""
    model_config = ConfigDict(extra="ignore")
    announcement_id: str = Field(default_factory=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    # Contenido
    tipo: str  # tarea_nueva, recordatorio, felicitacion, alerta
    texto: str
    texto_ssml: Optional[str] = None  # Text with SSML markup
    audio_url: Optional[str] = None  # Audio generado
    # Target
    para_persona_id: Optional[str] = None  # None = todos
    para_persona_nombre: Optional[str] = None
    # Scheduling
    programado_para: Optional[datetime] = None
    # Status
    estado: str = "pendiente"  # pendiente, enviado, fallido
    enviado_en: Optional[datetime] = None
    reproducido: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DailyProgress(BaseModel):
    """Progreso diario de una persona"""
    model_config = ConfigDict(extra="ignore")
    progress_id: str = Field(default_factory=lambda: f"prog_{uuid.uuid4().hex[:12]}")
    person_id: str
    fecha: str  # YYYY-MM-DD
    # Tareas
    tareas_asignadas: int = 0
    tareas_completadas: int = 0
    tareas_a_tiempo: int = 0
    # Tiempo
    tiempo_total_minutos: int = 0
    tiempo_productivo_minutos: int = 0
    # Points
    puntos_ganados: int = 0
    # Detalle
    tareas_ids: List[str] = []  # Daily task IDs
