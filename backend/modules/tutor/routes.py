"""
ChiPi Tutor — API Routes
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from core.auth import get_current_user, get_admin_user
from . import services
import logging

logger = logging.getLogger("tutor")
router = APIRouter(prefix="/tutor", tags=["Tutor"])


# ═══ STUDENTS ═══

@router.get("/students")
async def list_students(admin: dict = Depends(get_admin_user)):
    return await services.get_all_students()

@router.post("/students")
async def create_student(data: dict, admin: dict = Depends(get_admin_user)):
    if not data.get("name"): raise HTTPException(400, "name required")
    return await services.create_student(data)

@router.get("/students/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    s = await services.get_student(student_id)
    if not s: raise HTTPException(404, "Student not found")
    return s

@router.put("/students/{student_id}")
async def update_student(student_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    return await services.update_student(student_id, data)

@router.delete("/students/{student_id}")
async def delete_student(student_id: str, admin: dict = Depends(get_admin_user)):
    if await services.delete_student(student_id): return {"success": True}
    raise HTTPException(404)


# ═══ BOARD MAPPER ═══

@router.get("/board-mappings")
async def list_mappings(admin: dict = Depends(get_admin_user)):
    return await services.get_board_mappings()

@router.post("/board-mappings")
async def save_mapping(data: dict, admin: dict = Depends(get_admin_user)):
    if not data.get("board_id"): raise HTTPException(400, "board_id required")
    return await services.save_board_mapping(data)

@router.post("/sync-from-monday/{board_id}")
async def sync_students(board_id: str, admin: dict = Depends(get_admin_user)):
    try:
        return await services.sync_students_from_monday(board_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ═══ AGENT CONFIG ═══

@router.get("/students/{student_id}/agent")
async def get_agent(student_id: str, admin: dict = Depends(get_admin_user)):
    a = await services.get_agent_config(student_id)
    if not a: raise HTTPException(404, "Agent not configured")
    return a

@router.put("/students/{student_id}/agent")
async def update_agent(student_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    return await services.update_agent_config(student_id, data)

@router.post("/students/{student_id}/agent/rebuild")
async def rebuild_prompt(student_id: str, admin: dict = Depends(get_admin_user)):
    try:
        return await services.rebuild_agent_prompt(student_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ═══ KNOWLEDGE ═══

@router.get("/students/{student_id}/knowledge")
async def list_knowledge(student_id: str, admin: dict = Depends(get_admin_user)):
    return await services.get_knowledge(student_id)

@router.post("/students/{student_id}/knowledge/url")
async def add_url(student_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    url = data.get("url", "")
    if not url: raise HTTPException(400, "url required")
    return await services.add_knowledge_url(student_id, url)

@router.post("/students/{student_id}/knowledge/note")
async def add_note(student_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    note = data.get("note", "")
    if not note: raise HTTPException(400, "note required")
    return await services.add_manual_note(student_id, note)


# ═══ AGENT CHAT ═══

@router.post("/students/{student_id}/chat")
async def chat(student_id: str, data: dict, user: dict = Depends(get_current_user)):
    message = data.get("message", "")
    mode = data.get("mode", "staff")  # staff | student | parent
    if not message: raise HTTPException(400, "message required")
    try:
        return await services.chat_with_agent(student_id, message, mode, user.get("name", "User"))
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/students/{student_id}/chat-history")
async def chat_history(student_id: str, limit: int = 30, user: dict = Depends(get_current_user)):
    from core.database import db
    return await db[services.C_SESSIONS].find(
        {"student_id": student_id}, {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)


# ═══ TEMPLATES ═══

@router.get("/templates")
async def list_templates():
    await services.seed_default_templates()
    return await services.get_templates()

@router.post("/templates")
async def save_template(data: dict, admin: dict = Depends(get_admin_user)):
    if not data.get("name") or not data.get("prompt"): raise HTTPException(400, "name and prompt required")
    return await services.save_template(data)
