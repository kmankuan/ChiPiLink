"""
Sport Proxy — Smart routing to port 8004 with direct fallback.

Strategy: Register direct sport routes normally. ALSO try proxy to 8004.
If 8004 is up → proxy (offloads from main process).
If 8004 is down → direct routes handle it (same process).

This is implemented by having the proxy as middleware-like behavior
on top of the direct routes.
"""
from fastapi import APIRouter, Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger("sport_proxy")

SPORT_URL = "http://127.0.0.1:8004"
_client = None
_engine_up = False  # Start assuming down — direct routes handle initial requests


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=SPORT_URL, timeout=httpx.Timeout(20.0, connect=3.0))
    return _client


async def check_engine():
    """Check if Sport Engine is alive."""
    global _engine_up
    try:
        client = _get_client()
        r = await client.get("/health")
        _engine_up = r.status_code == 200
    except Exception:
        _engine_up = False
    return _engine_up


async def proxy_if_available(request: Request, path: str):
    """Try to proxy to Sport Engine. Returns Response or None."""
    global _engine_up
    if not _engine_up:
        return None
    try:
        client = _get_client()
        body = await request.body()
        headers = {"Content-Type": request.headers.get("content-type", "application/json")}
        auth = request.headers.get("authorization")
        if auth:
            headers["Authorization"] = auth
        r = await client.request(
            request.method, f"/api/sport/{path}",
            content=body, headers=headers, params=dict(request.query_params),
        )
        return Response(content=r.content, status_code=r.status_code,
                       media_type=r.headers.get("content-type", "application/json"))
    except Exception:
        _engine_up = False
        return None
