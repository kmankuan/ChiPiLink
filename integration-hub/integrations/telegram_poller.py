"""
Telegram Poller — Polls Telegram channel for new posts and saves to DB.
Migrated from main app: backend/modules/community/services/telegram_service.py
"""
import os
import asyncio
import logging
import httpx
from datetime import datetime, timezone
from typing import Dict, List, Optional

logger = logging.getLogger("hub.telegram")

TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
TELEGRAM_FILE = "https://api.telegram.org/file/bot{token}/{path}"


class TelegramPoller:
    def __init__(self, db):
        self.db = db
        self.token = os.environ.get("TELEGRAM_BOT_TOKEN", "") or "8570389871:AAEfRrW61WwfFYKwy4KhliQ0wpeazSPlceM"
        self._client = None
        self._running = False

    def _get_client(self):
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=3, max_keepalive_connections=2),
            )
        return self._client

    def _url(self, method: str) -> str:
        return TELEGRAM_API.format(token=self.token, method=method)

    def _file_url(self, path: str) -> str:
        return TELEGRAM_FILE.format(token=self.token, path=path)

    async def start(self, interval=120):
        """Start polling loop"""
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN not set — polling disabled")
            return

        self._running = True
        logger.info(f"Telegram poller started (interval={interval}s)")

        # Get initial config
        config = await self.db.community_config.find_one({"type": "telegram"}, {"_id": 0})
        if not config:
            config = {"type": "telegram", "last_update_id": 0, "auto_sync": True, "poll_interval": interval}

        while self._running:
            try:
                if config.get("auto_sync", True):
                    result = await self._sync_once(config)
                    if result["new_posts"] > 0:
                        logger.info(f"Synced {result['new_posts']} new posts")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Poll error: {e}")

            # Reload config for interval changes
            config = await self.db.community_config.find_one({"type": "telegram"}, {"_id": 0}) or config
            poll_interval = config.get("poll_interval", interval)
            if poll_interval < 10:
                poll_interval = 10
            await asyncio.sleep(poll_interval)

    async def _sync_once(self, config: Dict) -> Dict:
        """Pull new updates from Telegram and store posts"""
        offset = config.get("last_update_id", 0)
        if offset:
            offset += 1

        client = self._get_client()
        r = await client.get(
            self._url("getUpdates"),
            params={"offset": offset, "limit": 100, "timeout": 1},
            timeout=15,
        )
        data = r.json()
        updates = data.get("result", []) if data.get("ok") else []

        if not updates:
            return {"new_posts": 0, "last_update_id": offset}

        new_count = 0
        last_id = offset

        for update in updates:
            last_id = max(last_id, update.get("update_id", 0))
            post_data = update.get("channel_post") or update.get("edited_channel_post")
            if not post_data:
                continue

            chat = post_data.get("chat", {})
            # Auto-detect channel ID
            if not config.get("channel_id") and chat.get("type") == "channel":
                config["channel_id"] = chat["id"]
                config["channel_title"] = chat.get("title", "")
                await self.db.community_config.update_one(
                    {"type": "telegram"}, {"$set": config}, upsert=True
                )
                logger.info(f"Auto-detected channel: {chat['id']} ({chat.get('title')})")

            stored = await self._store_post(post_data)
            if stored:
                new_count += 1

        # Update last processed update ID
        await self.db.community_config.update_one(
            {"type": "telegram"},
            {"$set": {"last_update_id": last_id}},
            upsert=True,
        )

        return {"new_posts": new_count, "last_update_id": last_id}

    async def _store_post(self, post: Dict) -> bool:
        """Store a channel post in MongoDB"""
        msg_id = post.get("message_id")
        chat_id = post.get("chat", {}).get("id")
        if not msg_id or not chat_id:
            return False

        exists = await self.db.community_posts.find_one(
            {"telegram_msg_id": msg_id, "channel_id": chat_id}
        )
        if exists:
            return False

        media = self._extract_media(post)

        doc = {
            "telegram_msg_id": msg_id,
            "channel_id": chat_id,
            "text": post.get("text") or post.get("caption") or "",
            "media": media,
            "media_group_id": post.get("media_group_id"),
            "date": datetime.fromtimestamp(post.get("date", 0), tz=timezone.utc).isoformat(),
            "synced_at": datetime.now(timezone.utc).isoformat(),
            "likes_count": 0,
            "comments_count": 0,
        }

        await self.db.community_posts.insert_one(doc)
        logger.info(f"Stored post {msg_id} from channel {chat_id}")
        return True

    def _extract_media(self, post: Dict) -> List[Dict]:
        """Extract media items from a post"""
        media = []
        if post.get("photo"):
            largest = max(post["photo"], key=lambda p: p.get("width", 0) * p.get("height", 0))
            media.append({
                "type": "photo",
                "file_id": largest["file_id"],
                "file_unique_id": largest.get("file_unique_id", ""),
                "width": largest.get("width", 0),
                "height": largest.get("height", 0),
            })
        if post.get("video"):
            v = post["video"]
            thumb = v.get("thumbnail") or v.get("thumb")
            media.append({
                "type": "video",
                "file_id": v["file_id"],
                "file_unique_id": v.get("file_unique_id", ""),
                "duration": v.get("duration", 0),
                "width": v.get("width", 0),
                "height": v.get("height", 0),
                "thumb_file_id": thumb.get("file_id") if thumb else None,
            })
        if post.get("document"):
            d = post["document"]
            media.append({
                "type": "document",
                "file_id": d["file_id"],
                "file_name": d.get("file_name", ""),
                "mime_type": d.get("mime_type", ""),
            })
        if post.get("animation"):
            a = post["animation"]
            media.append({
                "type": "animation",
                "file_id": a["file_id"],
                "width": a.get("width", 0),
                "height": a.get("height", 0),
            })
        return media

    def stop(self):
        self._running = False
