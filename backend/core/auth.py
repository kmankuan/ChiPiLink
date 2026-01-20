"""
Authentication helpers and dependencies for ChiPi Link
All field names use English conventions
"""
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Callable
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import fnmatch

from .config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS
from .database import db
from .constants import AuthCollections

# Security scheme
security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, is_admin: bool = False) -> str:
    """Create a JWT token for a user"""
    payload = {
        "sub": user_id,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    """Get current authenticated user from token or session cookie"""
    token = None
    
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        # Verify session from database
        session = await db[AuthCollections.SESSIONS].find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db[AuthCollections.USERS].find_one(
                    {"user_id": session["user_id"]}, 
                    {"_id": 0, "password_hash": 0}
                )
                if user:
                    return user
    
    # Fallback to Authorization header
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db[AuthCollections.USERS].find_one(
            {"user_id": user_id}, 
            {"_id": 0, "password_hash": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current user and verify they are an admin"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Access denied - Admins only")
    return current_user


async def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[dict]:
    """Get current user if authenticated, otherwise return None"""
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


# ============== PERMISSION-BASED AUTH ==============

async def get_user_permissions(user_id: str) -> List[str]:
    """Get all permissions for a user from their role and overrides"""
    # Get user's role assignment
    user_role = await db.user_roles.find_one({"user_id": user_id}, {"_id": 0})
    
    role_id = user_role.get("role_id") if user_role else "user"
    
    # Get role with permissions
    role = await db.roles.find_one({"role_id": role_id}, {"_id": 0})
    if not role:
        # Default to basic user role
        role = await db.roles.find_one({"role_id": "user"}, {"_id": 0})
    
    role_permissions = role.get("permissions", []) if role else []
    
    # Get individual overrides
    overrides = await db.user_permissions.find_one({"user_id": user_id}, {"_id": 0})
    additional = overrides.get("additional_permissions", []) if overrides else []
    removed = overrides.get("removed_permissions", []) if overrides else []
    
    # Combine: role permissions + additional - removed
    all_permissions = set(role_permissions) | set(additional)
    final_permissions = all_permissions - set(removed)
    
    return list(final_permissions)


def check_permission_match(user_permissions: List[str], required_permission: str) -> bool:
    """Check if a user's permissions satisfy a required permission"""
    for perm in user_permissions:
        # Wildcard: all permissions
        if perm == "*":
            return True
        # Module wildcard: module.*
        if perm.endswith(".*"):
            module = perm[:-2]
            if required_permission.startswith(module + "."):
                return True
        # Pattern match
        if fnmatch.fnmatch(required_permission, perm):
            return True
        # Direct match
        if perm == required_permission:
            return True
    return False


def require_permission(permission: str):
    """
    Dependency factory that requires a specific permission.
    Usage: Depends(require_permission("admin.access"))
    """
    async def permission_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> dict:
        user = await get_current_user(request, credentials)
        
        # Super admin always has access
        if user.get("is_admin"):
            return user
        
        # Check permissions
        permissions = await get_user_permissions(user["user_id"])
        
        if not check_permission_match(permissions, permission):
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied - Required permission: {permission}"
            )
        
        return user
    
    return permission_checker


def require_any_permission(permissions: List[str]):
    """
    Dependency factory that requires at least one of the specified permissions.
    Usage: Depends(require_any_permission(["admin.access", "moderator.access"]))
    """
    async def permission_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> dict:
        user = await get_current_user(request, credentials)
        
        # Super admin always has access
        if user.get("is_admin"):
            return user
        
        user_permissions = await get_user_permissions(user["user_id"])
        
        for required_permission in permissions:
            if check_permission_match(user_permissions, required_permission):
                return user
        
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied - Required one of: {', '.join(permissions)}"
        )
    
    return permission_checker


def require_all_permissions(permissions: List[str]):
    """
    Dependency factory that requires all of the specified permissions.
    Usage: Depends(require_all_permissions(["admin.access", "users.edit"]))
    """
    async def permission_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> dict:
        user = await get_current_user(request, credentials)
        
        # Super admin always has access
        if user.get("is_admin"):
            return user
        
        user_permissions = await get_user_permissions(user["user_id"])
        
        for required_permission in permissions:
            if not check_permission_match(user_permissions, required_permission):
                raise HTTPException(
                    status_code=403, 
                    detail=f"Access denied - Required permission: {required_permission}"
                )
        
        return user
    
    return permission_checker


def require_role(role_id: str):
    """
    Dependency factory that requires a specific role.
    Usage: Depends(require_role("admin"))
    """
    async def role_checker(
        request: Request,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> dict:
        user = await get_current_user(request, credentials)
        
        # Super admin always has access
        if user.get("is_admin"):
            return user
        
        # Get user's role assignment
        user_role = await db.user_roles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        
        if not user_role or user_role.get("role_id") != role_id:
            raise HTTPException(
                status_code=403, 
                detail=f"Access denied - Required role: {role_id}"
            )
        
        return user
    
    return role_checker
