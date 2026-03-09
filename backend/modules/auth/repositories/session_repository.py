"""
Auth Module - Session Repository
Data access for user sessions - All field names in English
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import AuthCollections


class SessionRepository(BaseRepository):
    """
    Repository for user sessions.
    Uses English field names throughout.
    """
    
    COLLECTION_NAME = AuthCollections.SESSIONS
    ID_FIELD = "session_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(
        self,
        user_id: str,
        session_token: str,
        expires_in_days: int = 7,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict:
        """Create new session"""
        session_data = {
            "session_id": f"sess_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        return await self.insert_one(session_data)
    
    async def get_by_token(self, session_token: str) -> Optional[Dict]:
        """Get session by token"""
        return await self.find_one({"session_token": session_token})
    
    async def get_valid_session(self, session_token: str) -> Optional[Dict]:
        """Get valid (non-expired) session"""
        session = await self.get_by_token(session_token)
        if not session:
            return None
        
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        if expires_at > datetime.now(timezone.utc):
            return session
        
        return None
    
    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        """Get all sessions for a user"""
        return await self.find_many(
            query={"user_id": user_id},
            sort=[("created_at", -1)]
        )
    
    async def delete_by_token(self, session_token: str) -> bool:
        """Delete session by token"""
        result = await self._collection.delete_one({"session_token": session_token})
        return result.deleted_count > 0
    
    async def delete_user_sessions(self, user_id: str) -> int:
        """Delete all sessions for a user"""
        result = await self._collection.delete_many({"user_id": user_id})
        return result.deleted_count
    
    async def delete_expired_sessions(self) -> int:
        """Delete expired sessions"""
        now = datetime.now(timezone.utc).isoformat()
        result = await self._collection.delete_many({"expires_at": {"$lt": now}})
        return result.deleted_count
    
    async def refresh_session(self, session_token: str, expires_in_days: int = 7) -> bool:
        """Refresh session expiration"""
        new_expires = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()
        result = await self._collection.update_one(
            {"session_token": session_token},
            {"$set": {"expires_at": new_expires}}
        )
        return result.modified_count > 0
