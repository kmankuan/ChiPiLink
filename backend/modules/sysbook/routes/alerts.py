"""
Sysbook — Stock Alerts & Settings
Configurable low stock thresholds, alert management, and push notifications.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from core.auth import get_admin_user
from core.database import db

router = APIRouter(prefix="/alerts", tags=["Sysbook - Alerts"])

logger = logging.getLogger(__name__)

SYSBOOK_FILTER = {"is_private_catalog": True}

DEFAULT_SETTINGS = {
    "global_low_stock_threshold": 10,
    "enable_push_notifications": True,
    "enable_in_app_notifications": True,
    "auto_check_interval_hours": 24,
}


class AlertSettingsUpdate(BaseModel):
    global_low_stock_threshold: Optional[int] = None
    enable_push_notifications: Optional[bool] = None
    enable_in_app_notifications: Optional[bool] = None
    auto_check_interval_hours: Optional[int] = None


class DismissAlert(BaseModel):
    alert_ids: list


# ========== Settings ==========

@router.get("/settings")
async def get_alert_settings(admin: dict = Depends(get_admin_user)):
    """Get Sysbook alert configuration."""
    settings = await db.sysbook_settings.find_one({"type": "alert_settings"}, {"_id": 0})
    if not settings:
        settings = {**DEFAULT_SETTINGS, "type": "alert_settings"}
        await db.sysbook_settings.insert_one(settings)
        settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_alert_settings(body: AlertSettingsUpdate, admin: dict = Depends(get_admin_user)):
    """Update Sysbook alert configuration."""
    updates = {k: v for k, v in body.dict().items() if v is not None}
    if not updates:
        return await get_alert_settings(admin)
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    updates["updated_by"] = admin.get("user_id")
    await db.sysbook_settings.update_one(
        {"type": "alert_settings"},
        {"$set": updates},
        upsert=True
    )
    return await get_alert_settings(admin)


# ========== Alerts ==========

@router.get("")
async def list_alerts(
    status: str = Query("active", enum=["active", "dismissed", "all"]),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_admin_user),
):
    """List stock alerts."""
    query = {"source": "sysbook"}
    if status == "active":
        query["dismissed"] = {"$ne": True}
    elif status == "dismissed":
        query["dismissed"] = True
    alerts = await db.sysbook_alerts.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.sysbook_alerts.count_documents(query)
    active_count = await db.sysbook_alerts.count_documents({"source": "sysbook", "dismissed": {"$ne": True}})
    return {"alerts": alerts, "total": total, "active_count": active_count}


@router.post("/dismiss")
async def dismiss_alerts(body: DismissAlert, admin: dict = Depends(get_admin_user)):
    """Dismiss one or more alerts."""
    r = await db.sysbook_alerts.update_many(
        {"alert_id": {"$in": body.alert_ids}, "source": "sysbook"},
        {"$set": {"dismissed": True, "dismissed_at": datetime.now(timezone.utc).isoformat(), "dismissed_by": admin.get("user_id")}}
    )
    return {"dismissed": r.modified_count}


@router.post("/dismiss-all")
async def dismiss_all_alerts(admin: dict = Depends(get_admin_user)):
    """Dismiss all active alerts."""
    r = await db.sysbook_alerts.update_many(
        {"source": "sysbook", "dismissed": {"$ne": True}},
        {"$set": {"dismissed": True, "dismissed_at": datetime.now(timezone.utc).isoformat(), "dismissed_by": admin.get("user_id")}}
    )
    return {"dismissed": r.modified_count}


@router.post("/check-stock")
async def check_stock_levels(admin: dict = Depends(get_admin_user)):
    """
    Manually trigger a stock level check.
    Scans all Sysbook products and creates alerts for any below their threshold.
    Per-product threshold (low_stock_threshold field) takes priority over global.
    """
    settings = await db.sysbook_settings.find_one({"type": "alert_settings"}, {"_id": 0})
    global_threshold = (settings or {}).get("global_low_stock_threshold", DEFAULT_SETTINGS["global_low_stock_threshold"])

    # Fetch ALL active sysbook products (we check threshold per product)
    all_products = await db.store_products.find(
        {**SYSBOOK_FILTER, "active": True,
         "$or": [{"archived": {"$exists": False}}, {"archived": False}]},
        {"_id": 0, "book_id": 1, "name": 1, "inventory_quantity": 1, "grade": 1, "code": 1, "low_stock_threshold": 1}
    ).to_list(500)

    # Filter to those below their effective threshold
    low_products = []
    for p in all_products:
        effective = p.get("low_stock_threshold") if p.get("low_stock_threshold") is not None else global_threshold
        qty = p.get("inventory_quantity", 0)
        if qty <= effective:
            p["_effective_threshold"] = effective
            low_products.append(p)

    # Create alerts for products not already alerted (avoid duplicates)
    existing = set()
    async for a in db.sysbook_alerts.find(
        {"source": "sysbook", "dismissed": {"$ne": True}},
        {"book_id": 1, "_id": 0}
    ):
        existing.add(a.get("book_id"))

    new_alerts = []
    for p in low_products:
        if p["book_id"] in existing:
            continue
        qty = p.get("inventory_quantity", 0)
        eff = p["_effective_threshold"]
        alert = {
            "alert_id": f"alert_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{p['book_id'][-6:]}",
            "source": "sysbook",
            "alert_type": "out_of_stock" if qty <= 0 else "low_stock",
            "severity": "critical" if qty <= 0 else "warning",
            "book_id": p["book_id"],
            "product_name": p.get("name", "Unknown"),
            "product_code": p.get("code", ""),
            "grade": p.get("grade", ""),
            "current_quantity": qty,
            "threshold": eff,
            "is_custom_threshold": p.get("low_stock_threshold") is not None,
            "message": f"{'Out of stock' if qty <= 0 else 'Low stock'}: {p.get('name', 'Unknown')} — {qty} units (threshold: {eff})",
            "dismissed": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        new_alerts.append(alert)

    if new_alerts:
        await db.sysbook_alerts.insert_many(new_alerts)

        # Send push notification if enabled
        if (settings or {}).get("enable_push_notifications", True):
            await _send_low_stock_push(new_alerts)

    return {
        "checked": len(low_products),
        "new_alerts": len(new_alerts),
        "already_alerted": len(existing),
        "threshold": threshold,
    }


async def _send_low_stock_push(alerts: list):
    """Send push notification via OneSignal for low stock alerts."""
    try:
        config = await db.app_config.find_one({"type": "onesignal"}, {"_id": 0})
        if not config or not config.get("app_id") or not config.get("api_key"):
            logger.info("OneSignal not configured, skipping push notification")
            return

        import httpx
        count = len(alerts)
        critical = sum(1 for a in alerts if a["severity"] == "critical")
        title = "Sysbook Stock Alert"
        body = f"{count} product{'s' if count > 1 else ''} {'need' if count > 1 else 'needs'} attention"
        if critical:
            body += f" ({critical} out of stock)"

        async with httpx.AsyncClient() as client:
            await client.post(
                "https://onesignal.com/api/v1/notifications",
                headers={
                    "Authorization": f"Basic {config['api_key']}",
                    "Content-Type": "application/json",
                },
                json={
                    "app_id": config["app_id"],
                    "included_segments": ["Subscribed Users"],
                    "headings": {"en": title},
                    "contents": {"en": body},
                    "data": {"type": "sysbook_low_stock", "count": count},
                },
                timeout=10,
            )
        logger.info(f"Push notification sent for {count} stock alerts")
    except Exception as e:
        logger.warning(f"Failed to send push notification: {e}")


async def create_stock_alert_if_needed(book_id: str, product_name: str, new_quantity: int, grade: str = "", code: str = ""):
    """
    Called after stock adjustments to create alert if below threshold.
    This is the hook used by Sysbook inventory routes.
    """
    settings = await db.sysbook_settings.find_one({"type": "alert_settings"}, {"_id": 0})
    threshold = (settings or {}).get("global_low_stock_threshold", DEFAULT_SETTINGS["global_low_stock_threshold"])

    if new_quantity > threshold:
        # Auto-resolve existing alerts if stock is now above threshold
        await db.sysbook_alerts.update_many(
            {"book_id": book_id, "source": "sysbook", "dismissed": {"$ne": True}},
            {"$set": {"dismissed": True, "dismissed_at": datetime.now(timezone.utc).isoformat(), "auto_resolved": True}}
        )
        return None

    # Check if alert already exists
    existing = await db.sysbook_alerts.find_one(
        {"book_id": book_id, "source": "sysbook", "dismissed": {"$ne": True}},
        {"_id": 0}
    )
    if existing:
        # Update quantity in existing alert
        await db.sysbook_alerts.update_one(
            {"alert_id": existing["alert_id"]},
            {"$set": {"current_quantity": new_quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return existing["alert_id"]

    alert = {
        "alert_id": f"alert_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{book_id[-6:]}",
        "source": "sysbook",
        "alert_type": "out_of_stock" if new_quantity <= 0 else "low_stock",
        "severity": "critical" if new_quantity <= 0 else "warning",
        "book_id": book_id,
        "product_name": product_name,
        "product_code": code,
        "grade": grade,
        "current_quantity": new_quantity,
        "threshold": threshold,
        "message": f"{'Out of stock' if new_quantity <= 0 else 'Low stock'}: {product_name} — {new_quantity} units",
        "dismissed": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sysbook_alerts.insert_one(alert)
    alert.pop("_id", None)

    if (settings or {}).get("enable_push_notifications", True):
        await _send_low_stock_push([alert])

    return alert["alert_id"]
