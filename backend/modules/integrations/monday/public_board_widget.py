"""
Monday.com Public Board Widget
Admin-configurable widget that caches and serves Monday.com board content publicly.
"""
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from datetime import datetime, timezone
import logging

from core.database import db
from core.auth import get_admin_user
from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday/public-board-widget", tags=["Monday Public Widget"])

COLLECTION = "monday_public_board_widget"
CACHE_COLLECTION = "monday_public_board_cache"


@router.get("/config")
async def get_widget_config(admin: dict = Depends(get_admin_user)):
    """Get public board widget configuration (admin only)."""
    config = await db[COLLECTION].find_one({"config_key": "widget"}, {"_id": 0})
    return config or {
        "config_key": "widget",
        "enabled": False,
        "board_id": None,
        "board_name": "",
        "title": "Projects",
        "subtitle": "",
        "columns_to_show": [],
        "max_items": 10,
        "display_style": "cards",
        "group_filter": None,
        "refresh_minutes": 10,
    }


@router.put("/config")
async def save_widget_config(body: dict, admin: dict = Depends(get_admin_user)):
    """Save public board widget configuration."""
    try:
        allowed = {
            "enabled", "board_id", "board_name", "title", "subtitle",
            "columns_to_show", "max_items", "display_style", "group_filter",
            "refresh_minutes",
        }
        update = {k: v for k, v in body.items() if k in allowed}
        update["config_key"] = "widget"
        update["updated_at"] = datetime.now(timezone.utc).isoformat()

        await db[COLLECTION].update_one(
            {"config_key": "widget"}, {"$set": update}, upsert=True
        )
        # Clear cache when config changes
        await db[CACHE_COLLECTION].delete_many({})
        return {"status": "saved"}
    except Exception as e:
        logger.error(f"Save widget config error: {e}")
        return JSONResponse(content={"detail": str(e)}, status_code=500)


@router.post("/refresh")
async def refresh_widget_cache(admin: dict = Depends(get_admin_user)):
    """Force refresh the cached board data."""
    try:
        config = await db[COLLECTION].find_one({"config_key": "widget"}, {"_id": 0})
        if not config or not config.get("board_id"):
            return JSONResponse(content={"detail": "Widget not configured"}, status_code=400)

        items = await _fetch_and_cache(config)
        return {"status": "refreshed", "items_cached": len(items)}
    except Exception as e:
        logger.error(f"Refresh widget cache error: {e}")
        return JSONResponse(content={"detail": str(e)}, status_code=500)


@router.get("")
async def get_widget_data():
    """Public endpoint — returns cached board widget data. No auth required."""
    config = await db[COLLECTION].find_one({"config_key": "widget"}, {"_id": 0})
    if not config or not config.get("enabled") or not config.get("board_id"):
        return {"enabled": False, "items": []}

    # Check cache
    cache = await db[CACHE_COLLECTION].find_one({"config_key": "widget_cache"}, {"_id": 0})
    refresh_min = config.get("refresh_minutes", 10)

    needs_refresh = False
    if not cache:
        needs_refresh = True
    else:
        cached_at = cache.get("cached_at", "")
        if cached_at:
            try:
                cached_time = datetime.fromisoformat(cached_at)
                age = (datetime.now(timezone.utc) - cached_time).total_seconds() / 60
                if age > refresh_min:
                    needs_refresh = True
            except Exception:
                needs_refresh = True

    if needs_refresh:
        try:
            items = await _fetch_and_cache(config)
        except Exception as e:
            logger.error(f"Widget auto-refresh failed: {e}")
            items = cache.get("items", []) if cache else []
    else:
        items = cache.get("items", [])

    columns_to_show = config.get("columns_to_show", [])
    max_items = config.get("max_items", 10)

    return {
        "enabled": True,
        "title": config.get("title", "Projects"),
        "subtitle": config.get("subtitle", ""),
        "display_style": config.get("display_style", "cards"),
        "columns": columns_to_show,
        "show_subitems": config.get("show_subitems", False),
        "subitem_columns": config.get("subitem_columns_to_show", []),
        "items": items[:max_items],
    }


async def _fetch_and_cache(config: dict) -> list:
    """Fetch board items from Monday.com and cache in DB."""
    board_id = config["board_id"]
    columns_to_show = config.get("columns_to_show", [])
    subitem_columns_to_show = config.get("subitem_columns_to_show", [])
    show_subitems = config.get("show_subitems", False)
    group_filter = config.get("group_filter")
    max_items = config.get("max_items", 10)

    # Build query — include subitems if configured
    if show_subitems:
        query = f"""
            query {{
                boards(ids: [{board_id}]) {{
                    items_page(limit: {max_items + 10}) {{
                        items {{
                            id
                            name
                            group {{ id title }}
                            column_values {{ id text }}
                            subitems {{
                                id
                                name
                                column_values {{ id text }}
                            }}
                        }}
                    }}
                }}
            }}
        """
        data = await monday_client.execute(query)
        boards = data.get("boards", [])
        raw_items = boards[0]["items_page"]["items"] if boards else []
    else:
        raw_items = await monday_client.get_board_items(board_id, limit=max_items + 10)

    # Filter by group if configured
    if group_filter:
        raw_items = [i for i in raw_items if i.get("group", {}).get("id") == group_filter]

    # Transform to clean format
    items = []
    col_ids = [c.get("id", c) if isinstance(c, dict) else c for c in columns_to_show] if columns_to_show else None
    sub_col_ids = [c.get("id", c) if isinstance(c, dict) else c for c in subitem_columns_to_show] if subitem_columns_to_show else None

    for raw in raw_items[:max_items]:
        col_values = {}
        for cv in raw.get("column_values", []):
            col_id = cv.get("id")
            if col_ids and col_id not in col_ids:
                continue
            col_values[col_id] = cv.get("text", "")

        item = {
            "id": raw["id"],
            "name": raw.get("name", ""),
            "group": raw.get("group", {}).get("title", ""),
            "columns": col_values,
        }

        # Include subitems if configured
        if show_subitems and raw.get("subitems"):
            subs = []
            for sub in raw["subitems"]:
                sub_cols = {}
                for cv in sub.get("column_values", []):
                    col_id = cv.get("id")
                    if sub_col_ids and col_id not in sub_col_ids:
                        continue
                    sub_cols[col_id] = cv.get("text", "")
                subs.append({
                    "id": sub["id"],
                    "name": sub.get("name", ""),
                    "columns": sub_cols,
                })
            item["subitems"] = subs

        items.append(item)

    # Save cache
    await db[CACHE_COLLECTION].update_one(
        {"config_key": "widget_cache"},
        {"$set": {
            "config_key": "widget_cache",
            "items": items,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return items
