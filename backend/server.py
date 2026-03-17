from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.database import close_db_connection
from .routes import players, leagues, matches, tournaments, live, settings
import os
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI(
    title="ChiPi Sport Engine API",
    description="Standalone Sport module backend for ChiPi Link",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(players.router)
app.include_router(leagues.router) 
app.include_router(matches.router)
app.include_router(tournaments.router)
app.include_router(live.router)
app.include_router(settings.router)

# Health check endpoint
@app.get("/api/sport/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "sport-engine",
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/api/sport")
async def root():
    return {
        "message": "ChiPi Sport Engine API",
        "version": "1.0.0",
        "endpoints": {
            "players": "/api/sport/players",
            "leagues": "/api/sport/leagues",
            "matches": "/api/sport/matches", 
            "tournaments": "/api/sport/tournaments",
            "live": "/api/sport/live",
            "settings": "/api/sport/settings",
            "health": "/api/sport/health"
        }
    }

@app.on_event("shutdown")
async def shutdown_event():
    await close_db_connection()
    logger.info("Database connection closed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)