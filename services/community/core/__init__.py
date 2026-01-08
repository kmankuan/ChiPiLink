"""
Core module - Shared components for ChiPi Link
"""
from .database import db, client, get_database
from .config import settings, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from .auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
    get_admin_user,
    get_optional_user,
    security
)

__all__ = [
    # Database
    "db",
    "client",
    "get_database",
    # Config
    "settings",
    "JWT_SECRET",
    "JWT_ALGORITHM",
    "JWT_EXPIRATION_HOURS",
    # Auth
    "hash_password",
    "verify_password",
    "create_token",
    "get_current_user",
    "get_admin_user",
    "get_optional_user",
    "security",
]
