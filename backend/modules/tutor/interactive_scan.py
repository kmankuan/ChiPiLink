"""
Interactive School Scan — Plan B: AI does everything with admin guidance.

Flow:
1. Admin clicks "AI Scan" on student
2. AI navigates to school URL, takes screenshot
3. If AI can't proceed → saves screenshot + asks admin a question
4. Admin answers (click text, provide selector, skip, custom instruction)
5. AI executes the answer, continues to next step
6. Successful steps saved as "playbook" for this platform
7. Next scan: AI follows the playbook automatically, only asks if stuck on new step

Session states: started → navigating → waiting_admin → executing → extracting → completed | failed
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_current_user, get_admin_user
from datetime import datetime, timezone
import uuid
import base64
import logging

logger = logging.getLogger("tutor.interactive_scan")
router = APIRouter(prefix="/tutor/interactive-scan", tags=["Tutor - Interactive Scan"])

C_SESSIONS = "tutor_scan_sessions"
C_PLAYBOOKS = "tutor_scan_playbooks"
C_STUDENTS = "tutor_students"


@router.post("/start/{student_id}")
async def start_scan(student_id: str, data: dict = None, admin: dict = Depends(get_admin_user)):
    """Start an interactive AI scan session for a student."""
    data = data or {}
    student = await db[C_STUDENTS].find_one({"student_id": student_id, "status": "active"}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    
    creds = student.get("school_credentials", {})
    url = creds.get("url", "")
    if not url:
        raise HTTPException(400, "No school URL configured. Go to student Info tab → School Platform.")
    
    session_id = f"scan_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if there's an existing playbook for this platform
    domain = url.split("//")[-1].split("/")[0]
    playbook = await db[C_PLAYBOOKS].find_one({"domain": domain}, {"_id": 0})
    
    session = {
        "session_id": session_id,
        "student_id": student_id,
        "student_name": student.get("name", ""),
        "url": url,
        "domain": domain,
        "credentials": {"username": creds.get("username", ""), "has_password": bool(creds.get("password"))},
        "status": "started",
        "current_step": 0,
        "steps": [],
        "playbook_id": playbook.get("playbook_id") if playbook else None,
        "has_playbook": bool(playbook),
        "question": None,
        "screenshot": None,
        "items_found": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db[C_SESSIONS].insert_one(session)
    
    # Run first step in BACKGROUND (don't block HTTP response)
    import asyncio
    asyncio.create_task(_background_execute(session["session_id"], session))
    
    # Return immediately
    session.pop("_id", None)
    return {"session_id": session_id, "status": "started", "message": "Navigating... poll for updates."}


@router.get("/session/{session_id}")
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    """Get current scan session status, screenshot, and any pending question."""
    session = await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
    if not session:
        raise HTTPException(404, "Session not found")
    return session


@router.post("/session/{session_id}/answer")
async def answer_question(session_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Admin answers AI's question to continue the scan.
    
    Body: {
        "action": "click_text" | "click_selector" | "skip" | "type_text" | "navigate" | "extract" | "done",
        "value": "Iniciar Sesión" | ".btn-login" | "https://..." | "Extract homework from this page",
        "save_to_playbook": true  (save this step for next time)
    }
    """
    session = await db[C_SESSIONS].find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    if session["status"] != "waiting_admin":
        raise HTTPException(400, f"Session is {session['status']}, not waiting for admin")
    
    action = data.get("action", "")
    value = data.get("value", "")
    save = data.get("save_to_playbook", True)
    
    if not action:
        raise HTTPException(400, "action required")
    
    # Record the admin's answer as a step
    step = {
        "step_num": session["current_step"],
        "action": action,
        "value": value,
        "source": "admin",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    
    await db[C_SESSIONS].update_one(
        {"session_id": session_id},
        {"$push": {"steps": step}, "$set": {"status": "executing", "question": None, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Save to playbook if requested
    if save:
        domain = session.get("domain", "")
        await db[C_PLAYBOOKS].update_one(
            {"domain": domain},
            {"$push": {"steps": step}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}, "$setOnInsert": {"playbook_id": f"pb_{uuid.uuid4().hex[:8]}", "domain": domain, "created_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
    
    # Run execution in BACKGROUND (don't block the HTTP response)
    import asyncio
    asyncio.create_task(_background_execute(session_id, session))
    
    # Return immediately — frontend will poll for result
    return {"session_id": session_id, "status": "executing", "message": "Processing... poll for updates."}


@router.post("/session/{session_id}/stop")
async def stop_session(session_id: str, admin: dict = Depends(get_admin_user)):
    """Stop/abort a scan session."""
    await db[C_SESSIONS].update_one(
        {"session_id": session_id},
        {"$set": {"status": "stopped", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@router.get("/playbooks")
async def list_playbooks(admin: dict = Depends(get_admin_user)):
    """List all saved playbooks (learned automation sequences)."""
    playbooks = await db[C_PLAYBOOKS].find({}, {"_id": 0}).to_list(50)
    return playbooks


@router.delete("/playbook/{domain}")
async def delete_playbook(domain: str, admin: dict = Depends(get_admin_user)):
    """Delete a playbook (AI will need to re-learn)."""
    await db[C_PLAYBOOKS].delete_one({"domain": domain})
    return {"success": True}


@router.get("/sessions")
async def list_sessions(student_id: str = None, limit: int = 10, admin: dict = Depends(get_admin_user)):
    """List recent scan sessions."""
    query = {}
    if student_id:
        query["student_id"] = student_id
    sessions = await db[C_SESSIONS].find(query, {"_id": 0, "screenshot": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return sessions


async def _execute_next_step(session_id: str, student: dict, creds: dict, playbook: dict = None):
    """Execute the next automation step. If stuck, ask admin."""
    from .school_reader import school_reader
    
    session = await db[C_SESSIONS].find_one({"session_id": session_id})
    step_num = session.get("current_step", 0)
    
    try:
        browser = await school_reader._get_browser()
        page = await browser.new_page()
        url = session.get("url", "")
        
        # Step 0: Navigate + AUTO-LOGIN (no asking)
        if step_num == 0:
            await page.goto(url, timeout=60000, wait_until="domcontentloaded")
            await page.wait_for_timeout(3000)
            
            # Check if playbook has steps → run them
            pb_steps = (playbook or {}).get("steps", [])
            if pb_steps:
                result = await _auto_execute_playbook(page, pb_steps, creds, student, session_id)
                await page.close()
                return result
            
            # AUTO-PILOT: Try to login automatically without asking
            username = creds.get("username", "")
            password = creds.get("password", "")
            
            if username and password:
                try:
                    success, _ = await school_reader._smart_login(page, url, username, password)
                    if success:
                        # Save login steps to playbook
                        domain = session.get("domain", "")
                        await db[C_PLAYBOOKS].update_one(
                            {"domain": domain},
                            {"$set": {"steps": [{"action": "login", "value": "", "source": "auto"}], "updated_at": datetime.now(timezone.utc).isoformat()},
                             "$setOnInsert": {"playbook_id": f"pb_{uuid.uuid4().hex[:8]}", "domain": domain, "created_at": datetime.now(timezone.utc).isoformat()}},
                            upsert=True
                        )
                        
                        # Take screenshot of logged-in dashboard
                        await page.wait_for_timeout(3000)
                        screenshot = await page.screenshot(type="jpeg", quality=50)
                        screenshot_b64 = base64.b64encode(screenshot).decode()
                        page_text = await page.evaluate("() => document.body.innerText.substring(0, 500)")
                        
                        await db[C_SESSIONS].update_one(
                            {"session_id": session_id},
                            {"$set": {
                                "status": "waiting_admin",
                                "current_step": 1,
                                "screenshot": screenshot_b64,
                                "page_text": page_text[:500],
                                "steps": [{"action": "login", "value": "auto", "source": "auto", "timestamp": datetime.now(timezone.utc).isoformat()}],
                                "question": {
                                    "text": "✅ Logged in successfully! I'm inside the platform. What should I read?",
                                    "options": [
                                        {"action": "extract", "label": "📋 Read ALL content from this page", "placeholder": "homework, grades, messages, weekly planner"},
                                        {"action": "click_text", "label": "📚 Go to a specific section first", "placeholder": "e.g., Tareas, Calificaciones, Agenda"},
                                        {"action": "login", "label": "🔐 Re-login (if login failed)", "placeholder": ""},
                                        {"action": "screenshot_guide", "label": "📸 Upload screenshot with instructions", "placeholder": ""},
                                        {"action": "done", "label": "Done, stop scanning", "placeholder": ""},
                                    ],
                                },
                                "updated_at": datetime.now(timezone.utc).isoformat(),
                            }}
                        )
                        await page.close()
                        return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
                except Exception as e:
                    logger.warning(f"Auto-login failed: {e}")
            
            # Auto-login failed or no credentials — ask admin
            screenshot = await page.screenshot(type="jpeg", quality=50)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            page_text = await page.evaluate("() => document.body.innerText.substring(0, 500)")
            page_text_lower = (page_text or "").lower()
            has_login = any(w in page_text_lower for w in ["usuario", "contraseña", "password", "username", "login", "ingresar"])
            
            await db[C_SESSIONS].update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "waiting_admin",
                    "current_step": 1,
                    "screenshot": screenshot_b64,
                    "page_text": page_text[:500],
                    "question": {
                        "text": "I couldn't auto-login." + (" I see a login form." if has_login else "") + " What should I do?",
                        "options": ([{"action": "login", "label": "🔐 Login with saved credentials", "placeholder": ""}] if has_login else []) + [
                            {"action": "click_text", "label": "Click a button/link", "placeholder": "e.g., Iniciar Sesión"},
                            {"action": "screenshot_guide", "label": "📸 Upload screenshot with instructions", "placeholder": ""},
                            {"action": "navigate", "label": "Go to different URL", "placeholder": "https://..."},
                            {"action": "done", "label": "Stop", "placeholder": ""},
                        ],
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            await page.close()
            return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
        
        # Step N: Execute admin's answer
        last_step = session.get("steps", [])[-1] if session.get("steps") else None
        if not last_step:
            await page.close()
            raise HTTPException(400, "No step to execute")
        
        await page.goto(url, timeout=60000)
        await page.wait_for_timeout(2000)
        
        # Replay all previous steps to get to current state
        for prev_step in session.get("steps", [])[:-1]:
            await _execute_single_step(page, prev_step, creds)
        
        # Execute the new step
        action = last_step.get("action", "")
        value = last_step.get("value", "")
        
        if action == "done":
            await db[C_SESSIONS].update_one({"session_id": session_id}, {"$set": {"status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}})
            await page.close()
            return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
        
        await _execute_single_step(page, last_step, creds)
        
        if action == "extract":
            # Run AI extraction on current page
            screenshot = await page.screenshot(type="jpeg", quality=60)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            text = await page.evaluate("() => document.body.innerText")
            
            items = await school_reader._ai_analyze_page(screenshot_b64, text[:5000], value or "Extract all educational content")
            
            for item in items:
                item["student_id"] = student.get("student_id", "")
                item["source"] = f"interactive:{session.get('domain', '')}"
                await school_reader._save_feed_item(item)
            
            await db[C_SESSIONS].update_one(
                {"session_id": session_id},
                {"$set": {"status": "completed", "items_found": len(items), "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            await page.close()
            session = await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
            session["items"] = items
            return session
        
        # Take screenshot and ask what's next — detect login form
        await page.wait_for_timeout(2000)
        screenshot = await page.screenshot(type="jpeg", quality=50)
        screenshot_b64 = base64.b64encode(screenshot).decode()
        page_text = await page.evaluate("() => document.body.innerText.substring(0, 500)")
        
        page_text_lower = (page_text or "").lower()
        has_login_form = any(w in page_text_lower for w in ["usuario", "contraseña", "password", "username", "iniciar sesión", "login", "ingresar"])
        
        login_option = {"action": "login", "label": "🔐 Login with saved credentials", "placeholder": ""}
        base_options = [
            {"action": "click_text", "label": "Click a button/link", "placeholder": "Text to click"},
            {"action": "click_selector", "label": "Click CSS selector", "placeholder": ".class or #id"},
            {"action": "navigate", "label": "Go to URL", "placeholder": "https://..."},
            {"action": "extract", "label": "Extract data from this page", "placeholder": "What to extract"},
            {"action": "done", "label": "Done scanning", "placeholder": ""},
        ]
        options = [login_option] + base_options if has_login_form else base_options
        
        await db[C_SESSIONS].update_one(
            {"session_id": session_id},
            {"$set": {
                "status": "waiting_admin",
                "current_step": step_num + 1,
                "screenshot": screenshot_b64,
                "page_text": page_text[:500],
                "question": {
                    "text": (f"Step {step_num + 1} done." + (" I see a login form — want me to login with saved credentials?" if has_login_form else " What should I do next?")),
                    "options": options,
                },
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
        await page.close()
        return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
        
    except Exception as e:
        logger.error(f"Scan step failed: {e}")
        await db[C_SESSIONS].update_one(
            {"session_id": session_id},
            {"$set": {"status": "waiting_admin", "question": {"text": f"Error: {str(e)[:200]}. What should I do?", "options": [
                {"action": "navigate", "label": "Try a different URL", "placeholder": "https://..."},
                {"action": "done", "label": "Stop scanning", "placeholder": ""},
            ]}, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})


async def _execute_single_step(page, step: dict, creds: dict):
    """Execute one automation step on the page."""
    action = step.get("action", "")
    value = step.get("value", "")
    
    if action == "click_text":
        loc = page.locator(f"text={value}").first
        if await loc.count() > 0:
            await loc.click()
            await page.wait_for_timeout(2000)
    elif action == "click_selector":
        loc = page.locator(value).first
        if await loc.count() > 0:
            await loc.click()
            await page.wait_for_timeout(2000)
    elif action == "type_text":
        parts = value.split("|", 1)
        if len(parts) == 2:
            selector, text = parts
            # Replace placeholders
            text = text.replace("{username}", creds.get("username", "")).replace("{password}", creds.get("password", ""))
            await page.fill(selector, text)
    elif action == "navigate":
        await page.goto(value, timeout=60000)
        await page.wait_for_timeout(2000)
    elif action == "login":
        # Smart login using stored credentials
        from .school_reader import school_reader
        await school_reader._smart_login(page, page.url, creds.get("username", ""), creds.get("password", ""))
    elif action == "screenshot_guide":
        # Admin uploaded an annotated screenshot — AI will analyze it in the answer endpoint
        pass  # Handled by the answer endpoint which sends to AI vision


async def _auto_execute_playbook(page, steps: list, creds: dict, student: dict, session_id: str):
    """Execute a saved playbook automatically. After login steps, ask admin what to read."""
    from .school_reader import school_reader
    
    for i, step in enumerate(steps):
        try:
            if step.get("action") == "extract":
                screenshot = await page.screenshot(type="jpeg", quality=60)
                screenshot_b64 = base64.b64encode(screenshot).decode()
                text = await page.evaluate("() => document.body.innerText")
                items = await school_reader._ai_analyze_page(screenshot_b64, text[:5000], step.get("value", "Extract educational content"))
                for item in items:
                    item["student_id"] = student.get("student_id", "")
                    item["source"] = f"playbook:{student.get('school_credentials', {}).get('url', '')}"
                    await school_reader._save_feed_item(item)
                
                await db[C_SESSIONS].update_one(
                    {"session_id": session_id},
                    {"$set": {"status": "completed", "items_found": len(items), "current_step": i + 1, "updated_at": datetime.now(timezone.utc).isoformat()}}
                )
                return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
            else:
                await _execute_single_step(page, step, creds)
        except Exception as e:
            screenshot = await page.screenshot(type="jpeg", quality=50)
            await db[C_SESSIONS].update_one(
                {"session_id": session_id},
                {"$set": {
                    "status": "waiting_admin",
                    "current_step": i,
                    "screenshot": base64.b64encode(screenshot).decode(),
                    "question": {"text": f"Playbook step {i+1} failed: {str(e)[:100]}. What should I do?", "options": [
                        {"action": "login", "label": "🔐 Login with saved credentials", "placeholder": ""},
                        {"action": "click_text", "label": "Click text", "placeholder": ""},
                        {"action": "skip", "label": "Skip this step", "placeholder": ""},
                        {"action": "done", "label": "Stop", "placeholder": ""},
                    ]},
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})
    
    # All login steps done but NO extract step in playbook — ask admin what to read
    screenshot = await page.screenshot(type="jpeg", quality=50)
    screenshot_b64 = base64.b64encode(screenshot).decode()
    page_text = await page.evaluate("() => document.body.innerText.substring(0, 500)")
    
    await db[C_SESSIONS].update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "waiting_admin",
            "current_step": len(steps),
            "screenshot": screenshot_b64,
            "page_text": page_text,
            "question": {
                "text": "Login successful! I'm inside the school platform. What should I do now?",
                "options": [
                    {"action": "extract", "label": "Extract data from THIS page", "placeholder": "What to extract (homework, grades, messages, weekly planner...)"},
                    {"action": "click_text", "label": "Navigate to a section first", "placeholder": "Text of link to click (e.g., Tareas, Calificaciones)"},
                    {"action": "navigate", "label": "Go to specific URL", "placeholder": "https://..."},
                    {"action": "done", "label": "Done, stop scanning", "placeholder": ""},
                ],
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return await db[C_SESSIONS].find_one({"session_id": session_id}, {"_id": 0})


async def _background_execute(session_id: str, session: dict):
    """Background task: execute the step, take screenshot, update session."""
    try:
        student = await db[C_STUDENTS].find_one({"student_id": session["student_id"]}, {"_id": 0})
        creds = student.get("school_credentials", {}) if student else {}
        playbook = await db[C_PLAYBOOKS].find_one({"domain": session.get("domain", "")}, {"_id": 0})
        result = await _execute_next_step(session_id, student, creds, playbook)
        logger.info(f"Background execute done for {session_id}: {result.get('status', '?') if isinstance(result, dict) else '?'}")
    except Exception as e:
        logger.error(f"Background execute failed for {session_id}: {e}")
        await db[C_SESSIONS].update_one(
            {"session_id": session_id},
            {"$set": {"status": "waiting_admin", "question": {"text": f"Error: {str(e)[:200]}", "options": [
                {"action": "navigate", "label": "Try different URL", "placeholder": "https://..."},
                {"action": "done", "label": "Stop", "placeholder": ""},
            ]}, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )


@router.post("/session/{session_id}/guide-screenshot")
async def upload_guide_screenshot(session_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Admin uploads an annotated screenshot to guide the AI.
    AI uses vision to understand what the admin wants.
    
    Body: { "screenshot_base64": "data:image/...", "instruction": "Click the red circled button" }
    """
    screenshot_b64 = data.get("screenshot_base64", "")
    instruction = data.get("instruction", "Follow the annotations in this screenshot")
    
    if not screenshot_b64:
        raise HTTPException(400, "screenshot_base64 required")
    
    session = await db[C_SESSIONS].find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")
    
    # Use AI vision to analyze the annotated screenshot
    from .services import _ai_chat
    
    ai_response = await _ai_chat(
        "You are a browser automation assistant. The admin sent an annotated screenshot showing what to do on a school website. Analyze the screenshot and provide step-by-step browser actions.",
        f"""The admin sent this instruction: "{instruction}"

    Based on the screenshot, provide the EXACT actions to take as a numbered list:
    1. ACTION: click_text | VALUE: [exact text to click]
    2. ACTION: type_text | VALUE: [selector]|[text]
    3. ACTION: navigate | VALUE: [url]

    Only include actions visible in the screenshot. Be specific with button text and field names."""
    )
    
    # Parse AI response into steps
    steps = []
    for line in ai_response.split("\n"):
        line = line.strip()
        if "ACTION:" in line and "VALUE:" in line:
            parts = line.split("VALUE:")
            action_part = parts[0].split("ACTION:")[-1].strip().strip("|").strip()
            value_part = parts[-1].strip() if len(parts) > 1 else ""
            if action_part and value_part:
                steps.append({"action": action_part, "value": value_part})
    
    # Save guide screenshot and parsed steps
    await db[C_SESSIONS].update_one(
        {"session_id": session_id},
        {"$set": {
            "guide_screenshot": screenshot_b64[:50000],  # Limit size
            "guide_instruction": instruction,
            "guide_steps": steps,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )
    
    return {"steps_detected": len(steps), "steps": steps, "message": "AI analyzed your screenshot. Review the steps and confirm to execute."}
