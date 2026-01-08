"""
Community Models - Posts, events, gallery models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class CommunityPostBase(BaseModel):
    """Model for community posts (news, announcements, events)"""
    tipo: str  # "noticia", "anuncio", "evento"
    titulo: str
    contenido: str  # Rich text content
    resumen: Optional[str] = None  # Short summary for cards
    imagen_url: Optional[str] = None
    imagen_galeria: Optional[List[str]] = None  # Multiple images
    video_url: Optional[str] = None
    # Event specific fields
    fecha_evento: Optional[datetime] = None
    lugar_evento: Optional[str] = None
    # Publishing
    publicado: bool = False
    destacado: bool = False  # Show in hero/featured section
    orden: int = 0
    fecha_publicacion: Optional[datetime] = None
    fecha_expiracion: Optional[datetime] = None
    # Metadata
    tags: Optional[List[str]] = None
    categoria: Optional[str] = None  # Category for filtering
    # Engagement
    permite_comentarios: bool = True
    # Source tracking
    fuente: Optional[str] = None  # "admin", "monday", "telegram"
    fuente_id: Optional[str] = None  # External ID reference


class CommunityPost(CommunityPostBase):
    """Full community post model"""
    model_config = ConfigDict(extra="ignore")
    post_id: str = Field(default_factory=lambda: f"post_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    creado_por: Optional[str] = None
    vistas: int = 0
    likes: int = 0


class CommunityComment(BaseModel):
    """Model for comments on community posts"""
    model_config = ConfigDict(extra="ignore")
    comment_id: str = Field(default_factory=lambda: f"comment_{uuid.uuid4().hex[:12]}")
    post_id: str
    usuario_id: Optional[str] = None
    nombre_usuario: str
    contenido: str
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    aprobado: bool = True  # For moderation
    likes: int = 0


class GalleryAlbum(BaseModel):
    """Model for photo/video gallery albums"""
    model_config = ConfigDict(extra="ignore")
    album_id: str = Field(default_factory=lambda: f"album_{uuid.uuid4().hex[:12]}")
    titulo: str
    descripcion: Optional[str] = None
    # Google Photos integration
    google_photos_url: Optional[str] = None  # Shared album URL
    google_photos_album_id: Optional[str] = None
    # Manual photos
    fotos: Optional[List[dict]] = None  # [{url, caption, fecha}]
    # Display
    imagen_portada: Optional[str] = None
    orden: int = 0
    activo: bool = True
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommunityEvent(BaseModel):
    """Model for community events (tournaments, meetings, etc.)"""
    model_config = ConfigDict(extra="ignore")
    evento_id: str = Field(default_factory=lambda: f"evento_{uuid.uuid4().hex[:12]}")
    titulo: str
    descripcion: Optional[str] = None
    tipo: str  # "torneo", "reunion", "social", "otro"
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    lugar: Optional[str] = None
    imagen_url: Optional[str] = None
    # Registration
    requiere_inscripcion: bool = False
    max_participantes: Optional[int] = None
    inscripciones: Optional[List[dict]] = None  # [{usuario_id, nombre, fecha}]
    # Status
    estado: str = "programado"  # "programado", "en_curso", "finalizado", "cancelado"
    destacado: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
