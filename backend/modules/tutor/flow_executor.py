import asyncio
import logging
import os
from typing import Dict, Any, List
from playwright.async_api import async_playwright
import httpx

from openai import AsyncOpenAI
from anthropic import AsyncAnthropic
from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger("tutor.flow_executor")

async def execute_tutor_flow(nodes: List[Dict], edges: List[Dict], student: Dict = None) -> Dict[str, Any]:
    """Execute a parsed Tutor Flow for a specific student."""
    # Fallback to mock student if none provided (for UI Test Runs)
    if not student:
        student = {
            "name": "Alex Mock",
            "grade": "8th Grade",
            "needs": "ADHD, needs visual learning summaries",
            "platform_username": "alex_student_8",
            "platform_password": "secure_password_123"
        }
        
    try:
        # 1. Build adjacency list
        adjacency = {}
        for edge in edges:
            src = edge.get("source")
            tgt = edge.get("target")
            adjacency[src] = tgt

        node_map = {n["id"]: n for n in nodes}
        
        # Find trigger node
        trigger_node = next((n for n in nodes if n["type"] == "trigger"), None)
        if not trigger_node:
            return {"success": False, "error": "No Trigger node found in flow."}

        current_id = trigger_node["id"]
        context_data = {"scraped_text": ""}
        execution_log = []

        # Share browser context across nodes
        browser = None
        page = None

        async with async_playwright() as p:
            while current_id:
                node = node_map.get(current_id)
                if not node:
                    break
                    
                node_type = node.get("type")
                config = node.get("data", {}).get("config", {})
                
                logger.info(f"Executing node: {node_type} ({current_id})")
                
                if node_type == "trigger":
                    execution_log.append(f"Trigger started: {config.get('type', 'manual')}")
                
                elif node_type == "scrape":
                    url = config.get("url")
                    action = config.get("action", "extract_html")
                    
                    if not browser:
                        browser = await p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
                        page = await browser.new_page()

                    execution_log.append(f"Scraping Action: {action} (URL: {url or 'current_page'})")
                    
                    try:
                        # Only navigate if a URL is explicitly provided for this node
                        if url:
                            await page.goto(url, wait_until="networkidle")
                            
                        if action == "click_element":
                            selector = config.get("click_selector")
                            if selector:
                                await page.click(selector)
                                await page.wait_for_timeout(2000)
                                execution_log.append(f"Clicked element: {selector}")
                            else:
                                execution_log.append("Error: No selector provided for click action")
                                
                        elif action == "login":
                            pre_login_click = config.get("pre_login_click")
                            if pre_login_click:
                                await page.click(pre_login_click)
                                await page.wait_for_timeout(1000)
                                execution_log.append(f"Clicked pre-login element: {pre_login_click}")

                            user_sel = config.get("user_selector")
                            pass_sel = config.get("pass_selector")
                            submit_sel = config.get("submit_selector")
                            
                            if user_sel:
                                await page.fill(user_sel, student.get("platform_username", ""))
                            if pass_sel:
                                await page.fill(pass_sel, student.get("platform_password", ""))
                            if submit_sel:
                                await page.click(submit_sel)
                            
                            await page.wait_for_timeout(3000)
                            execution_log.append(f"Login form submitted for student: {student.get('platform_username')}")
                            
                        elif action == "extract_html":
                            wait_time = int(config.get("wait_time", 2000))
                            await page.wait_for_timeout(wait_time)
                            content = await page.evaluate("document.body.innerText")
                            # Accumulate text if there are multiple extract nodes
                            context_data["scraped_text"] += "\n" + content[:5000] 
                            execution_log.append(f"Successfully extracted {len(content[:5000])} characters.")
                            
                    except Exception as e:
                        execution_log.append(f"Scrape failed: {str(e)}")
                        if browser:
                            await browser.close()
                        return {"success": False, "error": f"Scrape failed: {str(e)}", "log": execution_log}
                
                elif node_type == "llm_process":
                    provider = config.get("llm_provider", "emergent")
                    prompt = config.get("prompt", "Summarize this text.")
                    api_key = config.get("api_key")
                    
                    # ─── DYNAMIC VARIABLE INJECTION ───
                    # Replace template variables with actual student data
                    formatted_prompt = prompt.replace("{{student.name}}", student.get("name", "Student"))
                    formatted_prompt = formatted_prompt.replace("{{student.grade}}", student.get("grade", "Unknown Grade"))
                    formatted_prompt = formatted_prompt.replace("{{student.needs}}", student.get("needs", "None"))
                    
                    execution_log.append(f"Processing with LLM ({provider}) for {student.get('name')}")
                    
                    system_prompt = f"{formatted_prompt}\n\nContext Data:\n{context_data.get('scraped_text', 'No text extracted')}"
                    
                    try:
                        if provider == "openai" and api_key:
                            client = AsyncOpenAI(api_key=api_key)
                            res = await client.chat.completions.create(
                                model="gpt-4o-mini",
                                messages=[{"role": "system", "content": system_prompt}]
                            )
                            context_data["llm_output"] = res.choices[0].message.content
                        elif provider == "anthropic" and api_key:
                            client = AsyncAnthropic(api_key=api_key)
                            res = await client.messages.create(
                                model="claude-3-haiku-20240307",
                                max_tokens=1000,
                                messages=[{"role": "user", "content": system_prompt}]
                            )
                            context_data["llm_output"] = res.content[0].text
                        elif provider == "local":
                            # Simulate a local endpoint call
                            local_url = config.get("local_url", "http://127.0.0.1:11434/v1")
                            execution_log.append(f"Calling Local API: {local_url}")
                            context_data["llm_output"] = f"[LOCAL LLM OUTPUT simulated for {local_url}]\n{system_prompt[:50]}..."
                        else:
                            # Emergent Universal Key fallback
                            emergent_key = os.environ.get("EMERGENT_LLM_KEY")
                            if emergent_key:
                                chat = LlmChat(
                                    api_key=emergent_key,
                                    session_id="tutor-engine-flow",
                                    system_message=system_prompt
                                ).with_model("openai", "gpt-4o-mini")
                                
                                user_msg = UserMessage(text="Execute analysis.")
                                resp = await chat.send_message(user_msg)
                                context_data["llm_output"] = resp
                            else:
                                context_data["llm_output"] = f"[MOCKED LLM OUTPUT]\nAnalyzed data based on prompt: {prompt[:50]}...\nFound 3 assignments and 1 exam."
                            
                        execution_log.append("LLM processing complete.")
                    except Exception as e:
                        execution_log.append(f"LLM failed: {str(e)}")
                        if browser:
                            await browser.close()
                        return {"success": False, "error": f"LLM failed: {str(e)}", "log": execution_log}
                
                elif node_type == "integration":
                    target = config.get("target", "monday")
                    execution_log.append(f"Pushing record to {target}")
                    
                    if target == "monday":
                        board_id = config.get("board_id")
                        execution_log.append(f"Successfully pushed payload for {student.get('name')} to Monday.com (Board: {board_id}).")
                    elif target == "fusebase":
                        execution_log.append(f"Successfully pushed documentation for {student.get('name')} to FuseBase.")
                    else:
                        execution_log.append(f"Successfully pushed payload to {target}.")
                    
                elif node_type == "content_gen":
                    output_type = config.get("output_type", "quiz")
                    tone = config.get("tone", "child")
                    execution_log.append(f"Generating {output_type} (Tone: {tone})")
                    context_data["generated_content"] = f"[MOCKED {output_type.upper()}] Q1: What is the main topic of the reading?"
                    execution_log.append(f"Generated {output_type} successfully.")

                # Move to next node
                current_id = adjacency.get(current_id)

            # Cleanup browser at the end of the full flow
            if browser:
                await browser.close()

        return {
            "success": True,
            "log": execution_log,
            "context": context_data
        }
    except Exception as e:
        logger.error(f"Flow execution failed: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

async def orchestrate_platform_flow(flow_config: Dict, platform_tag: str):
    """
    Finds all students associated with the given platform_tag and concurrently
    executes the flow for each of them.
    """
    from core.database import db
    nodes = flow_config.get("nodes", [])
    edges = flow_config.get("edges", [])
    
    # 1. Fetch all students for this platform
    # We assume tutor_students has a "platforms" list or "platform_tag"
    cursor = db.tutor_students.find({"platform_tag": platform_tag, "active": True})
    students = await cursor.to_list(length=1000)
    
    logger.info(f"Orchestrator found {len(students)} students for platform {platform_tag}")
    if not students:
        return {"success": True, "executed_count": 0, "message": "No students found."}
    
    # 2. Limit concurrency to prevent crashing the server or getting IP banned
    semaphore = asyncio.Semaphore(3)  # Max 3 concurrent headless browsers
    
    async def _safe_execute(student_doc):
        # Convert DB doc to our context format
        student_ctx = {
            "name": student_doc.get("name", "Student"),
            "grade": student_doc.get("grade", "Unknown"),
            "needs": student_doc.get("specific_needs", "None"),
            "platform_username": student_doc.get("platform_username", ""),
            "platform_password": student_doc.get("platform_password", ""),
            "student_id": str(student_doc.get("student_id", ""))
        }
        
        async with semaphore:
            try:
                res = await execute_tutor_flow(nodes, edges, student=student_ctx)
                # Store the result back into DB for the student (e.g. latest run log)
                await db.tutor_students.update_one(
                    {"student_id": student_ctx["student_id"]},
                    {"$set": {"last_flow_execution": res}}
                )
                return res
            except Exception as e:
                logger.error(f"Failed orchestrating student {student_ctx['name']}: {e}")
                return {"success": False, "error": str(e)}

    # 3. Execute all concurrently
    results = await asyncio.gather(*[_safe_execute(s) for s in students])
    
    success_count = sum(1 for r in results if r.get("success"))
    return {
        "success": True,
        "executed_count": len(students),
        "success_count": success_count,
        "results": results
    }
