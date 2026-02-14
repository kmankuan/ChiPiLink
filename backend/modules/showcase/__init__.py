"""
Banners & Media Player Module
- Ad/Banner carousel: image banners + rich text banners with colored backgrounds
- Media Player: Auto-playing photo/video slideshow from Google Photos albums or manual URLs
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import re
import httpx

from core.database import db

router = APIRouter(prefix="/showcase", tags=["Showcase"])
admin_router = APIRouter(prefix="/admin/showcase", tags=["Showcase Admin"])


async def seed_showcase_defaults():
    """Seed default banners and media player items if none exist."""
    # Seed banners
    banner_count = await db.showcase_banners.count_documents({})
    if banner_count == 0:
        default_banners = [
            {
                "banner_id": "banner_demo_1",
                "type": "text",
                "image_url": "",
                "link_url": "",
                "overlay_text": "",
                "text": "Welcome to ChiPi Link Community! Join us for weekend tournaments.",
                "bg_color": "#C8102E",
                "bg_gradient": "linear-gradient(135deg, #C8102E 0%, #8B0000 100%)",
                "text_color": "#ffffff",
                "font_size": "lg",
                "bg_image_url": "",
                "start_date": "",
                "end_date": "",
                "source": "seed",
                "active": True,
                "order": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "banner_id": "banner_demo_2",
                "type": "image",
                "image_url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png",
                "link_url": "/pinpanclub",
                "overlay_text": "PinPanClub — New Season Starting!",
                "text": "",
                "bg_color": "",
                "bg_gradient": "",
                "text_color": "#ffffff",
                "font_size": "lg",
                "bg_image_url": "",
                "start_date": "",
                "end_date": "",
                "source": "seed",
                "active": True,
                "order": 1,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "banner_id": "banner_demo_3",
                "type": "text",
                "image_url": "",
                "link_url": "",
                "overlay_text": "",
                "text": "Chinese New Year Festival — Special menu & cultural activities for the whole family.",
                "bg_color": "#d97706",
                "bg_gradient": "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
                "text_color": "#ffffff",
                "font_size": "lg",
                "bg_image_url": "",
                "start_date": "",
                "end_date": "",
                "source": "seed",
                "active": True,
                "order": 2,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
        ]
        await db.showcase_banners.insert_many(default_banners)

    # Seed media player
    media_config = await db.app_config.find_one({"config_key": "media_player"})
    if not media_config:
        default_media = {
            "config_key": "media_player",
            "value": {
                "album_url": "",
                "autoplay": True,
                "interval_ms": 6000,
                "loop": True,
                "show_controls": True,
                "items": [
                    {
                        "item_id": "media_demo_1",
                        "type": "image",
                        "url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png",
                        "thumbnail_url": "",
                        "caption": "PinPanClub Training Day",
                    },
                    {
                        "item_id": "media_demo_2",
                        "type": "image",
                        "url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/3eaf9b70f2c8a242db6fd32a793b16c215104f30755b70c8b63aa38dd331f753.png",
                        "thumbnail_url": "",
                        "caption": "Kids Learning Together",
                    },
                    {
                        "item_id": "media_demo_3",
                        "type": "image",
                        "url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/535181b7a5a2144892c75ca15c73f9320f5739017de399d05ced0e60170f39e7.png",
                        "thumbnail_url": "",
                        "caption": "Chinese-Panamanian Heritage",
                    },
                    {
                        "item_id": "media_demo_4",
                        "type": "image",
                        "url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/0416cce781984810906e615303474bfe2089c65f53db816a6bf448f34cbd3bda.png",
                        "thumbnail_url": "",
                        "caption": "Community Gathering",
                    },
                ],
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.app_config.insert_one(default_media)



# ═══════════════════════════════════════════
# BANNERS — Ad / Announcement carousel
# ═══════════════════════════════════════════

@router.get("/banners")
async def get_banners():
    """Public: Get all active banners, filtered by schedule dates."""
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    banners = await db.showcase_banners.find(
        {"active": True},
        {"_id": 0}
    ).sort("order", 1).to_list(None)
    visible = []
    for b in banners:
        start = b.get("start_date", "")
        end = b.get("end_date", "")
        if start and start > now:
            continue
        if end and end < now:
            continue
        visible.append(b)
    return visible


@admin_router.get("/banners")
async def get_banners_admin():
    """Admin: Get all banners (including inactive)."""
    banners = await db.showcase_banners.find({}, {"_id": 0}).sort("order", 1).to_list(None)
    return banners


@admin_router.post("/banners")
async def create_banner(body: dict):
    """Admin: Create a new banner."""
    banner_id = f"banner_{int(datetime.now(timezone.utc).timestamp() * 1000)}"
    count = await db.showcase_banners.count_documents({})
    banner = {
        "banner_id": banner_id,
        "type": body.get("type", "image"),
        "image_url": body.get("image_url", ""),
        "link_url": body.get("link_url", ""),
        "overlay_text": body.get("overlay_text", ""),
        "text": body.get("text", ""),
        "bg_color": body.get("bg_color", "#16a34a"),
        "bg_gradient": body.get("bg_gradient", ""),
        "text_color": body.get("text_color", "#ffffff"),
        "font_size": body.get("font_size", "lg"),
        "bg_image_url": body.get("bg_image_url", ""),
        "start_date": body.get("start_date", ""),
        "end_date": body.get("end_date", ""),
        "source": body.get("source", "manual"),
        "active": body.get("active", True),
        "order": body.get("order", count),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.showcase_banners.insert_one(banner)
    banner.pop("_id", None)
    return banner


@admin_router.put("/banners/{banner_id}")
async def update_banner(banner_id: str, body: dict):
    """Admin: Update an existing banner."""
    body.pop("banner_id", None)
    body.pop("_id", None)
    body["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.showcase_banners.update_one(
        {"banner_id": banner_id},
        {"$set": body}
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Banner not found")
    updated = await db.showcase_banners.find_one({"banner_id": banner_id}, {"_id": 0})
    return updated


@admin_router.delete("/banners/{banner_id}")
async def delete_banner(banner_id: str):
    """Admin: Delete a banner."""
    result = await db.showcase_banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Banner not found")
    return {"status": "deleted", "banner_id": banner_id}


# ═══════════════════════════════════════════
# MEDIA PLAYER — Google Photos album player
# ═══════════════════════════════════════════

DEFAULT_PLAYER_CONFIG = {
    "album_url": "",
    "autoplay": True,
    "interval_ms": 5000,
    "loop": True,
    "show_controls": True,
    "items": [],
}


@router.get("/media-player")
async def get_media_player():
    """Public: Get media player config and items."""
    doc = await db.app_config.find_one({"config_key": "media_player"}, {"_id": 0})
    if doc:
        return doc.get("value", DEFAULT_PLAYER_CONFIG)
    return DEFAULT_PLAYER_CONFIG


@admin_router.get("/media-player")
async def get_media_player_admin():
    """Admin: Get full media player config."""
    doc = await db.app_config.find_one({"config_key": "media_player"}, {"_id": 0})
    config = doc.get("value", DEFAULT_PLAYER_CONFIG) if doc else DEFAULT_PLAYER_CONFIG
    return config


@admin_router.put("/media-player")
async def update_media_player(body: dict):
    """Admin: Update media player config (items, settings)."""
    body.pop("_id", None)
    await db.app_config.update_one(
        {"config_key": "media_player"},
        {"$set": {
            "config_key": "media_player",
            "value": body,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"status": "ok", "config": body}


@admin_router.post("/media-player/add-item")
async def add_media_item(body: dict):
    """Admin: Add a single media item to the player."""
    item = {
        "item_id": f"media_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "type": body.get("type", "image"),
        "url": body.get("url", ""),
        "thumbnail_url": body.get("thumbnail_url", ""),
        "caption": body.get("caption", ""),
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.app_config.update_one(
        {"config_key": "media_player"},
        {
            "$push": {"value.items": item},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
            "$setOnInsert": {"config_key": "media_player"}
        },
        upsert=True
    )
    return {"status": "added", "item": item}


@admin_router.delete("/media-player/items/{item_id}")
async def delete_media_item(item_id: str):
    """Admin: Remove a media item from the player."""
    await db.app_config.update_one(
        {"config_key": "media_player"},
        {"$pull": {"value.items": {"item_id": item_id}}}
    )
    return {"status": "deleted", "item_id": item_id}


@admin_router.post("/media-player/fetch-album")
async def fetch_google_photos_album(body: dict):
    """
    Admin: Attempt to fetch media from a Google Photos shared album URL.
    Extracts image/video URLs from the shared album page.
    """
    album_url = body.get("album_url", "")
    if not album_url:
        raise HTTPException(400, "album_url is required")

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15) as client:
            resp = await client.get(album_url, headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            })
            html = resp.text

        items = []
        img_patterns = [
            r'(https://lh3\.googleusercontent\.com/[a-zA-Z0-9_\-/]+)',
            r'(https://lh[0-9]*\.googleusercontent\.com/[a-zA-Z0-9_\-/=]+)',
        ]

        seen_urls = set()
        for pattern in img_patterns:
            matches = re.findall(pattern, html)
            for url in matches:
                if len(url) > 60 and url not in seen_urls:
                    seen_urls.add(url)
                    full_url = url if '=' in url.split('/')[-1] else f"{url}=w1200"
                    items.append({
                        "item_id": f"gp_{len(items)}_{int(datetime.now(timezone.utc).timestamp())}",
                        "type": "image",
                        "url": full_url,
                        "thumbnail_url": f"{url}=w400",
                        "caption": "",
                        "added_at": datetime.now(timezone.utc).isoformat(),
                        "source": "google_photos"
                    })

        video_patterns = [
            r'(https://video\.googleusercontent\.com/[a-zA-Z0-9_\-/=&?]+)',
        ]
        for pattern in video_patterns:
            matches = re.findall(pattern, html)
            for url in matches:
                if url not in seen_urls:
                    seen_urls.add(url)
                    items.append({
                        "item_id": f"gp_v_{len(items)}_{int(datetime.now(timezone.utc).timestamp())}",
                        "type": "video",
                        "url": url,
                        "thumbnail_url": "",
                        "caption": "",
                        "added_at": datetime.now(timezone.utc).isoformat(),
                        "source": "google_photos"
                    })

        if not items:
            return {
                "status": "no_items",
                "message": "Could not extract media from this album URL. Try adding items manually or ensure the album is publicly shared.",
                "items": [],
                "album_url": album_url
            }

        await db.app_config.update_one(
            {"config_key": "media_player"},
            {
                "$set": {
                    "config_key": "media_player",
                    "value.album_url": album_url,
                    "value.autoplay": True,
                    "value.interval_ms": 5000,
                    "value.loop": True,
                    "value.show_controls": True,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {"value.items": {"$each": items}}
            },
            upsert=True
        )

        return {
            "status": "ok",
            "message": f"Found {len(items)} media items",
            "items_added": len(items),
            "items": items,
            "album_url": album_url
        }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Failed to fetch album: {str(e)}. You can add items manually instead.",
            "items": [],
            "album_url": album_url
        }


# ═══════════════════════════════════════════
# MONDAY.COM BANNER SYNC
# ═══════════════════════════════════════════

@admin_router.get("/monday-banners/config")
async def get_monday_banner_config():
    """Admin: Get Monday.com banner sync configuration."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    config = await monday_banner_adapter.get_config()
    return config


@admin_router.put("/monday-banners/config")
async def update_monday_banner_config(body: dict):
    """Admin: Update Monday.com banner sync configuration (board_id, column mappings)."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    await monday_banner_adapter.save_config(body)
    return {"status": "ok", "config": body}


@admin_router.post("/monday-banners/sync")
async def sync_monday_banners():
    """Admin: Manually trigger sync from Monday.com banner board."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    result = await monday_banner_adapter.sync_from_monday(trigger="manual")
    return result


@admin_router.get("/monday-banners/boards")
async def list_monday_boards_for_banners():
    """Admin: List available Monday.com boards for banner sync."""
    from modules.integrations.monday.core_client import monday_client
    try:
        data = await monday_client.execute("""
            query {
                boards(limit: 100, order_by: created_at) {
                    id
                    name
                    columns { id title type }
                }
            }
        """)
        return {"boards": data.get("boards", [])}
    except Exception as e:
        return {"boards": [], "error": str(e)}


# ═══════════════════════════════════════════
# AUTO-SYNC CONFIGURATION
# ═══════════════════════════════════════════

@admin_router.get("/monday-banners/auto-sync")
async def get_auto_sync_config():
    """Admin: Get auto-sync configuration and scheduler status."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    from modules.showcase.scheduler import banner_sync_scheduler
    config = await monday_banner_adapter.get_config()
    auto_sync = config.get("auto_sync", {
        "enabled": False,
        "interval_minutes": 10,
    })
    status = banner_sync_scheduler.get_status()
    return {**auto_sync, "scheduler": status, "last_sync": config.get("last_sync")}


@admin_router.put("/monday-banners/auto-sync")
async def update_auto_sync_config(body: dict):
    """Admin: Enable/disable auto-sync and set interval."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    from modules.showcase.scheduler import banner_sync_scheduler
    config = await monday_banner_adapter.get_config()

    enabled = body.get("enabled", False)
    interval = max(1, min(body.get("interval_minutes", 10), 1440))

    config["auto_sync"] = {"enabled": enabled, "interval_minutes": interval}
    await monday_banner_adapter.save_config(config)

    if enabled and config.get("enabled") and config.get("board_id"):
        banner_sync_scheduler.resume(interval)
        banner_sync_scheduler.update_interval(interval)
    else:
        banner_sync_scheduler.pause()

    status = banner_sync_scheduler.get_status()
    return {"status": "ok", "auto_sync": config["auto_sync"], "scheduler": status}



@admin_router.get("/monday-banners/sync-history")
async def get_sync_history():
    """Admin: Get recent sync history log entries."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    history = await monday_banner_adapter.get_sync_history(limit=20)
    return {"history": history}



# ═══════════════════════════════════════════
# WEBHOOK MANAGEMENT
# ═══════════════════════════════════════════

@admin_router.post("/monday-banners/webhook/register")
async def register_banner_webhook():
    """Admin: Register a real-time webhook with Monday.com for the banner board."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    result = await monday_banner_adapter.register_webhook()
    return result


@admin_router.post("/monday-banners/webhook/unregister")
async def unregister_banner_webhook():
    """Admin: Remove the Monday.com webhook."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    result = await monday_banner_adapter.unregister_webhook()
    return result


@admin_router.get("/monday-banners/webhook/status")
async def get_banner_webhook_status():
    """Admin: Get current webhook registration status."""
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    config = await monday_banner_adapter.get_config()
    return config.get("webhook", {"registered": False, "webhook_id": None})

