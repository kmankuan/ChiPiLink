"""
Admin Models - Notifications and configuration models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


class NotificacionCreate(BaseModel):
    """Notification creation model"""
    tipo: str  # pedido_nuevo, bajo_stock, matricula_nueva, etc.
    titulo: str
    mensaje: str
    datos: Optional[dict] = None


class Notificacion(NotificacionCreate):
    """Full notification model"""
    model_config = ConfigDict(extra="ignore")
    notificacion_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    leida: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ConfiguracionNotificaciones(BaseModel):
    """Notification preferences"""
    email_nuevos_pedidos: bool = True
    email_bajo_stock: bool = True
    email_nuevas_matriculas: bool = True
    telegram_activo: bool = False
    telegram_chat_id: Optional[str] = None


class CampoFormulario(BaseModel):
    """Form field configuration"""
    field_id: str
    tipo: str  # text, email, phone, select, checkbox, etc.
    etiqueta: str
    placeholder: Optional[str] = None
    obligatorio: bool = False
    options: Optional[List[str]] = None  # For select fields
    validacion: Optional[str] = None  # Regex pattern
    orden: int = 0
    activo: bool = True


class ConfiguracionFormulario(BaseModel):
    """Public form configuration"""
    model_config = ConfigDict(extra="ignore")
    form_id: str = "pedido_publico"
    nombre: str = "Formulario de Pedido"
    descripcion: Optional[str] = None
    campos: List[CampoFormulario] = []
    activo: bool = True
    mensaje_exito: str = "\u00a1Gracias por tu pedido!"
    redireccion_url: Optional[str] = None
