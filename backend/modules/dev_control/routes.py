"""
Dev Control Module - Architecture introspection, endpoint discovery, annotations CRUD,
DB explorer, git changes, dependencies, and AI Dev Helper.
Admin-only endpoints for the Development Control panel.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import os
import subprocess
import json
import logging

from core.database import db
from core.auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dev-control", tags=["Dev Control"])

COLLECTION = "dev_annotations"
AI_SESSIONS_COLLECTION = "dev_ai_sessions"
AI_MESSAGES_COLLECTION = "dev_ai_messages"


# ============== ARCHITECTURE INTROSPECTION ==============

def _scan_tree(root: str, prefix: str = "", depth: int = 0, max_depth: int = 3):
    """Recursively scan a directory and return a tree structure."""
    if depth > max_depth:
        return []
    items = []
    try:
        entries = sorted(os.listdir(root))
    except PermissionError:
        return items
    skip = {
        "__pycache__", "node_modules", ".git", ".emergent", ".next",
        "yarn.lock", "package-lock.json", ".env", "uploads",
        "test_reports", "dist", "build", "coverage", ".cache"
    }
    for entry in entries:
        if entry in skip or entry.startswith("."):
            continue
        full = os.path.join(root, entry)
        rel = os.path.join(prefix, entry) if prefix else entry
        is_dir = os.path.isdir(full)
        node = {"name": entry, "path": rel, "type": "dir" if is_dir else "file"}
        if is_dir:
            node["children"] = _scan_tree(full, rel, depth + 1, max_depth)
        items.append(node)
    return items


@router.get("/architecture")
async def get_architecture(admin: dict = Depends(get_admin_user)):
    backend_tree = _scan_tree("/app/backend", "backend", max_depth=3)
    frontend_tree = _scan_tree("/app/frontend/src", "frontend/src", max_depth=3)
    return {"backend": backend_tree, "frontend": frontend_tree}


# ============== ENDPOINT DISCOVERY ==============

@router.get("/endpoints")
async def get_endpoints(admin: dict = Depends(get_admin_user)):
    from main import app as main_app
    groups = {}
    for route in main_app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if not path or not methods or not path.startswith("/api"):
            continue
        tags = getattr(route, "tags", None) or ["Other"]
        tag = tags[0] if tags else "Other"
        if tag not in groups:
            groups[tag] = []
        summary = getattr(route, "summary", None) or getattr(route, "name", "")
        for method in methods:
            if method in ("HEAD", "OPTIONS"):
                continue
            groups[tag].append({"method": method, "path": path, "summary": summary})
    sorted_groups = {k: sorted(groups[k], key=lambda x: x["path"]) for k in sorted(groups.keys())}
    return {"groups": sorted_groups, "total": sum(len(v) for v in sorted_groups.values())}


# ============== DYNAMIC MODULES ==============

@router.get("/modules")
async def get_modules(admin: dict = Depends(get_admin_user)):
    """Auto-detect modules from filesystem + enrich with endpoint counts."""
    from main import app as main_app

    # Count endpoints per tag
    tag_counts = {}
    for route in main_app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if not path or not methods or not path.startswith("/api"):
            continue
        tags = getattr(route, "tags", None) or []
        for tag in tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + len([m for m in methods if m not in ("HEAD", "OPTIONS")])

    # Scan backend/modules directory
    modules_dir = "/app/backend/modules"
    detected = []
    if os.path.isdir(modules_dir):
        for entry in sorted(os.listdir(modules_dir)):
            full = os.path.join(modules_dir, entry)
            if os.path.isdir(full) and not entry.startswith("_"):
                has_routes = os.path.exists(os.path.join(full, "routes.py")) or os.path.isdir(os.path.join(full, "routes"))
                has_init = os.path.exists(os.path.join(full, "__init__.py"))
                # Count files
                file_count = sum(1 for f in os.listdir(full) if os.path.isfile(os.path.join(full, f)) and f.endswith(".py"))
                subdir_count = sum(1 for f in os.listdir(full) if os.path.isdir(os.path.join(full, f)) and not f.startswith("_"))

                detected.append({
                    "id": entry,
                    "name": entry.replace("_", " ").title(),
                    "status": "active" if has_routes else "placeholder",
                    "path": f"backend/modules/{entry}",
                    "has_routes": has_routes,
                    "has_init": has_init,
                    "files": file_count,
                    "subdirs": subdir_count,
                    "endpoint_count": tag_counts.get(entry.replace("_", " ").title(), tag_counts.get(entry.title(), 0)),
                })

    # Also scan routes/ directory
    routes_dir = "/app/backend/routes"
    if os.path.isdir(routes_dir):
        for f in sorted(os.listdir(routes_dir)):
            if f.endswith(".py") and not f.startswith("_"):
                name = f.replace(".py", "")
                detected.append({
                    "id": f"route_{name}",
                    "name": name.replace("_", " ").title(),
                    "status": "active",
                    "path": f"backend/routes/{f}",
                    "has_routes": True,
                    "has_init": False,
                    "files": 1,
                    "subdirs": 0,
                    "endpoint_count": tag_counts.get(name.replace("_", " ").title(), tag_counts.get(name.title(), 0)),
                })

    return {"modules": detected, "tag_counts": tag_counts}


# ============== PRINCIPLES ==============

@router.get("/principles")
async def get_principles(admin: dict = Depends(get_admin_user)):
    principles = [
        {
            "category": "Backend",
            "items": [
                {"title": "FastAPI + MongoDB", "detail": "All routes use async/await. Motor for async Mongo access. Always exclude _id from responses."},
                {"title": "Auth Pattern", "detail": "Use Depends(get_admin_user) for admin routes. Use require_permission('x.y') for RBAC-gated endpoints."},
                {"title": "Module Structure", "detail": "Each module lives in backend/modules/<name>/ with __init__.py, routes.py, models.py, and optional services/."},
                {"title": "Route Prefix", "detail": "All API routes must be prefixed with /api via the api_router in main.py."},
                {"title": "Config from ENV", "detail": "All credentials come from .env. No hardcoded secrets. Fail fast on missing config."},
            ],
        },
        {
            "category": "Frontend",
            "items": [
                {"title": "React + Shadcn/UI", "detail": "Use components from /components/ui/. Tailwind CSS for styling. Dark/Light theme via ThemeContext."},
                {"title": "i18n with react-i18next", "detail": "All user-facing strings use t('key'). Locale files in /i18n/locales/{en,es,zh}.json."},
                {"title": "Permissions Hook", "detail": "Use usePermissions() hook to gate UI features. Check hasPermission('module.action')."},
                {"title": "API Calls", "detail": "Always use REACT_APP_BACKEND_URL. Axios with auth token from AuthContext."},
                {"title": "Admin Modules", "detail": "Each admin feature is a lazy-loaded module in /modules/admin/. Registered in AdminDashboard.jsx."},
            ],
        },
        {
            "category": "Database",
            "items": [
                {"title": "MongoDB Collections", "detail": "Use constants from core/constants.py. Always exclude _id in projections."},
                {"title": "DateTime Handling", "detail": "Use datetime.now(timezone.utc). Store as ISO strings when needed."},
                {"title": "ObjectId Safety", "detail": "Never return raw ObjectId. Exclude _id or convert to string."},
            ],
        },
        {
            "category": "Integrations",
            "items": [
                {"title": "Monday.com", "detail": "GraphQL API v2. User API Key required. 2-way sync via webhooks + polling."},
                {"title": "Telegram", "detail": "Bot API for community feed. TELEGRAM_BOT_TOKEN from env."},
                {"title": "LLM (Dual Model)", "detail": "GPT-4o + Claude Sonnet 4.5 via emergentintegrations. EMERGENT_LLM_KEY from env. Auto-routed by query type."},
            ],
        },
    ]
    return {"principles": principles}


# ============== ROADMAP ==============

@router.get("/roadmap")
async def get_roadmap(admin: dict = Depends(get_admin_user)):
    items = await db["dev_roadmap"].find({}, {"_id": 0}).sort("priority", 1).to_list(200)
    if not items:
        items = [
            {"id": str(uuid.uuid4()), "priority": "P0", "title": "Dev Control Section", "status": "done", "description": "Architecture visualization, API reference, annotations"},
            {"id": str(uuid.uuid4()), "priority": "P0", "title": "AI Dev Helper", "status": "done", "description": "Dual-model AI assistant (GPT-4o + Claude) for code review, security, architecture"},
            {"id": str(uuid.uuid4()), "priority": "P1", "title": "Monday.com AI Parser Guide", "status": "planned", "description": "Step-by-step guide for AI column to parse bank transfers"},
            {"id": str(uuid.uuid4()), "priority": "P1", "title": "Telegram Feed Visibility Controls", "status": "planned", "description": "Admin settings for role-based Telegram feed access"},
            {"id": str(uuid.uuid4()), "priority": "P2", "title": "OneSignal Push Notifications", "status": "planned", "description": "Push notifications for wallet and order events"},
            {"id": str(uuid.uuid4()), "priority": "P2", "title": "Stripe Payment Integration", "status": "planned", "description": "Online payments for orders and wallet top-ups"},
            {"id": str(uuid.uuid4()), "priority": "P2", "title": "Google Sheets Integration", "status": "planned", "description": "Sync data with Google Sheets for reporting"},
            {"id": str(uuid.uuid4()), "priority": "P3", "title": "ChipiPoints System", "status": "planned", "description": "Gamification with points and rewards"},
            {"id": str(uuid.uuid4()), "priority": "P3", "title": "Teams/Clans System", "status": "planned", "description": "Group system for competitions"},
            {"id": str(uuid.uuid4()), "priority": "P3", "title": "Email Notifications", "status": "planned", "description": "Transactional emails for key events"},
        ]
        await db["dev_roadmap"].insert_many([{**item} for item in items])
    return {"items": items}


@router.put("/roadmap/{item_id}")
async def update_roadmap_item(item_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    update_fields = {}
    for field in ["status", "description", "title", "priority"]:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")
    result = await db["dev_roadmap"].update_one({"id": item_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    return {"success": True}


# ============== ANNOTATIONS CRUD ==============

@router.get("/annotations")
async def get_annotations(admin: dict = Depends(get_admin_user)):
    items = await db[COLLECTION].find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"annotations": items}


@router.post("/annotations")
async def create_annotation(data: dict, admin: dict = Depends(get_admin_user)):
    content = data.get("content", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    doc = {
        "id": str(uuid.uuid4()),
        "title": data.get("title", "").strip(),
        "content": content,
        "category": data.get("category", "general"),
        "pinned": data.get("pinned", False),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email", "admin"),
    }
    await db[COLLECTION].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/annotations/{annotation_id}")
async def update_annotation(annotation_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    update_fields = {}
    for field in ["title", "content", "category", "pinned"]:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")
    result = await db[COLLECTION].update_one({"id": annotation_id}, {"$set": update_fields})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str, admin: dict = Depends(get_admin_user)):
    result = await db[COLLECTION].delete_one({"id": annotation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}


# ============== DATABASE EXPLORER ==============

@router.get("/db-explorer")
async def get_db_explorer(admin: dict = Depends(get_admin_user)):
    """List all MongoDB collections with doc counts and sample fields."""
    collection_names = await db.list_collection_names()
    collections = []
    for name in sorted(collection_names):
        count = await db[name].count_documents({})
        sample = await db[name].find_one({}, {"_id": 0})
        fields = list(sample.keys()) if sample else []
        collections.append({
            "name": name,
            "count": count,
            "fields": fields[:20],
            "sample": {k: _serialize(v) for k, v in (sample or {}).items()} if sample else None,
        })
    return {"collections": collections, "total_collections": len(collections)}


def _serialize(val):
    """Make values JSON-safe for preview."""
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, (list, dict)):
        return str(val)[:200]
    return str(val)[:200] if val is not None else None


# ============== CHANGES LOG (GIT) ==============

@router.get("/changes-log")
async def get_changes_log(admin: dict = Depends(get_admin_user)):
    """Return recent git commit history."""
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "--no-merges", "-50", "--format=%H|%an|%ai|%s"],
            capture_output=True, text=True, cwd="/app", timeout=10
        )
        commits = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("|", 3)
            if len(parts) == 4:
                commits.append({
                    "hash": parts[0][:8],
                    "full_hash": parts[0],
                    "author": parts[1],
                    "date": parts[2],
                    "message": parts[3],
                })
        return {"commits": commits, "total": len(commits)}
    except Exception as e:
        return {"commits": [], "total": 0, "error": str(e)}


@router.get("/changes-log/{commit_hash}")
async def get_commit_detail(commit_hash: str, admin: dict = Depends(get_admin_user)):
    """Get files changed in a specific commit."""
    try:
        result = subprocess.run(
            ["git", "diff-tree", "--no-commit-id", "-r", "--name-status", commit_hash],
            capture_output=True, text=True, cwd="/app", timeout=10
        )
        files = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            parts = line.split("\t", 1)
            if len(parts) == 2:
                files.append({"status": parts[0], "file": parts[1]})
        return {"files": files, "hash": commit_hash}
    except Exception as e:
        return {"files": [], "error": str(e)}


# ============== DEPENDENCIES ==============

@router.get("/dependencies")
async def get_dependencies(admin: dict = Depends(get_admin_user)):
    """Return Python and Node.js dependencies."""
    # Python
    python_deps = []
    try:
        import sys
        pip_path = os.path.join(os.path.dirname(sys.executable), "pip")
        result = subprocess.run([pip_path, "list", "--format=json"], capture_output=True, text=True, timeout=15)
        python_deps = json.loads(result.stdout) if result.stdout else []
    except Exception:
        pass

    # Node
    node_deps = {}
    try:
        with open("/app/frontend/package.json", "r") as f:
            pkg = json.load(f)
            node_deps = {
                "dependencies": pkg.get("dependencies", {}),
                "devDependencies": pkg.get("devDependencies", {}),
            }
    except Exception:
        pass

    return {
        "python": {"packages": python_deps, "total": len(python_deps)},
        "node": {
            "dependencies": node_deps.get("dependencies", {}),
            "devDependencies": node_deps.get("devDependencies", {}),
            "total": len(node_deps.get("dependencies", {})) + len(node_deps.get("devDependencies", {})),
        },
    }


# ============== AI DEV HELPER ==============

def _classify_query(text: str) -> str:
    """Auto-route query to the best model. Returns 'claude' or 'gpt4o'."""
    text_lower = text.lower()
    # Claude excels at: code review, architecture analysis, refactoring suggestions
    claude_keywords = [
        "code review", "refactor", "architecture", "pattern", "structure",
        "clean code", "design pattern", "code quality", "best practice",
        "review this", "analyze code", "improve code", "module structure",
        "separation of concerns", "solid principles"
    ]
    # GPT-4o excels at: security, strategy, general advice, health checks
    # It's the default
    for kw in claude_keywords:
        if kw in text_lower:
            return "claude"
    return "gpt4o"


async def _gather_app_context() -> str:
    """Gather real-time app context for the AI."""
    context_parts = []

    # DB stats
    try:
        col_names = await db.list_collection_names()
        col_stats = []
        for name in sorted(col_names)[:30]:
            count = await db[name].count_documents({})
            col_stats.append(f"  - {name}: {count} docs")
        context_parts.append("## MongoDB Collections\n" + "\n".join(col_stats))
    except Exception:
        pass

    # Endpoints count
    try:
        from main import app as main_app
        ep_count = sum(1 for r in main_app.routes if getattr(r, "path", "").startswith("/api") and getattr(r, "methods", None))
        context_parts.append(f"## API: {ep_count} registered endpoints")
    except Exception:
        pass

    # Backend modules
    try:
        modules_dir = "/app/backend/modules"
        mods = [e for e in os.listdir(modules_dir) if os.path.isdir(os.path.join(modules_dir, e)) and not e.startswith("_")]
        context_parts.append(f"## Backend Modules ({len(mods)}): {', '.join(sorted(mods))}")
    except Exception:
        pass

    # Recent git commits
    try:
        result = subprocess.run(
            ["git", "log", "--oneline", "-10", "--format=%ai %s"], capture_output=True, text=True, cwd="/app", timeout=5
        )
        if result.stdout.strip():
            context_parts.append("## Recent Changes (last 10 commits)\n" + result.stdout.strip())
    except Exception:
        pass

    # Python deps summary
    try:
        result = subprocess.run(["pip", "list", "--format=columns"], capture_output=True, text=True, timeout=10)
        lines = result.stdout.strip().split("\n")
        context_parts.append(f"## Python Packages: {len(lines) - 2} installed")
    except Exception:
        pass

    # Key env vars (names only, not values)
    try:
        env_keys = []
        with open("/app/backend/.env", "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    env_keys.append(line.split("=")[0])
        context_parts.append(f"## Env Vars: {', '.join(env_keys)}")
    except Exception:
        pass

    return "\n\n".join(context_parts)


SYSTEM_PROMPT = """You are ChiPi Dev Helper — an expert AI assistant embedded in the ChiPi Link admin dashboard.
You serve as a CTO-level advisor for the app's development. You have deep knowledge of:

**Tech Stack:** FastAPI + MongoDB (Motor async) backend, React + Shadcn/UI + Tailwind frontend, react-i18next for i18n (EN/ES/ZH).
**Architecture:** Modular monolith with modules in backend/modules/. Each has routes.py, models.py, services/. All routes prefixed with /api.
**Auth:** JWT + session auth with RBAC (roles & permissions). Depends(get_admin_user) for admin routes.
**Integrations:** Monday.com (GraphQL + webhooks), Telegram Bot API, OpenAI GPT-4o + Claude Sonnet 4.5 via emergentintegrations.
**Database:** MongoDB with Motor async driver. Always exclude _id. Use datetime.now(timezone.utc).

Your responsibilities:
1. **Health Monitoring**: Analyze DB stats, endpoint coverage, module health
2. **Security Advisor**: Review auth patterns, identify vulnerabilities, suggest hardening
3. **Architecture Review**: Evaluate code structure, suggest improvements
4. **Strategy Advisor**: Help prioritize features, evaluate integrations
5. **Code Guidance**: Provide implementation patterns aligned with the codebase
6. **Dependency Audit**: Flag outdated or vulnerable packages

Always be concise, actionable, and specific to THIS app. Reference actual files, collections, and endpoints.
When suggesting code, follow the established patterns (FastAPI dependency injection, Shadcn/UI components, etc.).
Respond in the same language as the user's message (English or Spanish).
"""


@router.post("/ai-helper/chat")
async def ai_helper_chat(data: dict, admin: dict = Depends(get_admin_user)):
    """Send a message to the AI Dev Helper."""
    message = data.get("message", "").strip()
    session_id = data.get("session_id", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    # Create session if new
    if not session_id:
        session_id = str(uuid.uuid4())
        await db[AI_SESSIONS_COLLECTION].insert_one({
            "id": session_id,
            "title": message[:80],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "created_by": admin.get("email", "admin"),
        })

    # Auto-route model
    model_route = _classify_query(message)

    # Gather app context
    app_context = await _gather_app_context()

    # Save user message
    user_msg_doc = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "role": "user",
        "content": message,
        "model": model_route,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db[AI_MESSAGES_COLLECTION].insert_one(user_msg_doc)
    user_msg_doc.pop("_id", None)

    # Load conversation history (last 20 messages for context)
    history = await db[AI_MESSAGES_COLLECTION].find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(20)

    # Build LLM call
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

        system_msg = SYSTEM_PROMPT + f"\n\n--- LIVE APP CONTEXT ---\n{app_context}"

        chat = LlmChat(
            api_key=api_key,
            session_id=f"devhelper_{session_id}",
            system_message=system_msg,
        )

        if model_route == "claude":
            chat.with_model("anthropic", "claude-sonnet-4-5-20250929")
            model_label = "Claude Sonnet 4.5"
        else:
            chat.with_model("openai", "gpt-4o")
            model_label = "GPT-4o"

        # Build conversation context as a single prompt with history
        history_text = ""
        for msg in history[:-1]:  # exclude current message (already in prompt)
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"\n{role}: {msg['content']}\n"

        full_prompt = message
        if history_text:
            full_prompt = f"[Previous conversation]\n{history_text}\n[Current message]\n{message}"

        user_message = UserMessage(text=full_prompt)
        response_text = await chat.send_message(user_message)

        # Save assistant message
        assistant_msg_doc = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "role": "assistant",
            "content": response_text,
            "model": model_route,
            "model_label": model_label,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db[AI_MESSAGES_COLLECTION].insert_one(assistant_msg_doc)
        assistant_msg_doc.pop("_id", None)

        # Update session timestamp
        await db[AI_SESSIONS_COLLECTION].update_one(
            {"id": session_id},
            {"$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "title": message[:80]}}
        )

        return {
            "session_id": session_id,
            "response": response_text,
            "model": model_label,
            "model_route": model_route,
        }
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")
    except Exception as e:
        logger.error(f"AI Helper error: {e}")
        raise HTTPException(status_code=500, detail=f"AI error: {str(e)}")


@router.get("/ai-helper/sessions")
async def get_ai_sessions(admin: dict = Depends(get_admin_user)):
    """List AI chat sessions."""
    sessions = await db[AI_SESSIONS_COLLECTION].find(
        {}, {"_id": 0}
    ).sort("updated_at", -1).to_list(50)
    return {"sessions": sessions}


@router.get("/ai-helper/sessions/{session_id}")
async def get_ai_session_messages(session_id: str, admin: dict = Depends(get_admin_user)):
    """Get all messages for a session."""
    messages = await db[AI_MESSAGES_COLLECTION].find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return {"messages": messages, "session_id": session_id}


@router.delete("/ai-helper/sessions/{session_id}")
async def delete_ai_session(session_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a chat session and its messages."""
    await db[AI_SESSIONS_COLLECTION].delete_one({"id": session_id})
    await db[AI_MESSAGES_COLLECTION].delete_many({"session_id": session_id})
    return {"success": True}


# ============== QUICK ACTIONS ==============

@router.post("/ai-helper/quick-action")
async def ai_quick_action(data: dict, admin: dict = Depends(get_admin_user)):
    """Run a predefined AI analysis action."""
    action = data.get("action", "")
    prompts = {
        "health_check": "Run a comprehensive health check of the ChiPi Link app. Check: 1) All MongoDB collections have data, 2) Key collections (auth_users, chipi_transactions, roles) are healthy, 3) Module count is correct, 4) API endpoint coverage looks good. Provide a summary with OK/WARNING/CRITICAL ratings for each area.",
        "security_scan": "Perform a security audit of the ChiPi Link app. Analyze: 1) Authentication patterns (JWT, session management), 2) Are there any endpoints that might be unprotected? 3) Database security (are _id fields properly excluded?), 4) Environment variable management, 5) CORS configuration, 6) Any obvious vulnerabilities. Rate each area and suggest improvements.",
        "architecture_review": "Review the overall architecture of ChiPi Link. Evaluate: 1) Module organization and separation, 2) Code patterns consistency, 3) Database schema design, 4) Frontend component structure, 5) API design patterns. Identify strengths and areas for improvement. Suggest refactoring priorities.",
        "dependency_audit": "Audit the app's dependencies. Check: 1) Are there any known security concerns with the tech stack (FastAPI, Motor, React)? 2) Are we using too many dependencies? 3) Any potential compatibility issues? 4) Suggest which packages could be updated or removed.",
    }
    prompt = prompts.get(action)
    if not prompt:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")

    # Delegate to the chat endpoint
    return await ai_helper_chat({"message": prompt, "session_id": ""}, admin)
