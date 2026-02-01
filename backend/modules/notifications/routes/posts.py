"""
Posts/Announcements API Routes
"""
from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import Optional, List
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.notifications.services.post_service import post_service

router = APIRouter(prefix="/posts", tags=["Posts"])


# ============== PYDANTIC MODELS ==============

class ContentBlock(BaseModel):
    type: str
    content: Optional[str] = None
    url: Optional[str] = None
    caption: Optional[dict] = None
    items: Optional[List[str]] = None
    style: Optional[dict] = None
    text: Optional[dict] = None
    author: Optional[str] = None
    icon: Optional[str] = None
    provider: Optional[str] = None
    alt: Optional[str] = None
    thumbnail: Optional[str] = None


class CreatePostRequest(BaseModel):
    title: dict  # {"es": "...", "en": "...", "zh": "..."}
    summary: Optional[dict] = {}
    content_blocks: List[ContentBlock]
    cover_image: Optional[str] = None
    category_id: str = "cat_announcements"
    tags: List[str] = []
    target_audience: str = "all"
    target_user_types: List[str] = []
    send_notification: bool = True
    scheduled_at: Optional[str] = None


class UpdatePostRequest(BaseModel):
    title: Optional[dict] = None
    summary: Optional[dict] = None
    content_blocks: Optional[List[ContentBlock]] = None
    cover_image: Optional[str] = None
    tags: Optional[List[str]] = None
    target_audience: Optional[str] = None
    send_notification: Optional[bool] = None
    scheduled_at: Optional[str] = None


# ============== PUBLIC ENDPOINTS ==============

@router.get("/")
async def get_posts(
    category_id: Optional[str] = None,
    tags: Optional[str] = None,
    limit: int = Query(20, le=100),
    offset: int = Query(0, ge=0)
):
    """Obtener posts publicados"""
    tag_list = tags.split(",") if tags else None
    
    posts = await post_service.get_posts(
        category_id=category_id,
        tags=tag_list,
        limit=limit,
        offset=offset,
        published_only=True
    )
    
    return {
        "success": True,
        "posts": posts,
        "count": len(posts)
    }


@router.get("/{post_id}")
async def get_post(post_id: str):
    """Obtener un post específico"""
    post = await post_service.get_post(post_id)
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Incrementar vistas
    await post_service.increment_views(post_id)
    
    return {"success": True, "post": post}


@router.post("/{post_id}/like")
async def like_post(
    post_id: str,
    user=Depends(get_current_user)
):
    """Dar like a un post"""
    post = await post_service.like_post(post_id, user["user_id"])
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True, "likes": post.get("likes", 0)}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/all")
async def admin_get_all_posts(
    status: Optional[str] = None,
    category_id: Optional[str] = None,
    author_id: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    admin=Depends(get_admin_user)
):
    """Obtener todos los posts (admin)"""
    posts = await post_service.get_posts(
        status=status,
        category_id=category_id,
        author_id=author_id,
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "posts": posts,
        "count": len(posts)
    }


@router.post("/admin/create")
async def create_post(
    data: CreatePostRequest,
    admin=Depends(get_admin_user)
):
    """Crear un nuevo post (admin)"""
    blocks = [b.model_dump() for b in data.content_blocks]
    
    post = await post_service.create_post(
        title=data.title,
        summary=data.summary,
        content_blocks=blocks,
        author_id=admin["user_id"],
        category_id=data.category_id,
        cover_image=data.cover_image,
        tags=data.tags,
        target_audience=data.target_audience,
        target_user_types=data.target_user_types,
        send_notification=data.send_notification,
        scheduled_at=data.scheduled_at
    )
    
    return {"success": True, "post": post}


@router.put("/admin/{post_id}")
async def update_post(
    post_id: str,
    data: UpdatePostRequest,
    admin=Depends(get_admin_user)
):
    """Actualizar un post (admin)"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "content_blocks" in updates:
        updates["content_blocks"] = [b if isinstance(b, dict) else b.model_dump() for b in updates["content_blocks"]]
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    post = await post_service.update_post(post_id, updates)
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True, "post": post}


@router.post("/admin/{post_id}/publish")
async def publish_post(
    post_id: str,
    send_notification: bool = Query(True),
    admin=Depends(get_admin_user)
):
    """Publicar un post (admin)"""
    post = await post_service.publish_post(
        post_id=post_id,
        send_notification=send_notification
    )
    
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True, "post": post}


@router.delete("/admin/{post_id}")
async def delete_post(
    post_id: str,
    admin=Depends(get_admin_user)
):
    """Eliminar un post (admin)"""
    success = await post_service.delete_post(post_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"success": True, "message": "Post deleted"}


# ============== MEDIA ==============

@router.get("/admin/media")
async def get_media_library(
    file_type: Optional[str] = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    admin=Depends(get_admin_user)
):
    """Obtener biblioteca de media (admin)"""
    media = await post_service.get_media_library(
        file_type=file_type,
        uploaded_by=admin["user_id"],
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "media": media,
        "count": len(media)
    }


@router.post("/admin/media/register")
async def register_media(
    file_url: str = Query(...),
    file_type: str = Query(...),
    file_name: str = Query(...),
    file_size: int = Query(...),
    post_id: Optional[str] = None,
    admin=Depends(get_admin_user)
):
    """Registrar media subido (admin)"""
    media = await post_service.upload_media(
        file_url=file_url,
        file_type=file_type,
        file_name=file_name,
        file_size=file_size,
        uploaded_by=admin["user_id"],
        post_id=post_id
    )
    
    return {"success": True, "media": media}


# ============== SCHEDULED ==============

@router.get("/admin/scheduled")
async def get_scheduled_posts(admin=Depends(get_admin_user)):
    """Obtener posts programados (admin)"""
    posts = await post_service.get_posts(status="scheduled")
    return {
        "success": True,
        "posts": posts,
        "count": len(posts)
    }


@router.post("/admin/scheduled/process")
async def process_scheduled_posts(admin=Depends(get_admin_user)):
    """Procesar posts programados pendientes (admin)"""
    result = await post_service.process_scheduled_posts()
    return {"success": True, "result": result}


# ============== INTEGRATIONS (PLACEHOLDERS) ==============

@router.post("/admin/import/monday")
async def import_from_monday(
    board_id: str = Query(...),
    item_id: str = Query(...),
    admin=Depends(get_admin_user)
):
    """[PLACEHOLDER] Importar desde Monday.com (admin)"""
    result = await post_service.import_from_monday(
        board_id=board_id,
        item_id=item_id,
        author_id=admin["user_id"]
    )
    return result


@router.post("/admin/import/fusebase")
async def import_from_fusebase(
    document_id: str = Query(...),
    admin=Depends(get_admin_user)
):
    """[PLACEHOLDER] Importar desde Fusebase (admin)"""
    result = await post_service.import_from_fusebase(
        document_id=document_id,
        author_id=admin["user_id"]
    )
    return result


@router.post("/admin/sync/crm")
async def sync_crm_content(admin=Depends(get_admin_user)):
    """[PLACEHOLDER] Sincronizar contenido desde CRM (admin)"""
    result = await post_service.sync_crm_scheduled_content()
    return result
