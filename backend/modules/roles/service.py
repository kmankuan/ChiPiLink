"""
Roles Module - Service Layer
Lógica de negocio para roles y permisos
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import fnmatch

from core.database import db
from .models import (
    Role, RoleCreate, RoleUpdate, 
    DefaultRoles, DEFAULT_ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS
)


class RolesService:
    """Service for managing roles and permissions"""
    
    def __init__(self):
        self.collection = db.roles
        self.user_roles_collection = db.user_roles
        self.user_permissions_collection = db.user_permissions
    
    async def initialize_default_roles(self):
        """Create default system roles if they don't exist"""
        default_roles = [
            {
                "role_id": DefaultRoles.SUPER_ADMIN.value,
                "nombre": "Super Administrador",
                "descripcion": "Control total del sistema",
                "color": "#dc2626",
                "icono": "Crown",
                "es_sistema": True,
                "nivel": 100,
                "permisos": DEFAULT_ROLE_PERMISSIONS[DefaultRoles.SUPER_ADMIN],
            },
            {
                "role_id": DefaultRoles.ADMIN.value,
                "nombre": "Administrador",
                "descripcion": "Gestión completa de la plataforma",
                "color": "#ea580c",
                "icono": "ShieldCheck",
                "es_sistema": True,
                "nivel": 80,
                "permisos": DEFAULT_ROLE_PERMISSIONS[DefaultRoles.ADMIN],
            },
            {
                "role_id": DefaultRoles.MODERATOR.value,
                "nombre": "Moderador",
                "descripcion": "Gestión de contenido y usuarios básicos",
                "color": "#0891b2",
                "icono": "Shield",
                "es_sistema": True,
                "nivel": 50,
                "permisos": DEFAULT_ROLE_PERMISSIONS[DefaultRoles.MODERATOR],
            },
            {
                "role_id": DefaultRoles.USER.value,
                "nombre": "Usuario",
                "descripcion": "Acceso básico a funcionalidades públicas",
                "color": "#6366f1",
                "icono": "User",
                "es_sistema": True,
                "nivel": 10,
                "permisos": DEFAULT_ROLE_PERMISSIONS[DefaultRoles.USER],
            },
        ]
        
        for role_data in default_roles:
            existing = await self.collection.find_one({"role_id": role_data["role_id"]})
            if not existing:
                role_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
                await self.collection.insert_one(role_data)
                print(f"[Roles] Created default role: {role_data['nombre']}")
            else:
                # Update permissions for existing system roles
                await self.collection.update_one(
                    {"role_id": role_data["role_id"]},
                    {"$set": {"permisos": role_data["permisos"]}}
                )
    
    async def get_all_roles(self) -> List[Dict]:
        """Get all roles with user counts"""
        roles = await self.collection.find({}, {"_id": 0}).sort("nivel", -1).to_list(100)
        
        # Add user counts
        for role in roles:
            count = await self.user_roles_collection.count_documents({"role_id": role["role_id"]})
            role["usuarios_count"] = count
        
        return roles
    
    async def get_role(self, role_id: str) -> Optional[Dict]:
        """Get a single role by ID"""
        return await self.collection.find_one({"role_id": role_id}, {"_id": 0})
    
    async def create_role(self, role_data: RoleCreate, created_by: str = None) -> Dict:
        """Create a new custom role"""
        role_dict = role_data.model_dump()
        role_dict["role_id"] = f"role_{uuid.uuid4().hex[:8]}"
        role_dict["es_sistema"] = False
        role_dict["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        role_dict["creado_por"] = created_by
        
        await self.collection.insert_one(role_dict)
        role_dict.pop("_id", None)
        return role_dict
    
    async def update_role(self, role_id: str, updates: RoleUpdate) -> Optional[Dict]:
        """Update a role"""
        role = await self.get_role(role_id)
        if not role:
            return None
        
        # Prevent modifying certain fields of system roles
        if role.get("es_sistema") and role_id in [r.value for r in DefaultRoles]:
            # Only allow updating permisos for system roles
            update_data = {}
            if updates.permisos is not None:
                update_data["permisos"] = updates.permisos
        else:
            update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
        
        if update_data:
            update_data["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
            await self.collection.update_one(
                {"role_id": role_id},
                {"$set": update_data}
            )
        
        return await self.get_role(role_id)
    
    async def delete_role(self, role_id: str) -> bool:
        """Delete a custom role (system roles cannot be deleted)"""
        role = await self.get_role(role_id)
        if not role or role.get("es_sistema"):
            return False
        
        # Remove role assignments
        await self.user_roles_collection.delete_many({"role_id": role_id})
        
        # Delete the role
        result = await self.collection.delete_one({"role_id": role_id})
        return result.deleted_count > 0
    
    # ============== USER ROLE MANAGEMENT ==============
    
    async def assign_role_to_user(self, cliente_id: str, role_id: str, assigned_by: str = None) -> bool:
        """Assign a role to a user"""
        role = await self.get_role(role_id)
        if not role:
            return False
        
        # Check if already assigned
        existing = await self.user_roles_collection.find_one({
            "cliente_id": cliente_id,
            "role_id": role_id
        })
        
        if existing:
            return True  # Already assigned
        
        # Remove previous role assignment (user can only have one role)
        await self.user_roles_collection.delete_many({"cliente_id": cliente_id})
        
        # Assign new role
        await self.user_roles_collection.insert_one({
            "cliente_id": cliente_id,
            "role_id": role_id,
            "asignado_por": assigned_by,
            "fecha_asignacion": datetime.now(timezone.utc).isoformat()
        })
        
        # Update user document
        await db.clientes.update_one(
            {"cliente_id": cliente_id},
            {"$set": {"role_id": role_id, "rol": role["nombre"]}}
        )
        
        return True
    
    async def get_user_role(self, cliente_id: str) -> Optional[Dict]:
        """Get the role assigned to a user"""
        assignment = await self.user_roles_collection.find_one(
            {"cliente_id": cliente_id},
            {"_id": 0}
        )
        
        if not assignment:
            # Default to USER role
            return await self.get_role(DefaultRoles.USER.value)
        
        return await self.get_role(assignment["role_id"])
    
    async def get_users_by_role(self, role_id: str) -> List[Dict]:
        """Get all users with a specific role"""
        assignments = await self.user_roles_collection.find(
            {"role_id": role_id},
            {"_id": 0}
        ).to_list(1000)
        
        users = []
        for assignment in assignments:
            user = await db.clientes.find_one(
                {"cliente_id": assignment["cliente_id"]},
                {"_id": 0, "cliente_id": 1, "nombre": 1, "email": 1}
            )
            if user:
                user["fecha_asignacion"] = assignment.get("fecha_asignacion")
                users.append(user)
        
        return users
    
    # ============== PERMISSION MANAGEMENT ==============
    
    async def get_user_permissions(self, cliente_id: str) -> List[str]:
        """Get all permissions for a user (from role + overrides)"""
        # Get role permissions
        role = await self.get_user_role(cliente_id)
        role_permissions = role.get("permisos", []) if role else []
        
        # Get individual overrides
        overrides = await self.user_permissions_collection.find_one(
            {"cliente_id": cliente_id},
            {"_id": 0}
        )
        
        additional = overrides.get("permisos_adicionales", []) if overrides else []
        removed = overrides.get("permisos_removidos", []) if overrides else []
        
        # Combine: role permissions + additional - removed
        all_permissions = set(role_permissions) | set(additional)
        final_permissions = all_permissions - set(removed)
        
        return list(final_permissions)
    
    async def add_user_permission(self, cliente_id: str, permission: str) -> bool:
        """Add an individual permission to a user"""
        await self.user_permissions_collection.update_one(
            {"cliente_id": cliente_id},
            {
                "$addToSet": {"permisos_adicionales": permission},
                "$pull": {"permisos_removidos": permission},
                "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        return True
    
    async def remove_user_permission(self, cliente_id: str, permission: str) -> bool:
        """Remove a permission from a user"""
        await self.user_permissions_collection.update_one(
            {"cliente_id": cliente_id},
            {
                "$addToSet": {"permisos_removidos": permission},
                "$pull": {"permisos_adicionales": permission},
                "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
            },
            upsert=True
        )
        return True
    
    async def check_permission(self, cliente_id: str, required_permission: str) -> bool:
        """Check if a user has a specific permission"""
        permissions = await self.get_user_permissions(cliente_id)
        
        # Check for wildcard permissions
        for perm in permissions:
            if perm == "*":
                return True
            if perm.endswith(".*"):
                module = perm[:-2]
                if required_permission.startswith(module + "."):
                    return True
            if fnmatch.fnmatch(required_permission, perm):
                return True
            if perm == required_permission:
                return True
        
        return False
    
    async def check_permissions(self, cliente_id: str, required_permissions: List[str], require_all: bool = True) -> bool:
        """Check if a user has multiple permissions"""
        if require_all:
            return all([await self.check_permission(cliente_id, p) for p in required_permissions])
        else:
            return any([await self.check_permission(cliente_id, p) for p in required_permissions])
    
    def get_available_permissions(self) -> Dict[str, Dict[str, str]]:
        """Get all available permissions in the system"""
        return AVAILABLE_PERMISSIONS


# Singleton instance
roles_service = RolesService()
