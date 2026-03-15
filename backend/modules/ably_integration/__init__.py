"""
Ably Integration — Token auth + pub/sub helpers
Backend generates Ably tokens for authenticated users.
Frontend never sees the root API key.
"""
import os
import logging
from ably import AblyRest
from fastapi import APIRouter, HTTPException, Depends, Request
from core.auth import get_current_user

logger = logging.getLogger("ably")
router = APIRouter(prefix="/ably", tags=["Ably Real-time"])

# Ably API key — hardcoded fallback (deployment overrides env vars)
_PROD_ABLY_KEY = "iSnkeg.4eXC5g:IKqOacwNnWqd6ABHUiMW-CG3zEMCF5-XBSNVWe1_ldI"
ABLY_API_KEY = os.environ.get("ABLY_API_KEY", "") or _PROD_ABLY_KEY

_client = None

def get_ably_client():
    global _client
    if _client is None:
        _client = AblyRest(ABLY_API_KEY)
    return _client


@router.get("/auth")
async def ably_token_auth(request: Request):
    """
    Generate an Ably token for the requesting user.
    Called by Ably SDK's authUrl option.
    No user auth required — spectators need tokens too.
    Uses clientId from query param or 'anonymous'.
    """
    client_id = request.query_params.get("clientId", "anonymous")
    
    try:
        client = get_ably_client()
        token_request = await client.auth.create_token_request({
            'client_id': client_id,
            'capability': {'*': ['publish', 'subscribe', 'presence']},
        })
        # Convert to dict for JSON response
        return dict(token_request.to_dict()) if hasattr(token_request, 'to_dict') else token_request
    except Exception as e:
        logger.error(f"Ably token error: {e}")
        raise HTTPException(500, f"Failed to generate Ably token: {str(e)}")


@router.get("/auth/user")
async def ably_token_auth_user(user: dict = Depends(get_current_user)):
    """
    Generate Ably token for authenticated user (with their user_id as clientId).
    """
    client_id = user.get("user_id", "anonymous")
    user_name = user.get("name", "User")
    
    try:
        client = get_ably_client()
        token_request = await client.auth.create_token_request({
            'client_id': client_id,
            'capability': {'*': ['publish', 'subscribe', 'presence']},
        })
        result = dict(token_request.to_dict()) if hasattr(token_request, 'to_dict') else token_request
        result['user_name'] = user_name  # Extra info for chat display
        return result
    except Exception as e:
        logger.error(f"Ably user token error: {e}")
        raise HTTPException(500, f"Failed to generate token")


async def publish_to_channel(channel_name: str, event: str, data: dict):
    """Publish a message to an Ably channel from the backend."""
    try:
        client = get_ably_client()
        channel = client.channels.get(channel_name)
        await channel.publish(event, data)
    except Exception as e:
        logger.error(f"Ably publish error on {channel_name}: {e}")
