"""
ChiPi Tutor — Phase 2 Services
Worksheet generator, club schedule, session tracker, school reader
"""
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from core.database import db

logger = logging.getLogger("tutor.phase2")

C_STUDENTS = "tutor_students"
C_AGENTS = "tutor_agents"
C_WORKSHEETS = "tutor_worksheets"
C_SCHEDULE = "tutor_schedule"
C_SESSIONS = "tutor_sessions"
C_SCHOOL_FEED = "tutor_school_feed"


# ═══ WORKSHEET / QUIZ GENERATOR ═══

async def generate_worksheet(student_id: str, subject: str, topic: str, ws_type: str = "worksheet", difficulty: str = "adaptive") -> dict:
    """Generate a worksheet or quiz using AI, tailored to the student."""
    student = await db[C_STUDENTS].find_one({"student_id": student_id, "status": "active"}, {"_id": 0})
    if not student:
        raise ValueError("Student not found")
    
    agent = await db[C_AGENTS].find_one({"student_id": student_id}, {"_id": 0})
    learning_style = agent.get("learning_style", "visual") if agent else "visual"
    weaknesses = agent.get("weaknesses", []) if agent else []
    grade = student.get("grade", "")
    
    type_instructions = {
        "worksheet": f"Create a practice worksheet with 10 questions on {topic} for grade {grade}. Include a mix of easy (4), medium (4), and hard (2) questions. Add diagrams or visual elements if the student learns visually.",
        "quiz": f"Create a quick 5-question quiz on {topic} for grade {grade}. Multiple choice format. Include answer key at the end.",
        "study_guide": f"Create a one-page study guide summarizing the key concepts of {topic} for grade {grade}. Use bullet points, examples, and a mini practice section.",
        "flash_cards": f"Create 10 flash cards for {topic} for grade {grade}. Format: Term | Definition/Answer. Focus on key vocabulary and concepts.",
    }
    
    prompt = f"""You are creating educational material for a student.

Student: {student['name']}, Grade: {grade}
Subject: {subject}
Topic: {topic}
Learning Style: {learning_style}
Known Weaknesses: {', '.join(weaknesses) if weaknesses else 'None identified yet'}
Difficulty: {difficulty}

{type_instructions.get(ws_type, type_instructions['worksheet'])}

Format the output clearly with headers, numbered questions, and clear instructions. Use markdown formatting."""

    from .services import _ai_chat
    content = await _ai_chat("You are an expert education content creator.", prompt)
    
    now = datetime.now(timezone.utc).isoformat()
    worksheet = {
        "worksheet_id": f"ws_{uuid.uuid4().hex[:10]}",
        "student_id": student_id,
        "subject": subject,
        "topic": topic,
        "type": ws_type,
        "difficulty": difficulty,
        "content": content,
        "status": "generated",  # generated | assigned | completed | reviewed
        "score": None,
        "tutor_notes": "",
        "created_at": now,
    }
    await db[C_WORKSHEETS].insert_one(worksheet)
    worksheet.pop("_id", None)
    
    # Save to Monday.com if student has a board
    if student.get("monday_board_id"):
        try:
            from modules.integrations.monday.core_client import monday_client
            await monday_client.create_update(
                student.get("monday_item_id", ""),
                f"📝 AI Worksheet Generated: {subject} - {topic} ({ws_type})\n\n{content[:500]}..."
            )
        except Exception as e:
            logger.warning(f"Failed to save worksheet to Monday: {e}")
    
    logger.info(f"Worksheet generated: {worksheet['worksheet_id']} for {student['name']} ({subject}/{topic})")
    return worksheet


async def get_worksheets(student_id: str, limit: int = 20) -> List[dict]:
    return await db[C_WORKSHEETS].find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


async def update_worksheet(worksheet_id: str, data: dict) -> dict:
    await db[C_WORKSHEETS].update_one({"worksheet_id": worksheet_id}, {"$set": data})
    return await db[C_WORKSHEETS].find_one({"worksheet_id": worksheet_id}, {"_id": 0})


# ═══ CLUB SCHEDULE ═══

async def create_schedule_item(data: dict) -> dict:
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "schedule_id": f"sch_{uuid.uuid4().hex[:8]}",
        "student_id": data.get("student_id", ""),
        "student_name": data.get("student_name", ""),
        "date": data.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "time_start": data.get("time_start", ""),
        "time_end": data.get("time_end", ""),
        "subject": data.get("subject", ""),
        "topic": data.get("topic", ""),
        "tutor": data.get("tutor", ""),
        "type": data.get("type", "study"),  # study | free_play | exam_prep | review
        "worksheet_id": data.get("worksheet_id"),
        "status": "scheduled",  # scheduled | in_progress | completed | cancelled
        "notes": data.get("notes", ""),
        "created_at": now,
    }
    await db[C_SCHEDULE].insert_one(item)
    item.pop("_id", None)
    return item


async def get_schedule(date: str = None, student_id: str = None) -> List[dict]:
    query = {}
    if date:
        query["date"] = date
    if student_id:
        query["student_id"] = student_id
    return await db[C_SCHEDULE].find(query, {"_id": 0}).sort([("date", 1), ("time_start", 1)]).limit(50).to_list(50)


async def get_today_schedule() -> List[dict]:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await get_schedule(date=today)


async def update_schedule_item(schedule_id: str, data: dict) -> dict:
    await db[C_SCHEDULE].update_one({"schedule_id": schedule_id}, {"$set": data})
    return await db[C_SCHEDULE].find_one({"schedule_id": schedule_id}, {"_id": 0})


async def delete_schedule_item(schedule_id: str) -> bool:
    r = await db[C_SCHEDULE].delete_one({"schedule_id": schedule_id})
    return r.deleted_count > 0


# ═══ SESSION TRACKER ═══

async def start_session(schedule_id: str, tutor_name: str) -> dict:
    """Start a tutoring session — begins timer."""
    schedule = await db[C_SCHEDULE].find_one({"schedule_id": schedule_id}, {"_id": 0})
    if not schedule:
        raise ValueError("Schedule item not found")
    
    now = datetime.now(timezone.utc).isoformat()
    session = {
        "session_id": f"ses_{uuid.uuid4().hex[:8]}",
        "schedule_id": schedule_id,
        "student_id": schedule.get("student_id", ""),
        "student_name": schedule.get("student_name", ""),
        "subject": schedule.get("subject", ""),
        "topic": schedule.get("topic", ""),
        "tutor": tutor_name,
        "status": "active",
        "started_at": now,
        "ended_at": None,
        "duration_minutes": 0,
        "tutor_notes": "",
        "student_performance": "",  # poor | fair | good | excellent
        "worksheet_id": schedule.get("worksheet_id"),
        "created_at": now,
    }
    await db[C_SESSIONS].insert_one(session)
    session.pop("_id", None)
    
    # Update schedule status
    await db[C_SCHEDULE].update_one({"schedule_id": schedule_id}, {"$set": {"status": "in_progress"}})
    
    logger.info(f"Session started: {session['session_id']} — {schedule.get('student_name')} / {schedule.get('subject')}")
    return session


async def end_session(session_id: str, data: dict) -> dict:
    """End a tutoring session — stops timer, saves notes."""
    session = await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise ValueError("Session not found")
    
    now = datetime.now(timezone.utc)
    started = datetime.fromisoformat(session["started_at"].replace("Z", "+00:00"))
    duration = int((now - started).total_seconds() / 60)
    
    update = {
        "status": "completed",
        "ended_at": now.isoformat(),
        "duration_minutes": duration,
        "tutor_notes": data.get("tutor_notes", ""),
        "student_performance": data.get("student_performance", ""),
    }
    await db[C_SESSIONS].update_one({"session_id": session_id}, {"$set": update})
    
    # Update schedule status
    if session.get("schedule_id"):
        await db[C_SCHEDULE].update_one({"schedule_id": session["schedule_id"]}, {"$set": {"status": "completed"}})
    
    # Feed to agent memory
    if session.get("student_id"):
        memory_entry = {
            "date": now.isoformat(),
            "type": "session",
            "content": f"Tutoring session: {session.get('subject')} / {session.get('topic')} — {duration} min — Performance: {data.get('student_performance', 'N/A')} — Notes: {data.get('tutor_notes', 'None')}",
        }
        await db["tutor_agents"].update_one(
            {"student_id": session["student_id"]},
            {"$push": {"memory": memory_entry}}
        )
    
    session.update(update)
    logger.info(f"Session ended: {session_id} — {duration} min")
    return session


async def get_active_sessions() -> List[dict]:
    return await db[C_SESSIONS].find({"status": "active"}, {"_id": 0}).to_list(20)


async def get_session_history(student_id: str, limit: int = 20) -> List[dict]:
    return await db[C_SESSIONS].find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)


# ═══ SCHOOL FEED ═══

async def add_school_feed_item(data: dict) -> dict:
    """Add a school notification/message to the feed."""
    now = datetime.now(timezone.utc).isoformat()
    item = {
        "feed_id": f"sf_{uuid.uuid4().hex[:8]}",
        "student_id": data.get("student_id", ""),
        "source": data.get("source", "manual"),  # manual | imereb | smart_academy | ai_reader
        "type": data.get("type", "notification"),  # homework | event | alert | notification | grade
        "title": data.get("title", ""),
        "content": data.get("content", ""),
        "translated_content": data.get("translated_content"),
        "urgency": data.get("urgency", "normal"),  # low | normal | high | urgent
        "due_date": data.get("due_date"),
        "status": "new",  # new | acknowledged | action_taken | archived
        "notify_parent": data.get("notify_parent", False),
        "created_at": now,
    }
    await db[C_SCHOOL_FEED].insert_one(item)
    item.pop("_id", None)
    
    # Auto-translate if urgent and parent needs different language
    if item["notify_parent"]:
        student = await db[C_STUDENTS].find_one({"student_id": data.get("student_id")}, {"_id": 0})
        if student and student.get("parent", {}).get("language") != "es":
            try:
                from .services import _ai_chat
                lang = student["parent"]["language"]
                lang_name = {"zh": "Chinese", "en": "English"}.get(lang, lang)
                translated = await _ai_chat(
                    f"Translate the following school notification to {lang_name}. Keep it professional and clear.",
                    item["content"]
                )
                item["translated_content"] = translated
                await db[C_SCHOOL_FEED].update_one({"feed_id": item["feed_id"]}, {"$set": {"translated_content": translated}})
            except Exception as e:
                logger.warning(f"Translation failed: {e}")
    
    return item


async def get_school_feed(student_id: str = None, status: str = None, limit: int = 30) -> List[dict]:
    query = {}
    if student_id:
        query["student_id"] = student_id
    if status:
        query["status"] = status
    return await db[C_SCHOOL_FEED].find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
