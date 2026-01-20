"""
Auth Module - User Repository
Data access for users - All field names in English
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import AuthCollections


class UserRepository(BaseRepository):
    """
    Repository for users.
    Uses English field names throughout.
    """
    
    COLLECTION_NAME = AuthCollections.USERS
    ID_FIELD = "user_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, user_data: Dict) -> Dict:
        """Create new user with English field names"""
        user_data["user_id"] = f"cli_{uuid.uuid4().hex[:12]}"
        user_data["created_at"] = datetime.now(timezone.utc).isoformat()
        user_data["students"] = user_data.get("students", [])
        user_data["is_admin"] = user_data.get("is_admin", False)
        return await self.insert_one(user_data)
    
    async def get_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID (without password)"""
        return await self.find_one(
            {self.ID_FIELD: user_id},
            exclude_fields=["password_hash"]
        )
    
    async def get_by_email(self, email: str, include_password: bool = False) -> Optional[Dict]:
        """Get user by email"""
        exclude = [] if include_password else ["password_hash"]
        return await self.find_one({"email": email}, exclude_fields=exclude)
    
    async def get_by_google_id(self, google_id: str) -> Optional[Dict]:
        """Get user by Google ID"""
        return await self.find_one(
            {"google_id": google_id},
            exclude_fields=["password_hash"]
        )
    
    async def email_exists(self, email: str) -> bool:
        """Check if email already exists"""
        user = await self.find_one({"email": email})
        return user is not None
    
    async def update_user(self, user_id: str, data: Dict) -> bool:
        """Update user"""
        return await self.update_by_id(self.ID_FIELD, user_id, data)
    
    async def update_password(self, user_id: str, password_hash: str) -> bool:
        """Update password"""
        return await self.update_user(user_id, {"password_hash": password_hash})
    
    async def set_google_id(self, user_id: str, google_id: str) -> bool:
        """Set Google ID"""
        return await self.update_user(user_id, {"google_id": google_id})
    
    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_admin: Optional[bool] = None
    ) -> List[Dict]:
        """Get users with filters"""
        query = {}
        if is_admin is not None:
            query["is_admin"] = is_admin
        
        return await self.find_many(
            query=query,
            skip=skip,
            limit=limit,
            exclude_fields=["password_hash"]
        )
    
    async def count_users(self, is_admin: Optional[bool] = None) -> int:
        """Count users"""
        query = {}
        if is_admin is not None:
            query["is_admin"] = is_admin
        return await self.count(query)
    
    async def deactivate(self, user_id: str) -> bool:
        """Deactivate user"""
        return await self.update_user(user_id, {"is_active": False})
