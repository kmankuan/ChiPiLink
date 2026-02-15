"""
Monday.com Sync & Config Routes (Store Module)
Handles webhook events, manual sync, and config management for textbook orders.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
import logging

from core.auth import get_current_user, get_admin_user
from core.config import MONDAY_API_KEY
from core.database import db
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


# ========== BOARD LISTING (Admin) ==========

@router.get("/boards")
async def list_boards(admin: dict = Depends(get_admin_user)):
    """List all accessible boards from Monday.com."""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="Monday.com API key not configured")

    query = '''query { boards(limit: 100) { id name items_count } }'''

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.monday.com/v2",
                json={"query": query},
                headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
                timeout=15.0,
            )
            data = resp.json()
            boards = data.get("data", {}).get("boards", [])
            return {"boards": boards}
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Monday.com API error: {e}")


# ========== BOARD COLUMN DISCOVERY (Admin) ==========

@router.get("/boards/{board_id}/columns")
async def get_board_columns(board_id: str, admin: dict = Depends(get_admin_user)):
    """Fetch columns, groups, and subitem columns from a Monday.com board."""
    if not MONDAY_API_KEY:
        raise HTTPException(status_code=400, detail="Monday.com API key not configured")

    query = f'''query {{
        boards(ids: [{board_id}]) {{
            columns {{ id title type settings_str }}
            groups {{ id title }}
        }}
    }}'''

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.monday.com/v2",
                json={"query": query},
                headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
                timeout=15.0,
            )
            data = resp.json()
            boards = data.get("data", {}).get("boards", [])
            if not boards:
                raise HTTPException(status_code=404, detail="Board not found")

            board = boards[0]
            columns = board.get("columns", [])
            groups = board.get("groups", [])

            # Find the subitems column to get the subitems board ID
            subitems_col = next((c for c in columns if c["type"] == "subtasks"), None)
            subitem_columns = []

            if subitems_col:
                settings = json.loads(subitems_col.get("settings_str", "{}"))
                subitems_board_id = settings.get("boardIds", [None])[0]

                if subitems_board_id:
                    sub_query = f'''query {{
                        boards(ids: [{subitems_board_id}]) {{
                            columns {{ id title type }}
                        }}
                    }}'''
                    sub_resp = await client.post(
                        "https://api.monday.com/v2",
                        json={"query": sub_query},
                        headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
                        timeout=10.0,
                    )
                    sub_data = sub_resp.json()
                    sub_boards = sub_data.get("data", {}).get("boards", [])
                    if sub_boards:
                        subitem_columns = sub_boards[0].get("columns", [])

            # Filter out system columns
            skip = {"name", "subitems", "board_relation", "subtasks"}
            filtered = [c for c in columns if c["type"] not in skip]
            sub_filtered = [c for c in subitem_columns if c["type"] not in skip]

            return {
                "columns": filtered,
                "groups": groups,
                "subitem_columns": sub_filtered,
            }

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Monday.com API error: {e}")


# ========== UNIFIED CONFIG (Admin) ==========

@router.get("/config")
async def get_full_config(admin: dict = Depends(get_admin_user)):
    """Get the full Monday.com config for textbook orders (both boards)."""
    orders = await monday_config_service.get_config()
    inventory = await monday_config_service.get_inventory_config()

    return {
        # Orders board
        "board_id": orders.get("board_id", ""),
        "group_id": orders.get("group_id", ""),
        "column_mapping": orders.get("column_mapping", {}),
        "subitems_enabled": orders.get("subitems_enabled", True),
        "subitem_column_mapping": orders.get("subitem_column_mapping", {}),
        "auto_sync": orders.get("auto_sync", True),
        "post_update": orders.get("post_update", True),
        # Textbooks board
        "textbooks_board_id": inventory.get("board_id", ""),
        "textbooks_column_mapping": inventory.get("column_mapping", {}),
        "textbooks_subitems_enabled": inventory.get("subitems_enabled", True),
        "textbooks_subitem_column_mapping": inventory.get("subitem_column_mapping", {}),
    }


@router.post("/config")
async def save_full_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Save the full Monday.com config for textbook orders (both boards)."""
    # Orders board config
    orders_config = {
        "board_id": config.get("board_id", ""),
        "group_id": config.get("group_id", ""),
        "column_mapping": config.get("column_mapping", {}),
        "subitems_enabled": config.get("subitems_enabled", True),
        "subitem_column_mapping": config.get("subitem_column_mapping", {}),
        "auto_sync": config.get("auto_sync", True),
        "post_update": config.get("post_update", True),
    }
    await monday_config_service.save_config(orders_config)

    # Textbooks board config
    inventory_config = {
        "board_id": config.get("textbooks_board_id", ""),
        "enabled": bool(config.get("textbooks_board_id")),
        "column_mapping": config.get("textbooks_column_mapping", {}),
        "subitems_enabled": config.get("textbooks_subitems_enabled", True),
        "subitem_column_mapping": config.get("textbooks_subitem_column_mapping", {}),
    }
    await monday_config_service.save_inventory_config(inventory_config)

    return {"success": True, "message": "Configuration saved"}


# ========== SYNC ALL ORDERS (Admin) ==========

@router.post("/sync-all")
async def sync_all_orders(admin: dict = Depends(get_admin_user)):
    """Push all unsynced orders to Monday.com."""
    from core.database import db as database
    from ..integrations.monday_textbook_adapter import textbook_monday_adapter

    try:
        # Find orders without monday_item_id that are not cancelled/draft
        orders = await database.store_textbook_orders.find(
            {"$or": [{"monday_item_id": None}, {"monday_item_id": {"$exists": False}}],
             "status": {"$nin": ["cancelled", "draft"]}},
            {"_id": 0}
        ).to_list(100)

        synced = 0
        failed = 0
        for order in orders:
            try:
                result = await textbook_monday_adapter.push_order(order)
                if result and result.get("monday_item_id"):
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Sync error for {order.get('order_id')}: {e}")
                failed += 1

        return {"synced": synced, "failed": failed, "total": len(orders)}
    except Exception as e:
        logger.error(f"Sync all error: {e}")
        return {"error": str(e), "synced": 0, "failed": 0}


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
    """Get TXB (textbook) inventory board configuration — enhanced with stock sync"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    return await txb_inventory_adapter.get_txb_inventory_config()


@router.put("/txb-inventory-config")
async def save_txb_inventory_config(
    config: dict, admin: dict = Depends(get_admin_user)
):
    """Save TXB inventory board configuration"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    success = await txb_inventory_adapter.save_txb_inventory_config(config)
    if success:
        return {"success": True}
    raise HTTPException(status_code=500, detail="Failed to save configuration")


# ========== TXB INVENTORY FULL SYNC (Admin) ==========

@router.post("/txb-inventory/full-sync")
async def txb_inventory_full_sync(admin: dict = Depends(get_admin_user)):
    """Push all textbooks to Monday.com board (create or update)"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    result = await txb_inventory_adapter.full_sync()
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/txb-inventory/sync-stock/{book_id}")
async def txb_sync_stock(book_id: str, admin: dict = Depends(get_admin_user)):
    """Push a single product's stock to Monday.com"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    product = await db.store_products.find_one(
        {"book_id": book_id, "is_private_catalog": True}, {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    result = await txb_inventory_adapter.sync_stock_to_monday(
        book_id, product.get("inventory_quantity", 0)
    )
    return result


# ========== TXB INVENTORY PER-COLUMN SYNC (Admin) ==========

@router.post("/txb-inventory/sync-column/{column_key}")
async def txb_sync_column(column_key: str, admin: dict = Depends(get_admin_user)):
    """Start a background sync of a single column across all textbooks to Monday.com.
    Returns 202 immediately. Poll /sync-column-status/{column_key} for progress."""
    valid_keys = {"code", "name", "grade", "publisher", "subject", "unit_price", "stock_quantity", "stock"}
    if column_key not in valid_keys:
        return JSONResponse(
            content={"detail": f"Invalid column key. Valid: {', '.join(sorted(valid_keys))}"},
            status_code=400,
        )

    try:
        from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
        result = await txb_inventory_adapter.start_column_sync(column_key)
        if result.get("error"):
            return JSONResponse(content={"detail": result["error"]}, status_code=400)
        return JSONResponse(content=result, status_code=202)
    except Exception as e:
        logger.error(f"sync-column/{column_key} unexpected error: {e}", exc_info=True)
        return JSONResponse(
            content={"detail": f"Internal error starting sync: {str(e)}"},
            status_code=500,
        )


@router.get("/txb-inventory/sync-column-status/{column_key}")
async def txb_sync_column_status(column_key: str, admin: dict = Depends(get_admin_user)):
    """Check status of a per-column sync task."""
    try:
        from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
        return await txb_inventory_adapter.get_column_sync_status(column_key)
    except Exception as e:
        logger.error(f"sync-column-status/{column_key} error: {e}", exc_info=True)
        return JSONResponse(
            content={"status": "error", "error": str(e), "column_key": column_key},
            status_code=200,
        )


# ========== TXB INVENTORY STOCK WEBHOOK ==========

@router.post("/txb-inventory/webhook")
async def txb_inventory_webhook(request: Request):
    """Receive Monday.com webhook for TXB board events.
    Handles both stock column changes and new item creation."""
    body = await request.json()

    # Monday.com challenge verification
    if "challenge" in body:
        logger.info("TXB Inventory webhook challenge received")
        return JSONResponse(content={"challenge": body["challenge"]})

    event = body.get("event", {})
    if not event:
        return {"status": "no_event"}

    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter

    event_type = event.get("type", "")

    try:
        if event_type == "create_item":
            result = await txb_inventory_adapter.handle_create_item_webhook(event)
            logger.info(f"TXB Inventory create_item webhook processed: {result}")
        else:
            result = await txb_inventory_adapter.handle_stock_webhook(event)
            logger.info(f"TXB Inventory stock webhook processed: {result}")
        return result
    except Exception as e:
        logger.error(f"TXB Inventory webhook error: {e}")
        return {"status": "error", "detail": str(e)}


@router.post("/txb-inventory/webhook/register")
async def register_txb_inventory_webhook(
    body: dict, admin: dict = Depends(get_admin_user)
):
    """Register a webhook for stock changes on the TXB inventory board"""
    webhook_url = body.get("webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url is required")

    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    result = await txb_inventory_adapter.register_stock_webhook(webhook_url)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/txb-inventory/webhook")
async def unregister_txb_inventory_webhook(admin: dict = Depends(get_admin_user)):
    """Remove the TXB inventory stock webhook"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    return await txb_inventory_adapter.unregister_stock_webhook()


@router.post("/txb-inventory/create-item-webhook/register")
async def register_txb_create_item_webhook(
    body: dict, admin: dict = Depends(get_admin_user)
):
    """Register a webhook for new item creation on the TXB inventory board"""
    webhook_url = body.get("webhook_url")
    if not webhook_url:
        raise HTTPException(status_code=400, detail="webhook_url is required")

    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    result = await txb_inventory_adapter.register_create_item_webhook(webhook_url)
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.delete("/txb-inventory/create-item-webhook")
async def unregister_txb_create_item_webhook(admin: dict = Depends(get_admin_user)):
    """Remove the TXB inventory create-item webhook"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    return await txb_inventory_adapter.unregister_create_item_webhook()


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
