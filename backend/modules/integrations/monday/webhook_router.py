"""
Monday.com Webhook Router
Receives all Monday.com webhook events and dispatches to the correct module handler.
Modules register their board_id → handler mappings at startup.
"""
from typing import Callable, Dict, Optional
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday/webhooks", tags=["Monday.com Webhooks"])

# Registry: board_id -> async handler function
_webhook_handlers: Dict[str, Callable] = {}
# Fallback handler when board_id not matched
_default_handler: Optional[Callable] = None


def register_handler(board_id: str, handler: Callable):
    """Register a webhook handler for a specific board_id.
    Called by module adapters at startup.
    """
    _webhook_handlers[str(board_id)] = handler
    logger.info(f"Registered Monday.com webhook handler for board {board_id}")


def register_default_handler(handler: Callable):
    """Register a fallback handler for unmatched board_ids"""
    global _default_handler
    _default_handler = handler


def get_registered_boards() -> list:
    """List all board_ids with registered handlers"""
    return list(_webhook_handlers.keys())


@router.post("/incoming")
async def receive_webhook(request: Request):
    """Universal webhook endpoint for all Monday.com events.
    Monday.com sends events here; we route to the correct module.
    """
    body = await request.json()

    # Monday.com challenge verification
    if "challenge" in body:
        logger.info("Monday.com webhook challenge received")
        return JSONResponse(content={"challenge": body["challenge"]})

    event = body.get("event", {})
    if not event:
        return {"status": "no_event"}

    board_id = str(event.get("boardId", ""))

    # Find handler for this board
    handler = _webhook_handlers.get(board_id, _default_handler)

    if handler:
        try:
            result = await handler(event)
            logger.info(f"Webhook routed to handler for board {board_id}: {result}")
            return result
        except Exception as e:
            logger.error(f"Webhook handler error for board {board_id}: {e}")
            return {"status": "error", "detail": str(e)}
    else:
        logger.warning(f"No webhook handler registered for board {board_id}")
        return {"status": "unhandled", "board_id": board_id}


@router.get("/registered")
async def list_registered_handlers():
    """List all registered webhook handlers (debug/admin)"""
    return {"boards": get_registered_boards(), "has_default": _default_handler is not None}
