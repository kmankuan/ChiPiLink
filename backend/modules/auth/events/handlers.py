"""
Auth Module - Event Handlers
Manejadores de eventos para el module de authentication
"""
import logging
from datetime import datetime, timezone
from core.events import event_bus, Event, AuthEvents
from core.database import db

logger = logging.getLogger(__name__)


def setup_event_handlers():
    """
    Configurar handlers de eventos del module Auth.
    """
    
    @event_bus.subscribe(AuthEvents.USER_REGISTERED)
    async def on_user_registered(event: Event):
        """
        Crear notification cuando se registra un usuario.
        """
        payload = event.payload
        
        notificacion = {
            "notification_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "usuario_registrado",
            "titulo": "Nuevo Usuario Registrado",
            "mensaje": f"{payload.get('nombre', 'Usuario')} se ha registrado",
            "datos": payload,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notificacion)
        logger.info(f"User registered notification created: {payload.get('user_id')}")
    
    @event_bus.subscribe(AuthEvents.USER_LOGGED_IN)
    async def on_user_logged_in(event: Event):
        """
        Registrar last login of the user.
        """
        payload = event.payload
        user_id = payload.get("user_id")
        
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"ultimo_login": datetime.now(timezone.utc).isoformat()}}
        )
        
        logger.info(f"User logged in: {user_id}")
    
    @event_bus.subscribe("auth.*")
    async def log_all_auth_events(event: Event):
        """
        Log de todos los eventos del module Auth.
        """
        logger.debug(f"[AUTH EVENT] {event.event_type}: {event.payload}")
    
    logger.info("Auth event handlers configured")


__all__ = ['setup_event_handlers', 'AuthEvents']
