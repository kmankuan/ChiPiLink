"""
Job Processor — MongoDB-based job queue.
Polls hub_jobs collection, processes jobs via registered handlers.
"""
import asyncio
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger("hub.jobs")


class JobProcessor:
    def __init__(self, db, poll_interval=5, max_concurrent=3):
        self.db = db
        self.poll_interval = poll_interval
        self.max_concurrent = max_concurrent
        self._running = False
        self._handlers = {}
        self._semaphore = asyncio.Semaphore(max_concurrent)
        self.stats = {"processed": 0, "failed": 0, "started_at": time.time()}

    def register(self, job_type: str, handler):
        """Register a handler function for a job type"""
        self._handlers[job_type] = handler
        logger.info(f"Registered handler: {job_type}")

    def stop(self):
        self._running = False

    async def start(self):
        """Main polling loop"""
        self._running = True
        logger.info(f"Job processor started (poll={self.poll_interval}s, max_concurrent={self.max_concurrent})")
        
        while self._running:
            try:
                # Pick up pending jobs (oldest first, respect priority)
                job = await self.db.hub_jobs.find_one_and_update(
                    {"status": "pending"},
                    {"$set": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}},
                    sort=[("priority", 1), ("created_at", 1)],
                    return_document=True,
                )
                
                if job:
                    job.pop("_id", None)
                    asyncio.create_task(self._process(job))
                else:
                    await asyncio.sleep(self.poll_interval)
                    
            except Exception as e:
                logger.error(f"Poll error: {e}")
                await asyncio.sleep(self.poll_interval)

    async def _process(self, job):
        """Process a single job"""
        job_id = job.get("job_id", "?")
        job_type = job.get("type", "unknown")
        
        async with self._semaphore:
            handler = self._handlers.get(job_type)
            if not handler:
                await self._fail(job_id, f"No handler for job type: {job_type}")
                return
            
            try:
                logger.info(f"Processing job {job_id} ({job_type})")
                result = await handler(job.get("payload", {}), self.db)
                
                await self.db.hub_jobs.update_one(
                    {"job_id": job_id},
                    {"$set": {
                        "status": "done",
                        "result": result,
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )
                self.stats["processed"] += 1
                logger.info(f"Job {job_id} completed")
                
            except Exception as e:
                await self._fail(job_id, str(e))

    async def _fail(self, job_id, error):
        """Mark job as failed with retry logic"""
        self.stats["failed"] += 1
        
        job = await self.db.hub_jobs.find_one({"job_id": job_id}, {"_id": 0})
        retries = (job or {}).get("retries", 0)
        max_retries = (job or {}).get("max_retries", 3)
        
        if retries < max_retries:
            # Re-queue with backoff
            await self.db.hub_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "pending",
                    "retries": retries + 1,
                    "last_error": error,
                    "retry_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.warning(f"Job {job_id} failed, retrying ({retries+1}/{max_retries}): {error}")
        else:
            await self.db.hub_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "failed",
                    "error": error,
                    "failed_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.error(f"Job {job_id} permanently failed: {error}")

    def get_stats(self):
        return {
            **self.stats,
            "handlers": list(self._handlers.keys()),
            "uptime_hours": round((time.time() - self.stats["started_at"]) / 3600, 1),
        }
