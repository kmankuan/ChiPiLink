"""
Store Module - Servicio de Notificaciones de Vinculación
Envía push notifications cuando hay cambios en el estado de vinculaciones
"""
from typing import Optional
import logging

from core.database import db

logger = logging.getLogger(__name__)


class VinculacionNotificationService:
    """Servicio para enviar notificaciones relacionadas con vinculaciones"""
    
    async def _get_push_service(self):
        """Obtener el servicio de push notifications"""
        try:
            from modules.notifications.services.push_service import push_service
            return push_service
        except ImportError:
            logger.warning("Push service not available")
            return None
    
    async def _get_user_email(self, cliente_id: str) -> Optional[str]:
        """Obtener email del usuario"""
        user = await db.auth_users.find_one(
            {"cliente_id": cliente_id},
            {"email": 1}
        )
        return user.get("email") if user else None
    
    async def _get_estudiante_nombre(self, sync_id: str) -> str:
        """Obtener nombre del estudiante"""
        estudiante = await db.estudiantes_sincronizados.find_one(
            {"sync_id": sync_id},
            {"nombre_completo": 1}
        )
        return estudiante.get("nombre_completo", "Estudiante") if estudiante else "Estudiante"
    
    async def notificar_solicitud_recibida(
        self,
        vinculacion_id: str,
        solicitante_id: str,
        destinatario_id: str,
        estudiante_sync_id: str,
        tipo_destinatario: str = "admin"  # "admin" o "principal"
    ):
        """
        Notificar que se recibió una nueva solicitud de vinculación.
        Se envía al admin o al acudiente principal.
        """
        push_service = await self._get_push_service()
        if not push_service:
            return
        
        try:
            estudiante_nombre = await self._get_estudiante_nombre(estudiante_sync_id)
            
            title = "Nueva solicitud de vinculación"
            body = f"Un acudiente solicita vincularse con {estudiante_nombre}"
            
            if tipo_destinatario == "principal":
                body = f"Alguien solicita ser acudiente de {estudiante_nombre}. Revisa y aprueba."
            
            # Guardar notificación en DB
            await self._save_notification(
                destinatario_id,
                "vinculacion_solicitud",
                title,
                body,
                {
                    "vinculacion_id": vinculacion_id,
                    "estudiante_sync_id": estudiante_sync_id,
                    "action_url": "/admin/book-orders" if tipo_destinatario == "admin" else "/mis-pedidos-libros"
                }
            )
            
            # Enviar push
            await push_service.send_notification(
                user_id=destinatario_id,
                category_id="system",
                title=title,
                body=body,
                data={
                    "type": "vinculacion_solicitud",
                    "vinculacion_id": vinculacion_id,
                    "estudiante_sync_id": estudiante_sync_id
                },
                action_url="/admin/book-orders" if tipo_destinatario == "admin" else "/mis-pedidos-libros"
            )
            
            logger.info(f"Notificación de solicitud enviada a {destinatario_id}")
            
        except Exception as e:
            logger.error(f"Error enviando notificación de solicitud: {e}")
    
    async def notificar_vinculacion_aprobada(
        self,
        vinculacion_id: str,
        acudiente_id: str,
        estudiante_sync_id: str,
        aprobado_por: str = "admin"
    ):
        """
        Notificar al acudiente que su vinculación fue aprobada.
        """
        push_service = await self._get_push_service()
        if not push_service:
            return
        
        try:
            estudiante_nombre = await self._get_estudiante_nombre(estudiante_sync_id)
            
            title = "¡Vinculación aprobada!"
            body = f"Tu vinculación con {estudiante_nombre} ha sido aprobada. Ya puedes hacer pedidos de libros."
            
            # Guardar notificación en DB
            await self._save_notification(
                acudiente_id,
                "vinculacion_aprobada",
                title,
                body,
                {
                    "vinculacion_id": vinculacion_id,
                    "estudiante_sync_id": estudiante_sync_id,
                    "action_url": "/mis-pedidos-libros"
                }
            )
            
            # Enviar push
            await push_service.send_notification(
                user_id=acudiente_id,
                category_id="system",
                title=title,
                body=body,
                data={
                    "type": "vinculacion_aprobada",
                    "vinculacion_id": vinculacion_id,
                    "estudiante_sync_id": estudiante_sync_id
                },
                action_url="/mis-pedidos-libros"
            )
            
            logger.info(f"Notificación de aprobación enviada a {acudiente_id}")
            
        except Exception as e:
            logger.error(f"Error enviando notificación de aprobación: {e}")
    
    async def notificar_vinculacion_rechazada(
        self,
        vinculacion_id: str,
        acudiente_id: str,
        estudiante_sync_id: str,
        motivo: Optional[str] = None
    ):
        """
        Notificar al acudiente que su vinculación fue rechazada.
        """
        push_service = await self._get_push_service()
        if not push_service:
            return
        
        try:
            estudiante_nombre = await self._get_estudiante_nombre(estudiante_sync_id)
            
            title = "Solicitud de vinculación rechazada"
            body = f"Tu solicitud de vinculación con {estudiante_nombre} no fue aprobada."
            if motivo:
                body += f" Motivo: {motivo}"
            
            # Guardar notificación en DB
            await self._save_notification(
                acudiente_id,
                "vinculacion_rechazada",
                title,
                body,
                {
                    "vinculacion_id": vinculacion_id,
                    "estudiante_sync_id": estudiante_sync_id,
                    "motivo": motivo
                }
            )
            
            # Enviar push
            await push_service.send_notification(
                user_id=acudiente_id,
                category_id="system",
                title=title,
                body=body,
                data={
                    "type": "vinculacion_rechazada",
                    "vinculacion_id": vinculacion_id
                }
            )
            
            logger.info(f"Notificación de rechazo enviada a {acudiente_id}")
            
        except Exception as e:
            logger.error(f"Error enviando notificación de rechazo: {e}")
    
    async def notificar_invitacion_recibida(
        self,
        invitacion_id: str,
        invitado_email: str,
        invitador_id: str,
        estudiante_sync_id: str
    ):
        """
        Notificar que se recibió una invitación para ser acudiente.
        Busca al usuario por email.
        """
        push_service = await self._get_push_service()
        if not push_service:
            return
        
        try:
            # Buscar usuario por email
            user = await db.auth_users.find_one(
                {"email": invitado_email},
                {"cliente_id": 1}
            )
            
            if not user:
                logger.info(f"Usuario con email {invitado_email} no encontrado para notificación")
                return
            
            invitado_id = user["cliente_id"]
            estudiante_nombre = await self._get_estudiante_nombre(estudiante_sync_id)
            
            title = "Invitación para ser acudiente"
            body = f"Has sido invitado/a a ser acudiente de {estudiante_nombre}. Revisa y acepta la invitación."
            
            # Guardar notificación en DB
            await self._save_notification(
                invitado_id,
                "vinculacion_invitacion",
                title,
                body,
                {
                    "invitacion_id": invitacion_id,
                    "estudiante_sync_id": estudiante_sync_id,
                    "action_url": "/mis-pedidos-libros"
                }
            )
            
            # Enviar push
            await push_service.send_notification(
                user_id=invitado_id,
                category_id="system",
                title=title,
                body=body,
                data={
                    "type": "vinculacion_invitacion",
                    "invitacion_id": invitacion_id,
                    "estudiante_sync_id": estudiante_sync_id
                },
                action_url="/mis-pedidos-libros"
            )
            
            logger.info(f"Notificación de invitación enviada a {invitado_id}")
            
        except Exception as e:
            logger.error(f"Error enviando notificación de invitación: {e}")
    
    async def notificar_cambio_estado_pedido(
        self,
        pedido_id: str,
        acudiente_id: str,
        estudiante_nombre: str,
        nuevo_estado: str
    ):
        """
        Notificar cambio de estado en un pedido de libros.
        """
        push_service = await self._get_push_service()
        if not push_service:
            return
        
        try:
            estados_mensajes = {
                "confirmado": ("Pedido confirmado", f"Tu pedido de libros para {estudiante_nombre} ha sido confirmado."),
                "en_proceso": ("Pedido en proceso", f"Tu pedido para {estudiante_nombre} está siendo procesado."),
                "listo_retiro": ("¡Pedido listo!", f"Tu pedido para {estudiante_nombre} está listo para retiro."),
                "entregado": ("Pedido entregado", f"Tu pedido para {estudiante_nombre} ha sido entregado."),
                "cancelado": ("Pedido cancelado", f"Tu pedido para {estudiante_nombre} ha sido cancelado.")
            }
            
            if nuevo_estado not in estados_mensajes:
                return
            
            title, body = estados_mensajes[nuevo_estado]
            
            # Guardar notificación en DB
            await self._save_notification(
                acudiente_id,
                "pedido_estado",
                title,
                body,
                {
                    "pedido_id": pedido_id,
                    "estado": nuevo_estado,
                    "action_url": "/mis-pedidos-libros"
                }
            )
            
            # Enviar push
            await push_service.send_notification(
                user_id=acudiente_id,
                category_id="orders",
                title=title,
                body=body,
                data={
                    "type": "pedido_estado",
                    "pedido_id": pedido_id,
                    "estado": nuevo_estado
                },
                action_url="/mis-pedidos-libros"
            )
            
            logger.info(f"Notificación de cambio de estado enviada a {acudiente_id}")
            
        except Exception as e:
            logger.error(f"Error enviando notificación de estado: {e}")
    
    async def _save_notification(
        self,
        user_id: str,
        notification_type: str,
        title: str,
        body: str,
        data: dict = None
    ):
        """Guardar notificación en DB para historial"""
        from datetime import datetime, timezone
        import uuid
        
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "type": notification_type,
            "title": title,
            "body": body,
            "data": data or {},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.user_notifications.insert_one(notification)


# Singleton
vinculacion_notification_service = VinculacionNotificationService()
