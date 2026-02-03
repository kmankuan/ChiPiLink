"""
CXGenie Models - Modelos para Chat Support
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, timezone
import uuid


class CXGenieConfig(BaseModel):
    """Configuration de CXGenie"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = "cxgenie_main"
    # Widget Configuration
    widget_id: Optional[str] = None  # ID ofl widget de CXGenie
    widget_script_url: Optional[str] = None  # URL del script
    embed_code: Optional[str] = None  # Code de embed completo
    # API Configuration (para panel de agentes)
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    # Customization
    color_primario: str = "#16a34a"
    posicion: str = "bottom-right"  # bottom-right, bottom-left
    mensaje_bienvenida: Optional[str] = None
    # Status
    active: bool = False
    modo: str = "widget"  # widget, api, ambos
    fecha_configuracion: Optional[datetime] = None


class ChatConversation(BaseModel):
    """Conversation de chat (cache local)"""
    model_config = ConfigDict(extra="ignore")
    conversation_id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:12]}")
    cxgenie_conversation_id: Optional[str] = None  # ID en CXGenie
    # Participantes
    user_id: Optional[str] = None
    cliente_name: Optional[str] = None
    cliente_email: Optional[str] = None
    agente_id: Optional[str] = None
    agente_name: Optional[str] = None
    # Estado
    estado: str = "abierta"  # abierta, en_progreso, cerrada
    canal: str = "web"  # web, whatsapp, telegram, etc.
    # Metadata
    tags: List[str] = []
    notas: Optional[str] = None
    satisfaccion: Optional[int] = None  # 1-5
    # Fechas
    fecha_inicio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_ultima_actividad: Optional[datetime] = None
    fecha_cierre: Optional[datetime] = None


class ChatMessage(BaseModel):
    """Mensaje de chat (cache local)"""
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    conversation_id: str
    # Contenido
    contenido: str
    tipo: str = "texto"  # texto, imagen, archivo, sistema
    archivo_url: Optional[str] = None
    # Remitente
    remitente_tipo: str  # cliente, agente, bot
    remitente_id: Optional[str] = None
    remitente_name: Optional[str] = None
    # Estado
    leido: bool = False
    fecha_envio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
