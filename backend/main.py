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

# Sysbook Module (School Textbook Management)
from modules.sysbook import sysbook_router

# Landing Page Builder Module
from modules.landing.routes import router as landing_router

# Community Module (posts, events, gallery)
# Refactored as Microservices-Ready Module
from modules.community import init_module as init_community
from modules.community import community_refactored_router

# Integrations Module
from modules.integrations.monday.routes import router as monday_router
from modules.integrations.monday.webhook_router import router as monday_webhook_router
from modules.integrations.monday.public_board_widget import router as monday_widget_router
from modules.integrations.sheets.routes import router as sheets_router

# Admin Module (notifications, config, setup)
from modules.admin.routes import router as admin_router
from modules.admin.seed_demo import router as seed_demo_router
from modules.admin.privacy_routes import router as privacy_router, public_router as privacy_public_router
from modules.admin.cleanup_routes import router as cleanup_router
from modules.admin.data_manager_routes import router as data_manager_router
from modules.admin.archive_routes import router as archive_router, init_archive_routes

# Translation Dictionary Module (core feature)
from modules.translations.routes import router as translation_dict_router
from modules.admin.migrations import router as migrations_router
from modules.admin.system_monitor import router as system_monitor_router

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

# Print Module
from modules.print import router as print_router, init_print_routes

# ============== INITIALIZE ROUTES WITH DB ==============

# Initialize routes that need db injection
init_platform_store_routes(db, get_admin_user, get_current_user)
init_membership_routes(db, get_admin_user, get_current_user)
init_translations_routes(db, get_admin_user, get_current_user)

# Initialize Print module with WebSocket manager
from modules.realtime.services import ws_manager
init_print_routes(db, get_admin_user, get_current_user, ws_manager)

# Initialize Archive module
init_archive_routes(db, get_admin_user)

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
api_router.include_router(sysbook_router)  # Sysbook - School Textbook Management
api_router.include_router(landing_router)
api_router.include_router(community_refactored_router)  # Microservices-ready routes
api_router.include_router(monday_router)
api_router.include_router(monday_webhook_router)  # Universal webhook endpoint
api_router.include_router(monday_widget_router)  # Public board widget
api_router.include_router(sheets_router)
api_router.include_router(admin_router)
api_router.include_router(cleanup_router)
api_router.include_router(seed_demo_router)  # Demo data seeding
api_router.include_router(data_manager_router)  # Unified data manager
api_router.include_router(archive_router)  # Archive / soft-delete system
api_router.include_router(migrations_router)  # Database migrations
api_router.include_router(system_monitor_router)  # System health monitor
api_router.include_router(privacy_router)  # Privacy settings
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

# Print Module
api_router.include_router(print_router)


# Widget Module
from modules.widget import widget_router
api_router.include_router(widget_router)

# Dev Control Module
from modules.dev_control import dev_control_router, help_guide_public_router
api_router.include_router(dev_control_router)
api_router.include_router(help_guide_public_router)

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

# Register public endpoints that need to be at root level (no /api prefix)
# robots.txt must be at /robots.txt for search engines
app.include_router(privacy_public_router)

# ============== MIDDLEWARE ==============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS != ['*'] else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pre-import monitor functions at module level (not per-request)
_track_request = None
_track_user_activity = None

def _init_monitor():
    global _track_request, _track_user_activity
    try:
        from modules.admin.system_monitor import track_request, track_user_activity
        _track_request = track_request
        _track_user_activity = track_user_activity
    except Exception:
        pass

# Lightweight request tracking middleware
@app.middleware("http")
async def track_requests_middleware(request, call_next):
    import time as _time
    start = _time.time()
    try:
        response = await call_next(request)
        if _track_request:
            _track_request((_time.time() - start) * 1000, is_error=response.status_code >= 500)
            if _track_user_activity and request.client:
                _track_user_activity(ip=request.client.host)
        return response
    except Exception as e:
        if _track_request:
            _track_request((_time.time() - start) * 1000, is_error=True)
        raise

# Initialize monitor after app is defined
_init_monitor()

# ============== LIFECYCLE EVENTS ==============

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup - fast path for health check readiness"""
    import asyncio
    import traceback
    logger.info("ChiPi Link API starting up...")
    logger.info(f"Database: {db.name}")
    
    # Phase 1: Database indexes (with timeout for Atlas)
    try:
        await asyncio.wait_for(create_indexes(), timeout=30)
    except asyncio.TimeoutError:
        logger.warning("Index creation timed out (30s), continuing...")
    except Exception as e:
        logger.warning(f"Index creation issue: {e}")
    
    # Phase 2: Seed essential data in parallel (with timeout for Atlas)
    try:
        await asyncio.wait_for(
            asyncio.gather(
                seed_admin_user(),
                seed_site_config(),
                seed_translations(),
                seed_landing_page(),
            ),
            timeout=30
        )
    except asyncio.TimeoutError:
        logger.warning("Seed operations timed out (30s), continuing...")
    except Exception as e:
        logger.warning(f"Seed operations issue: {e}")

    logger.info("Core startup complete, scheduling deferred init...")

    # Phase 3+4: Everything else runs as background tasks AFTER server starts accepting connections
    async def _deferred_init():
        # Wait for the event loop to start processing HTTP requests before running background tasks
        await asyncio.sleep(2)
        logger.info("Deferred init starting...")
        
        # Monday queue workers — MOVED TO INTEGRATION HUB for background tasks.
        # The in-process queue remains available for sync API calls that need immediate results.
        # Background/fire-and-forget Monday operations now write to hub_jobs collection.
        logger.info("Monday background workers delegated to Integration Hub")

        try:
            from modules.showcase import seed_showcase_defaults
            await asyncio.wait_for(
                asyncio.gather(
                    seed_showcase_defaults(),
                    init_users(),
                    init_notifications(),
                    roles_service.initialize_default_roles(),
                ),
                timeout=30
            )
        except asyncio.TimeoutError:
            logger.warning("Module init timed out (30s), continuing...")
        except Exception as e:
            logger.warning(f"Module init issue (non-blocking): {e}")
            logger.debug(traceback.format_exc())

        try:
            from modules.users.integrations.monday_wallet_adapter import wallet_monday_adapter
            await asyncio.wait_for(wallet_monday_adapter.register_webhooks(), timeout=10)
            wallet_monday_adapter.init_event_handlers()
        except Exception as e:
            logger.warning(f"Wallet webhook registration skipped: {e}")

        try:
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
        except Exception as e:
            logger.warning(f"Recharge webhook registration skipped: {e}")

        # Register textbook orders board webhook for order-level status sync
        try:
            from modules.store.integrations.monday_textbook_adapter import textbook_monday_adapter
            from modules.integrations.monday.webhook_router import register_handler as register_wh
            txb_board_config = await db['monday_configs'].find_one(
                {"key": "store.textbook_orders.board"}, {"_id": 0}
            )
            txb_board_id = txb_board_config.get("data", {}).get("board_id") if txb_board_config else None
            if not txb_board_id:
                # Fallback: check monday_integration_config
                txb_int_config = await db['monday_integration_config'].find_one(
                    {"config_key": "store.textbook_orders.board"}, {"_id": 0}
                )
                txb_board_id = txb_int_config.get("board_id") if txb_int_config else None
            if txb_board_id:
                register_wh(str(txb_board_id), textbook_monday_adapter.handle_order_status_webhook)
                logger.info(f"Textbook orders webhook registered for board: {txb_board_id}")
            else:
                logger.info("Textbook orders board not configured, skipping webhook")
        except Exception as e:
            logger.warning(f"Textbook orders webhook registration skipped: {e}")

        # Background pollers — MOVED TO INTEGRATION HUB
        # Telegram polling, Gmail polling now run in the Hub process (port 8002).
        # Main app only writes jobs to hub_jobs for Monday.com API calls.
        logger.info("Background pollers delegated to Integration Hub")

        try:
            from modules.showcase.scheduler import banner_sync_scheduler
            from modules.showcase.monday_banner_adapter import monday_banner_adapter
            sync_config = await db['showcase_sync_config'].find_one({"id": "default"}, {"_id": 0})
            if sync_config and sync_config.get("enabled") and sync_config.get("board_id"):
                monday_banner_adapter.configure(board_id=str(sync_config["board_id"]))
                interval = sync_config.get("interval_minutes", 15)
                banner_sync_scheduler.start(monday_banner_adapter, interval_minutes=interval)
                logger.info(f"Banner auto-sync started (every {interval} min)")
            else:
                logger.info("Banner auto-sync not configured, skipping")
        except Exception as e:
            logger.warning(f"Banner auto-sync init failed (non-blocking): {e}")

        logger.info("All modules loaded successfully")

        # Bootstrap Integration Hub (creates supervisor config if needed)
        try:
            import subprocess
            bootstrap_script = "/app/integration-hub/bootstrap.sh"
            if os.path.exists(bootstrap_script):
                result = subprocess.run(
                    ["bash", bootstrap_script],
                    capture_output=True, text=True, timeout=15
                )
                for line in result.stdout.strip().split("\n"):
                    if line.strip():
                        logger.info(line.strip())
                if result.returncode != 0 and result.stderr:
                    logger.warning(f"Hub bootstrap stderr: {result.stderr.strip()}")
        except Exception as e:
            logger.warning(f"Integration Hub bootstrap skipped: {e}")

    # Self-check: verify the server can actually respond to HTTP requests
    async def _self_check():
        await asyncio.sleep(5)
        try:
            import httpx
            async with httpx.AsyncClient() as hc:
                resp = await hc.get("http://127.0.0.1:8001/health", timeout=10)
                logger.info(f"Self-check OK: HTTP {resp.status_code}")
        except Exception as e:
            logger.error(f"Self-check FAILED (server not responding on 127.0.0.1:8001): {e}")

    asyncio.create_task(_deferred_init())
    asyncio.create_task(_self_check())

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("ChiPi Link API shutting down...")
    try:
        from modules.showcase.scheduler import banner_sync_scheduler
        banner_sync_scheduler.stop()
    except Exception as e:
        logger.warning(f"Banner scheduler shutdown issue: {e}")
    try:
        await close_database()
        logger.info("Database connection closed")
    except Exception as e:
        logger.warning(f"Database close issue: {e}")
    logger.info("Application shutdown complete.")

# ============== HEALTH CHECK ==============

# Kubernetes health check endpoint (without /api prefix)
@app.get("/health")
async def kubernetes_health_check():
    """Health check endpoint for Kubernetes liveness/readiness probes — must be fast."""
    try:
        db_name = db.name
    except Exception:
        db_name = "connecting"
    return {"status": "healthy", "db": db_name}

@app.get("/api/health")
async def health_check():
    """Health check endpoint with basic info."""
    try:
        db_name = db.name
    except Exception:
        db_name = "connecting"
    from core.database import mongo_url as _murl
    _murl_safe = _murl[:30] + "...@" + _murl.split("@")[-1][:40] if "@" in _murl else _murl[:60]
    return {
        "status": "healthy",
        "version": "2.3.1-diag",
        "db": db_name,
        "mongo_target": _murl_safe,
    }

@app.get("/api/health/admin-check")
async def admin_check():
    """Diagnostic: check if the admin user was seeded correctly (no auth required)."""
    from core.constants import AuthCollections
    admin_email = os.environ.get('ADMIN_EMAIL', 'teck@koh.one')
    try:
        user = await db[AuthCollections.USERS].find_one(
            {"email": admin_email},
            {"_id": 0, "user_id": 1, "email": 1, "is_admin": 1, "password_hash": 1}
        )
        if user:
            has_hash = bool(user.get("password_hash"))
            hash_len = len(user.get("password_hash", "")) if has_hash else 0
            return {
                "admin_exists": True,
                "user_id": user.get("user_id"),
                "email": user.get("email"),
                "is_admin": user.get("is_admin"),
                "has_password_hash": has_hash,
                "hash_length": hash_len,
                "db_name": db.name,
                "collection": AuthCollections.USERS,
            }
        return {"admin_exists": False, "db_name": db.name, "collection": AuthCollections.USERS}
    except Exception as e:
        return {"error": str(e), "db_name": db.name}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "ChiPi Link API v2.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }


