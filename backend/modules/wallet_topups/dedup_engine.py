"""
Deduplication Engine for Wallet Top-ups.
4 layers of duplicate detection:
1. Message-ID (email-level, already in process_email)
2. Bank reference match
3. Amount + sender + date fingerprint (within 24h window)
4. Warning classification for admin review
"""
import logging
from datetime import datetime, timezone, timedelta
from core.database import db

logger = logging.getLogger(__name__)

PENDING_COL = "wallet_pending_topups"


async def check_duplicate(parsed_data: dict, email_data: dict) -> dict:
    """Run all 4 dedup layers. Returns warning classification."""
    amount = parsed_data.get("amount", 0)
    sender = (parsed_data.get("sender_name", "") or "").strip().lower()
    bank_ref = (parsed_data.get("bank_reference", "") or "").strip()
    warnings = []
    risk_level = "clear"
    matched_items = []

    # Layer 2: Bank reference match
    if bank_ref:
        existing = await db[PENDING_COL].find_one(
            {"bank_reference": bank_ref, "status": {"$in": ["pending", "approved"]}},
            {"_id": 0, "id": 1, "amount": 1, "status": 1, "created_at": 1, "sender_name": 1}
        )
        if existing:
            risk_level = "duplicate"
            warnings.append(f"DUPLICATE: Bank reference '{bank_ref}' already exists in item {existing['id'][:8]} (${existing['amount']} - {existing['status']})")
            matched_items.append(existing)

    # Layer 3: Amount + sender fingerprint (within 24h)
    if amount > 0 and sender and risk_level != "duplicate":
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
        pipeline = [
            {"$match": {
                "amount": amount,
                "status": {"$in": ["pending", "approved"]},
                "created_at": {"$gte": cutoff},
            }},
            {"$project": {"_id": 0, "id": 1, "amount": 1, "sender_name": 1, "status": 1, "created_at": 1, "bank_reference": 1}}
        ]
        similar = await db[PENDING_COL].aggregate(pipeline).to_list(10)
        for item in similar:
            item_sender = (item.get("sender_name", "") or "").strip().lower()
            if item_sender and sender and (sender in item_sender or item_sender in sender):
                risk_level = "potential_duplicate"
                warnings.append(f"POTENTIAL DUPLICATE: Same amount (${amount}) from similar sender '{item.get('sender_name')}' within 24h — item {item['id'][:8]} ({item['status']})")
                matched_items.append(item)
                break

        # Also check just amount match in last 2 hours (without sender match)
        if risk_level == "clear" and amount > 0:
            cutoff_2h = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
            recent_same_amount = await db[PENDING_COL].find_one(
                {"amount": amount, "status": {"$in": ["pending", "approved"]}, "created_at": {"$gte": cutoff_2h}},
                {"_id": 0, "id": 1, "amount": 1, "sender_name": 1, "status": 1, "created_at": 1}
            )
            if recent_same_amount:
                risk_level = "low_risk"
                warnings.append(f"LOW RISK: Same amount (${amount}) found within 2h — item {recent_same_amount['id'][:8]}, but different sender")
                matched_items.append(recent_same_amount)

    # Layer 4: Build warning summary
    if risk_level == "clear":
        warning_text = "No risk — no duplicates detected"
    elif risk_level == "duplicate":
        warning_text = "DUPLICATE — exact bank reference match"
    elif risk_level == "potential_duplicate":
        warning_text = "POTENTIAL DUPLICATE — same amount & sender within 24h"
    else:
        warning_text = "LOW RISK — same amount recently, different sender"

    return {
        "risk_level": risk_level,
        "warning_text": warning_text,
        "warnings": warnings,
        "matched_items": [{
            "id": m.get("id", "")[:8],
            "amount": m.get("amount"),
            "sender": m.get("sender_name", ""),
            "status": m.get("status", ""),
            "date": m.get("created_at", ""),
        } for m in matched_items],
    }
