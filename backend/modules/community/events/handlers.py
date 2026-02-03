"""
Community Module - Event Handlers
Manejadores de eventos para el module de comunidad
"""
import logging
from datetime import datetime, timezone
from core.events import event_bus, Event, CommunityEvents
from core.database import db

logger = logging.getLogger(__name__)


def setup_event_handlers():
    """
    Configurar handlers de eventos del module Community.
    """
    
    @event_bus.subscribe(CommunityEvents.POST_CREATED)
    async def on_post_created(event: Event):
        """
        Crear notification cuando se crea un post destacado.
        """
        payload = event.payload
        
        if payload.get("featured"):
            notificacion = {
                "notificacion_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
                "tipo": "post_destacado",
                "titulo": "Nuevo Contenido Destacado",
                "mensaje": payload.get("titulo", "Nuevo post"),
                "datos": payload,
                "leida": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.notifications.insert_one(notificacion)
        
        logger.info(f"Post created: {payload.get('post_id')}")
    
    @event_bus.subscribe(CommunityEvents.EVENT_CREATED)
    async def on_event_created(event: Event):
        """
        Crear notification cuando se crea un evento.
        """
        payload = event.payload
        
        notificacion = {
            "notificacion_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "evento_creado",
            "titulo": "Nuevo Evento",
            "mensaje": payload.get("titulo", "Nuevo evento"),
            "datos": payload,
            "leida": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notificacion)
        
        logger.info(f"Event created: {payload.get('evento_id')}")
    
    @event_bus.subscribe("community.*")
    async def log_all_community_events(event: Event):
        """
        Log de todos los eventos del module Community.
        """
        logger.debug(f"[COMMUNITY EVENT] {event.event_type}: {event.payload}")
    
    logger.info("Community event handlers configured")


__all__ = ['setup_event_handlers', 'CommunityEvents']
