"""
Archive Service — Generic soft-delete / archive / restore / permanent-delete
for any MongoDB collection. Used across Students, Orders, Alerts, Movements, etc.
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/archive", tags=["Archive"])

db = None
_get_admin_user_func = None

# Mapping of entity types to their collection + id field
ENTITY_CONFIG = {
    "students": {"collection": "store_students", "id_field": "student_id"},
    "orders": {"collection": "store_textbook_orders", "id_field": "order_id"},
    "store_orders": {"collection": "store_orders", "id_field": "order_id"},
    "movements": {"collection": "stock_orders", "id_field": "order_id"},
    "alerts": {"collection": "sysbook_alerts", "id_field": "alert_id"},
    "print_jobs": {"collection": "print_jobs", "id_field": "job_id"},
    "products": {"collection": "store_products", "id_field": "product_id"},
    "schools": {"collection": "store_schools", "id_field": "school_id"},
}


def init_archive_routes(_db, _get_admin_user):
    global db, _get_admin_user_func
    db = _db
    _get_admin_user_func = _get_admin_user


async def get_admin_user_wrapper():
    """Async wrapper that calls the actual get_admin_user dependency"""
    # Import and use the core auth directly to avoid late-binding issues
    from core.auth import get_admin_user as auth_get_admin
    from fastapi import Request
    from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
    
    # This is a workaround - we can't easily inject sub-dependencies here
    # Return a placeholder that allows the route to continue
    # The actual auth check happens via get_admin_user_func
    return _get_admin_user_func


class ArchiveRequest(BaseModel):
    ids: List[str]


class PermanentDeleteRequest(BaseModel):
    ids: List[str]


def _get_config(entity_type: str):
    cfg = ENTITY_CONFIG.get(entity_type)
    if not cfg:
        raise HTTPException(400, f"Unknown entity type: {entity_type}")
    return cfg


# Import auth directly to use proper dependency resolution
from core.auth import get_admin_user


@router.get("/{entity_type}")
async def get_archived(entity_type: str, admin: dict = Depends(get_admin_user)):
    """Get all archived items for an entity type"""
    cfg = _get_config(entity_type)
    items = await db[cfg["collection"]].find(
        {"archived": True}, {"_id": 0}
    ).sort("archived_at", -1).to_list(500)
    return {"items": items, "count": len(items)}


@router.post("/{entity_type}/archive")
async def archive_items(entity_type: str, data: ArchiveRequest, admin: dict = Depends(get_admin_user)):
    """Soft-delete: move items to archive"""
    cfg = _get_config(entity_type)
    now = datetime.now(timezone.utc).isoformat()

    result = await db[cfg["collection"]].update_many(
        {cfg["id_field"]: {"$in": data.ids}, "$or": [{"archived": {"$ne": True}}, {"archived": {"$exists": False}}]},
        {"$set": {"archived": True, "archived_at": now, "archived_by": admin.get("user_id", "admin")}}
    )

    logger.info(f"[archive] Archived {result.modified_count} {entity_type}: {data.ids}")
    return {"success": True, "archived_count": result.modified_count}


@router.post("/{entity_type}/restore")
async def restore_items(entity_type: str, data: ArchiveRequest, admin: dict = Depends(get_admin_user)):
    """Restore items from archive back to active"""
    cfg = _get_config(entity_type)

    result = await db[cfg["collection"]].update_many(
        {cfg["id_field"]: {"$in": data.ids}, "archived": True},
        {"$unset": {"archived": "", "archived_at": "", "archived_by": ""}}
    )

    logger.info(f"[archive] Restored {result.modified_count} {entity_type}: {data.ids}")
    return {"success": True, "restored_count": result.modified_count}


@router.post("/{entity_type}/permanent-delete")
async def permanent_delete(entity_type: str, data: PermanentDeleteRequest, admin: dict = Depends(get_admin_user)):
    """Permanently delete items (only from archive)"""
    cfg = _get_config(entity_type)

    # Safety: only allow permanent delete of archived items
    result = await db[cfg["collection"]].delete_many(
        {cfg["id_field"]: {"$in": data.ids}, "archived": True}
    )

    logger.info(f"[archive] Permanently deleted {result.deleted_count} {entity_type}: {data.ids}")
    return {"success": True, "deleted_count": result.deleted_count}


@router.get("/{entity_type}/counts")
async def get_archive_counts(entity_type: str, admin: dict = Depends(get_admin_user)):
    """Get active vs archived counts for an entity type"""
    cfg = _get_config(entity_type)
    active = await db[cfg["collection"]].count_documents(
        {"$or": [{"archived": {"$ne": True}}, {"archived": {"$exists": False}}]}
    )
    archived = await db[cfg["collection"]].count_documents({"archived": True})
    return {"active": active, "archived": archived}
