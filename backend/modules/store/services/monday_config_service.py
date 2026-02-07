"""
Monday.com Configuration Service for Store Module
Now delegates to the centralized MondayConfigManager with namespaced keys.

Config key mapping (old → new):
  "textbook_orders"  →  store.textbook_orders.board
  "inventory_board"  →  store.textbook_orders.txb_inventory
  "webhooks"         →  store.textbook_orders.webhooks
  "workspaces"       →  global.workspaces
"""
from typing import Dict
import logging

from modules.integrations.monday.config_manager import monday_config

logger = logging.getLogger(__name__)

# Namespaced config keys
BOARD_KEY = "store.textbook_orders.board"
TXB_INVENTORY_KEY = "store.textbook_orders.txb_inventory"
WEBHOOKS_KEY = "store.textbook_orders.webhooks"
STATUS_MAPPING_KEY = "store.textbook_orders.status_mapping"
WORKSPACES_KEY = "global.workspaces"


class MondayConfigService:
    """Store module config service — delegates to centralized config manager"""

    # ---------- Textbook Orders Board ----------

    async def get_config(self) -> Dict:
        config = await monday_config.get(BOARD_KEY)
        return {
            "board_id": config.get("board_id"),
            "group_id": config.get("group_id"),
            "auto_sync": config.get("auto_sync", True),
            "column_mapping": config.get("column_mapping", {}),
            "subitems_enabled": config.get("subitems_enabled", False),
            "subitem_column_mapping": config.get("subitem_column_mapping", {}),
            "status_mapping": config.get("status_mapping", {}),
        }

    async def save_config(self, config: Dict) -> bool:
        return await monday_config.save(BOARD_KEY, config)

    # ---------- TXB Inventory Board ----------

    async def get_inventory_config(self) -> Dict:
        config = await monday_config.get(TXB_INVENTORY_KEY)
        return {
            "board_id": config.get("board_id"),
            "enabled": config.get("enabled", False),
            "group_id": config.get("group_id"),
            "column_mapping": config.get("column_mapping", {
                "code": None,
                "name": None,
                "ordered_count": None,
                "grade": None,
                "publisher": None,
                "unit_price": None,
            }),
        }

    async def save_inventory_config(self, config: Dict) -> bool:
        return await monday_config.save(TXB_INVENTORY_KEY, config)

    # ---------- Webhooks ----------

    async def get_webhook_config(self) -> Dict:
        config = await monday_config.get(WEBHOOKS_KEY)
        return {
            "webhook_id": config.get("webhook_id"),
            "webhook_url": config.get("webhook_url"),
            "registered_at": config.get("registered_at"),
        }

    async def save_webhook_config(self, config: Dict) -> bool:
        return await monday_config.save(WEBHOOKS_KEY, config)

    # ---------- Workspaces ----------

    async def get_workspaces(self) -> Dict:
        return await monday_config.get_workspaces()

    async def add_workspace(self, api_key: str, name: str = None) -> Dict:
        return await monday_config.add_workspace(api_key, name)

    async def set_active_workspace(self, workspace_id: str) -> bool:
        return await monday_config.set_active_workspace(workspace_id)

    async def remove_workspace(self, workspace_id: str) -> bool:
        return await monday_config.remove_workspace(workspace_id)


# Singleton
monday_config_service = MondayConfigService()
