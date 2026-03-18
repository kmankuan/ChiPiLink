"""
Monday.com Base Adapter
Abstract base class that module-specific adapters extend.
Provides namespaced config access and common utilities.
"""
from typing import Dict, Optional
import logging

from .core_client import monday_client
from .config_manager import monday_config

logger = logging.getLogger(__name__)


class BaseMondayAdapter:
    """Base adapter for module-specific Monday.com integrations.

    Subclasses define:
      MODULE = "store"        (module namespace)
      ENTITY = "textbook_orders"  (entity namespace)
    
    Config keys auto-resolve to: store.textbook_orders.board, etc.
    """

    MODULE: str = ""
    ENTITY: str = ""

    def __init__(self):
        self.client = monday_client

    @property
    def _prefix(self) -> str:
        return f"{self.MODULE}.{self.ENTITY}"

    def _key(self, purpose: str) -> str:
        """Build namespaced config key: module.entity.purpose"""
        return f"{self._prefix}.{purpose}"

    # ---- Config shortcuts ----

    async def get_board_config(self) -> Dict:
        return await monday_config.get(self._key("board"))

    async def save_board_config(self, data: Dict) -> bool:
        return await monday_config.save(self._key("board"), data)

    async def get_webhook_config(self) -> Dict:
        return await monday_config.get(self._key("webhooks"))

    async def save_webhook_config(self, data: Dict) -> bool:
        return await monday_config.save(self._key("webhooks"), data)

    async def get_status_mapping(self) -> Dict:
        config = await monday_config.get(self._key("status_mapping"))
        return config.get("mapping", {})

    async def save_status_mapping(self, mapping: Dict) -> bool:
        return await monday_config.save(self._key("status_mapping"), {"mapping": mapping})

    async def get_custom_config(self, purpose: str) -> Dict:
        """Get any custom config by purpose suffix"""
        return await monday_config.get(self._key(purpose))

    async def save_custom_config(self, purpose: str, data: Dict) -> bool:
        """Save any custom config by purpose suffix"""
        return await monday_config.save(self._key(purpose), data)

    # ---- Common operations ----

    async def is_configured(self) -> bool:
        """Check if this integration has a board configured"""
        config = await self.get_board_config()
        return bool(config.get("board_id"))

    async def get_integration_status(self) -> Dict:
        """Get full status of this integration"""
        board_config = await self.get_board_config()
        board_id = board_config.get("board_id")

        status = {
            "module": self.MODULE,
            "entity": self.ENTITY,
            "config_prefix": self._prefix,
            "configured": bool(board_id),
            "board_id": board_id,
        }

        if board_id:
            try:
                conn = await self.client.test_connection()
                status["connected"] = conn.get("connected", False)
            except Exception:
                status["connected"] = False

        return status
