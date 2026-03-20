"""
ChiPi Tutor — School Platform Reader
Uses Playwright (headless browser) to login to school platforms,
take screenshots, and GPT vision to extract educational content.

Supports: iMereb, Smart Academy, generic URL
"""
import os
import uuid
import base64
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from playwright.async_api import async_playwright
from core.database import db

logger = logging.getLogger("tutor.school_reader")

C_STUDENTS = "tutor_students"
C_SCHOOL_FEED = "tutor_school_feed"
C_AGENTS = "tutor_agents"


class SchoolReader:
    """Reads school platforms using browser automation + AI vision."""
    
    def __init__(self):
        self._browser = None
    
    async def _get_browser(self):
        if self._browser is None or not self._browser.is_connected():
            pw = await async_playwright().start()
            self._browser = await pw.chromium.launch(headless=True, args=['--no-sandbox', '--disable-gpu'])
        return self._browser
    
    async def read_platform(self, student_id: str, credentials: dict = None) -> Dict:
        """Read a student's school platform using configurable settings."""
        student = await db[C_STUDENTS].find_one({"student_id": student_id, "status": "active"}, {"_id": 0})
        if not student:
            raise ValueError("Student not found")
        
        platform = student.get("school_platform", "")
        creds = credentials or student.get("school_credentials", {})
        
        if not platform:
            raise ValueError("No school platform configured for this student")
        
        # Load platform config from DB
        config = await self._get_config()
        platform_config = config.get("platforms", {}).get(platform)
        
        if platform_config:
            return await self._read_configured_platform(student, creds, platform_config)
        elif platform == "imereb":
            return await self._read_imereb(student, creds)
        elif platform == "smart_academy":
            return await self._read_smart_academy(student, creds)
        else:
            return await self._read_generic_url(student, creds)

    async def _read_configured_platform(self, student: dict, creds: dict, platform_config: dict) -> Dict:
        """Read any platform using admin-configured selectors and sections."""
        browser = await self._get_browser()
        page = await browser.new_page()
        
        results = {"platform": platform_config.get("name", "custom"), "student": student["name"], "items": [], "errors": []}
        
        try:
            username = creds.get("username", "")
            password = creds.get("password", "")
            
            if not username or not password:
                results["errors"].append(f"Missing {platform_config.get('name', 'platform')} credentials")
                return results
            
            login_url = platform_config.get("login_url", "")
            selectors = platform_config.get("selectors", {})
            
            await page.goto(login_url, timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Login
            await page.fill(selectors.get("username", "input[type='email']"), username)
            await page.fill(selectors.get("password", "input[type='password']"), password)
            await page.click(selectors.get("submit", "button[type='submit']"))
            await page.wait_for_timeout(3000)
            
            # Read each configured section
            for section in platform_config.get("sections", []):
                try:
                    nav = section.get("nav")
                    if nav:
                        link = page.locator(nav).first
                        if await link.count() > 0:
                            await link.click()
                            await page.wait_for_timeout(2000)
                    
                    screenshot = await page.screenshot(type="jpeg", quality=60)
                    screenshot_b64 = base64.b64encode(screenshot).decode()
                    text = await page.evaluate("() => document.body.innerText")
                    
                    section_prompt = section.get("prompt", f"Extract {section.get('name', 'information')} for student {student['name']}")
                    items = await self._ai_analyze_page(screenshot_b64, text[:5000], section_prompt)
                    
                    for item in items:
                        item["student_id"] = student["student_id"]
                        item["source"] = f"{platform_config.get('name', 'custom')}:{section.get('name', 'page')}"
                        await self._save_feed_item(item)
                    
                    results["items"].extend(items)
                except Exception as e:
                    results["errors"].append(f"{section.get('name', '?')}: {str(e)[:100]}")
            
        except Exception as e:
            results["errors"].append(f"Login/navigation error: {str(e)[:200]}")
        finally:
            await page.close()
        
        if results["items"]:
            await self._update_agent_memory(student["student_id"], results["items"])
        
        logger.info(f"Read {platform_config.get('name')} for {student['name']}: {len(results['items'])} items, {len(results['errors'])} errors")
        return results
    
    async def read_url(self, url: str, student_id: str = None, instruction: str = None) -> Dict:
        """Read any URL with AI vision and extract educational content."""
        browser = await self._get_browser()
        page = await browser.new_page()
        
        try:
            await page.goto(url, timeout=30000, wait_until="networkidle")
            await page.wait_for_timeout(2000)
            
            # Take screenshot
            screenshot = await page.screenshot(type="jpeg", quality=60, full_page=True)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            
            # Also get text content
            text_content = await page.evaluate("() => document.body.innerText")
            text_content = text_content[:8000]  # Limit
            
            # AI analyzes the screenshot + text
            items = await self._ai_analyze_page(
                screenshot_b64, text_content, 
                instruction or "Extract all educational information: homework, assignments, events, grades, announcements."
            )
            
            # Save items to school feed
            if student_id and items:
                for item in items:
                    item["student_id"] = student_id
                    item["source"] = f"url:{url[:100]}"
                    await self._save_feed_item(item)
            
            return {
                "url": url,
                "items_found": len(items),
                "items": items,
                "text_preview": text_content[:500],
            }
        except Exception as e:
            logger.error(f"Error reading URL {url}: {e}")
            return {"url": url, "error": str(e), "items": []}
        finally:
            await page.close()
    
    async def _read_imereb(self, student: dict, creds: dict) -> Dict:
        """Read iMereb platform."""
        browser = await self._get_browser()
        page = await browser.new_page()
        
        results = {"platform": "imereb", "student": student["name"], "items": [], "errors": []}
        
        try:
            # Login
            username = creds.get("username", "")
            password = creds.get("password", "")
            
            if not username or not password:
                results["errors"].append("Missing iMereb credentials")
                return results
            
            await page.goto("https://www.imereb.com/login", timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Fill login form
            await page.fill('input[name="username"], input[type="email"], #username', username)
            await page.fill('input[name="password"], input[type="password"], #password', password)
            await page.click('button[type="submit"], .login-btn, #login-button')
            await page.wait_for_timeout(3000)
            
            # Navigate to key sections and screenshot each
            sections = [
                {"name": "dashboard", "url": None},  # Current page after login
                {"name": "tareas", "selector": "a[href*='tarea'], a[href*='homework'], .nav-homework"},
                {"name": "comunicados", "selector": "a[href*='comunicado'], a[href*='message'], .nav-messages"},
                {"name": "calificaciones", "selector": "a[href*='calificaci'], a[href*='grade'], .nav-grades"},
            ]
            
            for section in sections:
                try:
                    if section.get("selector"):
                        link = page.locator(section["selector"]).first
                        if await link.count() > 0:
                            await link.click()
                            await page.wait_for_timeout(2000)
                    
                    # Screenshot + text
                    screenshot = await page.screenshot(type="jpeg", quality=60)
                    screenshot_b64 = base64.b64encode(screenshot).decode()
                    text = await page.evaluate("() => document.body.innerText")
                    
                    # AI extract
                    items = await self._ai_analyze_page(
                        screenshot_b64, text[:5000],
                        f"Extract {section['name']} information for student {student['name']}. Find: homework assignments with due dates, events, grades, announcements."
                    )
                    
                    for item in items:
                        item["student_id"] = student["student_id"]
                        item["source"] = f"imereb:{section['name']}"
                        await self._save_feed_item(item)
                    
                    results["items"].extend(items)
                    
                except Exception as e:
                    results["errors"].append(f"{section['name']}: {str(e)[:100]}")
            
        except Exception as e:
            results["errors"].append(f"Login/navigation error: {str(e)[:200]}")
        finally:
            await page.close()
        
        # Update agent with new data
        if results["items"]:
            await self._update_agent_memory(student["student_id"], results["items"])
        
        logger.info(f"iMereb read for {student['name']}: {len(results['items'])} items, {len(results['errors'])} errors")
        return results
    
    async def _read_smart_academy(self, student: dict, creds: dict) -> Dict:
        """Read Smart Academy platform."""
        browser = await self._get_browser()
        page = await browser.new_page()
        
        results = {"platform": "smart_academy", "student": student["name"], "items": [], "errors": []}
        
        try:
            username = creds.get("username", "")
            password = creds.get("password", "")
            
            if not username or not password:
                results["errors"].append("Missing Smart Academy credentials")
                return results
            
            await page.goto("https://apps.smartacademy.edu.pa/isae/login1.asp", timeout=30000)
            await page.wait_for_timeout(2000)
            
            # Login
            await page.fill('input[name="usuario"], input[name="user"], #txtUsuario', username)
            await page.fill('input[name="clave"], input[name="password"], #txtClave', password)
            await page.click('input[type="submit"], button[type="submit"], #btnLogin')
            await page.wait_for_timeout(3000)
            
            # Screenshot main page
            screenshot = await page.screenshot(type="jpeg", quality=60, full_page=True)
            screenshot_b64 = base64.b64encode(screenshot).decode()
            text = await page.evaluate("() => document.body.innerText")
            
            items = await self._ai_analyze_page(
                screenshot_b64, text[:8000],
                f"Extract ALL educational information for student {student['name']}: homework, assignments with due dates, exam schedule, grades, teacher messages, events, announcements."
            )
            
            for item in items:
                item["student_id"] = student["student_id"]
                item["source"] = "smart_academy"
                await self._save_feed_item(item)
            
            results["items"] = items
            
        except Exception as e:
            results["errors"].append(str(e)[:200])
        finally:
            await page.close()
        
        if results["items"]:
            await self._update_agent_memory(student["student_id"], results["items"])
        
        logger.info(f"Smart Academy read for {student['name']}: {len(results['items'])} items")
        return results
    
    async def _read_generic_url(self, student: dict, creds: dict) -> Dict:
        """Read a generic school URL."""
        url = creds.get("url", "")
        if not url:
            return {"error": "No URL configured", "items": []}
        return await self.read_url(url, student["student_id"])
    
    async def _get_config(self):
        """Load school feed configuration from DB."""
        config = await db[C_SCHOOL_FEED + "_config"].find_one({"_id": "school_feed_config"})
        if not config:
            from .school_feed_config import DEFAULT_CONFIG
            config = DEFAULT_CONFIG
        return config

    async def _ai_analyze_page(self, screenshot_b64: str, text_content: str, instruction: str) -> List[Dict]:
        """Use AI to analyze a school page and extract structured items."""
        from .services import _ai_chat
        
        # Load custom AI instructions from config
        config = await self._get_config()
        base_prompt = config.get("ai_instructions", {}).get("extraction_prompt", "")
        
        prompt = f"""{base_prompt}

SPECIFIC SECTION INSTRUCTION: {instruction}

PAGE TEXT CONTENT:
{text_content[:4000]}

Return the extracted information as a list. For each item found, provide:
TYPE: homework | weekly_plan | alert | material_request | grade | event | message
TITLE: brief title
CONTENT: detailed description
DUE_DATE: YYYY-MM-DD if applicable
URGENCY: low | normal | high | urgent
SUBJECT: school subject if applicable
ACTION_REQUIRED: what tutor/parent needs to do
---
(next item)"""

        response = await _ai_chat("You are a school data extractor. Extract structured educational information.", prompt)
        
        # Parse the AI response into structured items
        items = []
        current = {}
        for line in response.split("\n"):
            line = line.strip()
            if line == "---" or line == "":
                if current.get("title"):
                    items.append(current)
                    current = {}
                continue
            
            for prefix in ["TYPE:", "TITLE:", "CONTENT:", "DUE_DATE:", "URGENCY:", "SUBJECT:", "ACTION_REQUIRED:"]:
                if line.upper().startswith(prefix):
                    key = prefix.rstrip(":").lower()
                    value = line[len(prefix):].strip()
                    current[key] = value
                    break
        
        if current.get("title"):
            items.append(current)
        
        return items
    
    async def _save_feed_item(self, item: dict):
        """Save an extracted item to the school feed."""
        now = datetime.now(timezone.utc).isoformat()
        feed_item = {
            "feed_id": f"sf_{uuid.uuid4().hex[:8]}",
            "student_id": item.get("student_id", ""),
            "source": item.get("source", "ai_reader"),
            "type": item.get("type", "notification"),
            "title": item.get("title", ""),
            "content": item.get("content", ""),
            "urgency": item.get("urgency", "normal"),
            "due_date": item.get("due_date"),
            "subject": item.get("subject", ""),
            "action_required": item.get("action_required", ""),
            "status": "new",
            "notify_parent": item.get("urgency") in ("high", "urgent"),
            "created_at": now,
        }
        
        # Check for duplicates (same title + student in last 7 days)
        existing = await db[C_SCHOOL_FEED].find_one({
            "student_id": feed_item["student_id"],
            "title": feed_item["title"],
            "created_at": {"$gte": (datetime.now(timezone.utc) - __import__('datetime').timedelta(days=7)).isoformat()},
        })
        if existing:
            return  # Skip duplicate
        
        await db[C_SCHOOL_FEED].insert_one(feed_item)
        
        # Push to Monday.com board if configured
        await self._push_to_monday(feed_item)
    
    async def _push_to_monday(self, feed_item: dict):
        """Push a feed item to the Monday.com Tutor School Feed board."""
        try:
            config = await self._get_config()
            monday_cfg = config.get("monday_board", {})
            if not monday_cfg.get("enabled") or not monday_cfg.get("board_id"):
                return
            
            from modules.integrations.monday.core_client import monday_client
            board_id = monday_cfg["board_id"]
            col_map = monday_cfg.get("column_map", {})
            
            # Build column values
            col_values = {}
            if col_map.get("student_name"):
                student = await db[C_STUDENTS].find_one({"student_id": feed_item.get("student_id")}, {"name": 1})
                col_values[col_map["student_name"]] = student.get("name", "") if student else ""
            if col_map.get("feed_date") and feed_item.get("created_at"):
                col_values[col_map["feed_date"]] = {"date": feed_item["created_at"][:10]}
            if col_map.get("feed_type"):
                type_label = (feed_item.get("type", "notification")).replace("_", " ").title()
                col_values[col_map["feed_type"]] = {"label": type_label}
            if col_map.get("subject"):
                col_values[col_map["subject"]] = feed_item.get("subject", "")
            if col_map.get("content"):
                col_values[col_map["content"]] = {"text": feed_item.get("content", "")[:2000]}
            if col_map.get("urgency"):
                col_values[col_map["urgency"]] = {"label": (feed_item.get("urgency", "normal")).title()}
            if col_map.get("due_date") and feed_item.get("due_date"):
                col_values[col_map["due_date"]] = {"date": feed_item["due_date"][:10]}
            if col_map.get("action_required"):
                col_values[col_map["action_required"]] = feed_item.get("action_required", "")
            if col_map.get("source"):
                col_values[col_map["source"]] = feed_item.get("source", "")
            if col_map.get("feed_status"):
                col_values[col_map["feed_status"]] = {"label": "New"}
            if col_map.get("parent_notified"):
                col_values[col_map["parent_notified"]] = {"checked": "true" if feed_item.get("notify_parent") else "false"}
            
            import json
            title = feed_item.get("title", "School Feed Item")[:100]
            await monday_client.create_item(board_id, title, json.dumps(col_values))
            logger.info(f"Pushed to Monday: {title}")
        except Exception as e:
            logger.warning(f"Monday push failed: {e}")
    
    async def _update_agent_memory(self, student_id: str, items: list):
        """Feed extracted school data into the student's agent memory."""
        summary = "; ".join([f"{i.get('type','?')}: {i.get('title','?')}" for i in items[:10]])
        memory = {
            "date": datetime.now(timezone.utc).isoformat(),
            "type": "school_sync",
            "content": f"School platform sync: {len(items)} items found. {summary}",
        }
        await db[C_AGENTS].update_one(
            {"student_id": student_id},
            {"$push": {"memory": memory}}
        )


# Singleton
school_reader = SchoolReader()
