"""
Monday.com Integration Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import httpx
import json
import logging

from core.database import db
from core.auth import get_admin_user
from core.config import MONDAY_API_KEY, get_monday_board_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monday", tags=["Monday.com Integration"])


@router.get("/status")
async def get_monday_status(admin: dict = Depends(get_admin_user)):
    """Check Monday.com integration status"""
    board_id = await get_monday_board_id(db)
    
    if not MONDAY_API_KEY:
        return {
            "configured": False,
            "connected": False,
            "message": "API Key no configurado"
        }
    
    if not board_id:
        return {
            "configured": True,
            "connected": False,
            "message": "Board ID no configurado"
        }
    
    # Test connection
    try:
        async with httpx.AsyncClient() as client:
            query = f'''
            query {{
                boards(ids: [{board_id}]) {{
                    id
                    name
                    items_count
                }}
            }}
            '''
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": query},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "data" in result and result["data"].get("boards"):
                    board = result["data"]["boards"][0]
                    return {
                        "configured": True,
                        "connected": True,
                        "board_id": board_id,
                        "board_name": board.get("name"),
                        "items_count": board.get("items_count")
                    }
            
            return {
                "configured": True,
                "connected": False,
                "message": "Error connecting to Monday.com"
            }
    except Exception as e:
        logger.error(f"Monday.com connection error: {e}")
        return {
            "configured": True,
            "connected": False,
            "message": str(e)
        }


@router.put("/config")
async def update_monday_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update Monday.com configuration"""
    # Store board ID in database
    if "board_id" in config:
        await db.app_config.update_one(
            {"config_key": "monday_board_id"},
            {"$set": {
                "config_key": "monday_board_id",
                "value": config["board_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }},
            upsert=True
        )
    
    return {"success": True}


@router.post("/test")
async def test_monday_integration(admin: dict = Depends(get_admin_user)):
    """Test Monday.com integration by creating a test item"""
    board_id = await get_monday_board_id(db)
    
    if not MONDAY_API_KEY or not board_id:
        raise HTTPException(status_code=400, detail="Monday.com no est\u00e1 configurado")
    
    try:
        test_values = json.dumps({
            "text": "Test Admin",
            "text4": "Test Estudiante",
            "numbers": "0.00",
            "status": {"label": "test"}
        })
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                column_values: {json.dumps(test_values)}
            ) {{
                id
            }}
        }}
        '''
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            result = response.json()
            
            if response.status_code == 200 and "data" in result:
                if result["data"].get("create_item"):
                    return {
                        "success": True,
                        "message": "Item de prueba creado exitosamente",
                        "item_id": result["data"]["create_item"]["id"]
                    }
            
            logger.error(f"Monday.com test failed: {result}")
            raise HTTPException(
                status_code=400,
                detail=f"Error: {result.get('errors', result)}"
            )
            
    except httpx.RequestError as e:
        logger.error(f"Monday.com test error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ============== ADAPTER CONFIG ROUTES ==============


@router.get("/adapters/pinpanclub/config")
async def get_pinpanclub_monday_config(admin: dict = Depends(get_admin_user)):
    """Get PinPanClub Monday.com adapter configuration"""
    from modules.pinpanclub.integrations.monday_adapter import pinpanclub_monday_adapter
    config = await pinpanclub_monday_adapter._get_sync_config()
    return {"config": config, "module": "pinpanclub"}


@router.put("/adapters/pinpanclub/config")
async def update_pinpanclub_monday_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update PinPanClub Monday.com adapter configuration"""
    from modules.pinpanclub.integrations.monday_adapter import pinpanclub_monday_adapter
    await pinpanclub_monday_adapter.save_sync_config(data.get("config", {}))
    return {"success": True, "message": "PinPanClub Monday config updated"}


@router.post("/adapters/pinpanclub/sync/players")
async def sync_pinpanclub_players(admin: dict = Depends(get_admin_user)):
    """Sync all un-synced players to Monday.com"""
    from modules.pinpanclub.integrations.monday_adapter import pinpanclub_monday_adapter
    result = await pinpanclub_monday_adapter.sync_all_players()
    return {"success": True, **result}


@router.post("/adapters/pinpanclub/sync/matches")
async def sync_pinpanclub_matches(admin: dict = Depends(get_admin_user)):
    """Sync all un-synced matches to Monday.com"""
    from modules.pinpanclub.integrations.monday_adapter import pinpanclub_monday_adapter
    result = await pinpanclub_monday_adapter.sync_all_matches()
    return {"success": True, **result}


@router.get("/adapters/memberships/config")
async def get_memberships_monday_config(admin: dict = Depends(get_admin_user)):
    """Get Memberships Monday.com adapter configuration"""
    from modules.users.integrations.monday_memberships_adapter import memberships_monday_adapter
    config = await memberships_monday_adapter.get_config()
    return {"config": config, "module": "memberships"}


@router.put("/adapters/memberships/config")
async def update_memberships_monday_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update Memberships Monday.com adapter configuration"""
    from modules.users.integrations.monday_memberships_adapter import memberships_monday_adapter
    await memberships_monday_adapter.save_config(data.get("config", {}))
    return {"success": True, "message": "Memberships Monday config updated"}


# ============== WALLET ADAPTER CONFIG ROUTES ==============


@router.get("/adapters/wallet/config")
async def get_wallet_monday_config(admin: dict = Depends(get_admin_user)):
    """Get Wallet Monday.com adapter configuration"""
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
    config = await wallet_monday_adapter.get_config()
    return {"config": config, "module": "wallet"}


@router.put("/adapters/wallet/config")
async def update_wallet_monday_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update Wallet Monday.com adapter configuration"""
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
    await wallet_monday_adapter.save_config(data.get("config", {}))
    # Re-register webhook with new board_id
    await wallet_monday_adapter.register_webhooks()
    return {"success": True, "message": "Wallet Monday config updated"}


@router.get("/adapters/wallet/logs")
async def get_wallet_webhook_logs(
    limit: int = 30,
    admin: dict = Depends(get_admin_user)
):
    """Get wallet webhook event logs for debugging"""
    from core.database import db
    cursor = db.wallet_webhook_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return {"logs": logs}


@router.get("/adapters/wallet/raw-logs")
async def get_wallet_raw_webhook_logs(
    limit: int = 30,
    admin: dict = Depends(get_admin_user)
):
    """Get ALL raw incoming webhook requests (including challenges) for debugging."""
    from core.database import db
    cursor = db.monday_webhook_raw_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return {"logs": logs}


@router.post("/adapters/wallet/test-webhook")
async def test_wallet_webhook(data: dict, admin: dict = Depends(get_admin_user)):
    """Simulate a Monday.com webhook event for testing.
    
    Body: { "email": "user@example.com", "amount": 10.0, "action": "topup" }
    This creates a synthetic event and processes it through the wallet adapter.
    """
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
    from modules.users.services.wallet_service import wallet_service
    from modules.users.models.wallet_models import Currency, PaymentMethod
    
    email = data.get("email", "").strip()
    amount = float(data.get("amount", 0))
    action = data.get("action", "topup")
    note = data.get("note", f"Manual test via admin ({action})")
    
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    user = await db.auth_users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail=f"User not found: {email}")
    
    try:
        if action == "topup":
            tx = await wallet_service.deposit(
                user_id=user["user_id"], amount=amount,
                currency=Currency.USD, payment_method=PaymentMethod.BANK_TRANSFER,
                reference=f"admin_test_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                description=note
            )
        else:
            tx = await wallet_service.charge(
                user_id=user["user_id"], amount=amount,
                currency=Currency.USD, description=note,
                reference_type="admin_test",
                reference_id=f"admin_test_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
            )
        return {"status": "success", "action": action, "email": email, "amount": amount, "transaction": tx}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/adapters/wallet/sync-dashboard")
async def get_wallet_sync_dashboard(admin: dict = Depends(get_admin_user)):
    """Get sync dashboard data: stats, recent events, errors, linked users."""
    from core.database import db

    # Count linked users (have a monday item)
    linked_users = await db.monday_user_items.count_documents({})

    # Count processed subitems
    processed_subitems = await db.monday_processed_subitems.count_documents({})

    # Recent webhook logs (last 20)
    logs_cursor = db.wallet_webhook_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(20)
    recent_logs = await logs_cursor.to_list(length=20)

    # Error logs only
    error_logs_cursor = db.wallet_webhook_logs.find(
        {"status": "error"}, {"_id": 0}
    ).sort("timestamp", -1).limit(10)
    recent_errors = await error_logs_cursor.to_list(length=10)

    # Recent user-item mappings
    user_items_cursor = db.monday_user_items.find(
        {}, {"_id": 0}
    ).sort("created_at", -1).limit(20)
    user_items = await user_items_cursor.to_list(length=20)

    # Stats
    success_count = await db.wallet_webhook_logs.count_documents({"status": "success"})
    error_count = await db.wallet_webhook_logs.count_documents({"status": "error"})
    ignored_count = await db.wallet_webhook_logs.count_documents({"status": "ignored"})

    return {
        "stats": {
            "linked_users": linked_users,
            "processed_subitems": processed_subitems,
            "webhook_success": success_count,
            "webhook_errors": error_count,
            "webhook_ignored": ignored_count,
        },
        "recent_logs": recent_logs,
        "recent_errors": recent_errors,
        "user_items": user_items,
    }


@router.post("/adapters/wallet/resync-user/{user_id}")
async def resync_user_to_monday(user_id: str, admin: dict = Depends(get_admin_user)):
    """Manually re-sync a user to Monday.com (create/update parent item)."""
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter

    user = await db.auth_users.find_one(
        {"user_id": user_id}, {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Remove existing mapping so it creates fresh
    await db.monday_user_items.delete_one({"user_id": user_id})

    item_id = await wallet_monday_adapter.sync_user_to_monday(
        user_id, user.get("name", ""), user["email"]
    )
    if item_id:
        return {"status": "success", "monday_item_id": item_id, "email": user["email"]}
    raise HTTPException(status_code=500, detail="Failed to sync user to Monday.com")


@router.post("/adapters/wallet/sync-all-users")
async def sync_all_users_to_monday(admin: dict = Depends(get_admin_user)):
    """Sync ALL non-admin users to Monday.com (creates parent items for unlinked users)."""
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter

    users_cursor = db.auth_users.find(
        {"is_admin": {"$ne": True}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    users = await users_cursor.to_list(length=500)

    synced = 0
    failed = 0
    for u in users:
        if not u.get("email"):
            continue
        item_id = await wallet_monday_adapter.sync_user_to_monday(
            u["user_id"], u.get("name", ""), u["email"]
        )
        if item_id:
            synced += 1
        else:
            failed += 1

    return {"status": "success", "synced": synced, "failed": failed, "total": len(users)}


# ============== BOARD & COLUMN DISCOVERY ==============


@router.get("/boards")
async def list_monday_boards(admin: dict = Depends(get_admin_user)):
    """List all accessible Monday.com boards"""
    from modules.integrations.monday.core_client import monday_client
    try:
        data = await monday_client.execute("""
            query {
                boards(limit: 100, order_by: created_at) {
                    id
                    name
                    board_kind
                    state
                }
            }
        """)
        boards = data.get("boards", [])
        # Filter active boards
        active = [b for b in boards if b.get("state") != "deleted"]
        return {"boards": active}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boards/{board_id}/columns")
async def get_board_columns(board_id: str, admin: dict = Depends(get_admin_user)):
    """Get all columns of a specific board (item-level)"""
    from modules.integrations.monday.core_client import monday_client
    try:
        data = await monday_client.execute(f"""
            query {{
                boards(ids: [{board_id}]) {{
                    id
                    name
                    columns {{
                        id
                        title
                        type
                    }}
                }}
            }}
        """)
        boards = data.get("boards", [])
        if not boards:
            raise HTTPException(status_code=404, detail="Board not found")
        return {"board": boards[0]["name"], "columns": boards[0].get("columns", [])}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boards/{board_id}/subitem-columns")
async def get_subitem_columns(board_id: str, admin: dict = Depends(get_admin_user)):
    """Get subitem columns for a board (searches items until one with subitems is found)"""
    from modules.integrations.monday.core_client import monday_client
    try:
        data = await monday_client.execute(f"""
            query {{
                boards(ids: [{board_id}]) {{
                    items_page(limit: 25) {{
                        items {{
                            subitems {{
                                board {{
                                    id
                                    name
                                    columns {{
                                        id
                                        title
                                        type
                                    }}
                                }}
                            }}
                        }}
                    }}
                }}
            }}
        """)
        boards = data.get("boards", [])
        if not boards:
            raise HTTPException(status_code=404, detail="Board not found")
        
        items = boards[0].get("items_page", {}).get("items", [])
        for item in items:
            subs = item.get("subitems", [])
            if subs:
                board_info = subs[0].get("board", {})
                return {
                    "subitem_board_id": board_info.get("id"),
                    "subitem_board_name": board_info.get("name"),
                    "columns": board_info.get("columns", [])
                }
        
        return {"subitem_board_id": None, "columns": [], "message": "No subitems found. Create at least one subitem first."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# ============== RECHARGE APPROVAL ADAPTER ==============


@router.get("/adapters/recharge-approval/logs")
async def get_recharge_approval_logs(
    limit: int = 30,
    admin: dict = Depends(get_admin_user)
):
    """Get Recharge Approval webhook event logs."""
    cursor = db.recharge_approval_webhook_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)
    return {"logs": logs}


@router.get("/adapters/recharge-approval/config")
async def get_recharge_approval_config(admin: dict = Depends(get_admin_user)):
    """Get Recharge Approval board config."""
    config = await db['wallet_topup_monday_config'].find_one({"id": "default"}, {"_id": 0})
    return {"config": config or {}}


@router.get("/adapters/recharge-approval/dashboard")
async def get_recharge_approval_dashboard(admin: dict = Depends(get_admin_user)):
    """Get Recharge Approval sync dashboard."""
    from modules.integrations.monday.webhook_router import get_registered_boards

    # Topup items synced to Monday
    topup_items = await db.monday_topup_items.count_documents({})

    # Pending topups by status
    pending = await db.wallet_pending_topups.count_documents({"status": "pending"})
    approved = await db.wallet_pending_topups.count_documents({"status": "approved"})
    rejected = await db.wallet_pending_topups.count_documents({"status": "rejected"})

    # Recent webhook logs
    logs_cursor = db.recharge_approval_webhook_logs.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(10)
    recent_logs = await logs_cursor.to_list(length=10)

    # Check if webhook handler is registered
    config = await db['wallet_topup_monday_config'].find_one({"id": "default"}, {"_id": 0})
    board_id = config.get("board_id", "") if config else ""
    registered = board_id in get_registered_boards()

    return {
        "stats": {
            "monday_items": topup_items,
            "pending": pending,
            "approved": approved,
            "rejected": rejected,
        },
        "board_id": board_id,
        "webhook_registered": registered,
        "recent_logs": recent_logs,
    }
