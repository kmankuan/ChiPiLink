"""
ChiPi Link Integration Hub — Main Application
Operations engine for the ChiPi Link community platform.
"""
import os
import asyncio
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

# Load env: prefer backend .env (shared production secrets), fallback to own .env
backend_env = Path(__file__).parent.parent / "backend" / ".env"
own_env = Path(__file__).parent / ".env"
if backend_env.exists():
    load_dotenv(backend_env)
if own_env.exists():
    load_dotenv(own_env, override=False)  # don't override backend values

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hub")

# Database — shares the same MongoDB as the main app
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "chipi_link")

client = AsyncIOMotorClient(
    MONGO_URL,
    maxPoolSize=30,
    minPoolSize=3,
    maxIdleTimeMS=45000,
    serverSelectionTimeoutMS=10000,
    retryWrites=True,
    retryReads=True,
)
db = client[DB_NAME]


# Job processor
from jobs.processor import JobProcessor
job_processor = JobProcessor(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    logger.info(f"Integration Hub starting — DB: {DB_NAME}")
    
    # Start job processor
    asyncio.create_task(job_processor.start())
    
    # Start pollers
    from integrations.telegram_poller import TelegramPoller
    telegram = TelegramPoller(db)
    asyncio.create_task(telegram.start())
    
    logger.info("Integration Hub ready")
    yield
    
    # Shutdown
    job_processor.stop()
    client.close()
    logger.info("Integration Hub stopped")


app = FastAPI(
    title="ChiPi Link Integration Hub",
    description="Operations engine for the ChiPi Link community platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health
@app.get("/health")
async def health():
    return {"status": "ok", "service": "integration-hub"}


# Routes
from routes.dashboard import router as dashboard_router
from routes.integrations import router as integrations_router
from routes.jobs import router as jobs_router
from routes.debug import router as debug_router

app.include_router(dashboard_router, prefix="/api")
app.include_router(integrations_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(debug_router, prefix="/api")
