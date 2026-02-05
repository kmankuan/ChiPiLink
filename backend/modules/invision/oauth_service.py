"""
LaoPan OAuth Service - Invision Community OAuth 2.0 Integration
Handles OAuth flow for authentication with laopan.online
"""
import os
import uuid
import httpx
import logging
from typing import Optional, Dict
from datetime import datetime, timezone
from urllib.parse import urlencode

from core.database import db
from core.auth import create_token
from core.constants import AuthCollections

logger = logging.getLogger(__name__)

# OAuth Configuration from environment
LAOPAN_CLIENT_ID = os.environ.get("LAOPAN_OAUTH_CLIENT_ID", "")
LAOPAN_CLIENT_SECRET = os.environ.get("LAOPAN_OAUTH_CLIENT_SECRET", "")
LAOPAN_BASE_URL = os.environ.get("LAOPAN_OAUTH_BASE_URL", "https://laopan.online")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")

# OAuth URLs
AUTHORIZE_URL = f"{LAOPAN_BASE_URL}/oauth/authorize/"
TOKEN_URL = f"{LAOPAN_BASE_URL}/oauth/token/"
USERINFO_URL = f"{LAOPAN_BASE_URL}/api/core/me"

# Scopes for Invision Community
OAUTH_SCOPES = ["profile", "email"]


class LaoPanOAuthService:
    """Service for handling LaoPan OAuth 2.0 authentication"""
    
    def __init__(self):
        self.client_id = LAOPAN_CLIENT_ID
        self.client_secret = LAOPAN_CLIENT_SECRET
        self.base_url = LAOPAN_BASE_URL
    
    def get_redirect_uri(self, origin: Optional[str] = None) -> str:
        """
        Get the OAuth callback URL.
        Automatically detects environment from request origin.
        
        Priority:
        1. Request origin (from Referer/Origin header) - auto-detects environment
        2. FRONTEND_URL environment variable - fallback
        """
        # Use origin if provided (auto-detection)
        if origin:
            # Clean the origin (remove trailing slashes)
            clean_origin = origin.rstrip('/')
            return f"{clean_origin}/auth/laopan/callback"
        
        # Fallback to environment variable
        if FRONTEND_URL:
            return f"{FRONTEND_URL}/auth/laopan/callback"
        
        # Last resort - will cause OAuth error but provides clear message
        logger.warning("No FRONTEND_URL configured and no origin provided")
        return "/auth/laopan/callback"
    
    async def generate_auth_url(self, redirect_after: Optional[str] = None, origin: Optional[str] = None) -> Dict:
        """
        Generate OAuth authorization URL
        Returns URL and state for CSRF protection
        
        Args:
            redirect_after: Optional URL to redirect after successful login
            origin: Request origin for auto-detecting callback URL
        """
        state = str(uuid.uuid4())
        
        # Get the redirect URI (auto-detects from origin)
        redirect_uri = self.get_redirect_uri(origin)
        
        # Store state in database (persists across server restarts/instances)
        try:
            result = await db.oauth_states.insert_one({
                "state": state,
                "created_at": datetime.now(timezone.utc),
                "redirect_after": redirect_after,
                "redirect_uri": redirect_uri
            })
            logger.info(f"OAuth state stored in DB: {state}, inserted_id: {result.inserted_id}")
        except Exception as e:
            logger.error(f"Failed to store OAuth state in DB: {e}")
            # Continue anyway - state validation will fail but at least we can debug
        
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(OAUTH_SCOPES),
            "state": state
        }
        
        auth_url = f"{AUTHORIZE_URL}?{urlencode(params)}"
        
        logger.info(f"Generated OAuth URL with redirect_uri: {redirect_uri}")
        
        return {
            "auth_url": auth_url,
            "state": state,
            "redirect_uri": redirect_uri  # Return for debugging
        }
    
    async def validate_state(self, state: str) -> Optional[Dict]:
        """Validate and consume state token from database"""
        logger.info(f"Validating OAuth state: {state}")
        
        # Find and delete the state in one operation
        state_data = await db.oauth_states.find_one_and_delete({"state": state})
        
        if not state_data:
            # Try to find without deleting for debugging
            existing = await db.oauth_states.find_one({"state": state})
            logger.warning(f"OAuth state not found: {state}, exists in db: {existing is not None}")
            
            # List all states for debugging
            all_states = await db.oauth_states.find({}, {"state": 1, "_id": 0}).to_list(10)
            logger.warning(f"Available states: {[s.get('state') for s in all_states]}")
            return None
        
        logger.info(f"OAuth state found and deleted: {state}")
        
        # Check if state is not too old (10 minutes max)
        created = state_data.get("created_at")
        if created:
            try:
                if isinstance(created, str):
                    created = datetime.fromisoformat(created.replace('Z', '+00:00'))
                # Ensure both datetimes are timezone-aware for comparison
                now = datetime.now(timezone.utc)
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                age = (now - created).total_seconds()
                logger.info(f"OAuth state age: {age} seconds")
                if age > 600:  # 10 minutes
                    logger.warning(f"OAuth state expired: {state}")
                    return None
            except Exception as e:
                logger.error(f"Error checking state age: {e}")
                # Continue anyway - don't fail on age check errors
        
        return {
            "redirect_after": state_data.get("redirect_after"),
            "redirect_uri": state_data.get("redirect_uri")
        }
    
    async def exchange_code_for_token(self, code: str, redirect_uri: Optional[str] = None) -> Optional[Dict]:
        """
        Exchange authorization code for access token
        Returns token data or None on failure
        
        Args:
            code: Authorization code from OAuth callback
            redirect_uri: The redirect_uri used in the authorization request (must match)
        """
        # Use provided redirect_uri or fallback to default
        callback_uri = redirect_uri or self.get_redirect_uri()
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "code": code,
                        "redirect_uri": callback_uri
                    },
                    headers={
                        "Content-Type": "application/x-www-form-urlencoded"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.status_code} - {response.text}")
                    return None
                
                return response.json()
        except Exception as e:
            logger.error(f"Token exchange error: {e}")
            return None
    
    async def get_user_info(self, access_token: str) -> Optional[Dict]:
        """
        Get user information from LaoPan using access token
        Returns user data or None on failure
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    USERINFO_URL,
                    headers={
                        "Authorization": f"Bearer {access_token}"
                    },
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    logger.error(f"User info fetch failed: {response.status_code} - {response.text}")
                    return None
                
                return response.json()
        except Exception as e:
            logger.error(f"User info error: {e}")
            return None
    
    async def authenticate_user(self, laopan_user: Dict) -> Dict:
        """
        Authenticate or create user from LaoPan data
        Returns JWT token and user data
        """
        laopan_id = str(laopan_user.get("id"))
        email = laopan_user.get("email", "")
        name = laopan_user.get("name", laopan_user.get("displayName", "Usuario"))
        photo_url = laopan_user.get("photoUrl") or laopan_user.get("photoUrlLarge")
        
        # Extract additional info
        primary_group = laopan_user.get("primaryGroup", {})
        group_name = primary_group.get("name") if primary_group else None
        
        # Use the correct collection (auth_users)
        users_collection = db[AuthCollections.USERS]
        
        # Try to find existing user by laopan_id or email
        existing_user = await users_collection.find_one({
            "$or": [
                {"laopan_id": laopan_id},
                {"email": email}
            ]
        }, {"_id": 0})
        
        now = datetime.now(timezone.utc).isoformat()
        
        if existing_user:
            # Update existing user with LaoPan data
            user_id = existing_user["user_id"]
            
            update_data = {
                "laopan_id": laopan_id,
                "laopan_group": group_name,
                "laopan_last_login": now,
                "updated_at": now
            }
            
            # Update photo if available and user doesn't have one
            if photo_url and not existing_user.get("avatar"):
                update_data["avatar"] = photo_url
            
            # Update name if not set
            if not existing_user.get("name") and name:
                update_data["name"] = name
            
            await users_collection.update_one(
                {"user_id": user_id},
                {"$set": update_data}
            )
            
            # Get updated user
            user = await users_collection.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            
            user = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "avatar": photo_url,
                "phone": None,
                "address": None,
                "is_admin": False,
                "is_active": True,
                "laopan_id": laopan_id,
                "laopan_group": group_name,
                "laopan_last_login": now,
                "auth_provider": "laopan",
                "created_at": now,
                "updated_at": now
            }
            
            await users_collection.insert_one(user)
            # Remove _id for response
            user.pop("_id", None)
        
        # Create JWT token
        token = create_token(user_id, user.get("is_admin", False))
        
        return {
            "token": token,
            "user": user
        }
    
    async def get_oauth_config(self) -> Dict:
        """Get public OAuth configuration for frontend"""
        # Check if OAuth is configured
        if not self.client_id:
            return {
                "enabled": False,
                "provider_name": "LaoPan.online",
                "message": "OAuth no configurado"
            }
        
        return {
            "enabled": True,
            "provider_id": "laopan",
            "provider_name": "LaoPan.online",
            "button_text": "Sign in with LaoPan",
            "button_text_es": "Iniciar session con LaoPan",
            "button_text_zh": "使用LaoPan登录",
            "button_color": "#4F46E5"
        }


# Singleton instance
laopan_oauth_service = LaoPanOAuthService()
