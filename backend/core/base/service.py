"""
Base Service - Capa de logic de negocio
Cada module will have sus propios servicios que heredan de esta clase base
"""
from typing import Optional, Dict, Any
import logging
from abc import ABC

from core.events import event_bus, Event, EventPriority

logger = logging.getLogger(__name__)


class BaseService(ABC):
    """
    Clase base para servicios de negocio.
    
    Features:
    - Acceso al Event Bus para publicar eventos
    - Logging integrado
    - Manejo de errores estandarizado
    
    Cada module implementa sus servicios heredando de esta clase.
    """
    
    MODULE_NAME: str = "base"  # Override en cada module
    
    def __init__(self):
        self.logger = logging.getLogger(f"{self.MODULE_NAME}.service")
        self.event_bus = event_bus
    
    async def emit_event(
        self,
        event_type: str,
        payload: Dict[str, Any],
        priority: EventPriority = EventPriority.NORMAL,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Emitir un evento al Event Bus.
        
        Args:
            event_type: Tipo de evento (ej: 'pinpanclub.match.created')
            payload: Datos del evento
            priority: Prioridad del evento
            metadata: Metadatos adicionales
        """
        event = Event(
            event_type=event_type,
            payload=payload,
            source_module=self.MODULE_NAME,
            priority=priority,
            metadata=metadata or {}
        )
        
        await self.event_bus.publish(event)
        self.logger.debug(f"Event emitted: {event_type}")
    
    def log_info(self, message: str, **kwargs):
        """Log info con contexto del module"""
        self.logger.info(f"[{self.MODULE_NAME}] {message}", extra=kwargs)
    
    def log_error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error con contexto del module"""
        if error:
            self.logger.error(f"[{self.MODULE_NAME}] {message}: {error}", exc_info=True, extra=kwargs)
        else:
            self.logger.error(f"[{self.MODULE_NAME}] {message}", extra=kwargs)
    
    def log_warning(self, message: str, **kwargs):
        """Log warning con contexto del module"""
        self.logger.warning(f"[{self.MODULE_NAME}] {message}", extra=kwargs)
