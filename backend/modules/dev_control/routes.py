"""
Dev Control Module - Architecture introspection, endpoint discovery, annotations CRUD
Admin-only endpoints for the Development Control panel.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import os
import logging

from core.database import db
from core.auth import get_admin_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dev-control", tags=["Dev Control"])

COLLECTION = "dev_annotations"


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
    # Filter out noise
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
    """Return file tree of backend and frontend src."""
    backend_tree = _scan_tree("/app/backend", "backend", max_depth=3)
    frontend_tree = _scan_tree("/app/frontend/src", "frontend/src", max_depth=3)
    return {
        "backend": backend_tree,
        "frontend": frontend_tree,
    }


# ============== ENDPOINT DISCOVERY ==============

@router.get("/endpoints")
async def get_endpoints(admin: dict = Depends(get_admin_user)):
    """Return all registered API routes grouped by tag."""
    from main import app as main_app
    groups = {}
    for route in main_app.routes:
        methods = getattr(route, "methods", None)
        path = getattr(route, "path", None)
        if not path or not methods:
            continue
        if not path.startswith("/api"):
            continue
        tags = getattr(route, "tags", None) or ["Other"]
        tag = tags[0] if tags else "Other"
        if tag not in groups:
            groups[tag] = []
        summary = getattr(route, "summary", None) or getattr(route, "name", "")
        for method in methods:
            if method in ("HEAD", "OPTIONS"):
                continue
            groups[tag].append({
                "method": method,
                "path": path,
                "summary": summary,
            })
    # Sort groups
    sorted_groups = {}
    for key in sorted(groups.keys()):
        sorted_groups[key] = sorted(groups[key], key=lambda x: x["path"])
    return {"groups": sorted_groups, "total": sum(len(v) for v in sorted_groups.values())}


# ============== MODULES INFO ==============

@router.get("/modules")
async def get_modules(admin: dict = Depends(get_admin_user)):
    """Return structured module info for the Dev Control panel."""
    modules = [
        {
            "id": "auth",
            "name": "Authentication",
            "status": "active",
            "description": "JWT + session auth, Google OAuth, role-based access control",
            "path": "backend/modules/auth",
            "endpoints": ["/api/auth/login", "/api/auth/register", "/api/auth/me"],
        },
        {
            "id": "store",
            "name": "Store / Unatienda",
            "status": "active",
            "description": "Product catalog, categories, orders, inventory, student textbook system",
            "path": "backend/modules/store",
            "endpoints": ["/api/store/products", "/api/store/orders", "/api/store/categories"],
        },
        {
            "id": "users",
            "name": "Users & Wallet",
            "status": "active",
            "description": "User profiles, ChiPi Wallet, connections (vinculaciones), transfers",
            "path": "backend/modules/users",
            "endpoints": ["/api/users", "/api/wallet/balance", "/api/wallet/transactions"],
        },
        {
            "id": "community",
            "name": "Community",
            "status": "active",
            "description": "Posts, events, gallery, Telegram feed integration",
            "path": "backend/modules/community",
            "endpoints": ["/api/community/posts", "/api/community/events"],
        },
        {
            "id": "pinpanclub",
            "name": "PinPanClub",
            "status": "active",
            "description": "Table tennis club - players, matches, tournaments, rankings, seasons",
            "path": "backend/modules/pinpanclub",
            "endpoints": ["/api/pinpanclub/players", "/api/pinpanclub/matches"],
        },
        {
            "id": "roles",
            "name": "Roles & Permissions",
            "status": "active",
            "description": "RBAC system with granular permissions, role assignment, overrides",
            "path": "backend/modules/roles",
            "endpoints": ["/api/roles", "/api/roles/permissions"],
        },
        {
            "id": "integrations",
            "name": "Integrations",
            "status": "active",
            "description": "Monday.com 2-way sync, Google Sheets, external webhooks",
            "path": "backend/modules/integrations",
            "endpoints": ["/api/monday/sync", "/api/monday/webhook"],
        },
        {
            "id": "translations",
            "name": "Translations / i18n",
            "status": "active",
            "description": "Dictionary manager, coverage stats, auto-translate (GPT-4o)",
            "path": "backend/modules/translations",
            "endpoints": ["/api/translations/admin/coverage", "/api/translations/admin/auto-translate"],
        },
        {
            "id": "notifications",
            "name": "Notifications",
            "status": "active",
            "description": "Push notifications (OneSignal placeholder), in-app posts",
            "path": "backend/modules/notifications",
            "endpoints": ["/api/notifications"],
        },
        {
            "id": "membership",
            "name": "Memberships",
            "status": "active",
            "description": "Plans, subscriptions, QR check-in, visit tracking",
            "path": "backend/routes/membership.py",
            "endpoints": ["/api/memberships", "/api/memberships/plans"],
        },
        {
            "id": "landing",
            "name": "Landing Page Builder",
            "status": "active",
            "description": "Configurable landing page sections, dynamic content",
            "path": "backend/modules/landing",
            "endpoints": ["/api/landing/config"],
        },
        {
            "id": "widget",
            "name": "Embeddable Widget",
            "status": "active",
            "description": "Embeddable order form and wallet widget for external sites",
            "path": "backend/modules/widget",
            "endpoints": ["/api/widget/config"],
        },
        {
            "id": "dev_control",
            "name": "Dev Control",
            "status": "active",
            "description": "Architecture introspection, API reference, dev annotations",
            "path": "backend/modules/dev_control",
            "endpoints": ["/api/dev-control/architecture", "/api/dev-control/endpoints"],
        },
    ]
    return {"modules": modules}


# ============== PRINCIPLES ==============

@router.get("/principles")
async def get_principles(admin: dict = Depends(get_admin_user)):
    """Return architectural principles and dev guidelines."""
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
                {"title": "LLM (OpenAI)", "detail": "GPT-4o via emergentintegrations. EMERGENT_LLM_KEY from env. Used for auto-translate."},
            ],
        },
    ]
    return {"principles": principles}


# ============== ROADMAP ==============

@router.get("/roadmap")
async def get_roadmap(admin: dict = Depends(get_admin_user)):
    """Return roadmap items. Reads from DB if persisted, otherwise defaults."""
    items = await db[COLLECTION.replace("annotations", "roadmap")].find(
        {}, {"_id": 0}
    ).sort("priority", 1).to_list(200)
    if not items:
        # Seed defaults from PRD
        items = [
            {"id": str(uuid.uuid4()), "priority": "P0", "title": "Dev Control Section", "status": "done", "description": "Architecture visualization, API reference, annotations"},
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
    """Update a roadmap item's status or description."""
    update_fields = {}
    for field in ["status", "description", "title", "priority"]:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")
    result = await db["dev_roadmap"].update_one(
        {"id": item_id}, {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    return {"success": True}


# ============== ANNOTATIONS CRUD ==============

@router.get("/annotations")
async def get_annotations(admin: dict = Depends(get_admin_user)):
    """Get all dev annotations, newest first."""
    items = await db[COLLECTION].find(
        {}, {"_id": 0}
    ).sort("created_at", -1).to_list(500)
    return {"annotations": items}


@router.post("/annotations")
async def create_annotation(data: dict, admin: dict = Depends(get_admin_user)):
    """Create a new dev annotation."""
    title = data.get("title", "").strip()
    content = data.get("content", "").strip()
    category = data.get("category", "general")
    pin = data.get("pinned", False)
    if not content:
        raise HTTPException(status_code=400, detail="Content is required")
    doc = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "category": category,
        "pinned": pin,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email", "admin"),
    }
    await db[COLLECTION].insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/annotations/{annotation_id}")
async def update_annotation(annotation_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update an annotation."""
    update_fields = {}
    for field in ["title", "content", "category", "pinned"]:
        if field in data:
            update_fields[field] = data[field]
    if not update_fields:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_fields["updated_by"] = admin.get("email", "admin")
    result = await db[COLLECTION].update_one(
        {"id": annotation_id}, {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}


@router.delete("/annotations/{annotation_id}")
async def delete_annotation(annotation_id: str, admin: dict = Depends(get_admin_user)):
    """Delete an annotation."""
    result = await db[COLLECTION].delete_one({"id": annotation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Annotation not found")
    return {"success": True}
