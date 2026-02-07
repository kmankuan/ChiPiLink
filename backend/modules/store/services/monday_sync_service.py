"""
Monday.com Sync Service (Store Module)
Delegates to the new adapter architecture while maintaining backward compatibility.
"""
from typing import Dict, List
import logging

from ..integrations.monday_textbook_adapter import textbook_monday_adapter
from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter

logger = logging.getLogger(__name__)


class MondaySyncService:
    """Facade that delegates to the appropriate adapter"""

    async def process_webhook_event(self, event: dict) -> dict:
        """Process Monday.com webhook event for subitem status change"""
        return await textbook_monday_adapter.handle_subitem_status_webhook(event)

    async def sync_order_statuses(self, order_id: str) -> dict:
        """Manual sync of subitem statuses from Monday.com"""
        return await textbook_monday_adapter.sync_order_statuses(order_id)

    async def update_inventory_board(self, ordered_items: List[Dict]) -> dict:
        """Update TXB inventory board after order"""
        return await txb_inventory_adapter.update_inventory(ordered_items)

    async def sync_order_to_monday(
        self, order: Dict, selected_items: List[Dict],
        user_name: str, user_email: str, submission_total: float = None
    ) -> Dict:
        """Sync order to Monday.com board"""
        return await textbook_monday_adapter.sync_order_to_monday(
            order, selected_items, user_name, user_email, submission_total
        )


# Singleton
monday_sync_service = MondaySyncService()
