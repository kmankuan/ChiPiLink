"""
Monday.com Core API Client — Hub-Proxied
All API calls route through the Integration Hub (port 8002).
Zero direct Monday.com connections from the main app.
"""
from typing import Dict, Optional
import httpx
import logging
import json

from core.database import db

logger = logging.getLogger(__name__)

HUB_URL = "http://127.0.0.1:8002"
CONFIG_COLLECTION = "monday_integration_config"


class MondayCoreClient:
    """Monday.com API client that proxies all calls through the Integration Hub.
    Same interface as the original — all callers work unchanged."""

    def __init__(self):
        self._client = None

    def _get_client(self):
        """Persistent httpx client for Hub communication"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=HUB_URL,
                limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
                timeout=httpx.Timeout(45.0, connect=5.0),
            )
        return self._client

    async def execute(self, query: str, timeout: float = 20.0) -> dict:
        """Execute a Monday.com GraphQL query via the Integration Hub proxy."""
        client = self._get_client()
        label = query.strip()[:60].replace('\n', ' ')
        try:
            r = await client.post(
                "/api/monday/execute",
                json={"query": query, "variables": {}},
                timeout=timeout + 10,
            )
            if r.status_code == 503:
                raise ValueError("Monday.com API key not configured (Hub returned 503)")
            if r.status_code == 429:
                raise ValueError("Monday.com rate limit reached")
            if r.status_code >= 500:
                raise ValueError(f"Hub error: HTTP {r.status_code}")

            data = r.json()

            if "errors" in data and not data.get("data"):
                raise ValueError(f"Monday.com error: {data['errors']}")

            return data.get("data", data)

        except httpx.TimeoutException:
            raise ValueError(f"Monday.com API timeout for: {label}")
        except httpx.ConnectError:
            logger.error("Integration Hub not reachable at port 8002")
            raise ValueError("Integration Hub not reachable — is it running?")

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
        """Add an Update (comment) to an item."""
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

    async def get_item_updates_with_replies(self, item_id: str) -> list:
        """Fetch Updates with their replies"""
        data = await self.execute(
            f'''query {{ items(ids: [{item_id}]) {{
                updates {{ id body text_body creator {{ name }} created_at
                    replies {{ id body text_body creator {{ name }} created_at }}
                }}
            }} }}''',
            timeout=25.0
        )
        items = data.get("items", [])
        return items[0].get("updates", []) if items else []

    async def create_reply(self, item_id: str, update_id: str, body: str) -> Optional[str]:
        """Reply to an existing Update."""
        escaped = body.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        query = f'mutation {{ create_update (item_id: {item_id}, parent_id: {update_id}, body: "{escaped}") {{ id }} }}'
        data = await self.execute(query)
        return data.get("create_update", {}).get("id")

    async def get_subitems(self, item_id: str) -> list:
        """Fetch subitems for an item with their column values"""
        data = await self.execute(
            f'''query {{ items(ids: [{item_id}]) {{
                subitems {{ id name column_values {{ id type text value }} }}
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
        """Update multiple column values on an item."""
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
        """Register a webhook with Monday.com."""
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

    async def get_board_items(self, board_id: str, limit: int = 200, include_subitems: bool = False) -> list:
        """Fetch ALL items from a board with cursor-based pagination."""
        all_items = []
        cursor = None
        page_limit = min(limit, 500)

        subitems_fragment = """
            subitems { id name column_values { id text value type } }
        """ if include_subitems else ""

        while True:
            if cursor:
                query = f'''query {{
                    next_items_page(limit: {page_limit}, cursor: "{cursor}") {{
                        cursor
                        items {{
                            id name group {{ id title }}
                            column_values {{ id text value type }}
                            {subitems_fragment}
                        }}
                    }}
                }}'''
            else:
                query = f'''query {{
                    boards(ids: [{board_id}]) {{
                        items_page(limit: {page_limit}) {{
                            cursor
                            items {{
                                id name group {{ id title }}
                                column_values {{ id text value type }}
                                {subitems_fragment}
                            }}
                        }}
                    }}
                }}'''

            data = await self.execute(query, timeout=45.0)

            if cursor:
                page_data = data.get("next_items_page", {})
            else:
                boards = data.get("boards", [])
                if not boards:
                    return []
                page_data = boards[0].get("items_page", {})

            items = page_data.get("items", [])
            all_items.extend(items)

            cursor = page_data.get("cursor")
            if not cursor or not items:
                break

        return all_items

    async def delete_item(self, item_id: str) -> bool:
        """Delete an item from any board"""
        try:
            await self.execute(f'mutation {{ delete_item (item_id: {item_id}) {{ id }} }}')
            return True
        except Exception as e:
            logger.error(f"Failed to delete Monday.com item {item_id}: {e}")
            return False


# Singleton — same interface, now proxied through Hub
monday_client = MondayCoreClient()
