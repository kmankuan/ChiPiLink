"""
Store Module - Event Handlers
Handlers for store module events.
"""
import logging
from core.events import event_bus, Event, StoreEvents
from core.database import db

logger = logging.getLogger(__name__)


def setup_event_handlers():
    """Configure event handlers for the Store module."""
    
    @event_bus.subscribe(StoreEvents.ORDER_CREATED)
    async def create_notification_on_order(event: Event):
        """Create notification when an order is placed."""
        from datetime import datetime, timezone
        
        payload = event.payload
        
        notification = {
            "notification_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "new_order",
            "titulo": "New Order Received",
            "mensaje": f"Order {payload.get('order_id', payload.get('pedido_id'))} - ${payload.get('total', 0):.2f}",
            "datos": payload,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notification)
        logger.info(f"Notification created for order {payload.get('order_id', payload.get('pedido_id'))}")
    
    @event_bus.subscribe(StoreEvents.PRODUCT_LOW_STOCK)
    async def create_low_stock_notification(event: Event):
        """Create notification for low stock."""
        from datetime import datetime, timezone
        
        payload = event.payload
        
        notification = {
            "notification_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
            "tipo": "low_stock",
            "titulo": "Low Stock Alert",
            "mensaje": f"{payload.get('name', payload.get('nombre'))} has only {payload.get('quantity', payload.get('cantidad'))} units",
            "datos": payload,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.notifications.insert_one(notification)
        logger.warning(f"Low stock alert for {payload.get('book_id')}")
    
    @event_bus.subscribe(StoreEvents.ORDER_PAID)
    async def on_order_paid(event: Event):
        """Update purchased textbooks for the student when payment is made."""
        logger.info(f"Order paid: {event.payload.get('order_id', event.payload.get('pedido_id'))}")
    
    @event_bus.subscribe("store.*")
    async def log_all_store_events(event: Event):
        """Log all store module events."""
        logger.debug(f"[STORE EVENT] {event.event_type}: {event.payload}")
    
    logger.info("Store event handlers configured")


__all__ = ['setup_event_handlers', 'StoreEvents']
