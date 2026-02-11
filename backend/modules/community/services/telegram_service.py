"""
Telegram Channel Service
Fetches posts from a private Telegram channel via Bot API,
stores metadata in MongoDB, and proxies media to users.
"""
import os
import logging
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Dict, List, Optional
from core.database import db

logger = logging.getLogger(__name__)

TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
TELEGRAM_FILE = "https://api.telegram.org/file/bot{token}/{path}"


class TelegramService:
    def __init__(self):
        self.token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
        self._polling = False
        self._poll_task = None

    def _url(self, method: str) -> str:
        return TELEGRAM_API.format(token=self.token, method=method)

    def _file_url(self, path: str) -> str:
        return TELEGRAM_FILE.format(token=self.token, path=path)

    # ---- Bot API Calls ----

    async def get_me(self) -> Optional[Dict]:
        async with httpx.AsyncClient() as client:
            r = await client.get(self._url("getMe"), timeout=10)
            data = r.json()
            return data.get("result") if data.get("ok") else None

    async def get_updates(self, offset: int = 0, limit: int = 100) -> List[Dict]:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                self._url("getUpdates"),
                params={"offset": offset, "limit": limit, "timeout": 1},
                timeout=15
            )
            data = r.json()
            return data.get("result", []) if data.get("ok") else []

    async def get_file(self, file_id: str) -> Optional[str]:
        """Get a temporary download URL for a file"""
        async with httpx.AsyncClient() as client:
            r = await client.get(
                self._url("getFile"),
                params={"file_id": file_id},
                timeout=10
            )
            data = r.json()
            if data.get("ok"):
                path = data["result"].get("file_path")
                return self._file_url(path) if path else None
            return None

    async def get_file_bytes(self, file_id: str) -> Optional[bytes]:
        """Download file content as bytes (for proxying)"""
        url = await self.get_file(file_id)
        if not url:
            return None
        async with httpx.AsyncClient() as client:
            r = await client.get(url, timeout=30)
            return r.content if r.status_code == 200 else None

    # ---- Config ----

    async def get_config(self) -> Dict:
        doc = await db.community_config.find_one(
            {"type": "telegram"}, {"_id": 0}
        )
        return doc or {
            "type": "telegram",
            "channel_id": None,
            "channel_title": "",
            "last_update_id": 0,
            "auto_sync": True,
            "poll_interval": 120,
            "visibility": "all_users",
        }

    async def save_config(self, data: Dict):
        data["type"] = "telegram"
        await db.community_config.update_one(
            {"type": "telegram"},
            {"$set": data},
            upsert=True
        )

    # ---- Sync / Polling ----

    async def sync_once(self) -> Dict:
        """Pull new updates from Telegram and store posts"""
        config = await self.get_config()
        offset = config.get("last_update_id", 0)
        if offset:
            offset += 1

        updates = await self.get_updates(offset=offset)
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
                await self.save_config(config)
                logger.info(f"Auto-detected channel: {chat['id']} ({chat.get('title')})")

            stored = await self._store_post(post_data)
            if stored:
                new_count += 1

        # Update last processed update ID
        await db.community_config.update_one(
            {"type": "telegram"},
            {"$set": {"last_update_id": last_id}},
            upsert=True
        )

        return {"new_posts": new_count, "last_update_id": last_id}

    async def _store_post(self, post: Dict) -> bool:
        """Store a channel post in MongoDB"""
        msg_id = post.get("message_id")
        chat_id = post.get("chat", {}).get("id")
        if not msg_id or not chat_id:
            return False

        # Check for duplicate
        exists = await db.community_posts.find_one(
            {"telegram_msg_id": msg_id, "channel_id": chat_id}
        )
        if exists:
            return False

        # Extract media info
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

        await db.community_posts.insert_one(doc)
        logger.info(f"Stored post {msg_id} from channel {chat_id}")
        return True

    def _extract_media(self, post: Dict) -> List[Dict]:
        """Extract media items from a post"""
        media = []
        if post.get("photo"):
            # Get largest photo
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

    # ---- Background Polling ----

    async def start_polling(self):
        """Start background polling loop"""
        if self._polling:
            return
        self._polling = True
        self._poll_task = asyncio.create_task(self._poll_loop())
        logger.info("Telegram polling started")

    async def stop_polling(self):
        """Stop background polling"""
        self._polling = False
        if self._poll_task:
            self._poll_task.cancel()
            self._poll_task = None
        logger.info("Telegram polling stopped")

    async def _poll_loop(self):
        """Background loop that polls for new posts"""
        while self._polling:
            try:
                config = await self.get_config()
                if config.get("auto_sync", True):
                    result = await self.sync_once()
                    if result["new_posts"] > 0:
                        logger.info(f"Synced {result['new_posts']} new posts")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Telegram poll error: {e}")

            config = await self.get_config()
            interval = config.get("poll_interval", 120)
            await asyncio.sleep(interval)


telegram_service = TelegramService()
