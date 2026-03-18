"""
Admin Data Manager Routes
Unified interface for viewing stats and clearing data across all app modules.
Combines the old Demo Data + Data Cleanup into one comprehensive tool.
"""
import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from core.auth import get_admin_user
from core.database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/data-manager", tags=["admin-data-manager"])

# ── Module → collection mapping ──────────────────────────────────────────────
MODULE_COLLECTIONS = {
    "pinpanclub": {
        "label": "PinPanClub",
        "collections": {
            "pingpong_players":              "Players",
            "pinpanclub_superpin_matches":   "SuperPin Matches",
            "pinpanclub_rapidpin_matches":   "RapidPin Matches",
            "pinpanclub_superpin_rankings":  "Rankings",
            "pinpanclub_superpin_tournaments": "Tournaments",
            "pinpanclub_challenges_definitions": "Challenges",
            "pinpanclub_challenges_weekly":  "Weekly Challenges",
            "pinpanclub_achievements":       "Achievements",
            "pinpanclub_player_achievements": "Player Achievements",
        },
    },
    "sysbook": {
        "label": "Sysbook (Textbooks)",
        "collections": {
            "store_textbook_orders":         "Textbook Orders",
            "store_textbook_access_requests": "Access Requests",
            "store_textbook_access_students": "Access Students",
            "store_students":                "Students",
            "stock_orders":                  "Stock Movements",
            "sysbook_alerts":                "Stock Alerts",
            "sysbook_settings":              "Sysbook Settings",
            "import_history":                "Import History",
        },
    },
    "store": {
        "label": "Unatienda (Store)",
        "collections": {
            "store_products":                "Products",
            "store_categories":              "Categories",
            "store_orders":                  "Store Orders",
            "store_order_form_config":       "Order Form Config",
            "inventory_movements":           "Inventory Movements",
        },
    },
    "users": {
        "label": "Users & Auth",
        "collections": {
            "auth_users":                    "Auth Users",
            "users":                         "User Profiles (legacy)",
            "users_profiles":                "User Profiles",
            "chipi_user_profiles":           "Chipi Profiles",
            "user_roles":                    "User Roles",
            "user_permissions":              "User Permissions",
            "roles":                         "Roles",
        },
    },
    "wallets": {
        "label": "Wallets & Transactions",
        "collections": {
            "chipi_wallets":                 "Wallets",
            "chipi_transactions":            "Transactions (v1)",
            "wallet_transactions":           "Transactions (v2)",
            "wallet_wallets":                "Wallet Wallets",
            "alertas_wallet":                "Wallet Alerts",
            "wallet_pending_topups":         "Pending Top-ups",
            "transferencias_wallet":         "Transfers",
            "chipi_points_history":          "Points History",
        },
    },
    "memberships": {
        "label": "Memberships",
        "collections": {
            "users_membership_plans":        "Plans",
            "users_memberships":             "Active Memberships",
            "users_membership_visits":       "Visits",
        },
    },
    "community": {
        "label": "Community & Posts",
        "collections": {
            "community_posts":               "Community Posts",
            "community_comments":            "Comments",
            "community_likes":               "Likes",
            "notifications_posts":           "Notification Posts",
            "notifications":                 "Notifications",
        },
    },
    "crm": {
        "label": "CRM & Messages",
        "collections": {
            "crm_student_links":             "Student Links",
            "crm_chat_messages":             "Chat Messages",
            "crm_chat_notifications":        "Chat Notifications",
            "order_messages":                "Order Messages",
        },
    },
}

# Collections that should NEVER be fully cleared (config/system)
PROTECTED_COLLECTIONS = {
    "app_config", "site_config", "roles", "form_configs",
    "monday_configs", "wallet_settings", "membresias_config",
    "community_config", "chipi_wallet_config", "chipi_user_types",
    "chipi_points_rules", "chipi_profile_fields",
}


class ClearRequest(BaseModel):
    module: Optional[str] = None          # clear entire module
    collections: Optional[List[str]] = None  # clear specific collections
    confirm: bool = False                 # safety flag


# ── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_data_stats(admin: dict = Depends(get_admin_user)):
    """Get record counts for every module and collection (parallel for speed)."""
    # Flatten all collections for parallel counting
    all_colls = []
    for mod_key, mod_info in MODULE_COLLECTIONS.items():
        for coll_name, coll_label in mod_info["collections"].items():
            all_colls.append((mod_key, coll_name, coll_label))

    # Count all collections in parallel using estimated_document_count (fast on Atlas)
    async def _count(coll_name):
        try:
            return await db[coll_name].estimated_document_count()
        except Exception:
            try:
                return await db[coll_name].count_documents({})
            except Exception:
                return 0

    counts = await asyncio.gather(*[_count(c[1]) for c in all_colls])

    # Assemble result
    result = {}
    for (mod_key, coll_name, coll_label), count in zip(all_colls, counts):
        if mod_key not in result:
            result[mod_key] = {
                "label": MODULE_COLLECTIONS[mod_key]["label"],
                "collections": {},
                "total": 0,
            }
        result[mod_key]["collections"][coll_name] = {"label": coll_label, "count": count}
        result[mod_key]["total"] += count

    # Admin user count (for protection info)
    try:
        admin_count = await db.auth_users.count_documents({"is_admin": True})
    except Exception:
        admin_count = 0
    result["_meta"] = {"admin_user_count": admin_count}
    return result


# ── Clear ────────────────────────────────────────────────────────────────────

@router.post("/clear")
async def clear_data(request: ClearRequest, admin: dict = Depends(get_admin_user)):
    """Clear data from specific collections or an entire module."""
    if not request.confirm:
        raise HTTPException(status_code=400, detail="Set confirm=true to proceed")

    if not request.module and not request.collections:
        raise HTTPException(status_code=400, detail="Specify module or collections")

    # Build list of collections to clear
    targets = []
    if request.module:
        mod = MODULE_COLLECTIONS.get(request.module)
        if not mod:
            raise HTTPException(status_code=404, detail=f"Unknown module: {request.module}")
        targets = list(mod["collections"].keys())
    if request.collections:
        targets = request.collections

    results = {}
    protected_admin_ids = set()

    # Get admin user IDs for protection
    admins = await db.auth_users.find({"is_admin": True}, {"_id": 0, "user_id": 1}).to_list(50)
    protected_admin_ids = {a["user_id"] for a in admins if a.get("user_id")}

    for coll_name in targets:
        if coll_name in PROTECTED_COLLECTIONS:
            results[coll_name] = {"deleted": 0, "skipped": True, "reason": "protected config"}
            continue

        try:
            # Special handling for auth_users — protect admins
            if coll_name == "auth_users":
                r = await db[coll_name].delete_many({"is_admin": {"$ne": True}})
                results[coll_name] = {
                    "deleted": r.deleted_count,
                    "note": f"Admin accounts preserved ({len(protected_admin_ids)} protected)"
                }
            else:
                r = await db[coll_name].delete_many({})
                results[coll_name] = {"deleted": r.deleted_count}
        except Exception as e:
            logger.error(f"[DataManager] Error clearing {coll_name}: {e}")
            results[coll_name] = {"deleted": 0, "error": str(e)}

    admin_email = admin.get("email", "unknown")
    logger.info(f"[DataManager] Clear executed by {admin_email}: module={request.module}, collections={request.collections}, results={results}")
    return {"status": "cleared", "results": results, "executed_by": admin_email}


# ── Seed Demo ────────────────────────────────────────────────────────────────

@router.post("/seed-demo")
async def seed_demo_data(admin: dict = Depends(get_admin_user)):
    """Proxy to the existing seed_demo endpoint logic."""
    from modules.admin.seed_demo import seed_demo_data as _seed
    return await _seed(admin)
