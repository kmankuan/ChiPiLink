"""
Monday.com Banner Auto-Sync Scheduler
Uses APScheduler to periodically sync banners from Monday.com.
Default interval: 10 minutes, configurable from admin panel.
"""
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

JOB_ID = "monday_banner_auto_sync"
DEFAULT_INTERVAL_MINUTES = 10


class BannerSyncScheduler:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self._started = False

    async def _run_sync(self):
        """Execute the Monday.com banner sync job."""
        from modules.showcase.monday_banner_adapter import monday_banner_adapter
        try:
            config = await monday_banner_adapter.get_config()
            if not config.get("enabled"):
                logger.info("Monday banner sync skipped — integration disabled")
                return
            auto_cfg = config.get("auto_sync", {})
            if not auto_cfg.get("enabled", False):
                logger.info("Monday banner auto-sync skipped — auto-sync disabled")
                return
            result = await monday_banner_adapter.sync_from_monday(trigger="auto")
            logger.info(f"Auto-sync completed: {result}")
        except Exception as e:
            logger.error(f"Auto-sync error: {e}")

    def start(self, interval_minutes: int = DEFAULT_INTERVAL_MINUTES):
        """Start the scheduler with the given interval."""
        if not self._started:
            self.scheduler.start()
            self._started = True

        # Remove existing job if any
        if self.scheduler.get_job(JOB_ID):
            self.scheduler.remove_job(JOB_ID)

        self.scheduler.add_job(
            self._run_sync,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id=JOB_ID,
            replace_existing=True,
            name="Monday.com Banner Auto-Sync",
        )
        logger.info(f"Banner auto-sync scheduled every {interval_minutes} minutes")

    def stop(self):
        """Stop the scheduler."""
        if self._started:
            self.scheduler.shutdown(wait=False)
            self._started = False
            logger.info("Banner auto-sync scheduler stopped")

    def update_interval(self, interval_minutes: int):
        """Reschedule with a new interval."""
        if self._started:
            self.scheduler.reschedule_job(
                JOB_ID,
                trigger=IntervalTrigger(minutes=interval_minutes),
            )
            logger.info(f"Banner auto-sync rescheduled to every {interval_minutes} minutes")
        else:
            self.start(interval_minutes)

    def pause(self):
        """Pause the auto-sync job."""
        if self._started and self.scheduler.get_job(JOB_ID):
            self.scheduler.pause_job(JOB_ID)
            logger.info("Banner auto-sync paused")

    def resume(self, interval_minutes: int = DEFAULT_INTERVAL_MINUTES):
        """Resume the auto-sync job."""
        if self._started and self.scheduler.get_job(JOB_ID):
            self.scheduler.resume_job(JOB_ID)
            logger.info("Banner auto-sync resumed")
        else:
            self.start(interval_minutes)

    def get_status(self) -> dict:
        """Get current scheduler status."""
        job = self.scheduler.get_job(JOB_ID) if self._started else None
        if job:
            return {
                "running": True,
                "paused": job.next_run_time is None,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
        return {"running": False, "paused": False, "next_run": None}


banner_sync_scheduler = BannerSyncScheduler()
