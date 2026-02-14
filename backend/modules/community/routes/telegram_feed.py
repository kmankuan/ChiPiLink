"""
Community Feed API Routes
Serves Telegram channel content with likes and comments.
Includes role-based visibility controls.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from core.auth import get_current_user, get_admin_user, get_user_permissions, check_permission_match
from core.database import db
from modules.community.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feed", tags=["Community Feed"])


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
async def get_recent_posts_public(limit: int = 5):
    """Public: Get latest posts for landing page preview (no auth required)."""
    posts = await db.community_posts.find(
        {}, {"_id": 0}
    ).sort("date", -1).limit(min(limit, 10)).to_list(None)
    total = await db.community_posts.count_documents({})
    return {"posts": posts, "total": total}




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
