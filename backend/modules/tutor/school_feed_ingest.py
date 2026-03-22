"""
School Feed Ingest API — Receives raw data from external tools (Zerowork, Activepieces)
and runs AI classification + pushes to Monday.com.

External tools handle: browser navigation, login, screenshots, text extraction
This API handles: AI classification, DB storage, Monday.com push, parent notifications

Endpoints:
- POST /ingest — Receive raw text + screenshot, classify with AI, save + push
- POST /ingest/batch — Receive multiple items at once
- GET /ingest/status/{job_id} — Check processing status
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_current_user, get_admin_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("tutor.ingest")
router = APIRouter(prefix="/tutor/school-feed", tags=["Tutor - School Feed Ingest"])

C_FEED = "tutor_school_feed"
C_STUDENTS = "tutor_students"
C_JOBS = "tutor_ingest_jobs"


@router.post("/ingest")
async def ingest_school_data(data: dict, user: dict = Depends(get_current_user)):
    """
    Receive raw school data from external tools and run AI classification.
    
    Body:
    {
        "student_id": "stu_xxx",           # Required
        "raw_text": "Page text content...", # Required — extracted by Zerowork
        "screenshot_base64": "...",         # Optional — page screenshot
        "source": "zerowork",              # Tool that extracted it
        "platform": "bseducativo.com",     # School platform
        "section": "dashboard",            # Which section was scraped
        "custom_prompt": ""                # Override AI extraction prompt
    }
    """
    student_id = data.get("student_id", "")
    raw_text = data.get("raw_text", "")
    
    if not student_id or not raw_text:
        raise HTTPException(400, "student_id and raw_text required")
    
    student = await db[C_STUDENTS].find_one({"student_id": student_id}, {"_id": 0, "name": 1})
    if not student:
        raise HTTPException(404, "Student not found")
    
    now = datetime.now(timezone.utc).isoformat()
    job_id = f"job_{uuid.uuid4().hex[:10]}"
    
    # Create job record
    job = {
        "job_id": job_id,
        "student_id": student_id,
        "student_name": student.get("name", ""),
        "source": data.get("source", "external"),
        "platform": data.get("platform", ""),
        "section": data.get("section", ""),
        "status": "processing",
        "raw_text_length": len(raw_text),
        "has_screenshot": bool(data.get("screenshot_base64")),
        "created_at": now,
    }
    await db[C_JOBS].insert_one(job)
    
    try:
        # Load AI config
        config = await db["tutor_school_feed_config"].find_one({"_id": "school_feed_config"}) or {}
        ai_instructions = config.get("ai_instructions", {})
        extraction_prompt = data.get("custom_prompt") or ai_instructions.get("extraction_prompt", "")
        
        # Run AI classification
        from modules.tutor.services import _ai_chat
        
        prompt = f"""{extraction_prompt}

STUDENT: {student.get('name', '')}
PLATFORM: {data.get('platform', '')}
SECTION: {data.get('section', '')}

RAW PAGE CONTENT:
{raw_text[:5000]}

For EACH item found, provide:
TYPE: homework | weekly_plan | alert | material_request | grade | event | message
TITLE: brief title
CONTENT: full details
DUE_DATE: YYYY-MM-DD if applicable
URGENCY: low | normal | high | urgent
SUBJECT: school subject if applicable
ACTION_REQUIRED: what tutor/parent needs to do
---"""
        
        ai_response = await _ai_chat(
            "You are a school content classifier for a tutoring club. Extract and classify educational content.",
            prompt
        )
        
        # Parse AI response into items
        items = _parse_ai_items(ai_response, student_id, data.get("source", "external"), data.get("platform", ""))
        
        # Save items to DB
        saved = 0
        for item in items:
            # Dedup check
            existing = await db[C_FEED].find_one({
                "student_id": student_id,
                "title": item.get("title", ""),
                "type": item.get("type", ""),
            })
            if not existing:
                item["feed_id"] = f"sf_{uuid.uuid4().hex[:8]}"
                item["created_at"] = now
                item["status"] = "new"
                item["job_id"] = job_id
                await db[C_FEED].insert_one(item)
                saved += 1
                
                # Push to Monday.com
                await _push_item_to_monday(item, config)
        
        # Update job
        await db[C_JOBS].update_one(
            {"job_id": job_id},
            {"$set": {"status": "completed", "items_found": len(items), "items_saved": saved, "completed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"job_id": job_id, "items_found": len(items), "items_saved": saved, "items": items}
        
    except Exception as e:
        logger.error(f"Ingest failed: {e}")
        await db[C_JOBS].update_one({"job_id": job_id}, {"$set": {"status": "failed", "error": str(e)[:200]}})
        raise HTTPException(500, f"AI processing failed: {str(e)[:200]}")


@router.post("/ingest/batch")
async def ingest_batch(data: dict, user: dict = Depends(get_current_user)):
    """Ingest multiple pages at once. Body: { "items": [{ student_id, raw_text, ... }, ...] }"""
    items = data.get("items", [])
    if not items:
        raise HTTPException(400, "items array required")
    
    results = []
    for item_data in items:
        try:
            result = await ingest_school_data(item_data, user)
            results.append({"student_id": item_data.get("student_id"), "status": "ok", **result})
        except Exception as e:
            results.append({"student_id": item_data.get("student_id"), "status": "error", "error": str(e)[:100]})
    
    return {"total": len(items), "processed": len(results), "results": results}


@router.get("/ingest/status/{job_id}")
async def get_job_status(job_id: str, user: dict = Depends(get_current_user)):
    """Check processing status of an ingest job."""
    job = await db[C_JOBS].find_one({"job_id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.get("/ingest/history")
async def get_ingest_history(student_id: str = None, limit: int = 20, admin: dict = Depends(get_admin_user)):
    """Get ingest job history."""
    query = {}
    if student_id:
        query["student_id"] = student_id
    jobs = await db[C_JOBS].find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return jobs


@router.get("/items")
async def get_feed_items(student_id: str = None, type: str = None, status: str = None, limit: int = 50, user: dict = Depends(get_current_user)):
    """Get school feed items with filters."""
    query = {}
    if student_id:
        query["student_id"] = student_id
    if type:
        query["type"] = type
    if status:
        query["status"] = status
    items = await db[C_FEED].find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return items


def _parse_ai_items(ai_text: str, student_id: str, source: str, platform: str) -> list:
    """Parse AI response into structured items."""
    items = []
    current = {}
    
    for line in ai_text.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line == "---":
            if current.get("title"):
                current["student_id"] = student_id
                current["source"] = source
                current["platform"] = platform
                items.append(current)
            current = {}
            continue
        
        for prefix in ["TYPE:", "TITLE:", "CONTENT:", "DUE_DATE:", "URGENCY:", "SUBJECT:", "ACTION_REQUIRED:"]:
            if line.upper().startswith(prefix):
                key = prefix.replace(":", "").lower()
                current[key] = line[len(prefix):].strip()
                break
    
    if current.get("title"):
        current["student_id"] = student_id
        current["source"] = source
        current["platform"] = platform
        items.append(current)
    
    return items


async def _push_item_to_monday(item: dict, config: dict):
    """Push a classified feed item to Monday.com board."""
    try:
        monday_cfg = config.get("monday_board", {})
        if not monday_cfg.get("enabled") or not monday_cfg.get("board_id"):
            return
        
        from modules.integrations.monday.core_client import monday_client
        import json
        
        board_id = monday_cfg["board_id"]
        col_map = monday_cfg.get("column_map", {})
        
        col_values = {}
        if col_map.get("student_name"):
            student = await db[C_STUDENTS].find_one({"student_id": item.get("student_id")}, {"name": 1})
            col_values[col_map["student_name"]] = student.get("name", "") if student else ""
        if col_map.get("feed_date"):
            col_values[col_map["feed_date"]] = {"date": item.get("created_at", "")[:10]}
        if col_map.get("feed_type"):
            col_values[col_map["feed_type"]] = {"label": (item.get("type", "notification")).replace("_", " ").title()}
        if col_map.get("subject"):
            col_values[col_map["subject"]] = item.get("subject", "")
        if col_map.get("content"):
            col_values[col_map["content"]] = {"text": item.get("content", "")[:2000]}
        if col_map.get("urgency"):
            col_values[col_map["urgency"]] = {"label": (item.get("urgency", "normal")).title()}
        if col_map.get("due_date") and item.get("due_date"):
            col_values[col_map["due_date"]] = {"date": item["due_date"][:10]}
        if col_map.get("action_required"):
            col_values[col_map["action_required"]] = item.get("action_required", "")
        if col_map.get("source"):
            col_values[col_map["source"]] = item.get("source", "")
        if col_map.get("feed_status"):
            col_values[col_map["feed_status"]] = {"label": "New"}
        
        title = item.get("title", "School Feed Item")[:100]
        await monday_client.create_item(board_id, title, json.dumps(col_values))
        logger.info(f"Pushed to Monday: {title}")
    except Exception as e:
        logger.warning(f"Monday push failed (non-critical): {e}")
