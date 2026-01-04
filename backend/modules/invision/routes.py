"""
Invision Routes - Placeholder for Invisionpower Suite integration

Endpoints to be implemented:
- GET /invision/status - Check integration status
- POST /invision/config - Configure API credentials
- GET /invision/posts - Fetch posts from laopan.online
- POST /invision/sync - Trigger manual sync
- GET /invision/auth/login - Initiate SSO login
- GET /invision/auth/callback - OAuth callback
- POST /invision/publish - Publish content to laopan.online (optional)
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_admin_user
from .models import InvisionConfig

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/invision", tags=["Invision Integration"])


# ============== STATUS & CONFIG ==============

@router.get("/status")
async def get_invision_status(admin: dict = Depends(get_admin_user)):
    """Check Invision integration status"""
    config = await db.app_config.find_one({"config_key": "invision"}, {"_id": 0})
    
    if not config or not config.get("value", {}).get("api_url"):
        return {
            "configured": False,
            "connected": False,
            "status": "not_configured",
            "message": "Integraci\u00f3n con Invision no configurada. Configure las credenciales para conectar con laopan.online"
        }
    
    value = config.get("value", {})
    
    return {
        "configured": True,
        "connected": value.get("status") == "active",
        "status": value.get("status", "unknown"),
        "api_url": value.get("api_url"),
        "sync_enabled": value.get("sync_enabled", False),
        "last_sync": value.get("last_sync"),
        "message": value.get("error_message") if value.get("status") == "error" else None
    }


@router.get("/config")
async def get_invision_config(admin: dict = Depends(get_admin_user)):
    """Get Invision configuration (admin only)"""
    config = await db.app_config.find_one({"config_key": "invision"}, {"_id": 0})
    
    if not config:
        return InvisionConfig().model_dump()
    
    return config.get("value", InvisionConfig().model_dump())


@router.put("/config")
async def update_invision_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update Invision configuration"""
    # Validate required fields
    if config.get("api_url") and not config["api_url"].startswith("http"):
        raise HTTPException(status_code=400, detail="URL de API inv\u00e1lida")
    
    config["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # If credentials are provided, set status to pending
    if config.get("api_key") or config.get("oauth_client_id"):
        config["status"] = "pending_test"
    
    await db.app_config.update_one(
        {"config_key": "invision"},
        {"$set": {
            "config_key": "invision",
            "value": config
        }},
        upsert=True
    )
    
    return {"success": True, "message": "Configuraci\u00f3n guardada. Use /invision/test para probar la conexi\u00f3n."}


@router.post("/test")
async def test_invision_connection(admin: dict = Depends(get_admin_user)):
    """Test connection to Invision API"""
    config = await db.app_config.find_one({"config_key": "invision"})
    
    if not config or not config.get("value", {}).get("api_url"):
        raise HTTPException(status_code=400, detail="Invision no est\u00e1 configurado")
    
    value = config["value"]
    api_url = value.get("api_url", "").rstrip("/")
    api_key = value.get("api_key")
    
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key no configurada")
    
    # TODO: Implement actual API test when credentials are provided
    # This is a placeholder that simulates the test
    
    # For now, return pending status
    return {
        "success": False,
        "message": "Funci\u00f3n de prueba pendiente de implementaci\u00f3n. Proporcione las credenciales de Invisionpower Suite para continuar.",
        "next_steps": [
            "1. Obtenga las credenciales de API de laopan.online",
            "2. Configure el API URL (ej: https://laopan.online/api/)",
            "3. Configure el API Key",
            "4. (Opcional) Configure OAuth para SSO"
        ]
    }


# ============== POSTS (PLACEHOLDER) ==============

@router.get("/posts")
async def get_invision_posts(
    forum_id: str = None,
    limit: int = 20,
    admin: dict = Depends(get_admin_user)
):
    """Get cached posts from Invision - Placeholder"""
    # Check if configured
    config = await db.app_config.find_one({"config_key": "invision"})
    if not config or not config.get("value", {}).get("api_url"):
        return {
            "posts": [],
            "message": "Invision no configurado. Los posts aparecer\u00e1n aqu\u00ed cuando la integraci\u00f3n est\u00e9 activa."
        }
    
    # Get cached posts
    query = {}
    if forum_id:
        query["forum_id"] = forum_id
    
    posts = await db.invision_posts.find(query, {"_id": 0}).sort(
        "fecha_publicacion", -1
    ).to_list(limit)
    
    return {
        "posts": posts,
        "total": len(posts),
        "source": "cache"
    }


@router.post("/sync")
async def sync_invision_posts(admin: dict = Depends(get_admin_user)):
    """Trigger manual sync from Invision - Placeholder"""
    config = await db.app_config.find_one({"config_key": "invision"})
    
    if not config or not config.get("value", {}).get("api_url"):
        raise HTTPException(status_code=400, detail="Invision no est\u00e1 configurado")
    
    # TODO: Implement actual sync when credentials are provided
    return {
        "success": False,
        "message": "Sincronizaci\u00f3n pendiente de implementaci\u00f3n. Configure las credenciales primero."
    }


# ============== SSO/OAUTH (PLACEHOLDER) ==============

@router.get("/auth/login")
async def invision_sso_login():
    """Initiate SSO login with Invision - Placeholder"""
    config = await db.app_config.find_one({"config_key": "invision"})
    
    if not config or not config.get("value", {}).get("oauth_client_id"):
        raise HTTPException(
            status_code=400, 
            detail="OAuth no configurado. Configure las credenciales de OAuth para habilitar SSO."
        )
    
    # TODO: Implement actual OAuth flow
    return {
        "message": "SSO con Invision pendiente de implementaci\u00f3n.",
        "next_steps": [
            "1. Configure OAuth Client ID y Secret en /invision/config",
            "2. Configure el Redirect URI",
            "3. Active SSO en la configuraci\u00f3n de Invision"
        ]
    }


@router.get("/auth/callback")
async def invision_sso_callback(code: str = None, state: str = None):
    """OAuth callback from Invision - Placeholder"""
    # TODO: Implement actual OAuth callback
    return {"message": "Callback pendiente de implementaci\u00f3n"}


# ============== PUBLISH (PLACEHOLDER) ==============

@router.post("/publish")
async def publish_to_invision(post: dict, admin: dict = Depends(get_admin_user)):
    """Publish content from ChiPi Link to laopan.online - Placeholder"""
    config = await db.app_config.find_one({"config_key": "invision"})
    
    if not config or not config.get("value", {}).get("api_key"):
        raise HTTPException(status_code=400, detail="Invision no est\u00e1 configurado")
    
    # TODO: Implement actual publishing
    return {
        "success": False,
        "message": "Publicaci\u00f3n a Invision pendiente de implementaci\u00f3n.",
        "post_data_received": {
            "titulo": post.get("titulo"),
            "contenido_length": len(post.get("contenido", ""))
        }
    }
