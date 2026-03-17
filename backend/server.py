from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.database import close_db_connection
from routes import players, leagues, matches, tournaments, live, settings
from routes import auth as auth_routes
from routes.players import _fetch_players_list
from routes.live import manager
from models.player import Player
from fastapi import WebSocket, WebSocketDisconnect
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
app.include_router(auth_routes.router)
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

# Rankings endpoint (top-level, matches original app's /api/sport/rankings)
@app.get("/api/sport/rankings", response_model=list[Player])
async def get_rankings():
    """Get player rankings sorted by ELO"""
    return await _fetch_players_list(active_only=True, sort_by="elo", order="desc")

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

# WebSocket at correct path
@app.websocket("/api/sport/ws/live/{session_id}")
async def websocket_live(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)