"""
Dashboard routes — Overview of all integrations and system health.
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import psutil
import os
import time

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/status")
async def hub_status():
    """Full Integration Hub status"""
    from main import db, job_processor
    
    # System health
    proc = psutil.Process(os.getpid())
    mem = proc.memory_info()
    
    # Job stats
    pending = await db.hub_jobs.count_documents({"status": "pending"})
    running = await db.hub_jobs.count_documents({"status": "running"})
    failed = await db.hub_jobs.count_documents({"status": "failed"})
    done_today = await db.hub_jobs.count_documents({
        "status": "done",
        "completed_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()}
    })
    
    # Integration health
    integrations = await db.hub_integrations.find({}, {"_id": 0}).to_list(20)
    
    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "system": {
            "memory_mb": round(mem.rss / (1024 * 1024), 1),
            "cpu_percent": psutil.cpu_percent(interval=None),
            "uptime_hours": round((time.time() - job_processor.stats["started_at"]) / 3600, 1),
        },
        "jobs": {
            "pending": pending,
            "running": running,
            "failed": failed,
            "done_today": done_today,
            "total_processed": job_processor.stats["processed"],
            "total_failed": job_processor.stats["failed"],
        },
        "integrations": integrations,
    }
