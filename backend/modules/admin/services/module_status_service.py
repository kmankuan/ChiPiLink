"""
Module Status Service
Business logic for module lifecycle status management.
"""
from typing import Dict
from datetime import datetime, timezone
from core.database import db
import logging

logger = logging.getLogger(__name__)

DEFAULT_MODULE_STATUSES = {
    "home": {"status": "production", "customLabel": ""},
    "unatienda": {"status": "live_beta", "customLabel": "Live Beta"},
    "textbook_orders": {"status": "live_beta", "customLabel": "Live Beta"},
    "orders": {"status": "live_beta", "customLabel": "Live Beta"},
    "my_students": {"status": "live_beta", "customLabel": "Live Beta"},
    "pinpanclub": {"status": "live_beta", "customLabel": "Live Beta"},
    "super_pin": {"status": "live_beta", "customLabel": "Live Beta"},
    "rapid_pin": {"status": "coming_soon", "customLabel": ""},
    "events": {"status": "coming_soon", "customLabel": ""},
    "gallery": {"status": "coming_soon", "customLabel": ""},
    "players": {"status": "live_beta", "customLabel": "Live Beta"},
    "admin_dashboard": {"status": "production", "customLabel": ""},
    "admin_integrations": {"status": "live_beta", "customLabel": "Live Beta"},
}

MODULE_NAMES = {
    "home": "Home",
    "unatienda": "Unatienda (Store)",
    "textbook_orders": "Textbook Orders",
    "orders": "My Orders",
    "my_students": "My Students",
    "pinpanclub": "PinPanClub",
    "super_pin": "Super Pin",
    "rapid_pin": "Rapid Pin",
    "events": "Events",
    "gallery": "Gallery",
    "players": "Players",
    "admin_dashboard": "Admin Dashboard",
    "admin_integrations": "Admin Integrations",
}

AVAILABLE_STATUSES = ["production", "live_beta", "coming_soon", "maintenance"]


class ModuleStatusService:
    """Service for managing module lifecycle statuses"""

    async def get_statuses(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "module_statuses"}, {"_id": 0})
        statuses = config.get("value", DEFAULT_MODULE_STATUSES) if config else DEFAULT_MODULE_STATUSES
        return {
            "statuses": statuses,
            "module_names": MODULE_NAMES,
            "available_statuses": AVAILABLE_STATUSES,
        }

    async def update_statuses(self, statuses: Dict, admin_id: str) -> bool:
        await db.app_config.update_one(
            {"config_key": "module_statuses"},
            {"$set": {
                "config_key": "module_statuses",
                "value": statuses,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin_id,
            }},
            upsert=True,
        )
        return True

    async def get_public_statuses(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "module_statuses"}, {"_id": 0})
        if config and config.get("value"):
            return {"statuses": config["value"]}
        return {"statuses": DEFAULT_MODULE_STATUSES}


module_status_service = ModuleStatusService()
