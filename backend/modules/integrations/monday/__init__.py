"""
Monday.com Integration Module — Shared Core

Provides:
  - MondayCoreClient: Single API client (core_client.py)
  - MondayConfigManager: Namespaced config (config_manager.py)
  - Webhook Router: Event dispatch by board_id (webhook_router.py)
  - BaseMondayAdapter: Base class for module adapters (base_adapter.py)
"""
from .routes import router
from .core_client import monday_client
from .config_manager import monday_config
from .webhook_router import router as webhook_router
from .base_adapter import BaseMondayAdapter

__all__ = [
    "router",
    "monday_client",
    "monday_config",
    "webhook_router",
    "BaseMondayAdapter",
]
