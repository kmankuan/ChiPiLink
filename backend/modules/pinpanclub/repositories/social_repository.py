"""
Social Features - Repository Layer
Seguimientos, comentarios, reacciones, notificaciones y feed de actividad
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from core.database import db
from core.base import BaseRepository


class FollowRepository(BaseRepository):
    """Repositorio para seguimientos"""
    
    COLLECTION_NAME = "pinpanclub_follows"
    ID_FIELD = "follow_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["follow_id"] = f"follow_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(data)
    
    async def get_by_id(self, follow_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: follow_id})
    
    async def find_follow(self, follower_id: str, following_id: str) -> Optional[Dict]:
        """Buscar si already exists el seguimiento"""
        return await self.find_one({
            "follower_id": follower_id,
            "following_id": following_id
        })
    
    async def delete_follow(self, follower_id: str, following_id: str) -> bool:
        """Eliminar seguimiento"""
        result = await self._collection.delete_one({
            "follower_id": follower_id,
            "following_id": following_id
        })
        return result.deleted_count > 0
    
    async def get_followers(self, jugador_id: str, limit: int = 50) -> List[Dict]:
        """Obtener seguidores de un jugador"""
        return await self.find_many(
            query={"following_id": jugador_id},
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def get_following(self, jugador_id: str, limit: int = 50) -> List[Dict]:
        """Obtener a quiénes sigue un jugador"""
        return await self.find_many(
            query={"follower_id": jugador_id},
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def count_followers(self, jugador_id: str) -> int:
        return await self._collection.count_documents({"following_id": jugador_id})
    
    async def count_following(self, jugador_id: str) -> int:
        return await self._collection.count_documents({"follower_id": jugador_id})
    
    async def is_following(self, follower_id: str, following_id: str) -> bool:
        follow = await self.find_follow(follower_id, following_id)
        return follow is not None


class CommentRepository(BaseRepository):
    """Repositorio para comentarios"""
    
    COLLECTION_NAME = "pinpanclub_comments"
    ID_FIELD = "comment_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["comment_id"] = f"comment_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["reactions"] = {}
        data["is_edited"] = False
        data["is_deleted"] = False
        return await self.insert_one(data)
    
    async def get_by_id(self, comment_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: comment_id})
    
    async def update(self, comment_id: str, data: Dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        data["is_edited"] = True
        return await self.update_by_id(self.ID_FIELD, comment_id, data)
    
    async def soft_delete(self, comment_id: str) -> bool:
        return await self.update_by_id(self.ID_FIELD, comment_id, {"is_deleted": True})
    
    async def get_comments_for_target(
        self, 
        target_id: str, 
        target_type: str = "player",
        limit: int = 50
    ) -> List[Dict]:
        return await self.find_many(
            query={
                "target_id": target_id,
                "target_type": target_type,
                "is_deleted": False
            },
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def add_reaction(self, comment_id: str, reaction_type: str) -> bool:
        result = await self._collection.update_one(
            {self.ID_FIELD: comment_id},
            {"$inc": {f"reactions.{reaction_type}": 1}}
        )
        return result.modified_count > 0
    
    async def remove_reaction(self, comment_id: str, reaction_type: str) -> bool:
        result = await self._collection.update_one(
            {self.ID_FIELD: comment_id},
            {"$inc": {f"reactions.{reaction_type}": -1}}
        )
        return result.modified_count > 0


class ReactionRepository(BaseRepository):
    """Repositorio para reacciones"""
    
    COLLECTION_NAME = "pinpanclub_reactions"
    ID_FIELD = "reaction_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["reaction_id"] = f"reaction_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(data)
    
    async def find_user_reaction(
        self, 
        user_id: str, 
        target_id: str, 
        target_type: str
    ) -> Optional[Dict]:
        return await self.find_one({
            "user_id": user_id,
            "target_id": target_id,
            "target_type": target_type
        })
    
    async def delete_reaction(
        self, 
        user_id: str, 
        target_id: str, 
        target_type: str
    ) -> bool:
        result = await self._collection.delete_one({
            "user_id": user_id,
            "target_id": target_id,
            "target_type": target_type
        })
        return result.deleted_count > 0
    
    async def get_reaction_summary(self, target_id: str, target_type: str) -> Dict:
        """Obtener resumen de reacciones para un target"""
        pipeline = [
            {"$match": {"target_id": target_id, "target_type": target_type}},
            {"$group": {
                "_id": "$reaction_type",
                "count": {"$sum": 1}
            }}
        ]
        cursor = self._collection.aggregate(pipeline)
        results = await cursor.to_list(length=100)
        
        by_type = {r["_id"]: r["count"] for r in results}
        total = sum(by_type.values())
        
        return {"target_id": target_id, "total": total, "by_type": by_type}


class ActivityFeedRepository(BaseRepository):
    """Repositorio para feed de actividad"""
    
    COLLECTION_NAME = "pinpanclub_activity_feed"
    ID_FIELD = "activity_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["activity_id"] = f"activity_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["reactions"] = {}
        return await self.insert_one(data)
    
    async def get_player_feed(self, jugador_id: str, limit: int = 20) -> List[Dict]:
        """Obtener actividad de un jugador"""
        return await self.find_many(
            query={"jugador_id": jugador_id},
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def get_following_feed(
        self, 
        following_ids: List[str], 
        limit: int = 50
    ) -> List[Dict]:
        """Obtener feed de jugadores seguidos"""
        return await self.find_many(
            query={"jugador_id": {"$in": following_ids}},
            sort=[("created_at", -1)],
            limit=limit
        )


class NotificationRepository(BaseRepository):
    """Repositorio para notificaciones"""
    
    COLLECTION_NAME = "pinpanclub_notifications"
    ID_FIELD = "notification_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["notification_id"] = f"notif_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_read"] = False
        data["is_pushed"] = False
        return await self.insert_one(data)
    
    async def get_user_notifications(
        self, 
        user_id: str, 
        unread_only: bool = False,
        limit: int = 50
    ) -> List[Dict]:
        query = {"user_id": user_id}
        if unread_only:
            query["is_read"] = False
        return await self.find_many(
            query=query,
            sort=[("created_at", -1)],
            limit=limit
        )
    
    async def count_unread(self, user_id: str) -> int:
        return await self._collection.count_documents({
            "user_id": user_id,
            "is_read": False
        })
    
    async def mark_as_read(self, notification_id: str) -> bool:
        return await self.update_by_id(
            self.ID_FIELD, 
            notification_id, 
            {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}
        )
    
    async def mark_all_as_read(self, user_id: str) -> int:
        result = await self._collection.update_many(
            {"user_id": user_id, "is_read": False},
            {"$set": {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count
    
    async def get_unpushed(self, limit: int = 100) -> List[Dict]:
        """Obtener notificaciones no enviadas por WebSocket"""
        return await self.find_many(
            query={"is_pushed": False},
            sort=[("created_at", 1)],
            limit=limit
        )
    
    async def mark_as_pushed(self, notification_ids: List[str]) -> int:
        result = await self._collection.update_many(
            {self.ID_FIELD: {"$in": notification_ids}},
            {"$set": {"is_pushed": True}}
        )
        return result.modified_count
