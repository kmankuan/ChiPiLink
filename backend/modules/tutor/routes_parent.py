"""
ChiPi Tutor — Parent Portal Routes
Parent-facing endpoints: progress view, school feed, worksheets, chat, notifications
Parent authenticates via LaoPan OAuth (get_current_user), then accesses their linked student.
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from core.auth import get_current_user
from core.database import db
from .models import C_STUDENTS, C_AGENTS, C_WORKSHEETS, C_SCHOOL_FEED, C_SESSIONS
from datetime import datetime, timezone
import logging

logger = logging.getLogger("tutor.parent")
router = APIRouter(prefix="/tutor/parent", tags=["Tutor Parent Portal"])

C_PARENT_MESSAGES = "tutor_parent_messages"
C_PARENT_NOTIFICATIONS = "tutor_parent_notifications"


async def _get_parent_student(user: dict) -> dict:
    """Find the student linked to this parent's account."""
    user_id = user.get("user_id", "")
    # Check by linked parent user_id
    student = await db[C_STUDENTS].find_one(
        {"parent.user_id": user_id, "status": "active"}, {"_id": 0}
    )
    if student:
        return student
    # Check by email match
    email = user.get("email", "")
    if email:
        student = await db[C_STUDENTS].find_one(
            {"parent.email": email, "status": "active"}, {"_id": 0}
        )
    if not student:
        # Check by phone
        phone = user.get("phone", "")
        if phone:
            student = await db[C_STUDENTS].find_one(
                {"parent.phone": phone, "status": "active"}, {"_id": 0}
            )
    return student


# ═══ PARENT DASHBOARD ═══

@router.get("/dashboard")
async def parent_dashboard(user: dict = Depends(get_current_user)):
    """Parent's main view — child's overview."""
    student = await _get_parent_student(user)
    if not student:
        return {"linked": False, "message": "No student linked to your account. Contact the club to link your child."}
    
    sid = student["student_id"]
    
    # Get recent data
    recent_feed = await db[C_SCHOOL_FEED].find(
        {"student_id": sid}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    recent_worksheets = await db[C_WORKSHEETS].find(
        {"student_id": sid}, {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    recent_sessions = await db[C_SESSIONS].find(
        {"student_id": sid, "status": "completed"}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    notifications = await db[C_PARENT_NOTIFICATIONS].find(
        {"student_id": sid, "read": {"$ne": True}}, {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    # Agent config for learning profile
    agent = await db[C_AGENTS].find_one({"student_id": sid}, {"_id": 0, "learning_style": 1, "strengths": 1, "weaknesses": 1})
    
    # Session stats
    total_sessions = await db[C_SESSIONS].count_documents({"student_id": sid, "status": "completed"})
    total_minutes = 0
    all_sessions = await db[C_SESSIONS].find({"student_id": sid, "status": "completed"}, {"duration_minutes": 1}).to_list(500)
    total_minutes = sum(s.get("duration_minutes", 0) for s in all_sessions)
    
    return {
        "linked": True,
        "student": {
            "name": student["name"],
            "grade": student["grade"],
            "school": student["school"],
            "student_id": sid,
        },
        "stats": {
            "total_sessions": total_sessions,
            "total_minutes": total_minutes,
            "worksheets_generated": len(recent_worksheets),
        },
        "learning_profile": agent or {},
        "school_feed": recent_feed,
        "worksheets": recent_worksheets,
        "sessions": recent_sessions,
        "notifications": notifications,
    }


# ═══ SCHOOL FEED (parent view — with translations) ═══

@router.get("/school-feed")
async def parent_school_feed(user: dict = Depends(get_current_user)):
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    
    items = await db[C_SCHOOL_FEED].find(
        {"student_id": student["student_id"], "notify_parent": True}, {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)
    
    # Return translated content if available, otherwise original
    for item in items:
        if item.get("translated_content"):
            item["display_content"] = item["translated_content"]
        else:
            item["display_content"] = item.get("content", "")
    
    return items


# ═══ WORKSHEETS (parent view) ═══

@router.get("/worksheets")
async def parent_worksheets(user: dict = Depends(get_current_user)):
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    return await db[C_WORKSHEETS].find(
        {"student_id": student["student_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)


# ═══ SESSION HISTORY (parent view) ═══

@router.get("/sessions")
async def parent_sessions(user: dict = Depends(get_current_user)):
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    return await db[C_SESSIONS].find(
        {"student_id": student["student_id"], "status": "completed"}, {"_id": 0}
    ).sort("created_at", -1).limit(30).to_list(30)


# ═══ PARENT MESSAGES (Ably-backed chat) ═══

@router.post("/messages")
async def send_message(data: dict, user: dict = Depends(get_current_user)):
    """Parent sends a message to staff about their child."""
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    
    message = data.get("message", "").strip()
    if not message:
        raise HTTPException(400, "Message required")
    
    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "message_id": f"pm_{__import__('uuid').uuid4().hex[:8]}",
        "student_id": student["student_id"],
        "sender_type": "parent",
        "sender_id": user.get("user_id"),
        "sender_name": user.get("name", student.get("parent", {}).get("name", "Parent")),
        "message": message,
        "created_at": now,
    }
    await db[C_PARENT_MESSAGES].insert_one(msg)
    msg.pop("_id", None)
    
    # Publish to Ably for real-time
    try:
        from modules.ably_integration import publish_to_channel
        await publish_to_channel(
            f"tutor:parent:{student['student_id']}",
            "new_message",
            {"sender": "parent", "text": message, "name": msg["sender_name"]}
        )
    except Exception:
        pass
    
    return msg


@router.get("/messages")
async def get_messages(user: dict = Depends(get_current_user)):
    """Get message history for parent's student."""
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    return await db[C_PARENT_MESSAGES].find(
        {"student_id": student["student_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)


# ═══ NOTIFICATIONS ═══

@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    return await db[C_PARENT_NOTIFICATIONS].find(
        {"student_id": student["student_id"]}, {"_id": 0}
    ).sort("created_at", -1).limit(20).to_list(20)


@router.post("/notifications/{notif_id}/read")
async def mark_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db[C_PARENT_NOTIFICATIONS].update_one({"notif_id": notif_id}, {"$set": {"read": True}})
    return {"success": True}


# ═══ ASK AGENT (parent asks their child's AI agent) ═══

@router.post("/ask-agent")
async def ask_agent(data: dict, user: dict = Depends(get_current_user)):
    """Parent asks their child's AI agent a question."""
    student = await _get_parent_student(user)
    if not student:
        raise HTTPException(404, "No student linked")
    
    message = data.get("message", "").strip()
    if not message:
        raise HTTPException(400, "Message required")
    
    from .services import chat_with_agent
    parent_name = user.get("name", student.get("parent", {}).get("name", "Parent"))
    return await chat_with_agent(student["student_id"], message, "parent", parent_name)


# ═══ ADMIN: SEND NOTIFICATION TO PARENT ═══

@router.post("/notify/{student_id}")
async def send_notification(student_id: str, data: dict, user: dict = Depends(get_current_user)):
    """Staff sends a notification to a student's parent."""
    if not user.get("is_admin") and user.get("role") not in ["admin", "moderator"]:
        raise HTTPException(403, "Staff only")
    
    student = await db[C_STUDENTS].find_one({"student_id": student_id, "status": "active"}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    
    message = data.get("message", "")
    translate = data.get("translate", True)
    
    now = datetime.now(timezone.utc).isoformat()
    notif = {
        "notif_id": f"pn_{__import__('uuid').uuid4().hex[:8]}",
        "student_id": student_id,
        "message": message,
        "translated_message": None,
        "sent_by": user.get("user_id"),
        "read": False,
        "created_at": now,
    }
    
    # Auto-translate if needed
    parent_lang = student.get("parent", {}).get("language", "zh")
    if translate and parent_lang != "es":
        try:
            from .services import _ai_chat
            lang_name = {"zh": "Chinese", "en": "English"}.get(parent_lang, parent_lang)
            translated = await _ai_chat(
                f"Translate the following message to {lang_name}. Keep it professional and caring. This is a message from a tutoring club to a parent about their child.",
                message
            )
            notif["translated_message"] = translated
        except Exception:
            pass
    
    await db[C_PARENT_NOTIFICATIONS].insert_one(notif)
    notif.pop("_id", None)
    
    # Publish to Ably
    try:
        from modules.ably_integration import publish_to_channel
        await publish_to_channel(
            f"tutor:parent:{student_id}",
            "notification",
            {"message": notif.get("translated_message") or message, "notif_id": notif["notif_id"]}
        )
    except Exception:
        pass
    
    return notif
