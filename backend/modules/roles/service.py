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
    DefaultRoles, DEFAULT_ROLE_PERMISSIONS, AVAILABLE_PERMISSIONS,
    AuditActionType, AuditLogEntry, AuditLogFilter
)


class AuditLogService:
    """Service for managing audit logs"""
    
    def __init__(self):
        self.collection = db.roles_audit_log
    
    async def log_action(
        self,
        action: AuditActionType,
        actor_id: str,
        target_type: str,
        target_id: str,
        details: Dict[str, Any] = None,
        actor_info: Dict[str, Any] = None,
        target_nombre: str = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> str:
        """Log an auditable action"""
        log_entry = {
            "log_id": f"audit_{uuid.uuid4().hex[:12]}",
            "action": action.value if isinstance(action, AuditActionType) else action,
            "actor_id": actor_id,
            "actor_email": actor_info.get("email") if actor_info else None,
            "actor_nombre": actor_info.get("nombre") if actor_info else None,
            "target_type": target_type,
            "target_id": target_id,
            "target_nombre": target_nombre,
            "details": details or {},
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        await self.collection.insert_one(log_entry)
        return log_entry["log_id"]
    
    async def get_logs(
        self,
        filters: AuditLogFilter = None,
        limit: int = 50,
        skip: int = 0
    ) -> List[Dict]:
        """Get audit logs with optional filters"""
        query = {}
        
        if filters:
            if filters.action:
                query["action"] = filters.action.value if isinstance(filters.action, AuditActionType) else filters.action
            if filters.actor_id:
                query["actor_id"] = filters.actor_id
            if filters.target_id:
                query["target_id"] = filters.target_id
            if filters.target_type:
                query["target_type"] = filters.target_type
            if filters.from_date:
                query["timestamp"] = {"$gte": filters.from_date}
            if filters.to_date:
                if "timestamp" in query:
                    query["timestamp"]["$lte"] = filters.to_date
                else:
                    query["timestamp"] = {"$lte": filters.to_date}
        
        cursor = self.collection.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit)
        return await cursor.to_list(limit)
    
    async def get_logs_count(self, filters: AuditLogFilter = None) -> int:
        """Get total count of audit logs"""
        query = {}
        if filters:
            if filters.action:
                query["action"] = filters.action.value if isinstance(filters.action, AuditActionType) else filters.action
            if filters.actor_id:
                query["actor_id"] = filters.actor_id
            if filters.target_id:
                query["target_id"] = filters.target_id
        
        return await self.collection.count_documents(query)
    
    async def get_user_activity(self, cliente_id: str, limit: int = 20) -> List[Dict]:
        """Get audit logs for actions performed by or on a specific user"""
        query = {
            "$or": [
                {"actor_id": cliente_id},
                {"target_id": cliente_id, "target_type": "user"}
            ]
        }
        cursor = self.collection.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit)
        return await cursor.to_list(limit)


# Singleton instance
audit_service = AuditLogService()


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
    
    async def assign_role_to_user(self, user_id: str, role_id: str, assigned_by: str = None) -> bool:
        """Assign a role to a user"""
        role = await self.get_role(role_id)
        if not role:
            return False
        
        # Check if already assigned
        existing = await self.user_roles_collection.find_one({
            "user_id": user_id,
            "role_id": role_id
        })
        
        if existing:
            return True  # Already assigned
        
        # Remove previous role assignment (user can only have one role)
        await self.user_roles_collection.delete_many({"user_id": user_id})
        
        # Assign new role
        await self.user_roles_collection.insert_one({
            "user_id": user_id,
            "role_id": role_id,
            "assigned_by": assigned_by,
            "assigned_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Update user document
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$set": {"role_id": role_id, "rol": role["nombre"]}}
        )
        
        return True
    
    async def get_user_role(self, user_id: str) -> Optional[Dict]:
        """Get the role assigned to a user"""
        assignment = await self.user_roles_collection.find_one(
            {"user_id": user_id},
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
