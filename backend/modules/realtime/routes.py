"""
Realtime WebSocket Routes
Multi-service architecture with rooms for different modules
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional
import logging

from .services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Realtime WebSocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    room: str = Query(default="global", description="Room to join (e.g., rapidpin, community, store)"),
    user_id: Optional[str] = Query(default=None, description="User ID for personalized notifications"),
    lang: str = Query(default="es", description="Preferred language (es, en, zh)")
):
    """
    WebSocket endpoint for real-time notifications.
    
    Rooms available:
    - global: General notifications
    - rapidpin: Rapid Pin challenges, likes, comments
    - community: Community posts and events
    - store: Order updates
    
    Messages are automatically localized based on 'lang' parameter.
    """
    await ws_manager.connect(
        websocket=websocket,
        room=room,
        user_id=user_id,
        language=lang
    )
    
    try:
        while True:
            # Keep connection alive and handle any client messages
            data = await websocket.receive_json()
            
            # Handle ping/pong for connection keep-alive
            if data.get("type") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "message": {
                        "es": "Conexión activa",
                        "en": "Connection active",
                        "zh": "连接活跃"
                    }
                })
            
            # Handle room change request
            elif data.get("type") == "join_room":
                new_room = data.get("room")
                if new_room:
                    # Disconnect from current room and join new one
                    await ws_manager.disconnect(websocket)
                    await ws_manager.connect(
                        websocket=websocket,
                        room=new_room,
                        user_id=user_id,
                        language=lang
                    )
            
            # Handle language change
            elif data.get("type") == "change_language":
                new_lang = data.get("lang", "es")
                if new_lang in ["es", "en", "zh"]:
                    ws_manager.connection_metadata[websocket]["language"] = new_lang
                    await websocket.send_json({
                        "type": "language_changed",
                        "lang": new_lang,
                        "message": {
                            "es": f"Idioma cambiado a Español",
                            "en": f"Language changed to English",
                            "zh": f"语言已更改为中文"
                        }
                    })
                    
    except WebSocketDisconnect:
        await ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"[WS] Error in websocket: {e}")
        await ws_manager.disconnect(websocket)


@router.get("/stats")
async def get_realtime_stats():
    """Get WebSocket connection statistics"""
    return ws_manager.get_stats()


@router.get("/rooms")
async def get_available_rooms():
    """Get list of available rooms and their descriptions"""
    return {
        "rooms": [
            {
                "name": "global",
                "description": {
                    "es": "Notificaciones generales",
                    "en": "General notifications",
                    "zh": "一般通知"
                }
            },
            {
                "name": "rapidpin",
                "description": {
                    "es": "Desafíos, likes y comentarios de Rapid Pin",
                    "en": "Rapid Pin challenges, likes and comments",
                    "zh": "快速对决挑战、点赞和评论"
                }
            },
            {
                "name": "community",
                "description": {
                    "es": "Posts y eventos de la comunidad",
                    "en": "Community posts and events",
                    "zh": "社区帖子和活动"
                }
            },
            {
                "name": "store",
                "description": {
                    "es": "Actualizaciones de pedidos",
                    "en": "Order updates",
                    "zh": "订单更新"
                }
            }
        ]
    }
