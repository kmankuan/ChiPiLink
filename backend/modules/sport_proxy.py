"""
Sport Engine Proxy — Routes sport API calls through main app to port 8004.
Frontend calls /api/sport/* on port 8001, this forwards to the Sport Engine.
Includes retry logic for startup race conditions.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import httpx
import asyncio
import logging

logger = logging.getLogger("sport_proxy")
router = APIRouter(prefix="/sport", tags=["Sport Proxy"])

SPORT_URL = "http://127.0.0.1:8004"
MAX_RETRIES = 3
RETRY_DELAY = 1.5
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=SPORT_URL,
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(max_connections=20),
        )
    return _client


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_to_sport(path: str, request: Request):
    """Forward all /api/sport/* requests to the Sport Engine on port 8004."""
    last_error = None

    for attempt in range(MAX_RETRIES):
        try:
            client = _get_client()
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
            return Response(
                content=r.content,
                status_code=r.status_code,
                media_type=r.headers.get("content-type", "application/json"),
            )
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"Sport Engine retry {attempt+1}/{MAX_RETRIES}: {e}")
                await asyncio.sleep(RETRY_DELAY)
                global _client
                _client = None
            continue
        except Exception as e:
            logger.error(f"Sport proxy error: {e}")
            raise HTTPException(502, f"Sport proxy error: {str(e)}")

    logger.error(f"Sport Engine not reachable after {MAX_RETRIES} attempts: {last_error}")
    raise HTTPException(503, "Sport Engine starting up, please retry")
