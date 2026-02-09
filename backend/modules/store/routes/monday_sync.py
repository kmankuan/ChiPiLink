"""
Monday.com Sync & Config Routes (Store Module)
Handles webhook events, manual sync, and config management for textbook orders.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import logging

from core.auth import get_current_user, get_admin_user
from core.config import MONDAY_API_KEY
from ..services.monday_sync_service import monday_sync_service
from ..services.monday_config_service import monday_config_service
from ..models.textbook_order import DEFAULT_STATUS_MAPPING

import httpx
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday", tags=["Store - Monday.com Sync"])


# ========== WEBHOOK ENDPOINT ==========

@router.post("/webhooks/subitem-status")
async def monday_webhook(request: Request):
    """Receive webhook events from Monday.com for subitem status changes.
    Monday.com sends a challenge on first registration, then events after.
    """
    body = await request.json()

    # Monday.com challenge verification
    if "challenge" in body:
        logger.info("Monday.com webhook challenge received")
        return JSONResponse(content={"challenge": body["challenge"]})

    event = body.get("event", {})
    if not event:
        return {"status": "no_event"}

    try:
        result = await monday_sync_service.process_webhook_event(event)
        logger.info(f"Webhook processed: {result}")
        return result
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "detail": str(e)}


# ========== MANUAL SYNC ==========

@router.post("/sync-order/{order_id}")
async def sync_order_statuses(
    order_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Manually sync subitem statuses from Monday.com for an order"""
    try:
        result = await monday_sync_service.sync_order_statuses(order_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ========== TEXTBOOK ORDERS BOARD CONFIG (Admin) ==========

@router.get("/textbook-board-config")
async def get_textbook_board_config(admin: dict = Depends(get_admin_user)):
    """Get textbook orders board configuration"""
    return await monday_config_service.get_config()


@router.put("/textbook-board-config")
async def save_textbook_board_config(
    config: dict, admin: dict = Depends(get_admin_user)
):
    """Save textbook orders board configuration"""
    success = await monday_config_service.save_config(config)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to save configuration")


# ========== TXB INVENTORY BOARD CONFIG (Admin) ==========

@router.get("/txb-inventory-config")
async def get_txb_inventory_config(admin: dict = Depends(get_admin_user)):
    """Get TXB (textbook) inventory board configuration"""
    return await monday_config_service.get_inventory_config()


@router.put("/txb-inventory-config")
async def save_txb_inventory_config(
    config: dict, admin: dict = Depends(get_admin_user)
):
    """Save TXB inventory board configuration"""
    success = await monday_config_service.save_inventory_config(config)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to save configuration")


# ========== WEBHOOK MANAGEMENT (Admin) ==========

@router.post("/webhooks/register")
async def register_webhook(
    body: dict, admin: dict = Depends(get_admin_user)
):
    """Register a webhook with Monday.com for subitem status changes"""
    webhook_url = body.get("webhook_url")
    board_id = body.get("board_id")
    if not webhook_url or not board_id:
        raise HTTPException(status_code=400, detail="webhook_url and board_id are required")

    from modules.integrations.monday.core_client import monday_client
    try:
        wh_id = await monday_client.register_webhook(board_id, webhook_url)
        if wh_id:
            await monday_config_service.save_webhook_config({
                "webhook_id": wh_id,
                "webhook_url": webhook_url,
                "board_id": board_id,
            })
        return {"webhook_id": wh_id, "board_id": board_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/webhooks")
async def unregister_webhook(admin: dict = Depends(get_admin_user)):
    """Remove registered webhook"""
    wh_config = await monday_config_service.get_webhook_config()
    wh_id = wh_config.get("webhook_id")
    if wh_id:
        from modules.integrations.monday.core_client import monday_client
        await monday_client.delete_webhook(wh_id)
    await monday_config_service.save_webhook_config({
        "webhook_id": None, "webhook_url": None, "registered_at": None
    })
    return {"success": True}


@router.get("/webhooks/config")
async def get_webhook_config(admin: dict = Depends(get_admin_user)):
    """Get current webhook configuration"""
    return await monday_config_service.get_webhook_config()


# ========== STATUS MAPPING CONFIG (Admin) ==========

@router.get("/status-mapping")
async def get_status_mapping(admin: dict = Depends(get_admin_user)):
    """Get Monday.com status label → app status mapping"""
    config = await monday_config_service.get_config()
    return {
        "mapping": config.get("status_mapping", DEFAULT_STATUS_MAPPING),
        "available_statuses": [
            "ordered", "processing", "ready_for_pickup",
            "delivered", "issue", "out_of_stock"
        ]
    }


@router.put("/status-mapping")
async def save_status_mapping(
    body: dict, admin: dict = Depends(get_admin_user)
):
    """Save status mapping configuration"""
    mapping = body.get("mapping", {})
    config = await monday_config_service.get_config()
    config["status_mapping"] = mapping
    success = await monday_config_service.save_config(config)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to save mapping")


# ========== ALL CONFIGS OVERVIEW (Admin) ==========

@router.get("/all-configs")
async def get_all_monday_configs(admin: dict = Depends(get_admin_user)):
    """Get all Monday.com configs for the store module (admin dashboard)"""
    from modules.integrations.monday.config_manager import monday_config as cfg_mgr

    store_configs = await cfg_mgr.list_by_module("store")
    global_configs = await cfg_mgr.list_by_module("global")

    return {
        "store_configs": store_configs,
        "global_configs": global_configs,
    }
