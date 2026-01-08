"""
Auth Module - Models/Schemas
Definición de schemas Pydantic para autenticación
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== USER/CLIENT MODELS ==============

class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[Any] = None  # Can be str, dict, or None


class UserCreate(UserBase):
    """User creation model with password"""
    contrasena: str


class UserUpdate(BaseModel):
    """User update model"""
    nombre: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None


class User(UserBase):
    """Full user model"""
    model_config = ConfigDict(from_attributes=True)
    
    cliente_id: str
    estudiantes: List[Dict] = []
    es_admin: bool = False
    google_id: Optional[str] = None
    fecha_creacion: Optional[Any] = None
    activo: Optional[bool] = True
    ultimo_login: Optional[str] = None


# ============== AUTH MODELS ==============

class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    contrasena: str


class TokenResponse(BaseModel):
    """Token response model"""
    token: str
    cliente: Dict


class SessionData(BaseModel):
    """Session data model"""
    session_token: str
    cliente: Dict


# ============== SESSION MODELS ==============

class Session(BaseModel):
    """Session model"""
    model_config = ConfigDict(from_attributes=True)
    
    session_id: str
    cliente_id: str
    session_token: str
    expires_at: Any
    created_at: Optional[Any] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


# ============== PASSWORD RESET MODELS ==============

class PasswordResetRequest(BaseModel):
    """Password reset request model"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation model"""
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    """Change password request model"""
    current_password: str
    new_password: str
