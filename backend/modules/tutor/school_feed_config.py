"""
School Feed Configuration — Admin-configurable settings for:
1. AI extraction instructions (custom per school/platform)
2. Monday.com board column mapping for school feed items
3. Classification rules and urgency thresholds
4. Auto-scan schedule settings
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_admin_user
import logging

logger = logging.getLogger("tutor.school_feed_config")
router = APIRouter(prefix="/tutor/school-feed-config", tags=["Tutor - School Feed Config"])

C_CONFIG = "tutor_school_feed_config"

DEFAULT_CONFIG = {
    "_id": "school_feed_config",
    
    # AI extraction instructions — customize what AI looks for
    "ai_instructions": {
        "extraction_prompt": """Extract ALL educational information from this school platform page. For each item found, classify it as one of these types:

- homework: assignments, tasks, projects with due dates
- weekly_plan: weekly planner, topics to study, lesson plans
- alert: urgent announcements, behavior alerts, attendance issues
- material_request: teacher asking parents to buy/bring materials
- grade: test scores, report cards, evaluations
- event: school events, meetings, parent-teacher conferences
- message: direct messages from teachers or school staff

For EACH item provide:
- type (from list above)
- title (brief, clear)
- content (full details)
- due_date (YYYY-MM-DD if applicable)
- urgency (low | normal | high | urgent)
- subject (school subject if applicable)
- action_required (what the tutor/parent needs to do)""",
        
        "summary_prompt": """Analyze the following school feed items and create a concise daily report for the tutoring staff. Highlight:
1. Urgent items that need immediate attention
2. Homework due this week with subjects and topics
3. Materials parents need to purchase
4. Weekly study topics for tutoring sessions
5. Any behavioral or attendance alerts

Write in a clear, actionable format. Use bullet points.""",
        
        "classification_rules": {
            "urgent_keywords": ["urgente", "urgent", "importante", "examen", "exam", "tomorrow", "mañana", "hoy", "today"],
            "material_keywords": ["comprar", "buy", "traer", "bring", "material", "supplies", "cuaderno", "libro"],
            "homework_keywords": ["tarea", "homework", "assignment", "proyecto", "project", "entregar", "submit"],
        }
    },
    
    # Monday.com board for school feed output
    "monday_board": {
        "enabled": False,
        "board_id": "",
        "board_name": "Tutor School Feed",
        "group_by": "student",  # student | date | type
        "column_map": {
            "student_name": "",    # Monday column ID for student name
            "date": "",            # date column
            "type": "",            # status column (Homework/Alert/Material/etc.)
            "subject": "",         # text column
            "content": "",         # long_text column
            "urgency": "",         # status column (Low/Normal/High/Urgent)
            "due_date": "",        # date column
            "status": "",          # status column (New/Reviewed/Actioned/Done)
            "action_required": "", # text column
            "source": "",          # text column (platform name)
        },
        "status_labels": {
            "type": {
                "Homework": {"color": "#fdab3d"},
                "Alert": {"color": "#e2445c"},
                "Material": {"color": "#0086c0"},
                "Weekly Plan": {"color": "#00c875"},
                "Grade": {"color": "#a25ddc"},
                "Event": {"color": "#579bfc"},
                "Message": {"color": "#cab641"},
            },
            "urgency": {
                "Low": {"color": "#c4c4c4"},
                "Normal": {"color": "#fdab3d"},
                "High": {"color": "#e2445c"},
                "Urgent": {"color": "#e2445c"},
            }
        }
    },
    
    # Auto-scan schedule
    "auto_scan": {
        "enabled": False,
        "cron": "0 6 * * 1-5",  # 6 AM Mon-Fri
        "scan_all_students": True,
        "notify_staff_after": True,
        "push_to_monday": True,
    },
    
    # Platform-specific configs (admin can add new platforms)
    "platforms": {
        "imereb": {
            "name": "iMereb",
            "login_url": "https://www.imereb.com/login",
            "selectors": {
                "username": "input[name='username'], input[type='email'], #username",
                "password": "input[name='password'], input[type='password'], #password",
                "submit": "button[type='submit'], .login-btn, #login-button",
            },
            "sections": [
                {"name": "dashboard", "nav": None, "prompt": "Extract main dashboard announcements and alerts"},
                {"name": "homework", "nav": "a[href*='tarea'], a[href*='homework']", "prompt": "Extract homework assignments with due dates and subjects"},
                {"name": "messages", "nav": "a[href*='comunicado'], a[href*='message']", "prompt": "Extract messages from teachers and school staff"},
                {"name": "grades", "nav": "a[href*='calificaci'], a[href*='grade']", "prompt": "Extract grades, test scores, and evaluations"},
                {"name": "weekly_planner", "nav": "a[href*='planner'], a[href*='agenda'], a[href*='semanal']", "prompt": "Extract weekly study plan, topics, and lesson schedule"},
            ],
        },
        "smart_academy": {
            "name": "Smart Academy (ISAE)",
            "login_url": "https://apps.smartacademy.edu.pa/isae/login1.asp",
            "selectors": {
                "username": "input[name='usuario'], input[name='user'], #txtUsuario",
                "password": "input[name='clave'], input[name='password'], #txtClave",
                "submit": "input[type='submit'], button[type='submit'], #btnLogin",
            },
            "sections": [
                {"name": "main", "nav": None, "prompt": "Extract ALL educational information: homework, events, grades, announcements, weekly planner"},
            ],
        },
    },
}


@router.get("")
async def get_config(admin: dict = Depends(get_admin_user)):
    """Get school feed configuration."""
    doc = await db[C_CONFIG].find_one({"_id": "school_feed_config"})
    if not doc or not doc.get("platforms"):
        await db[C_CONFIG].replace_one({"_id": "school_feed_config"}, DEFAULT_CONFIG, upsert=True)
        doc = DEFAULT_CONFIG
    doc.pop("_id", None)
    return doc


@router.put("")
async def update_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update school feed configuration."""
    # Merge with existing
    existing = await db[C_CONFIG].find_one({"_id": "school_feed_config"}) or DEFAULT_CONFIG
    
    for key in ["ai_instructions", "monday_board", "auto_scan", "platforms"]:
        if key in data:
            if isinstance(data[key], dict) and isinstance(existing.get(key), dict):
                existing[key].update(data[key])
            else:
                existing[key] = data[key]
    
    existing["_id"] = "school_feed_config"
    await db[C_CONFIG].replace_one({"_id": "school_feed_config"}, existing, upsert=True)
    return {"success": True}


@router.put("/ai-instructions")
async def update_ai_instructions(data: dict, admin: dict = Depends(get_admin_user)):
    """Update AI extraction/summary instructions."""
    await db[C_CONFIG].update_one(
        {"_id": "school_feed_config"},
        {"$set": {
            "ai_instructions.extraction_prompt": data.get("extraction_prompt", DEFAULT_CONFIG["ai_instructions"]["extraction_prompt"]),
            "ai_instructions.summary_prompt": data.get("summary_prompt", DEFAULT_CONFIG["ai_instructions"]["summary_prompt"]),
            "ai_instructions.classification_rules": data.get("classification_rules", DEFAULT_CONFIG["ai_instructions"]["classification_rules"]),
        }},
        upsert=True
    )
    return {"success": True}


@router.put("/monday-board")
async def update_monday_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update Monday.com board mapping for school feed."""
    update = {}
    for key in ["enabled", "board_id", "board_name", "group_by", "column_map", "status_labels"]:
        if key in data:
            update[f"monday_board.{key}"] = data[key]
    
    if update:
        await db[C_CONFIG].update_one({"_id": "school_feed_config"}, {"$set": update}, upsert=True)
    return {"success": True}


@router.put("/platform/{platform_id}")
async def update_platform(platform_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update or add a school platform configuration."""
    await db[C_CONFIG].update_one(
        {"_id": "school_feed_config"},
        {"$set": {f"platforms.{platform_id}": data}},
        upsert=True
    )
    return {"success": True}


@router.post("/reset")
async def reset_config(admin: dict = Depends(get_admin_user)):
    """Reset to defaults."""
    await db[C_CONFIG].replace_one({"_id": "school_feed_config"}, DEFAULT_CONFIG, upsert=True)
    return {"success": True, "message": "School feed config reset to defaults"}
