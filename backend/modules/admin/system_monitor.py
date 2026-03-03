"""
System Monitor — Backend health, active users, live connections, frontend perf.
Admin-only endpoints for production monitoring.
"""
from fastapi import APIRouter, Depends, Request
from core.auth import get_admin_user, get_current_user
from core.database import db
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import psutil
import os
import time

router = APIRouter(prefix="/admin/system-monitor", tags=["Admin - System Monitor"])

# In-memory stats
_stats = {"requests": 0, "errors": 0, "slow_requests": 0, "started_at": time.time()}

# Active users tracking: {user_id: last_seen_timestamp}
_active_users = {}
# Recent IPs: {ip: last_seen_timestamp}
_recent_ips = {}
# Frontend perf reports: list of recent reports
_frontend_perf = []
MAX_PERF_REPORTS = 100


def track_request(duration_ms: float, is_error: bool = False):
    _stats["requests"] += 1
    if is_error:
        _stats["errors"] += 1
    if duration_ms > 5000:
        _stats["slow_requests"] += 1


def track_user_activity(user_id: str = None, ip: str = None):
    """Track active user and IP for real-time monitoring"""
    now = time.time()
    if user_id:
        _active_users[user_id] = now
    if ip:
        _recent_ips[ip] = now
    # Cleanup old entries (>10 min)
    cutoff = now - 600
    for d in [_active_users, _recent_ips]:
        stale = [k for k, v in d.items() if v < cutoff]
        for k in stale:
            del d[k]


def _get_active_counts():
    """Get active user/IP counts for different time windows"""
    now = time.time()
    users_5m = sum(1 for v in _active_users.values() if now - v < 300)
    users_1m = sum(1 for v in _active_users.values() if now - v < 60)
    ips_5m = sum(1 for v in _recent_ips.values() if now - v < 300)
    return {"users_5m": users_5m, "users_1m": users_1m, "unique_ips_5m": ips_5m}


def _get_ws_connections():
    """Get WebSocket connection counts from the connection manager"""
    try:
        from modules.realtime.services.websocket_manager import ws_manager
        total = sum(len(s) for s in ws_manager.rooms.values())
        unique_users = len(ws_manager.user_connections)
        rooms = {room: len(conns) for room, conns in ws_manager.rooms.items()}
        return {"total": total, "unique_users": unique_users, "rooms": rooms}
    except Exception:
        return {"total": 0, "unique_users": 0, "rooms": {}}


@router.get("/health")
async def system_health(admin: dict = Depends(get_admin_user)):
    """Comprehensive system health snapshot"""
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    sys_mem = psutil.virtual_memory()

    try:
        db_stats = await db.command("dbStats")
        db_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 1)
        db_collections = db_stats.get("collections", 0)
    except Exception:
        db_size_mb = None
        db_collections = None

    uptime_s = time.time() - _stats["started_at"]
    active = _get_active_counts()
    ws = _get_ws_connections()

    # Frontend perf averages
    fe_avg = {"load_ms": 0, "errors": 0, "reports": len(_frontend_perf)}
    if _frontend_perf:
        fe_avg["load_ms"] = round(sum(r.get("load_ms", 0) for r in _frontend_perf) / len(_frontend_perf))
        fe_avg["errors"] = sum(r.get("js_errors", 0) for r in _frontend_perf)

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_hours": round(uptime_s / 3600, 1),
        "process": {
            "pid": os.getpid(),
            "memory_mb": round(mem.rss / (1024 * 1024), 1),
            "memory_percent": round(proc.memory_percent(), 1),
            "cpu_percent": proc.cpu_percent(interval=0.5),
            "threads": proc.num_threads(),
            "open_files": len(proc.open_files()),
        },
        "system": {
            "total_memory_mb": round(sys_mem.total / (1024 * 1024)),
            "available_memory_mb": round(sys_mem.available / (1024 * 1024)),
            "memory_percent": sys_mem.percent,
            "cpu_count": psutil.cpu_count(),
            "cpu_percent": psutil.cpu_percent(interval=0.5),
            "load_avg": list(os.getloadavg()) if hasattr(os, 'getloadavg') else None,
        },
        "database": {
            "size_mb": db_size_mb,
            "collections": db_collections,
        },
        "requests": {
            "total": _stats["requests"],
            "errors": _stats["errors"],
            "slow_5s": _stats["slow_requests"],
            "error_rate": round(_stats["errors"] / max(_stats["requests"], 1) * 100, 1),
        },
        "active_users": active,
        "websockets": ws,
        "frontend": fe_avg,
    }


# Public endpoint for frontend to report perf (no admin auth needed, just user auth)
@router.post("/frontend-perf")
async def report_frontend_perf(data: dict, request: Request):
    """Frontend reports its performance metrics"""
    report = {
        "load_ms": data.get("load_ms", 0),
        "dom_ready_ms": data.get("dom_ready_ms", 0),
        "js_errors": data.get("js_errors", 0),
        "api_latency_ms": data.get("api_latency_ms", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "ip": request.client.host if request.client else None,
        "user_agent": (request.headers.get("User-Agent") or "")[:100],
    }
    _frontend_perf.append(report)
    # Keep only last N reports
    while len(_frontend_perf) > MAX_PERF_REPORTS:
        _frontend_perf.pop(0)
    return {"ok": True}


@router.get("/logs")
async def recent_logs(lines: int = 50, admin: dict = Depends(get_admin_user)):
    """Get recent backend error logs"""
    try:
        log_path = "/var/log/supervisor/backend.err.log"
        if os.path.exists(log_path):
            with open(log_path, 'r') as f:
                all_lines = f.readlines()
                return {"lines": [l.rstrip() for l in all_lines[-lines:]]}
    except Exception as e:
        return {"error": str(e), "lines": []}
    return {"lines": []}
