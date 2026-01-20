"""
Auth Module - Models/Schemas
Pydantic schemas for authentication
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== USER MODELS ==============

class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address: Optional[Any] = None  # Can be str, dict, or None


class UserCreate(UserBase):
    """User creation model with password"""
    password: str


class UserUpdate(BaseModel):
    """User update model"""
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class User(UserBase):
    """Full user model"""
    model_config = ConfigDict(from_attributes=True)
    
    user_id: str
    students: List[Dict] = []
    is_admin: bool = False
    google_id: Optional[str] = None
    created_at: Optional[Any] = None
    is_active: Optional[bool] = True
    last_login: Optional[str] = None


# ============== AUTH MODELS ==============

class LoginRequest(BaseModel):
    """Login request model"""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Token response model"""
    token: str
    user: Dict


class SessionData(BaseModel):
    """Session data model"""
    session_token: str
    user: Dict


# ============== SESSION MODELS ==============

class Session(BaseModel):
    """Session model"""
    model_config = ConfigDict(from_attributes=True)
    
    session_id: str
    user_id: str
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


# ============== LEGACY COMPATIBILITY ==============
# These aliases ensure backward compatibility with existing code
# TODO: Remove after full migration

class LegacyLoginRequest(BaseModel):
    """Legacy login request with Spanish field names"""
    email: EmailStr
    contrasena: str  # Maps to password


class LegacyUserCreate(BaseModel):
    """Legacy user creation with Spanish field names"""
    email: EmailStr
    nombre: str  # Maps to name
    contrasena: str  # Maps to password
    telefono: Optional[str] = None
    direccion: Optional[Any] = None
