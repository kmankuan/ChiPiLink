"""
Monday.com Banner Adapter
Syncs banner items from a dedicated Monday.com board.
Flow: Canva design URL → Monday.com board item → App banner carousel

Each Monday.com item maps to a banner with:
- Name → overlay_text or title
- Canva URL column → image_url
- Text column → banner text (for text-type banners)
- Background color column → bg_color
- Start Date column → schedule start
- End Date column → schedule end
- Status column → active/paused
"""
import logging
import json
from datetime import datetime, timezone
from typing import Optional

from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

# Config key in app_config collection
CONFIG_KEY = "monday_banner_config"


class MondayBannerAdapter:
    """Syncs banners from Monday.com board to showcase_banners collection"""

    async def get_config(self, db) -> dict:
        doc = db.app_config.find_one({"config_key": CONFIG_KEY}, {"_id": 0})
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
        }

    async def save_config(self, db, config: dict):
        db.app_config.update_one(
            {"config_key": CONFIG_KEY},
            {"$set": {
                "config_key": CONFIG_KEY,
                "value": config,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )

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
                    # Status columns
                    if "label" in parsed:
                        return parsed["label"]
                    # Date columns
                    if "date" in parsed:
                        return parsed["date"]
                    # Color columns
                    if "color" in parsed:
                        return parsed["color"]
                    # Link columns
                    if "url" in parsed:
                        return parsed["url"]
                return str(parsed)
            except (json.JSONDecodeError, TypeError):
                return str(value_raw)
        return ""

    async def sync_from_monday(self, db) -> dict:
        """
        Fetch all items from the configured banner board,
        create/update banners in the local DB.
        """
        config = await self.get_config(db)
        if not config.get("enabled") or not config.get("board_id"):
            return {"status": "skipped", "message": "Monday.com banner sync not configured"}

        board_id = config["board_id"]
        col_map = config.get("columns", {})

        try:
            # Fetch all items from the board
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
                return {"status": "error", "message": "Board not found"}

            items = boards[0].get("items_page", {}).get("items", [])
            synced = 0
            skipped = 0

            for item in items:
                monday_id = item["id"]
                item_name = item["name"]
                cols = {cv["id"]: cv for cv in item.get("column_values", [])}

                # Parse column values based on config mapping
                canva_url = self._parse_column_value(cols.get(col_map.get("canva_url", ""), {}))
                text = self._parse_column_value(cols.get(col_map.get("text", ""), {}))
                bg_color = self._parse_column_value(cols.get(col_map.get("bg_color", ""), {}))
                link_url = self._parse_column_value(cols.get(col_map.get("link_url", ""), {}))
                start_date = self._parse_column_value(cols.get(col_map.get("start_date", ""), {}))
                end_date = self._parse_column_value(cols.get(col_map.get("end_date", ""), {}))
                status = self._parse_column_value(cols.get(col_map.get("status", ""), {}))
                banner_type = self._parse_column_value(cols.get(col_map.get("banner_type", ""), {}))

                # Determine type
                b_type = "image" if (canva_url and not text) else "text"
                if banner_type:
                    bt_lower = banner_type.lower()
                    if "image" in bt_lower or "canva" in bt_lower or "imagen" in bt_lower:
                        b_type = "image"
                    elif "text" in bt_lower or "texto" in bt_lower:
                        b_type = "text"

                # Determine active status
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

                # Upsert by monday item id
                db.showcase_banners.update_one(
                    {"monday_item_id": monday_id},
                    {"$set": banner_data, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True
                )
                synced += 1

            # Update sync timestamp
            config["last_sync"] = datetime.now(timezone.utc).isoformat()
            config["sync_count"] = config.get("sync_count", 0) + 1
            await self.save_config(db, config)

            return {"status": "ok", "synced": synced, "skipped": skipped, "total_items": len(items)}

        except Exception as e:
            logger.error(f"Monday.com banner sync error: {e}")
            return {"status": "error", "message": str(e)}


monday_banner_adapter = MondayBannerAdapter()
