"""
Authentication helpers and dependencies for ChiPi Link
"""
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

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


def create_token(cliente_id: str, es_admin: bool = False) -> str:
    """Create a JWT token for a user"""
    payload = {
        "sub": cliente_id,
        "es_admin": es_admin,
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
                    {"cliente_id": session["cliente_id"]}, 
                    {"_id": 0, "contrasena_hash": 0}
                )
                if user:
                    return user
    
    # Fallback to Authorization header
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        cliente_id = payload.get("sub")
        user = await db[AuthCollections.USERS].find_one(
            {"cliente_id": cliente_id}, 
            {"_id": 0, "contrasena_hash": 0}
        )
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current user and verify they are an admin"""
    if not current_user.get("es_admin", False):
        raise HTTPException(status_code=403, detail="Acceso denegado - Solo administradores")
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
