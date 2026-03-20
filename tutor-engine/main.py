"""
ChiPi Tutor Engine — Separate service on port 8003
AI agents, knowledge processing, student management
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# Load env: backend .env has all secrets
backend_env = Path(__file__).parent.parent / "backend" / ".env"
if backend_env.exists():
    load_dotenv(backend_env)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tutor-engine")

# Database — same as main app
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

# Make db available to tutor modules
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

# Patch core.database so tutor modules can import it
import types
core_db_module = types.ModuleType("core.database")
core_db_module.db = db
core_module = types.ModuleType("core")
sys.modules["core"] = core_module
sys.modules["core.database"] = core_db_module

# Patch core.auth with a minimal implementation for the tutor engine
core_auth_module = types.ModuleType("core.auth")
async def _get_current_user_stub():
    return {"user_id": "tutor_engine", "is_admin": True, "name": "Tutor Engine"}
core_auth_module.get_current_user = _get_current_user_stub
core_auth_module.get_admin_user = _get_current_user_stub
sys.modules["core.auth"] = core_auth_module

app = FastAPI(
    title="ChiPi Tutor Engine",
    description="AI tutoring agents, knowledge processing, student management",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "tutor-engine", "db": DB_NAME}


# Import and register tutor routes
from modules.tutor.routes import router as tutor_router
from modules.tutor.routes_phase2 import router as tutor_router2
from modules.tutor.routes_parent import router as tutor_router_parent
from modules.tutor.school_feed_config import router as school_feed_config_router
from modules.tutor.monday_board_setup import router as monday_board_setup_router
app.include_router(tutor_router, prefix="/api")
app.include_router(tutor_router2, prefix="/api")
app.include_router(tutor_router_parent, prefix="/api")
app.include_router(school_feed_config_router, prefix="/api")
app.include_router(monday_board_setup_router, prefix="/api")

logger.info(f"Tutor Engine starting — DB: {DB_NAME}")
