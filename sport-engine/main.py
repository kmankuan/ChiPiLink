"""
ChiPi Sport Engine — Standalone service on port 8004
Table tennis scoring, live matches, TV broadcast, tournaments, rankings
"""
import os
import sys
import logging
import types
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from motor.motor_asyncio import AsyncIOMotorClient
import jwt as pyjwt

# ────────── Environment ──────────
backend_env = Path(__file__).parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sport-engine")

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


async def get_admin_user(user=Depends(get_current_user)):
    if not user.get("is_admin"):
        raise HTTPException(403, "Admin access required")
    return user


# ────────── Patch core.* so sport module imports work unchanged ──────────
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# core.database
core_db = types.ModuleType("core.database")
core_db.db = db
core_mod = types.ModuleType("core")
sys.modules["core"] = core_mod
sys.modules["core.database"] = core_db

# core.auth — real JWT validation (not a stub)
core_auth = types.ModuleType("core.auth")
core_auth.get_current_user = get_current_user
core_auth.get_admin_user = get_admin_user
sys.modules["core.auth"] = core_auth

# Stub modules.ably_integration (optional; logs and skips if unavailable)
# Import the real modules package first, then patch ably_integration only
ably_stub = types.ModuleType("modules.ably_integration")
async def _noop_publish(channel, event, data):
    logger.debug(f"Ably publish skipped (standalone): {channel}/{event}")
ably_stub.publish_to_channel = _noop_publish
sys.modules["modules.ably_integration"] = ably_stub

# ────────── FastAPI App ──────────
app = FastAPI(
    title="ChiPi Sport Engine",
    description="Table tennis scoring, live matches, TV broadcast, tournaments",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "sport-engine", "port": 8004, "db": DB_NAME}


@app.get("/api/sport/health")
async def sport_health():
    return {"status": "ok", "service": "sport-engine", "port": 8004, "db": DB_NAME}


# ────────── Import & Register Sport Routes ──────────
from modules.sport.routes import router as sport_router
from modules.sport.tournament_routes import router as sport_tournament_router

app.include_router(sport_router, prefix="/api")
app.include_router(sport_tournament_router, prefix="/api")

logger.info(f"Sport Engine starting — DB: {DB_NAME}")
