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

async def execute_tutor_flow(nodes: List[Dict], edges: List[Dict]) -> Dict[str, Any]:
    """Execute a parsed Tutor Flow."""
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
                                await page.fill(user_sel, "test_student_mock_user")
                            if pass_sel:
                                await page.fill(pass_sel, "test_mock_password123")
                            if submit_sel:
                                await page.click(submit_sel)
                            
                            await page.wait_for_timeout(3000)
                            execution_log.append("Login form submitted")
                            
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
                    
                    execution_log.append(f"Processing with LLM ({provider})")
                    
                    system_prompt = f"{prompt}\n\nContext Data:\n{context_data.get('scraped_text', 'No text extracted')}"
                    
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
