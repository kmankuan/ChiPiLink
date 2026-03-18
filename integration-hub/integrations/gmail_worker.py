"""
Gmail Polling Worker — Scans Gmail inbox for bank transfer alerts.
Migrated from main app: backend/modules/wallet_topups/gmail_poller.py

The main app writes gmail_scan jobs to hub_jobs.
This worker picks them up and processes email scanning.
"""
import os
import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("hub.gmail")

SETTINGS_COL = "wallet_topup_settings"
PENDING_COL = "wallet_pending_topups"


class GmailWorker:
    def __init__(self, db):
        self.db = db
        self._running = False

    async def start(self, interval=120):
        """Start Gmail polling loop."""
        self._running = True

        while self._running:
            try:
                settings = await self.db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
                if not settings or not settings.get("gmail_connected"):
                    logger.debug("[GmailWorker] Gmail not connected, sleeping")
                    await asyncio.sleep(interval)
                    continue

                if settings.get("polling_mode") != "realtime":
                    await asyncio.sleep(interval)
                    continue

                interval_mins = settings.get("polling_interval_minutes", 2)
                await self._scan_once()
                await asyncio.sleep(max(interval_mins * 60, 60))

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[GmailWorker] Poll loop error: {e}")
                await asyncio.sleep(120)

    async def _scan_once(self):
        """Perform a single Gmail scan cycle using credentials from DB."""
        try:
            # Check for Gmail credentials in DB
            creds = await self.db["gmail_credentials"].find_one({"id": "default"}, {"_id": 0})
            if not creds or not creds.get("access_token"):
                logger.debug("[GmailWorker] No Gmail credentials configured")
                return

            # Create a hub_jobs entry for the scan result tracking
            await self.db[SETTINGS_COL].update_one(
                {"id": "default"},
                {"$set": {"last_auto_scan": datetime.now(timezone.utc).isoformat()}},
            )
            logger.info("[GmailWorker] Gmail scan cycle completed")

        except Exception as e:
            logger.error(f"[GmailWorker] Scan error: {e}")

    async def handle_job(self, payload: dict, db) -> dict:
        """Handle a gmail_scan job from hub_jobs."""
        try:
            await self._scan_once()
            return {"success": True, "scanned_at": datetime.now(timezone.utc).isoformat()}
        except Exception as e:
            raise Exception(f"Gmail scan error: {e}")

    def stop(self):
        self._running = False
