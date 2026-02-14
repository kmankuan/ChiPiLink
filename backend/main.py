"""
ChiPi Link - Main Application Entry Point

Modular Monolith Architecture
All modules are organized for future microservices separation.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create uploads directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Create FastAPI app
app = FastAPI(
    title="ChiPi Link API",
    description="Super App - Modular Monolith Backend",
    version="2.0.0"
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ============== IMPORT CORE ==============
from core.database import db, client, close_database, create_indexes, seed_admin_user, seed_site_config, seed_translations, seed_landing_page
from core.config import CORS_ORIGINS
from core.auth import get_current_user, get_admin_user

# ============== IMPORT MODULE ROUTERS ==============

# Auth Module - Refactored as Microservices-Ready Module
from modules.auth import init_module as init_auth
from modules.auth import auth_refactored_router

# Store Module (products, orders, inventory, categories, students)
# Refactored as Microservices-Ready Module
from modules.store import init_module as init_store
from modules.store import store_refactored_router

# Landing Page Builder Module
from modules.landing.routes import router as landing_router

# Community Module (posts, events, gallery)
# Refactored as Microservices-Ready Module
from modules.community import init_module as init_community
from modules.community import community_refactored_router

# Integrations Module
from modules.integrations.monday.routes import router as monday_router
from modules.integrations.monday.webhook_router import router as monday_webhook_router
from modules.integrations.sheets.routes import router as sheets_router

# Admin Module (notifications, config, setup)
from modules.admin.routes import router as admin_router
from modules.admin.seed_demo import router as seed_demo_router

# Translation Dictionary Module (core feature)
from modules.translations.routes import router as translation_dict_router
from modules.admin.migrations import router as migrations_router

# Invision Module (placeholder for laopan.online integration)
from modules.invision.routes import router as invision_router

# ============== NEW MODULES (Placeholders) ==============

# Users Module (Advanced Profiles + ChipiWallet)
from modules.users import users_router, init_module as init_users

# Notifications Module (Push + Posts)
from modules.notifications import notifications_router, init_module as init_notifications

# Chess Club Module
from modules.chess.routes import router as chess_router

# Content Hub Module (video/post curation)
from modules.content_hub.routes import router as content_hub_router

# CXGenie Chat Support Module
from modules.cxgenie.routes import router as cxgenie_router

# AI Tutor Module (language learning)
from modules.ai_tutor.routes import router as ai_tutor_router

# FuseBase Documents Module
from modules.fusebase.routes import router as fusebase_router

# Task Supervisor Module (voice-assisted task management)
from modules.task_supervisor.routes import router as task_supervisor_router

# Upload Module
from modules.upload.routes import router as upload_router

# Realtime WebSocket Module
from modules.realtime import realtime_router

# Roles & Permissions Module
from modules.roles import router as roles_router, roles_service

# ============== IMPORT EXISTING ROUTES ==============

# Platform Store (Unatienda/Yappy) - Already modularized
from routes.platform_store import router as platform_store_router, init_routes as init_platform_store_routes

# Ping Pong Club - Refactored as Microservices-Ready Module
from modules.pinpanclub import init_module as init_pinpanclub
from modules.pinpanclub.routes import router as pinpanclub_router

# Membership - Already modularized
from routes.membership import router as membership_router, init_routes as init_membership_routes

# Translations - Already modularized
from routes.translations import router as translations_router, init_routes as init_translations_routes

# ============== INITIALIZE ROUTES WITH DB ==============

# Initialize routes that need db injection
init_platform_store_routes(db, get_admin_user, get_current_user)
init_membership_routes(db, get_admin_user, get_current_user)
init_translations_routes(db, get_admin_user, get_current_user)

# Initialize PinpanClub module (event handlers)
init_pinpanclub()

# Initialize Store module (event handlers)
init_store()

# Initialize Auth module (event handlers)
init_auth()

# Initialize Community module (event handlers)
init_community()

# ============== REGISTER ROUTERS ==============

# Create main API router with /api prefix
from fastapi import APIRouter
api_router = APIRouter(prefix="/api")

# Register module routers
api_router.include_router(auth_refactored_router)  # Microservices-ready routes
api_router.include_router(store_refactored_router)  # Microservices-ready routes
api_router.include_router(landing_router)
api_router.include_router(community_refactored_router)  # Microservices-ready routes
api_router.include_router(monday_router)
api_router.include_router(monday_webhook_router)  # Universal webhook endpoint
api_router.include_router(sheets_router)
api_router.include_router(admin_router)
api_router.include_router(seed_demo_router)  # Demo data seeding
api_router.include_router(migrations_router)  # Database migrations
api_router.include_router(invision_router)

# Register new modules (placeholders)
api_router.include_router(users_router)
api_router.include_router(chess_router)
api_router.include_router(content_hub_router)
api_router.include_router(cxgenie_router)
api_router.include_router(ai_tutor_router)
api_router.include_router(fusebase_router)
api_router.include_router(task_supervisor_router)

# Register existing modular routes
api_router.include_router(platform_store_router)

# PinpanClub - Microservices-ready module (includes players, matches, sponsors, canvas, websocket)
api_router.include_router(pinpanclub_router)
api_router.include_router(membership_router)
api_router.include_router(translations_router)

# Translation Dictionary (core feature)
api_router.include_router(translation_dict_router)

# Notifications Module
api_router.include_router(notifications_router)

# Upload Module
api_router.include_router(upload_router)

# Realtime WebSocket Module
api_router.include_router(realtime_router)

# Roles & Permissions Module
api_router.include_router(roles_router)

# Widget Module
from modules.widget import widget_router
api_router.include_router(widget_router)

# Dev Control Module
from modules.dev_control import dev_control_router
api_router.include_router(dev_control_router)

# Wallet Topups Module
from modules.wallet_topups import wallet_topups_router
api_router.include_router(wallet_topups_router)

# Ticker Module (Activity feed + Sponsor banners)
from modules.ticker.routes import router as ticker_router, admin_router as ticker_admin_router
api_router.include_router(ticker_router)
api_router.include_router(ticker_admin_router)

# Showcase Module (Banners + Media Player)
from modules.showcase import router as showcase_router, admin_router as showcase_admin_router
api_router.include_router(showcase_router)
api_router.include_router(showcase_admin_router)

# Include main router in app
app.include_router(api_router)

# ============== MIDDLEWARE ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============== LIFECYCLE EVENTS ==============

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("ChiPi Link API starting up...")
    logger.info(f"Database: {os.environ.get('DB_NAME', 'chipi_link')}")
    
    # Create database indexes for optimized queries
    await create_indexes()
    
    # Seed essential data (admin user, site config, translations, landing page)
    await seed_admin_user()
    await seed_site_config()
    await seed_translations()
    await seed_landing_page()

    # Seed showcase defaults (banners + media player)
    from modules.showcase import seed_showcase_defaults
    await seed_showcase_defaults()
    
    # Initialize Users module (async init)
    await init_users()
    
    # Initialize Notifications module (async init)
    await init_notifications()
    
    # Initialize Roles module (create default roles)
    await roles_service.initialize_default_roles()
    
    # Register Monday.com wallet webhook handler + event subscriptions
    from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
    await wallet_monday_adapter.register_webhooks()
    wallet_monday_adapter.init_event_handlers()

    # Register Recharge Approval board webhook handler
    from modules.wallet_topups.monday_sync import recharge_approval_handler
    from modules.integrations.monday.webhook_router import register_handler as register_wh
    recharge_board_config = await db['wallet_topup_monday_config'].find_one(
        {"id": "default"}, {"_id": 0, "board_id": 1, "enabled": 1}
    )
    if recharge_board_config and recharge_board_config.get("board_id") and recharge_board_config.get("enabled"):
        recharge_board_id = str(recharge_board_config["board_id"])
        register_wh(recharge_board_id, recharge_approval_handler.handle_webhook)
        logger.info(f"Recharge Approval webhook registered for board: {recharge_board_id}")
    else:
        logger.info("Recharge Approval board not configured or disabled, skipping webhook")

    # Start Telegram polling for community feed
    from modules.community.services.telegram_service import telegram_service
    if telegram_service.token:
        await telegram_service.start_polling()
        logger.info("Telegram community feed polling started")

    # Start Gmail background polling for payment alerts
    from modules.wallet_topups.gmail_poller import gmail_poller
    await gmail_poller.start()

    # Start Monday.com banner auto-sync scheduler
    from modules.showcase.scheduler import banner_sync_scheduler
    from modules.showcase.monday_banner_adapter import monday_banner_adapter
    try:
        # Re-register local webhook handler if previously configured
        await monday_banner_adapter.ensure_local_handler()

        sync_config = await monday_banner_adapter.get_config()
        auto_sync = sync_config.get("auto_sync", {})
        if auto_sync.get("enabled") and sync_config.get("enabled") and sync_config.get("board_id"):
            interval = auto_sync.get("interval_minutes", 10)
            banner_sync_scheduler.start(interval)
            logger.info(f"Monday banner auto-sync started (every {interval} min)")
        else:
            banner_sync_scheduler.start(10)
            banner_sync_scheduler.pause()
            logger.info("Monday banner auto-sync initialized (paused — not enabled)")
    except Exception as e:
        logger.warning(f"Could not initialize banner auto-sync: {e}")

    logger.info("All modules loaded successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("ChiPi Link API shutting down...")
    from modules.wallet_topups.gmail_poller import gmail_poller
    await gmail_poller.stop()
    from modules.showcase.scheduler import banner_sync_scheduler
    banner_sync_scheduler.stop()
    await close_database()
    logger.info("Database connection closed")

# ============== HEALTH CHECK ==============

# Kubernetes health check endpoint (without /api prefix)
@app.get("/health")
async def kubernetes_health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes"""
    return {"status": "healthy"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint with detailed info"""
    return {
        "status": "healthy",
        "version": "2.1.0",
        "architecture": "modular_monolith",
        "modules": [
            # Core modules
            "auth",
            "store",
            "landing",
            "community",
            "admin",
            # User Management
            "users",
            "notifications",
            # Integrations
            "integrations/monday",
            "integrations/sheets",
            "invision",
            # Community/Activities
            "chess",
            "content_hub",
            # Support & Education
            "cxgenie",
            "ai_tutor",
            "fusebase",
            "task_supervisor",
            # Existing routes
            "platform_store",
            "pingpong",
            "membership",
            "translations"
        ]
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ChiPi Link API v2.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }
