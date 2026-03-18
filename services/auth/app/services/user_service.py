"""
Auth Module - User Service
Lógica de negocio para gestión de usuarios
"""
from typing import List, Optional, Dict

from core.base import BaseService
from core.events import AuthEvents
from ..repositories import UserRepository
from ..models import User, UserUpdate


class UserService(BaseService):
    """
    Servicio para gestión de usuarios.
    """
    
    MODULE_NAME = "auth"
    
    def __init__(self):
        super().__init__()
        self.repository = UserRepository()
    
    async def get_user(self, cliente_id: str) -> Optional[User]:
        """Obtener usuario por ID"""
        result = await self.repository.get_by_id(cliente_id)
        return User(**result) if result else None
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Obtener usuario por email"""
        result = await self.repository.get_by_email(email)
        return User(**result) if result else None
    
    async def get_all_users(
        self,
        skip: int = 0,
        limit: int = 100,
        es_admin: Optional[bool] = None
    ) -> List[User]:
        """Obtener todos los usuarios"""
        results = await self.repository.get_all_users(
            skip=skip,
            limit=limit,
            es_admin=es_admin
        )
        return [User(**r) for r in results]
    
    async def update_user(
        self,
        cliente_id: str,
        data: UserUpdate
    ) -> Optional[User]:
        """
        Actualizar usuario.
        Emite evento: auth.user.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_user(cliente_id)
        
        success = await self.repository.update_user(cliente_id, update_data)
        
        if success:
            await self.emit_event(
                AuthEvents.USER_UPDATED,
                {
                    "cliente_id": cliente_id,
                    "updated_fields": list(update_data.keys())
                }
            )
            return await self.get_user(cliente_id)
        
        return None
    
    async def get_user_stats(self) -> Dict:
        """Obtener estadísticas de usuarios"""
        total = await self.repository.count_users()
        admins = await self.repository.count_users(es_admin=True)
        
        return {
            "total_usuarios": total,
            "administradores": admins,
            "usuarios_regulares": total - admins
        }


# Instancia singleton del servicio
user_service = UserService()
