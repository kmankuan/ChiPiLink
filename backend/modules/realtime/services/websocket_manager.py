"""
WebSocket Manager - Real-time notifications service
Multi-service and Multi-language support
"""
from typing import Dict, List, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    WebSocket connection manager for real-time notifications.
    Supports:
    - Multiple rooms/channels (e.g., rapidpin, community, store)
    - User-specific connections
    - Multi-language messages
    """
    
    def __init__(self):
        # Active connections by room: {"room_name": {websocket1, websocket2, ...}}
        self.rooms: Dict[str, Set[WebSocket]] = {}
        
        # User connections: {"user_id": {websocket1, websocket2, ...}}
        self.user_connections: Dict[str, Set[WebSocket]] = {}
        
        # WebSocket to metadata mapping
        self.connection_metadata: Dict[WebSocket, Dict] = {}
        
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(
        self, 
        websocket: WebSocket, 
        room: str = "global",
        user_id: Optional[str] = None,
        language: str = "es"
    ):
        """Connect a client to a room"""
        await websocket.accept()
        
        async with self._lock:
            # Add to room
            if room not in self.rooms:
                self.rooms[room] = set()
            self.rooms[room].add(websocket)
            
            # Add to user connections if user_id provided
            if user_id:
                if user_id not in self.user_connections:
                    self.user_connections[user_id] = set()
                self.user_connections[user_id].add(websocket)
            
            # Store metadata
            self.connection_metadata[websocket] = {
                "room": room,
                "user_id": user_id,
                "language": language,
                "connected_at": datetime.now(timezone.utc).isoformat()
            }
        
        logger.info(f"[WS] Client connected to room '{room}' (user: {user_id}, lang: {language})")
        
        # Send welcome message
        await self._send_localized(websocket, {
            "type": "connected",
            "room": room,
            "message": {
                "es": "Conectado al canal de notificaciones",
                "en": "Connected to notification channel",
                "zh": "已连接到通知频道"
            }
        }, language)
    
    async def disconnect(self, websocket: WebSocket):
        """Disconnect a client"""
        async with self._lock:
            metadata = self.connection_metadata.get(websocket, {})
            room = metadata.get("room", "global")
            user_id = metadata.get("user_id")
            
            # Remove from room
            if room in self.rooms:
                self.rooms[room].discard(websocket)
                if not self.rooms[room]:
                    del self.rooms[room]
            
            # Remove from user connections
            if user_id and user_id in self.user_connections:
                self.user_connections[user_id].discard(websocket)
                if not self.user_connections[user_id]:
                    del self.user_connections[user_id]
            
            # Remove metadata
            self.connection_metadata.pop(websocket, None)
        
        logger.info(f"[WS] Client disconnected from room '{room}' (user: {user_id})")
    
    async def broadcast_to_room(
        self, 
        room: str, 
        message: Dict[str, Any],
        exclude_users: Optional[List[str]] = None
    ):
        """Broadcast message to all clients in a room"""
        if room not in self.rooms:
            return
        
        exclude_users = exclude_users or []
        
        for websocket in list(self.rooms.get(room, set())):
            try:
                metadata = self.connection_metadata.get(websocket, {})
                user_id = metadata.get("user_id")
                
                # Skip excluded users
                if user_id and user_id in exclude_users:
                    continue
                
                language = metadata.get("language", "es")
                await self._send_localized(websocket, message, language)
            except Exception as e:
                logger.error(f"[WS] Error broadcasting to room {room}: {e}")
                await self.disconnect(websocket)
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send message to specific user (all their connections)"""
        if user_id not in self.user_connections:
            return
        
        for websocket in list(self.user_connections.get(user_id, set())):
            try:
                metadata = self.connection_metadata.get(websocket, {})
                language = metadata.get("language", "es")
                await self._send_localized(websocket, message, language)
            except Exception as e:
                logger.error(f"[WS] Error sending to user {user_id}: {e}")
                await self.disconnect(websocket)
    
    async def send_to_users(self, user_ids: List[str], message: Dict[str, Any]):
        """Send message to multiple users"""
        for user_id in user_ids:
            await self.send_to_user(user_id, message)
    
    async def _send_localized(
        self, 
        websocket: WebSocket, 
        message: Dict[str, Any],
        language: str
    ):
        """Send message with localized content"""
        # Deep copy to avoid mutating original
        localized_message = json.loads(json.dumps(message))
        
        # Localize any multi-language fields
        def localize_dict(d: Dict) -> Dict:
            for key, value in d.items():
                if isinstance(value, dict):
                    # Check if it's a language dict (has es, en, or zh keys)
                    if any(lang in value for lang in ["es", "en", "zh"]):
                        d[key] = value.get(language, value.get("es", str(value)))
                    else:
                        localize_dict(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            localize_dict(item)
            return d
        
        localized_message = localize_dict(localized_message)
        localized_message["timestamp"] = datetime.now(timezone.utc).isoformat()
        
        await websocket.send_json(localized_message)
    
    def get_room_count(self, room: str) -> int:
        """Get number of connections in a room"""
        return len(self.rooms.get(room, set()))
    
    def get_stats(self) -> Dict:
        """Get connection statistics"""
        return {
            "total_connections": sum(len(conns) for conns in self.rooms.values()),
            "total_rooms": len(self.rooms),
            "total_users": len(self.user_connections),
            "rooms": {room: len(conns) for room, conns in self.rooms.items()}
        }


# Singleton instance
ws_manager = ConnectionManager()


# ============== HELPER FUNCTIONS FOR RAPID PIN EVENTS ==============

async def emit_like_event(
    queue_id: str,
    user_id: str,
    user_name: str,
    action: str,  # "liked" or "unliked"
    new_count: int,
    player_ids: List[str]
):
    """Emit like event to rapidpin room"""
    await ws_manager.broadcast_to_room(
        room="rapidpin",
        message={
            "type": "like_update",
            "queue_id": queue_id,
            "action": action,
            "likes_count": new_count,
            "user": {
                "user_id": user_id,
                "name": user_name
            },
            "text": {
                "es": f"{user_name} {'dio like' if action == 'liked' else 'quitó su like'} al reto",
                "en": f"{user_name} {'liked' if action == 'liked' else 'unliked'} the challenge",
                "zh": f"{user_name} {'点赞了' if action == 'liked' else '取消点赞'} 挑战"
            }
        }
    )


async def emit_comment_event(
    queue_id: str,
    comment_id: str,
    user_id: str,
    user_name: str,
    content: str,
    new_count: int
):
    """Emit comment event to rapidpin room"""
    await ws_manager.broadcast_to_room(
        room="rapidpin",
        message={
            "type": "comment_added",
            "queue_id": queue_id,
            "comment_id": comment_id,
            "comments_count": new_count,
            "comment": {
                "user_id": user_id,
                "user_name": user_name,
                "content": content
            },
            "text": {
                "es": f"{user_name} comentó en el reto",
                "en": f"{user_name} commented on the challenge",
                "zh": f"{user_name} 评论了挑战"
            }
        }
    )


async def emit_challenge_event(
    event_type: str,  # "challenge_created", "date_proposed", "date_accepted", "referee_assigned"
    queue_id: str,
    player1_name: str,
    player2_name: str,
    player_ids: List[str],
    extra_data: Dict = None
):
    """Emit challenge-related events to rapidpin room"""
    messages = {
        "challenge_created": {
            "es": f"{player1_name} desafió a {player2_name}",
            "en": f"{player1_name} challenged {player2_name}",
            "zh": f"{player1_name} 挑战了 {player2_name}"
        },
        "date_proposed": {
            "es": f"Nueva propuesta de fecha para {player1_name} vs {player2_name}",
            "en": f"New date proposal for {player1_name} vs {player2_name}",
            "zh": f"{player1_name} vs {player2_name} 的新日期提议"
        },
        "date_accepted": {
            "es": f"¡Fecha acordada! {player1_name} vs {player2_name}",
            "en": f"Date agreed! {player1_name} vs {player2_name}",
            "zh": f"日期已确认！{player1_name} vs {player2_name}"
        },
        "referee_assigned": {
            "es": f"Árbitro asignado para {player1_name} vs {player2_name}",
            "en": f"Referee assigned for {player1_name} vs {player2_name}",
            "zh": f"{player1_name} vs {player2_name} 已分配裁判"
        },
        "waiting_referee": {
            "es": f"{player1_name} vs {player2_name} esperan árbitro",
            "en": f"{player1_name} vs {player2_name} waiting for referee",
            "zh": f"{player1_name} vs {player2_name} 等待裁判"
        }
    }
    
    await ws_manager.broadcast_to_room(
        room="rapidpin",
        message={
            "type": event_type,
            "queue_id": queue_id,
            "players": {
                "player1": player1_name,
                "player2": player2_name
            },
            "text": messages.get(event_type, {"es": "Nuevo evento", "en": "New event", "zh": "新事件"}),
            **(extra_data or {})
        }
    )
    
    # Also notify the players directly
    for player_id in player_ids:
        await ws_manager.send_to_user(player_id, {
            "type": f"personal_{event_type}",
            "queue_id": queue_id,
            "text": messages.get(event_type, {"es": "Nuevo evento", "en": "New event", "zh": "新事件"})
        })
