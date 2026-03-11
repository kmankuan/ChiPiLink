"""
Debug routes — API tester, connection test, webhook logs, live logs.
"""
from fastapi import APIRouter
from datetime import datetime, timezone
import os

router = APIRouter(prefix="/debug", tags=["Debug"])


@router.post("/test-api")
async def test_api_call(data: dict):
    """Send a test API request to any URL"""
    import httpx
    
    url = data.get("url")
    method = data.get("method", "GET").upper()
    headers = data.get("headers", {})
    body = data.get("body")
    
    if not url:
        return {"error": "URL required"}
    
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            if method == "POST":
                r = await client.post(url, json=body, headers=headers)
            elif method == "PUT":
                r = await client.put(url, json=body, headers=headers)
            else:
                r = await client.get(url, headers=headers)
            
            return {
                "status_code": r.status_code,
                "latency_ms": round(r.elapsed.total_seconds() * 1000),
                "headers": dict(r.headers),
                "body": r.text[:5000],
            }
    except Exception as e:
        return {"error": str(e)}


@router.get("/webhook-logs")
async def webhook_logs(limit: int = 50):
    """View recent webhook activity"""
    from main import db
    
    logs = await db.hub_webhook_logs.find({}, {"_id": 0}).sort("received_at", -1).limit(limit).to_list(limit)
    return {"logs": logs}


@router.get("/connections")
async def test_all_connections():
    """Test all integration connections at once"""
    results = {}
    
    # MongoDB
    from main import db
    try:
        await db.command("ping")
        results["mongodb"] = {"status": "connected"}
    except Exception as e:
        results["mongodb"] = {"status": "failed", "error": str(e)}
    
    # Monday.com
    import httpx
    monday_key = os.environ.get("MONDAY_API_KEY", "")
    if monday_key:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.post("https://api.monday.com/v2", json={"query": "{ me { name } }"}, headers={"Authorization": monday_key})
                results["monday"] = {"status": "connected" if "data" in r.json() else "auth_failed"}
        except Exception as e:
            results["monday"] = {"status": "failed", "error": str(e)}
    else:
        results["monday"] = {"status": "not_configured"}
    
    # Telegram
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN", "") or "8570389871:AAEfRrW61WwfFYKwy4KhliQ0wpeazSPlceM"
    if tg_token:
        try:
            async with httpx.AsyncClient(timeout=10) as c:
                r = await c.get(f"https://api.telegram.org/bot{tg_token}/getMe")
                results["telegram"] = {"status": "connected" if r.json().get("ok") else "auth_failed"}
        except Exception as e:
            results["telegram"] = {"status": "failed", "error": str(e)}
    else:
        results["telegram"] = {"status": "not_configured"}
    
    return {"connections": results, "tested_at": datetime.now(timezone.utc).isoformat()}


@router.get("/env")
async def check_env():
    """Check which environment variables are set (no values exposed)"""
    keys = ["MONGO_URL", "DB_NAME", "MONDAY_API_KEY", "TELEGRAM_BOT_TOKEN",
            "ONESIGNAL_APP_ID", "ONESIGNAL_API_KEY", "GMAIL_CREDENTIALS"]
    return {k: "set" if os.environ.get(k) else "missing" for k in keys}
