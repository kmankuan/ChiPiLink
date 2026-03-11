"""
Payment Verification Routes
API endpoints for the payment verification pipeline.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from core.auth import get_admin_user, get_current_user
from .payment_verification import payment_verification_service

router = APIRouter(prefix="/payment-verify", tags=["Payment Verification"])


# ═══ PUBLIC ENDPOINT — No login required ═══

@router.get("/public/check")
async def public_check_payment(ref: str = Query(..., min_length=3)):
    """
    Public payment status lookup. No auth required.
    Only returns: status, amount, date — NO personal info exposed.
    """
    from core.database import db

    # Search by reference (exact or partial match)
    record = await db.payment_verifications.find_one(
        {"bank_reference": {"$regex": ref.strip(), "$options": "i"}},
        {"_id": 0, "verification_status": 1, "amount": 1, "verified_amount": 1,
         "bank_account": 1, "created_at": 1, "wallet_credited": 1}
    )

    if not record:
        return {"found": False}

    # Map internal status to user-friendly display
    status = record.get("verification_status", "pending")
    status_map = {
        "pending": {"label": "Pendiente de verificación", "color": "yellow"},
        "received": {"label": "Pago verificado", "color": "green"},
        "not_found_1/3": {"label": "En proceso de verificación", "color": "yellow"},
        "not_found_2/3": {"label": "En proceso de verificación", "color": "yellow"},
        "not_found_3/3": {"label": "No encontrado — contacte soporte", "color": "red"},
        "check_later": {"label": "En proceso de verificación", "color": "yellow"},
    }
    display = status_map.get(status, {"label": "En revisión", "color": "yellow"})

    return {
        "found": True,
        "status": display["label"],
        "color": display["color"],
        "amount": record.get("verified_amount") or record.get("amount"),
        "date": record.get("created_at", "")[:10],
        "credited": record.get("wallet_credited", False),
    }




@router.get("/search")
async def search_payments(
    q: str = "",
    status: Optional[str] = None,
    bank: Optional[str] = None,
    limit: int = 50,
    user: dict = Depends(get_current_user),
):
    """Search payment verification records. Available to any logged-in user."""
    records = await payment_verification_service.search_payments(q, status, bank, limit)
    return {"records": records, "count": len(records)}


@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    """Get payment verification statistics."""
    return await payment_verification_service.get_stats()


@router.post("/process-alert")
async def process_bank_alert(data: dict, admin: dict = Depends(get_admin_user)):
    """
    Process a bank email alert — parse, match user, create Monday item.
    Body: {subject, body, from, date, amount?, reference?, sender_name?}
    """
    result = await payment_verification_service.process_bank_alert(data)
    return result


@router.post("/webhook/verification")
async def verification_webhook(data: dict):
    """
    Webhook: ZeroWork or Monday updates verification status.
    Body: {item_id, verification_status, verified_amount?, txn_date?}
    """
    return await payment_verification_service.handle_verification_webhook(data)


@router.post("/webhook/action")
async def action_webhook(data: dict):
    """
    Webhook: Monday Action column changed (Top Up / Done / Verify Only).
    Body: {item_id, action}
    """
    return await payment_verification_service.handle_action_webhook(data)


@router.post("/{record_id}/manual-verify")
async def manual_verify(record_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Admin manually verifies a payment."""
    from core.database import db
    from datetime import datetime, timezone

    record = await db.payment_verifications.find_one({"record_id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Record not found")

    status = data.get("status", "received")  # received or not_found
    await db.payment_verifications.update_one(
        {"record_id": record_id},
        {"$set": {
            "verification_status": status,
            "verified_by": admin.get("user_id"),
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "verified_amount": data.get("amount", record.get("amount")),
        }}
    )

    # Update Monday board if linked
    if record.get("monday_item_id"):
        try:
            from modules.integrations.monday.core_client import monday_client
            label = "Received" if status == "received" else "Not Found 3/3"
            await monday_client.update_column_values(
                "18399650704", record["monday_item_id"],
                {"color_mm1bsdk8": {"label": label}},
                create_labels_if_missing=True,
            )
        except Exception as e:
            pass  # Non-blocking

    return {"success": True, "status": status}


@router.post("/{record_id}/top-up")
async def trigger_top_up(record_id: str, admin: dict = Depends(get_admin_user)):
    """Admin triggers wallet top-up for a verified payment."""
    from core.database import db

    record = await db.payment_verifications.find_one({"record_id": record_id}, {"_id": 0})
    if not record:
        raise HTTPException(404, "Record not found")

    if not record.get("chipi_user_id"):
        raise HTTPException(400, "No ChiPi user linked to this payment")

    amount = record.get("verified_amount") or record.get("amount", 0)
    if not amount or amount <= 0:
        raise HTTPException(400, "Invalid amount")

    return await payment_verification_service.handle_action_webhook({
        "item_id": record.get("monday_item_id", ""),
        "action": "Top Up",
    })
