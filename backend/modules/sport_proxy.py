"""
Sport Engine Proxy with Direct Fallback
Tries port 8004 first. If unreachable, forwards to the direct sport module.
This ensures sport ALWAYS works — even if the separate service fails to start.
"""
from fastapi import APIRouter, Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger("sport_proxy")
router = APIRouter(prefix="/sport", tags=["Sport"])

SPORT_URL = "http://127.0.0.1:8004"
_client = None
_engine_available = None  # None = unknown, True = up, False = down


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=SPORT_URL, timeout=httpx.Timeout(15.0, connect=3.0))
    return _client


async def _check_engine():
    """Quick health check on Sport Engine."""
    global _engine_available
    try:
        client = _get_client()
        r = await client.get("/health")
        _engine_available = r.status_code == 200
    except Exception:
        _engine_available = False
    return _engine_available


# Import direct sport routes as fallback
from modules.sport import router as _direct_sport_router
from modules.sport import tournament_router as _direct_tournament_router

# Register direct routes (these always work)
for route in _direct_sport_router.routes:
    router.routes.append(route)
for route in _direct_tournament_router.routes:
    router.routes.append(route)
