"""
Sport Module — API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from typing import Optional
from core.auth import get_current_user, get_admin_user
from core.database import db
from . import services
from .models import *
from .settings import get_settings, update_settings, get_section
import logging, json, asyncio

logger = logging.getLogger("sport")
router = APIRouter(prefix="/sport", tags=["Sport"])


# ═══ SETTINGS ═══

@router.get("/settings")
async def get_all_settings(admin: dict = Depends(get_admin_user)):
    return await get_settings()

@router.put("/settings/{section}")
async def update_section(section: str, data: dict, admin: dict = Depends(get_admin_user)):
    return await update_settings(section, data)


# ═══ PLAYERS ═══

@router.get("/players")
async def list_players(limit: int = 200):
    return await services.get_all_players(limit)

@router.get("/players/{player_id}")
async def get_player(player_id: str):
    p = await services.get_player(player_id)
    if not p: raise HTTPException(404, "Player not found")
    return p

@router.post("/players")
async def create_player(data: PlayerCreate, admin: dict = Depends(get_admin_user)):
    return await services.get_or_create_player(data.nickname)

@router.post("/players/{player_id}/link")
async def link_player(player_id: str, data: PlayerLinkRequest, admin: dict = Depends(get_admin_user)):
    try:
        return await services.link_player_to_user(player_id, data.user_id, admin.get("user_id"))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/players/{player_id}")
async def deactivate_player(player_id: str, admin: dict = Depends(get_admin_user)):
    if await services.delete_player(player_id):
        return {"success": True}
    raise HTTPException(404, "Player not found")


# ═══ MATCHES ═══

@router.post("/matches")
async def record_match(data: MatchRecordRequest, user: dict = Depends(get_current_user)):
    """Record a completed match by typing player names."""
    try:
        return await services.record_match(data.model_dump())
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/matches")
async def list_matches(league_id: Optional[str] = None, limit: int = 50):
    return await services.get_matches(league_id, limit)

@router.get("/matches/{match_id}")
async def get_match(match_id: str):
    m = await services.get_match(match_id)
    if not m: raise HTTPException(404, "Match not found")
    return m

@router.post("/matches/{match_id}/validate")
async def validate_match(match_id: str, user: dict = Depends(get_current_user)):
    try:
        return await services.validate_match(match_id, user.get("user_id", ""))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.delete("/matches/{match_id}")
async def delete_match(match_id: str, admin: dict = Depends(get_admin_user)):
    if await services.delete_match(match_id):
        return {"success": True}
    raise HTTPException(404, "Match not found")


# ═══ LIVE SCORING ═══

@router.post("/live")
async def create_live(data: LiveMatchCreate, user: dict = Depends(get_current_user)):
    """Start a live match for real-time scoring."""
    return await services.create_live_session(data.model_dump())

@router.get("/live")
async def list_live():
    """Get all active live sessions."""
    return await services.get_active_sessions()

@router.get("/live/{session_id}")
async def get_live(session_id: str):
    s = await services.get_live_session(session_id)
    if not s: raise HTTPException(404, "Session not found")
    return s

@router.post("/live/{session_id}/point")
async def score_point(session_id: str, data: LivePointScore, user: dict = Depends(get_current_user)):
    """Score a point in a live match."""
    try:
        result = await services.score_point(session_id, data.scored_by, data.technique)
        # Push to WebSocket subscribers
        await _broadcast(session_id, {"type": "point", "data": result})
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/live/{session_id}/undo")
async def undo_point(session_id: str, user: dict = Depends(get_current_user)):
    try:
        result = await services.undo_point(session_id)
        await _broadcast(session_id, {"type": "undo", "data": result})
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/live/{session_id}/end")
async def end_live(session_id: str, user: dict = Depends(get_current_user)):
    result = await services.end_live_session(session_id)
    await _broadcast(session_id, {"type": "ended", "data": result})
    return result


@router.post("/live/{session_id}/manual-set")
async def add_manual_set(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Add a completed set manually (for games already in progress before referee started)."""
    session = await services.get_live_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    if session["status"] != "live":
        raise HTTPException(400, "Session is not live")
    
    score_a = int(data.get("score_a", 0))
    score_b = int(data.get("score_b", 0))
    winner = data.get("winner", "a" if score_a > score_b else "b")
    
    new_set = {"set_num": session["current_set"], "score_a": score_a, "score_b": score_b, "winner": winner}
    sets = session.get("sets", []) + [new_set]
    sets_won = session.get("sets_won", {"a": 0, "b": 0})
    sets_won[winner] += 1
    new_current = session["current_set"] + 1
    
    # Check if match is won
    status = "live"
    if sets_won[winner] >= session["settings"]["sets_to_win"]:
        status = "finished"
    
    await db[services.C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"sets": sets, "sets_won": sets_won, "current_set": new_current, "status": status,
                  "score": {"a": 0, "b": 0}}}
    )
    
    if status == "finished":
        updated = await services.get_live_session(session_id)
        if updated:
            updated["winner"] = winner
            await services._finalize_live_match(updated)
    
    await _broadcast(session_id, {"type": "manual_set", "data": {"set": new_set, "sets_won": sets_won}})
    return {"success": True, "set": new_set, "sets_won": sets_won, "status": status}

@router.post("/live/{session_id}/react")
async def react(session_id: str, data: dict):
    """Add a spectator reaction (no auth needed)."""
    reaction_id = data.get("reaction_id", "clap")
    reactions = await services.add_reaction(session_id, reaction_id)
    await _broadcast(session_id, {"type": "reaction", "data": reactions})
    return reactions


@router.put("/live/{session_id}/settings")
async def update_live_settings(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update live match settings mid-game (sets_to_win, points_to_win)."""
    session = await services.get_live_session(session_id)
    if not session:
        raise HTTPException(404, "Session not found")
    
    update = {}
    if "sets_to_win" in data:
        update["settings.sets_to_win"] = int(data["sets_to_win"])
    if "points_to_win" in data:
        update["settings.points_to_win"] = int(data["points_to_win"])
    
    if update:
        await db[services.C_LIVE].update_one({"session_id": session_id}, {"$set": update})
        await _broadcast(session_id, {"type": "settings_changed", "data": data})
    
    return {"success": True, "updated": update}

# Polling fallback for live state
@router.get("/live/{session_id}/state")
async def get_live_state(session_id: str):
    """Polling endpoint: get current live match state."""
    s = await services.get_live_session(session_id)
    if not s: raise HTTPException(404, "Session not found")
    return {
        "score": s["score"], "sets": s["sets"], "sets_won": s["sets_won"],
        "server": s["server"], "current_set": s["current_set"], "status": s["status"],
        "points": s["points"][-20:],  # Last 20 points for momentum
        "reactions": s.get("reactions", {}),
        "stream_url": s.get("stream_url", ""),
    }


# ═══ LEAGUES ═══

@router.post("/leagues")
async def create_league(data: LeagueCreate, user: dict = Depends(get_current_user)):
    if not user.get("is_admin") and user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(403, "Only admins/moderators can create leagues")
    return await services.create_league(data.model_dump(), user.get("user_id", ""))

@router.get("/leagues")
async def list_leagues():
    return await services.get_all_leagues()

@router.get("/leagues/{league_id}")
async def get_league(league_id: str):
    l = await services.get_league(league_id)
    if not l: raise HTTPException(404, "League not found")
    return l

@router.get("/leagues/{league_id}/standings")
async def get_standings(league_id: str):
    return await services.get_league_standings(league_id)

@router.get("/leagues/{league_id}/matrix")
async def get_matrix(league_id: str):
    return await services.get_league_matrix(league_id)

@router.delete("/leagues/{league_id}")
async def delete_league(league_id: str, admin: dict = Depends(get_admin_user)):
    await services.delete_league(league_id)
    return {"success": True}


# ═══ RANKINGS (global, across all leagues) ═══

@router.get("/rankings")
async def get_rankings(type: str = "elo"):
    """Global rankings: elo (player ELO), referees, streaks"""
    players = await services.get_all_players(100)
    if type == "referees":
        referees = [p for p in players if "referee" in p.get("roles", [])]
        return sorted(referees, key=lambda x: -x.get("stats", {}).get("matches_refereed", 0))
    elif type == "streaks":
        return sorted(players, key=lambda x: -x.get("stats", {}).get("best_streak", 0))
    return players  # Already sorted by ELO


# ═══ WEBSOCKET ═══

_ws_connections: dict = {}  # session_id -> set of WebSocket

@router.websocket("/ws/live/{session_id}")
async def websocket_live(websocket: WebSocket, session_id: str):
    await websocket.accept()
    if session_id not in _ws_connections:
        _ws_connections[session_id] = set()
    _ws_connections[session_id].add(websocket)
    # Update spectator count
    await services.db[services.C_LIVE].update_one(
        {"session_id": session_id}, {"$set": {"spectator_count": len(_ws_connections[session_id])}}
    )
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        _ws_connections[session_id].discard(websocket)
        if not _ws_connections[session_id]:
            del _ws_connections[session_id]


async def _broadcast(session_id: str, message: dict):
    """Broadcast to all WebSocket subscribers of a live session."""
    if session_id not in _ws_connections:
        return
    dead = set()
    text = json.dumps(message, default=str)
    for ws in _ws_connections[session_id]:
        try:
            await ws.send_text(text)
        except Exception:
            dead.add(ws)
    _ws_connections[session_id] -= dead
