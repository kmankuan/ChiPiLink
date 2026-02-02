"""
Social Features - Service Layer
Seguimientos, comentarios, reactions, notifications
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from ..repositories.social_repository import (
    FollowRepository,
    CommentRepository,
    ReactionRepository,
    ActivityFeedRepository,
    NotificationRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.social import (
    Follow, FollowCreate, FollowStats,
    Comment, CommentCreate,
    Reaction, ReactionCreate, ReactionSummary,
    ActivityFeedItem, ActivityFeedCreate,
    Notification, NotificationCreate, NotificationType, ActivityType
)


class SocialService(BaseService):
    """Service for funcionalidades sociales"""
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.follow_repo = FollowRepository()
        self.comment_repo = CommentRepository()
        self.reaction_repo = ReactionRepository()
        self.feed_repo = ActivityFeedRepository()
        self.notification_repo = NotificationRepository()
        self.player_repo = PlayerRepository()
    
    # ============== FOLLOWS ==============
    
    async def follow_player(self, follower_id: str, following_id: str) -> Follow:
        """Seguir a un jugador"""
        if follower_id == following_id:
            raise ValueError("No puedes seguirte a ti mismo")
        
        # Verify si ya sigue
        existing = await self.follow_repo.find_follow(follower_id, following_id)
        if existing:
            raise ValueError("Ya sigues a este jugador")
        
        # Get player info
        follower = await self.player_repo.get_by_id(follower_id)
        following = await self.player_repo.get_by_id(following_id)
        
        follow_data = {
            "follower_id": follower_id,
            "following_id": following_id,
            "follower_info": {"nombre": follower.get("nombre"), "apodo": follower.get("apodo")} if follower else None,
            "following_info": {"nombre": following.get("nombre"), "apodo": following.get("apodo")} if following else None
        }
        
        result = await self.follow_repo.create(follow_data)
        
        # Create notification for followed user
        await self.create_notification(NotificationCreate(
            user_id=following_id,
            type=NotificationType.NEW_FOLLOWER,
            title="Nuevo seguidor",
            message=f"{follower.get('apodo') or follower.get('nombre', 'Alguien')} te is siguiendo",
            data={"follower_id": follower_id},
            action_url=f"/pinpanclub/superpin/player/{follower_id}"
        ))
        
        # Create feed activity
        await self.create_activity(ActivityFeedCreate(
            jugador_id=follower_id,
            activity_type=ActivityType.NEW_FOLLOWER,
            data={"following_id": following_id, "following_name": following.get("apodo") or following.get("nombre")},
            description=f"Ahora sigue a {following.get('apodo') or following.get('nombre')}"
        ))
        
        return Follow(**result)
    
    async def unfollow_player(self, follower_id: str, following_id: str) -> bool:
        """Dejar de seguir a un jugador"""
        return await self.follow_repo.delete_follow(follower_id, following_id)
    
    async def get_followers(self, jugador_id: str, limit: int = 50) -> List[Dict]:
        """Get seguidores de un jugador"""
        return await self.follow_repo.get_followers(jugador_id, limit)
    
    async def get_following(self, jugador_id: str, limit: int = 50) -> List[Dict]:
        """Get a who sigue un jugador"""
        return await self.follow_repo.get_following(jugador_id, limit)
    
    async def get_follow_stats(self, jugador_id: str) -> FollowStats:
        """Get statistics de seguidores"""
        followers = await self.follow_repo.count_followers(jugador_id)
        following = await self.follow_repo.count_following(jugador_id)
        return FollowStats(
            jugador_id=jugador_id,
            followers_count=followers,
            following_count=following
        )
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        """Verify si un jugador sigue a otro"""
        return await self.follow_repo.is_following(follower_id, following_id)
    
    # ============== COMMENTS ==============
    
    async def create_comment(self, data: CommentCreate) -> Comment:
        """Create un comentario"""
        author = await self.player_repo.get_by_id(data.author_id)
        
        comment_data = data.model_dump()
        comment_data["author_info"] = {
            "nombre": author.get("nombre"),
            "apodo": author.get("apodo")
        } if author else None
        
        result = await self.comment_repo.create(comment_data)
        
        # Notify profile owner
        if data.target_type == "player" and data.target_id != data.author_id:
            target = await self.player_repo.get_by_id(data.target_id)
            await self.create_notification(NotificationCreate(
                user_id=data.target_id,
                type=NotificationType.NEW_COMMENT,
                title="Nuevo comentario",
                message=f"{author.get('apodo') or author.get('nombre', 'Alguien')} commented en tu perfil",
                data={"comment_id": result["comment_id"], "author_id": data.author_id},
                action_url=f"/pinpanclub/superpin/player/{data.target_id}"
            ))
        
        return Comment(**result)
    
    async def get_comments(
        self, 
        target_id: str, 
        target_type: str = "player",
        limit: int = 50
    ) -> List[Comment]:
        """Get comentarios de un target"""
        results = await self.comment_repo.get_comments_for_target(target_id, target_type, limit)
        return [Comment(**r) for r in results]
    
    async def update_comment(self, comment_id: str, content: str) -> Optional[Comment]:
        """Update comentario"""
        success = await self.comment_repo.update(comment_id, {"content": content})
        if success:
            result = await self.comment_repo.get_by_id(comment_id)
            return Comment(**result) if result else None
        return None
    
    async def delete_comment(self, comment_id: str) -> bool:
        """Delete comentario (soft delete)"""
        return await self.comment_repo.soft_delete(comment_id)
    
    # ============== REACTIONS ==============
    
    async def add_reaction(self, data: ReactionCreate) -> Reaction:
        """Add reaction"""
        # Verify si ya reacted
        existing = await self.reaction_repo.find_user_reaction(
            data.user_id, data.target_id, data.target_type
        )
        
        if existing:
            # If same reaction, remove
            if existing["reaction_type"] == data.reaction_type:
                await self.reaction_repo.delete_reaction(
                    data.user_id, data.target_id, data.target_type
                )
                # Update counter on target
                if data.target_type == "comment":
                    await self.comment_repo.remove_reaction(data.target_id, data.reaction_type)
                raise ValueError("Reaction eliminada")
            else:
                # Change reaction type
                await self.reaction_repo.delete_reaction(
                    data.user_id, data.target_id, data.target_type
                )
                if data.target_type == "comment":
                    await self.comment_repo.remove_reaction(data.target_id, existing["reaction_type"])
        
        result = await self.reaction_repo.create(data.model_dump())
        
        # Update counter on target
        if data.target_type == "comment":
            await self.comment_repo.add_reaction(data.target_id, data.reaction_type)
        
        return Reaction(**result)
    
    async def get_reactions(self, target_id: str, target_type: str) -> ReactionSummary:
        """Get resumen de reactions"""
        summary = await self.reaction_repo.get_reaction_summary(target_id, target_type)
        return ReactionSummary(**summary)
    
    async def get_user_reaction(
        self, 
        user_id: str, 
        target_id: str, 
        target_type: str
    ) -> Optional[str]:
        """Get tipo de reaction of the user"""
        reaction = await self.reaction_repo.find_user_reaction(user_id, target_id, target_type)
        return reaction["reaction_type"] if reaction else None
    
    # ============== ACTIVITY FEED ==============
    
    async def create_activity(self, data: ActivityFeedCreate) -> ActivityFeedItem:
        """Create actividad en el feed"""
        player = await self.player_repo.get_by_id(data.jugador_id)
        
        activity_data = data.model_dump()
        activity_data["jugador_info"] = {
            "nombre": player.get("nombre"),
            "apodo": player.get("apodo")
        } if player else None
        
        result = await self.feed_repo.create(activity_data)
        return ActivityFeedItem(**result)
    
    async def get_player_feed(self, jugador_id: str, limit: int = 20) -> List[ActivityFeedItem]:
        """Get feed de un jugador"""
        results = await self.feed_repo.get_player_feed(jugador_id, limit)
        return [ActivityFeedItem(**r) for r in results]
    
    async def get_following_feed(self, jugador_id: str, limit: int = 50) -> List[ActivityFeedItem]:
        """Get feed de jugadores seguidos"""
        # Get IDs of followed players
        following = await self.follow_repo.get_following(jugador_id, limit=100)
        following_ids = [f["following_id"] for f in following]
        
        if not following_ids:
            return []
        
        results = await self.feed_repo.get_following_feed(following_ids, limit)
        return [ActivityFeedItem(**r) for r in results]
    
    # ============== NOTIFICATIONS ==============
    
    async def create_notification(self, data: NotificationCreate) -> Notification:
        """Create notification y enviar en tiempo real si the user is conectado"""
        result = await self.notification_repo.create(data.model_dump())
        notification = Notification(**result)
        
        # Try to push real-time notification
        try:
            from ..routes.websocket import push_realtime_notification
            await push_realtime_notification(data.user_id, result)
        except Exception as e:
            # Log but don't fail if real-time push fails
            self.log_error(f"Failed to push real-time notification: {e}")
        
        return notification
    
    async def get_notifications(
        self, 
        user_id: str, 
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Notification]:
        """Get notifications de un usuario"""
        results = await self.notification_repo.get_user_notifications(user_id, unread_only, limit)
        return [Notification(**r) for r in results]
    
    async def get_unread_count(self, user_id: str) -> int:
        """Get cantidad de notifications no read"""
        return await self.notification_repo.count_unread(user_id)
    
    async def mark_notification_read(self, notification_id: str) -> bool:
        """Marcar notification como read"""
        return await self.notification_repo.mark_as_read(notification_id)
    
    async def mark_all_notifications_read(self, user_id: str) -> int:
        """Marcar todas las notifications como read"""
        return await self.notification_repo.mark_all_as_read(user_id)
    
    async def get_unpushed_notifications(self, limit: int = 100) -> List[Notification]:
        """Get notifications no enviadas por WebSocket"""
        results = await self.notification_repo.get_unpushed(limit)
        return [Notification(**r) for r in results]
    
    async def mark_notifications_pushed(self, notification_ids: List[str]) -> int:
        """Marcar notifications como enviadas"""
        return await self.notification_repo.mark_as_pushed(notification_ids)
    
    # ============== USER WARNINGS (MODERATION) ==============
    
    async def get_user_warnings(self, user_id: str) -> int:
        """Get cantidad de amonestaciones de un usuario"""
        from core.database import db
        
        user_mod = await db.pinpanclub_user_moderation.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        return user_mod.get("warnings", 0) if user_mod else 0
    
    async def add_user_warning(self, user_id: str, reason: str) -> int:
        """Add una warning al usuario"""
        from core.database import db
        from datetime import datetime, timezone
        
        result = await db.pinpanclub_user_moderation.update_one(
            {"user_id": user_id},
            {
                "$inc": {"warnings": 1},
                "$push": {
                    "warning_history": {
                        "reason": reason,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                },
                "$setOnInsert": {"user_id": user_id}
            },
            upsert=True
        )
        
        # Get nuevo conteo
        return await self.get_user_warnings(user_id)
    
    async def report_comment(self, comment_id: str, reporter_id: str, reason: str) -> bool:
        """Reportar un comentario"""
        from core.database import db
        from datetime import datetime, timezone
        
        report = {
            "comment_id": comment_id,
            "reporter_id": reporter_id,
            "reason": reason,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.pinpanclub_comment_reports.insert_one(report)
        return True


# Singleton instance
social_service = SocialService()
