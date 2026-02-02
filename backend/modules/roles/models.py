"""
Roles Module - Models and Schemas
System for roles y permisos para la plataforma
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class DefaultRoles(str, Enum):
    """Roles predeterminados del sistema"""
    SUPER_ADMIN = "super_admin"
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"


# Permissions disponibles en el sistema organizados por módulo
AVAILABLE_PERMISSIONS = {
    # Administración general
    "admin": {
        "access": "Acceder al panel de administración",
        "dashboard": "Ver dashboard de administración",
        "site_config": "Configurar sitio web",
        "landing_editor": "Editar landing page",
    },
    
    # Management of usuarios
    "users": {
        "view": "Ver lista de usuarios",
        "create": "Crear usuarios",
        "edit": "Editar usuarios",
        "delete": "Eliminar usuarios",
        "assign_roles": "Asignar roles a usuarios",
        "manage_memberships": "Gestionar membresías",
    },
    
    # Roles y permisos
    "roles": {
        "view": "Ver roles y permisos",
        "create": "Crear roles",
        "edit": "Editar roles",
        "delete": "Eliminar roles",
        "assign_permissions": "Asignar permisos",
    },
    
    # Unatienda
    "unatienda": {
        "access": "Acceder a Unatienda",
        "view_public_catalog": "Ver catálogo público",
        "view_private_catalog": "Ver catálogo privado PCA",
        "manage_products": "Gestionar productos",
        "manage_categories": "Gestionar categorías",
        "manage_orders": "Gestionar pedidos",
        "manage_students": "Gestionar estudiantes",
        "manage_vinculaciones": "Gestionar vinculaciones",
        "generate_demo_data": "Generar datos demo",
        "config": "Configurar Unatienda",
    },
    
    # PinpanClub
    "pinpanclub": {
        "access": "Acceder a PinpanClub",
        "view_rankings": "Ver rankings",
        "create_match": "Registrar partidos",
        "validate_match": "Validar partidos",
        "create_league": "Crear ligas",
        "manage_leagues": "Gestionar ligas",
        "manage_players": "Gestionar jugadores",
        "manage_seasons": "Gestionar temporadas",
        "admin_panel": "Panel de administración PinpanClub",
    },
    
    # Memberships
    "memberships": {
        "view": "Ver membresías",
        "create_plans": "Crear planes",
        "manage_subscriptions": "Gestionar suscripciones",
        "view_visits": "Ver visitas",
        "manage_qr": "Gestionar códigos QR",
    },
    
    # Integraciones
    "integrations": {
        "access": "Acceder a integraciones",
        "monday": "Configurar Monday.com",
        "google_sheets": "Configurar Google Sheets",
        "yappy": "Configurar Yappy",
        "notifications": "Configurar notificaciones",
    },
    
    # Clientes
    "customers": {
        "view": "Ver clientes",
        "create": "Crear clientes",
        "edit": "Editar clientes",
        "delete": "Eliminar clientes",
    },
    
    # Tickets/Chat
    "tickets": {
        "access": "Acceder a tickets",
        "view": "Ver tickets",
        "respond": "Responder tickets",
        "manage": "Gestionar tickets",
    },
}


# Permissions por defecto para cada rol
DEFAULT_ROLE_PERMISSIONS = {
    DefaultRoles.SUPER_ADMIN: ["*"],  # Todos los permisos
    
    DefaultRoles.ADMIN: [
        "admin.*",
        "users.*",
        "roles.view",
        "unatienda.*",
        "pinpanclub.*",
        "memberships.*",
        "integrations.*",
        "customers.*",
        "tickets.*",
    ],
    
    DefaultRoles.MODERATOR: [
        "admin.access",
        "admin.dashboard",
        "users.view",
        "users.edit",
        "unatienda.access",
        "unatienda.view_public_catalog",
        "unatienda.view_private_catalog",
        "unatienda.manage_orders",
        "unatienda.manage_students",
        "unatienda.manage_vinculaciones",
        "pinpanclub.access",
        "pinpanclub.view_rankings",
        "pinpanclub.create_match",
        "pinpanclub.validate_match",
        "pinpanclub.manage_players",
        "customers.view",
        "customers.edit",
        "tickets.*",
    ],
    
    DefaultRoles.USER: [
        "unatienda.access",
        "unatienda.view_public_catalog",
        "pinpanclub.access",
        "pinpanclub.view_rankings",
        "pinpanclub.create_match",
    ],
}


class RoleBase(BaseModel):
    """Base model for roles"""
    nombre: str = Field(..., min_length=2, max_length=50)
    descripcion: Optional[str] = None
    color: Optional[str] = "#6366f1"  # Color para UI
    icono: Optional[str] = "Shield"  # Icono lucide
    es_sistema: bool = False  # True para roles that does not se pueden eliminar
    nivel: int = 0  # Nivel jerárquico (mayor = más privilegios)


class RoleCreate(RoleBase):
    """Model for creating a role"""
    permisos: List[str] = []


class RoleUpdate(BaseModel):
    """Model for updating a role"""
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    color: Optional[str] = None
    icono: Optional[str] = None
    permisos: Optional[List[str]] = None
    nivel: Optional[int] = None


class Role(RoleBase):
    """Full role model"""
    role_id: str
    permisos: List[str] = []
    fecha_creacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None
    usuarios_count: int = 0


class UserPermissionOverride(BaseModel):
    """Model for individual user permission overrides"""
    user_id: str
    additional_permissions: List[str] = []  # Extra permissions beyond role
    removed_permissions: List[str] = []  # Role permissions that are removed
    notes: Optional[str] = None


class UserRoleAssignment(BaseModel):
    """Model for assigning role to user"""
    user_id: str
    role_id: str
    assigned_by: Optional[str] = None
    assigned_at: Optional[str] = None
    notes: Optional[str] = None


# ============== AUDIT LOG MODELS ==============

class AuditActionType(str, Enum):
    """Types of auditable actions"""
    ROLE_CREATED = "role_created"
    ROLE_UPDATED = "role_updated"
    ROLE_DELETED = "role_deleted"
    ROLE_ASSIGNED = "role_assigned"
    ROLE_REMOVED = "role_removed"
    PERMISSION_ADDED = "permission_added"
    PERMISSION_REMOVED = "permission_removed"
    PERMISSIONS_UPDATED = "permissions_updated"


class AuditLogEntry(BaseModel):
    """Model for audit log entries"""
    log_id: Optional[str] = None
    action: AuditActionType
    actor_id: str  # Who performed the action
    actor_email: Optional[str] = None
    actor_name: Optional[str] = None
    target_type: str  # 'role' or 'user'
    target_id: str  # role_id or user_id
    target_name: Optional[str] = None
    details: Dict[str, Any] = {}  # Additional details about the action
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[str] = None


class AuditLogFilter(BaseModel):
    """Filter for querying audit logs"""
    action: Optional[AuditActionType] = None
    actor_id: Optional[str] = None
    target_id: Optional[str] = None
    target_type: Optional[str] = None
    from_date: Optional[str] = None
    to_date: Optional[str] = None
    limit: int = 50
    skip: int = 0
