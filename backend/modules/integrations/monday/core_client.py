"""
Monday.com Core API Client
Single shared client for all modules. Handles auth, rate limiting, error handling.
"""
from typing import Dict, Optional
import httpx
import logging
import json

from core.database import db
from core.config import MONDAY_API_KEY

logger = logging.getLogger(__name__)

MONDAY_API_URL = "https://api.monday.com/v2"
CONFIG_COLLECTION = "monday_integration_config"


class MondayCoreClient:
    """Shared Monday.com API client used by all module adapters"""

    async def get_api_key(self) -> Optional[str]:
        """Get active API key from workspace config or env fallback"""
        try:
            ws_config = await db[CONFIG_COLLECTION].find_one(
                {"config_key": "global.workspaces"}, {"_id": 0}
            )
            if ws_config:
                active_id = ws_config.get("active_workspace_id")
                for ws in ws_config.get("workspaces", []):
                    if ws.get("workspace_id") == active_id and ws.get("api_key"):
                        return ws["api_key"]
        except Exception as e:
            logger.debug(f"Workspace config lookup failed: {e}")
        return MONDAY_API_KEY or None

    async def execute(self, query: str, timeout: float = 20.0) -> dict:
        """Execute a GraphQL query/mutation against Monday.com API"""
        api_key = await self.get_api_key()
        if not api_key:
            raise ValueError("Monday.com API key not configured")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                MONDAY_API_URL,
                json={"query": query},
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json"
                },
                timeout=timeout
            )
            data = response.json()

        if "errors" in data:
            logger.error(f"Monday.com API error: {data['errors']}")
            raise ValueError(f"Monday.com error: {data['errors']}")

        return data.get("data", {})

    async def test_connection(self) -> dict:
        """Test API connectivity and return account info"""
        try:
            data = await self.execute("query { me { name email account { name } } }")
            me = data.get("me", {})
            return {
                "connected": True,
                "user": me.get("name"),
                "email": me.get("email"),
                "account": me.get("account", {}).get("name")
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    async def get_boards(self) -> list:
        """List all accessible boards"""
        data = await self.execute(
            "query { boards(limit: 50) { id name columns { id title type } groups { id title } } }"
        )
        return data.get("boards", [])

    async def get_board_columns(self, board_id: str) -> list:
        """Get columns for a specific board"""
        data = await self.execute(
            f"query {{ boards(ids: [{board_id}]) {{ columns {{ id title type settings_str }} }} }}"
        )
        boards = data.get("boards", [])
        return boards[0].get("columns", []) if boards else []

    async def get_board_groups(self, board_id: str) -> list:
        """Get groups for a specific board"""
        data = await self.execute(
            f"query {{ boards(ids: [{board_id}]) {{ groups {{ id title }} }} }}"
        )
        boards = data.get("boards", [])
        return boards[0].get("groups", []) if boards else []

    async def create_item(
        self, board_id: str, item_name: str,
        column_values: dict = None, group_id: str = None,
        create_labels_if_missing: bool = False
    ) -> Optional[str]:
        """Create an item on a board. Returns item_id."""
        col_json = json.dumps(json.dumps(column_values)) if column_values else '"{}"'
        group_part = f', group_id: "{group_id}"' if group_id else ""
        labels_flag = ", create_labels_if_missing: true" if create_labels_if_missing else ""

        query = f'''mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{item_name}"{group_part},
                column_values: {col_json}{labels_flag}
            ) {{ id }}
        }}'''

        data = await self.execute(query, timeout=30.0)
        return data.get("create_item", {}).get("id")

    async def create_subitem(
        self, parent_item_id: str, item_name: str,
        column_values: dict = None
    ) -> Optional[str]:
        """Create a subitem. Returns subitem_id."""
        col_json = json.dumps(json.dumps(column_values)) if column_values else '"{}"'

        query = f'''mutation {{
            create_subitem (
                parent_item_id: {parent_item_id},
                item_name: "{item_name}",
                column_values: {col_json}
            ) {{ id }}
        }}'''

        data = await self.execute(query)
        return data.get("create_subitem", {}).get("id")

    async def create_update(self, item_id: str, body: str) -> Optional[str]:
        """Add an Update (comment) to an item. Returns update_id."""
        escaped = body.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        query = f'mutation {{ create_update (item_id: {item_id}, body: "{escaped}") {{ id }} }}'
        data = await self.execute(query)
        return data.get("create_update", {}).get("id")

    async def get_item_updates(self, item_id: str) -> list:
        """Fetch Updates (comments) for an item"""
        data = await self.execute(
            f'''query {{ items(ids: [{item_id}]) {{
                updates {{ id body text_body creator {{ name }} created_at }}
            }} }}'''
        )
        items = data.get("items", [])
        return items[0].get("updates", []) if items else []

    async def get_subitems(self, item_id: str) -> list:
        """Fetch subitems for an item with their column values"""
        data = await self.execute(
            f'''query {{ items(ids: [{item_id}]) {{
                subitems {{ id name column_values {{ id text value }} }}
            }} }}'''
        )
        items = data.get("items", [])
        return items[0].get("subitems", []) if items else []

    async def search_items_by_column(
        self, board_id: str, column_id: str, value: str, limit: int = 1
    ) -> list:
        """Search items on a board by column value"""
        data = await self.execute(
            f'''query {{
                items_page_by_column_values (
                    board_id: {board_id}, limit: {limit},
                    columns: [{{column_id: "{column_id}", column_values: ["{value}"]}}]
                ) {{ items {{ id name column_values {{ id text value }} }} }}
            }}'''
        )
        return data.get("items_page_by_column_values", {}).get("items", [])

    async def update_column_values(
        self, board_id: str, item_id: str, column_values: dict,
        create_labels_if_missing: bool = False
    ) -> bool:
        """Update multiple column values on an item.
        Set create_labels_if_missing=True when updating dropdown/status columns by label text."""
        col_json = json.dumps(json.dumps(column_values))
        labels_flag = ", create_labels_if_missing: true" if create_labels_if_missing else ""
        query = f'''mutation {{
            change_multiple_column_values (
                board_id: {board_id}, item_id: {item_id},
                column_values: {col_json}{labels_flag}
            ) {{ id }}
        }}'''
        data = await self.execute(query)
        return bool(data.get("change_multiple_column_values", {}).get("id"))

    async def register_webhook(
        self, board_id: str, url: str, event: str = "change_subitem_column_value"
    ) -> Optional[str]:
        """Register a webhook with Monday.com. Returns webhook_id."""
        data = await self.execute(
            f'''mutation {{
                create_webhook (
                    board_id: {board_id}, url: "{url}", event: {event}
                ) {{ id board_id }}
            }}'''
        )
        return data.get("create_webhook", {}).get("id")

    async def delete_webhook(self, webhook_id: str) -> bool:
        """Delete a webhook"""
        try:
            await self.execute(f'mutation {{ delete_webhook (id: {webhook_id}) {{ id }} }}')
            return True
        except Exception:
            return False


# Singleton
monday_client = MondayCoreClient()
