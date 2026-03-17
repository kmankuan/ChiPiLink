from fastapi import HTTPException, Security, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from typing import Optional, Dict, Any

JWT_SECRET = "chipilink_super_secret_key_2026"
JWT_ALGORITHM = "HS256"

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

def decode_jwt_token(token: str) -> Dict[str, Any]:
    """Decode JWT token and return payload"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> Dict[str, Any]:
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = decode_jwt_token(token)
    return payload

async def get_admin_user(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Verify user is admin"""
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security)) -> Optional[Dict[str, Any]]:
    """Get current user if token provided, otherwise None"""
    if not credentials:
        return None
    try:
        token = credentials.credentials
        payload = decode_jwt_token(token)
        return payload
    except (HTTPException, Exception):
        return None
