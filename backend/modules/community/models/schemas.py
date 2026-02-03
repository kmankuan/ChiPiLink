"""
Community Module - Models/Schemas
Definition de schemas Pydantic para comunidad
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class PostType(str, Enum):
    NOTICIA = "noticia"
    ANUNCIO = "anuncio"
    EVENTO = "evento"


class EventStatus(str, Enum):
    PROGRAMADO = "programado"
    EN_CURSO = "en_curso"
    FINALIZADO = "finalizado"
    CANCELADO = "cancelado"


class EventType(str, Enum):
    TORNEO = "torneo"
    REUNION = "reunion"
    SOCIAL = "social"
    OTRO = "otro"


# ============== POST MODELS ==============

class PostBase(BaseModel):
    """Base post model"""
    tipo: str
    titulo: str
    contenido: str
    resumen: Optional[str] = None
    image_url: Optional[str] = None
    imagen_galeria: Optional[List[str]] = None
    video_url: Optional[str] = None
    fecha_evento: Optional[Any] = None
    lugar_evento: Optional[str] = None
    publicado: bool = False
    featured: bool = False
    orden: int = 0
    fecha_expiracion: Optional[Any] = None
    tags: Optional[List[str]] = None
    categoria: Optional[str] = None
    permite_comentarios: bool = True


class PostCreate(PostBase):
    """Post creation model"""
    pass


class PostUpdate(BaseModel):
    """Post update model"""
    tipo: Optional[str] = None
    titulo: Optional[str] = None
    contenido: Optional[str] = None
    resumen: Optional[str] = None
    image_url: Optional[str] = None
    imagen_galeria: Optional[List[str]] = None
    video_url: Optional[str] = None
    fecha_evento: Optional[Any] = None
    lugar_evento: Optional[str] = None
    publicado: Optional[bool] = None
    featured: Optional[bool] = None
    orden: Optional[int] = None
    fecha_expiracion: Optional[Any] = None
    tags: Optional[List[str]] = None
    categoria: Optional[str] = None
    permite_comentarios: Optional[bool] = None


class Post(PostBase):
    """Full post model"""
    model_config = ConfigDict(from_attributes=True)
    
    post_id: str
    created_at: Optional[Any] = None
    fecha_publicacion: Optional[Any] = None
    creado_por: Optional[str] = None
    fuente: Optional[str] = None
    fuente_id: Optional[str] = None
    vistas: int = 0
    likes: int = 0


# ============== COMMENT MODELS ==============

class CommentBase(BaseModel):
    """Base comment model"""
    contenido: str
    nombre_usuario: Optional[str] = None


class CommentCreate(CommentBase):
    """Comment creation model"""
    pass


class Comment(CommentBase):
    """Full comment model"""
    model_config = ConfigDict(from_attributes=True)
    
    comment_id: str
    post_id: str
    usuario_id: Optional[str] = None
    created_at: Optional[Any] = None
    aprobado: bool = True
    likes: int = 0


# ============== EVENT MODELS ==============

class EventBase(BaseModel):
    """Base event model"""
    titulo: str
    description: Optional[str] = None
    tipo: str = "otro"
    fecha_inicio: Any
    fecha_fin: Optional[Any] = None
    lugar: Optional[str] = None
    image_url: Optional[str] = None
    requiere_inscripcion: bool = False
    max_participantes: Optional[int] = None
    featured: bool = False


class EventCreate(EventBase):
    """Event creation model"""
    pass


class EventUpdate(BaseModel):
    """Event update model"""
    titulo: Optional[str] = None
    description: Optional[str] = None
    tipo: Optional[str] = None
    fecha_inicio: Optional[Any] = None
    fecha_fin: Optional[Any] = None
    lugar: Optional[str] = None
    image_url: Optional[str] = None
    requiere_inscripcion: Optional[bool] = None
    max_participantes: Optional[int] = None
    featured: Optional[bool] = None
    estado: Optional[str] = None


class Event(EventBase):
    """Full event model"""
    model_config = ConfigDict(from_attributes=True)
    
    evento_id: str
    estado: str = "programado"
    inscripciones: List[Dict] = []
    created_at: Optional[Any] = None


# ============== GALLERY/ALBUM MODELS ==============

class AlbumBase(BaseModel):
    """Base album model"""
    titulo: str
    description: Optional[str] = None
    google_photos_url: Optional[str] = None
    google_photos_album_id: Optional[str] = None
    fotos: Optional[List[Dict]] = None
    imagen_portada: Optional[str] = None
    orden: int = 0
    active: bool = True


class AlbumCreate(AlbumBase):
    """Album creation model"""
    pass


class AlbumUpdate(BaseModel):
    """Album update model"""
    titulo: Optional[str] = None
    description: Optional[str] = None
    google_photos_url: Optional[str] = None
    google_photos_album_id: Optional[str] = None
    fotos: Optional[List[Dict]] = None
    imagen_portada: Optional[str] = None
    orden: Optional[int] = None
    active: Optional[bool] = None


class Album(AlbumBase):
    """Full album model"""
    model_config = ConfigDict(from_attributes=True)
    
    album_id: str
    created_at: Optional[Any] = None
