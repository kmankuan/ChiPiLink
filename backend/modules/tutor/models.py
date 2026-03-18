"""
ChiPi Tutor — Data Models & Collections
Student profiles, agent configs, knowledge sources, sessions
"""
from datetime import datetime, timezone

# MongoDB Collections
C_STUDENTS = "tutor_students"
C_AGENTS = "tutor_agents"
C_KNOWLEDGE = "tutor_knowledge"
C_SESSIONS = "tutor_sessions"
C_BOARD_MAPS = "tutor_board_mappings"
C_TEMPLATES = "tutor_prompt_templates"
C_WORKSHEETS = "tutor_worksheets"
C_SCHOOL_FEED = "tutor_school_feed"


def new_student(data: dict) -> dict:
    """Create a student document."""
    import uuid
    now = datetime.now(timezone.utc).isoformat()
    return {
        "student_id": f"stu_{uuid.uuid4().hex[:10]}",
        "name": data.get("name", ""),
        "grade": data.get("grade", ""),
        "school": data.get("school", ""),
        "school_platform": data.get("school_platform", ""),  # imereb | smart_academy | other
        "school_credentials": data.get("school_credentials"),  # encrypted later
        "parent": {
            "name": data.get("parent_name", ""),
            "language": data.get("parent_language", "zh"),  # zh | en | es
            "phone": data.get("parent_phone", ""),
            "user_id": data.get("parent_user_id"),  # linked ChiPi user
        },
        "monday_board_id": data.get("monday_board_id", ""),
        "monday_item_id": data.get("monday_item_id", ""),  # student's item on inscription board
        "membership_type": data.get("membership_type", "tutoring"),  # tutoring | sports_only
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }


def new_agent_config(student_id: str, data: dict = None) -> dict:
    """Create an agent config for a student."""
    now = datetime.now(timezone.utc).isoformat()
    d = data or {}
    return {
        "student_id": student_id,
        "system_prompt_auto": "",  # Auto-built from all knowledge sources
        "system_prompt_custom": d.get("custom_prompt", ""),  # Admin's manual additions
        "modes": {
            "staff_assistant": True,
            "student_tutor": True,
            "parent_translator": True,
            "quiz_generator": True,
            "worksheet_creator": True,
            "conversation_partner": False,
        },
        "personality": d.get("personality", "friendly_encouraging"),
        "difficulty": d.get("difficulty", "adaptive"),
        "interests": d.get("interests", []),
        "learning_style": d.get("learning_style", "visual"),  # visual | reading | hands_on | auditory
        "strengths": d.get("strengths", []),
        "weaknesses": d.get("weaknesses", []),
        "memory": [],  # Agent memory items [{date, type, content}]
        "knowledge_sources": {
            "monday_board": True,
            "urls": [],
            "chat_history": True,
            "telegram": [],
            "manual_notes": [],
        },
        "total_knowledge_items": 0,
        "prompt_tokens": 0,
        "last_rebuilt": None,
        "created_at": now,
        "updated_at": now,
    }


def new_board_mapping(data: dict) -> dict:
    """Create a Monday.com board column mapping."""
    import uuid
    now = datetime.now(timezone.utc).isoformat()
    return {
        "mapping_id": f"map_{uuid.uuid4().hex[:8]}",
        "board_id": data.get("board_id", ""),
        "board_name": data.get("board_name", ""),
        "board_type": data.get("board_type", "student"),  # student | tasks | intake
        "column_map": data.get("column_map", {}),
        # Example column_map:
        # {
        #   "student_name": "text_mm026sg3",
        #   "grade": "color_mm02xhw1",
        #   "school": "text_mm0f3...",
        #   "parent_name": "text_mm0...",
        #   "parent_phone": "phone_mm0...",
        #   "status": "status",
        # }
        "subitem_map": data.get("subitem_map", {}),
        # Example: {"task_name": "name", "due_date": "date_col", "subject": "dropdown_col"}
        "updates_config": {
            "feed_to_agent": data.get("updates_feed_agent", True),
            "types": ["session_notes", "school_messages", "staff_observations"],
        },
        "created_at": now,
    }
