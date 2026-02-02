"""
Content Hub Models - Modelos para Curación de Contenido
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class ContentSource(BaseModel):
    """Fuente de contenido (red social)"""
    source_id: str
    nombre: str  # YouTube, Instagram, TikTok, WeChat, Xiaohongshu, etc.
    icono: Optional[str] = None
    color: Optional[str] = None  # Brand color
    activo: bool = True


class ContentCategory(BaseModel):
    """Categoría de contenido por audiencia"""
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:8]}")
    nombre: str  # Kids, Parents, Local Culture, Chinese Culture, etc.
    nombre_en: Optional[str] = None
    nombre_zh: Optional[str] = None
    descripcion: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None
    orden: int = 0
    activo: bool = True


class ContentTag(BaseModel):
    """Etiqueta para contenido"""
    tag_id: str = Field(default_factory=lambda: f"tag_{uuid.uuid4().hex[:8]}")
    nombre: str
    color: Optional[str] = None


class ContentItemBase(BaseModel):
    """Modelo base de contenido curado"""
    # Information básica
    titulo: str
    descripcion: Optional[str] = None
    # Fuente original
    source: str  # youtube, instagram, tiktok, wechat, xiaohongshu, telegram, facebook
    url_original: str  # Original content URL
    # Contenido embebido
    embed_url: Optional[str] = None  # URL for embed (if applicable)
    embed_code: Optional[str] = None  # HTML embed code
    thumbnail_url: Optional[str] = None  # Preview image
    # Clasificación
    categorias: List[str] = []  # Category IDs (audiences)
    tags: List[str] = []  # Etiquetas adicionales
    # Original content metadata
    autor_original: Optional[str] = None
    fecha_publicacion_original: Optional[datetime] = None
    duracion_segundos: Optional[int] = None  # For videos
    idioma: Optional[str] = None  # es, zh, en
    # Estado
    publicado: bool = True
    destacado: bool = False
    orden: int = 0


class ContentItem(ContentItemBase):
    """Modelo completo de contenido"""
    model_config = ConfigDict(extra="ignore")
    content_id: str = Field(default_factory=lambda: f"content_{uuid.uuid4().hex[:12]}")
    # Engagement
    vistas: int = 0
    likes: int = 0
    compartidos: int = 0
    # Curación
    curado_por: Optional[str] = None  # admin que lo agregó
    notas_curador: Optional[str] = None  # Notas internas
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_actualizacion: Optional[datetime] = None


class ContentPlaylist(BaseModel):
    """Playlist/Colección de contenido"""
    model_config = ConfigDict(extra="ignore")
    playlist_id: str = Field(default_factory=lambda: f"playlist_{uuid.uuid4().hex[:12]}")
    titulo: str
    descripcion: Optional[str] = None
    imagen_portada: Optional[str] = None
    categoria_id: Optional[str] = None  # Categoría principal
    items: List[str] = []  # List of content_ids
    publicada: bool = True
    orden: int = 0
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
