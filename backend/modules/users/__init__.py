"""
Users Module - Sistema de usuarios avanzado y ChipiWallet

Este módulo provee:
- Perfiles de usuario configurables
- Tipos de usuario con permisos
- Relaciones entre usuarios (padre-hijo, acudiente-dependiente)
- ChipiWallet con USD y ChipiPoints
- Sistema de membresías y visitas
- Sistema de conexiones y capacidades
"""
from .routes import router as users_router
from .services.user_profile_service import user_profile_service
from .services.wallet_service import wallet_service
from .services.membership_service import membership_service
from .services.conexiones_service import conexiones_service


async def init_module():
    """Inicializar módulo de usuarios"""
    print("[Users Module] Initializing...")
    
    # Inicializar tipos de usuario por defecto
    await user_profile_service.initialize_user_types()
    
    # Inicializar campos de perfil
    await user_profile_service.initialize_profile_fields()
    
    # Inicializar configuración de wallet
    await wallet_service.initialize_config()
    await wallet_service.initialize_earn_rules()
    
    # Inicializar planes de membresía
    await membership_service.initialize_default_plans()
    
    # Inicializar conexiones y capacidades
    await conexiones_service.initialize_defaults()
    
    print("[Users Module] Initialized successfully")


__all__ = [
    "users_router",
    "user_profile_service",
    "wallet_service",
    "membership_service",
    "conexiones_service",
    "init_module"
]
