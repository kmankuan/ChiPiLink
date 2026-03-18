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


async def _ably_publish(session_id, event, data):
    """Publish to Ably channel for this live session."""
    try:
        from modules.ably_integration import publish_to_channel
        await publish_to_channel(f"sport:live:{session_id}", event, data)
    except Exception as e:
        logger.debug(f"Ably publish skipped: {e}")


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

@router.put("/players/{player_id}/photo")
async def update_photo(player_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Upload player photo — auto-resizes to 3 sizes server-side.
    Stores: photo_thumb (80x80), photo_medium (300x300), photo_original.
    Live sessions use photo_thumb. Profile pages use photo_medium.
    """
    from .image_utils import process_player_photo
    url = data.get("photo_url", "")
    b64 = data.get("photo_base64", "")
    
    if not b64 and not url:
        # Remove photo
        await db[services.C_PLAYERS].update_one({"player_id": player_id}, {
            "$set": {"avatar_url": "", "photo_base64": "", "photo_thumb": "", "photo_medium": ""},
        })
        return {"success": True, "message": "Photo removed"}
    
    if b64:
        if len(b64) > 15_000_000:
            raise HTTPException(400, "Image too large (max ~10MB)")
        sizes = process_player_photo(b64)
        await db[services.C_PLAYERS].update_one({"player_id": player_id}, {"$set": {
            "photo_thumb": sizes["thumb"],       # 80x80 JPEG ~3-5KB
            "photo_medium": sizes["medium"],     # 300x300 JPEG ~20-40KB
            "photo_base64": sizes["medium"],     # keep medium as default (not original)
            "avatar_url": "",                     # clear URL since we have base64
        }})
        return {"success": True, "sizes": {k: f"{len(v)//1024}KB" for k, v in sizes.items()}}
    
    if url:
        await db[services.C_PLAYERS].update_one({"player_id": player_id}, {"$set": {"avatar_url": url}})
        return {"success": True}


@router.post("/players/migrate-photos")
async def migrate_all_photos(admin: dict = Depends(get_admin_user)):
    """Resize all existing player photos to thumb/medium sizes. Run once after deploying."""
    from .image_utils import process_player_photo
    players = await db[services.C_PLAYERS].find(
        {"photo_base64": {"$exists": True, "$ne": ""}},
        {"player_id": 1, "nickname": 1, "photo_base64": 1}
    ).to_list(500)
    
    migrated = 0
    errors = 0
    for p in players:
        try:
            b64 = p.get("photo_base64", "")
            if not b64 or len(b64) < 100:
                continue
            sizes = process_player_photo(b64)
            await db[services.C_PLAYERS].update_one(
                {"player_id": p["player_id"]},
                {"$set": {"photo_thumb": sizes["thumb"], "photo_medium": sizes["medium"], "photo_base64": sizes["medium"]}}
            )
            migrated += 1
        except Exception as e:
            errors += 1
            logger.warning(f"Photo migration failed for {p.get('nickname')}: {e}")
    
    return {"migrated": migrated, "errors": errors, "total": len(players)}


@router.post("/players/{player_id}/link-request")
async def request_link(player_id: str, user: dict = Depends(get_current_user)):
    """User requests to link their account to a player profile."""
    player = await services.get_player(player_id)
    if not player: raise HTTPException(404, "Player not found")
    if player.get("linked_user_id"): raise HTTPException(400, "Player already linked")
    
    await db[services.C_PLAYERS].update_one(
        {"player_id": player_id},
        {"$set": {"link_request": {"user_id": user.get("user_id"), "user_name": user.get("name", ""), "requested_at": __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}}}
    )
    return {"success": True, "message": "Link request submitted"}

@router.get("/players/{player_id}/link-request")
async def get_link_request(player_id: str, admin: dict = Depends(get_admin_user)):
    """Admin views pending link request."""
    player = await services.get_player(player_id)
    if not player: raise HTTPException(404, "Player not found")
    return player.get("link_request")

@router.post("/players/{player_id}/link-approve")
async def approve_link(player_id: str, admin: dict = Depends(get_admin_user)):
    """Admin approves a player-user link request."""
    player = await services.get_player(player_id)
    if not player: raise HTTPException(404, "Player not found")
    req = player.get("link_request")
    if not req: raise HTTPException(400, "No pending link request")
    try:
        result = await services.link_player_to_user(player_id, req["user_id"], admin.get("user_id"))
        await db[services.C_PLAYERS].update_one({"player_id": player_id}, {"$unset": {"link_request": 1}})
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


# ═══ ANALYTICS ═══

@router.get("/players/{player_id}/analytics")
async def get_player_analytics(player_id: str):
    """Get technique analytics report for a player."""
    from .analytics import get_player_technique_report
    return await get_player_technique_report(player_id)


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
        # Broadcast via both WebSocket AND Ably
        await _broadcast(session_id, {"type": "point", "data": result})
        await _ably_publish(session_id, "point", result)
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


# ═══ CARDS & CALLS ═══

@router.post("/live/{session_id}/card")
async def issue_card(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Issue yellow/red card to a player."""
    card_type = data.get("card_type", "yellow")  # yellow | red
    target = data.get("target")  # "a" or "b"
    if card_type not in ("yellow", "red") or target not in ("a", "b"):
        raise HTTPException(400, "card_type must be yellow/red, target must be a/b")
    
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    card = {"card_type": card_type, "target": target, "time": now}
    
    update = {"$push": {"cards": card}, "$set": {"display.last_card": card, "display.last_card_at": now}}
    # Red card = point penalty (opponent gets a point)
    if card_type == "red":
        other = "b" if target == "a" else "a"
        update["$inc"] = {f"score.{other}": 1}
    
    await db[services.C_LIVE].update_one({"session_id": session_id}, update)
    await _broadcast(session_id, {"type": "card", "data": card})
    return {"success": True, "card": card}


@router.post("/live/{session_id}/call")
async def make_call(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Make a call: let (net touch), timeout."""
    call_type = data.get("call_type")  # "let" | "timeout"
    target = data.get("target")  # "a" or "b" (for timeout)
    
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    call = {"call_type": call_type, "target": target, "time": now}
    
    update_set = {"display.last_call": call}
    if call_type == "timeout" and target in ("a", "b"):
        update_set[f"timeouts.{target}"] = 1  # Mark timeout used
    
    await db[services.C_LIVE].update_one({"session_id": session_id}, {"$push": {"calls": call}, "$set": update_set})
    await _broadcast(session_id, {"type": "call", "data": call})
    return {"success": True, "call": call}


# ═══ REFEREE EFFECTS (manual stickers to TV) ═══

@router.post("/live/{session_id}/effect")
async def send_effect(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Referee sends a manual sticker/effect to TV."""
    effect_id = data.get("effect_id", "fire")
    now = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()
    await db[services.C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"display.last_effect": effect_id, "display.last_effect_at": now}}
    )
    await _broadcast(session_id, {"type": "effect", "data": {"effect_id": effect_id}})
    return {"success": True}


@router.put("/live/{session_id}/referee")
async def change_referee(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Change referee mid-match."""
    from .services import get_or_create_player
    name = data.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Referee name required")
    ref = await get_or_create_player(name)
    if "referee" not in ref.get("roles", []):
        await db[services.C_PLAYERS].update_one({"player_id": ref["player_id"]}, {"$addToSet": {"roles": "referee"}})
    photo = data.get("photo_url", "") or ref.get("avatar_url", "")
    await db[services.C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"referee": {"player_id": ref["player_id"], "nickname": ref["nickname"], "photo_url": photo}}}
    )
    await _broadcast(session_id, {"type": "state_refresh"})
    return {"success": True, "referee": ref["nickname"]}



# ═══ TV BROADCAST CONTROL ═══

@router.post("/live/{session_id}/broadcast")
async def set_broadcast(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Control what TV shows: game, intro, break, banner, standings."""
    mode = data.get("mode")  # null=game | "intro" | "break" | "banner" | "standings" | "sponsor"
    broadcast_data = data.get("data", {})
    
    await db[services.C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"display.broadcast_mode": mode, "display.broadcast_data": broadcast_data}}
    )
    await _broadcast(session_id, {"type": "broadcast", "data": {"mode": mode, **broadcast_data}})
    return {"success": True, "mode": mode}


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


@router.put("/live/{session_id}/display")
async def update_display(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Update display state (swapped sides, visibility, etc.) — syncs to TV."""
    update = {}
    if "swapped" in data:
        update["display.swapped"] = bool(data["swapped"])
    if "is_public" in data:
        update["display.is_public"] = bool(data["is_public"])
    if "last_emotion" in data:
        update["display.last_emotion"] = data["last_emotion"]
        update["display.last_emotion_side"] = data.get("last_emotion_side")
    if "player_a_photo" in data:
        update["player_a.photo_url"] = data["player_a_photo"]
    if "player_b_photo" in data:
        update["player_b.photo_url"] = data["player_b_photo"]
    
    if update:
        await db[services.C_LIVE].update_one({"session_id": session_id}, {"$set": update})
        await _broadcast(session_id, {"type": "display_update", "data": data})
    return {"success": True}


@router.put("/live/{session_id}/server")
async def override_server(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Manually change who is serving."""
    server = data.get("server")
    if server not in ("a", "b"):
        raise HTTPException(400, "server must be 'a' or 'b'")
    await db[services.C_LIVE].update_one({"session_id": session_id}, {"$set": {"server": server}})
    # Broadcast full state refresh so TV picks up immediately
    await _broadcast(session_id, {"type": "state_refresh"})
    return {"success": True, "server": server}

# Polling fallback for live state
@router.get("/live/{session_id}/state")
async def get_live_state(session_id: str):
    """Polling endpoint: get current live match state."""
    s = await services.get_live_session(session_id)
    if not s: raise HTTPException(404, "Session not found")
    return {
        "score": s["score"], "sets": s["sets"], "sets_won": s["sets_won"],
        "server": s["server"], "current_set": s["current_set"], "status": s["status"],
        "points": s["points"][-20:],
        "all_points": s.get("all_points", s.get("points", []))[-60:],  # Persistent across sets
        "reactions": s.get("reactions", {}),
        "stream_url": s.get("stream_url", ""),
        "display": s.get("display", {}),
        "player_a": s.get("player_a", {}),
        "player_b": s.get("player_b", {}),
        "referee": s.get("referee", {}),
        "settings": s.get("settings", {}),
        "timers": s.get("timers", {}),
        "cards": s.get("cards", [])[-10:],
        "calls": s.get("calls", [])[-10:],
        "timeouts": s.get("timeouts", {}),
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
