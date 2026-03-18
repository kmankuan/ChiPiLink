"""
Sport Engine Proxy — Routes sport API calls through main app to port 8004.
Frontend calls /api/sport/* on port 8001, this forwards to the Sport Engine.
"""
from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
import httpx
import logging
import asyncio
import websockets

logger = logging.getLogger("sport_proxy")
router = APIRouter(prefix="/sport", tags=["Sport Proxy"])

SPORT_URL = "http://127.0.0.1:8004"
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=SPORT_URL, timeout=httpx.Timeout(60.0, connect=3.0))
    return _client


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_sport(path: str, request: Request):
    """Forward all /api/sport/* requests to the Sport Engine on port 8004."""
    client = _get_client()
    try:
        body = await request.body()
        headers = {"Content-Type": request.headers.get("content-type", "application/json")}
        auth = request.headers.get("authorization")
        if auth:
            headers["Authorization"] = auth

        r = await client.request(
            request.method,
            f"/api/sport/{path}",
            content=body,
            headers=headers,
            params=dict(request.query_params),
        )
        # Return with same status code
        from fastapi.responses import Response
        return Response(
            content=r.content,
            status_code=r.status_code,
            media_type=r.headers.get("content-type", "application/json"),
        )
    except httpx.ConnectError:
        raise HTTPException(503, "Sport Engine not reachable (port 8004)")
    except httpx.ConnectTimeout:
        raise HTTPException(504, "Sport Engine timeout")
    except Exception as e:
        logger.error(f"Sport proxy error: {e}")
        raise HTTPException(502, f"Sport proxy error: {str(e)}")
