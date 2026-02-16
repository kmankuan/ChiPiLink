"""
Monday.com CRM Chat Adapter
Connects to the Admin Customers board for multi-topic customer chat.
Each item = customer-student, Updates = topics, Replies = thread messages.
Config namespace: store.crm.*
"""
from typing import Dict, List, Optional
import logging

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.config_manager import monday_config

logger = logging.getLogger(__name__)

CRM_BOARD_CONFIG_KEY = "store.crm.board"


class CrmMondayAdapter(BaseMondayAdapter):
    MODULE = "store"
    ENTITY = "crm"

    async def get_crm_config(self) -> Dict:
        config = await monday_config.get(CRM_BOARD_CONFIG_KEY)
        return {
            "board_id": config.get("board_id"),
            "email_column_id": config.get("email_column_id"),
            "name_column_id": config.get("name_column_id"),
            "column_mapping": config.get("column_mapping", {}),
        }

    async def save_crm_config(self, data: Dict) -> bool:
        return await monday_config.save(CRM_BOARD_CONFIG_KEY, data)

    async def find_item_by_email(self, email: str) -> Optional[Dict]:
        """Find a customer item on the CRM board by email column value"""
        config = await self.get_crm_config()
        board_id = config.get("board_id")
        email_col = config.get("email_column_id")
        if not board_id or not email_col:
            return None

        items = await self.client.search_items_by_column(
            board_id, email_col, email, limit=5
        )
        return items[0] if items else None

    async def get_topics(self, item_id: str) -> List[Dict]:
        """Get all Updates (topics) with their replies for a CRM item"""
        raw = await self.client.get_item_updates_with_replies(item_id)
        topics = []
        for u in raw:
            replies = []
            for r in u.get("replies", []):
                replies.append({
                    "id": r.get("id"),
                    "body": r.get("text_body") or r.get("body", ""),
                    "author": r.get("creator", {}).get("name", "Unknown"),
                    "created_at": r.get("created_at"),
                })
            topics.append({
                "id": u.get("id"),
                "body": u.get("text_body") or u.get("body", ""),
                "author": u.get("creator", {}).get("name", "Unknown"),
                "created_at": u.get("created_at"),
                "reply_count": len(replies),
                "replies": replies,
            })
        return topics

    async def create_topic(self, item_id: str, body: str) -> Optional[str]:
        """Create a new topic (Update) on a CRM item"""
        return await self.client.create_update(item_id, body)

    async def reply_to_topic(self, item_id: str, update_id: str, body: str) -> Optional[str]:
        """Reply to an existing topic (Update) on a CRM item"""
        return await self.client.create_reply(item_id, update_id, body)


crm_monday_adapter = CrmMondayAdapter()
