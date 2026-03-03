"""
System Monitor — Exposes backend health, memory, CPU, and request stats.
Admin-only endpoints for production monitoring.
"""
from fastapi import APIRouter, Depends
from core.auth import get_admin_user
from core.database import db
from datetime import datetime, timezone
import psutil
import os
import asyncio
import time

router = APIRouter(prefix="/admin/system-monitor", tags=["Admin - System Monitor"])

# Simple in-memory request counter
_stats = {"requests": 0, "errors": 0, "slow_requests": 0, "started_at": time.time()}


def track_request(duration_ms: float, is_error: bool = False):
    _stats["requests"] += 1
    if is_error:
        _stats["errors"] += 1
    if duration_ms > 5000:
        _stats["slow_requests"] += 1


@router.get("/health")
async def system_health(admin: dict = Depends(get_admin_user)):
    """Comprehensive system health snapshot"""
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    sys_mem = psutil.virtual_memory()

    # DB stats
    try:
        db_stats = await db.command("dbStats")
        db_size_mb = round(db_stats.get("dataSize", 0) / (1024 * 1024), 1)
        db_collections = db_stats.get("collections", 0)
    except Exception:
        db_size_mb = None
        db_collections = None

    uptime_s = time.time() - _stats["started_at"]

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
    }


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
