"""
System Monitor — Lightweight backend health, active users, frontend perf.
All operations are non-blocking. No CPU-blocking calls.
"""
from fastapi import APIRouter, Depends, Request
from core.auth import get_admin_user
from core.database import db
from datetime import datetime, timezone
try:
    import psutil
except ImportError:
    psutil = None
import os
import time

router = APIRouter(prefix="/admin/system-monitor", tags=["Admin - System Monitor"])

# In-memory stats
_stats = {"requests": 0, "errors": 0, "slow_requests": 0, "started_at": time.time()}
_active_users = {}
_recent_ips = {}
_frontend_perf = []
MAX_PERF_REPORTS = 50
# Cached heavy stats (refreshed max once per 30s)
_cached_heavy = {"data": None, "at": 0}


def track_request(duration_ms: float, is_error: bool = False):
    _stats["requests"] += 1
    if is_error:
        _stats["errors"] += 1
    if duration_ms > 5000:
        _stats["slow_requests"] += 1


def track_user_activity(user_id: str = None, ip: str = None):
    now = time.time()
    if user_id:
        _active_users[user_id] = now
    if ip:
        _recent_ips[ip] = now
    # Cleanup stale entries every ~50 calls
    if _stats["requests"] % 50 == 0:
        cutoff = now - 600
        for d in [_active_users, _recent_ips]:
            stale = [k for k, v in d.items() if v < cutoff]
            for k in stale:
                del d[k]


def _get_active_counts():
    now = time.time()
    return {
        "users_5m": sum(1 for v in _active_users.values() if now - v < 300),
        "users_1m": sum(1 for v in _active_users.values() if now - v < 60),
        "unique_ips_5m": sum(1 for v in _recent_ips.values() if now - v < 300),
    }


def _get_ws_connections():
    try:
        from modules.realtime.services.websocket_manager import ws_manager
        total = sum(len(s) for s in ws_manager.rooms.values())
        return {"total": total, "unique_users": len(ws_manager.user_connections)}
    except Exception:
        return {"total": 0, "unique_users": 0}


@router.get("/health")
async def system_health(admin: dict = Depends(get_admin_user)):
    """Lightweight health snapshot — no blocking calls"""
    if psutil:
        proc = psutil.Process(os.getpid())
        mem = proc.memory_info()
        sys_mem = psutil.virtual_memory()
        process_info = {"memory_mb": round(mem.rss / (1024 * 1024), 1), "cpu_percent": 0, "threads": proc.num_threads()}
        system_info = {"memory_percent": sys_mem.percent, "cpu_percent": psutil.cpu_percent(interval=None)}
    else:
        process_info = {"memory_mb": 0, "cpu_percent": 0, "threads": 0}
        system_info = {"memory_percent": 0, "cpu_percent": 0}
    uptime_s = time.time() - _stats["started_at"]

    fe_avg = {"load_ms": 0, "errors": 0, "reports": len(_frontend_perf)}
    if _frontend_perf:
        fe_avg["load_ms"] = round(sum(r.get("load_ms", 0) for r in _frontend_perf[-20:]) / min(len(_frontend_perf), 20))
        fe_avg["errors"] = sum(r.get("js_errors", 0) for r in _frontend_perf[-20:])

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_hours": round(uptime_s / 3600, 1),
        "process": process_info,
        "system": system_info,
        "database": {"size_mb": None, "collections": None},  # Skip heavy dbStats
        "requests": {
            "total": _stats["requests"],
            "errors": _stats["errors"],
            "slow_5s": _stats["slow_requests"],
            "error_rate": round(_stats["errors"] / max(_stats["requests"], 1) * 100, 1),
        },
        "active_users": _get_active_counts(),
        "websockets": _get_ws_connections(),
        "frontend": fe_avg,
    }


@router.post("/frontend-perf")
async def report_frontend_perf(data: dict, request: Request):
    """Frontend reports its performance metrics"""
    _frontend_perf.append({
        "load_ms": data.get("load_ms", 0),
        "js_errors": data.get("js_errors", 0),
        "api_latency_ms": data.get("api_latency_ms", 0),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })
    while len(_frontend_perf) > MAX_PERF_REPORTS:
        _frontend_perf.pop(0)
    return {"ok": True}


@router.get("/logs")
async def recent_logs(lines: int = 50, admin: dict = Depends(get_admin_user)):
    try:
        log_path = "/var/log/supervisor/backend.err.log"
        if os.path.exists(log_path):
            with open(log_path, 'r') as f:
                all_lines = f.readlines()
                return {"lines": [l.rstrip() for l in all_lines[-lines:]]}
    except Exception as e:
        return {"error": str(e), "lines": []}
    return {"lines": []}
