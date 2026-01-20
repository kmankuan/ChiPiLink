"""
Auth Module - Authentication Routes
Endpoints for authentication using the Service Layer
All field names use English conventions
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response

from core.auth import get_current_user
from ..models import UserCreate, LoginRequest, TokenResponse, SessionData, ChangePasswordRequest
from ..services import auth_service

router = APIRouter(tags=["Auth - Authentication"])


@router.post("/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Register new user"""
    try:
        return await auth_service.register(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login with email and password"""
    try:
        return await auth_service.login(data)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/session")
async def get_oauth_session(request: Request):
    """Get OAuth session data"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
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
    """Create session cookie from token"""
    body = await request.json()
    session_token = body.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token required")
    
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
    """Get current user information"""
    return current_user


@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout - close session"""
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
    """Change current user's password"""
    try:
        success = await auth_service.change_password(
            user_id=current_user["user_id"],
            current_password=data.current_password,
            new_password=data.new_password
        )
        
        if success:
            return {"success": True, "message": "Password updated"}
        else:
            raise HTTPException(status_code=500, detail="Error updating password")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
