from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from core.database import db
from core.auth import JWT_SECRET, JWT_ALGORITHM
import jwt
from datetime import datetime, timezone, timedelta
import bcrypt

router = APIRouter(prefix="/api/auth-v2", tags=["auth"])

class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    # Look up user in users collection
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check password
    stored_hash = user.get("password_hash", "")
    if not stored_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    try:
        if not bcrypt.checkpw(request.password.encode('utf-8'), stored_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate JWT token
    payload = {
        "sub": user.get("user_id", user.get("email")),
        "is_admin": user.get("is_admin", False),
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Return user info (exclude password)
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    
    return LoginResponse(token=token, user=user_data)
