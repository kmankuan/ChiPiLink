"""
Commerce Engine Proxy — Routes store/sysbook/platform-store API calls through
main app (port 8001) to the Commerce Engine (port 8005).
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
import httpx
import logging

logger = logging.getLogger("commerce_proxy")

COMMERCE_URL = "http://127.0.0.1:8005"
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=COMMERCE_URL, timeout=httpx.Timeout(60.0, connect=3.0)
        )
    return _client


async def _proxy(request: Request, prefix: str, path: str):
    """Generic proxy handler for commerce routes."""
    client = _get_client()
    try:
        body = await request.body()
        headers = {"Content-Type": request.headers.get("content-type", "application/json")}
        auth = request.headers.get("authorization")
        if auth:
            headers["Authorization"] = auth

        r = await client.request(
            request.method,
            f"/api/{prefix}/{path}",
            content=body,
            headers=headers,
            params=dict(request.query_params),
        )
        return Response(
            content=r.content,
            status_code=r.status_code,
            media_type=r.headers.get("content-type", "application/json"),
        )
    except httpx.ConnectError:
        raise HTTPException(503, f"Commerce Engine not reachable (port 8005)")
    except httpx.ConnectTimeout:
        raise HTTPException(504, "Commerce Engine timeout")
    except Exception as e:
        logger.error(f"Commerce proxy error: {e}")
        raise HTTPException(502, f"Commerce proxy error: {str(e)}")


# ─── Store routes (/api/store/*) ───
store_router = APIRouter(prefix="/store", tags=["Store Proxy"])

@store_router.get("")
async def proxy_store_root(request: Request):
    return await _proxy(request, "store", "")

@store_router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_store(path: str, request: Request):
    return await _proxy(request, "store", path)


# ─── Sysbook routes (/api/sysbook/*) ───
sysbook_router = APIRouter(prefix="/sysbook", tags=["Sysbook Proxy"])

@sysbook_router.get("")
async def proxy_sysbook_root(request: Request):
    return await _proxy(request, "sysbook", "")

@sysbook_router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_sysbook(path: str, request: Request):
    return await _proxy(request, "sysbook", path)


# ─── Platform Store routes (/api/platform-store/*) ───
platform_store_router = APIRouter(prefix="/platform-store", tags=["Platform Store Proxy"])

@platform_store_router.get("")
async def proxy_platform_store_root(request: Request):
    return await _proxy(request, "platform-store", "")

@platform_store_router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def proxy_platform_store(path: str, request: Request):
    return await _proxy(request, "platform-store", path)
