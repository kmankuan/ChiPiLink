"""
Auth Module - Auth Service
Business logic for authentication - All field names in English
"""
from typing import Optional, Dict
from datetime import datetime, timezone
import uuid
import httpx
import logging

from core.base import BaseService
from core.events import event_bus, Event, EventPriority, AuthEvents
from core.auth import hash_password, verify_password, create_token
from ..repositories import UserRepository, SessionRepository
from ..models import UserCreate, User, LoginRequest, TokenResponse, SessionData

logger = logging.getLogger(__name__)


class AuthService(BaseService):
    """
    Service for user authentication.
    Uses English field names throughout.
    """
    
    MODULE_NAME = "auth"
    
    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.session_repository = SessionRepository()
    
    async def register(self, data: UserCreate) -> TokenResponse:
        """
        Register a new user.
        Emits event: auth.user.registered
        """
        # Check if email exists
        if await self.user_repository.email_exists(data.email):
            raise ValueError("Email already registered")
        
        # Create user with English field names
        user_dict = data.model_dump(exclude={"password"})
        user_dict["password_hash"] = hash_password(data.password)
        
        result = await self.user_repository.create(user_dict)
        user_id = result["user_id"]
        
        # Create token
        token = create_token(user_id)
        
        # Emit event
        await self.emit_event(
            AuthEvents.USER_REGISTERED,
            {
                "user_id": user_id,
                "email": data.email,
                "name": data.name
            }
        )
        
        self.log_info(f"User registered: {user_id}")
        
        # Prepare response (without password hash)
        user_data = {k: v for k, v in result.items() if k not in ["_id", "password_hash"]}
        
        return TokenResponse(token=token, user=user_data)
    
    async def login(self, data: LoginRequest) -> TokenResponse:
        """
        Login with email and password.
        Emits event: auth.user.logged_in
        """
        # Get user with password
        user = await self.user_repository.get_by_email(data.email, include_password=True)
        
        if not user:
            raise ValueError("Invalid credentials")
        
        # Verify password
        if not verify_password(data.password, user.get("password_hash", "")):
            raise ValueError("Invalid credentials")
        
        # Create token
        token = create_token(user["user_id"], user.get("is_admin", False))
        
        # Emit event
        await self.emit_event(
            AuthEvents.USER_LOGGED_IN,
            {
                "user_id": user["user_id"],
                "email": data.email
            }
        )
        
        self.log_info(f"User logged in: {user['user_id']}")
        
        # Prepare response (without password hash)
        user_data = {k: v for k, v in user.items() if k != "password_hash"}
        
        return TokenResponse(token=token, user=user_data)
    
    async def oauth_login(
        self,
        session_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> SessionData:
        """
        Login via OAuth (Google).
        Emits event: auth.user.logged_in or auth.user.registered
        """
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                    headers={"X-Session-ID": session_id},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise ValueError("Invalid session")
                
                data = response.json()
                
                # Find existing user
                existing_user = await self.user_repository.get_by_email(data["email"])
                
                if existing_user:
                    user_id = existing_user["user_id"]
                    # Update info if necessary
                    await self.user_repository.update_user(user_id, {
                        "name": data.get("name", existing_user.get("name")),
                        "google_id": data.get("id")
                    })
                    
                    await self.emit_event(
                        AuthEvents.USER_LOGGED_IN,
                        {"user_id": user_id, "method": "oauth"}
                    )
                else:
                    # Create new user
                    new_user = {
                        "email": data["email"],
                        "name": data.get("name", ""),
                        "google_id": data.get("id"),
                        "phone": None,
                        "address": None
                    }
                    result = await self.user_repository.create(new_user)
                    user_id = result["user_id"]
                    
                    await self.emit_event(
                        AuthEvents.USER_REGISTERED,
                        {"user_id": user_id, "method": "oauth"}
                    )
                
                # Create session
                session_token = data.get("session_token", str(uuid.uuid4()))
                await self.session_repository.create(
                    user_id=user_id,
                    session_token=session_token,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                user = await self.user_repository.get_by_id(user_id)
                
                return SessionData(session_token=session_token, user=user)
                
        except httpx.RequestError as e:
            logger.error(f"Error fetching session: {e}")
            raise ValueError("Authentication error")
    
    async def logout(self, session_token: str) -> bool:
        """
        Close session.
        Emits event: auth.user.logged_out
        """
        session = await self.session_repository.get_by_token(session_token)
        
        if session:
            await self.session_repository.delete_by_token(session_token)
            
            await self.emit_event(
                AuthEvents.USER_LOGGED_OUT,
                {"user_id": session["user_id"]}
            )
            
            return True
        
        return False
    
    async def validate_session(self, session_token: str) -> Optional[Dict]:
        """Validate session and get user"""
        session = await self.session_repository.get_valid_session(session_token)
        
        if not session:
            return None
        
        return await self.user_repository.get_by_id(session["user_id"])
    
    async def change_password(
        self,
        user_id: str,
        current_password: str,
        new_password: str
    ) -> bool:
        """Change password"""
        # Get user with current password
        user = await self.user_repository._collection.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if not user:
            raise ValueError("User not found")
        
        # Verify current password
        if not verify_password(current_password, user.get("password_hash", "")):
            raise ValueError("Incorrect current password")
        
        # Update password
        new_hash = hash_password(new_password)
        success = await self.user_repository.update_password(user_id, new_hash)
        
        if success:
            # Invalidate all user sessions
            await self.session_repository.delete_user_sessions(user_id)
            
            await self.emit_event(
                AuthEvents.USER_UPDATED,
                {"user_id": user_id, "field": "password"}
            )
        
        return success


# Singleton service instance
auth_service = AuthService()
