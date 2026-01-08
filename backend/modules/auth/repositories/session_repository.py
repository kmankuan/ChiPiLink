"""
Auth Module - Session Repository
Acceso a datos de sesiones
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import AuthCollections


class SessionRepository(BaseRepository):
    """
    Repository para sesiones de usuario.
    """
    
    COLLECTION_NAME = AuthCollections.SESSIONS
    ID_FIELD = "session_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(
        self,
        cliente_id: str,
        session_token: str,
        expires_in_days: int = 7,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict:
        """Crear nueva sesión"""
        session_data = {
            "session_id": f"sess_{uuid.uuid4().hex[:12]}",
            "cliente_id": cliente_id,
            "session_token": session_token,
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ip_address": ip_address,
            "user_agent": user_agent
        }
        return await self.insert_one(session_data)
    
    async def get_by_token(self, session_token: str) -> Optional[Dict]:
        """Obtener sesión por token"""
        return await self.find_one({"session_token": session_token})
    
    async def get_valid_session(self, session_token: str) -> Optional[Dict]:
        """Obtener sesión válida (no expirada)"""
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
    
    async def get_user_sessions(self, cliente_id: str) -> List[Dict]:
        """Obtener todas las sesiones de un usuario"""
        return await self.find_many(
            query={"cliente_id": cliente_id},
            sort=[("created_at", -1)]
        )
    
    async def delete_by_token(self, session_token: str) -> bool:
        """Eliminar sesión por token"""
        result = await self._collection.delete_one({"session_token": session_token})
        return result.deleted_count > 0
    
    async def delete_user_sessions(self, cliente_id: str) -> int:
        """Eliminar todas las sesiones de un usuario"""
        result = await self._collection.delete_many({"cliente_id": cliente_id})
        return result.deleted_count
    
    async def delete_expired_sessions(self) -> int:
        """Eliminar sesiones expiradas"""
        now = datetime.now(timezone.utc).isoformat()
        result = await self._collection.delete_many({"expires_at": {"$lt": now}})
        return result.deleted_count
    
    async def refresh_session(self, session_token: str, expires_in_days: int = 7) -> bool:
        """Refrescar expiración de sesión"""
        new_expires = (datetime.now(timezone.utc) + timedelta(days=expires_in_days)).isoformat()
        result = await self._collection.update_one(
            {"session_token": session_token},
            {"$set": {"expires_at": new_expires}}
        )
        return result.modified_count > 0
