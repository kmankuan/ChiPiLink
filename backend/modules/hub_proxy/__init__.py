"""
Integration Hub Proxy — Routes Hub API calls through the main app backend.
This allows the frontend (which only talks to port 8001) to access Hub APIs.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
import httpx
import logging

from core.auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/hub", tags=["Integration Hub Proxy"])

HUB_URL = "http://127.0.0.1:8002"
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=HUB_URL,
            timeout=httpx.Timeout(30.0, connect=3.0),
        )
    return _client


async def _proxy(method: str, path: str, body: dict = None) -> dict:
    """Forward a request to the Hub and return the response."""
    client = _get_client()
    try:
        if method == "GET":
            r = await client.get(f"/api{path}")
        elif method == "POST":
            r = await client.post(f"/api{path}", json=body or {})
        elif method == "PUT":
            r = await client.put(f"/api{path}", json=body or {})
        elif method == "DELETE":
            r = await client.delete(f"/api{path}")
        else:
            raise HTTPException(400, f"Unsupported method: {method}")
        return r.json()
    except httpx.ConnectError:
        raise HTTPException(503, "Integration Hub not reachable")
    except httpx.ConnectTimeout:
        raise HTTPException(504, "Integration Hub timeout")


# ═══ Dashboard ═══
@router.get("/status")
async def hub_status(admin: dict = Depends(get_admin_user)):
    """Get full Hub status — system health, job counts, integrations"""
    return await _proxy("GET", "/dashboard/status")


# ═══ Jobs ═══
@router.get("/jobs")
async def list_jobs(status: str = None, type: str = None, limit: int = 50, admin: dict = Depends(get_admin_user)):
    """List Hub jobs with optional filters"""
    params = []
    if status: params.append(f"status={status}")
    if type: params.append(f"type={type}")
    params.append(f"limit={limit}")
    path = f"/jobs/?{'&'.join(params)}"
    return await _proxy("GET", path)


@router.post("/jobs/trigger")
async def trigger_job(data: dict, admin: dict = Depends(get_admin_user)):
    """Manually trigger a Hub job"""
    return await _proxy("POST", "/jobs/trigger", data)


@router.post("/jobs/{job_id}/retry")
async def retry_job(job_id: str, admin: dict = Depends(get_admin_user)):
    """Retry a failed job"""
    return await _proxy("POST", f"/jobs/{job_id}/retry")


@router.post("/jobs/retry-all-failed")
async def retry_all_failed(admin: dict = Depends(get_admin_user)):
    """Retry all failed jobs"""
    return await _proxy("POST", "/jobs/retry-all-failed")


@router.delete("/jobs/{job_id}")
async def cancel_job(job_id: str, admin: dict = Depends(get_admin_user)):
    """Cancel a pending job"""
    return await _proxy("DELETE", f"/jobs/{job_id}")


# ═══ Integrations ═══
@router.get("/integrations")
async def list_integrations(admin: dict = Depends(get_admin_user)):
    """List all integrations with status"""
    return await _proxy("GET", "/integrations/")


@router.put("/integrations/{integration_id}")
async def update_integration(integration_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update integration config"""
    return await _proxy("PUT", f"/integrations/{integration_id}", data)


@router.post("/integrations/{integration_id}/test")
async def test_connection(integration_id: str, admin: dict = Depends(get_admin_user)):
    """Test an integration's connection"""
    return await _proxy("POST", f"/integrations/{integration_id}/test")


# ═══ Debug ═══
@router.get("/connections")
async def test_connections(admin: dict = Depends(get_admin_user)):
    """Test all connections"""
    return await _proxy("GET", "/debug/connections")


@router.get("/env")
async def check_env(admin: dict = Depends(get_admin_user)):
    """Check which env vars are set"""
    return await _proxy("GET", "/debug/env")


@router.get("/webhook-logs")
async def webhook_logs(limit: int = 50, admin: dict = Depends(get_admin_user)):
    """View recent webhook activity"""
    return await _proxy("GET", f"/debug/webhook-logs?limit={limit}")


# ═══ Monday Proxy Stats ═══
@router.get("/monday/stats")
async def monday_stats(admin: dict = Depends(get_admin_user)):
    """Get Monday proxy stats"""
    return await _proxy("GET", "/monday/stats")
