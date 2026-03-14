"""
Sport Module — Tournament Service
Bracket generation, seeding, round management for:
- Single Elimination
- Double Elimination  
- Round Robin
- Swiss System
"""
import uuid
import math
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
from core.database import db

logger = logging.getLogger("sport.tournament")

C_TOURNAMENTS = "sport_tournaments"
C_PLAYERS = "sport_players"
C_MATCHES = "sport_matches"


async def create_tournament(data: dict, created_by: str) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    tid = f"st_{uuid.uuid4().hex[:10]}"
    tournament = {
        "tournament_id": tid,
        "name": data["name"],
        "description": data.get("description", ""),
        "format": data.get("format", "single_elimination"),
        "status": "registration",
        "max_participants": data.get("max_participants", 16),
        "min_participants": data.get("min_participants", 4),
        "seeds_from_league": data.get("seeds_from_league"),
        "third_place_match": data.get("third_place_match", True),
        "points_to_win": data.get("points_to_win", 11),
        "sets_to_win": data.get("sets_to_win", 2),
        "participants": [],
        "brackets": [],
        "rounds": [],
        "current_round": 0,
        "winner_id": None,
        "created_by": created_by,
        "created_at": now,
        "updated_at": now,
        "settings": {"auto_advance": True, "show_seeding": True, "bracket_style": "standard"},
    }
    await db[C_TOURNAMENTS].insert_one(tournament)
    tournament.pop("_id", None)
    return tournament


async def get_tournament(tid: str) -> Optional[dict]:
    return await db[C_TOURNAMENTS].find_one({"tournament_id": tid}, {"_id": 0})


async def get_all_tournaments(status: str = None) -> List[dict]:
    query = {} if not status else {"status": status}
    return await db[C_TOURNAMENTS].find(query, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)


async def delete_tournament(tid: str) -> bool:
    return (await db[C_TOURNAMENTS].delete_one({"tournament_id": tid})).deleted_count > 0


async def register_by_name(tid: str, name: str) -> dict:
    from .services import get_or_create_player
    player = await get_or_create_player(name)
    t = await get_tournament(tid)
    if not t: raise ValueError("Tournament not found")
    if t["status"] != "registration": raise ValueError("Registration closed")
    if len(t["participants"]) >= t["max_participants"]: raise ValueError("Tournament full")
    if any(p["player_id"] == player["player_id"] for p in t["participants"]): raise ValueError("Already registered")
    p = {"player_id": player["player_id"], "nickname": player["nickname"], "elo": player.get("elo", 1000), "seed": len(t["participants"]) + 1, "registered_at": datetime.now(timezone.utc).isoformat()}
    await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$push": {"participants": p}})
    return p


async def remove_participant(tid: str, player_id: str) -> bool:
    return (await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$pull": {"participants": {"player_id": player_id}}})).modified_count > 0


async def apply_seeding(tid: str, order: List[str] = None) -> dict:
    t = await get_tournament(tid)
    if not t: raise ValueError("Tournament not found")
    participants = t["participants"]
    if order:
        pid_map = {p["player_id"]: p for p in participants}
        participants = [dict(pid_map[pid], seed=i+1) for i, pid in enumerate(order) if pid in pid_map]
    else:
        participants.sort(key=lambda x: -x.get("elo", 1000))
        for i, p in enumerate(participants): p["seed"] = i + 1
    await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$set": {"participants": participants}})
    return {"participants": participants}


async def seed_from_league(tid: str, league_id: str) -> dict:
    from .services import get_league_standings
    standings = await get_league_standings(league_id)
    t = await get_tournament(tid)
    if not t: raise ValueError("Tournament not found")
    seeded = [{"player_id": s["player_id"], "nickname": s["nickname"], "elo": s.get("elo", 1000), "seed": i+1, "registered_at": datetime.now(timezone.utc).isoformat()} for i, s in enumerate(standings[:t["max_participants"]])]
    await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$set": {"participants": seeded, "status": "seeding"}})
    return {"seeded": len(seeded), "participants": seeded}


def _next_pow2(n): return 2 ** math.ceil(math.log2(max(n, 2)))

def _seed_order(size):
    if size == 2: return [0, 1]
    half = _seed_order(size // 2)
    return [x * 2 for x in half] + [size - 1 - x * 2 for x in half]


async def generate_brackets(tid: str) -> dict:
    t = await get_tournament(tid)
    if not t: raise ValueError("Tournament not found")
    parts = t["participants"]
    if len(parts) < 2: raise ValueError("Need at least 2 participants")
    fmt = t["format"]
    if fmt == "single_elimination":
        brackets = _gen_single_elim(parts, t.get("third_place_match", True))
    elif fmt == "round_robin":
        brackets = _gen_round_robin(parts)
    elif fmt == "swiss":
        brackets = _gen_swiss(parts)
    else:
        brackets = _gen_single_elim(parts, True)
    await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$set": {"brackets": brackets, "current_round": 1, "status": "in_progress"}})
    return {"brackets": brackets}


def _gen_single_elim(participants, third_place=True):
    n = len(participants)
    size = _next_pow2(n)
    total_rounds = int(math.log2(size))
    padded = participants + [None] * (size - n)
    order = _seed_order(size)
    ordered = [padded[i] if i < len(padded) else None for i in order]
    
    names = {}
    if total_rounds >= 2: names[total_rounds - 1] = "Semifinals"
    if total_rounds >= 1: names[total_rounds] = "Final"
    if total_rounds >= 3: names[total_rounds - 2] = "Quarterfinals"
    
    rounds = []
    # Round 1
    r1 = []
    for i in range(0, size, 2):
        pa, pb = ordered[i], ordered[i+1]
        m = {"match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": 1, "position": len(r1)+1,
             "player_a": {"player_id": pa["player_id"], "nickname": pa["nickname"], "seed": pa["seed"]} if pa else None,
             "player_b": {"player_id": pb["player_id"], "nickname": pb["nickname"], "seed": pb["seed"]} if pb else None,
             "winner_id": None, "score": None, "status": "pending"}
        if not pa or not pb:
            w = pa or pb
            if w: m["winner_id"] = w["player_id"]; m["status"] = "bye"
        r1.append(m)
    rounds.append({"round": 1, "name": names.get(1, "Round 1"), "matches": r1})
    
    for r in range(2, total_rounds + 1):
        mc = size // (2 ** r)
        rm = [{"match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": r, "position": j+1,
               "player_a": None, "player_b": None, "winner_id": None, "score": None,
               "status": "waiting", "feeds_from": [2*j+1, 2*j+2]} for j in range(mc)]
        rounds.append({"round": r, "name": names.get(r, f"Round {r}"), "matches": rm})
    
    if third_place and total_rounds >= 2:
        rounds.append({"round": total_rounds + 1, "name": "Third Place",
                       "matches": [{"match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": total_rounds+1, "position": 1,
                                    "player_a": None, "player_b": None, "winner_id": None, "score": None,
                                    "status": "waiting", "is_third_place": True}]})
    
    # Auto-advance byes in round 1
    _auto_advance_byes(rounds)
    return rounds


def _auto_advance_byes(rounds):
    if len(rounds) < 2: return
    for m in rounds[0]["matches"]:
        if m["status"] == "bye" and m["winner_id"]:
            pos = m["position"]
            next_pos = math.ceil(pos / 2)
            slot = "player_a" if pos % 2 == 1 else "player_b"
            winner_info = m["player_a"] if (m.get("player_a") or {}).get("player_id") == m["winner_id"] else m["player_b"]
            for nm in rounds[1]["matches"]:
                if nm["position"] == next_pos:
                    nm[slot] = winner_info
                    if nm["player_a"] and nm["player_b"]: nm["status"] = "pending"
                    break


def _gen_round_robin(participants):
    n = len(participants)
    players = list(participants)
    if n % 2 == 1: players.append(None); n += 1
    rounds = []
    for r in range(n - 1):
        rm = []
        for i in range(n // 2):
            pa, pb = players[i], players[n-1-i]
            if pa and pb:
                rm.append({"match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": r+1, "position": len(rm)+1,
                           "player_a": {"player_id": pa["player_id"], "nickname": pa["nickname"], "seed": pa.get("seed", 0)},
                           "player_b": {"player_id": pb["player_id"], "nickname": pb["nickname"], "seed": pb.get("seed", 0)},
                           "winner_id": None, "score": None, "status": "pending"})
        rounds.append({"round": r+1, "name": f"Round {r+1}", "matches": rm})
        players = [players[0]] + [players[-1]] + players[1:-1]
    return rounds


def _gen_swiss(participants, rounds_count=5):
    n = len(participants); half = n // 2
    r1 = [{"match_id": f"tm_{uuid.uuid4().hex[:8]}", "round": 1, "position": i+1,
           "player_a": {"player_id": participants[i]["player_id"], "nickname": participants[i]["nickname"]},
           "player_b": {"player_id": participants[half+i]["player_id"], "nickname": participants[half+i]["nickname"]} if half+i < n else None,
           "winner_id": None, "score": None, "status": "pending"} for i in range(half)]
    rounds = [{"round": 1, "name": "Round 1", "matches": r1}]
    for r in range(2, min(rounds_count, n) + 1):
        rounds.append({"round": r, "name": f"Round {r}", "matches": [], "status": "waiting"})
    return rounds


async def report_match_result(tid: str, match_id: str, winner_id: str, score: str) -> dict:
    t = await get_tournament(tid)
    if not t: raise ValueError("Tournament not found")
    now = datetime.now(timezone.utc).isoformat()
    
    for rnd in t["brackets"]:
        for m in rnd["matches"]:
            if m["match_id"] == match_id:
                m["winner_id"] = winner_id
                m["score"] = score
                m["status"] = "completed"
                # Advance winner
                _advance(t["brackets"], rnd["round"], m["position"], winner_id, m)
                # Check tournament complete
                finals = [r for r in t["brackets"] if "Final" in r.get("name", "")]
                if finals and all(fm.get("winner_id") for fm in finals[-1]["matches"]):
                    t["status"] = "finished"
                    t["winner_id"] = finals[-1]["matches"][0]["winner_id"]
                await db[C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$set": {"brackets": t["brackets"], "status": t["status"], "winner_id": t.get("winner_id"), "updated_at": now}})
                return {"success": True, "match_id": match_id}
    raise ValueError("Match not found")


def _advance(brackets, from_round, from_pos, winner_id, match):
    next_round = from_round + 1
    next_pos = math.ceil(from_pos / 2)
    slot = "player_a" if from_pos % 2 == 1 else "player_b"
    winner_info = match.get("player_a") if (match.get("player_a") or {}).get("player_id") == winner_id else match.get("player_b")
    for rnd in brackets:
        if rnd["round"] == next_round:
            for m in rnd["matches"]:
                if m["position"] == next_pos and not m.get("is_third_place"):
                    m[slot] = winner_info
                    if m["player_a"] and m["player_b"]: m["status"] = "pending"
                    return
