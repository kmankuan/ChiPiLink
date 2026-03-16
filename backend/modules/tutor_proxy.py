"""
Tutor Engine Proxy — Routes tutor API calls through main app to port 8003.
Frontend calls /api/tutor/* on port 8001, this forwards to the Tutor Engine.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
import httpx
import logging

from core.auth import get_current_user, get_admin_user

logger = logging.getLogger("tutor_proxy")
router = APIRouter(prefix="/tutor", tags=["Tutor Proxy"])

TUTOR_URL = "http://127.0.0.1:8003"
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=TUTOR_URL, timeout=httpx.Timeout(60.0, connect=3.0))
    return _client


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy_to_tutor(path: str, request: Request):
    """Forward all /api/tutor/* requests to the Tutor Engine on port 8003."""
    client = _get_client()
    try:
        # Forward the request with same method, headers, body
        body = await request.body()
        headers = {"Content-Type": request.headers.get("content-type", "application/json")}
        # Forward auth header
        auth = request.headers.get("authorization")
        if auth:
            headers["Authorization"] = auth

        r = await client.request(
            request.method,
            f"/api/tutor/{path}",
            content=body,
            headers=headers,
            params=dict(request.query_params),
        )
        return r.json()
    except httpx.ConnectError:
        raise HTTPException(503, "Tutor Engine not reachable (port 8003)")
    except httpx.ConnectTimeout:
        raise HTTPException(504, "Tutor Engine timeout")
    except Exception as e:
        # If JSON parsing fails, return raw text
        try:
            return r.json()
        except Exception:
            raise HTTPException(r.status_code if 'r' in dir() else 502, str(e)[:200])
