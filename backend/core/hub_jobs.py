"""
Hub Job Client — Write jobs to hub_jobs collection for the Integration Hub to process.

Usage:
    from core.hub_jobs import submit_hub_job
    await submit_hub_job("monday_api_call", {"query": "...", "variables": {}})
    await submit_hub_job("gmail_scan", {})
"""
import uuid
import logging
from datetime import datetime, timezone
from core.database import db

logger = logging.getLogger(__name__)


async def submit_hub_job(
    job_type: str,
    payload: dict,
    priority: int = 2,
    max_retries: int = 3,
    source: str = "main_app",
) -> dict:
    """
    Submit a job to the Integration Hub via hub_jobs collection.

    Args:
        job_type: One of monday_api_call, monday_webhook_sync, gmail_scan, etc.
        payload: Job-specific data
        priority: 1=HIGH, 2=NORMAL, 3=LOW
        max_retries: Number of retries before permanent failure
        source: Identifier for the job origin

    Returns:
        The created job document
    """
    job = {
        "job_id": f"{source}_{uuid.uuid4().hex[:8]}",
        "type": job_type,
        "payload": payload,
        "status": "pending",
        "priority": priority,
        "max_retries": max_retries,
        "retries": 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
    }

    await db.hub_jobs.insert_one(job)
    job.pop("_id", None)
    logger.info(f"[hub_jobs] Submitted {job_type} job: {job['job_id']}")
    return job
