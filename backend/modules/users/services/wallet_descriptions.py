"""
Shared wallet transaction description helpers.
Extracted here to avoid circular imports between wallet.py ↔ monday_wallet_adapter.py.
"""
from core.database import db

WALLET_DESCRIPTION_DEFAULTS = {
    "topup": "Wallet top-up",
    "deduct": "Wallet deduction",
    "monday_topup": "Wallet top-up (Monday.com)",
    "monday_deduct": "Wallet deduction (Monday.com)",
    "purchase": "Purchase",
    "transfer_sent": "Transfer sent",
    "transfer_received": "Transfer received",
}


async def get_default_description(action: str) -> str:
    """Get the admin-configurable default description for wallet transactions."""
    doc = await db.wallet_settings.find_one({"key": "default_descriptions"}, {"_id": 0})
    if doc and doc.get("descriptions", {}).get(action):
        return doc["descriptions"][action]
    return WALLET_DESCRIPTION_DEFAULTS.get(action, "Wallet transaction")


async def get_all_descriptions() -> dict:
    """Get all configurable descriptions with defaults."""
    doc = await db.wallet_settings.find_one({"key": "default_descriptions"}, {"_id": 0})
    saved = doc.get("descriptions", {}) if doc else {}
    return {k: saved.get(k, v) for k, v in WALLET_DESCRIPTION_DEFAULTS.items()}
