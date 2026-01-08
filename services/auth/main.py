"""
Auth Service - Microservice Entry Point
=======================================
Servicio independiente para autenticación y gestión de usuarios.
"""

import os
import sys
from pathlib import Path

# Add paths for imports
SERVICE_DIR = Path(__file__).parent
sys.path.insert(0, str(SERVICE_DIR))
sys.path.insert(0, str(SERVICE_DIR / "app"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# Service configuration
SERVICE_NAME = "auth"
SERVICE_PORT = int(os.environ.get("SERVICE_PORT", 8010))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events"""
    print(f"🚀 Starting {SERVICE_NAME} service on port {SERVICE_PORT}")
    
    # Initialize module
    from app import init_module
    init_module()
    
    # TODO: Connect to distributed Event Bus (Redis/RabbitMQ)
    # from core.events import connect_redis_event_bus
    # await connect_redis_event_bus(os.environ.get("REDIS_URL"))
    
    yield
    
    print(f"👋 Shutting down {SERVICE_NAME} service")


# Create FastAPI app
app = FastAPI(
    title="ChiPi Link - Auth Service",
    description="Microservice for authentication and user management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "port": SERVICE_PORT
    }


# Register module routes
from app.routes import router as auth_router
app.include_router(auth_router, prefix="/api/auth-v2")

# Also mount at /api/auth for backward compatibility
app.include_router(auth_router, prefix="/api/auth", tags=["Auth (Legacy)"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
