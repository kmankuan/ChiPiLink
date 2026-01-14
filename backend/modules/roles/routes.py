"""
Roles Module - API Routes
Endpoints para gestión de roles y permisos
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from core.database import db
from .models import RoleCreate, RoleUpdate, AVAILABLE_PERMISSIONS
from .service import roles_service

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
    role = await roles_service.get_user_role(current_user["cliente_id"])
    permissions = await roles_service.get_user_permissions(current_user["cliente_id"])
    
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
    role_data: RoleCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new custom role"""
    # Check if user has permission
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "roles.create"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para crear roles")
    
    role = await roles_service.create_role(role_data, admin["cliente_id"])
    return {"success": True, "role": role}


@router.put("/{role_id}")
async def update_role(
    role_id: str,
    updates: RoleUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a role"""
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "roles.edit"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar roles")
    
    role = await roles_service.update_role(role_id, updates)
    if not role:
        raise HTTPException(status_code=404, detail="Rol no encontrado")
    return {"success": True, "role": role}


@router.delete("/{role_id}")
async def delete_role(role_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a custom role"""
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "roles.delete"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar roles")
    
    success = await roles_service.delete_role(role_id)
    if not success:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar este rol (es un rol de sistema o no existe)"
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
    cliente_id: str,
    role_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Assign a role to a user"""
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "users.assign_roles"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para asignar roles")
    
    # Prevent assigning super_admin unless current user is super_admin
    if role_id == "super_admin":
        current_role = await roles_service.get_user_role(admin["cliente_id"])
        if current_role.get("role_id") != "super_admin":
            raise HTTPException(
                status_code=403, 
                detail="Solo un Super Admin puede asignar el rol de Super Admin"
            )
    
    success = await roles_service.assign_role_to_user(
        cliente_id, 
        role_id, 
        admin["cliente_id"]
    )
    if not success:
        raise HTTPException(status_code=400, detail="No se pudo asignar el rol")
    
    return {"success": True, "message": "Rol asignado correctamente"}


@router.get("/user/{cliente_id}")
async def get_user_role_and_permissions(
    cliente_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get a user's role and permissions"""
    role = await roles_service.get_user_role(cliente_id)
    permissions = await roles_service.get_user_permissions(cliente_id)
    
    # Get user info
    user = await db.clientes.find_one(
        {"cliente_id": cliente_id},
        {"_id": 0, "cliente_id": 1, "nombre": 1, "email": 1}
    )
    
    return {
        "user": user,
        "role": role,
        "permissions": permissions
    }


# ============== INDIVIDUAL PERMISSION OVERRIDES ==============

@router.post("/user/{cliente_id}/permissions/add")
async def add_user_permission(
    cliente_id: str,
    permission: str,
    admin: dict = Depends(get_admin_user)
):
    """Add an individual permission to a user"""
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "roles.assign_permissions"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar permisos")
    
    await roles_service.add_user_permission(cliente_id, permission)
    return {"success": True, "message": "Permiso agregado"}


@router.post("/user/{cliente_id}/permissions/remove")
async def remove_user_permission(
    cliente_id: str,
    permission: str,
    admin: dict = Depends(get_admin_user)
):
    """Remove a permission from a user"""
    has_permission = await roles_service.check_permission(
        admin["cliente_id"], 
        "roles.assign_permissions"
    )
    if not has_permission:
        raise HTTPException(status_code=403, detail="No tienes permiso para modificar permisos")
    
    await roles_service.remove_user_permission(cliente_id, permission)
    return {"success": True, "message": "Permiso removido"}


# ============== PERMISSION CHECK (for frontend) ==============

@router.get("/check/{permission}")
async def check_current_user_permission(
    permission: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if current user has a specific permission"""
    has_perm = await roles_service.check_permission(
        current_user["cliente_id"], 
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
            current_user["cliente_id"], 
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
