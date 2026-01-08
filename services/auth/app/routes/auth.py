"""
Auth Module - Authentication Routes
Endpoints para autenticación usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response

from core.auth import get_current_user
from ..models import UserCreate, LoginRequest, TokenResponse, SessionData, ChangePasswordRequest
from ..services import auth_service

router = APIRouter(tags=["Auth - Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Registrar nuevo usuario"""
    try:
        return await auth_service.register(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login con email y contraseña"""
    try:
        return await auth_service.login(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/session")
async def get_oauth_session(request: Request):
    """Obtener datos de sesión OAuth"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    try:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")
        
        return await auth_service.oauth_login(
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/session")
async def create_session_cookie(request: Request, response: Response):
    """Crear cookie de sesión desde token"""
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
    """Obtener información del usuario actual"""
    return current_user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Cerrar sesión"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await auth_service.logout(session_token)
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True}


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cambiar contraseña del usuario actual"""
    try:
        success = await auth_service.change_password(
            cliente_id=current_user["cliente_id"],
            current_password=data.current_password,
            new_password=data.new_password
        )
        
        if success:
            return {"success": True, "message": "Contraseña actualizada"}
        else:
            raise HTTPException(status_code=500, detail="Error al actualizar contraseña")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
