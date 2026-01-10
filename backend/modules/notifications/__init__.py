"""
Notifications Module - Sistema de notificaciones push y posts

Características:
- Soporte multi-proveedor (FCM + OneSignal) con failover
- Categorías de notificación configurables
- Preferencias de usuario por categoría
- Editor avanzado de posts con bloques
- Programación de contenido
- Integración con CRM (placeholders para Monday.com y Fusebase)
"""
from .routes import router as notifications_router
from .services.push_service import push_notification_service
from .services.post_service import post_service


async def init_module():
    """Inicializar módulo de notificaciones"""
    print("[Notifications Module] Initializing...")
    await push_notification_service.initialize()
    print("[Notifications Module] Initialized successfully")


__all__ = [
    "notifications_router",
    "push_notification_service",
    "post_service",
    "init_module"
]
