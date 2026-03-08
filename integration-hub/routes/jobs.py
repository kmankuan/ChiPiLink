"""
Job management routes — View, retry, cancel, trigger jobs.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/")
async def list_jobs(status: str = None, type: str = None, limit: int = 50):
    """List jobs with optional filters"""
    from main import db
    
    query = {}
    if status: query["status"] = status
    if type: query["type"] = type
    
    jobs = await db.hub_jobs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    counts = {
        "pending": await db.hub_jobs.count_documents({"status": "pending"}),
        "running": await db.hub_jobs.count_documents({"status": "running"}),
        "done": await db.hub_jobs.count_documents({"status": "done"}),
        "failed": await db.hub_jobs.count_documents({"status": "failed"}),
    }
    return {"jobs": jobs, "counts": counts}


@router.post("/trigger")
async def trigger_job(data: dict):
    """Manually trigger a job"""
    from main import db
    
    job_type = data.get("type")
    if not job_type:
        raise HTTPException(400, "Job type required")
    
    job = {
        "job_id": f"manual_{uuid.uuid4().hex[:8]}",
        "type": job_type,
        "payload": data.get("payload", {}),
        "status": "pending",
        "priority": data.get("priority", 2),
        "max_retries": 3,
        "retries": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "manual",
    }
    await db.hub_jobs.insert_one(job)
    job.pop("_id", None)
    return {"success": True, "job": job}


@router.post("/{job_id}/retry")
async def retry_job(job_id: str):
    """Retry a failed job"""
    from main import db
    
    result = await db.hub_jobs.update_one(
        {"job_id": job_id, "status": "failed"},
        {"$set": {"status": "pending", "retries": 0, "retry_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found or not in failed state")
    return {"success": True}


@router.post("/retry-all-failed")
async def retry_all_failed():
    """Retry all failed jobs"""
    from main import db
    
    result = await db.hub_jobs.update_many(
        {"status": "failed"},
        {"$set": {"status": "pending", "retries": 0, "retry_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "retried": result.modified_count}


@router.delete("/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a pending job"""
    from main import db
    
    result = await db.hub_jobs.update_one(
        {"job_id": job_id, "status": "pending"},
        {"$set": {"status": "cancelled"}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Job not found or not pending")
    return {"success": True}
