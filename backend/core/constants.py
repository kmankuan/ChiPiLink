"""
Collection Name Constants
=========================
Centralized collection names for all modules.
This file is the single source of truth for MongoDB collection names.

Phase 2: Microservices-Ready naming convention
- Format: {module}_{entity}
- Example: auth_users, store_products, pinpanclub_players
"""

# =============================================================================
# AUTH MODULE COLLECTIONS
# =============================================================================
class AuthCollections:
    USERS = "auth_users"                    # Previously: clientes
    SESSIONS = "auth_sessions"              # Previously: user_sessions


# =============================================================================
# STORE MODULE COLLECTIONS
# =============================================================================
class StoreCollections:
    PRODUCTS = "store_products"             # Previously: libros
    ORDERS = "store_orders"                 # Previously: pedidos
    CATEGORIES = "store_categories"         # Previously: categorias
    STUDENTS = "store_students"             # Previously: estudiantes_sincronizados


# =============================================================================
# PINPANCLUB MODULE COLLECTIONS
# =============================================================================
class PinpanClubCollections:
    PLAYERS = "pinpanclub_players"          # Previously: pingpong_players
    MATCHES = "pinpanclub_matches"          # Previously: pingpong_matches
    SPONSORS = "pinpanclub_sponsors"        # Previously: pingpong_sponsors
    CONFIG = "pinpanclub_config"            # Previously: pingpong_config
    LAYOUTS = "pinpanclub_layouts"          # Previously: pingpong_layouts
    
    # SuperPin feature collections
    SUPERPIN_LEAGUES = "pinpanclub_superpin_leagues"
    SUPERPIN_CHECKINS = "pinpanclub_superpin_checkins"
    SUPERPIN_MATCHES = "pinpanclub_superpin_matches"
    SUPERPIN_RANKINGS = "pinpanclub_superpin_rankings"
    SUPERPIN_TOURNAMENTS = "pinpanclub_superpin_tournaments"


# =============================================================================
# COMMUNITY MODULE COLLECTIONS
# =============================================================================
class CommunityCollections:
    POSTS = "community_posts"               # Already correct
    EVENTS = "community_events"             # Already correct
    COMMENTS = "community_comments"         # Already correct
    ALBUMS = "community_albums"             # Previously: gallery_albums


# =============================================================================
# CORE/SHARED COLLECTIONS
# =============================================================================
class CoreCollections:
    APP_CONFIG = "core_app_config"          # Previously: app_config
    SITE_CONFIG = "core_site_config"        # Previously: site_config
    NOTIFICATIONS = "core_notifications"    # Previously: notificaciones
    TRANSLATIONS = "core_translations"      # Previously: translations
    PAGES = "core_pages"                    # Previously: paginas


# =============================================================================
# LEGACY MAPPING (for backward compatibility during transition)
# =============================================================================
LEGACY_TO_NEW = {
    # Auth
    "clientes": AuthCollections.USERS,
    "user_sessions": AuthCollections.SESSIONS,
    
    # Store
    "libros": StoreCollections.PRODUCTS,
    "pedidos": StoreCollections.ORDERS,
    "categorias": StoreCollections.CATEGORIES,
    "estudiantes_sincronizados": StoreCollections.STUDENTS,
    
    # PinpanClub
    "pingpong_players": PinpanClubCollections.PLAYERS,
    "pingpong_matches": PinpanClubCollections.MATCHES,
    "pingpong_sponsors": PinpanClubCollections.SPONSORS,
    "pingpong_config": PinpanClubCollections.CONFIG,
    "pingpong_layouts": PinpanClubCollections.LAYOUTS,
    
    # Community
    "gallery_albums": CommunityCollections.ALBUMS,
    
    # Core
    "app_config": CoreCollections.APP_CONFIG,
    "site_config": CoreCollections.SITE_CONFIG,
    "notificaciones": CoreCollections.NOTIFICATIONS,
    "translations": CoreCollections.TRANSLATIONS,
    "paginas": CoreCollections.PAGES,
}
