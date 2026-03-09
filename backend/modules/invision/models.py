"""
Invision Models - Models for Invisionpower Suite integration
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


class InvisionConfig(BaseModel):
    """Configuration for Invision integration"""
    model_config = ConfigDict(extra="ignore")
    config_id: str = "invision_main"
    # API Configuration
    api_url: str = ""  # e.g., https://laopan.online/api/
    api_key: Optional[str] = None
    # OAuth Configuration
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None
    oauth_redirect_uri: Optional[str] = None
    # Settings
    sync_enabled: bool = False
    sync_interval_minutes: int = 30
    # Status
    last_sync: Optional[datetime] = None
    status: str = "not_configured"  # not_configured, active, error
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvisionPost(BaseModel):
    """Cached post from Invision"""
    model_config = ConfigDict(extra="ignore")
    local_id: str = Field(default_factory=lambda: f"ips_post_{uuid.uuid4().hex[:12]}")
    invision_id: str  # Original ID from Invision
    forum_id: Optional[str] = None
    # Content
    titulo: str
    contenido: Optional[str] = None
    resumen: Optional[str] = None
    autor: Optional[str] = None
    autor_avatar: Optional[str] = None
    # Metadata
    fecha_publicacion: Optional[datetime] = None
    fecha_modificacion: Optional[datetime] = None
    url_original: Optional[str] = None
    # Cache info
    fecha_cache: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class InvisionUser(BaseModel):
    """Linked Invision user"""
    model_config = ConfigDict(extra="ignore")
    user_id: str  # ChiPi Link user ID
    invision_user_id: str  # Invision user ID
    invision_username: Optional[str] = None
    invision_email: Optional[str] = None
    linked_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_sync: Optional[datetime] = None
