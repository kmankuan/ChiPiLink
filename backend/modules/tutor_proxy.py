"""
Tutor Proxy — Smart routing to port 8003 with direct fallback.
Same architecture as Sport: proxy when engine is up, direct when down.
"""
from fastapi import Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger("tutor_proxy")

TUTOR_URL = "http://127.0.0.1:8003"
_client = None
_engine_up = False


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=TUTOR_URL, timeout=httpx.Timeout(30.0, connect=5.0))
    return _client


async def check_engine():
    """Check if Tutor Engine is alive."""
    global _engine_up
    try:
        client = _get_client()
        r = await client.get("/health")
        _engine_up = r.status_code == 200
    except Exception:
        _engine_up = False
    return _engine_up


async def proxy_if_available(request: Request, path: str):
    """Try to proxy to Tutor Engine. Returns Response or None."""
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
            request.method, f"/api/tutor/{path}",
            content=body, headers=headers, params=dict(request.query_params),
        )
        return Response(content=r.content, status_code=r.status_code,
                       media_type=r.headers.get("content-type", "application/json"))
    except Exception:
        _engine_up = False
        return None
