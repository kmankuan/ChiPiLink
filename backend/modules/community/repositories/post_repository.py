"""
Community Module - Post Repository
Acceso a datos de posts
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class PostRepository(BaseRepository):
    """
    Repository para posts de comunidad.
    """
    
    COLLECTION_NAME = "community_posts"
    ID_FIELD = "post_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, post_data: Dict) -> Dict:
        """Create nuevo post"""
        post_data["post_id"] = f"post_{uuid.uuid4().hex[:12]}"
        post_data["created_at"] = datetime.now(timezone.utc).isoformat()
        post_data["vistas"] = 0
        post_data["likes"] = 0
        
        if post_data.get("publicado") and not post_data.get("fecha_publicacion"):
            post_data["fecha_publicacion"] = datetime.now(timezone.utc).isoformat()
        
        return await self.insert_one(post_data)
    
    async def get_by_id(self, post_id: str) -> Optional[Dict]:
        """Get post by ID"""
        return await self.find_one({self.ID_FIELD: post_id})
    
    async def get_published_posts(
        self,
        tipo: Optional[str] = None,
        featured: Optional[bool] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Get posts publicados"""
        now = datetime.now(timezone.utc).isoformat()
        query = {
            "publicado": True,
            "$or": [
                {"fecha_expiracion": None},
                {"fecha_expiracion": {"$gte": now}}
            ]
        }
        if tipo:
            query["tipo"] = tipo
        if destacado is not None:
            query["featured"] = destacado
        
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("featured", -1), ("fecha_publicacion", -1)]
        )
    
    async def get_all_posts(self, limit: int = 100) -> List[Dict]:
        """Get todos los posts (admin)"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_post(self, post_id: str, data: Dict) -> bool:
        """Update post"""
        # Si se publica por primera vez, establecer fecha
        if data.get("publicado"):
            existing = await self.get_by_id(post_id)
            if existing and not existing.get("fecha_publicacion"):
                data["fecha_publicacion"] = datetime.now(timezone.utc).isoformat()
        
        return await self.update_by_id(self.ID_FIELD, post_id, data)
    
    async def increment_views(self, post_id: str) -> bool:
        """Incrementar vistas"""
        result = await self._collection.update_one(
            {"post_id": post_id},
            {"$inc": {"vistas": 1}}
        )
        return result.modified_count > 0
    
    async def increment_likes(self, post_id: str) -> bool:
        """Incrementar likes"""
        result = await self._collection.update_one(
            {"post_id": post_id},
            {"$inc": {"likes": 1}}
        )
        return result.modified_count > 0
    
    async def delete_post(self, post_id: str) -> bool:
        """Delete post"""
        return await self.delete_by_id(self.ID_FIELD, post_id)
