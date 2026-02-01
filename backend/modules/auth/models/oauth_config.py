"""
LaoPan OAuth Configuration Models
Models for Invision Community OAuth 2.0 integration
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class OAuthProviderConfig(BaseModel):
    """OAuth provider configuration"""
    provider_id: str = "laopan"
    provider_name: str = "LaoPan.online"
    enabled: bool = True
    client_id: str
    client_secret: str
    authorize_url: str = "https://laopan.online/oauth/authorize/"
    token_url: str = "https://laopan.online/oauth/token/"
    userinfo_url: str = "https://laopan.online/api/core/me"
    redirect_uri: str
    scopes: List[str] = ["profile", "email"]
    # UI Configuration
    button_text: str = "Sign in with LaoPan"
    button_text_es: str = "Iniciar sesión con LaoPan"
    button_text_zh: str = "使用LaoPan登录"
    button_color: str = "#4F46E5"  # Indigo
    button_icon: Optional[str] = None
    # Data mapping
    user_id_field: str = "id"
    email_field: str = "email"
    name_field: str = "name"
    additional_fields: List[str] = ["title", "timezone", "primaryGroup"]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class OAuthConfigUpdate(BaseModel):
    """Request to update OAuth configuration"""
    enabled: Optional[bool] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    authorize_url: Optional[str] = None
    token_url: Optional[str] = None
    userinfo_url: Optional[str] = None
    scopes: Optional[List[str]] = None
    button_text: Optional[str] = None
    button_text_es: Optional[str] = None
    button_text_zh: Optional[str] = None
    button_color: Optional[str] = None
    user_id_field: Optional[str] = None
    email_field: Optional[str] = None
    name_field: Optional[str] = None
    additional_fields: Optional[List[str]] = None


class OAuthTokenData(BaseModel):
    """OAuth token data from provider"""
    access_token: str
    token_type: str = "Bearer"
    expires_in: Optional[int] = None
    refresh_token: Optional[str] = None
    scope: Optional[str] = None


class LaoPanUserInfo(BaseModel):
    """User info from LaoPan OAuth"""
    id: int
    email: str
    name: str
    title: Optional[str] = None
    timezone: Optional[str] = None
    primaryGroup: Optional[dict] = None
    photoUrl: Optional[str] = None
