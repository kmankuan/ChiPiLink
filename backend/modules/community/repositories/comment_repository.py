"""
Community Module - Comment Repository
Acceso a datos de comentarios
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class CommentRepository(BaseRepository):
    """
    Repository para comentarios de posts.
    """
    
    COLLECTION_NAME = "community_comments"
    ID_FIELD = "comment_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, comment_data: Dict) -> Dict:
        """Create nuevo comentario"""
        comment_data["comment_id"] = f"comment_{uuid.uuid4().hex[:12]}"
        comment_data["created_at"] = datetime.now(timezone.utc).isoformat()
        comment_data["aprobado"] = comment_data.get("aprobado", True)
        comment_data["likes"] = 0
        return await self.insert_one(comment_data)
    
    async def get_post_comments(self, post_id: str, limit: int = 100) -> List[Dict]:
        """Get comentarios de un post"""
        return await self.find_many(
            query={"post_id": post_id, "aprobado": True},
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def delete_post_comments(self, post_id: str) -> int:
        """Delete todos los comentarios de un post"""
        result = await self._collection.delete_many({"post_id": post_id})
        return result.deleted_count
    
    async def increment_likes(self, comment_id: str) -> bool:
        """Incrementar likes de comentario"""
        result = await self._collection.update_one(
            {"comment_id": comment_id},
            {"$inc": {"likes": 1}}
        )
        return result.modified_count > 0
