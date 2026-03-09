"""
Users Module - Advanced user system and ChipiWallet

This module provides:
- Configurable user profiles
- User types with permissions
- Relationships between users (parent-child, guardian-dependent)
- ChipiWallet with USD and ChipiPoints
- Membership and visit system
- Connections and capabilities system
"""
from .routes import router as users_router
from .services.user_profile_service import user_profile_service
from .services.wallet_service import wallet_service
from .services.membership_service import membership_service
from .services.connections_service import connections_service


async def init_module():
    """Initialize users module"""
    print("[Users Module] Initializing...")
    
    # Initialize default user types
    await user_profile_service.initialize_user_types()
    
    # Initialize profile fields
    await user_profile_service.initialize_profile_fields()
    
    # Initialize wallet configuration
    await wallet_service.initialize_config()
    await wallet_service.initialize_earn_rules()
    
    # Initialize membership plans
    await membership_service.initialize_default_plans()
    
    # Initialize connections and capabilities
    await connections_service.initialize_defaults()
    
    print("[Users Module] Initialized successfully")


__all__ = [
    "users_router",
    "user_profile_service",
    "wallet_service",
    "membership_service",
    "connections_service",
    "init_module"
]
