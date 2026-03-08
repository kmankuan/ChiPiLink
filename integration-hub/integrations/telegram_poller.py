"""
Telegram Poller — Polls Telegram channel for new posts and saves to DB.
"""
import os
import asyncio
import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger("hub.telegram")


class TelegramPoller:
    def __init__(self, db):
        self.db = db
        self.token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self._client = None
        self._running = False
        self._offset = 0

    def _get_client(self):
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=3, max_keepalive_connections=2),
            )
        return self._client

    async def start(self, interval=120):
        """Start polling loop"""
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN not set — polling disabled")
            return
        
        self._running = True
        logger.info(f"Telegram poller started (interval={interval}s)")
        
        # Get initial offset
        config = await self.db.hub_integrations.find_one({"id": "telegram"}, {"_id": 0})
        self._offset = (config or {}).get("last_offset", 0)
        
        while self._running:
            try:
                await self._poll()
            except Exception as e:
                logger.error(f"Poll error: {e}")
            await asyncio.sleep(interval)

    async def _poll(self):
        """Fetch updates from Telegram"""
        client = self._get_client()
        try:
            r = await client.get(
                f"https://api.telegram.org/bot{self.token}/getUpdates",
                params={"offset": self._offset, "limit": 100, "timeout": 1},
                timeout=15,
            )
            data = r.json()
            if not data.get("ok"):
                return
            
            updates = data.get("result", [])
            if not updates:
                return
            
            for update in updates:
                await self._process_update(update)
                self._offset = update["update_id"] + 1
            
            # Save offset
            await self.db.hub_integrations.update_one(
                {"id": "telegram"},
                {"$set": {"last_offset": self._offset, "last_poll": datetime.now(timezone.utc).isoformat()}},
                upsert=True,
            )
            
            logger.info(f"Processed {len(updates)} Telegram updates")
            
        except httpx.TimeoutException:
            pass  # Normal for long polling

    async def _process_update(self, update):
        """Process a single Telegram update — save channel posts"""
        msg = update.get("channel_post") or update.get("message")
        if not msg:
            return
        
        msg_id = msg.get("message_id")
        chat = msg.get("chat", {})
        
        # Save to community_posts (same collection as main app)
        existing = await self.db.community_posts.find_one({"telegram_msg_id": msg_id})
        if existing:
            return
        
        post = {
            "telegram_msg_id": msg_id,
            "chat_id": chat.get("id"),
            "chat_title": chat.get("title", ""),
            "text": msg.get("text") or msg.get("caption") or "",
            "date": datetime.fromtimestamp(msg.get("date", 0), tz=timezone.utc).isoformat(),
            "has_photo": "photo" in msg,
            "has_video": "video" in msg,
            "source": "telegram_hub",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Handle photos
        if msg.get("photo"):
            largest = max(msg["photo"], key=lambda p: p.get("file_size", 0))
            post["photo_file_id"] = largest.get("file_id")
        
        await self.db.community_posts.insert_one(post)
