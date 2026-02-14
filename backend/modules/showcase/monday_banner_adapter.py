"""
Monday.com Banner Adapter
Syncs banner items from a dedicated Monday.com board.
Flow: Canva design URL -> Monday.com board item -> App banner carousel

Supports:
- Webhook-based real-time sync (primary)
- Scheduled polling sync (fallback safety net)
- Manual sync via admin panel

Each Monday.com item maps to a banner with:
- Name -> overlay_text or title
- Canva URL column -> image_url
- Text column -> banner text (for text-type banners)
- Background color column -> bg_color
- Start Date column -> schedule start
- End Date column -> schedule end
- Status column -> active/paused
"""
import logging
import json
import os
from datetime import datetime, timezone

from core.database import db
from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

CONFIG_KEY = "monday_banner_config"


class MondayBannerAdapter:
    """Syncs banners from Monday.com board to showcase_banners collection"""

    async def get_config(self) -> dict:
        doc = await db.app_config.find_one({"config_key": CONFIG_KEY}, {"_id": 0})
        if doc:
            return doc.get("value", {})
        return {
            "enabled": False,
            "board_id": "",
            "columns": {
                "canva_url": "",
                "text": "",
                "bg_color": "",
                "link_url": "",
                "start_date": "",
                "end_date": "",
                "status": "",
                "banner_type": "",
            },
            "last_sync": None,
            "sync_count": 0,
            "webhook": {"registered": False, "webhook_id": None},
        }

    async def save_config(self, config: dict):
        await db.app_config.update_one(
            {"config_key": CONFIG_KEY},
            {"$set": {
                "config_key": CONFIG_KEY,
                "value": config,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

    # --- Webhook handling ---

    async def register_webhook(self) -> dict:
        """Register a webhook with Monday.com for real-time banner sync."""
        config = await self.get_config()
        board_id = config.get("board_id")
        if not board_id:
            return {"status": "error", "message": "No board_id configured"}

        base_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        if not base_url:
            return {"status": "error", "message": "FRONTEND_URL not configured"}
        webhook_url = f"{base_url}/api/monday/webhooks/incoming"

        try:
            webhook_id = await monday_client.register_webhook(
                board_id=board_id,
                url=webhook_url,
                event="change_column_value"
            )
            if webhook_id:
                config["webhook"] = {
                    "registered": True,
                    "webhook_id": webhook_id,
                    "url": webhook_url,
                    "registered_at": datetime.now(timezone.utc).isoformat(),
                }
                await self.save_config(config)

                from modules.integrations.monday.webhook_router import register_handler
                register_handler(board_id, self.handle_webhook)

                logger.info(f"Monday.com banner webhook registered: {webhook_id}")
                return {"status": "ok", "webhook_id": webhook_id}
            return {"status": "error", "message": "No webhook_id returned"}
        except Exception as e:
            logger.error(f"Failed to register banner webhook: {e}")
            return {"status": "error", "message": str(e)}

    async def unregister_webhook(self) -> dict:
        """Remove the webhook from Monday.com."""
        config = await self.get_config()
        webhook_info = config.get("webhook", {})
        webhook_id = webhook_info.get("webhook_id")
        board_id = config.get("board_id")

        if webhook_id:
            try:
                await monday_client.delete_webhook(webhook_id)
            except Exception as e:
                logger.warning(f"Failed to delete webhook from Monday: {e}")

        if board_id:
            from modules.integrations.monday.webhook_router import unregister_handler
            unregister_handler(board_id)

        config["webhook"] = {"registered": False, "webhook_id": None}
        await self.save_config(config)
        return {"status": "ok"}

    async def handle_webhook(self, event: dict) -> dict:
        """
        Handle incoming Monday.com webhook events for the banner board.
        Triggers a full sync when any item changes.
        """
        logger.info(f"[banner_webhook] Received event: type={event.get('type')}, item={event.get('pulseId')}")
        result = await self.sync_from_monday(trigger="webhook")
        return {"status": "synced", "result": result}

    async def ensure_local_handler(self):
        """Register the local webhook handler if a board is configured (called on startup)."""
        config_doc = await db.app_config.find_one({"config_key": CONFIG_KEY}, {"_id": 0})
        if not config_doc:
            return
        config = config_doc.get("value", {})
        board_id = config.get("board_id")
        webhook_info = config.get("webhook", {})
        if board_id and config.get("enabled") and webhook_info.get("registered"):
            from modules.integrations.monday.webhook_router import register_handler
            register_handler(board_id, self.handle_webhook)
            logger.info(f"Banner webhook handler re-registered for board {board_id}")

    # --- Column value parsing ---

    def _parse_column_value(self, col_value: dict) -> str:
        """Extract usable value from Monday.com column_values entry"""
        text = col_value.get("text", "")
        value_raw = col_value.get("value")
        if text:
            return text
        if value_raw:
            try:
                parsed = json.loads(value_raw)
                if isinstance(parsed, dict):
                    if "label" in parsed:
                        return parsed["label"]
                    if "date" in parsed:
                        return parsed["date"]
                    if "color" in parsed:
                        return parsed["color"]
                    if "url" in parsed:
                        return parsed["url"]
                return str(parsed)
            except (json.JSONDecodeError, TypeError):
                return str(value_raw)
        return ""

    async def sync_from_monday(self, trigger: str = "manual") -> dict:
        """
        Fetch all items from the configured banner board,
        create/update banners in the local DB.
        """
        config = await self.get_config()
        if not config.get("enabled") or not config.get("board_id"):
            return {"status": "skipped", "message": "Monday.com banner sync not configured"}

        board_id = config["board_id"]
        col_map = config.get("columns", {})

        try:
            data = await monday_client.execute(f"""
                query {{
                    boards(ids: [{board_id}]) {{
                        items_page(limit: 100) {{
                            items {{
                                id
                                name
                                column_values {{
                                    id
                                    text
                                    value
                                }}
                            }}
                        }}
                    }}
                }}
            """)

            boards = data.get("boards", [])
            if not boards:
                await self._log_sync(trigger, "error", 0, "Board not found")
                return {"status": "error", "message": "Board not found"}

            items = boards[0].get("items_page", {}).get("items", [])
            synced = 0
            skipped = 0

            for item in items:
                monday_id = item["id"]
                item_name = item["name"]
                cols = {cv["id"]: cv for cv in item.get("column_values", [])}

                canva_url = self._parse_column_value(cols.get(col_map.get("canva_url", ""), {}))
                text = self._parse_column_value(cols.get(col_map.get("text", ""), {}))
                bg_color = self._parse_column_value(cols.get(col_map.get("bg_color", ""), {}))
                link_url = self._parse_column_value(cols.get(col_map.get("link_url", ""), {}))
                start_date = self._parse_column_value(cols.get(col_map.get("start_date", ""), {}))
                end_date = self._parse_column_value(cols.get(col_map.get("end_date", ""), {}))
                status = self._parse_column_value(cols.get(col_map.get("status", ""), {}))
                banner_type = self._parse_column_value(cols.get(col_map.get("banner_type", ""), {}))

                b_type = "image" if (canva_url and not text) else "text"
                if banner_type:
                    bt_lower = banner_type.lower()
                    if "image" in bt_lower or "canva" in bt_lower or "imagen" in bt_lower:
                        b_type = "image"
                    elif "text" in bt_lower or "texto" in bt_lower:
                        b_type = "text"

                is_active = True
                if status:
                    s_lower = status.lower()
                    if any(x in s_lower for x in ["paused", "pause", "inactive", "draft", "borrador"]):
                        is_active = False

                banner_data = {
                    "banner_id": f"monday_{monday_id}",
                    "monday_item_id": monday_id,
                    "type": b_type,
                    "image_url": canva_url,
                    "link_url": link_url,
                    "overlay_text": item_name if b_type == "image" else "",
                    "text": text or item_name if b_type == "text" else "",
                    "bg_color": bg_color or "#C8102E",
                    "bg_gradient": "",
                    "text_color": "#ffffff",
                    "font_size": "lg",
                    "bg_image_url": "",
                    "active": is_active,
                    "start_date": start_date or "",
                    "end_date": end_date or "",
                    "order": synced,
                    "source": "monday",
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }

                await db.showcase_banners.update_one(
                    {"monday_item_id": monday_id},
                    {"$set": banner_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                synced += 1

            config["last_sync"] = datetime.now(timezone.utc).isoformat()
            config["sync_count"] = config.get("sync_count", 0) + 1
            await self.save_config(config)

            await self._log_sync(trigger, "success", synced)
            return {"status": "ok", "synced": synced, "skipped": skipped, "total_items": len(items)}

        except Exception as e:
            logger.error(f"Monday.com banner sync error: {e}")
            await self._log_sync(trigger, "error", 0, str(e))
            return {"status": "error", "message": str(e)}

    async def _log_sync(self, trigger: str, status: str, items_synced: int, error: str = ""):
        """Append a sync event to the history log. Keeps last 50 entries."""
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "trigger": trigger,
            "status": status,
            "items_synced": items_synced,
            "error": error,
        }
        await db.showcase_sync_history.insert_one(entry)
        count = await db.showcase_sync_history.count_documents({})
        if count > 50:
            oldest = await db.showcase_sync_history.find({}, {"_id": 1}).sort("timestamp", 1).limit(count - 50).to_list(None)
            if oldest:
                await db.showcase_sync_history.delete_many({"_id": {"$in": [o["_id"] for o in oldest]}})

    async def get_sync_history(self, limit: int = 20) -> list:
        """Get recent sync history entries."""
        entries = await db.showcase_sync_history.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(None)
        return entries


monday_banner_adapter = MondayBannerAdapter()
