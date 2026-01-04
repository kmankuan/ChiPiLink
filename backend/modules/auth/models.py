"""
Auth Models - User authentication models
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


class ClienteBase(BaseModel):
    """Base client/user model"""
    email: EmailStr
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class ClienteCreate(ClienteBase):
    """Client creation model with password"""
    contrasena: str


class Cliente(ClienteBase):
    """Full client model with all fields"""
    model_config = ConfigDict(extra="ignore")
    cliente_id: str = Field(default_factory=lambda: f"cli_{uuid.uuid4().hex[:12]}")
    estudiantes: List[dict] = []
    es_admin: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    google_id: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    contrasena: str


class TokenResponse(BaseModel):
    """Token response model"""
    token: str
    cliente: dict
