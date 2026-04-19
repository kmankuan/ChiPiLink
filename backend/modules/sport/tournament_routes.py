"""
Sport Module — Tournament API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional
from core.auth import get_current_user, get_admin_user
from . import tournament_service as ts

router = APIRouter(prefix="/sport/tournaments", tags=["Sport Tournaments"])


@router.post("")
async def create_tournament(data: dict, user: dict = Depends(get_current_user)):
    if not user.get("is_admin") and user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(403, "Only admins/moderators can create tournaments")
    if not data.get("name"): raise HTTPException(400, "name required")
    return await ts.create_tournament(data, user.get("user_id", ""))

@router.get("")
async def list_tournaments(status: Optional[str] = None):
    return await ts.get_all_tournaments(status)

@router.get("/{tid}")
async def get_tournament(tid: str):
    t = await ts.get_tournament(tid)
    if not t: raise HTTPException(404, "Not found")
    return t

@router.delete("/{tid}")
async def delete_tournament(tid: str, admin: dict = Depends(get_admin_user)):
    if await ts.delete_tournament(tid): return {"success": True}
    raise HTTPException(404, "Not found")

@router.post("/{tid}/register")
async def register(tid: str, data: dict, user: dict = Depends(get_current_user)):
    name = data.get("name", "").strip()
    if not name: raise HTTPException(400, "name required")
    try: return await ts.register_by_name(tid, name)
    except ValueError as e: raise HTTPException(400, str(e))

@router.delete("/{tid}/register/{player_id}")
async def unregister(tid: str, player_id: str, user: dict = Depends(get_current_user)):
    if await ts.remove_participant(tid, player_id): return {"success": True}
    raise HTTPException(404, "Not found")

@router.post("/{tid}/seed")
async def seed(tid: str, data: dict = Body(default=None), user: dict = Depends(get_current_user)):
    data = data or {}
    if not user.get("is_admin") and user.get("role") not in ["admin", "moderator"]: raise HTTPException(403)
    league_id = data.get("league_id")
    if league_id: return await ts.seed_from_league(tid, league_id)
    return await ts.apply_seeding(tid, data.get("order"))

@router.post("/{tid}/generate")
async def generate(tid: str, user: dict = Depends(get_current_user)):
    if not user.get("is_admin") and user.get("role") not in ["admin", "moderator"]: raise HTTPException(403)
    try: return await ts.generate_brackets(tid)
    except ValueError as e: raise HTTPException(400, str(e))

@router.post("/{tid}/matches/{match_id}/result")
async def report_result(tid: str, match_id: str, data: dict, user: dict = Depends(get_current_user)):
    winner_id = data.get("winner_id")
    if not winner_id: raise HTTPException(400, "winner_id required")
    try: return await ts.report_match_result(tid, match_id, winner_id, data.get("score", ""))
    except ValueError as e: raise HTTPException(400, str(e))

@router.put("/{tid}/status")
async def update_status(tid: str, data: dict, admin: dict = Depends(get_admin_user)):
    from core.database import db
    status = data.get("status")
    if status not in ["registration", "seeding", "in_progress", "finished", "cancelled"]: raise HTTPException(400)
    await db[ts.C_TOURNAMENTS].update_one({"tournament_id": tid}, {"$set": {"status": status}})
    return {"success": True}
