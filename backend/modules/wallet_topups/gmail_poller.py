"""
Gmail Background Polling Service
Automatically scans Gmail inbox at configured intervals for bank transfer alerts.
"""
import asyncio
import logging
from datetime import datetime, timezone

from core.database import db

logger = logging.getLogger(__name__)

SETTINGS_COL = "wallet_topup_settings"
PENDING_COL = "wallet_pending_topups"


class GmailPoller:
    def __init__(self):
        self._task = None
        self._running = False

    @property
    def is_running(self):
        return self._running and self._task and not self._task.done()

    async def start(self):
        """Start the background polling loop if configured."""
        if self.is_running:
            logger.info("[GmailPoller] Already running")
            return

        settings = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
        if not settings or not settings.get("gmail_connected"):
            logger.info("[GmailPoller] Gmail not connected, skipping auto-poll")
            return

        if settings.get("polling_mode") != "realtime":
            logger.info("[GmailPoller] Polling mode is not realtime, skipping")
            return

        self._running = True
        self._task = asyncio.create_task(self._poll_loop())
        logger.info("[GmailPoller] Background polling started")

    async def stop(self):
        """Stop the background polling loop."""
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        self._task = None
        logger.info("[GmailPoller] Background polling stopped")

    async def _poll_loop(self):
        """Main polling loop - scans Gmail at configured intervals."""
        while self._running:
            try:
                settings = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
                if not settings:
                    await asyncio.sleep(60)
                    continue

                # Check if still configured for realtime
                if settings.get("polling_mode") != "realtime" or not settings.get("gmail_connected"):
                    logger.info("[GmailPoller] Settings changed, stopping poll loop")
                    self._running = False
                    break

                interval_minutes = settings.get("polling_interval_minutes", 5)

                # Run the scan
                await self._scan_once()

                # Wait for the configured interval
                await asyncio.sleep(max(interval_minutes * 60, 60))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[GmailPoller] Error in poll loop: {e}")
                await asyncio.sleep(120)  # Wait 2 min on error

    async def _scan_once(self):
        """Perform a single Gmail scan cycle."""
        try:
            from .gmail_service import gmail_service, process_email

            if not gmail_service.is_configured:
                return

            emails = gmail_service.fetch_recent_emails(limit=20)
            created = 0
            skipped = 0

            for em in emails:
                try:
                    result = await process_email(em)
                    if result.get("created"):
                        created += 1
                        # Sync to Monday.com
                        from .monday_sync import payment_alerts_monday
                        topup = result["topup"]
                        dedup = result.get("dedup")
                        try:
                            await payment_alerts_monday.create_topup_item(topup, dedup)
                        except Exception as sync_err:
                            logger.warning(f"[GmailPoller] Monday sync failed: {sync_err}")
                    else:
                        skipped += 1
                except Exception as e:
                    logger.warning(f"[GmailPoller] Error processing email: {e}")

            if created > 0:
                logger.info(f"[GmailPoller] Scan complete: {created} new pending, {skipped} skipped")

            # Update last scan timestamp
            await db[SETTINGS_COL].update_one(
                {"id": "default"},
                {"$set": {"last_auto_scan": datetime.now(timezone.utc).isoformat(), "last_scan_created": created}}
            )

        except Exception as e:
            logger.error(f"[GmailPoller] Scan error: {e}")


gmail_poller = GmailPoller()
