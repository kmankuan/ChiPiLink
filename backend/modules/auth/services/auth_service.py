"""
Auth Module - Auth Service
Lógica de negocio para autenticación
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
    Servicio para autenticación de usuarios.
    """
    
    MODULE_NAME = "auth"
    
    def __init__(self):
        super().__init__()
        self.user_repository = UserRepository()
        self.session_repository = SessionRepository()
    
    async def register(self, data: UserCreate) -> TokenResponse:
        """
        Registrar nuevo usuario.
        Emite evento: auth.user.registered
        """
        # Verificar si email existe
        if await self.user_repository.email_exists(data.email):
            raise ValueError("Email ya registrado")
        
        # Crear usuario - use English field names from schema
        user_dict = data.model_dump(exclude={"password"})
        user_dict["contrasena_hash"] = hash_password(data.password)
        
        result = await self.user_repository.create(user_dict)
        cliente_id = result["cliente_id"]
        
        # Crear token
        token = create_token(cliente_id)
        
        # Emitir evento
        await self.emit_event(
            AuthEvents.USER_REGISTERED,
            {
                "cliente_id": cliente_id,
                "email": data.email,
                "nombre": data.name
            }
        )
        
        self.log_info(f"User registered: {cliente_id}")
        
        # Preparar respuesta (sin password hash)
        cliente_data = {k: v for k, v in result.items() if k not in ["_id", "contrasena_hash"]}
        
        return TokenResponse(token=token, cliente=cliente_data)
    
    async def login(self, data: LoginRequest) -> TokenResponse:
        """
        Login con email y contraseña.
        Emite evento: auth.user.logged_in
        """
        # Obtener usuario con password
        user = await self.user_repository.get_by_email(data.email, include_password=True)
        
        if not user:
            raise ValueError("Credenciales inválidas")
        
        # Verificar contraseña - use English field name from schema
        if not verify_password(data.password, user.get("contrasena_hash", "")):
            raise ValueError("Credenciales inválidas")
        
        # Crear token
        token = create_token(user["cliente_id"], user.get("es_admin", False))
        
        # Emitir evento
        await self.emit_event(
            AuthEvents.USER_LOGGED_IN,
            {
                "cliente_id": user["cliente_id"],
                "email": data.email
            }
        )
        
        self.log_info(f"User logged in: {user['cliente_id']}")
        
        # Preparar respuesta (sin password hash)
        cliente_data = {k: v for k, v in user.items() if k != "contrasena_hash"}
        
        return TokenResponse(token=token, cliente=cliente_data)
    
    async def oauth_login(
        self,
        session_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> SessionData:
        """
        Login via OAuth (Google).
        Emite evento: auth.user.logged_in o auth.user.registered
        """
        try:
            async with httpx.AsyncClient() as http_client:
                response = await http_client.get(
                    "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                    headers={"X-Session-ID": session_id},
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    raise ValueError("Sesión inválida")
                
                data = response.json()
                
                # Buscar usuario existente
                existing_user = await self.user_repository.get_by_email(data["email"])
                
                if existing_user:
                    cliente_id = existing_user["cliente_id"]
                    # Actualizar info si necesario
                    await self.user_repository.update_user(cliente_id, {
                        "nombre": data.get("name", existing_user.get("nombre")),
                        "google_id": data.get("id")
                    })
                    
                    await self.emit_event(
                        AuthEvents.USER_LOGGED_IN,
                        {"cliente_id": cliente_id, "method": "oauth"}
                    )
                else:
                    # Crear nuevo usuario
                    new_user = {
                        "email": data["email"],
                        "nombre": data.get("name", ""),
                        "google_id": data.get("id"),
                        "telefono": None,
                        "direccion": None
                    }
                    result = await self.user_repository.create(new_user)
                    cliente_id = result["cliente_id"]
                    
                    await self.emit_event(
                        AuthEvents.USER_REGISTERED,
                        {"cliente_id": cliente_id, "method": "oauth"}
                    )
                
                # Crear sesión
                session_token = data.get("session_token", str(uuid.uuid4()))
                await self.session_repository.create(
                    cliente_id=cliente_id,
                    session_token=session_token,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                user = await self.user_repository.get_by_id(cliente_id)
                
                return SessionData(session_token=session_token, cliente=user)
                
        except httpx.RequestError as e:
            logger.error(f"Error fetching session: {e}")
            raise ValueError("Error de autenticación")
    
    async def logout(self, session_token: str) -> bool:
        """
        Cerrar sesión.
        Emite evento: auth.user.logged_out
        """
        session = await self.session_repository.get_by_token(session_token)
        
        if session:
            await self.session_repository.delete_by_token(session_token)
            
            await self.emit_event(
                AuthEvents.USER_LOGGED_OUT,
                {"cliente_id": session["cliente_id"]}
            )
            
            return True
        
        return False
    
    async def validate_session(self, session_token: str) -> Optional[Dict]:
        """Validar sesión y obtener usuario"""
        session = await self.session_repository.get_valid_session(session_token)
        
        if not session:
            return None
        
        return await self.user_repository.get_by_id(session["cliente_id"])
    
    async def change_password(
        self,
        cliente_id: str,
        current_password: str,
        new_password: str
    ) -> bool:
        """Cambiar contraseña"""
        # Obtener usuario con password actual
        user = await self.user_repository._collection.find_one(
            {"cliente_id": cliente_id},
            {"_id": 0}
        )
        
        if not user:
            raise ValueError("Usuario no encontrado")
        
        # Verificar contraseña actual
        if not verify_password(current_password, user.get("contrasena_hash", "")):
            raise ValueError("Contraseña actual incorrecta")
        
        # Actualizar contraseña
        new_hash = hash_password(new_password)
        success = await self.user_repository.update_password(cliente_id, new_hash)
        
        if success:
            # Invalidar todas las sesiones del usuario
            await self.session_repository.delete_user_sessions(cliente_id)
            
            await self.emit_event(
                AuthEvents.USER_UPDATED,
                {"cliente_id": cliente_id, "field": "password"}
            )
        
        return success


# Instancia singleton del servicio
auth_service = AuthService()
