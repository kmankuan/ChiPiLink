"""
Roles Module - API Routes
Endpoints para management of roles y permisos
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
from datetime import datetime, timezone, timedelta

from core.auth import get_current_user, get_admin_user
from core.database import db
from .models import RoleCreate, RoleUpdate, AVAILABLE_PERMISSIONS, AuditActionType, AuditLogFilter
from .service import roles_service, audit_service

router = APIRouter(prefix="/roles", tags=["Roles & Permissions"])


# ============== ROLE ENDPOINTS ==============

@router.get("")
async def get_all_roles(admin: dict = Depends(get_admin_user)):
    """Get all roles with user counts"""
    roles = await roles_service.get_all_roles()
    return {"roles": roles}


@router.get("/available-permissions")
async def get_available_permissions(admin: dict = Depends(get_admin_user)):
    """Get all available permissions in the system"""
    return {"permissions": AVAILABLE_PERMISSIONS}


@router.get("/my-permissions")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    """Get current user's role and permissions"""
    role = await roles_service.get_user_role(current_user["user_id"])
    permissions = await roles_service.get_user_permissions(current_user["user_id"])
    
    return {
        "role": role,
        "permissions": permissions
    }


@router.get("/{role_id}")
async def get_role(role_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific role"""
    role = await roles_service.get_role(role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return role


@router.post("")
async def create_role(
    request: Request,
    role_data: RoleCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new custom role"""
    # Check if user has permission
    if not admin.get("is_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "roles.create"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para crear roles")
    
    role = await roles_service.create_role(role_data, admin["user_id"])
    
    # Log the action
    await audit_service.log_action(
        action=AuditActionType.ROLE_CREATED,
        actor_id=admin["user_id"],
        target_type="role",
        target_id=role["role_id"],
        target_nombre=role["nombre"],
        details={"permisos": role_data.permisos, "nivel": role_data.nivel},
        actor_info={"email": admin.get("email"), "nombre": admin.get("nombre")},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"success": True, "role": role}


@router.put("/{role_id}")
async def update_role(
    role_id: str,
    updates: RoleUpdate,
    request: Request,
    admin: dict = Depends(get_admin_user)
):
    """Update a role"""
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "roles.edit"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para editar roles")
    
    # Get old role for comparison
    old_role = await roles_service.get_role(role_id)
    
    role = await roles_service.update_role(role_id, updates)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    
    # Log the action
    changes = {}
    if updates.permisos is not None:
        old_perms = set(old_role.get("permisos", []) if old_role else [])
        new_perms = set(updates.permisos)
        changes["permisos_agregados"] = list(new_perms - old_perms)
        changes["permisos_removidos"] = list(old_perms - new_perms)
    if updates.nombre:
        changes["nombre_anterior"] = old_role.get("nombre") if old_role else None
        changes["nombre_nuevo"] = updates.nombre
    if updates.nivel is not None:
        changes["nivel_anterior"] = old_role.get("nivel") if old_role else None
        changes["nivel_nuevo"] = updates.nivel
    
    await audit_service.log_action(
        action=AuditActionType.ROLE_UPDATED if not updates.permisos else AuditActionType.PERMISSIONS_UPDATED,
        actor_id=admin["user_id"],
        target_type="role",
        target_id=role_id,
        target_nombre=role.get("nombre"),
        details=changes,
        actor_info={"email": admin.get("email"), "nombre": admin.get("nombre")},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"success": True, "role": role}


@router.delete("/{role_id}")
async def delete_role(role_id: str, request: Request, admin: dict = Depends(get_admin_user)):
    """Delete a custom role"""
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "roles.delete"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para eliminar roles")
    
    # Get role info before deletion
    role = await roles_service.get_role(role_id)
    
    success = await roles_service.delete_role(role_id)
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar este rol (es un rol de sistema o no existe)"
        )
    
    # Log the action
    await audit_service.log_action(
        action=AuditActionType.ROLE_DELETED,
        actor_id=admin["user_id"],
        target_type="role",
        target_id=role_id,
        target_nombre=role.get("nombre") if role else role_id,
        details={"permisos": role.get("permisos") if role else []},
        actor_info={"email": admin.get("email"), "nombre": admin.get("nombre")},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"success": True}


@router.get("/{role_id}/users")
async def get_role_users(role_id: str, admin: dict = Depends(get_admin_user)):
    """Get all users with a specific role"""
    users = await roles_service.get_users_by_role(role_id)
    return {"users": users, "total": len(users)}


# ============== USER ROLE ASSIGNMENT ==============

@router.post("/assign")
async def assign_role_to_user(
    user_id: str,
    role_id: str,
    request: Request,
    admin: dict = Depends(get_admin_user)
):
    """Assign a role to a user"""
    # Allow if user is legacy admin (es_admin=true) or has permission
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "users.assign_roles"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para asignar roles")
    
    # Prevent assigning super_admin unless current user is super_admin or legacy admin
    if role_id == "super_admin" and not admin.get("es_admin"):
        current_role = await roles_service.get_user_role(admin["user_id"])
        if current_role.get("role_id") != "super_admin":
            raise HTTPException(
                status_code=403, 
                detail="Solo un Super Admin puede asignar el rol de Super Admin"
            )
    
    # Get previous role for logging
    old_role = await roles_service.get_user_role(target_user_id)
    
    # Get target user info
    target_user = await db.users.find_one({"user_id": target_user_id}, {"_id": 0, "nombre": 1, "email": 1})
    
    success = await roles_service.assign_role_to_user(
        target_user_id, 
        role_id, 
        admin["user_id"]
    )
    if not success:
        raise HTTPException(status_code=400, detail="No se pudo asignar el rol")
    
    # Get new role info for logging
    new_role = await roles_service.get_role(role_id)
    
    # Log the action
    await audit_service.log_action(
        action=AuditActionType.ROLE_ASSIGNED,
        actor_id=admin["user_id"],
        target_type="user",
        target_id=target_user_id,
        target_nombre=target_user.get("nombre") if target_user else target_user_id,
        details={
            "rol_anterior": old_role.get("nombre") if old_role else None,
            "rol_anterior_id": old_role.get("role_id") if old_role else None,
            "rol_nuevo": new_role.get("nombre") if new_role else role_id,
            "rol_nuevo_id": role_id,
            "target_email": target_user.get("email") if target_user else None
        },
        actor_info={"email": admin.get("email"), "nombre": admin.get("nombre")},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    return {"success": True, "message": "Rol asignado correctamente"}


@router.get("/user/{user_id}")
async def get_user_role_and_permissions(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get a user's role and permissions"""
    role = await roles_service.get_user_role(target_user_id)
    permissions = await roles_service.get_user_permissions(target_user_id)
    
    # Get user info
    user = await db.users.find_one(
        {"user_id": target_user_id},
        {"_id": 0, "user_id": 1, "nombre": 1, "email": 1}
    )
    
    return {
        "user": user,
        "role": role,
        "permissions": permissions
    }


# ============== INDIVIDUAL PERMISSION OVERRIDES ==============

@router.post("/user/{user_id}/permissions/add")
async def add_user_permission(
    user_id: str,
    permission: str,
    admin: dict = Depends(get_admin_user)
):
    """Add an individual permission to a user"""
    has_permission = await roles_service.check_permission(
        admin["user_id"], 
        "roles.assign_permissions"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar permisos")
    
    await roles_service.add_user_permission(target_user_id, permission)
    return {"success": True, "message": "Permiso agregado"}


@router.post("/user/{user_id}/permissions/remove")
async def remove_user_permission(
    user_id: str,
    permission: str,
    admin: dict = Depends(get_admin_user)
):
    """Remove a permission from a user"""
    has_permission = await roles_service.check_permission(
        admin["user_id"], 
        "roles.assign_permissions"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar permisos")
    
    await roles_service.remove_user_permission(target_user_id, permission)
    return {"success": True, "message": "Permiso removido"}


# ============== PERMISSION CHECK (for frontend) ==============

@router.get("/check/{permission}")
async def check_current_user_permission(
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if current user has a specific permission"""
    has_perm = await roles_service.check_permission(
        current_user["user_id"], 
        permission
    )
    return {"has_permission": has_perm, "permission": permission}


@router.post("/check-multiple")
async def check_multiple_permissions(
    permissions: List[str],
    require_all: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Check if current user has multiple permissions"""
    results = {}
    for perm in permissions:
        results[perm] = await roles_service.check_permission(
            current_user["user_id"], 
            perm
        )
    
    if require_all:
        has_all = all(results.values())
    else:
        has_all = any(results.values())
    
    return {
        "permissions": results,
        "has_required": has_all,
        "require_all": require_all
    }


# ============== AUDIT LOG ENDPOINTS ==============

@router.get("/audit/logs")
async def get_audit_logs(
    action: Optional[str] = None,
    actor_id: Optional[str] = None,
    target_id: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    admin: dict = Depends(get_admin_user)
):
    """Get audit logs with optional filters"""
    # Check permission
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "roles.view"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para ver logs de auditoría")
    
    filters = AuditLogFilter(
        action=AuditActionType(action) if action else None,
        actor_id=actor_id,
        target_id=target_id,
        target_type=target_type,
        limit=limit,
        skip=skip
    )
    
    logs = await audit_service.get_logs(filters, limit, skip)
    total = await audit_service.get_logs_count(filters)
    
    return {
        "logs": logs,
        "total": total,
        "limit": limit,
        "skip": skip
    }


@router.get("/audit/stats")
async def get_audit_stats(admin: dict = Depends(get_admin_user)):
    """Get audit log statistics"""
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "roles.view"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para ver estadísticas de auditoría")
    
    # Get counts by action type
    pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    action_counts = await db.roles_audit_log.aggregate(pipeline).to_list(20)
    total_logs = await db.roles_audit_log.count_documents({})
    
    # Get recent activity (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    recent_count = await db.roles_audit_log.count_documents({"timestamp": {"$gte": yesterday}})
    
    return {
        "total_logs": total_logs,
        "recent_24h": recent_count,
        "by_action": {item["_id"]: item["count"] for item in action_counts}
    }


@router.get("/audit/user/{user_id}")
async def get_user_audit_logs(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    admin: dict = Depends(get_admin_user)
):
    """Get audit logs related to a specific user"""
    if not admin.get("es_admin"):
        has_permission = await roles_service.check_permission(
            admin["user_id"], 
            "users.view"
        )
        if not has_permission:
            raise HTTPException(status_code=403, detail="No tienes permiso para ver logs de usuario")
    
    logs = await audit_service.get_user_activity(target_user_id, limit)
    return {"logs": logs, "user_id": target_user_id}

