"""
ChiPi Tutor — Phase 2 Routes
Worksheets, schedule, sessions, school feed
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from core.auth import get_current_user, get_admin_user
from . import services_phase2 as svc2
import logging

logger = logging.getLogger("tutor.routes2")
router = APIRouter(prefix="/tutor", tags=["Tutor Phase 2"])


# ═══ WORKSHEETS ═══

@router.post("/students/{student_id}/worksheets")
async def generate_worksheet(student_id: str, data: dict, user: dict = Depends(get_current_user)):
    subject = data.get("subject", "")
    topic = data.get("topic", "")
    ws_type = data.get("type", "worksheet")  # worksheet | quiz | study_guide | flash_cards
    difficulty = data.get("difficulty", "adaptive")
    if not subject or not topic: raise HTTPException(400, "subject and topic required")
    try:
        return await svc2.generate_worksheet(student_id, subject, topic, ws_type, difficulty)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/students/{student_id}/worksheets")
async def list_worksheets(student_id: str, user: dict = Depends(get_current_user)):
    return await svc2.get_worksheets(student_id)

@router.put("/worksheets/{worksheet_id}")
async def update_worksheet(worksheet_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await svc2.update_worksheet(worksheet_id, data)


# ═══ SCHEDULE ═══

@router.get("/schedule")
async def get_schedule(date: str = None, student_id: str = None, user: dict = Depends(get_current_user)):
    return await svc2.get_schedule(date, student_id)

@router.get("/schedule/today")
async def get_today(user: dict = Depends(get_current_user)):
    return await svc2.get_today_schedule()

@router.post("/schedule")
async def create_schedule(data: dict, user: dict = Depends(get_current_user)):
    return await svc2.create_schedule_item(data)

@router.put("/schedule/{schedule_id}")
async def update_schedule(schedule_id: str, data: dict, user: dict = Depends(get_current_user)):
    return await svc2.update_schedule_item(schedule_id, data)

@router.delete("/schedule/{schedule_id}")
async def delete_schedule(schedule_id: str, user: dict = Depends(get_current_user)):
    if await svc2.delete_schedule_item(schedule_id): return {"success": True}
    raise HTTPException(404)


# ═══ SESSIONS ═══

@router.post("/sessions/start/{schedule_id}")
async def start_session(schedule_id: str, data: dict = {}, user: dict = Depends(get_current_user)):
    tutor_name = data.get("tutor_name", user.get("name", "Tutor"))
    try:
        return await svc2.start_session(schedule_id, tutor_name)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.post("/sessions/{session_id}/end")
async def end_session(session_id: str, data: dict, user: dict = Depends(get_current_user)):
    try:
        return await svc2.end_session(session_id, data)
    except ValueError as e:
        raise HTTPException(400, str(e))

@router.get("/sessions/active")
async def active_sessions(user: dict = Depends(get_current_user)):
    return await svc2.get_active_sessions()

@router.get("/students/{student_id}/sessions")
async def student_sessions(student_id: str, user: dict = Depends(get_current_user)):
    return await svc2.get_session_history(student_id)


# ═══ SCHOOL FEED ═══


# ═══ SCHOOL READER ═══

@router.post("/students/{student_id}/read-school")
async def read_school(student_id: str, data: Optional[dict] = None, user: dict = Depends(get_current_user)):
    """Trigger school platform read for a student. Optionally pass credentials."""
    data = data or {}
    from .school_reader import school_reader
    try:
        result = await school_reader.read_platform(student_id, data.get("credentials"))
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/students/{student_id}/test-school-login")
async def test_school_login(student_id: str, data: Optional[dict] = None, user: dict = Depends(get_current_user)):
    """Test school platform login without extracting content. Returns success/fail + screenshot."""
    data = data or {}
    from .school_reader import school_reader
    try:
        result = await school_reader.test_login(student_id, data.get("credentials"))
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/scan-all-students")
async def scan_all_students(admin: dict = Depends(get_admin_user)):
    """Scan ALL active students' school platforms. Extracts content + pushes to Monday.com."""
    from .school_reader import school_reader
    students = await db["tutor_students"].find(
        {"status": "active", "school_platform": {"$exists": True, "$ne": ""}},
        {"_id": 0, "student_id": 1, "name": 1, "school_platform": 1}
    ).to_list(100)
    
    results = {"scanned": 0, "items_found": 0, "errors": [], "students": []}
    for s in students:
        try:
            r = await school_reader.read_platform(s["student_id"])
            results["scanned"] += 1
            results["items_found"] += len(r.get("items", []))
            results["students"].append({"name": s["name"], "items": len(r.get("items", [])), "errors": r.get("errors", [])})
        except Exception as e:
            results["errors"].append(f"{s['name']}: {str(e)[:100]}")
    
    return results


@router.post("/read-url")
async def read_url(data: dict, user: dict = Depends(get_current_user)):
    """Read any URL with AI vision and extract educational content."""
    from .school_reader import school_reader
    url = data.get("url", "")
    student_id = data.get("student_id")
    instruction = data.get("instruction")
    if not url: raise HTTPException(400, "url required")
    return await school_reader.read_url(url, student_id, instruction)


@router.post("/school-feed")
async def add_feed_item(data: dict, user: dict = Depends(get_current_user)):
    return await svc2.add_school_feed_item(data)

@router.get("/school-feed")
async def get_feed(student_id: str = None, status: str = None, user: dict = Depends(get_current_user)):
    return await svc2.get_school_feed(student_id, status)
