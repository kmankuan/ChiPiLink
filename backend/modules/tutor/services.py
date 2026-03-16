"""
ChiPi Tutor — Core Services
Student CRUD, agent management, knowledge processing, prompt building
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from core.database import db
from .models import *

logger = logging.getLogger("tutor")


# ═══ STUDENT CRUD ═══

async def create_student(data: dict) -> dict:
    student = new_student(data)
    agent = new_agent_config(student["student_id"], data)
    await db[C_STUDENTS].insert_one(student)
    await db[C_AGENTS].insert_one(agent)
    student.pop("_id", None)
    logger.info(f"Student created: {student['student_id']} ({student['name']})")
    return student


async def get_student(student_id: str) -> Optional[dict]:
    return await db[C_STUDENTS].find_one({"student_id": student_id, "status": "active"}, {"_id": 0})


async def get_all_students() -> List[dict]:
    return await db[C_STUDENTS].find({"status": "active"}, {"_id": 0}).sort("name", 1).to_list(200)


async def update_student(student_id: str, data: dict) -> dict:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[C_STUDENTS].update_one({"student_id": student_id}, {"$set": data})
    return await get_student(student_id)


async def delete_student(student_id: str) -> bool:
    r = await db[C_STUDENTS].update_one({"student_id": student_id}, {"$set": {"status": "inactive"}})
    return r.modified_count > 0


# ═══ BOARD MAPPER ═══

async def save_board_mapping(data: dict) -> dict:
    mapping = new_board_mapping(data)
    await db[C_BOARD_MAPS].update_one(
        {"board_id": mapping["board_id"], "board_type": mapping["board_type"]},
        {"$set": mapping}, upsert=True
    )
    return mapping


async def get_board_mappings() -> List[dict]:
    return await db[C_BOARD_MAPS].find({}, {"_id": 0}).to_list(20)


async def get_board_mapping(board_id: str) -> Optional[dict]:
    return await db[C_BOARD_MAPS].find_one({"board_id": board_id}, {"_id": 0})


async def sync_students_from_monday(board_id: str) -> dict:
    """Read Monday.com board and sync students to tutor module."""
    from modules.integrations.monday.core_client import monday_client
    mapping = await get_board_mapping(board_id)
    if not mapping:
        raise ValueError("Board mapping not configured")
    
    col_map = mapping.get("column_map", {})
    items = await monday_client.get_board_items(board_id, limit=200)
    
    synced = 0
    for item in items:
        cols = {c["id"]: c.get("text", "") for c in item.get("column_values", [])}
        
        name = cols.get(col_map.get("student_name", ""), "") or item.get("name", "")
        if not name:
            continue
        
        # Check if student already exists
        existing = await db[C_STUDENTS].find_one({"monday_item_id": str(item["id"]), "status": "active"}, {"_id": 0})
        if existing:
            continue
        
        student_data = {
            "name": name,
            "grade": cols.get(col_map.get("grade", ""), ""),
            "school": cols.get(col_map.get("school", ""), ""),
            "parent_name": cols.get(col_map.get("parent_name", ""), ""),
            "parent_phone": cols.get(col_map.get("parent_phone", ""), ""),
            "parent_language": cols.get(col_map.get("parent_language", ""), "zh"),
            "monday_board_id": board_id,
            "monday_item_id": str(item["id"]),
        }
        await create_student(student_data)
        synced += 1
    
    return {"synced": synced, "total_items": len(items)}


# ═══ AGENT CONFIG ═══

async def get_agent_config(student_id: str) -> Optional[dict]:
    return await db[C_AGENTS].find_one({"student_id": student_id}, {"_id": 0})


async def update_agent_config(student_id: str, data: dict) -> dict:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db[C_AGENTS].update_one({"student_id": student_id}, {"$set": data})
    return await get_agent_config(student_id)


# ═══ KNOWLEDGE SOURCES ═══

async def add_knowledge_url(student_id: str, url: str) -> dict:
    """Add a URL as knowledge source. AI will read and extract content."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url)
            raw_text = r.text[:10000]  # Limit to 10K chars
    except Exception as e:
        return {"error": f"Failed to fetch URL: {e}"}
    
    # Use AI to summarize
    summary = await _ai_summarize(raw_text, f"Summarize this page content for a student tutor agent. Extract key educational information.")
    
    knowledge = {
        "knowledge_id": f"kn_{uuid.uuid4().hex[:8]}",
        "student_id": student_id,
        "source_type": "url",
        "source": url,
        "content": summary,
        "raw_length": len(raw_text),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[C_KNOWLEDGE].insert_one(knowledge)
    knowledge.pop("_id", None)
    
    # Update agent knowledge sources
    await db[C_AGENTS].update_one(
        {"student_id": student_id},
        {"$push": {"knowledge_sources.urls": url}, "$inc": {"total_knowledge_items": 1}}
    )
    return knowledge


async def add_manual_note(student_id: str, note: str) -> dict:
    """Add a manual knowledge note."""
    knowledge = {
        "knowledge_id": f"kn_{uuid.uuid4().hex[:8]}",
        "student_id": student_id,
        "source_type": "manual",
        "source": "admin",
        "content": note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[C_KNOWLEDGE].insert_one(knowledge)
    knowledge.pop("_id", None)
    await db[C_AGENTS].update_one(
        {"student_id": student_id},
        {"$push": {"knowledge_sources.manual_notes": note}, "$inc": {"total_knowledge_items": 1}}
    )
    return knowledge


async def get_knowledge(student_id: str) -> List[dict]:
    return await db[C_KNOWLEDGE].find({"student_id": student_id}, {"_id": 0}).sort("created_at", -1).to_list(100)


# ═══ AGENT PROMPT BUILDER ═══

async def rebuild_agent_prompt(student_id: str) -> dict:
    """Rebuild the agent's system prompt from ALL knowledge sources."""
    student = await get_student(student_id)
    if not student:
        raise ValueError("Student not found")
    
    agent = await get_agent_config(student_id)
    if not agent:
        raise ValueError("Agent config not found")
    
    # Gather all knowledge
    knowledge_items = await get_knowledge(student_id)
    
    # Gather Monday.com data
    monday_context = ""
    if student.get("monday_board_id"):
        try:
            monday_context = await _read_monday_student_data(student)
        except Exception as e:
            monday_context = f"(Monday.com data unavailable: {e})"
    
    # Build the auto prompt
    sections = []
    sections.append(f"""STUDENT PROFILE:
Name: {student['name']}
Grade: {student['grade']}
School: {student['school']} (Platform: {student.get('school_platform', 'unknown')})
Parent: {student['parent']['name']} (Language: {student['parent']['language']})
Learning Style: {agent.get('learning_style', 'visual')}
Strengths: {', '.join(agent.get('strengths', [])) or 'Not yet identified'}
Weaknesses: {', '.join(agent.get('weaknesses', [])) or 'Not yet identified'}
Interests: {', '.join(agent.get('interests', [])) or 'Not specified'}""")
    
    if monday_context:
        sections.append(f"MONDAY.COM DATA (current assignments, tasks, grades):\n{monday_context}")
    
    # Knowledge items
    for k in knowledge_items[-20:]:  # Last 20 items
        sections.append(f"[{k['source_type'].upper()} - {k.get('source', '')}]: {k['content'][:500]}")
    
    # Custom prompt
    if agent.get("system_prompt_custom"):
        sections.append(f"CUSTOM INSTRUCTIONS:\n{agent['system_prompt_custom']}")
    
    # Agent memory
    for m in (agent.get("memory") or [])[-10:]:
        sections.append(f"[MEMORY {m.get('date', '')}]: {m.get('content', '')}")
    
    auto_prompt = f"""You are {student['name']}'s personal AI tutor assistant for the ChiPi Tutoring Club.

You help THREE types of users:
1. STAFF: Advise tutors on what to teach, prepare materials, track progress
2. STUDENT: Be a friendly tutor, explain concepts, run quizzes, encourage
3. PARENT: Translate school info when needed ({student['parent']['language']}), summarize progress, notify about events

Always adapt your language to who you're talking to. Be encouraging with the student. Be professional with staff. Be clear and caring with parents.

{chr(10).join(sections)}"""
    
    token_estimate = len(auto_prompt.split()) * 1.3  # Rough token estimate
    
    await db[C_AGENTS].update_one(
        {"student_id": student_id},
        {"$set": {
            "system_prompt_auto": auto_prompt,
            "prompt_tokens": int(token_estimate),
            "last_rebuilt": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    return {"student_id": student_id, "prompt_tokens": int(token_estimate), "knowledge_items": len(knowledge_items)}


# ═══ AGENT CHAT ═══

async def chat_with_agent(student_id: str, message: str, mode: str = "staff", user_name: str = "Staff") -> dict:
    """Chat with a student's AI agent."""
    agent = await get_agent_config(student_id)
    if not agent:
        raise ValueError("Agent not configured")
    
    system_prompt = agent.get("system_prompt_auto", "")
    if not system_prompt:
        # Auto-build if empty
        await rebuild_agent_prompt(student_id)
        agent = await get_agent_config(student_id)
        system_prompt = agent.get("system_prompt_auto", "You are a helpful tutor assistant.")
    
    # Add mode context
    mode_context = {
        "staff": f"The user is a STAFF MEMBER named {user_name}. Advise them on how to help the student. Be professional and data-driven.",
        "student": f"The user is the STUDENT themselves. Be friendly, encouraging, use simple language. Make learning fun.",
        "parent": f"The user is the student's PARENT. Communicate in {agent.get('parent_language', 'preferred language')} when appropriate. Be respectful and informative.",
    }
    
    full_prompt = f"{system_prompt}\n\nCURRENT MODE: {mode_context.get(mode, mode_context['staff'])}"
    
    # Call AI
    response = await _ai_chat(full_prompt, message)
    
    # Save to agent memory
    await db[C_AGENTS].update_one(
        {"student_id": student_id},
        {"$push": {"memory": {
            "date": datetime.now(timezone.utc).isoformat(),
            "type": f"chat_{mode}",
            "content": f"{user_name}: {message[:200]} -> Agent: {response[:200]}",
        }}}
    )
    
    # Save session
    await db[C_SESSIONS].insert_one({
        "student_id": student_id,
        "mode": mode,
        "user_name": user_name,
        "message": message,
        "response": response,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    
    return {"response": response, "mode": mode}


# ═══ PROMPT TEMPLATES ═══

async def get_templates() -> List[dict]:
    return await db[C_TEMPLATES].find({}, {"_id": 0}).to_list(50)


async def save_template(data: dict) -> dict:
    template = {
        "template_id": data.get("template_id") or f"tpl_{uuid.uuid4().hex[:8]}",
        "name": data["name"],
        "description": data.get("description", ""),
        "prompt": data["prompt"],
        "category": data.get("category", "general"),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[C_TEMPLATES].update_one({"template_id": template["template_id"]}, {"$set": template}, upsert=True)
    return template


async def seed_default_templates():
    """Create default prompt templates if none exist."""
    count = await db[C_TEMPLATES].count_documents({})
    if count > 0:
        return
    
    defaults = [
        {"name": "General Student", "category": "general", "description": "Basic monitoring + notifications",
         "prompt": "Focus on balanced support across all subjects. Monitor homework completion and grades. Translate school notifications to parent's language when needed."},
        {"name": "Math Struggling", "category": "academic", "description": "Extra Math support with visual aids",
         "prompt": "This student struggles with Math. Generate worksheets with diagrams and visual explanations. Use real-world examples (food, sports). Keep Math sessions shorter but more frequent. Celebrate small wins."},
        {"name": "English Learner", "category": "language", "description": "English language development",
         "prompt": "This student is developing English skills. Focus on vocabulary building, reading comprehension, and pronunciation. Use bilingual examples. Practice conversations in English."},
        {"name": "High Achiever", "category": "academic", "description": "Advanced material and challenges",
         "prompt": "This student excels academically. Provide advanced material beyond grade level. Challenge with competition-style problems. Encourage leadership and peer tutoring."},
        {"name": "Behavior Support", "category": "behavioral", "description": "Monitor behavior closely",
         "prompt": "This student needs behavioral support. Monitor teacher comments closely. Report behavior issues to parent sensitively. Focus on positive reinforcement. Short, engaging sessions."},
    ]
    for d in defaults:
        await save_template(d)
    logger.info(f"Seeded {len(defaults)} default prompt templates")


# ═══ AI HELPERS ═══

async def _ai_chat(system_prompt: str, user_message: str) -> str:
    """Call AI for chat response using Emergent LLM key."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import os, uuid
        key = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-b97C7D44b98C31a073")
        session_id = f"tutor_{uuid.uuid4().hex[:8]}"
        llm = LlmChat(api_key=key, session_id=session_id, system_message=system_prompt)
        response = await llm.send_message(UserMessage(text=user_message))
        return response
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        return f"AI temporarily unavailable. ({str(e)[:80]})"


async def _ai_chat_fallback(system_prompt: str, user_message: str) -> str:
    """Fallback AI call via httpx."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {_get_ai_key()}", "Content-Type": "application/json"},
                json={"model": "gpt-4o-mini", "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ], "max_tokens": 1000},
            )
            data = r.json()
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"AI temporarily unavailable: {e}"


async def _ai_summarize(text: str, instruction: str) -> str:
    return await _ai_chat(instruction, text[:5000])


async def _read_monday_student_data(student: dict) -> str:
    """Read student's Monday.com board and format for agent context."""
    from modules.integrations.monday.core_client import monday_client
    board_id = student.get("monday_board_id")
    if not board_id:
        return ""
    
    try:
        items = await monday_client.get_board_items(board_id, limit=30, include_subitems=True)
        lines = []
        for item in items[:20]:
            cols = {c["id"]: c.get("text", "") for c in item.get("column_values", [])}
            col_text = " | ".join(f"{v}" for v in cols.values() if v)
            lines.append(f"- {item['name']}: {col_text}")
            for si in (item.get("subitems") or [])[:5]:
                si_cols = {c["id"]: c.get("text", "") for c in si.get("column_values", [])}
                si_text = " | ".join(f"{v}" for v in si_cols.values() if v)
                lines.append(f"  └─ {si['name']}: {si_text}")
        return "\n".join(lines[:50])
    except Exception as e:
        return f"(Error reading Monday.com: {e})"


def _get_ai_key():
    import os
    return os.environ.get("EMERGENT_LLM_KEY", "") or os.environ.get("OPENAI_API_KEY", "")
