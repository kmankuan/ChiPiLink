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
            "refresh_minutes", "show_subitems", "subitem_columns_to_show",
            "search_only", "search_placeholder",
            "title_es", "title_zh", "subtitle_es", "subtitle_zh",
            "search_placeholder_es", "search_placeholder_zh",
            "column_titles", "search_columns",
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

        items, _ = await _fetch_and_cache(config)
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
        if cache and cache.get("items"):
            # Serve stale cache immediately, refresh in background
            items = cache.get("items", [])
            live_col_titles = cache.get("live_col_titles", {})
            import asyncio
            asyncio.create_task(_fetch_and_cache(config))
        else:
            # No cache at all — must fetch
            try:
                items, live_col_titles = await _fetch_and_cache(config)
            except Exception as e:
                logger.error(f"Widget auto-refresh failed: {e}")
                items = []
                live_col_titles = {}
    else:
        items = cache.get("items", [])
        live_col_titles = cache.get("live_col_titles", {})

    columns_to_show = config.get("columns_to_show", [])
    max_items = config.get("max_items", 10)
    search_only = config.get("search_only", False)

    # In search-only mode, send ALL items (search needs full dataset)
    # Otherwise, respect the max_items limit for display
    display_items = items if search_only else items[:max_items]

    # Build column title mapping — live titles from board override admin config
    column_titles = config.get("column_titles", {})
    column_titles.update(live_col_titles)

    return {
        "enabled": True,
        "title": config.get("title", "Projects"),
        "subtitle": config.get("subtitle", ""),
        "title_es": config.get("title_es", ""),
        "title_zh": config.get("title_zh", ""),
        "subtitle_es": config.get("subtitle_es", ""),
        "subtitle_zh": config.get("subtitle_zh", ""),
        "search_placeholder": config.get("search_placeholder", ""),
        "search_placeholder_es": config.get("search_placeholder_es", ""),
        "search_placeholder_zh": config.get("search_placeholder_zh", ""),
        "display_style": config.get("display_style", "cards"),
        "columns": columns_to_show,
        "column_titles": column_titles,
        "show_subitems": config.get("show_subitems", False),
        "subitem_columns": config.get("subitem_columns_to_show", []),
        "search_only": config.get("search_only", False),
        "search_columns": config.get("search_columns", []),
        "items": display_items,
    }


async def _fetch_and_cache(config: dict) -> tuple:
    """Fetch ALL board items from Monday.com using pagination and cache in DB."""
    board_id = config["board_id"]
    columns_to_show = config.get("columns_to_show", [])
    subitem_columns_to_show = config.get("subitem_columns_to_show", [])
    show_subitems = config.get("show_subitems", False)
    group_filter = config.get("group_filter")
    max_items = config.get("max_items", 10)

    # Use cursor-based pagination to get ALL items (not limited to 500)
    all_raw_items = []
    live_col_titles = {}
    
    if show_subitems:
        # First page — includes board columns for title mapping
        cursor = None
        page = 0
        while True:
            page += 1
            if cursor:
                query = f"""query {{ next_items_page(limit: 500, cursor: "{cursor}") {{
                    cursor items {{ id name group {{ id title }} column_values {{ id text }}
                    subitems {{ id name column_values {{ id text }} }} }} }} }}"""
                data = await monday_client.execute(query, timeout=45.0)
                page_data = data.get("next_items_page", {})
            else:
                query = f"""query {{ boards(ids: [{board_id}]) {{
                    columns {{ id title }}
                    items_page(limit: 500) {{
                        cursor items {{ id name group {{ id title }} column_values {{ id text }}
                        subitems {{ id name column_values {{ id text }} }} }} }} }} }}"""
                data = await monday_client.execute(query, timeout=45.0)
                boards = data.get("boards", [])
                if not boards:
                    break
                for col in boards[0].get("columns", []):
                    live_col_titles[col["id"]] = col.get("title", col["id"])
                page_data = boards[0].get("items_page", {})
            
            items = page_data.get("items", [])
            all_raw_items.extend(items)
            cursor = page_data.get("cursor")
            
            if not cursor or not items or page >= 10:  # Safety: max 10 pages (5000 items)
                break
    else:
        all_raw_items = await monday_client.get_board_items(board_id, limit=2000)
    
    raw_items = all_raw_items
    logger.info(f"Widget fetched {len(raw_items)} total items from board {board_id}")

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

        # Monday.com "name" is a special property, not in column_values
        if col_ids and "name" in col_ids:
            col_values["name"] = raw.get("name", "")

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

    # Save cache (include live column titles)
    await db[CACHE_COLLECTION].update_one(
        {"config_key": "widget_cache"},
        {"$set": {
            "config_key": "widget_cache",
            "items": items,
            "live_col_titles": live_col_titles,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    return items, live_col_titles
