"""
ChiPi Commerce Engine — Standalone service on port 8005
Store (Unatienda), Sysbook (School Textbooks), Platform Store
"""
import os
import sys
import types
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional, List
import jwt as pyjwt

# ────────── Environment ──────────
backend_env = Path(__file__).parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("commerce-engine")

# ────────── Database (same as main app) ──────────
_PROD_MONGO_URL = "mongodb+srv://backend-cleanup-10:d6do7vklqs2c73catqeg@customer-apps.o0opyp.mongodb.net/?appName=order-items-feature&maxPoolSize=5&retryWrites=true&timeoutMS=10000&w=majority"
_PROD_DB_NAME = "backend-cleanup-10-chipilink_prod"

_env_mongo = os.environ.get("MONGO_URL", "")
if "localhost" in _env_mongo or "127.0.0.1" in _env_mongo:
    MONGO_URL = _env_mongo
    DB_NAME = os.environ.get("DB_NAME", "chipilink_prod")
else:
    MONGO_URL = _PROD_MONGO_URL
    DB_NAME = _PROD_DB_NAME

client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=20, minPoolSize=2,
    maxIdleTimeMS=45000, retryWrites=True, retryReads=True,
)
db = client[DB_NAME]

# ────────── JWT Auth (same secret as main app) ──────────
JWT_SECRET = os.environ.get("JWT_SECRET", "libros-textbook-store-secret-key-2024")
JWT_ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
):
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = pyjwt.decode(
            credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM]
        )
        return payload
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def get_admin_user(
    request: Request = None,
    credentials: HTTPAuthorizationCredentials = Security(_bearer),
):
    user = await get_current_user(request, credentials)
    if not user.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return user


async def get_optional_user(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    try:
        return await get_current_user(request, credentials)
    except HTTPException:
        return None


def require_permission(permission: str):
    async def permission_checker(
        request: Request = None,
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    ) -> dict:
        user = await get_current_user(request, credentials)
        if user.get("is_admin"):
            return user
        raise HTTPException(403, f"Permission {permission} required")
    return permission_checker


def get_database():
    return db


# ────────── Patch core.* so module imports work unchanged ──────────
backend_path = str(Path(__file__).parent.parent / "backend")
sys.path.insert(0, backend_path)

# Import the REAL core package first, then patch specific submodules
import core  # real package from /app/backend/core/
import core.base
import core.base.repository
import core.base.service
import core.constants
import core.config

# Now try importing events (may fail if deps missing)
try:
    import core.events
    import core.events.event_bus
except Exception as e:
    logger.warning(f"core.events import: {e}")
    # Stub minimal event bus
    core_events = types.ModuleType("core.events")
    class _EventPriority:
        LOW = 1; NORMAL = 2; HIGH = 3; CRITICAL = 4
    class _Event:
        def __init__(self, **kw):
            for k, v in kw.items():
                setattr(self, k, v)
    class _StoreEvents:
        PRODUCT_CREATED = "store.product.created"
        PRODUCT_UPDATED = "store.product.updated"
        ORDER_CREATED = "store.order.created"
        ORDER_UPDATED = "store.order.updated"
    class _EventBus:
        def subscribe(self, *a, **kw): pass
        async def publish(self, *a, **kw): pass
    core_events.EventPriority = _EventPriority
    core_events.Event = _Event
    core_events.StoreEvents = _StoreEvents
    core_events.event_bus = _EventBus()
    sys.modules["core.events"] = core_events
    evbus_stub = types.ModuleType("core.events.event_bus")
    evbus_stub.EventBus = type(_EventBus)
    sys.modules["core.events.event_bus"] = evbus_stub

# Patch core.database — override with OUR db connection
core.database.db = db
core.database.get_database = get_database

# Patch core.auth — override with OUR JWT validation
core.auth.get_current_user = get_current_user
core.auth.get_admin_user = get_admin_user
core.auth.get_optional_user = get_optional_user
core.auth.require_permission = require_permission

# Patch core.config
core.config.JWT_SECRET = JWT_SECRET
core.config.JWT_ALGORITHM = JWT_ALGORITHM

# Stub core.hub_jobs
try:
    import core.hub_jobs
except Exception:
    core_hub = types.ModuleType("core.hub_jobs")
    async def _noop_hub(*a, **kw): pass
    core_hub.schedule_hub_job = _noop_hub
    sys.modules["core.hub_jobs"] = core_hub

# ─── Stub optional cross-module dependencies ───

# modules.ably_integration
ably_stub = types.ModuleType("modules.ably_integration")
async def _noop_pub(ch, ev, data): logger.debug(f"Ably skipped: {ch}/{ev}")
ably_stub.publish_to_channel = _noop_pub
sys.modules["modules.ably_integration"] = ably_stub

# modules.notifications.push_helpers
notif_mod = types.ModuleType("modules.notifications")
notif_push = types.ModuleType("modules.notifications.push_helpers")
async def _noop_notify(**kw): logger.debug(f"Notification skipped")
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
core_client = types.ModuleType("modules.integrations.monday.core_client")
class _MondayClient:
    async def query(self, *a, **kw): return {}
    async def mutate(self, *a, **kw): return {}
core_client.monday_client = _MondayClient()
sys.modules["modules.integrations"] = integ_mod
sys.modules["modules.integrations.monday"] = monday_mod
sys.modules["modules.integrations.monday.base_adapter"] = base_adapter
sys.modules["modules.integrations.monday.config_manager"] = config_mgr
sys.modules["modules.integrations.monday.core_client"] = core_client

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
    return {"status": "ok", "service": "commerce-engine", "port": 8005, "db": DB_NAME}


# ────────── Import & Register Commerce Routes ──────────
try:
    from modules.store import store_refactored_router, init_module as init_store
    app.include_router(store_refactored_router, prefix="/api")
    init_store()
    logger.info("Store module loaded")
except Exception as e:
    logger.error(f"Store module failed: {e}")

try:
    from modules.sysbook import sysbook_router
    app.include_router(sysbook_router, prefix="/api")
    logger.info("Sysbook module loaded")
except Exception as e:
    logger.error(f"Sysbook module failed: {e}")

try:
    from routes.platform_store import router as platform_store_router, init_routes
    init_routes(db, get_admin_user, get_current_user)
    app.include_router(platform_store_router, prefix="/api")
    logger.info("Platform Store module loaded")
except Exception as e:
    logger.error(f"Platform Store module failed: {e}")

logger.info(f"Commerce Engine starting — DB: {DB_NAME}")
