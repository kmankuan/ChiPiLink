"""
Ticker Module — Activity feed + Sponsor banner system
Configurable ticker bar that replaces the traditional header.
Pulls real activities from app modules (matches, orders, users, posts).
Shows sponsor banners at configurable intervals.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os

router = APIRouter(prefix="/ticker", tags=["Ticker"])
admin_router = APIRouter(prefix="/admin/ticker", tags=["Ticker Admin"])

# DB helper
def get_db():
    from pymongo import MongoClient
    client = MongoClient(os.environ.get("MONGO_URL"))
    return client[os.environ.get("DB_NAME", "chipilink_prod")]

def get_admin_user():
    """Dependency placeholder — replaced when mounted"""
    pass

# ─── Default Config ───
DEFAULT_CONFIG = {
    "enabled": True,
    "rotation_interval_ms": 4000,
    "pause_on_hover": True,
    "sponsor_frequency": 5,
    "max_activities": 20,
    "show_on_pages": ["*"],
    "hide_on_pages": ["/admin", "/login", "/registro", "/embed"],
    "activity_sources": {
        "matches": {"enabled": True, "label": "PinPanClub", "icon": "trophy", "color": "#d97706"},
        "new_users": {"enabled": True, "label": "New Members", "icon": "user-plus", "color": "#059669"},
        "orders": {"enabled": True, "label": "Store", "icon": "shopping-bag", "color": "#C8102E"},
        "community": {"enabled": True, "label": "Community", "icon": "message-circle", "color": "#7c3aed"},
        "transactions": {"enabled": False, "label": "Wallet", "icon": "wallet", "color": "#0284c7"},
        "custom": {"enabled": True, "messages": []}
    },
    "sponsors": [],
    "style": {
        "mode": "dark",
        "bg_color": "#1A1A1A",
        "text_color": "#FFFFFF",
        "accent_color": "#C8102E",
        "height_px": 36,
        "font_size_px": 12
    }
}


def _get_config(db):
    """Get ticker config, seeding defaults if missing."""
    doc = db.app_config.find_one({"config_key": "ticker_config"}, {"_id": 0})
    if not doc:
        db.app_config.insert_one({"config_key": "ticker_config", "value": DEFAULT_CONFIG})
        return DEFAULT_CONFIG
    return doc.get("value", DEFAULT_CONFIG)


def _merge_defaults(config):
    """Ensure all default keys exist in config."""
    merged = {**DEFAULT_CONFIG, **config}
    merged["activity_sources"] = {**DEFAULT_CONFIG["activity_sources"], **config.get("activity_sources", {})}
    merged["style"] = {**DEFAULT_CONFIG["style"], **config.get("style", {})}
    return merged


# ─── Activity Aggregator ───
def _fetch_activities(db, config):
    """Pull real activities from enabled sources."""
    activities = []
    sources = config.get("activity_sources", {})
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)

    # PinPanClub Matches
    if sources.get("matches", {}).get("enabled"):
        try:
            matches = list(db.pinpanclub_matches.find(
                {"created_at": {"$gte": since.isoformat()}},
                {"_id": 0, "player1_name": 1, "player2_name": 1, "status": 1, "created_at": 1, "winner_name": 1}
            ).sort("created_at", -1).limit(5))
            for m in matches:
                p1 = m.get("player1_name", "Player 1")
                p2 = m.get("player2_name", "Player 2")
                winner = m.get("winner_name")
                if winner:
                    text = f"{winner} won vs {p2 if winner == p1 else p1}"
                else:
                    text = f"{p1} vs {p2} — match in progress"
                activities.append({
                    "type": "match", "text": text,
                    "icon": sources["matches"].get("icon", "trophy"),
                    "color": sources["matches"].get("color", "#d97706"),
                    "timestamp": m.get("created_at", now.isoformat())
                })
        except Exception:
            pass

    # New Users
    if sources.get("new_users", {}).get("enabled"):
        try:
            users = list(db.users.find(
                {},
                {"_id": 0, "nombre": 1, "email": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))
            for u in users:
                name = u.get("nombre", u.get("email", "Someone").split("@")[0])
                activities.append({
                    "type": "new_user", "text": f"{name} joined the community",
                    "icon": sources["new_users"].get("icon", "user-plus"),
                    "color": sources["new_users"].get("color", "#059669"),
                    "timestamp": u.get("created_at", now.isoformat())
                })
        except Exception:
            pass

    # Store Orders
    if sources.get("orders", {}).get("enabled"):
        try:
            orders = list(db.store_textbook_orders.find(
                {},
                {"_id": 0, "student_name": 1, "items": 1, "created_at": 1, "status": 1}
            ).sort("created_at", -1).limit(5))
            for o in orders:
                name = o.get("student_name", "Someone")
                item_count = len(o.get("items", []))
                activities.append({
                    "type": "order", "text": f"{name} ordered {item_count} item{'s' if item_count != 1 else ''}",
                    "icon": sources["orders"].get("icon", "shopping-bag"),
                    "color": sources["orders"].get("color", "#C8102E"),
                    "timestamp": o.get("created_at", now.isoformat())
                })
        except Exception:
            pass

    # Community Posts
    if sources.get("community", {}).get("enabled"):
        try:
            posts = list(db.community_posts.find(
                {},
                {"_id": 0, "title": 1, "author_name": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))
            for p in posts:
                author = p.get("author_name", "Someone")
                title = p.get("title", "a new post")
                if len(title) > 40:
                    title = title[:37] + "..."
                activities.append({
                    "type": "community", "text": f'{author} posted: "{title}"',
                    "icon": sources["community"].get("icon", "message-circle"),
                    "color": sources["community"].get("color", "#7c3aed"),
                    "timestamp": p.get("created_at", now.isoformat())
                })
        except Exception:
            pass

    # Wallet Transactions
    if sources.get("transactions", {}).get("enabled"):
        try:
            txns = list(db.wallet_transactions.find(
                {"type": {"$in": ["topup", "transfer"]}},
                {"_id": 0, "type": 1, "amount": 1, "created_at": 1}
            ).sort("created_at", -1).limit(5))
            for tx in txns:
                amt = tx.get("amount", 0)
                activities.append({
                    "type": "transaction", "text": f"Wallet activity: ${amt:.2f}",
                    "icon": sources["transactions"].get("icon", "wallet"),
                    "color": sources["transactions"].get("color", "#0284c7"),
                    "timestamp": tx.get("created_at", now.isoformat())
                })
        except Exception:
            pass

    # Custom Messages
    if sources.get("custom", {}).get("enabled"):
        for msg in sources.get("custom", {}).get("messages", []):
            if msg.get("active", True):
                activities.append({
                    "type": "custom", "text": msg.get("text", ""),
                    "icon": msg.get("icon", "megaphone"),
                    "color": msg.get("color", "#C8102E"),
                    "timestamp": now.isoformat()
                })

    # Sort by timestamp descending, limit
    max_items = config.get("max_activities", 20)
    activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return activities[:max_items]


# ═══ PUBLIC ENDPOINTS ═══

@router.get("/feed")
async def get_ticker_feed():
    """Public: returns activities + sponsors + display config."""
    db = get_db()
    config = _merge_defaults(_get_config(db))

    if not config.get("enabled"):
        return {"enabled": False, "activities": [], "sponsors": [], "config": {}}

    activities = _fetch_activities(db, config)
    active_sponsors = [
        {k: v for k, v in s.items() if k != "_id"}
        for s in config.get("sponsors", [])
        if s.get("active", True)
    ]

    return {
        "enabled": True,
        "activities": activities,
        "sponsors": active_sponsors,
        "config": {
            "rotation_interval_ms": config.get("rotation_interval_ms", 4000),
            "pause_on_hover": config.get("pause_on_hover", True),
            "sponsor_frequency": config.get("sponsor_frequency", 5),
            "show_on_pages": config.get("show_on_pages", ["*"]),
            "hide_on_pages": config.get("hide_on_pages", []),
            "style": config.get("style", DEFAULT_CONFIG["style"])
        }
    }


# ═══ ADMIN ENDPOINTS ═══

@admin_router.get("/config")
async def get_ticker_config():
    """Admin: get full ticker configuration."""
    db = get_db()
    config = _merge_defaults(_get_config(db))
    return config


@admin_router.put("/config")
async def update_ticker_config(body: dict):
    """Admin: update ticker configuration (partial update)."""
    db = get_db()
    current = _get_config(db)

    # Deep merge activity_sources
    if "activity_sources" in body:
        current_sources = current.get("activity_sources", {})
        for key, val in body["activity_sources"].items():
            if key in current_sources and isinstance(val, dict):
                current_sources[key] = {**current_sources[key], **val}
            else:
                current_sources[key] = val
        body["activity_sources"] = current_sources

    # Deep merge style
    if "style" in body:
        body["style"] = {**current.get("style", {}), **body["style"]}

    updated = {**current, **body}
    updated["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.app_config.update_one(
        {"config_key": "ticker_config"},
        {"$set": {"value": updated}},
        upsert=True
    )
    return {"status": "ok", "config": updated}


@admin_router.post("/sponsors")
async def add_sponsor(body: dict):
    """Admin: add a new sponsor banner."""
    db = get_db()
    config = _get_config(db)

    sponsor = {
        "id": str(ObjectId()),
        "name": body.get("name", "Sponsor"),
        "image_url": body.get("image_url", ""),
        "link_url": body.get("link_url", ""),
        "label": body.get("label", ""),
        "bg_color": body.get("bg_color", "#FFD700"),
        "text_color": body.get("text_color", "#1A1A1A"),
        "active": body.get("active", True),
        "priority": body.get("priority", 0),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    sponsors = config.get("sponsors", [])
    sponsors.append(sponsor)

    db.app_config.update_one(
        {"config_key": "ticker_config"},
        {"$set": {"value.sponsors": sponsors}},
        upsert=True
    )
    return {"status": "ok", "sponsor": sponsor}


@admin_router.put("/sponsors/{sponsor_id}")
async def update_sponsor(sponsor_id: str, body: dict):
    """Admin: update a sponsor."""
    db = get_db()
    config = _get_config(db)
    sponsors = config.get("sponsors", [])

    found = False
    for i, s in enumerate(sponsors):
        if s.get("id") == sponsor_id:
            sponsors[i] = {**s, **body, "id": sponsor_id, "updated_at": datetime.now(timezone.utc).isoformat()}
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    db.app_config.update_one(
        {"config_key": "ticker_config"},
        {"$set": {"value.sponsors": sponsors}}
    )
    return {"status": "ok"}


@admin_router.delete("/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: str):
    """Admin: remove a sponsor."""
    db = get_db()
    config = _get_config(db)
    sponsors = [s for s in config.get("sponsors", []) if s.get("id") != sponsor_id]

    db.app_config.update_one(
        {"config_key": "ticker_config"},
        {"$set": {"value.sponsors": sponsors}}
    )
    return {"status": "ok"}



# ═══ LANDING PAGE IMAGES CONFIG ═══

DEFAULT_LANDING_IMAGES = {
    "hero": "https://images.unsplash.com/photo-1656259541897-a13b22104214?crop=entropy&cs=srgb&fm=jpg&w=1200&q=80",
    "pinpanclub": "https://static.prod-images.emergentagent.com/jobs/0e997fa5-7870-4ad7-bfea-6491d7259a17/images/ef6eac2ed986b5b78b05a26b8d149d2f8eb29df31e372ae0d99939f38b1b80e7.png",
    "lanterns": "https://images.unsplash.com/photo-1762889583592-2dda392f5431?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",
    "community": "https://images.unsplash.com/photo-1758275557161-f117d724d769?crop=entropy&cs=srgb&fm=jpg&w=800&q=80",
    "mosaic_pingpong_chess": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png",
    "mosaic_kids_learning": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/3eaf9b70f2c8a242db6fd32a793b16c215104f30755b70c8b63aa38dd331f753.png",
    "mosaic_culture": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/535181b7a5a2144892c75ca15c73f9320f5739017de399d05ced0e60170f39e7.png",
    "mosaic_gathering": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/0416cce781984810906e615303474bfe2089c65f53db816a6bf448f34cbd3bda.png"
}


@router.get("/landing-images")
async def get_landing_images():
    """Public: get customized landing page images."""
    db = get_db()
    doc = db.app_config.find_one({"config_key": "landing_images"}, {"_id": 0})
    images = doc.get("value", DEFAULT_LANDING_IMAGES) if doc else DEFAULT_LANDING_IMAGES
    return {**DEFAULT_LANDING_IMAGES, **images}


@admin_router.get("/landing-images")
async def get_landing_images_admin():
    """Admin: get landing images config with defaults."""
    db = get_db()
    doc = db.app_config.find_one({"config_key": "landing_images"}, {"_id": 0})
    custom = doc.get("value", {}) if doc else {}
    return {"defaults": DEFAULT_LANDING_IMAGES, "custom": custom, "resolved": {**DEFAULT_LANDING_IMAGES, **custom}}


@admin_router.put("/landing-images")
async def update_landing_images(body: dict):
    """Admin: update landing page images (partial update)."""
    db = get_db()
    current_doc = db.app_config.find_one({"config_key": "landing_images"}, {"_id": 0})
    current = current_doc.get("value", {}) if current_doc else {}
    updated = {**current, **body}
    db.app_config.update_one(
        {"config_key": "landing_images"},
        {"$set": {"config_key": "landing_images", "value": updated, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"status": "ok", "resolved": {**DEFAULT_LANDING_IMAGES, **updated}}


@admin_router.post("/landing-images/upload")
async def upload_landing_image(image_key: str = "pinpanclub"):
    """Admin: placeholder for image upload — use image URL for now."""
    return {"status": "info", "message": "Provide an image URL in PUT /admin/ticker/landing-images. Example: {\"pinpanclub\": \"https://your-image-url.com/image.jpg\"}"}
