"""
Community Module - Post Routes
Endpoints para posts usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_admin_user, get_optional_user
from ..models import Post, PostCreate, PostUpdate, Comment, CommentCreate
from ..services import post_service

router = APIRouter(prefix="/posts", tags=["Community - Posts"])


@router.get("", response_model=List[Post])
async def get_posts(
    tipo: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = Query(20, ge=1, le=100)
):
    """Get posts publicados"""
    return await post_service.get_published_posts(
        tipo=tipo,
        destacado=destacado,
        limit=limit
    )


@router.get("/{post_id}", response_model=Post)
async def get_post(post_id: str):
    """Get post by ID (incrementa vistas)"""
    post = await post_service.get_post(post_id, increment_views=True)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/{post_id}/like")
async def like_post(post_id: str):
    """Give like a un post"""
    success = await post_service.like_post(post_id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True}


@router.get("/{post_id}/comments", response_model=List[Comment])
async def get_post_comments(post_id: str):
    """Get comentarios de un post"""
    return await post_service.get_post_comments(post_id)


@router.post("/{post_id}/comments", response_model=Comment)
async def add_comment(
    post_id: str,
    data: CommentCreate,
    user: Optional[dict] = Depends(get_optional_user)
):
    """Agregar comentario a un post"""
    try:
        usuario_id = user.get("user_id") if user else None
        if user and not data.name_usuario:
            data.name_usuario = user.get("name", "Anonymous")
        return await post_service.add_comment(post_id, data, usuario_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ADMIN ROUTES ==============

@router.get("/admin/all", response_model=List[Post])
async def get_all_posts(
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """Get todos los posts (admin)"""
    return await post_service.get_all_posts(limit=limit)


@router.post("/admin", response_model=Post)
async def create_post(
    data: PostCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nuevo post (admin)"""
    return await post_service.create_post(data, creado_por=admin.get("user_id"))


@router.put("/admin/{post_id}", response_model=Post)
async def update_post(
    post_id: str,
    data: PostUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update post (admin)"""
    post = await post_service.update_post(post_id, data)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.delete("/admin/{post_id}")
async def delete_post(
    post_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete post (admin)"""
    success = await post_service.delete_post(post_id)
    if not success:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"success": True}
