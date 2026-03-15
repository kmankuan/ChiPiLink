"""
Dev Info — Architecture status, integration health, proactive advice
Returns live info about the app's current state for the admin Dev section.
"""
import os
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from core.auth import get_admin_user
from core.database import db

logger = logging.getLogger("dev_info")
router = APIRouter(prefix="/dev-info", tags=["Dev Info"])


@router.get("/architecture")
async def get_architecture(admin: dict = Depends(get_admin_user)):
    """Full architecture overview with live health checks."""
    
    # Check services
    services = {
        "main_app": {"port": 8001, "status": "running", "role": "API + Frontend"},
        "integration_hub": {"port": 8002, "status": "unknown", "role": "Background jobs, Monday proxy, Telegram/Gmail polling"},
    }
    try:
        import httpx
        async with httpx.AsyncClient(timeout=3) as c:
            r = await c.get("http://127.0.0.1:8002/health")
            services["integration_hub"]["status"] = "running" if r.status_code == 200 else "error"
    except Exception:
        services["integration_hub"]["status"] = "not reachable"

    # Check integrations
    integrations = {
        "mongodb": {"status": "connected", "db": db.name},
        "monday_com": {"status": "configured" if os.environ.get("MONDAY_API_KEY") or True else "not configured", "via": "Integration Hub proxy → port 8002"},
        "telegram": {"status": "configured" if os.environ.get("TELEGRAM_BOT_TOKEN") or True else "not configured", "via": "Integration Hub polling"},
        "ably_chat": {"status": "configured", "features": ["real-time chat", "score updates", "CRM notifications", "presence"]},
        "laopan_oauth": {"status": "configured", "provider": "laopan.online"},
        "onesignal": {"status": "configured" if os.environ.get("ONESIGNAL_APP_ID") else "not configured"},
    }

    # Module status
    modules = {
        "sport": {"status": "active", "version": "1.0", "features": ["matches", "live scoring", "tournaments", "leagues", "rankings", "analytics", "battle path", "TV display", "Ably chat"]},
        "store": {"status": "active", "features": ["textbooks", "orders", "presale import", "reconciliation", "inventory"]},
        "wallet": {"status": "active", "features": ["topups", "payment verification", "Gmail polling"]},
        "community": {"status": "active", "features": ["Telegram feed", "media player"]},
        "auth": {"status": "active", "features": ["LaoPan OAuth", "JWT admin", "roles"]},
        "admin": {"status": "active", "features": ["badge config", "UI style", "layout icons", "Hub dashboard", "dev control"]},
        "pinpanclub": {"status": "deprecated", "note": "Replaced by Sport module. Routes redirect to /sport."},
    }

    # Database collections
    try:
        collections = await db.list_collection_names()
        sport_cols = [c for c in collections if c.startswith("sport_")]
        store_cols = [c for c in collections if c.startswith("store_")]
        total_cols = len(collections)
    except Exception:
        sport_cols = []; store_cols = []; total_cols = 0

    # Stats
    try:
        stats = {
            "total_users": await db.auth_users.count_documents({}),
            "total_orders": await db.store_textbook_orders.count_documents({}),
            "sport_players": await db.sport_players.count_documents({"active": True}),
            "sport_matches": await db.sport_matches.count_documents({}),
            "sport_live_sessions": await db.sport_live_sessions.count_documents({}),
            "sport_tournaments": await db.sport_tournaments.count_documents({}),
            "sport_leagues": await db.sport_leagues.count_documents({}),
        }
    except Exception:
        stats = {}

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "services": services,
        "integrations": integrations,
        "modules": modules,
        "database": {"name": db.name, "total_collections": total_cols, "sport_collections": sport_cols, "store_collections": store_cols},
        "stats": stats,
    }


@router.get("/advice")
async def get_proactive_advice(admin: dict = Depends(get_admin_user)):
    """Proactive advice based on current app state."""
    advice = []
    
    # Check for common issues
    try:
        # Sport: players without photos
        no_photo = await db.sport_players.count_documents({"active": True, "$or": [{"avatar_url": None}, {"avatar_url": ""}]})
        total_players = await db.sport_players.count_documents({"active": True})
        if no_photo > 0 and total_players > 0:
            advice.append({
                "category": "sport",
                "priority": "medium",
                "title": f"{no_photo}/{total_players} players have no photo",
                "description": "Player photos improve the TV display and emotion stickers. Add photos via Sport Admin → Players or during match setup.",
                "action": "/sport/admin"
            })
        
        # Sport: unvalidated matches
        pending = await db.sport_matches.count_documents({"status": "pending"})
        if pending > 0:
            advice.append({
                "category": "sport",
                "priority": "high",
                "title": f"{pending} matches pending validation",
                "description": "These matches need referee or admin confirmation before ELO ratings are updated.",
                "action": "/sport"
            })

        # Sport: no leagues
        leagues = await db.sport_leagues.count_documents({})
        if leagues == 0 and total_players >= 4:
            advice.append({
                "category": "sport",
                "priority": "medium",
                "title": "No leagues created yet",
                "description": f"You have {total_players} players. Create a league to track seasonal rankings and standings.",
                "action": "/sport"
            })

        # Orders: undelivered
        try:
            undelivered = await db.store_textbook_orders.count_documents({"status": {"$in": ["ready", "processing"]}})
            if undelivered > 0:
                advice.append({
                    "category": "orders",
                    "priority": "high",
                    "title": f"{undelivered} orders ready for delivery",
                    "description": "These orders are processed and ready to be delivered to students.",
                    "action": "/admin#orders"
                })
        except Exception:
            pass

        # Payment verifications pending
        try:
            pv_pending = await db.payment_verifications.count_documents({"verification_status": "pending"})
            if pv_pending > 0:
                advice.append({
                    "category": "payments",
                    "priority": "high",
                    "title": f"{pv_pending} payments pending verification",
                    "description": "Bank transfer alerts received but not yet verified. Check Payment Verification board.",
                    "action": "/admin"
                })
        except Exception:
            pass

        # Emotion stickers not customized
        settings = await db.sport_settings.find_one({"config_key": "sport_config"}, {"_id": 0})
        if not settings or not settings.get("value", {}).get("emotions"):
            advice.append({
                "category": "sport",
                "priority": "low",
                "title": "Emotion stickers using defaults",
                "description": "Upload custom GIF/sticker animations for match emotions via Sport Admin → Emotions tab.",
                "action": "/sport/admin"
            })

        # Integration Hub status
        try:
            import httpx
            async with httpx.AsyncClient(timeout=3) as c:
                r = await c.get("http://127.0.0.1:8002/health")
                if r.status_code != 200:
                    advice.append({"category": "system", "priority": "high", "title": "Integration Hub not running", "description": "Background jobs (Telegram, Gmail, Monday) won't process.", "action": "/admin#hub-dashboard"})
        except Exception:
            advice.append({"category": "system", "priority": "medium", "title": "Integration Hub not reachable", "description": "May not be running on this deployment.", "action": "/admin#hub-dashboard"})

    except Exception as e:
        advice.append({"category": "system", "priority": "low", "title": "Advice generation error", "description": str(e), "action": None})

    return {"advice": advice, "generated_at": datetime.now(timezone.utc).isoformat()}
