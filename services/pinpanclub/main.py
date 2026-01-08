"""
PinpanClub Service - Microservice Entry Point
=============================================
Servicio independiente para PinpanClub, jugadores, partidos y torneos.
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
SERVICE_NAME = "pinpanclub"
SERVICE_PORT = int(os.environ.get("SERVICE_PORT", 8012))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events"""
    print(f"🚀 Starting {SERVICE_NAME} service on port {SERVICE_PORT}")
    
    # Initialize module
    from app import init_module
    init_module()
    
    yield
    
    print(f"👋 Shutting down {SERVICE_NAME} service")


# Create FastAPI app
app = FastAPI(
    title="ChiPi Link - PinpanClub Service",
    description="Microservice for ping pong players, matches and tournaments",
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
from app.routes import router as pinpanclub_router
app.include_router(pinpanclub_router, prefix="/api/pinpanclub")

# Also mount at /api/pingpong for backward compatibility
app.include_router(pinpanclub_router, prefix="/api/pingpong", tags=["PingPong (Legacy)"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
