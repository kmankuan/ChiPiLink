"""
Monday.com Configuration Service for Store Module
Provides configuration management for Monday.com integration
"""
from typing import Dict, List, Optional
from core.database import db
import logging

logger = logging.getLogger(__name__)

MONDAY_CONFIG_COLLECTION = "store_monday_config"


class MondayConfigService:
    """Service for managing Monday.com configuration for textbook orders"""

    async def get_config(self) -> Dict:
        """Get Monday.com configuration for textbook orders board"""
        config = await db[MONDAY_CONFIG_COLLECTION].find_one(
            {"config_type": "textbook_orders"},
            {"_id": 0}
        )

        if not config:
            return {
                "board_id": None,
                "group_id": None,
                "auto_sync": True,
                "column_mapping": {},
                "subitems_enabled": False,
                "subitem_column_mapping": {},
                "status_mapping": {},
            }

        return config

    async def save_config(self, config: Dict) -> bool:
        """Save Monday.com textbook orders board configuration"""
        config["config_type"] = "textbook_orders"

        result = await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "textbook_orders"},
            {"$set": config},
            upsert=True
        )

        return result.acknowledged

    # ---------- Inventory Board ----------

    async def get_inventory_config(self) -> Dict:
        """Get Monday.com configuration for inventory board"""
        config = await db[MONDAY_CONFIG_COLLECTION].find_one(
            {"config_type": "inventory_board"},
            {"_id": 0}
        )

        if not config:
            return {
                "board_id": None,
                "enabled": False,
                "column_mapping": {
                    "code": None,        # text column for book code
                    "name": None,        # text column for book name
                    "ordered_count": None,  # number column to increment
                    "grade": None,       # text/dropdown for grade
                },
            }

        return config

    async def save_inventory_config(self, config: Dict) -> bool:
        """Save inventory board configuration"""
        config["config_type"] = "inventory_board"

        result = await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "inventory_board"},
            {"$set": config},
            upsert=True
        )

        return result.acknowledged

    # ---------- Webhook ----------

    async def get_webhook_config(self) -> Dict:
        """Get webhook configuration"""
        config = await db[MONDAY_CONFIG_COLLECTION].find_one(
            {"config_type": "webhooks"},
            {"_id": 0}
        )

        if not config:
            return {
                "webhook_id": None,
                "webhook_url": None,
                "registered_at": None,
            }

        return config

    async def save_webhook_config(self, config: Dict) -> bool:
        """Save webhook configuration"""
        config["config_type"] = "webhooks"

        result = await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "webhooks"},
            {"$set": config},
            upsert=True
        )

        return result.acknowledged

    # ---------- Workspaces ----------

    async def get_workspaces(self) -> Dict:
        """Get configured workspaces with API keys"""
        config = await db[MONDAY_CONFIG_COLLECTION].find_one(
            {"config_type": "workspaces"},
            {"_id": 0}
        )

        if not config:
            return {
                "workspaces": [],
                "active_workspace_id": None
            }

        return config

    async def add_workspace(self, api_key: str, name: str = None) -> Dict:
        """Add a new workspace configuration"""
        import uuid

        workspace_id = f"ws_{uuid.uuid4().hex[:8]}"
        workspace = {
            "workspace_id": workspace_id,
            "name": name or "Default",
            "api_key": api_key
        }

        workspaces_config = await self.get_workspaces()
        workspaces = workspaces_config.get("workspaces", [])
        workspaces.append(workspace)

        active_id = workspaces_config.get("active_workspace_id") or workspace_id

        await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "workspaces"},
            {"$set": {
                "config_type": "workspaces",
                "workspaces": workspaces,
                "active_workspace_id": active_id
            }},
            upsert=True
        )

        return {"success": True, "workspace_id": workspace_id}

    async def set_active_workspace(self, workspace_id: str) -> bool:
        """Set the active workspace"""
        result = await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "workspaces"},
            {"$set": {"active_workspace_id": workspace_id}}
        )

        return result.modified_count > 0

    async def remove_workspace(self, workspace_id: str) -> bool:
        """Remove a workspace configuration"""
        workspaces_config = await self.get_workspaces()
        workspaces = workspaces_config.get("workspaces", [])

        workspaces = [ws for ws in workspaces if ws.get("workspace_id") != workspace_id]

        await db[MONDAY_CONFIG_COLLECTION].update_one(
            {"config_type": "workspaces"},
            {"$set": {"workspaces": workspaces}}
        )

        return True


# Singleton instance
monday_config_service = MondayConfigService()
