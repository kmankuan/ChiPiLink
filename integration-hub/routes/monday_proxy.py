"""
Monday.com API routes — Synchronous proxy for main app Monday API calls.
The main app calls these endpoints instead of talking to Monday directly.
Rate limited: max 2 concurrent via asyncio.Semaphore.
"""
import os
import asyncio
import logging
import httpx
from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone

logger = logging.getLogger("hub.monday")
router = APIRouter(prefix="/monday", tags=["Monday.com Proxy"])

MONDAY_API_URL = "https://api.monday.com/v2"
_semaphore = asyncio.Semaphore(2)  # Max 2 concurrent Monday API calls
_client = None


def _get_client():
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            limits=httpx.Limits(max_connections=5, max_keepalive_connections=3),
        )
    return _client


def _get_api_key():
    key = os.environ.get("MONDAY_API_KEY", "")
    if not key:
        key = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjM5NDE5MjgyMywiYWFpIjoxMSwidWlkIjoyNDU0MTE1OSwiaWFkIjoiMjAyNC0wOC0wN1QxNDo0Nzo1My4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6OTg2OTY0MSwicmduIjoidXNlMSJ9.JInd3-Xn_dEmoVxCb7RKvlrr9Ndl5EhanLRF9QljYQ0"
    return key


@router.post("/execute")
async def execute_query(data: dict):
    """
    Execute a Monday.com GraphQL query. Rate-limited to 2 concurrent.
    Body: {query: str, variables: dict}
    Returns: Monday.com API response data
    """
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(503, "MONDAY_API_KEY not configured")

    query = data.get("query", "")
    variables = data.get("variables", {})
    if not query:
        raise HTTPException(400, "query is required")

    async with _semaphore:
        client = _get_client()
        try:
            r = await client.post(
                MONDAY_API_URL,
                json={"query": query, "variables": variables},
                headers={"Authorization": api_key, "Content-Type": "application/json"},
            )
            result = r.json()

            if r.status_code == 429:
                raise HTTPException(429, "Monday.com rate limit reached")

            if "errors" in result and not result.get("data"):
                logger.warning(f"Monday API error: {result['errors']}")

            # Small delay between requests to stay under rate limits
            await asyncio.sleep(0.3)
            return result

        except httpx.TimeoutException:
            raise HTTPException(504, "Monday.com API timeout")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Monday proxy error: {e}")
            raise HTTPException(502, f"Monday.com API error: {str(e)}")


@router.get("/boards")
async def get_boards():
    """Get all accessible Monday.com boards."""
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(503, "MONDAY_API_KEY not configured")

    query = "{ boards(limit: 50) { id name } }"
    async with _semaphore:
        client = _get_client()
        r = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": api_key, "Content-Type": "application/json"},
        )
        data = r.json()
        return data.get("data", {}).get("boards", [])


@router.get("/boards/{board_id}/columns")
async def get_board_columns(board_id: str):
    """Get columns for a specific board."""
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(503, "MONDAY_API_KEY not configured")

    query = f'{{ boards(ids: [{board_id}]) {{ columns {{ id title type settings_str }} }} }}'
    async with _semaphore:
        client = _get_client()
        r = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": api_key, "Content-Type": "application/json"},
        )
        data = r.json()
        boards = data.get("data", {}).get("boards", [])
        return boards[0].get("columns", []) if boards else []


@router.get("/boards/{board_id}/groups")
async def get_board_groups(board_id: str):
    """Get groups for a specific board."""
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(503, "MONDAY_API_KEY not configured")

    query = f'{{ boards(ids: [{board_id}]) {{ groups {{ id title }} }} }}'
    async with _semaphore:
        client = _get_client()
        r = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": api_key, "Content-Type": "application/json"},
        )
        data = r.json()
        boards = data.get("data", {}).get("boards", [])
        return boards[0].get("groups", []) if boards else []


@router.get("/stats")
async def get_monday_stats():
    """Get Monday proxy stats."""
    return {
        "concurrent_limit": 2,
        "api_key_configured": bool(_get_api_key()),
    }
