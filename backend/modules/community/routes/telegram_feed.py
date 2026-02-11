"""
Community Feed API Routes
Serves Telegram channel content with likes and comments.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel
from core.auth import get_current_user, get_admin_user
from core.database import db
from modules.community.services.telegram_service import telegram_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/community", tags=["Community"])


# ---- Feed ----


@router.get("/posts")
async def get_posts(
    page: int = 1,
    limit: int = 20,
    user=Depends(get_current_user)
):
    """Get paginated feed of community posts"""
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
        liked_ids = {l["post_msg_id"] for l in user_likes}

        for p in posts:
            p["liked_by_me"] = p.get("telegram_msg_id") in liked_ids

    return {"posts": posts, "total": total, "page": page, "limit": limit}


# ---- Media Proxy ----


@router.get("/media/{file_id}")
async def proxy_media(file_id: str, user=Depends(get_current_user)):
    """Proxy media files from Telegram CDN"""
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
        "last_update_id": config.get("last_update_id", 0)
    }
