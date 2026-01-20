"""
Auth Module - User Service
Business logic for user management - All field names in English
"""
from typing import List, Optional, Dict

from core.base import BaseService
from core.events import AuthEvents
from ..repositories import UserRepository
from ..models import User, UserUpdate


class UserService(BaseService):
    """
    Service for user management.
    Uses English field names throughout.
    """
    
    MODULE_NAME = "auth"
    
    def __init__(self):
        super().__init__()
        self.repository = UserRepository()
    
    async def get_user(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        result = await self.repository.get_by_id(user_id)
        return User(**result) if result else None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.repository.get_by_email(email)
        return User(**result) if result else None
    
    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_admin: Optional[bool] = None
    ) -> List[User]:
        """Get all users"""
        results = await self.repository.get_all_users(
            skip=skip,
            limit=limit,
            is_admin=is_admin
        )
        return [User(**r) for r in results]
    
    async def update_user(
        self,
        user_id: str,
        data: UserUpdate
    ) -> Optional[User]:
        """
        Update user.
        Emits event: auth.user.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_user(user_id)
        
        success = await self.repository.update_user(user_id, update_data)
        
        if success:
            await self.emit_event(
                AuthEvents.USER_UPDATED,
                {
                    "user_id": user_id,
                    "updated_fields": list(update_data.keys())
                }
            )
            return await self.get_user(user_id)
        
        return None
    
    async def get_user_stats(self) -> Dict:
        """Get user statistics"""
        total = await self.repository.count_users()
        admins = await self.repository.count_users(is_admin=True)
        
        return {
            "total_users": total,
            "admins": admins,
            "regular_users": total - admins
        }


# Singleton service instance
user_service = UserService()
