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

import httpx
import json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday", tags=["Store - Monday.com Sync"])


# ========== WORKSPACE MANAGEMENT ==========

@router.get("/workspaces")
async def get_workspaces(admin: dict = Depends(get_admin_user)):
    """List all configured Monday.com workspaces and the active one."""
    from modules.integrations.monday.config_manager import monday_config as cfg
    from modules.integrations.monday.core_client import monday_client
    data = await cfg.get_workspaces()
    workspaces = data.get("workspaces", [])
    active_id = data.get("active_workspace_id")
    # Mask API keys for display
    safe = []
    for ws in workspaces:
        key = ws.get("api_key", "")
        safe.append({**ws, "api_key_masked": f"{key[:8]}...{key[-4:]}" if len(key) > 12 else "****"})
    return {"workspaces": safe, "active_workspace_id": active_id}


@router.post("/workspaces")
async def add_workspace(body: dict, admin: dict = Depends(get_admin_user)):
    """Add a new Monday.com workspace (API key)."""
    from modules.integrations.monday.config_manager import monday_config as cfg
    from modules.integrations.monday.core_client import monday_client
    api_key = body.get("api_key", "").strip()
    name = body.get("name", "Default")
    if not api_key:
        raise HTTPException(status_code=400, detail="api_key is required")
    # Validate key before saving
    try:
        client = httpx.AsyncClient(timeout=15.0)
        resp = await client.post(
            "https://api.monday.com/v2",
            json={"query": "query { me { name email } }"},
            headers={"Authorization": api_key, "Content-Type": "application/json"},
        )
        await client.aclose()
        data = resp.json()
        if "errors" in data or not data.get("data", {}).get("me"):
            raise HTTPException(status_code=400, detail="Invalid Monday.com API key")
        me = data["data"]["me"]
        ws_name = name if name != "Default" else me.get("name", "Default")
        result = await cfg.add_workspace(api_key, ws_name)
        return {"success": True, "workspace_id": result["workspace_id"], "workspace_name": ws_name,
                "user_email": me.get("email", "")}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Monday.com API error: {e}")


@router.post("/workspaces/{workspace_id}/activate")
async def activate_workspace(workspace_id: str, admin: dict = Depends(get_admin_user)):
    """Set a workspace as the active one for all Monday.com calls."""
    from modules.integrations.monday.config_manager import monday_config as cfg
    success = await cfg.set_active_workspace(workspace_id)
    if not success:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return {"success": True, "active_workspace_id": workspace_id}


@router.delete("/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, admin: dict = Depends(get_admin_user)):
    """Remove a Monday.com workspace."""
    from modules.integrations.monday.config_manager import monday_config as cfg
    await cfg.remove_workspace(workspace_id)
    return {"success": True}


@router.get("/test-connection")
async def test_connection(admin: dict = Depends(get_admin_user)):
    """Test the active Monday.com connection (via Integration Hub)."""
    from modules.integrations.monday.core_client import monday_client
    result = await monday_client.test_connection()
    if result.get("connected"):
        # Also load boards for the connection info
        try:
            boards = await monday_client.get_boards()
            result["boards"] = [{"id": b["id"], "name": b["name"]} for b in boards[:50]]
        except Exception:
            result["boards"] = []
    return result


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
    """List all accessible boards from Monday.com (via Integration Hub)."""
    from modules.integrations.monday.core_client import monday_client
    try:
        boards = await monday_client.get_boards()
        return {"boards": [{"id": b["id"], "name": b["name"], "items_count": b.get("items_count", 0)} for b in boards]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Monday.com API error: {e}")


# ========== BOARD COLUMN DISCOVERY (Admin) ==========

@router.get("/boards/{board_id}/columns")
async def get_board_columns(board_id: str, admin: dict = Depends(get_admin_user)):
    """Fetch columns, groups, and subitem columns from a Monday.com board (via Integration Hub)."""
    from modules.integrations.monday.core_client import monday_client
    try:
        columns = await monday_client.get_board_columns(board_id)
        groups = await monday_client.get_board_groups(board_id)

        # Find subitems column to discover subitems board and its columns
        subitems_col = next((c for c in columns if c["type"] == "subtasks"), None)
        subitem_columns = []

        if subitems_col:
            try:
                settings = json.loads(subitems_col.get("settings_str", "{}"))
                subitems_board_id = settings.get("boardIds", [None])[0]
                if subitems_board_id:
                    subitem_columns = await monday_client.get_board_columns(str(subitems_board_id))
            except Exception as se:
                logger.warning(f"Could not load subitem columns: {se}")

        # Filter out system columns
        skip = {"name", "subitems", "board_relation", "subtasks"}
        filtered = [c for c in columns if c["type"] not in skip]
        sub_filtered = [c for c in subitem_columns if c["type"] not in skip]

        return {"columns": filtered, "groups": groups, "subitem_columns": sub_filtered}
    except HTTPException:
        raise
    except Exception as e:
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
    """Push all unsynced orders to Monday.com orders board (with subitems per book)."""
    from core.database import db as database
    from ..integrations.monday_textbook_adapter import textbook_monday_adapter
    from datetime import datetime, timezone

    try:
        # Find orders that have NOT yet been synced to Monday.com orders board
        orders = await database.store_textbook_orders.find(
            {
                "$and": [
                    # No monday_item_id set
                    {"$or": [
                        {"monday_item_id": None},
                        {"monday_item_id": {"$exists": False}},
                    ]},
                    # No monday_item_ids array (or empty)
                    {"$or": [
                        {"monday_item_ids": {"$exists": False}},
                        {"monday_item_ids": {"$size": 0}},
                        {"monday_item_ids": None},
                    ]},
                ],
                "status": {"$nin": ["cancelled", "draft", "awaiting_link"]},
            },
            {"_id": 0}
        ).to_list(200)

        synced = 0
        failed = 0
        errors = []

        for order in orders:
            try:
                order_id = order.get("order_id", "")
                # Build selected_items from ordered items (status == "ordered" or quantity > 0)
                all_items = order.get("items", [])
                selected_items = [
                    i for i in all_items
                    if i.get("status") == "ordered" or i.get("quantity_ordered", 0) > 0
                ]
                if not selected_items:
                    logger.warning(f"[sync-all] Order {order_id} has no ordered items, skipping")
                    failed += 1
                    continue

                # Use stored user info from the order document
                user_name = order.get("user_name", "")
                user_email = order.get("user_email", "")
                submission_total = order.get("total_amount", 0)

                # Call the correct adapter method
                result = await textbook_monday_adapter.sync_order_to_monday(
                    order=order,
                    selected_items=selected_items,
                    user_name=user_name,
                    user_email=user_email,
                    submission_total=submission_total,
                )

                mid = result.get("item_id")
                msubs = result.get("subitems", [])

                if mid:
                    # Persist Monday.com item ID back to the order
                    update = {
                        "monday_item_id": mid,
                        "monday_item_ids": [mid],
                        "monday_synced_at": datetime.now(timezone.utc).isoformat(),
                    }
                    if msubs:
                        subitem_map = {s["book_id"]: s["monday_subitem_id"] for s in msubs}
                        for item in all_items:
                            if item.get("book_id") in subitem_map:
                                item["monday_subitem_id"] = subitem_map[item["book_id"]]
                        update["items"] = all_items
                    await database.store_textbook_orders.update_one(
                        {"order_id": order_id}, {"$set": update}
                    )
                    logger.info(f"[sync-all] Order {order_id} → Monday item {mid}, {len(msubs)} subitems")
                    synced += 1
                else:
                    failed += 1
                    errors.append(f"{order_id}: no item_id returned")

            except Exception as e:
                logger.error(f"[sync-all] Error syncing order {order.get('order_id')}: {e}")
                failed += 1
                errors.append(f"{order.get('order_id', '?')}: {str(e)[:100]}")

        return {
            "synced": synced,
            "failed": failed,
            "total": len(orders),
            "errors": errors[:10],  # Return first 10 errors for debugging
        }
    except Exception as e:
        logger.error(f"[sync-all] Fatal error: {e}")
        import traceback
        logger.error(traceback.format_exc())
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
    """Start full sync as a background task (create or update textbooks on Monday.com)"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    result = await txb_inventory_adapter.full_sync()
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/txb-inventory/full-sync/status")
async def txb_full_sync_status(admin: dict = Depends(get_admin_user)):
    """Get the current status of the full sync background task"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    return await txb_inventory_adapter.get_full_sync_status()


@router.post("/txb-inventory/full-sync/cancel")
async def txb_full_sync_cancel(admin: dict = Depends(get_admin_user)):
    """Cancel a running full sync"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    return await txb_inventory_adapter.cancel_full_sync()


@router.get("/txb-inventory/sync-history")
async def txb_sync_history(limit: int = 20, admin: dict = Depends(get_admin_user)):
    """Get recent sync history entries for textbook inventory"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    history = await txb_inventory_adapter.get_sync_history(limit=limit)
    return {"history": history}


@router.post("/txb-inventory/sync-stock/{book_id}")
async def txb_sync_stock(book_id: str, admin: dict = Depends(get_admin_user)):
    """Push a single product's stock to Monday.com"""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    product = await db.store_products.find_one(
        {"book_id": book_id, "is_sysbook": True}, {"_id": 0}
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


@router.post("/txb-inventory/setup-stock-approval")
async def setup_stock_approval_column(admin: dict = Depends(get_admin_user)):
    """Create the 'Stock Approval' status column on the TXB inventory board.
    This column is used to approve/reject stock changes from Monday.com."""
    from ..integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    result = await txb_inventory_adapter.setup_stock_approval_column()
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    return result


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
    from modules.sysbook.models.textbook_order import DEFAULT_STATUS_MAPPING
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



# ========== SYNC STATUS DIAGNOSTIC (Admin) ==========

@router.get("/sync-status")
async def get_sync_status(admin: dict = Depends(get_admin_user)):
    """Diagnostic: check board configuration and count unsynced orders."""
    from core.database import db as database

    # Check orders board config
    orders_cfg = await monday_config_service.get_config()
    board_configured = bool(orders_cfg.get("board_id"))
    subitems_enabled = orders_cfg.get("subitems_enabled", False)

    # Count unsynced orders
    unsynced_count = await database.store_textbook_orders.count_documents({
        "$and": [
            {"$or": [
                {"monday_item_id": None},
                {"monday_item_id": {"$exists": False}},
            ]},
            {"$or": [
                {"monday_item_ids": {"$exists": False}},
                {"monday_item_ids": {"$size": 0}},
                {"monday_item_ids": None},
            ]},
        ],
        "status": {"$nin": ["cancelled", "draft", "awaiting_link"]},
    })

    # Count already synced
    synced_count = await database.store_textbook_orders.count_documents({
        "monday_item_id": {"$ne": None, "$exists": True},
    })

    total_orders = await database.store_textbook_orders.count_documents({})

    return {
        "board_configured": board_configured,
        "board_id": orders_cfg.get("board_id"),
        "group_id": orders_cfg.get("group_id"),
        "subitems_enabled": subitems_enabled,
        "columns_mapped": len([v for v in orders_cfg.get("column_mapping", {}).values() if v]),
        "subitem_columns_mapped": len([v for v in orders_cfg.get("subitem_column_mapping", {}).values() if v]),
        "orders": {
            "total": total_orders,
            "synced": synced_count,
            "unsynced": unsynced_count,
        },
        "ready_to_sync": board_configured and unsynced_count > 0,
    }
