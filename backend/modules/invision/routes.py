"""
Invision Routes - LaoPan.online OAuth 2.0 Integration

Endpoints:
- GET /invision/oauth/config - Get public OAuth configuration
- GET /invision/oauth/login - Initiate OAuth login flow
- GET /invision/oauth/callback - Handle OAuth callback
- GET /invision/status - Check integration status (admin)
- PUT /invision/config - Update configuration (admin)
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import RedirectResponse
from datetime import datetime, timezone
from typing import Optional
import logging

from core.database import db
from core.auth import get_admin_user
from .models import InvisionConfig
from .oauth_service import laopan_oauth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invision", tags=["Invision/LaoPan OAuth"])


# ============== PUBLIC OAUTH ENDPOINTS ==============

@router.get("/oauth/config")
async def get_oauth_config():
    """
    Get public OAuth configuration for frontend
    No authentication required
    """
    return await laopan_oauth_service.get_oauth_config()


@router.get("/oauth/login")
async def initiate_oauth_login(
    request: Request,
    redirect: Optional[str] = Query(None)
):
    """
    Initiate OAuth login flow with LaoPan.online
    Returns authorization URL to redirect user to
    
    Automatically detects the correct callback URL based on request origin.
    Works for both preview and production environments.
    
    Query params:
    - redirect: Optional URL to redirect after successful login
    """
    config = await laopan_oauth_service.get_oauth_config()
    
    if not config.get("enabled"):
        raise HTTPException(
            status_code=503,
            detail="OAuth with LaoPan.online is not configured"
        )
    
    # Auto-detect origin from request headers
    origin = None
    
    # Try to get origin from various headers
    referer = request.headers.get("referer")
    origin_header = request.headers.get("origin")
    
    if origin_header:
        origin = origin_header
    elif referer:
        # Extract origin from referer (e.g., "https://example.com/page" -> "https://example.com")
        from urllib.parse import urlparse
        parsed = urlparse(referer)
        origin = f"{parsed.scheme}://{parsed.netloc}"
    
    logger.info(f"OAuth login initiated from origin: {origin}")
    
    auth_data = laopan_oauth_service.generate_auth_url(redirect_after=redirect, origin=origin)
    
    return {
        "auth_url": auth_data["auth_url"],
        "state": auth_data["state"]
    }


@router.get("/oauth/callback")
async def oauth_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None)
):
    """
    Handle OAuth callback from LaoPan.online
    
    This endpoint receives the authorization code from LaoPan and:
    1. Exchanges code for access token
    2. Fetches user info
    3. Creates/updates user in database
    4. Returns JWT token
    
    Frontend should redirect to this with code and state params
    """
    # Handle OAuth errors
    if error:
        logger.warning(f"OAuth error: {error} - {error_description}")
        raise HTTPException(
            status_code=400,
            detail=f"Error de authentication: {error_description or error}"
        )
    
    # Validate required params
    if not code:
        raise HTTPException(status_code=400, detail="Code de authorization no recibido")
    
    if not state:
        raise HTTPException(status_code=400, detail="Estado de session no recibido")
    
    # Validate state (CSRF protection)
    state_data = laopan_oauth_service.validate_state(state)
    if not state_data:
        raise HTTPException(
            status_code=400,
            detail="Estado de session invalid o expirado. Por favor, intente de nuevo."
        )
    
    # Exchange code for token
    token_data = await laopan_oauth_service.exchange_code_for_token(code)
    if not token_data:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener token de acceso. Por favor, intente de nuevo."
        )
    
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=500,
            detail="Token de acceso no recibido"
        )
    
    # Get user info from LaoPan
    laopan_user = await laopan_oauth_service.get_user_info(access_token)
    if not laopan_user:
        raise HTTPException(
            status_code=500,
            detail="Error al obtener information of the user"
        )
    
    # Authenticate/create user
    auth_result = await laopan_oauth_service.authenticate_user(laopan_user)
    
    # Include redirect_after if provided
    auth_result["redirect_after"] = state_data.get("redirect_after")
    
    return auth_result


# ============== ADMIN ENDPOINTS ==============

@router.get("/status")
async def get_invision_status(admin: dict = Depends(get_admin_user)):
    """Check Invision/LaoPan integration status (admin only)"""
    oauth_config = await laopan_oauth_service.get_oauth_config()
    
    return {
        "oauth": {
            "enabled": oauth_config.get("enabled", False),
            "provider": "LaoPan.online (Invision Community)",
            "configured": bool(laopan_oauth_service.client_id)
        },
        "api": {
            "configured": False,
            "message": "API integration not yet implemented"
        }
    }


@router.get("/config")
async def get_invision_config(admin: dict = Depends(get_admin_user)):
    """Get Invision configuration (admin only)"""
    # Get saved config from DB
    config = await db.app_config.find_one({"config_key": "invision"}, {"_id": 0})
    
    # Merge with current OAuth status
    oauth_config = await laopan_oauth_service.get_oauth_config()
    
    base_config = config.get("value", {}) if config else {}
    
    return {
        **base_config,
        "oauth_enabled": oauth_config.get("enabled", False),
        "oauth_provider": oauth_config.get("provider_name"),
        "button_text": oauth_config.get("button_text"),
        "button_text_es": oauth_config.get("button_text_es"),
        "button_text_zh": oauth_config.get("button_text_zh")
    }


@router.put("/config")
async def update_invision_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update Invision configuration (admin only)"""
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    config["updated_by"] = admin.get("user_id")
    
    await db.app_config.update_one(
        {"config_key": "invision"},
        {"$set": {
            "config_key": "invision",
            "value": config
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuration guardada"}


# ============== LEGACY PLACEHOLDER ENDPOINTS ==============
# These remain as placeholders for future API integration

@router.get("/posts")
async def get_invision_posts(
    forum_id: str = None,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get cached posts from Invision - Placeholder for future API integration"""
    return {
        "posts": [],
        "message": "API integration pending. OAuth authentication is now available."
    }


@router.post("/sync")
async def sync_invision_posts(admin: dict = Depends(get_admin_user)):
    """Trigger manual sync from Invision - Placeholder"""
    return {
        "success": False,
        "message": "API sync not yet implemented. Use OAuth for user authentication."
    }
