"""
Community Service - Microservice Entry Point
============================================
Servicio independiente para comunidad, posts, eventos y galería.
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
SERVICE_NAME = "community"
SERVICE_PORT = int(os.environ.get("SERVICE_PORT", 8013))


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
    title="ChiPi Link - Community Service",
    description="Microservice for posts, events and gallery",
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
from app.routes import router as community_router
app.include_router(community_router, prefix="/api/community-v2")

# Also mount at /api/community for backward compatibility
app.include_router(community_router, prefix="/api/community", tags=["Community (Legacy)"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=SERVICE_PORT)
