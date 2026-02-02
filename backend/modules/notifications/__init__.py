"""
Notifications Module - System for push notifications y posts

Features:
- Soporte multi-proveedor (FCM + OneSignal) con failover
- Categorys de notification configurables
- Preferencias de usuario por category
- Editor avanzado de posts con bloques
- Programación de contenido
- Integration con CRM (placeholders para Monday.com y Fusebase)
"""
from .routes import router as notifications_router
from .services.push_service import push_notification_service
from .services.post_service import post_service


async def init_module():
    """Inicializar module de notifications"""
    print("[Notifications Module] Initializing...")
    await push_notification_service.initialize()
    print("[Notifications Module] Initialized successfully")


__all__ = [
    "notifications_router",
    "push_notification_service",
    "post_service",
    "init_module"
]
