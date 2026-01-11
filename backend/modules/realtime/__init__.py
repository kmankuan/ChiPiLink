"""
Realtime Module - WebSocket notifications
Multi-service architecture ready
"""
from .routes import router as realtime_router
from .services.websocket_manager import ws_manager

__all__ = ["realtime_router", "ws_manager"]
