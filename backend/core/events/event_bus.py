"""
Event Bus - Sistema de eventos interno para communication entre modules
Preparado para escalar a Redis/RabbitMQ en el futuro
"""
import asyncio
import logging
from typing import Dict, List, Callable, Any, Optional
from datetime import datetime, timezone
from dataclasses import dataclass, field
from enum import Enum
import uuid
import json

logger = logging.getLogger(__name__)


class EventPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class Event:
    """Estructura base de un evento"""
    event_type: str
    payload: Dict[str, Any]
    source_module: str
    event_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    priority: EventPriority = EventPriority.NORMAL
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "payload": self.payload,
            "source_module": self.source_module,
            "timestamp": self.timestamp,
            "priority": self.priority.value,
            "metadata": self.metadata
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict())


class EventBus:
    """
    Event Bus interno para communication entre modules.
    
    Features:
    - Pub/Sub like thisncrono
    - Soporte para wildcards (ej: 'pinpanclub.*')
    - Cola de eventos con prioridad
    - Preparado para migrar a Redis/RabbitMQ
    
    Uso:
        # Suscribirse a eventos
        @event_bus.subscribe('pinpanclub.match.created')
        async def on_match_created(event: Event):
            print(f"Nuevo partido: {event.payload}")
        
        # Publicar eventos
        await event_bus.publish(Event(
            event_type='pinpanclub.match.created',
            payload={'match_id': '123'},
            source_module='pinpanclub'
        ))
    """
    
    _instance: Optional['EventBus'] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._subscribers: Dict[str, List[Callable]] = {}
        self._event_history: List[Event] = []
        self._max_history = 1000
        self._initialized = True
        self._running = True
        logger.info("EventBus initialized")
    
    def subscribe(self, event_pattern: str):
        """
        Decorador para suscribirse a eventos.
        Soporta wildcards: 'module.*' o '*'
        """
        def decorator(handler: Callable):
            if event_pattern not in self._subscribers:
                self._subscribers[event_pattern] = []
            self._subscribers[event_pattern].append(handler)
            logger.debug(f"Handler subscribed to: {event_pattern}")
            return handler
        return decorator
    
    def subscribe_handler(self, event_pattern: str, handler: Callable):
        """Suscribir un handler programmatically"""
        if event_pattern not in self._subscribers:
            self._subscribers[event_pattern] = []
        self._subscribers[event_pattern].append(handler)
        logger.debug(f"Handler subscribed to: {event_pattern}")
    
    def unsubscribe(self, event_pattern: str, handler: Callable):
        """Desuscribir un handler"""
        if event_pattern in self._subscribers:
            self._subscribers[event_pattern] = [
                h for h in self._subscribers[event_pattern] if h != handler
            ]
    
    async def publish(self, event: Event) -> None:
        """
        Publicar un evento a todos los suscriptores.
        Los handlers se ejecutan de forma like thisncrona.
        """
        if not self._running:
            logger.warning("EventBus is not running, event not published")
            return
        
        # Guardar en historial
        self._event_history.append(event)
        if len(self._event_history) > self._max_history:
            self._event_history = self._event_history[-self._max_history:]
        
        logger.info(f"Publishing event: {event.event_type} from {event.source_module}")
        
        # Encontrar handlers que coincidan
        matching_handlers = []
        
        for pattern, handlers in self._subscribers.items():
            if self._matches_pattern(event.event_type, pattern):
                matching_handlers.extend(handlers)
        
        # Ejecutar handlers de forma like thisncrona
        if matching_handlers:
            tasks = []
            for handler in matching_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        tasks.append(asyncio.create_task(handler(event)))
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
            
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
        
        logger.debug(f"Event {event.event_type} processed by {len(matching_handlers)} handlers")
    
    def publish_sync(self, event: Event) -> None:
        """Publicar evento de forma synchronous (para usar fuera de contexto async)"""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(self.publish(event))
            else:
                loop.run_until_complete(self.publish(event))
        except RuntimeError:
            # No hay event loop, crear uno temporal
            asyncio.run(self.publish(event))
    
    def _matches_pattern(self, event_type: str, pattern: str) -> bool:
        """Verificar si un evento coincide con un pattern (soporta wildcards)"""
        if pattern == '*':
            return True
        
        if pattern.endswith('.*'):
            prefix = pattern[:-2]
            return event_type.startswith(prefix + '.')
        
        if pattern.endswith('*'):
            prefix = pattern[:-1]
            return event_type.startswith(prefix)
        
        return event_type == pattern
    
    def get_history(self, event_type: Optional[str] = None, limit: int = 100) -> List[Event]:
        """Obtener historial de eventos"""
        events = self._event_history
        
        if event_type:
            events = [e for e in events if self._matches_pattern(e.event_type, event_type)]
        
        return events[-limit:]
    
    def get_subscribers(self) -> Dict[str, int]:
        """Obtener lista de patrones suscritos y cantidad de handlers"""
        return {pattern: len(handlers) for pattern, handlers in self._subscribers.items()}
    
    def clear_history(self):
        """Limpiar historial de eventos"""
        self._event_history = []
    
    def shutdown(self):
        """Apagar el event bus"""
        self._running = False
        logger.info("EventBus shutdown")
    
    def start(self):
        """Iniciar el event bus"""
        self._running = True
        logger.info("EventBus started")


# Global instance del Event Bus
event_bus = EventBus()


# === Event Types Constants ===
class PinpanClubEvents:
    """Tipos de eventos del module PinpanClub"""
    # Matches
    MATCH_CREATED = "pinpanclub.match.created"
    MATCH_STARTED = "pinpanclub.match.started"
    MATCH_SCORE_UPDATED = "pinpanclub.match.score_updated"
    MATCH_SET_COMPLETED = "pinpanclub.match.set_completed"
    MATCH_FINISHED = "pinpanclub.match.finished"
    MATCH_CANCELLED = "pinpanclub.match.cancelled"
    
    # Players
    PLAYER_CREATED = "pinpanclub.player.created"
    PLAYER_UPDATED = "pinpanclub.player.updated"
    PLAYER_ELO_CHANGED = "pinpanclub.player.elo_changed"
    
    # Tournaments
    TOURNAMENT_CREATED = "pinpanclub.tournament.created"
    TOURNAMENT_STARTED = "pinpanclub.tournament.started"
    TOURNAMENT_FINISHED = "pinpanclub.tournament.finished"
    
    # Sync
    SYNC_REQUESTED = "pinpanclub.sync.requested"
    SYNC_COMPLETED = "pinpanclub.sync.completed"


class StoreEvents:
    """Tipos de eventos del module Store"""
    ORDER_CREATED = "store.order.created"
    ORDER_PAID = "store.order.paid"
    ORDER_SHIPPED = "store.order.shipped"
    ORDER_COMPLETED = "store.order.completed"
    ORDER_CANCELLED = "store.order.cancelled"
    
    PRODUCT_CREATED = "store.product.created"
    PRODUCT_UPDATED = "store.product.updated"
    PRODUCT_LOW_STOCK = "store.product.low_stock"


class AuthEvents:
    """Tipos de eventos del module Auth"""
    USER_REGISTERED = "auth.user.registered"
    USER_LOGGED_IN = "auth.user.logged_in"
    USER_LOGGED_OUT = "auth.user.logged_out"
    USER_UPDATED = "auth.user.updated"


class CommunityEvents:
    """Tipos de eventos del module Community"""
    POST_CREATED = "community.post.created"
    POST_UPDATED = "community.post.updated"
    POST_DELETED = "community.post.deleted"
    POST_LIKED = "community.post.liked"
    
    EVENT_CREATED = "community.event.created"
    EVENT_UPDATED = "community.event.updated"
    EVENT_DELETED = "community.event.deleted"
    EVENT_REGISTRATION = "community.event.registration"
