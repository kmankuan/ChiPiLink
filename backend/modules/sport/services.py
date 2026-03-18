"""
Sport Module — Core Business Logic
Player management, match recording, ELO calculation, momentum engine
"""
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from core.database import db
from .settings import get_settings, get_section

logger = logging.getLogger("sport")

# Collections
C_PLAYERS = "sport_players"
C_MATCHES = "sport_matches"
C_LEAGUES = "sport_leagues"
C_LIVE = "sport_live_sessions"
C_REACTIONS = "sport_reactions"


# ═══ PLAYER SERVICE ═══

async def get_or_create_player(name: str) -> dict:
    """Find player by nickname (case-insensitive) or create new one."""
    import re
    existing = await db[C_PLAYERS].find_one(
        {"nickname": {"$regex": f"^{re.escape(name.strip())}$", "$options": "i"}, "active": True},
        {"_id": 0}
    )
    if existing:
        return existing

    settings = await get_section("rating")
    player = {
        "player_id": f"sp_{uuid.uuid4().hex[:10]}",
        "nickname": name.strip(),
        "name": name.strip(),
        "elo": settings.get("initial_elo", 1000),
        "active": True,
        "roles": ["player"],
        "linked_user_id": None,
        "avatar_url": None,
        "stats": {"matches": 0, "wins": 0, "losses": 0, "win_rate": 0, "current_streak": 0, "best_streak": 0, "matches_refereed": 0},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_from": "match",
    }
    await db[C_PLAYERS].insert_one(player)
    player.pop("_id", None)
    logger.info(f"Auto-created player: {name} ({player['player_id']})")
    return player


async def get_player(player_id: str) -> Optional[dict]:
    return await db[C_PLAYERS].find_one({"player_id": player_id, "active": True}, {"_id": 0})


async def get_all_players(limit: int = 200) -> List[dict]:
    return await db[C_PLAYERS].find({"active": True}, {"_id": 0}).sort("elo", -1).limit(limit).to_list(limit)


async def link_player_to_user(player_id: str, user_id: str, admin_id: str) -> dict:
    user = await db.auth_users.find_one({"user_id": user_id}, {"_id": 0, "user_id": 1, "name": 1, "email": 1})
    if not user:
        raise ValueError("User not found")
    await db[C_PLAYERS].update_one(
        {"player_id": player_id},
        {"$set": {"linked_user_id": user_id, "linked_user_name": user.get("name", ""), "linked_user_email": user.get("email", ""), "linked_by": admin_id, "linked_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True, "player_id": player_id, "linked_to": user_id}


async def delete_player(player_id: str) -> bool:
    result = await db[C_PLAYERS].update_one({"player_id": player_id}, {"$set": {"active": False}})
    return result.modified_count > 0


# ═══ MATCH SERVICE ═══

async def record_match(data: dict) -> dict:
    """Record a completed match. Auto-creates players if needed."""
    pa = await get_or_create_player(data["player_a_name"])
    pb = await get_or_create_player(data["player_b_name"])
    ref = await get_or_create_player(data["referee_name"])

    # Ensure referee has referee role
    if "referee" not in ref.get("roles", []):
        await db[C_PLAYERS].update_one({"player_id": ref["player_id"]}, {"$addToSet": {"roles": "referee"}})

    winner_name = data["winner_name"].strip().lower()
    if winner_name == pa["nickname"].lower():
        winner = pa
        loser = pb
    elif winner_name == pb["nickname"].lower():
        winner = pb
        loser = pa
    else:
        raise ValueError("Winner must be one of the two players")

    names = {pa["nickname"].lower(), pb["nickname"].lower(), ref["nickname"].lower()}
    if len(names) < 3:
        raise ValueError("All 3 participants must be different")

    settings = await get_settings()
    now = datetime.now(timezone.utc).isoformat()

    # Calculate ELO change
    elo_change_a, elo_change_b = calculate_elo(
        pa["elo"], pb["elo"],
        winner_is_a=(winner["player_id"] == pa["player_id"]),
        k=settings.get("rating", {}).get("elo_k_factor", 32)
    )

    match = {
        "match_id": f"sm_{uuid.uuid4().hex[:10]}",
        "player_a": {"player_id": pa["player_id"], "nickname": pa["nickname"], "elo_before": pa["elo"], "elo_change": elo_change_a},
        "player_b": {"player_id": pb["player_id"], "nickname": pb["nickname"], "elo_before": pb["elo"], "elo_change": elo_change_b},
        "referee": {"player_id": ref["player_id"], "nickname": ref["nickname"]},
        "winner_id": winner["player_id"],
        "score_winner": data.get("score_winner", 11),
        "score_loser": data.get("score_loser", 0),
        "league_id": data.get("league_id"),
        "status": "validated" if settings.get("match", {}).get("auto_validate") else "pending",
        "notes": data.get("notes"),
        "source": "manual",
        "created_at": now,
        "validated_at": now if settings.get("match", {}).get("auto_validate") else None,
    }
    await db[C_MATCHES].insert_one(match)
    match.pop("_id", None)

    # Update player stats + ELO
    await _update_player_stats(pa["player_id"], winner["player_id"] == pa["player_id"], elo_change_a)
    await _update_player_stats(pb["player_id"], winner["player_id"] == pb["player_id"], elo_change_b)
    await db[C_PLAYERS].update_one({"player_id": ref["player_id"]}, {"$inc": {"stats.matches_refereed": 1}})

    logger.info(f"Match recorded: {pa['nickname']} vs {pb['nickname']} -> {winner['nickname']} wins ({data.get('score_winner', 11)}-{data.get('score_loser', 0)})")
    return match


async def get_match(match_id: str) -> Optional[dict]:
    return await db[C_MATCHES].find_one({"match_id": match_id}, {"_id": 0})


async def get_matches(league_id: str = None, limit: int = 50) -> List[dict]:
    query = {}
    if league_id:
        query["league_id"] = league_id
    return await db[C_MATCHES].find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


async def validate_match(match_id: str, validated_by: str) -> dict:
    match = await db[C_MATCHES].find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        raise ValueError("Match not found")
    if match["status"] == "validated":
        return match
    await db[C_MATCHES].update_one(
        {"match_id": match_id},
        {"$set": {"status": "validated", "validated_at": datetime.now(timezone.utc).isoformat(), "validated_by": validated_by}}
    )
    match["status"] = "validated"
    return match


async def delete_match(match_id: str) -> bool:
    match = await db[C_MATCHES].find_one({"match_id": match_id}, {"_id": 0})
    if not match:
        return False
    # Reverse ELO changes
    pa = match.get("player_a", {})
    pb = match.get("player_b", {})
    if pa.get("player_id"):
        await db[C_PLAYERS].update_one({"player_id": pa["player_id"]}, {"$inc": {"elo": -(pa.get("elo_change", 0)), "stats.matches": -1}})
    if pb.get("player_id"):
        await db[C_PLAYERS].update_one({"player_id": pb["player_id"]}, {"$inc": {"elo": -(pb.get("elo_change", 0)), "stats.matches": -1}})
    await db[C_MATCHES].delete_one({"match_id": match_id})
    return True


# ═══ LIVE MATCH SERVICE ═══

async def create_live_session(data: dict) -> dict:
    """Create a live match for real-time scoring."""
    pa = await get_or_create_player(data["player_a_name"])
    pb = await get_or_create_player(data["player_b_name"])
    ref = await get_or_create_player(data["referee_name"])
    if "referee" not in ref.get("roles", []):
        await db[C_PLAYERS].update_one({"player_id": ref["player_id"]}, {"$addToSet": {"roles": "referee"}})

    settings = await get_section("live")
    now = datetime.now(timezone.utc).isoformat()
    session_id = f"live_{uuid.uuid4().hex[:8]}"

    session = {
        "session_id": session_id,
        "status": "live",
        "player_a": {"player_id": pa["player_id"], "nickname": pa["nickname"], "elo": pa["elo"], "photo_url": pa.get("photo_base64", "") or pa.get("avatar_url", "")},
        "player_b": {"player_id": pb["player_id"], "nickname": pb["nickname"], "elo": pb["elo"], "photo_url": pb.get("photo_base64", "") or pb.get("avatar_url", "")},
        "referee": {"player_id": ref["player_id"], "nickname": ref["nickname"], "photo_url": ref.get("photo_base64", "") or ref.get("avatar_url", "")},
        "league_id": data.get("league_id"),
        "stream_url": data.get("stream_url", ""),
        "settings": {
            "sets_to_win": data.get("sets_to_win", 2),
            "points_to_win": data.get("points_to_win", 11),
            "auto_service": settings.get("auto_service_tracking", True),
            "auto_swap_sides": True,
        },
        "current_set": 1,
        "sets": [],
        "score": {"a": 0, "b": 0},
        "sets_won": {"a": 0, "b": 0},
        "server": "a",
        "points": [],
        "all_points": [],  # ALL points across ALL sets (persistent history)
        "timeouts": {"a": 0, "b": 0},
        "cards": [],  # Yellow/red cards log
        "calls": [],  # Let, timeout calls log
        "reactions": {},
        "spectator_count": 0,
        "created_at": now,
        # Timers
        "timers": {
            "match_start": now,
            "set_starts": [now],  # When each set started
            "set_durations": [],  # Duration of completed sets (seconds)
        },
        # Display state — synced to TV/spectator
        "display": {
            "swapped": False,
            "last_emotion": None,
            "last_emotion_side": None,
            "last_emotion_at": None,
            "is_public": True,
            "broadcast_mode": None,  # null=game | "intro" | "break" | "banner" | "standings"
            "broadcast_data": {},  # Extra data for broadcast mode
            "last_card": None,  # Last card shown
            "last_call": None,  # Last call (let/timeout)
            "last_effect": None,  # Referee's manual sticker
            "last_effect_at": None,
        },
    }
    await db[C_LIVE].insert_one(session)
    session.pop("_id", None)
    logger.info(f"Live session created: {session_id} ({pa['nickname']} vs {pb['nickname']})")
    
    # Persist photos to player records (so they auto-fill next time)
    for pid, photo_key in [(pa["player_id"], "player_a_photo"), (pb["player_id"], "player_b_photo"), (ref["player_id"], "referee_photo")]:
        photo = data.get(photo_key, "")
        if photo:
            await db[C_PLAYERS].update_one({"player_id": pid, "$or": [{"avatar_url": None}, {"avatar_url": ""}]}, {"$set": {"avatar_url": photo}})
    
    return session


async def score_point(session_id: str, scored_by: str, technique: str = None) -> dict:
    """Score a point and return updated state + emotions."""
    session = await db[C_LIVE].find_one({"session_id": session_id}, {"_id": 0})
    if not session or session["status"] != "live":
        raise ValueError("Live session not found or not active")

    other = "b" if scored_by == "a" else "a"
    score = session["score"]
    score[scored_by] += 1
    pts_to_win = session["settings"]["points_to_win"]

    # Track point
    point_num = len(session["points"]) + 1
    point = {
        "num": point_num,
        "set": session["current_set"],
        "scored_by": scored_by,
        "score_after": {"a": score["a"], "b": score["b"]},
        "technique": technique,
        "server": session["server"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    # Calculate streak
    streak = 1
    for p in reversed(session["points"]):
        if p["set"] == session["current_set"] and p["scored_by"] == scored_by:
            streak += 1
        else:
            break
    point["streak"] = streak

    # Auto-service rotation (table tennis rules)
    # Each player serves 2 consecutive points, then switch
    # At deuce (both >= pts_to_win - 1): alternate every 1 point
    set_points = score["a"] + score["b"]  # Points in CURRENT set only
    is_deuce = score["a"] >= (pts_to_win - 1) and score["b"] >= (pts_to_win - 1)
    
    if is_deuce:
        # At deuce: service changes every single point
        # Toggle server from whoever served last
        if set_points > 0:
            session["server"] = "b" if session["server"] == "a" else "a"
    else:
        # Normal play: service changes every 2 points
        if set_points > 0 and set_points % 2 == 0:
            session["server"] = "b" if session["server"] == "a" else "a"

    # Detect emotions
    emotions = detect_emotions(score, scored_by, streak, session, point_num)
    point["emotions"] = [e["type"] for e in emotions]

    # Calculate momentum
    momentum = calculate_momentum(session["points"] + [point], scored_by)
    point["momentum"] = momentum

    # Check set win
    set_won = False
    lead = abs(score["a"] - score["b"])
    if score[scored_by] >= pts_to_win and lead >= 2:
        set_won = True
        session["sets"].append({
            "set_num": session["current_set"],
            "score_a": score["a"], "score_b": score["b"],
            "winner": scored_by,
        })
        session["sets_won"][scored_by] += 1

        # Check match win
        if session["sets_won"][scored_by] >= session["settings"]["sets_to_win"]:
            session["status"] = "finished"
            session["winner"] = scored_by
            emotions.append({"type": "winner", "player": scored_by})
        else:
            # New set — record set duration, reset score
            session["current_set"] += 1
            session["score"] = {"a": 0, "b": 0}
            session["server"] = "a" if session["current_set"] % 2 == 1 else "b"

    # Update DB — include display state for emotion sync + all_points
    emotion_update = {}
    if emotions:
        emotion_update["display.last_emotion"] = emotions[0]["type"]
        emotion_update["display.last_emotion_side"] = scored_by
        emotion_update["display.last_emotion_at"] = datetime.now(timezone.utc).isoformat()
    
    await db[C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"score": session["score"], "sets": session["sets"], "sets_won": session["sets_won"],
                  "server": session["server"], "current_set": session["current_set"],
                  "status": session["status"], **emotion_update},
         "$push": {"points": point, "all_points": point}}
    )

    # If match finished, auto-create a recorded match
    if session["status"] == "finished":
        await _finalize_live_match(session)

    return {
        "point": point,
        "score": session["score"],
        "sets": session["sets"],
        "sets_won": session["sets_won"],
        "server": session["server"],
        "current_set": session["current_set"],
        "status": session["status"],
        "emotions": emotions,
        "momentum": momentum,
        "set_won": set_won,
        "winner": session.get("winner"),
    }


async def undo_point(session_id: str) -> dict:
    """Undo the last point scored."""
    session = await db[C_LIVE].find_one({"session_id": session_id}, {"_id": 0})
    if not session or not session["points"]:
        raise ValueError("No points to undo")
    last = session["points"][-1]
    # Revert score
    session["score"][last["scored_by"]] -= 1
    await db[C_LIVE].update_one(
        {"session_id": session_id},
        {"$set": {"score": session["score"]}, "$pop": {"points": 1}}
    )
    return {"undone": last, "score": session["score"]}


async def get_live_session(session_id: str) -> Optional[dict]:
    return await db[C_LIVE].find_one({"session_id": session_id}, {"_id": 0})


async def get_active_sessions() -> List[dict]:
    return await db[C_LIVE].find({"status": "live"}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)


async def end_live_session(session_id: str) -> dict:
    """Force-end a live session."""
    await db[C_LIVE].update_one({"session_id": session_id}, {"$set": {"status": "cancelled"}})
    return {"session_id": session_id, "status": "cancelled"}


async def add_reaction(session_id: str, reaction_id: str, user_id: str = None) -> dict:
    key = f"reactions.{reaction_id}"
    await db[C_LIVE].update_one({"session_id": session_id}, {"$inc": {key: 1}})
    session = await db[C_LIVE].find_one({"session_id": session_id}, {"_id": 0, "reactions": 1})
    return session.get("reactions", {})


# ═══ LEAGUE SERVICE ═══

async def create_league(data: dict, created_by: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    league = {
        "league_id": f"sl_{uuid.uuid4().hex[:10]}",
        "name": data["name"],
        "description": data.get("description", ""),
        "season": data.get("season", str(datetime.now().year)),
        "rating_system": data.get("rating_system", "elo"),
        "status": "active",
        "start_date": data.get("start_date"),
        "end_date": data.get("end_date"),
        "total_matches": 0,
        "total_players": 0,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
    }
    await db[C_LEAGUES].insert_one(league)
    league.pop("_id", None)
    return league


async def get_league(league_id: str) -> Optional[dict]:
    return await db[C_LEAGUES].find_one({"league_id": league_id}, {"_id": 0})


async def get_all_leagues() -> List[dict]:
    return await db[C_LEAGUES].find({}, {"_id": 0}).sort("created_at", -1).to_list(50)


async def get_league_standings(league_id: str) -> List[dict]:
    """Get standings for a league based on matches."""
    matches = await db[C_MATCHES].find({"league_id": league_id, "status": "validated"}, {"_id": 0}).to_list(1000)
    stats = {}
    for m in matches:
        for side in ["player_a", "player_b"]:
            p = m[side]
            pid = p["player_id"]
            if pid not in stats:
                stats[pid] = {"player_id": pid, "nickname": p["nickname"], "matches": 0, "wins": 0, "losses": 0, "points": 0, "elo": 1000}
            stats[pid]["matches"] += 1
            if m["winner_id"] == pid:
                stats[pid]["wins"] += 1
                stats[pid]["points"] += 3
            else:
                stats[pid]["losses"] += 1
                stats[pid]["points"] += 1
            stats[pid]["elo"] = p.get("elo_before", 1000) + p.get("elo_change", 0)

    standings = sorted(stats.values(), key=lambda x: (-x["points"], -x["wins"], -x["elo"]))
    for i, s in enumerate(standings):
        s["position"] = i + 1
        s["win_rate"] = round(s["wins"] / max(s["matches"], 1) * 100)
    return standings


async def get_league_matrix(league_id: str) -> dict:
    """Get head-to-head matrix for round-robin display."""
    matches = await db[C_MATCHES].find({"league_id": league_id, "status": "validated"}, {"_id": 0}).to_list(1000)
    players = {}
    matrix = {}
    for m in matches:
        pa_id = m["player_a"]["player_id"]
        pb_id = m["player_b"]["player_id"]
        players[pa_id] = m["player_a"]["nickname"]
        players[pb_id] = m["player_b"]["nickname"]
        key = f"{pa_id}_vs_{pb_id}"
        rev_key = f"{pb_id}_vs_{pa_id}"
        if key not in matrix:
            matrix[key] = {"a": pa_id, "b": pb_id, "matches": []}
        matrix[key]["matches"].append({"winner": m["winner_id"], "score": f"{m['score_winner']}-{m['score_loser']}"})
    return {"players": players, "matrix": matrix}


async def delete_league(league_id: str) -> bool:
    await db[C_LEAGUES].delete_one({"league_id": league_id})
    return True


# ═══ ELO + RATING ENGINE ═══

def calculate_elo(elo_a: float, elo_b: float, winner_is_a: bool, k: int = 32) -> Tuple[int, int]:
    """Calculate ELO changes for both players."""
    expected_a = 1.0 / (1 + 10 ** ((elo_b - elo_a) / 400))
    expected_b = 1.0 - expected_a
    score_a = 1.0 if winner_is_a else 0.0
    score_b = 1.0 - score_a
    change_a = round(k * (score_a - expected_a))
    change_b = round(k * (score_b - expected_b))
    return change_a, change_b


# ═══ MOMENTUM ENGINE ═══

def calculate_momentum(points: list, last_scorer: str) -> float:
    """Calculate momentum value 0-1 for last_scorer based on recent points."""
    if not points:
        return 0.5
    recent = points[-10:]  # Last 10 points
    scorer_points = sum(1 for p in recent if p.get("scored_by") == last_scorer)
    return round(scorer_points / max(len(recent), 1), 2)


def detect_emotions(score: dict, scored_by: str, streak: int, session: dict, point_num: int) -> list:
    """Detect emotion events based on game state."""
    emotions = []
    other = "b" if scored_by == "a" else "a"
    pts_to_win = session["settings"]["points_to_win"]

    if streak == 3:
        emotions.append({"type": "streak_3", "player": scored_by})
    elif streak == 5:
        emotions.append({"type": "streak_5", "player": scored_by})
    elif streak >= 7:
        emotions.append({"type": "streak_5", "player": scored_by})  # Dragon mode stays

    # Streak broken (opponent had 3+ streak, now this player scored)
    if streak == 1 and len(session["points"]) >= 3:
        prev_streak = 0
        for p in reversed(session["points"][-4:]):
            if p.get("scored_by") == other:
                prev_streak += 1
            else:
                break
        if prev_streak >= 3:
            emotions.append({"type": "streak_break", "player": scored_by})

    # Deuce
    if score["a"] >= (pts_to_win - 1) and score["b"] >= (pts_to_win - 1) and score["a"] == score["b"]:
        emotions.append({"type": "deuce", "player": None})

    # Match point
    if score[scored_by] == (pts_to_win - 1) and score[scored_by] > score[other]:
        emotions.append({"type": "match_point", "player": scored_by})

    # Comeback (was down 4+, now leading)
    if score[scored_by] > score[other] and point_num > 6:
        # Check if scorer was down earlier
        mid = len(session["points"]) // 2
        if mid > 0:
            mid_score = session["points"][mid].get("score_after", {})
            if mid_score.get(scored_by, 0) < mid_score.get(other, 0) - 3:
                emotions.append({"type": "comeback", "player": scored_by})

    # Perfect set (11-0)
    if score[scored_by] >= pts_to_win and score[other] == 0:
        emotions.append({"type": "perfect_set", "player": scored_by})

    return emotions


# ═══ HELPERS ═══

async def _update_player_stats(player_id: str, won: bool, elo_change: int):
    inc = {"stats.matches": 1, "elo": elo_change}
    if won:
        inc["stats.wins"] = 1
    else:
        inc["stats.losses"] = 1
    await db[C_PLAYERS].update_one({"player_id": player_id}, {"$inc": inc})
    # Update win rate and streak
    player = await db[C_PLAYERS].find_one({"player_id": player_id}, {"_id": 0})
    if player:
        s = player.get("stats", {})
        win_rate = round(s.get("wins", 0) / max(s.get("matches", 1), 1) * 100)
        streak = (s.get("current_streak", 0) + 1) if won else 0
        best = max(s.get("best_streak", 0), streak)
        await db[C_PLAYERS].update_one(
            {"player_id": player_id},
            {"$set": {"stats.win_rate": win_rate, "stats.current_streak": streak, "stats.best_streak": best}}
        )


async def _finalize_live_match(session: dict):
    """Convert a finished live session into a recorded match."""
    try:
        winner_side = session.get("winner", "a")
        pa = session["player_a"]
        pb = session["player_b"]
        winner = pa if winner_side == "a" else pb
        total_w = sum(s["score_a" if s["winner"] == "a" else "score_b"] for s in session["sets"])
        total_l = sum(s["score_b" if s["winner"] == "a" else "score_a"] for s in session["sets"])
        await record_match({
            "player_a_name": pa["nickname"],
            "player_b_name": pb["nickname"],
            "referee_name": session["referee"]["nickname"],
            "winner_name": winner["nickname"],
            "score_winner": total_w,
            "score_loser": total_l,
            "league_id": session.get("league_id"),
            "notes": f"Live match {session['session_id']} — {len(session['sets'])} sets",
        })
    except Exception as e:
        logger.error(f"Failed to finalize live match {session.get('session_id')}: {e}")
