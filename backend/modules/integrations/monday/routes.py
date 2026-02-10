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
