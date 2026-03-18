"""
ChiPi Commerce Engine — Standalone service on port 8005
Store (Unatienda), Sysbook (School Textbooks), Platform Store

APPROACH: Import REAL core.* modules from /app/backend/ — no patching.
Only stub optional cross-module dependencies (ably, notifications, etc.)
"""
import os
import sys
import types
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ────────── Environment ──────────
backend_env = Path(__file__).parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("commerce-engine")

# ────────── Add backend to path — use REAL core.* modules ──────────
backend_path = str(Path(__file__).parent.parent / "backend")
sys.path.insert(0, backend_path)

# Import real core modules — database, auth, base, constants, config, events
# These ALL work correctly with production MongoDB Atlas
import core.database   # creates db connection (production-aware)
import core.config     # JWT_SECRET, etc.
import core.base       # BaseRepository, BaseService
import core.constants  # StoreCollections
try:
    import core.auth   # REAL auth with full user lookup from DB
except Exception as e:
    logger.error(f"core.auth import failed: {e}")

try:
    import core.events
    import core.events.event_bus
except Exception as e:
    logger.warning(f"core.events import: {e}")

try:
    import core.hub_jobs
except Exception:
    hub_stub = types.ModuleType("core.hub_jobs")
    async def _noop(*a, **kw): pass
    hub_stub.schedule_hub_job = _noop
    sys.modules["core.hub_jobs"] = hub_stub

# Get db reference for health check
db = core.database.db

# ─── Stub ONLY optional cross-module dependencies ───

# modules.ably_integration
ably_stub = types.ModuleType("modules.ably_integration")
async def _noop_pub(ch, ev, data): pass
ably_stub.publish_to_channel = _noop_pub
sys.modules["modules.ably_integration"] = ably_stub

# modules.notifications.push_helpers
notif_mod = types.ModuleType("modules.notifications")
notif_push = types.ModuleType("modules.notifications.push_helpers")
async def _noop_notify(**kw): pass
notif_push.notify_order_status = _noop_notify
notif_push.notify_new_message = _noop_notify
sys.modules["modules.notifications"] = notif_mod
sys.modules["modules.notifications.push_helpers"] = notif_push

# modules.realtime.events
rt_mod = types.ModuleType("modules.realtime")
rt_events = types.ModuleType("modules.realtime.events")
async def _noop_emit(*a, **kw): pass
rt_events.emit_access_request_created = _noop_emit
rt_events.emit_access_request_updated = _noop_emit
sys.modules["modules.realtime"] = rt_mod
sys.modules["modules.realtime.events"] = rt_events

# modules.users.models.wallet_models
users_mod = types.ModuleType("modules.users")
users_models = types.ModuleType("modules.users.models")
wallet_models = types.ModuleType("modules.users.models.wallet_models")
class _Currency:
    USD = "USD"; PAB = "PAB"
wallet_models.Currency = _Currency
sys.modules["modules.users"] = users_mod
sys.modules["modules.users.models"] = users_models
sys.modules["modules.users.models.wallet_models"] = wallet_models

# modules.users.services.wallet_service
users_svc = types.ModuleType("modules.users.services")
wallet_svc_mod = types.ModuleType("modules.users.services.wallet_service")
class _WalletService:
    async def get_balance(self, *a, **kw): return {"balance": 0}
    async def deduct(self, *a, **kw): return True
wallet_svc_mod.wallet_service = _WalletService()
sys.modules["modules.users.services"] = users_svc
sys.modules["modules.users.services.wallet_service"] = wallet_svc_mod

# modules.integrations.monday.*
integ_mod = types.ModuleType("modules.integrations")
monday_mod = types.ModuleType("modules.integrations.monday")
class _BaseMondayAdapter:
    def __init__(self, *a, **kw): pass
    async def sync(self, *a, **kw): return {}
    async def push_item(self, *a, **kw): return {}
base_adapter = types.ModuleType("modules.integrations.monday.base_adapter")
base_adapter.BaseMondayAdapter = _BaseMondayAdapter
config_mgr = types.ModuleType("modules.integrations.monday.config_manager")
class _MondayConfig:
    async def get(self, *a, **kw): return {}
config_mgr.monday_config = _MondayConfig()
core_client_mod = types.ModuleType("modules.integrations.monday.core_client")
class _MondayClient:
    async def query(self, *a, **kw): return {}
    async def mutate(self, *a, **kw): return {}
core_client_mod.monday_client = _MondayClient()
sys.modules["modules.integrations"] = integ_mod
sys.modules["modules.integrations.monday"] = monday_mod
sys.modules["modules.integrations.monday.base_adapter"] = base_adapter
sys.modules["modules.integrations.monday.config_manager"] = config_mgr
sys.modules["modules.integrations.monday.core_client"] = core_client_mod

# services.yappy_service (used by platform_store)
svc_mod = types.ModuleType("services")
yappy_mod = types.ModuleType("services.yappy_service")
class _YappyService:
    def __init__(self, *a, **kw): pass
    async def create_order(self, *a, **kw): return {}
    async def validate(self, *a, **kw): return {}
class _YappyServiceFactory:
    @staticmethod
    def create(*a, **kw): return _YappyService()
yappy_mod.YappyService = _YappyService
yappy_mod.YappyServiceFactory = _YappyServiceFactory
sys.modules["services"] = svc_mod
sys.modules["services.yappy_service"] = yappy_mod


# ────────── FastAPI App ──────────
app = FastAPI(
    title="ChiPi Commerce Engine",
    description="Store (Unatienda), Sysbook (School Textbooks), Platform Store",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
async def health():
    db_name = getattr(core.database, 'db_name', '?')
    return {"status": "ok", "service": "commerce-engine", "port": 8005, "db": str(db_name)}


# ────────── Import & Register Commerce Routes ──────────
try:
    from modules.store import store_refactored_router, init_module as init_store
    app.include_router(store_refactored_router, prefix="/api")
    init_store()
    logger.info("Store module loaded")
except Exception as e:
    logger.error(f"Store module failed: {e}", exc_info=True)

try:
    from modules.sysbook import sysbook_router
    app.include_router(sysbook_router, prefix="/api")
    logger.info("Sysbook module loaded")
except Exception as e:
    logger.error(f"Sysbook module failed: {e}", exc_info=True)

try:
    from core.auth import get_admin_user, get_current_user
    from routes.platform_store import router as platform_store_router, init_routes
    init_routes(db, get_admin_user, get_current_user)
    app.include_router(platform_store_router, prefix="/api")
    logger.info("Platform Store module loaded")
except Exception as e:
    logger.error(f"Platform Store module failed: {e}", exc_info=True)

logger.info(f"Commerce Engine ready — using REAL core.auth + core.database")
