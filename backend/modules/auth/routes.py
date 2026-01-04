"""
Auth Routes - Authentication endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from datetime import datetime, timezone, timedelta
import uuid
import httpx
import logging

from core.database import db
from core.auth import (
    hash_password, 
    verify_password, 
    create_token, 
    get_current_user,
    security
)
from .models import ClienteCreate, Cliente, LoginRequest, TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/registro", response_model=TokenResponse)
async def registro(cliente: ClienteCreate):
    """Register a new user"""
    existing = await db.clientes.find_one({"email": cliente.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    cliente_obj = Cliente(**cliente.model_dump(exclude={"contrasena"}))
    doc = cliente_obj.model_dump()
    doc["contrasena_hash"] = hash_password(cliente.contrasena)
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.clientes.insert_one(doc)
    
    token = create_token(cliente_obj.cliente_id)
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in doc.items() if k not in ["_id", "contrasena_hash"]}
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Login with email and password"""
    user = await db.clientes.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.contrasena, user.get("contrasena_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["cliente_id"], user.get("es_admin", False))
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in user.items() if k != "contrasena_hash"}
    )


@router.get("/session")
async def get_session_data(request: Request):
    """Get session data from external OAuth provider"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            
            data = response.json()
            
            # Check if user exists
            existing_user = await db.clientes.find_one({"email": data["email"]}, {"_id": 0})
            
            if existing_user:
                cliente_id = existing_user["cliente_id"]
                # Update user info if needed
                await db.clientes.update_one(
                    {"email": data["email"]},
                    {"$set": {
                        "nombre": data.get("name", existing_user.get("nombre")),
                        "google_id": data.get("id")
                    }}
                )
            else:
                # Create new user
                cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "cliente_id": cliente_id,
                    "email": data["email"],
                    "nombre": data.get("name", ""),
                    "google_id": data.get("id"),
                    "telefono": None,
                    "direccion": None,
                    "estudiantes": [],
                    "es_admin": False,
                    "fecha_creacion": datetime.now(timezone.utc).isoformat()
                }
                await db.clientes.insert_one(new_user)
            
            # Create session
            session_token = data.get("session_token", str(uuid.uuid4()))
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "cliente_id": cliente_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            user = await db.clientes.find_one(
                {"cliente_id": cliente_id}, 
                {"_id": 0, "contrasena_hash": 0}
            )
            
            return {
                "session_token": session_token,
                "cliente": user
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail="Error de autenticación")


@router.post("/session")
async def create_session_cookie(request: Request, response: Response):
    """Create session cookie from session token"""
    body = await request.json()
    session_token = body.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token requerido")
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {"success": True}


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info"""
    return current_user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True}
