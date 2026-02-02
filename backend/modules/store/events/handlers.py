"""
Store Module - Event Handlers
Manejadores de eventos para el módulo de tienda
"""
import logging
from core.events import event_bus, Event, StoreEvents
from core.database import db

logger = logging.getLogger(__name__)


def setup_event_handlers():
    """
    Configurar handlers de eventos del módulo Store.
    """
    
    @event_bus.subscribe(StoreEvents.ORDER_CREATED)
    async def create_notification_on_order(event: Event):
        """
        Crear notificación cuando se crea un pedido.
        """
        from modules.admin.models import Notificacion
        from datetime import datetime, timezone
        
        payload = event.payload
        
        notificacion = {
            "notificacion_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "pedido_nuevo",
            "titulo": "Nuevo Pedido Recibido",
            "mensaje": f"Pedido {payload.get('pedido_id')} - ${payload.get('total', 0):.2f}",
            "datos": payload,
            "leida": False,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notificaciones.insert_one(notificacion)
        logger.info(f"Notification created for order {payload.get('pedido_id')}")
    
    @event_bus.subscribe(StoreEvents.PRODUCT_LOW_STOCK)
    async def create_low_stock_notification(event: Event):
        """
        Crear notificación de bajo stock.
        """
        from datetime import datetime, timezone
        
        payload = event.payload
        
        notificacion = {
            "notificacion_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "bajo_stock",
            "titulo": "Alerta de Stock Bajo",
            "mensaje": f"{payload.get('nombre')} tiene solo {payload.get('cantidad')} unidades",
            "datos": payload,
            "leida": False,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notificaciones.insert_one(notificacion)
        logger.warning(f"Low stock alert for {payload.get('libro_id')}")
    
    @event_bus.subscribe(StoreEvents.ORDER_PAID)
    async def on_order_paid(event: Event):
        """
        Actualizar libros comprados del estudiante cuando se paga.
        """
        # Este handler se puede extender to update
        # la lista de libros comprados del estudiante
        logger.info(f"Order paid: {event.payload.get('pedido_id')}")
    
    @event_bus.subscribe("store.*")
    async def log_all_store_events(event: Event):
        """
        Log de todos los eventos del módulo Store.
        """
        logger.debug(f"[STORE EVENT] {event.event_type}: {event.payload}")
    
    logger.info("Store event handlers configured")


__all__ = ['setup_event_handlers', 'StoreEvents']
