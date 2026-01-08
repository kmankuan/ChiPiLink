"""
Auth Module - User Repository
Acceso a datos de usuarios
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class UserRepository(BaseRepository):
    """
    Repository para usuarios/clientes.
    Usa la colección 'clientes' existente.
    """
    
    COLLECTION_NAME = "clientes"
    ID_FIELD = "cliente_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, user_data: Dict) -> Dict:
        """Crear nuevo usuario"""
        user_data["cliente_id"] = f"cli_{uuid.uuid4().hex[:12]}"
        user_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        user_data["estudiantes"] = []
        user_data["es_admin"] = user_data.get("es_admin", False)
        return await self.insert_one(user_data)
    
    async def get_by_id(self, cliente_id: str) -> Optional[Dict]:
        """Obtener usuario por ID (sin password)"""
        return await self.find_one(
            {self.ID_FIELD: cliente_id},
            exclude_fields=["contrasena_hash"]
        )
    
    async def get_by_email(self, email: str, include_password: bool = False) -> Optional[Dict]:
        """Obtener usuario por email"""
        exclude = [] if include_password else ["contrasena_hash"]
        return await self.find_one({"email": email}, exclude_fields=exclude)
    
    async def get_by_google_id(self, google_id: str) -> Optional[Dict]:
        """Obtener usuario por Google ID"""
        return await self.find_one(
            {"google_id": google_id},
            exclude_fields=["contrasena_hash"]
        )
    
    async def email_exists(self, email: str) -> bool:
        """Verificar si email ya existe"""
        user = await self.find_one({"email": email})
        return user is not None
    
    async def update_user(self, cliente_id: str, data: Dict) -> bool:
        """Actualizar usuario"""
        return await self.update_by_id(self.ID_FIELD, cliente_id, data)
    
    async def update_password(self, cliente_id: str, password_hash: str) -> bool:
        """Actualizar contraseña"""
        return await self.update_user(cliente_id, {"contrasena_hash": password_hash})
    
    async def set_google_id(self, cliente_id: str, google_id: str) -> bool:
        """Establecer Google ID"""
        return await self.update_user(cliente_id, {"google_id": google_id})
    
    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        es_admin: Optional[bool] = None
    ) -> List[Dict]:
        """Obtener usuarios con filtros"""
        query = {}
        if es_admin is not None:
            query["es_admin"] = es_admin
        
        return await self.find_many(
            query=query,
            skip=skip,
            limit=limit,
            exclude_fields=["contrasena_hash"]
        )
    
    async def count_users(self, es_admin: Optional[bool] = None) -> int:
        """Contar usuarios"""
        query = {}
        if es_admin is not None:
            query["es_admin"] = es_admin
        return await self.count(query)
    
    async def deactivate(self, cliente_id: str) -> bool:
        """Desactivar usuario"""
        return await self.update_user(cliente_id, {"activo": False})
