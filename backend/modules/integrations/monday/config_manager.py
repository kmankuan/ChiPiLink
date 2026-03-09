"""
Monday.com Namespaced Configuration Manager
Handles configuration for all modules using Monday.com integration.

Naming convention: {module}.{entity}.{purpose}
Examples:
  store.textbook_orders.board
  store.textbook_orders.txb_inventory
  store.textbook_orders.webhooks
  store.textbook_orders.status_mapping
  pinpanclub.matches.board
  pinpanclub.leagues.board
  membership.plans.board
  global.workspaces
"""
from typing import Dict, Optional, List
from core.database import db
import logging

logger = logging.getLogger(__name__)

CONFIG_COLLECTION = "monday_integration_config"


class MondayConfigManager:
    """Centralized, namespaced config manager for all Monday.com integrations"""

    async def get(self, config_key: str) -> Dict:
        """Get a config document by its namespaced key"""
        doc = await db[CONFIG_COLLECTION].find_one(
            {"config_key": config_key}, {"_id": 0}
        )
        return doc or {"config_key": config_key}

    async def save(self, config_key: str, data: Dict) -> bool:
        """Save/upsert a config document"""
        data["config_key"] = config_key
        result = await db[CONFIG_COLLECTION].update_one(
            {"config_key": config_key},
            {"$set": data},
            upsert=True
        )
        return result.acknowledged

    async def delete(self, config_key: str) -> bool:
        """Delete a config document"""
        result = await db[CONFIG_COLLECTION].delete_one({"config_key": config_key})
        return result.deleted_count > 0

    async def list_by_module(self, module_prefix: str) -> List[Dict]:
        """List all configs for a module (e.g., 'store' returns all store.* configs)"""
        cursor = db[CONFIG_COLLECTION].find(
            {"config_key": {"$regex": f"^{module_prefix}\\."}},
            {"_id": 0}
        )
        return await cursor.to_list(100)

    async def list_all(self) -> List[Dict]:
        """List all Monday.com integration configs (for admin dashboard)"""
        return await db[CONFIG_COLLECTION].find({}, {"_id": 0}).to_list(200)

    # ---- Workspace management (global scope) ----

    async def get_workspaces(self) -> Dict:
        """Get configured workspaces with API keys"""
        config = await self.get("global.workspaces")
        return {
            "workspaces": config.get("workspaces", []),
            "active_workspace_id": config.get("active_workspace_id")
        }

    async def add_workspace(self, api_key: str, name: str = None) -> Dict:
        """Add a new workspace"""
        import uuid
        ws_id = f"ws_{uuid.uuid4().hex[:8]}"
        workspace = {"workspace_id": ws_id, "name": name or "Default", "api_key": api_key}

        config = await self.get_workspaces()
        workspaces = config.get("workspaces", [])
        workspaces.append(workspace)
        active_id = config.get("active_workspace_id") or ws_id

        await self.save("global.workspaces", {
            "workspaces": workspaces,
            "active_workspace_id": active_id
        })
        return {"success": True, "workspace_id": ws_id}

    async def set_active_workspace(self, workspace_id: str) -> bool:
        """Set the active workspace"""
        config = await self.get("global.workspaces")
        config["active_workspace_id"] = workspace_id
        return await self.save("global.workspaces", config)

    async def remove_workspace(self, workspace_id: str) -> bool:
        """Remove a workspace"""
        config = await self.get("global.workspaces")
        config["workspaces"] = [
            ws for ws in config.get("workspaces", [])
            if ws.get("workspace_id") != workspace_id
        ]
        return await self.save("global.workspaces", config)


# Singleton
monday_config = MondayConfigManager()
