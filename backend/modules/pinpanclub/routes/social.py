"""
Social Features - API Routes
Seguimientos, comentarios, reacciones, notificaciones
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional

from ..models.social import (
    Follow, FollowCreate, FollowStats,
    Comment, CommentCreate, CommentUpdate,
    Reaction, ReactionCreate, ReactionSummary,
    ActivityFeedItem,
    Notification
)
from ..services.social_service import social_service

router = APIRouter(prefix="/social", tags=["Social"])


# ============== FOLLOWS ==============

@router.post("/follow", response_model=Follow)
async def follow_player(data: FollowCreate):
    """Seguir a un jugador"""
    try:
        return await social_service.follow_player(data.follower_id, data.following_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/follow")
async def unfollow_player(follower_id: str, following_id: str):
    """Dejar de seguir a un jugador"""
    success = await social_service.unfollow_player(follower_id, following_id)
    return {"success": success}


@router.get("/followers/{jugador_id}")
async def get_followers(jugador_id: str, limit: int = 50):
    """Obtener seguidores de un jugador"""
    followers = await social_service.get_followers(jugador_id, limit)
    return {"jugador_id": jugador_id, "followers": followers, "total": len(followers)}


@router.get("/following/{jugador_id}")
async def get_following(jugador_id: str, limit: int = 50):
    """Obtener a quiénes sigue un jugador"""
    following = await social_service.get_following(jugador_id, limit)
    return {"jugador_id": jugador_id, "following": following, "total": len(following)}


@router.get("/follow-stats/{jugador_id}", response_model=FollowStats)
async def get_follow_stats(jugador_id: str):
    """Obtener estadísticas de seguidores"""
    return await social_service.get_follow_stats(jugador_id)


@router.get("/is-following")
async def is_following(follower_id: str, following_id: str):
    """Verificar si un jugador sigue a otro"""
    result = await social_service.is_following(follower_id, following_id)
    return {"is_following": result}


# ============== COMMENTS ==============

@router.post("/comments", response_model=Comment)
async def create_comment(data: CommentCreate):
    """Crear un comentario"""
    return await social_service.create_comment(data)


@router.get("/comments/{target_type}/{target_id}")
async def get_comments(
    target_type: str,
    target_id: str,
    limit: int = Query(50, ge=1, le=100)
):
    """Obtener comentarios de un target (player o match)"""
    comments = await social_service.get_comments(target_id, target_type, limit)
    return {"target_id": target_id, "target_type": target_type, "comments": comments}


@router.put("/comments/{comment_id}", response_model=Comment)
async def update_comment(comment_id: str, data: CommentUpdate):
    """Actualizar comentario"""
    result = await social_service.update_comment(comment_id, data.content)
    if not result:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    return result


@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    """Eliminar comentario"""
    success = await social_service.delete_comment(comment_id)
    return {"success": success}


# ============== REACTIONS ==============

@router.post("/reactions", response_model=Reaction)
async def add_reaction(data: ReactionCreate):
    """Añadir o cambiar reacción"""
    try:
        return await social_service.add_reaction(data)
    except ValueError as e:
        # Reacción eliminada
        return {"message": str(e), "removed": True}


@router.get("/reactions/{target_type}/{target_id}", response_model=ReactionSummary)
async def get_reactions(target_type: str, target_id: str):
    """Obtener resumen de reacciones"""
    return await social_service.get_reactions(target_id, target_type)


@router.get("/reactions/{target_type}/{target_id}/user/{user_id}")
async def get_user_reaction(target_type: str, target_id: str, user_id: str):
    """Obtener reacción de un usuario específico"""
    reaction = await social_service.get_user_reaction(user_id, target_id, target_type)
    return {"user_id": user_id, "reaction_type": reaction}


# ============== ACTIVITY FEED ==============

@router.get("/feed/{jugador_id}")
async def get_player_feed(jugador_id: str, limit: int = Query(20, ge=1, le=100)):
    """Obtener feed de actividad de un jugador"""
    feed = await social_service.get_player_feed(jugador_id, limit)
    return {"jugador_id": jugador_id, "feed": feed}


@router.get("/feed/{jugador_id}/following")
async def get_following_feed(jugador_id: str, limit: int = Query(50, ge=1, le=100)):
    """Obtener feed de jugadores que sigue"""
    feed = await social_service.get_following_feed(jugador_id, limit)
    return {"jugador_id": jugador_id, "feed": feed}


# ============== NOTIFICATIONS ==============

@router.get("/notifications/{user_id}")
async def get_notifications(
    user_id: str,
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100)
):
    """Obtener notificaciones de un usuario"""
    notifications = await social_service.get_notifications(user_id, unread_only, limit)
    unread_count = await social_service.get_unread_count(user_id)
    return {
        "user_id": user_id,
        "notifications": notifications,
        "unread_count": unread_count
    }


@router.get("/notifications/{user_id}/unread-count")
async def get_unread_count(user_id: str):
    """Obtener cantidad de notificaciones no leídas"""
    count = await social_service.get_unread_count(user_id)
    return {"user_id": user_id, "unread_count": count}


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Marcar notificación como leída"""
    success = await social_service.mark_notification_read(notification_id)
    return {"success": success}


@router.post("/notifications/{user_id}/read-all")
async def mark_all_notifications_read(user_id: str):
    """Marcar todas las notificaciones como leídas"""
    count = await social_service.mark_all_notifications_read(user_id)
    return {"user_id": user_id, "marked_count": count}
