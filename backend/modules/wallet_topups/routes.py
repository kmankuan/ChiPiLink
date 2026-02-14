"""
Wallet Top-ups Module - Pending transactions, admin approval, email rules, processing log.
Handles the Gmail → AI Parse → Pending → Approve/Reject → Credit wallet pipeline.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import asyncio
import logging

from core.database import db
from core.auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/wallet-topups", tags=["Wallet Topups"])

PENDING_COL = "wallet_pending_topups"
RULES_COL = "wallet_topup_rules"
SETTINGS_COL = "wallet_topup_settings"


# ============== PENDING TOP-UPS CRUD ==============

@router.get("/pending")
async def list_pending(
    status: str = "all",
    admin: dict = Depends(get_admin_user)
):
    """List pending top-ups. Filter by status: all, pending, approved, rejected."""
    query = {}
    if status != "all":
        query["status"] = status
    items = await db[PENDING_COL].find(
        query, {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    counts = {
        "pending": await db[PENDING_COL].count_documents({"status": "pending"}),
        "approved": await db[PENDING_COL].count_documents({"status": "approved"}),
        "rejected": await db[PENDING_COL].count_documents({"status": "rejected"}),
        "total": await db[PENDING_COL].count_documents({}),
    }
    return {"items": items, "counts": counts}


@router.post("/pending")
async def create_pending_topup(data: dict, admin: dict = Depends(get_admin_user)):
    """Manually create a pending top-up (for testing or manual entry)."""
    amount = data.get("amount")
    if not amount or float(amount) <= 0:
        raise HTTPException(status_code=400, detail="Valid amount is required")

    doc = {
        "id": str(uuid.uuid4()),
        "status": "pending",
        "amount": float(amount),
        "currency": data.get("currency", "USD"),
        "sender_name": data.get("sender_name", ""),
        "sender_ref": data.get("sender_ref", ""),
        "bank_reference": data.get("bank_reference", ""),
        "target_user_id": data.get("target_user_id", ""),
        "target_user_email": data.get("target_user_email", ""),
        "source": data.get("source", "manual"),
        "email_subject": data.get("email_subject", ""),
        "email_from": data.get("email_from", ""),
        "email_body_preview": data.get("email_body_preview", ""),
        "ai_parsed_data": data.get("ai_parsed_data", {}),
        "ai_confidence": data.get("ai_confidence", None),
        "rule_match": data.get("rule_match", ""),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email", "system"),
        "reviewed_by": None,
        "reviewed_at": None,
    }
    await db[PENDING_COL].insert_one(doc)
    doc.pop("_id", None)

    # Run dedup check (run against items created BEFORE this one)
    from .dedup_engine import check_duplicate
    dedup_result = await check_duplicate(
        {"amount": doc["amount"], "sender_name": doc["sender_name"], "bank_reference": doc["bank_reference"]},
        {},
        exclude_id=doc["id"]
    )
    doc["risk_level"] = dedup_result.get("risk_level", "clear")
    doc["warning_text"] = dedup_result.get("warning_text", "")
    doc["dedup_warnings"] = dedup_result.get("warnings", [])
    doc["dedup_matched_items"] = dedup_result.get("matched_items", [])
    await db[PENDING_COL].update_one({"id": doc["id"]}, {"$set": {
        "risk_level": doc["risk_level"],
        "warning_text": doc["warning_text"],
        "dedup_warnings": doc["dedup_warnings"],
        "dedup_matched_items": doc["dedup_matched_items"],
    }})

    # Sync to Monday.com
    asyncio.create_task(_sync_pending_to_monday(doc, dedup_result))

    return doc


@router.put("/pending/{topup_id}/approve")
async def approve_topup(topup_id: str, data: dict = None, admin: dict = Depends(get_admin_user)):
    """Approve a pending top-up and credit the wallet."""
    data = data or {}
    item = await db[PENDING_COL].find_one({"id": topup_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Top-up not found")
    if item["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot approve: status is '{item['status']}'")

    # Update status
    update = {
        "status": "approved",
        "reviewed_by": admin.get("email", "admin"),
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "review_notes": data.get("notes", ""),
    }
    await db[PENDING_COL].update_one({"id": topup_id}, {"$set": update})

    # Credit the wallet
    credited = False
    target_user = item.get("target_user_id")
    if target_user:
        try:
            from modules.users.services.wallet_service import wallet_service
            from modules.users.models.wallet_models import Currency, PaymentMethod
            transaction = await wallet_service.deposit(
                user_id=target_user,
                amount=item["amount"],
                currency=Currency(item.get("currency", "USD")),
                payment_method=PaymentMethod("bank_transfer"),
                reference=item.get("bank_reference", topup_id),
                description=f"Bank transfer from {item.get('sender_name', 'unknown')} (auto-detected, approved by {admin.get('email')})"
            )
            credited = True
            # Sync wallet tx to Monday
            try:
                from modules.users.routes.wallet import _monday_sync_tx
                asyncio.create_task(_monday_sync_tx(
                    target_user, item["amount"], "topup",
                    f"Bank transfer (approved)", item.get("bank_reference", "")
                ))
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Failed to credit wallet for topup {topup_id}: {e}")
            await db[PENDING_COL].update_one(
                {"id": topup_id},
                {"$set": {"credit_error": str(e)}}
            )

    # Update Monday.com item status
    asyncio.create_task(_update_monday_status(item, "approved"))

    return {
        "success": True,
        "credited": credited,
        "topup_id": topup_id,
        "amount": item["amount"],
        "target_user": target_user,
    }


@router.put("/pending/{topup_id}/reject")
async def reject_topup(topup_id: str, data: dict = None, admin: dict = Depends(get_admin_user)):
    """Reject a pending top-up."""
    data = data or {}
    item = await db[PENDING_COL].find_one({"id": topup_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Top-up not found")
    if item["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot reject: status is '{item['status']}'")

    update = {
        "status": "rejected",
        "reviewed_by": admin.get("email", "admin"),
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "review_notes": data.get("notes", ""),
        "reject_reason": data.get("reason", ""),
    }
    await db[PENDING_COL].update_one({"id": topup_id}, {"$set": update})

    # Update Monday.com
    asyncio.create_task(_update_monday_status(item, "rejected"))

    return {"success": True, "topup_id": topup_id}


@router.get("/pending/{topup_id}")
async def get_pending_topup(topup_id: str, admin: dict = Depends(get_admin_user)):
    """Get details of a single pending top-up."""
    item = await db[PENDING_COL].find_one({"id": topup_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item


# ============== EMAIL FILTER RULES ==============

DEFAULT_RULES = {
    "id": "default",
    "sender_whitelist": [],
    "must_contain_keywords": [],
    "must_not_contain_keywords": [],
    "amount_auto_approve_threshold": 0,
    "amount_max_threshold": 10000,
    "enabled": True,
    "updated_at": None,
    "updated_by": None,
}


@router.get("/rules")
async def get_rules(admin: dict = Depends(get_admin_user)):
    """Get email filter rules configuration."""
    rules = await db[RULES_COL].find_one({"id": "default"}, {"_id": 0})
    if not rules:
        rules = {**DEFAULT_RULES}
        await db[RULES_COL].insert_one({**rules})
        rules.pop("_id", None)
    return rules


@router.put("/rules")
async def update_rules(data: dict, admin: dict = Depends(get_admin_user)):
    """Update email filter rules."""
    update_fields = {}
    allowed = [
        "sender_whitelist", "must_contain_keywords",
        "must_not_contain_keywords", "amount_auto_approve_threshold",
        "amount_max_threshold", "enabled"
    ]
    for field in allowed:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")

    existing = await db[RULES_COL].find_one({"id": "default"})
    if not existing:
        await db[RULES_COL].insert_one({**DEFAULT_RULES, **update_fields, "id": "default"})
    else:
        await db[RULES_COL].update_one({"id": "default"}, {"$set": update_fields})

    rules = await db[RULES_COL].find_one({"id": "default"}, {"_id": 0})
    return rules


# ============== SETTINGS ==============

DEFAULT_SETTINGS = {
    "id": "default",
    "gmail_connected": False,
    "gmail_email": "",
    "polling_mode": "realtime",
    "polling_interval_minutes": 1,
    "auto_process": True,
    "require_approval": True,
    "updated_at": None,
}


@router.get("/settings")
async def get_settings(admin: dict = Depends(get_admin_user)):
    """Get processing settings."""
    settings = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
    if not settings:
        settings = {**DEFAULT_SETTINGS}
        await db[SETTINGS_COL].insert_one({**settings})
        settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_settings(data: dict, admin: dict = Depends(get_admin_user)):
    """Update processing settings. Restarts/stops Gmail poller as needed."""
    update_fields = {}
    allowed = [
        "polling_mode", "polling_interval_minutes",
        "auto_process", "require_approval"
    ]
    for field in allowed:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields")

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    existing = await db[SETTINGS_COL].find_one({"id": "default"})
    if not existing:
        await db[SETTINGS_COL].insert_one({**DEFAULT_SETTINGS, **update_fields, "id": "default"})
    else:
        await db[SETTINGS_COL].update_one({"id": "default"}, {"$set": update_fields})

    # Restart or stop Gmail poller based on new settings
    from .gmail_poller import gmail_poller
    if "polling_mode" in update_fields:
        if update_fields["polling_mode"] == "realtime":
            await gmail_poller.stop()
            await gmail_poller.start()
        else:
            await gmail_poller.stop()

    result = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
    return result


@router.get("/polling/status")
async def get_polling_status(admin: dict = Depends(get_admin_user)):
    """Check the Gmail background polling status."""
    from .gmail_poller import gmail_poller
    settings = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})
    return {
        "poller_running": gmail_poller.is_running,
        "polling_mode": settings.get("polling_mode", "manual") if settings else "manual",
        "polling_interval_minutes": settings.get("polling_interval_minutes", 1) if settings else 1,
        "last_auto_scan": settings.get("last_auto_scan") if settings else None,
        "last_scan_created": settings.get("last_scan_created", 0) if settings else 0,
    }


# ============== STATS ==============

@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    """Get dashboard stats for the payment alerts module."""
    pending_count = await db[PENDING_COL].count_documents({"status": "pending"})
    approved_count = await db[PENDING_COL].count_documents({"status": "approved"})
    rejected_count = await db[PENDING_COL].count_documents({"status": "rejected"})

    # Sum of approved amounts
    pipeline = [
        {"$match": {"status": "approved"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result = await db[PENDING_COL].aggregate(pipeline).to_list(1)
    total_approved_amount = result[0]["total"] if result else 0

    # Today's pending
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    today_pending = await db[PENDING_COL].count_documents({
        "status": "pending",
        "created_at": {"$gte": today_start}
    })

    settings = await db[SETTINGS_COL].find_one({"id": "default"}, {"_id": 0})

    return {
        "pending": pending_count,
        "approved": approved_count,
        "rejected": rejected_count,
        "total_approved_amount": total_approved_amount,
        "today_pending": today_pending,
        "gmail_connected": settings.get("gmail_connected", False) if settings else False,
    }


# ============== GMAIL INTEGRATION ==============

@router.get("/gmail/status")
async def gmail_status(admin: dict = Depends(get_admin_user)):
    """Check Gmail connection status."""
    from .gmail_service import gmail_service
    result = await asyncio.to_thread(gmail_service.test_connection)
    # Update settings with connection status
    await db[SETTINGS_COL].update_one(
        {"id": "default"},
        {"$set": {"gmail_connected": result["connected"], "gmail_email": result.get("email", "")}},
        upsert=True
    )
    return result


@router.get("/gmail/emails")
async def list_gmail_emails(limit: int = 20, admin: dict = Depends(get_admin_user)):
    """Fetch recent emails from Gmail inbox."""
    from .gmail_service import gmail_service
    if not gmail_service.is_configured:
        raise HTTPException(status_code=400, detail="Gmail not configured")
    emails = await asyncio.to_thread(gmail_service.fetch_recent_emails, limit)
    return {"emails": emails, "total": len(emails)}


@router.post("/gmail/process")
async def process_gmail_emails(data: dict = None, admin: dict = Depends(get_admin_user)):
    """Scan Gmail inbox, parse bank alerts with AI, apply rules, create pending top-ups."""
    data = data or {}
    limit = data.get("limit", 20)

    from .gmail_service import gmail_service, process_email

    if not gmail_service.is_configured:
        raise HTTPException(status_code=400, detail="Gmail not configured")

    emails = await asyncio.to_thread(gmail_service.fetch_recent_emails, limit)
    results = {"processed": 0, "created": 0, "skipped": 0, "rejected": 0, "errors": 0, "details": []}

    for em in emails:
        try:
            result = await process_email(em)
            results["processed"] += 1
            if result.get("skipped"):
                results["skipped"] += 1
            elif result.get("rejected"):
                results["rejected"] += 1
            elif result.get("created"):
                results["created"] += 1
                # Sync to Monday.com with dedup warnings
                asyncio.create_task(_sync_pending_to_monday(result["topup"], result.get("dedup")))
            results["details"].append({
                "subject": em.get("subject", "")[:80],
                "from": em.get("from", ""),
                "result": "created" if result.get("created") else "rejected" if result.get("rejected") else "skipped",
                "reason": result.get("reason", ""),
            })
        except Exception as e:
            results["errors"] += 1
            results["details"].append({
                "subject": em.get("subject", "")[:80],
                "from": em.get("from", ""),
                "result": "error",
                "reason": str(e),
            })

    return results


@router.post("/gmail/process-single")
async def process_single_email(data: dict, admin: dict = Depends(get_admin_user)):
    """Process a single email by providing its content directly (for testing)."""
    from .gmail_service import parse_email_with_ai, apply_rules

    body = data.get("body", "")
    subject = data.get("subject", "")
    from_addr = data.get("from", "")

    if not body:
        raise HTTPException(status_code=400, detail="Email body required")

    parsed = await parse_email_with_ai(body, subject, from_addr)
    email_data = {"from": from_addr, "subject": subject, "body": body}
    rule_result = await apply_rules(email_data, parsed) if parsed.get("parsed") else {"pass": False, "reason": "Parse failed"}

    return {
        "parsed_data": parsed,
        "rule_result": rule_result,
    }


@router.get("/gmail/processed")
async def list_processed_emails(limit: int = 50, admin: dict = Depends(get_admin_user)):
    """List recently processed emails (processing log)."""
    items = await db["wallet_processed_emails"].find(
        {}, {"_id": 0}
    ).sort("processed_at", -1).to_list(limit)
    return {"items": items, "total": len(items)}


# ============== MONDAY.COM BOARD CONFIGURATION ==============

MONDAY_CONFIG_COL = "wallet_topup_monday_config"

@router.get("/monday/config")
async def get_monday_config(admin: dict = Depends(get_admin_user)):
    """Get Monday.com board & column mapping configuration."""
    config = await db[MONDAY_CONFIG_COL].find_one({"id": "default"}, {"_id": 0})
    if not config:
        config = {
            "id": "default",
            "board_id": "",
            "board_name": "",
            "group_id": "",
            "column_mapping": {
                "amount": "",
                "sender_name": "",
                "status": "",
                "warning": "",
                "bank_reference": "",
                "email_date": "",
                "source": "",
                "confidence": "",
            },
            "post_email_as_update": True,
            "enabled": False,
        }
        await db[MONDAY_CONFIG_COL].insert_one({**config})
        config.pop("_id", None)
    return config


@router.put("/monday/config")
async def update_monday_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Save Monday.com board & column mapping."""
    update_fields = {}
    for field in ["board_id", "board_name", "group_id", "column_mapping", "post_email_as_update", "enabled"]:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")

    existing = await db[MONDAY_CONFIG_COL].find_one({"id": "default"})
    if not existing:
        await db[MONDAY_CONFIG_COL].insert_one({"id": "default", **update_fields})
    else:
        await db[MONDAY_CONFIG_COL].update_one({"id": "default"}, {"$set": update_fields})
    return await db[MONDAY_CONFIG_COL].find_one({"id": "default"}, {"_id": 0})


@router.get("/monday/boards")
async def list_monday_boards(admin: dict = Depends(get_admin_user)):
    """Fetch all Monday.com boards."""
    try:
        from modules.integrations.monday.core_client import monday_client
        boards = await monday_client.get_boards()
        return {"boards": [{"id": b["id"], "name": b["name"]} for b in boards]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/monday/boards/{board_id}/columns")
async def get_board_columns(board_id: str, admin: dict = Depends(get_admin_user)):
    """Fetch columns for a specific Monday.com board."""
    try:
        from modules.integrations.monday.core_client import monday_client
        columns = await monday_client.get_board_columns(board_id)
        groups = await monday_client.get_board_groups(board_id)
        return {"columns": columns, "groups": groups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/monday/test")
async def test_monday_connection(admin: dict = Depends(get_admin_user)):
    """Test Monday.com API connection."""
    try:
        from modules.integrations.monday.core_client import monday_client
        result = await monday_client.test_connection()
        return result
    except Exception as e:
        return {"connected": False, "error": str(e)}

async def _sync_pending_to_monday(topup: dict, dedup_result: dict = None):
    """Create a Monday.com item for a new pending top-up."""
    try:
        from .monday_sync import payment_alerts_monday
        item_id = await payment_alerts_monday.create_topup_item(topup, dedup_result)
        if item_id:
            logger.info(f"Synced topup {topup.get('id', '')[:8]} to Monday.com item {item_id}")
            # Store Monday.com item ID on the topup
            await db[PENDING_COL].update_one(
                {"id": topup.get("id", "")},
                {"$set": {"monday_item_id": item_id}}
            )
    except Exception as e:
        logger.warning(f"Monday.com sync for pending topup failed: {e}")


async def _update_monday_status(topup: dict, new_status: str):
    """Update Monday.com item status when approved/rejected."""
    try:
        from .monday_sync import payment_alerts_monday
        await payment_alerts_monday.update_item_status(
            topup.get("id", ""),
            new_status,
            topup.get("reviewed_by", "admin")
        )
    except Exception as e:
        logger.warning(f"Monday.com status update failed: {e}")
