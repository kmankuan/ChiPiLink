"""
Job Processor — MongoDB Change Streams based (real-time, no polling).
Watches hub_jobs collection for new jobs, processes instantly.
Falls back to polling if Change Streams not available.
"""
import asyncio
import logging
import time
from datetime import datetime, timezone

logger = logging.getLogger("hub.jobs")


class JobProcessor:
    def __init__(self, db, max_concurrent=3):
        self.db = db
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
        """Start watching for jobs — Change Streams first, polling fallback"""
        self._running = True
        
        # Process any existing pending jobs first
        await self._drain_pending()
        
        # Try Change Streams (real-time, zero latency)
        try:
            await self._watch_stream()
        except Exception as e:
            logger.warning(f"Change Streams not available ({e}), falling back to polling")
            await self._poll_loop()

    async def _watch_stream(self):
        """Watch hub_jobs collection with Change Streams — instant job pickup"""
        logger.info("Job processor started (Change Streams mode — real-time)")
        
        pipeline = [{"$match": {
            "operationType": {"$in": ["insert", "update"]},
            "$or": [
                {"fullDocument.status": "pending"},
                {"updateDescription.updatedFields.status": "pending"},
            ]
        }}]
        
        async with self.db.hub_jobs.watch(pipeline, full_document="updateLookup") as stream:
            async for change in stream:
                if not self._running:
                    break
                doc = change.get("fullDocument")
                if doc and doc.get("status") == "pending":
                    doc.pop("_id", None)
                    # Claim the job
                    result = await self.db.hub_jobs.update_one(
                        {"job_id": doc["job_id"], "status": "pending"},
                        {"$set": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    if result.modified_count > 0:
                        asyncio.create_task(self._process(doc))

    async def _poll_loop(self, interval=5):
        """Fallback polling for environments without Change Streams"""
        logger.info(f"Job processor started (polling mode — {interval}s interval)")
        
        while self._running:
            try:
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
                    await asyncio.sleep(interval)
            except Exception as e:
                logger.error(f"Poll error: {e}")
                await asyncio.sleep(interval)

    async def _drain_pending(self):
        """Process any jobs left pending from before startup"""
        count = 0
        while True:
            job = await self.db.hub_jobs.find_one_and_update(
                {"status": "pending"},
                {"$set": {"status": "running", "started_at": datetime.now(timezone.utc).isoformat()}},
                sort=[("priority", 1), ("created_at", 1)],
                return_document=True,
            )
            if not job:
                break
            job.pop("_id", None)
            asyncio.create_task(self._process(job))
            count += 1
        if count:
            logger.info(f"Drained {count} pending jobs from before startup")

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
            await self.db.hub_jobs.update_one(
                {"job_id": job_id},
                {"$set": {
                    "status": "pending",
                    "retries": retries + 1,
                    "last_error": error,
                    "retry_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            logger.warning(f"Job {job_id} retry ({retries+1}/{max_retries}): {error}")
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

