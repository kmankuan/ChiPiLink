"""
Roles Module
Sistema de roles y permisos para la plataforma
"""
from .models import (
    Role, RoleCreate, RoleUpdate,
    DefaultRoles, DEFAULT_ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS
)
from .service import roles_service
from .routes import router

__all__ = [
    "Role", "RoleCreate", "RoleUpdate",
    "DefaultRoles", "DEFAULT_ROLE_PERMISSIONS", "AVAILABLE_PERMISSIONS",
    "roles_service", "router"
]
