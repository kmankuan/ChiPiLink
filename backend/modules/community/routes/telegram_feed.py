"""
Community Feed API Routes
Serves Telegram channel content with likes and comments.
Includes role-based visibility controls and multi-container feed system.
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from core.auth import get_current_user, get_admin_user, get_user_permissions, check_permission_match
from core.database import db
from modules.community.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feed", tags=["Community Feed"])


# ---- Helper: Group posts by media_group_id ----

def _group_posts_by_media(posts: list) -> list:
    """Merge posts sharing the same media_group_id into a single album post."""
    grouped = []
    media_groups = {}  # media_group_id -> index in grouped

    for post in posts:
        mg_id = post.get("media_group_id")
        if mg_id and mg_id in media_groups:
            # Append media to existing album
            idx = media_groups[mg_id]
            grouped[idx]["media"].extend(post.get("media", []))
            # Use text from whichever post has it
            if not grouped[idx].get("text") and post.get("text"):
                grouped[idx]["text"] = post["text"]
        elif mg_id:
            # First post in this media group
            media_groups[mg_id] = len(grouped)
            grouped.append({**post, "is_album": True})
        else:
            # Standalone post
            grouped.append({**post, "is_album": False})

    return grouped


# ---- Visibility Check Helper ----

async def _check_feed_access(user: dict) -> bool:
    """Check if user has access to the community feed based on visibility settings."""
    # Admins always have access
    if user.get("is_admin"):
        return True

    config = await telegram_service.get_config()
    visibility = config.get("visibility", "all_users")

    if visibility == "all_users":
        return True

    if visibility == "admin_only":
        return False

    if visibility == "specific_roles":
        allowed_roles = config.get("allowed_roles", [])
        if not allowed_roles:
            return True  # No roles specified = allow all

        # Get user's role
        user_role = await db.user_roles.find_one({"user_id": user["user_id"]}, {"_id": 0})
        role_id = user_role.get("role_id") if user_role else "user"
        return role_id in allowed_roles

    return True


# ---- Feed Access Check ----

@router.get("/access")
async def check_access(user=Depends(get_current_user)):
    """Check if current user can view the community feed."""
    has_access = await _check_feed_access(user)
    config = await telegram_service.get_config()
    return {
        "has_access": has_access,
        "visibility": config.get("visibility", "all_users"),
        "is_admin": user.get("is_admin", False),
    }


# ---- Feed ----


@router.get("/posts")
async def get_posts(
    page: int = 1,
    limit: int = 20,
    user=Depends(get_current_user)
):
    """Get paginated feed of community posts (respects visibility settings)"""
    # Check visibility access
    has_access = await _check_feed_access(user)
    if not has_access:
        return {"posts": [], "total": 0, "page": page, "limit": limit, "access_denied": True}

    user_id = user["user_id"]
    skip = (page - 1) * limit

    cursor = db.community_posts.find(
        {}, {"_id": 0}
    ).sort("date", -1).skip(skip).limit(limit)
    posts = await cursor.to_list(length=limit)

    total = await db.community_posts.count_documents({})

    # Enrich with user's like status
    if posts:
        msg_ids = [p.get("telegram_msg_id") for p in posts]
        user_likes = await db.community_likes.find(
            {"user_id": user_id, "post_msg_id": {"$in": msg_ids}},
            {"_id": 0, "post_msg_id": 1}
        ).to_list(length=len(msg_ids))
        liked_ids = {lk["post_msg_id"] for lk in user_likes}

        for p in posts:
            p["liked_by_me"] = p.get("telegram_msg_id") in liked_ids

    return {"posts": posts, "total": total, "page": page, "limit": limit}

# ---- Public Feed Preview (no auth) ----

@router.get("/public/recent")
async def get_recent_posts_public(limit: int = 5, channel_id: Optional[int] = None):
    """Public: Get latest posts for landing page preview (no auth required).
    Groups posts with the same media_group_id into albums."""
    query = {}
    if channel_id:
        query["channel_id"] = channel_id
    # Fetch more than limit to account for grouping
    raw_posts = await db.community_posts.find(
        query, {"_id": 0}
    ).sort("date", -1).limit(min(limit * 3, 30)).to_list(None)
    total = await db.community_posts.count_documents(query)
    grouped = _group_posts_by_media(raw_posts)
    return {"posts": grouped[:limit], "total": total}


# ---- Feed Containers (Multi-channel support) ----

DEFAULT_CONTAINER = {
    "title": "Community Channel",
    "subtitle": "Latest updates",
    "channel_id": None,
    "post_limit": 5,
    "bg_color": "#ffffff",
    "accent_color": "#0088cc",
    "header_bg": "#E8F4FE",
    "icon_color": "#0088cc",
    "card_style": "compact",  # compact | expanded | minimal
    "show_footer": True,
    "cta_text": "Open Community Feed",
    "cta_link": "/comunidad",
    "border_radius": "2xl",
    "show_post_count": True,
    "show_media_count": True,
    "order": 0,
    "is_active": True,
}


@router.get("/public/containers")
async def get_public_containers():
    """Public: Get all active feed containers with their recent posts."""
    containers = await db.telegram_feed_containers.find(
        {"is_active": True}, {"_id": 0}
    ).sort("order", 1).to_list(20)

    if not containers:
        # Return default container if none configured
        config = await telegram_service.get_config()
        containers = [{
            **DEFAULT_CONTAINER,
            "container_id": "default",
            "channel_id": config.get("channel_id"),
            "title": config.get("channel_title") or "Community Channel",
        }]

    result = []
    for container in containers:
        limit = container.get("post_limit", 5)
        query = {}
        if container.get("channel_id"):
            query["channel_id"] = container["channel_id"]
        raw_posts = await db.community_posts.find(
            query, {"_id": 0}
        ).sort("date", -1).limit(min(limit * 3, 30)).to_list(None)
        total = await db.community_posts.count_documents(query)
        grouped = _group_posts_by_media(raw_posts)
        result.append({
            **container,
            "posts": grouped[:limit],
            "total_posts": total,
        })

    return {"containers": result}


class ContainerCreate(BaseModel):
    title: str = "New Feed"
    subtitle: str = "Latest updates"
    channel_id: Optional[int] = None
    post_limit: int = 5
    bg_color: str = "#ffffff"
    accent_color: str = "#0088cc"
    header_bg: str = "#E8F4FE"
    icon_color: str = "#0088cc"
    card_style: str = "compact"
    show_footer: bool = True
    cta_text: str = "Open Community Feed"
    cta_link: str = "/comunidad"
    border_radius: str = "2xl"
    show_post_count: bool = True
    show_media_count: bool = True
    is_active: bool = True


class ContainerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    channel_id: Optional[int] = None
    post_limit: Optional[int] = None
    bg_color: Optional[str] = None
    accent_color: Optional[str] = None
    header_bg: Optional[str] = None
    icon_color: Optional[str] = None
    card_style: Optional[str] = None
    show_footer: Optional[bool] = None
    cta_text: Optional[str] = None
    cta_link: Optional[str] = None
    border_radius: Optional[str] = None
    show_post_count: Optional[bool] = None
    show_media_count: Optional[bool] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


@router.get("/admin/containers")
async def get_admin_containers(admin=Depends(get_admin_user)):
    """Admin: List all feed containers."""
    containers = await db.telegram_feed_containers.find(
        {}, {"_id": 0}
    ).sort("order", 1).to_list(50)
    return {"containers": containers}


@router.post("/admin/containers")
async def create_container(data: ContainerCreate, admin=Depends(get_admin_user)):
    """Admin: Create a new feed container."""
    count = await db.telegram_feed_containers.count_documents({})
    doc = {
        "container_id": str(uuid.uuid4())[:8],
        **data.model_dump(),
        "order": count,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin.get("email", "admin"),
    }
    await db.telegram_feed_containers.insert_one(doc)
    del doc["_id"]
    return {"success": True, "container": doc}


@router.put("/admin/containers/{container_id}")
async def update_container(container_id: str, data: ContainerUpdate, admin=Depends(get_admin_user)):
    """Admin: Update a feed container."""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if not updates:
        return {"success": True}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.telegram_feed_containers.update_one(
        {"container_id": container_id}, {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Container not found")
    return {"success": True}


@router.delete("/admin/containers/{container_id}")
async def delete_container(container_id: str, admin=Depends(get_admin_user)):
    """Admin: Delete a feed container."""
    result = await db.telegram_feed_containers.delete_one({"container_id": container_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Container not found")
    return {"success": True}


@router.post("/admin/containers/reorder")
async def reorder_containers(data: dict, admin=Depends(get_admin_user)):
    """Admin: Reorder containers. Expects {'order': ['id1', 'id2', ...]}"""
    order_list = data.get("order", [])
    for idx, cid in enumerate(order_list):
        await db.telegram_feed_containers.update_one(
            {"container_id": cid}, {"$set": {"order": idx}}
        )
    return {"success": True}




# ---- Media Proxy ----


@router.get("/media/{file_id}")
async def proxy_media(file_id: str):
    """Proxy media files from Telegram CDN (public — file IDs are unguessable)"""
    import httpx

    url = await telegram_service.get_file(file_id)
    if not url:
        raise HTTPException(status_code=404, detail="File not found")

    async with httpx.AsyncClient() as client:
        r = await client.get(url, timeout=30)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="Failed to fetch media")

        content_type = r.headers.get("content-type", "application/octet-stream")
        return Response(
            content=r.content,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"}
        )


# ---- Likes ----


@router.post("/posts/{msg_id}/like")
async def toggle_like(msg_id: int, user=Depends(get_current_user)):
    """Toggle like on a post"""
    user_id = user["user_id"]

    existing = await db.community_likes.find_one(
        {"user_id": user_id, "post_msg_id": msg_id}
    )

    if existing:
        await db.community_likes.delete_one({"_id": existing["_id"]})
        await db.community_posts.update_one(
            {"telegram_msg_id": msg_id},
            {"$inc": {"likes_count": -1}}
        )
        return {"liked": False}
    else:
        await db.community_likes.insert_one({
            "user_id": user_id,
            "post_msg_id": msg_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        await db.community_posts.update_one(
            {"telegram_msg_id": msg_id},
            {"$inc": {"likes_count": 1}}
        )
        return {"liked": True}


# ---- Comments ----


class CommentRequest(BaseModel):
    text: str


@router.get("/posts/{msg_id}/comments")
async def get_comments(msg_id: int, user=Depends(get_current_user)):
    """Get comments for a post"""
    cursor = db.community_comments.find(
        {"post_msg_id": msg_id}, {"_id": 0}
    ).sort("created_at", 1)
    comments = await cursor.to_list(length=200)
    return {"comments": comments}


@router.post("/posts/{msg_id}/comments")
async def add_comment(
    msg_id: int,
    data: CommentRequest,
    user=Depends(get_current_user)
):
    """Add a comment to a post"""
    if not data.text.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    comment = {
        "post_msg_id": msg_id,
        "user_id": user["user_id"],
        "user_name": user.get("name", user.get("email", "")),
        "text": data.text.strip(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.community_comments.insert_one(comment)
    del comment["_id"]  # Remove ObjectId before returning

    await db.community_posts.update_one(
        {"telegram_msg_id": msg_id},
        {"$inc": {"comments_count": 1}}
    )

    return {"comment": comment}


# ---- Admin ----


@router.post("/admin/sync")
async def admin_sync(admin=Depends(get_admin_user)):
    """Manually trigger a sync from Telegram"""
    result = await telegram_service.sync_once()
    return {"success": True, **result}


@router.get("/admin/config")
async def get_config(admin=Depends(get_admin_user)):
    """Get community/Telegram config"""
    config = await telegram_service.get_config()
    bot_info = await telegram_service.get_me()
    return {"config": config, "bot": bot_info}


class ConfigUpdateRequest(BaseModel):
    channel_id: Optional[int] = None
    channel_title: Optional[str] = None
    auto_sync: Optional[bool] = None
    poll_interval: Optional[int] = None
    visibility: Optional[str] = None
    allowed_roles: Optional[List[str]] = None


@router.put("/admin/config")
async def update_config(
    data: ConfigUpdateRequest,
    admin=Depends(get_admin_user)
):
    """Update community/Telegram config"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        config = await telegram_service.get_config()
        config.update(updates)
        await telegram_service.save_config(config)
    return {"success": True}


@router.get("/admin/stats")
async def get_stats(admin=Depends(get_admin_user)):
    """Get community feed stats"""
    total_posts = await db.community_posts.count_documents({})
    total_likes = await db.community_likes.count_documents({})
    total_comments = await db.community_comments.count_documents({})
    config = await telegram_service.get_config()

    return {
        "total_posts": total_posts,
        "total_likes": total_likes,
        "total_comments": total_comments,
        "channel_id": config.get("channel_id"),
        "channel_title": config.get("channel_title", ""),
        "auto_sync": config.get("auto_sync", True),
        "last_update_id": config.get("last_update_id", 0),
        "visibility": config.get("visibility", "all_users"),
        "allowed_roles": config.get("allowed_roles", []),
    }


@router.get("/admin/visibility")
async def get_visibility(admin=Depends(get_admin_user)):
    """Get current visibility settings for the community feed."""
    config = await telegram_service.get_config()
    roles = await db.roles.find({}, {"_id": 0, "role_id": 1, "nombre": 1, "descripcion": 1, "color": 1}).to_list(50)
    return {
        "visibility": config.get("visibility", "all_users"),
        "allowed_roles": config.get("allowed_roles", []),
        "available_roles": [{"role_id": r["role_id"], "name": r.get("nombre", r["role_id"]), "description": r.get("descripcion", ""), "color": r.get("color", "#6366f1")} for r in roles],
    }


class VisibilityUpdateRequest(BaseModel):
    visibility: str  # all_users, admin_only, specific_roles
    allowed_roles: Optional[List[str]] = None


@router.put("/admin/visibility")
async def update_visibility(data: VisibilityUpdateRequest, admin=Depends(get_admin_user)):
    """Update feed visibility settings."""
    if data.visibility not in ("all_users", "admin_only", "specific_roles"):
        raise HTTPException(status_code=400, detail="Invalid visibility mode")

    config = await telegram_service.get_config()
    config["visibility"] = data.visibility
    config["allowed_roles"] = data.allowed_roles or []
    config["visibility_updated_at"] = datetime.now(timezone.utc).isoformat()
    config["visibility_updated_by"] = admin.get("email", "admin")
    await telegram_service.save_config(config)

    return {
        "success": True,
        "visibility": config["visibility"],
        "allowed_roles": config["allowed_roles"],
    }
