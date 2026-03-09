"""
Integration management routes — Enable, disable, configure, test connections.
"""
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
import httpx

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("/")
async def list_integrations():
    """List all registered integrations with status"""
    from main import db
    
    integrations = await db.hub_integrations.find({}, {"_id": 0}).to_list(50)
    if not integrations:
        # Return defaults if none configured
        integrations = [
            {"id": "monday", "name": "Monday.com", "icon": "clipboard", "enabled": False, "status": "not_configured"},
            {"id": "telegram", "name": "Telegram", "icon": "send", "enabled": False, "status": "not_configured"},
            {"id": "gmail", "name": "Gmail", "icon": "mail", "enabled": False, "status": "not_configured"},
            {"id": "onesignal", "name": "OneSignal", "icon": "bell", "enabled": False, "status": "not_configured"},
            {"id": "laopan", "name": "LaoPan.online", "icon": "users", "enabled": False, "status": "planned"},
            {"id": "fusebase", "name": "FuseBase", "icon": "database", "enabled": False, "status": "planned"},
        ]
    return {"integrations": integrations}


@router.put("/{integration_id}")
async def update_integration(integration_id: str, data: dict):
    """Update integration config"""
    from main import db
    
    await db.hub_integrations.update_one(
        {"id": integration_id},
        {"$set": {**data, "id": integration_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"success": True}


@router.post("/{integration_id}/test")
async def test_connection(integration_id: str):
    """Test an integration's connection"""
    from main import db
    import os
    
    config = await db.hub_integrations.find_one({"id": integration_id}, {"_id": 0})
    
    if integration_id == "monday":
        api_key = (config or {}).get("api_key") or os.environ.get("MONDAY_API_KEY", "")
        if not api_key:
            return {"success": False, "error": "No API key configured"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post("https://api.monday.com/v2",
                    json={"query": "{ me { name } }"},
                    headers={"Authorization": api_key})
                data = r.json()
                if "data" in data:
                    return {"success": True, "user": data["data"]["me"]["name"], "latency_ms": r.elapsed.total_seconds() * 1000}
                return {"success": False, "error": str(data.get("errors", "Unknown error"))}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    elif integration_id == "telegram":
        token = (config or {}).get("bot_token") or os.environ.get("TELEGRAM_BOT_TOKEN", "")
        if not token:
            return {"success": False, "error": "No bot token configured"}
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"https://api.telegram.org/bot{token}/getMe")
                data = r.json()
                if data.get("ok"):
                    return {"success": True, "bot": data["result"]["username"], "latency_ms": r.elapsed.total_seconds() * 1000}
                return {"success": False, "error": data.get("description", "Unknown error")}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    return {"success": False, "error": f"No test available for {integration_id}"}
