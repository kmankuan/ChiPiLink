"""
FuseBase Models - Modelos para integration con FuseBase
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


class FuseBaseConfig(BaseModel):
    """Configuration de FuseBase"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = "fusebase_main"
    # API Configuration
    api_url: Optional[str] = None
    api_key: Optional[str] = None
    workspace_id: Optional[str] = None
    # Embed Configuration
    embed_enabled: bool = False
    embed_url: Optional[str] = None  # URL de workspace para embed
    # Customization
    tema: str = "light"  # light, dark, auto
    mostrar_navegacion: bool = True
    # Status
    active: bool = False
    fecha_configuracion: Optional[datetime] = None


class FuseBaseDocument(BaseModel):
    """Referencia a documento de FuseBase (cache local)"""
    model_config = ConfigDict(extra="ignore")
    local_id: str = Field(default_factory=lambda: f"doc_{uuid.uuid4().hex[:12]}")
    fusebase_id: str  # ID ofl documento en FuseBase
    # Info
    titulo: str
    description: Optional[str] = None
    tipo: str = "documento"  # documento, wiki, nota, tarea
    url_embed: Optional[str] = None
    url_directo: Optional[str] = None
    # Classification local
    categoria: Optional[str] = None
    tags: List[str] = []
    publico: bool = False  # Visible para todos o solo admin
    orden: int = 0
    # Cache
    fecha_cache: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FuseBaseCategory(BaseModel):
    """Category para organizar documentos"""
    model_config = ConfigDict(extra="ignore")
    category_id: str = Field(default_factory=lambda: f"fb_cat_{uuid.uuid4().hex[:8]}")
    name: str
    description: Optional[str] = None
    icono: Optional[str] = None
    orden: int = 0
    active: bool = True
