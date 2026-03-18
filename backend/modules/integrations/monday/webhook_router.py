"""
Monday.com Webhook Router
Receives all Monday.com webhook events and dispatches to the correct module handler.
Modules register their board_id → handler mappings at startup.
"""
from typing import Callable, Dict, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday/webhooks", tags=["Monday.com Webhooks"])

# Registry: board_id -> async handler function
_webhook_handlers: Dict[str, Callable] = {}
# Fallback handler when board_id not matched
_default_handler: Optional[Callable] = None


def register_handler(board_id: str, handler: Callable):
    """Register a webhook handler for a specific board_id."""
    _webhook_handlers[str(board_id)] = handler
    logger.info(f"Registered Monday.com webhook handler for board {board_id}")


def unregister_handler(board_id: str):
    """Remove a previously registered handler."""
    _webhook_handlers.pop(str(board_id), None)


def register_default_handler(handler: Callable):
    """Register a fallback handler for unmatched board_ids"""
    global _default_handler
    _default_handler = handler


def get_registered_boards() -> list:
    return list(_webhook_handlers.keys())


async def _log_raw_webhook(body: dict, source: str = "incoming"):
    """Log every raw webhook hit for debugging (stored in DB)."""
    try:
        from core.database import db
        await db.monday_webhook_raw_logs.insert_one({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "body_preview": json.dumps(body)[:2000],
            "has_challenge": "challenge" in body,
            "board_id": str(body.get("event", {}).get("boardId", "")),
        })
    except Exception as e:
        logger.warning(f"Failed to log raw webhook: {e}")


@router.post("/incoming")
async def receive_webhook(request: Request):
    """Universal webhook endpoint for all Monday.com events."""
    body = await request.json()

    # Log every single incoming request
    logger.info(f"[webhook_router] Incoming request: keys={list(body.keys())}")
    await _log_raw_webhook(body)

    # Monday.com challenge verification
    if "challenge" in body:
        challenge = body["challenge"]
        logger.info(f"[webhook_router] Challenge received: {challenge}")
        return JSONResponse(content={"challenge": challenge})

    event = body.get("event", {})
    if not event:
        logger.info("[webhook_router] No event in body")
        return {"status": "no_event"}

    board_id = str(event.get("boardId", ""))
    logger.info(
        f"[webhook_router] Event: board={board_id}, pulse={event.get('pulseId')}, "
        f"parent={event.get('parentItemId')}, col={event.get('columnId')}"
    )

    # Find handler for this board
    handler = _webhook_handlers.get(board_id)

    # If no direct match, try dynamic lookup from wallet config
    if not handler:
        handler = await _try_dynamic_wallet_handler(board_id)

    # Final fallback
    if not handler:
        handler = _default_handler

    if handler:
        try:
            result = await handler(event)
            logger.info(f"[webhook_router] Handled board {board_id}: {result}")
            return result
        except Exception as e:
            logger.error(f"[webhook_router] Handler error for board {board_id}: {e}", exc_info=True)
            return {"status": "error", "detail": str(e)}
    else:
        logger.warning(f"[webhook_router] No handler for board {board_id}. Registered: {list(_webhook_handlers.keys())}")
        return {"status": "unhandled", "board_id": board_id}


async def _try_dynamic_wallet_handler(board_id: str):
    """Dynamic fallback: check if the wallet adapter is configured for this board."""
    try:
        from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
        config = await wallet_monday_adapter.get_config()
        configured_board = str(config.get("board_id", ""))
        if configured_board and configured_board == board_id:
            logger.info(f"[webhook_router] Dynamic match: wallet adapter for board {board_id}")
            # Also register for future fast lookups
            register_handler(board_id, wallet_monday_adapter.handle_webhook)
            return wallet_monday_adapter.handle_webhook
    except Exception as e:
        logger.warning(f"[webhook_router] Dynamic lookup failed: {e}")
    return None


@router.get("/registered")
async def list_registered_handlers():
    return {"boards": get_registered_boards(), "has_default": _default_handler is not None}
