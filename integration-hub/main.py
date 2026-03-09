"""
ChiPi Link Integration Hub — Main Application
Operations engine for the ChiPi Link community platform.

Handles all background integrations:
- Telegram channel polling
- Monday.com API queue processing
- Gmail wallet receipt polling
- Push notifications (OneSignal)
- Job queue with retry logic
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
    load_dotenv(own_env, override=False)

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

# Integration workers
from integrations.monday_worker import MondayWorker
from integrations.gmail_worker import GmailWorker

monday_worker = MondayWorker(db)
gmail_worker = GmailWorker(db)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown"""
    logger.info(f"Integration Hub starting — DB: {DB_NAME}")

    # Register job handlers so the processor knows how to handle each type
    job_processor.register("monday_api_call", monday_worker.handle_job)
    job_processor.register("monday_webhook_sync", monday_worker.handle_webhook_sync)
    job_processor.register("gmail_scan", gmail_worker.handle_job)
    logger.info(f"Registered {len(job_processor._handlers)} job handlers: {list(job_processor._handlers.keys())}")

    # Start job processor (watches hub_jobs collection)
    asyncio.create_task(job_processor.start())

    # Start Telegram poller (direct polling, not job-based — it's a continuous loop)
    from integrations.telegram_poller import TelegramPoller
    telegram = TelegramPoller(db)
    asyncio.create_task(telegram.start())

    # Start Gmail poller (continuous background loop)
    asyncio.create_task(gmail_worker.start())

    logger.info("Integration Hub ready — all workers and pollers started")
    yield

    # Shutdown
    job_processor.stop()
    gmail_worker.stop()
    telegram.stop()
    client.close()
    logger.info("Integration Hub stopped")


app = FastAPI(
    title="ChiPi Link Integration Hub",
    description="Operations engine — Telegram, Monday.com, Gmail, Push Notifications",
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
    return {
        "status": "ok",
        "service": "integration-hub",
        "db": DB_NAME,
        "handlers": list(job_processor._handlers.keys()),
    }


# Routes
from routes.dashboard import router as dashboard_router
from routes.integrations import router as integrations_router
from routes.jobs import router as jobs_router
from routes.debug import router as debug_router

app.include_router(dashboard_router, prefix="/api")
app.include_router(integrations_router, prefix="/api")
app.include_router(jobs_router, prefix="/api")
app.include_router(debug_router, prefix="/api")
