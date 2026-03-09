"""
Monday.com API Worker — Processes Monday API jobs from hub_jobs.
Migrated from main app: backend/modules/integrations/monday/queue.py

The main app now writes monday_api_call jobs to hub_jobs.
This worker picks them up and executes them against the Monday.com API.
"""
import os
import logging
import httpx
from datetime import datetime, timezone

logger = logging.getLogger("hub.monday")

MONDAY_API_URL = "https://api.monday.com/v2"


class MondayWorker:
    def __init__(self, db):
        self.db = db
        self.api_key = os.environ.get("MONDAY_API_KEY", "")
        self._client = None

    def _get_client(self):
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(30.0, connect=10.0),
                limits=httpx.Limits(max_connections=3, max_keepalive_connections=2),
            )
        return self._client

    async def handle_job(self, payload: dict, db) -> dict:
        """
        Process a monday_api_call job.
        Payload: {query: str, variables: dict, board_id: str}
        """
        if not self.api_key:
            return {"error": "MONDAY_API_KEY not configured", "skipped": True}

        query = payload.get("query", "")
        variables = payload.get("variables", {})
        label = payload.get("label", "api_call")

        if not query:
            return {"error": "No query in payload"}

        client = self._get_client()
        try:
            r = await client.post(
                MONDAY_API_URL,
                json={"query": query, "variables": variables},
                headers={"Authorization": self.api_key, "Content-Type": "application/json"},
            )
            data = r.json()

            if "errors" in data:
                logger.warning(f"Monday API error for '{label}': {data['errors']}")
                return {"success": False, "errors": data["errors"], "label": label}

            logger.info(f"Monday API call '{label}' completed")
            return {"success": True, "data": data.get("data"), "label": label}

        except httpx.TimeoutException:
            raise Exception(f"Monday API timeout for '{label}'")
        except Exception as e:
            raise Exception(f"Monday API error for '{label}': {e}")

    async def handle_webhook_sync(self, payload: dict, db) -> dict:
        """
        Process a monday_webhook_sync job.
        Payload: {board_id: str, item_id: str, column_values: dict}
        """
        board_id = payload.get("board_id")
        item_id = payload.get("item_id")
        column_values = payload.get("column_values", {})

        if not board_id or not item_id:
            return {"error": "Missing board_id or item_id"}

        # Store webhook data for processing
        await db.hub_webhook_logs.insert_one({
            "source": "monday",
            "board_id": board_id,
            "item_id": item_id,
            "column_values": column_values,
            "received_at": datetime.now(timezone.utc).isoformat(),
        })

        return {"success": True, "board_id": board_id, "item_id": item_id}
