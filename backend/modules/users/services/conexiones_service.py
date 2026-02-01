"""
Servicio de Conexiones entre Usuarios
Gestiona relaciones, solicitudes, invitaciones y transferencias
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging

from core.database import db
from ..models.conexiones_models import (
    EstadoCuenta, TipoRelacion, EstadoConexion, EstadoSolicitud,
    EstadoInvitacion, TipoCapacidad, PermisosConexion,
    get_default_permisos_por_relacion, get_default_capacidades, get_default_membresias
)

logger = logging.getLogger(__name__)


class ConexionesService:
    """Servicio para gestión de conexiones entre usuarios"""
    
    # ============== INICIALIZACIÓN ==============
    
    async def initialize_defaults(self):
        """Inicializar configuraciones por defecto"""
        # Permisos por relación
        permisos = get_default_permisos_por_relacion()
        for perm in permisos:
            existing = await db.config_permisos_relacion.find_one({
                "tipo": perm["tipo"],
                "subtipo": perm["subtipo"]
            })
            if not existing:
                await db.config_permisos_relacion.insert_one(perm)
        
        # Capacidades
        capacidades = get_default_capacidades()
        for cap in capacidades:
            existing = await db.capacidades_config.find_one({"capacidad_id": cap["capacidad_id"]})
            if not existing:
                await db.capacidades_config.insert_one(cap)
        
        # Membresías
        membresias = get_default_membresias()
        for mem in membresias:
            existing = await db.membresias_config.find_one({"membresia_id": mem["membresia_id"]})
            if not existing:
                await db.membresias_config.insert_one(mem)
        
        logger.info("Configuraciones por defecto inicializadas")
    
    # ============== GESTIÓN DE CONEXIONES ==============
    
    async def get_conexiones(self, user_id: str) -> List[Dict]:
        """Obtener todas las conexiones de un usuario"""
        user = await db.auth_users.find_one(
            {"user_id": user_id},
            {"conexiones": 1}
        )
        
        if not user or "conexiones" not in user:
            return []
        
        conexiones = user.get("conexiones", [])
        
        # Enriquecer con datos del usuario conectado
        for con in conexiones:
            connected_user = await db.auth_users.find_one(
                {"user_id": con["user_id"]},
                {"_id": 0, "nombre": 1, "apellido": 1, "email": 1, "estado_cuenta": 1, "avatar": 1}
            )
            if connected_user:
                con["usuario_nombre"] = f"{connected_user.get('nombre', '')} {connected_user.get('apellido', '')}".strip()
                con["usuario_email"] = connected_user.get("email")
                con["usuario_estado"] = connected_user.get("estado_cuenta", "activo")
                con["usuario_avatar"] = connected_user.get("avatar")
        
        return conexiones
    
    async def get_conexion(self, user_id: str, conexion_id: str) -> Optional[Dict]:
        """Obtener una conexión específica"""
        conexiones = await self.get_conexiones(user_id)
        for con in conexiones:
            if con.get("conexion_id") == conexion_id:
                return con
        return None
    
    async def crear_conexion(
        self,
        user_id: str,
        destino_user_id: str,
        tipo: str,
        subtipo: str,
        etiqueta: Optional[str] = None,
        permisos: Optional[Dict] = None,
        requiere_solicitud: bool = True
    ) -> Dict:
        """
        Crear una conexión entre usuarios.
        Si requiere_solicitud=True, crea solicitud en lugar de conexión directa.
        """
        # Verificar que destino existe
        destino = await db.auth_users.find_one({"user_id": destino_user_id})
        if not destino:
            return {"error": "Usuario destino no encontrado"}
        
        # Verificar que no existe conexión
        existing = await db.auth_users.find_one({
            "user_id": user_id,
            "conexiones.user_id": destino_user_id
        })
        if existing:
            return {"error": "Ya existe una conexión con este usuario"}
        
        # Obtener permisos por defecto si no se especifican
        if not permisos:
            # Para acudiente→acudido, el acudiente tiene permisos completos
            if subtipo == "acudido":
                # El acudiente tiene permisos sobre el acudido
                config = await db.config_permisos_relacion.find_one({
                    "tipo": "especial",
                    "subtipo": "acudiente"  # Permisos del acudiente
                })
            else:
                config = await db.config_permisos_relacion.find_one({
                    "tipo": tipo,
                    "subtipo": subtipo
                })
            permisos = config.get("permisos_default", {}) if config else {
                "transferir_wallet": True,
                "ver_wallet": True,
                "recargar_wallet": True,
                "recibir_alertas": True
            }
        
        conexion = {
            "conexion_id": f"con_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{destino_user_id[-6:]}",
            "user_id": destino_user_id,
            "tipo": tipo,
            "subtipo": subtipo,
            "etiqueta": etiqueta,
            "permisos": permisos,
            "estado": "activo",
            "creado_en": datetime.now(timezone.utc).isoformat()
        }
        
        # Agregar conexión al usuario
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$push": {"conexiones": conexion}}
        )
        
        # Crear conexión recíproca (con permisos inversos si aplica)
        conexion_reciproca = {
            "conexion_id": f"con_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{user_id[-6:]}",
            "user_id": user_id,
            "tipo": tipo,
            "subtipo": self._get_subtipo_reciproco(subtipo),
            "etiqueta": None,
            "permisos": self._get_permisos_reciprocos(tipo, subtipo),
            "estado": "activo",
            "creado_en": datetime.now(timezone.utc).isoformat()
        }
        
        await db.auth_users.update_one(
            {"user_id": destino_user_id},
            {"$push": {"conexiones": conexion_reciproca}}
        )
        
        return {"success": True, "conexion": conexion}
    
    def _get_subtipo_reciproco(self, subtipo: str) -> str:
        """Obtener el subtipo recíproco de una relación"""
        reciprocos = {
            "acudiente": "acudido",
            "acudido": "acudiente",
            "padre": "hijo",
            "madre": "hijo",
            "hijo": "padre",
            "hija": "padre",
            "tio": "sobrino",
            "tia": "sobrino",
            "abuelo": "nieto",
            "abuela": "nieto"
        }
        return reciprocos.get(subtipo, subtipo)
    
    def _get_permisos_reciprocos(self, tipo: str, subtipo: str) -> Dict:
        """Obtener permisos recíprocos (generalmente más limitados)"""
        # Por defecto, el recíproco tiene permisos mínimos
        if subtipo in ["acudiente", "padre", "madre", "tio", "tia", "abuelo", "abuela"]:
            # El dependiente no tiene permisos sobre el acudiente
            return {
                "transferir_wallet": False,
                "ver_wallet": False,
                "recargar_wallet": False,
                "recibir_alertas": False
            }
        return {
            "transferir_wallet": True,
            "ver_wallet": False,
            "recargar_wallet": False,
            "recibir_alertas": False
        }
    
    async def actualizar_conexion(
        self,
        user_id: str,
        conexion_id: str,
        updates: Dict
    ) -> Dict:
        """Actualizar una conexión existente"""
        result = await db.auth_users.update_one(
            {"user_id": user_id, "conexiones.conexion_id": conexion_id},
            {"$set": {f"conexiones.$.{k}": v for k, v in updates.items()}}
        )
        
        if result.modified_count == 0:
            return {"error": "Conexión no encontrada"}
        
        return {"success": True}
    
    async def eliminar_conexion(self, user_id: str, conexion_id: str) -> Dict:
        """Eliminar una conexión"""
        # Obtener conexión para saber el user_id destino
        conexion = await self.get_conexion(user_id, conexion_id)
        if not conexion:
            return {"error": "Conexión no encontrada"}
        
        destino_user_id = conexion["user_id"]
        
        # Eliminar de ambos usuarios
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$pull": {"conexiones": {"conexion_id": conexion_id}}}
        )
        
        await db.auth_users.update_one(
            {"user_id": destino_user_id},
            {"$pull": {"conexiones": {"user_id": user_id}}}
        )
        
        return {"success": True}
    
    # ============== SOLICITUDES DE CONEXIÓN ==============
    
    async def crear_solicitud(
        self,
        de_usuario_id: str,
        para_usuario_id: str,
        tipo: str,
        subtipo: str,
        etiqueta: Optional[str] = None,
        mensaje: Optional[str] = None
    ) -> Dict:
        """Crear solicitud de conexión"""
        # Verificar que no existe conexión ni solicitud pendiente
        existing_conexion = await db.auth_users.find_one({
            "user_id": de_usuario_id,
            "conexiones.user_id": para_usuario_id
        })
        if existing_conexion:
            return {"error": "Ya existe una conexión con este usuario"}
        
        existing_solicitud = await db.solicitudes_conexion.find_one({
            "de_usuario_id": de_usuario_id,
            "para_usuario_id": para_usuario_id,
            "estado": "pendiente"
        })
        if existing_solicitud:
            return {"error": "Ya existe una solicitud pendiente"}
        
        # Obtener nombres
        de_usuario = await db.auth_users.find_one({"user_id": de_usuario_id}, {"nombre": 1, "apellido": 1})
        para_usuario = await db.auth_users.find_one({"user_id": para_usuario_id}, {"nombre": 1, "apellido": 1})
        
        if not para_usuario:
            return {"error": "Usuario destino no encontrado"}
        
        solicitud = {
            "solicitud_id": f"sol_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{de_usuario_id[:8]}",
            "de_usuario_id": de_usuario_id,
            "de_usuario_nombre": f"{de_usuario.get('nombre', '')} {de_usuario.get('apellido', '')}".strip() if de_usuario else None,
            "para_usuario_id": para_usuario_id,
            "para_usuario_nombre": f"{para_usuario.get('nombre', '')} {para_usuario.get('apellido', '')}".strip(),
            "tipo": tipo,
            "subtipo": subtipo,
            "etiqueta": etiqueta,
            "mensaje": mensaje,
            "estado": "pendiente",
            "creado_en": datetime.now(timezone.utc).isoformat()
        }
        
        await db.solicitudes_conexion.insert_one(solicitud)
        
        # Remove MongoDB _id before returning
        solicitud.pop("_id", None)
        
        # Enviar notificación push al destinatario
        push_result = None
        try:
            from modules.notifications.services.push_service import push_notification_service
            
            de_nombre = solicitud["de_usuario_nombre"] or "Alguien"
            subtipo_label = self._get_subtipo_label(subtipo)
            
            push_result = await push_notification_service.send_notification(
                user_id=para_usuario_id,
                category_id="connections",
                title="🔗 Nueva Solicitud de Conexión",
                body=f"{de_nombre} quiere conectarse contigo como {subtipo_label}",
                data={
                    "type": "connection_request",
                    "solicitud_id": solicitud["solicitud_id"],
                    "de_usuario_id": de_usuario_id,
                    "action": "view_requests"
                },
                action_url="/mi-cuenta?tab=conexiones"
            )
        except Exception as e:
            logger.error(f"Error enviando push notification para solicitud: {e}")
        
        return {"success": True, "solicitud": solicitud, "push_notification": push_result}
    
    def _get_subtipo_label(self, subtipo: str) -> str:
        """Obtener etiqueta legible para subtipo de relación"""
        labels = {
            "acudiente": "Acudiente",
            "acudido": "Acudido",
            "padre": "Padre/Madre",
            "hijo": "Hijo/a",
            "hermano": "Hermano/a",
            "tio": "Tío/Tía",
            "abuelo": "Abuelo/a",
            "primo": "Primo/a",
            "amigo": "Amigo",
            "conocido": "Conocido",
            "companero": "Compañero",
            "otro": "Otro"
        }
        return labels.get(subtipo, subtipo)
    
    async def get_solicitudes_pendientes(self, user_id: str) -> List[Dict]:
        """Obtener solicitudes pendientes para un usuario"""
        cursor = db.solicitudes_conexion.find(
            {"para_usuario_id": user_id, "estado": "pendiente"},
            {"_id": 0}
        ).sort("creado_en", -1)
        return await cursor.to_list(length=50)
    
    async def get_solicitudes_enviadas(self, user_id: str) -> List[Dict]:
        """Obtener solicitudes enviadas por un usuario"""
        cursor = db.solicitudes_conexion.find(
            {"de_usuario_id": user_id},
            {"_id": 0}
        ).sort("creado_en", -1)
        return await cursor.to_list(length=50)
    
    async def responder_solicitud(
        self,
        solicitud_id: str,
        aceptar: bool,
        respondido_por: str,
        es_admin: bool = False
    ) -> Dict:
        """Responder a una solicitud de conexión"""
        solicitud = await db.solicitudes_conexion.find_one({"solicitud_id": solicitud_id})
        if not solicitud:
            return {"error": "Solicitud no encontrada"}
        
        if solicitud["estado"] != "pendiente":
            return {"error": "Solicitud ya fue respondida"}
        
        nuevo_estado = "aceptada" if aceptar else "rechazada"
        
        await db.solicitudes_conexion.update_one(
            {"solicitud_id": solicitud_id},
            {"$set": {
                "estado": nuevo_estado,
                "respondido_en": datetime.now(timezone.utc).isoformat(),
                "respondido_por": f"admin:{respondido_por}" if es_admin else respondido_por
            }}
        )
        
        if aceptar:
            # Crear la conexión
            result = await self.crear_conexion(
                user_id=solicitud["de_usuario_id"],
                destino_user_id=solicitud["para_usuario_id"],
                tipo=solicitud["tipo"],
                subtipo=solicitud["subtipo"],
                etiqueta=solicitud.get("etiqueta"),
                requiere_solicitud=False
            )
            if result.get("error"):
                return result
        
        # Enviar notificación push al solicitante original
        push_result = None
        try:
            from modules.notifications.services.push_service import push_notification_service
            
            para_nombre = solicitud.get("para_usuario_nombre") or "Un usuario"
            subtipo_label = self._get_subtipo_label(solicitud.get("subtipo", ""))
            
            if aceptar:
                title = "✅ Conexión Aceptada"
                body = f"{para_nombre} aceptó tu solicitud de conexión como {subtipo_label}"
                notification_type = "connection_accepted"
            else:
                title = "❌ Conexión Rechazada"
                body = f"{para_nombre} rechazó tu solicitud de conexión"
                notification_type = "connection_rejected"
            
            push_result = await push_notification_service.send_notification(
                user_id=solicitud["de_usuario_id"],
                category_id="connections",
                title=title,
                body=body,
                data={
                    "type": notification_type,
                    "solicitud_id": solicitud_id,
                    "para_usuario_id": solicitud["para_usuario_id"],
                    "action": "view_connections" if aceptar else "view_requests"
                },
                action_url="/mi-cuenta?tab=conexiones"
            )
        except Exception as e:
            logger.error(f"Error enviando push notification para respuesta solicitud: {e}")
        
        return {"success": True, "estado": nuevo_estado, "push_notification": push_result}
    
    # ============== INVITACIONES ==============
    
    async def crear_invitacion(
        self,
        invitado_por_id: str,
        email: str,
        nombre: Optional[str] = None,
        mensaje: Optional[str] = None,
        tipo_relacion: Optional[str] = None,
        subtipo: Optional[str] = None,
        monto_transferir: Optional[float] = None
    ) -> Dict:
        """Crear invitación para usuario no registrado"""
        import uuid
        
        # Verificar que email no está registrado
        existing = await db.auth_users.find_one({"email": email.lower()})
        if existing:
            return {"error": "Este email ya está registrado", "user_id": existing.get("user_id")}
        
        # Verificar invitación pendiente
        existing_inv = await db.invitaciones.find_one({
            "email_destino": email.lower(),
            "estado": "pendiente"
        })
        if existing_inv:
            return {"error": "Ya existe una invitación pendiente para este email"}
        
        # Obtener nombre del invitador
        invitador = await db.auth_users.find_one({"user_id": invitado_por_id}, {"nombre": 1, "apellido": 1})
        
        invitacion = {
            "invitacion_id": f"inv_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "invitado_por_id": invitado_por_id,
            "invitado_por_nombre": f"{invitador.get('nombre', '')} {invitador.get('apellido', '')}".strip() if invitador else None,
            "email_destino": email.lower(),
            "nombre_destino": nombre,
            "mensaje": mensaje,
            "tipo_relacion_propuesta": tipo_relacion,
            "subtipo_propuesto": subtipo,
            "monto_transferir": monto_transferir,
            "estado": "pendiente",
            "token": uuid.uuid4().hex,
            "creado_en": datetime.now(timezone.utc).isoformat(),
            "expira_en": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
        }
        
        await db.invitaciones.insert_one(invitacion)
        
        # Remove MongoDB _id before returning
        invitacion.pop("_id", None)
        
        # TODO: Enviar email de invitación
        # send_invitation_email(email, invitacion)
        
        return {
            "success": True,
            "invitacion": invitacion,
            "link": f"https://chipilink.me/registro?inv={invitacion['token']}"
        }
    
    async def procesar_invitacion(self, token: str, nuevo_user_id: str) -> Dict:
        """Procesar invitación cuando usuario se registra"""
        invitacion = await db.invitaciones.find_one({"token": token, "estado": "pendiente"})
        if not invitacion:
            return {"error": "Invitación no válida o expirada"}
        
        # Marcar como aceptada
        await db.invitaciones.update_one(
            {"token": token},
            {"$set": {
                "estado": "aceptada",
                "aceptado_en": datetime.now(timezone.utc).isoformat(),
                "usuario_creado_id": nuevo_user_id
            }}
        )
        
        # Crear conexión si se especificó
        if invitacion.get("tipo_relacion_propuesta"):
            await self.crear_conexion(
                user_id=invitacion["invitado_por_id"],
                destino_user_id=nuevo_user_id,
                tipo=invitacion["tipo_relacion_propuesta"],
                subtipo=invitacion.get("subtipo_propuesto", "amigo"),
                requiere_solicitud=False
            )
        
        # Transferir si se especificó monto
        if invitacion.get("monto_transferir"):
            await self.transferir_wallet(
                de_usuario_id=invitacion["invitado_por_id"],
                para_usuario_id=nuevo_user_id,
                monto=invitacion["monto_transferir"],
                mensaje=f"Bienvenido a ChiPiLink - {invitacion.get('mensaje', '')}"
            )
        
        return {"success": True}
    
    # ============== USUARIOS ACUDIDOS ==============
    
    async def crear_acudido(
        self,
        acudiente_id: str,
        nombre: str,
        apellido: Optional[str] = None,
        email: Optional[str] = None,
        fecha_nacimiento: Optional[str] = None,
        genero: Optional[str] = None,
        notas: Optional[str] = None,
        creado_por_admin: bool = False,
        admin_id: Optional[str] = None
    ) -> Dict:
        """Crear usuario acudido (cuenta gestionada)"""
        import uuid
        
        # Verificar email único si se proporciona
        if email:
            existing = await db.auth_users.find_one({"email": email.lower()})
            if existing:
                return {"error": "Email ya registrado"}
        
        new_user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        acudido = {
            "user_id": cliente_id,
            "nombre": nombre,
            "apellido": apellido,
            "email": email.lower() if email else None,
            "estado_cuenta": "acudido",
            "tipo_usuario": "menor",
            "fecha_nacimiento": fecha_nacimiento,
            "genero": genero,
            "notas": notas,
            "creado_por": f"admin:{admin_id}" if creado_por_admin else f"acudiente:{acudiente_id}",
            "creado_en": datetime.now(timezone.utc).isoformat(),
            "wallet": {"USD": 0},
            "conexiones": [],
            "capacidades": [
                {
                    "capacidad_id": "cliente",
                    "tipo": "predeterminada",
                    "activa": True,
                    "fecha_activacion": datetime.now(timezone.utc).isoformat()
                }
            ],
            "marketing": {
                "mostrar_servicios": True,
                "servicios_sugeridos": None
            }
        }
        
        await db.auth_users.insert_one(acudido)
        
        # Crear conexión con acudiente
        await self.crear_conexion(
            user_id=acudiente_id,
            destino_user_id=new_user_id,
            tipo="especial",
            subtipo="acudido",
            etiqueta=f"{nombre} {apellido or ''}".strip(),
            requiere_solicitud=False
        )
        
        # Agregar capacidad de acudiente si no la tiene
        await self._asegurar_capacidad(acudiente_id, "acudiente")
        
        return {
            "success": True,
            "acudido": {
                "user_id": cliente_id,
                "nombre": nombre,
                "apellido": apellido,
                "estado_cuenta": "acudido"
            }
        }
    
    async def activar_cuenta_acudido(self, acudido_id: str, email: str, contrasena_hash: str) -> Dict:
        """Activar cuenta de acudido (darle credenciales)"""
        result = await db.auth_users.update_one(
            {"user_id": acudido_id, "estado_cuenta": "acudido"},
            {"$set": {
                "estado_cuenta": "activo",
                "email": email.lower(),
                "contrasena_hash": contrasena_hash,
                "activado_en": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count == 0:
            return {"error": "Usuario no encontrado o ya activo"}
        
        return {"success": True}
    
    # ============== TRANSFERENCIAS ==============
    
    async def transferir_wallet(
        self,
        de_usuario_id: str,
        para_usuario_id: str,
        monto: float,
        mensaje: Optional[str] = None
    ) -> Dict:
        """Transferir saldo entre wallets"""
        if monto <= 0:
            return {"error": "Monto debe ser positivo"}
        
        # Verificar conexión y permisos
        conexion = None
        de_usuario = await db.auth_users.find_one({"user_id": de_usuario_id})
        para_usuario = await db.auth_users.find_one({"user_id": para_usuario_id})
        
        if not de_usuario:
            return {"error": "Usuario origen no encontrado"}
        if not para_usuario:
            return {"error": "Usuario destino no encontrado"}
            
        for con in de_usuario.get("conexiones", []):
            if con["user_id"] == para_usuario_id:
                conexion = con
                break
        
        if not conexion:
            return {"error": "Debes tener conexión con el usuario para transferir"}
        
        if not conexion.get("permisos", {}).get("transferir_wallet", False):
            return {"error": "No tienes permiso para transferir a este usuario"}
        
        # Verificar límite diario
        limite = conexion.get("permisos", {}).get("limite_transferencia_diario")
        if limite:
            # Calcular transferencias del día
            hoy = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
            transferencias_hoy = await db.transferencias_wallet.aggregate([
                {
                    "$match": {
                        "de_usuario_id": de_usuario_id,
                        "para_usuario_id": para_usuario_id,
                        "creado_en": {"$gte": hoy.isoformat()}
                    }
                },
                {"$group": {"_id": None, "total": {"$sum": "$monto"}}}
            ]).to_list(length=1)
            
            total_hoy = transferencias_hoy[0]["total"] if transferencias_hoy else 0
            if total_hoy + monto > limite:
                return {"error": f"Excede límite diario de ${limite}. Ya transferiste ${total_hoy} hoy."}
        
        # Verificar saldo
        wallet = de_usuario.get("wallet", {})
        saldo = wallet.get("USD", 0)
        if saldo < monto:
            return {"error": f"Saldo insuficiente. Tienes ${saldo}"}
        
        # Ejecutar transferencia
        await db.auth_users.update_one(
            {"user_id": de_usuario_id},
            {"$inc": {"wallet.USD": -monto}}
        )
        
        await db.auth_users.update_one(
            {"user_id": para_usuario_id},
            {"$inc": {"wallet.USD": monto}}
        )
        
        # Registrar transferencia
        transferencia = {
            "transferencia_id": f"txf_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
            "de_usuario_id": de_usuario_id,
            "para_usuario_id": para_usuario_id,
            "monto": monto,
            "moneda": "USD",
            "mensaje": mensaje,
            "tipo_relacion": f"{conexion['tipo']}:{conexion['subtipo']}",
            "estado": "completada",
            "creado_en": datetime.now(timezone.utc).isoformat()
        }
        
        await db.transferencias_wallet.insert_one(transferencia)
        transferencia.pop("_id", None)
        
        # Enviar notificaciones push
        try:
            from modules.notifications.services.push_service import push_notification_service
            
            de_nombre = f"{de_usuario.get('nombre', '')} {de_usuario.get('apellido', '')}".strip() or "Alguien"
            para_nombre = f"{para_usuario.get('nombre', '')} {para_usuario.get('apellido', '')}".strip() or "Usuario"
            
            # Notificar al remitente
            await push_notification_service.send_notification(
                user_id=de_usuario_id,
                category_id="wallet_alerts",
                title="💸 Transferencia Enviada",
                body=f"Enviaste ${monto:.2f} a {para_nombre}",
                data={
                    "type": "transfer_sent",
                    "transferencia_id": transferencia["transferencia_id"],
                    "monto": monto
                },
                action_url="/mi-cuenta?tab=wallet"
            )
            
            # Notificar al destinatario
            await push_notification_service.send_notification(
                user_id=para_usuario_id,
                category_id="wallet_alerts",
                title="💰 Transferencia Recibida",
                body=f"{de_nombre} te envió ${monto:.2f}" + (f" - {mensaje}" if mensaje else ""),
                data={
                    "type": "transfer_received",
                    "transferencia_id": transferencia["transferencia_id"],
                    "monto": monto,
                    "de_usuario_id": de_usuario_id
                },
                action_url="/mi-cuenta?tab=wallet"
            )
            
        except Exception as e:
            logger.error(f"Error enviando push notifications para transferencia: {e}")
        
        return {"success": True, "transferencia": transferencia}
    
    # ============== ALERTAS ==============
    
    async def crear_alerta_saldo_insuficiente(
        self,
        usuario_id: str,
        monto_requerido: float,
        saldo_actual: float,
        descripcion: str
    ) -> Dict:
        """Crear alerta de saldo insuficiente (envía a usuario y acudientes)"""
        from modules.notifications.services.push_service import push_notification_service
        
        # Obtener usuario
        usuario = await db.auth_users.find_one({"user_id": usuario_id})
        if not usuario:
            return {"error": "Usuario no encontrado"}
        
        usuario_nombre = f"{usuario.get('nombre', '')} {usuario.get('apellido', '')}".strip() or "Usuario"
        
        # Obtener acudientes con permiso de alertas
        acudientes_ids = []
        for con in usuario.get("conexiones", []):
            if con.get("subtipo") == "acudiente" and con.get("permisos", {}).get("recibir_alertas"):
                acudientes_ids.append(con["user_id"])
        
        alerta = {
            "alerta_id": f"alrt_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{usuario_id[:8]}",
            "usuario_id": usuario_id,
            "usuario_nombre": usuario_nombre,
            "acudientes_ids": acudientes_ids,
            "monto_requerido": monto_requerido,
            "saldo_actual": saldo_actual,
            "descripcion": descripcion,
            "estado": "pendiente",
            "creado_en": datetime.now(timezone.utc).isoformat()
        }
        
        await db.alertas_wallet.insert_one(alerta)
        alerta.pop("_id", None)
        
        # Enviar notificaciones push
        push_results = {"usuario": None, "acudientes": []}
        
        try:
            # Notificar al usuario
            push_results["usuario"] = await push_notification_service.send_notification(
                user_id=usuario_id,
                category_id="wallet_alerts",
                title="💰 Saldo Insuficiente",
                body=f"Necesitas ${monto_requerido:.2f} para: {descripcion}. Saldo actual: ${saldo_actual:.2f}",
                data={
                    "type": "wallet_alert",
                    "alerta_id": alerta["alerta_id"],
                    "action": "view_wallet"
                },
                action_url="/mi-cuenta?tab=wallet"
            )
            
            # Notificar a acudientes
            for acudiente_id in acudientes_ids:
                result = await push_notification_service.send_notification(
                    user_id=acudiente_id,
                    category_id="wallet_alerts",
                    title="🔔 Alerta de Acudido",
                    body=f"{usuario_nombre} necesita ${monto_requerido:.2f} para: {descripcion}",
                    data={
                        "type": "acudido_wallet_alert",
                        "alerta_id": alerta["alerta_id"],
                        "acudido_id": usuario_id,
                        "action": "recargar_acudido"
                    },
                    action_url="/mi-cuenta?tab=acudidos"
                )
                push_results["acudientes"].append({
                    "acudiente_id": acudiente_id,
                    "result": result
                })
                
        except Exception as e:
            logger.error(f"Error enviando push notifications: {e}")
            push_results["error"] = str(e)
        
        return {
            "success": True, 
            "alerta": alerta,
            "push_notifications": push_results
        }
    
    # ============== CAPACIDADES ==============
    
    async def get_capacidades_config(self) -> List[Dict]:
        """Obtener todas las capacidades configuradas"""
        cursor = db.capacidades_config.find({"activa": True}, {"_id": 0}).sort("orden", 1)
        return await cursor.to_list(length=100)
    
    async def get_capacidades_usuario(self, user_id: str) -> List[Dict]:
        """Obtener capacidades de un usuario"""
        user = await db.auth_users.find_one({"user_id": user_id}, {"capacidades": 1})
        return user.get("capacidades", []) if user else []
    
    async def _asegurar_capacidad(self, user_id: str, capacidad_id: str) -> bool:
        """Asegurar que usuario tenga una capacidad"""
        existing = await db.auth_users.find_one({
            "user_id": user_id,
            "capacidades.capacidad_id": capacidad_id
        })
        
        if existing:
            return True
        
        capacidad_config = await db.capacidades_config.find_one({"capacidad_id": capacidad_id})
        if not capacidad_config:
            return False
        
        nueva_capacidad = {
            "capacidad_id": capacidad_id,
            "tipo": capacidad_config.get("tipo", "solicitada"),
            "activa": True,
            "fecha_activacion": datetime.now(timezone.utc).isoformat()
        }
        
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$push": {"capacidades": nueva_capacidad}}
        )
        
        return True
    
    async def otorgar_capacidad(
        self,
        user_id: str,
        capacidad_id: str,
        otorgado_por: str,
        motivo: Optional[str] = None,
        tipo: str = "beneficio_extendido"
    ) -> Dict:
        """Otorgar capacidad a un usuario (admin)"""
        # Verificar que capacidad existe
        capacidad_config = await db.capacidades_config.find_one({"capacidad_id": capacidad_id})
        if not capacidad_config:
            return {"error": "Capacidad no encontrada"}
        
        # Verificar que usuario no la tiene
        existing = await db.auth_users.find_one({
            "user_id": user_id,
            "capacidades.capacidad_id": capacidad_id,
            "capacidades.activa": True
        })
        if existing:
            return {"error": "Usuario ya tiene esta capacidad"}
        
        nueva_capacidad = {
            "capacidad_id": capacidad_id,
            "tipo": tipo,
            "activa": True,
            "otorgado_por": otorgado_por,
            "motivo": motivo,
            "fecha_activacion": datetime.now(timezone.utc).isoformat()
        }
        
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$push": {"capacidades": nueva_capacidad}}
        )
        
        return {"success": True, "capacidad": nueva_capacidad}
    
    async def revocar_capacidad(self, user_id: str, capacidad_id: str) -> Dict:
        """Revocar capacidad de un usuario"""
        result = await db.auth_users.update_one(
            {"user_id": user_id, "capacidades.capacidad_id": capacidad_id},
            {"$set": {"capacidades.$.activa": False}}
        )
        
        if result.modified_count == 0:
            return {"error": "Capacidad no encontrada"}
        
        return {"success": True}
    
    # ============== MARKETING ==============
    
    async def get_servicios_sugeridos(self, user_id: str) -> List[Dict]:
        """Obtener servicios sugeridos para un usuario"""
        user = await db.auth_users.find_one({"user_id": user_id}, {"marketing": 1, "capacidades": 1})
        if not user:
            return []
        
        marketing = user.get("marketing", {})
        if not marketing.get("mostrar_servicios", True):
            return []
        
        # Obtener membresías activas del usuario
        suscripciones = await db.suscripciones_usuarios.find(
            {"user_id": user_id, "estado": "activo"},
            {"membresia_id": 1}
        ).to_list(length=50)
        membresias_activas = [s["membresia_id"] for s in suscripciones]
        
        # Obtener todas las membresías
        query = {"activa": True}
        servicios_sugeridos = marketing.get("servicios_sugeridos")
        servicios_excluidos = marketing.get("servicios_excluidos", [])
        
        if servicios_sugeridos:
            query["membresia_id"] = {"$in": servicios_sugeridos}
        
        if servicios_excluidos:
            if "membresia_id" in query:
                query["membresia_id"]["$nin"] = servicios_excluidos
            else:
                query["membresia_id"] = {"$nin": servicios_excluidos}
        
        cursor = db.membresias_config.find(query, {"_id": 0}).sort("orden", 1)
        membresias = await cursor.to_list(length=20)
        
        # Filtrar las que ya tiene
        return [m for m in membresias if m["membresia_id"] not in membresias_activas]
    
    async def configurar_marketing_usuario(
        self,
        user_id: str,
        mostrar_servicios: bool,
        servicios_sugeridos: Optional[List[str]] = None,
        servicios_excluidos: Optional[List[str]] = None
    ) -> Dict:
        """Configurar marketing para un usuario (admin)"""
        update = {
            "marketing.mostrar_servicios": mostrar_servicios
        }
        if servicios_sugeridos is not None:
            update["marketing.servicios_sugeridos"] = servicios_sugeridos
        if servicios_excluidos is not None:
            update["marketing.servicios_excluidos"] = servicios_excluidos
        
        await db.auth_users.update_one(
            {"user_id": user_id},
            {"$set": update}
        )
        
        return {"success": True}
    
    # ============== BÚSQUEDA ==============
    
    async def buscar_usuarios(
        self,
        query: str,
        excluir_user_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Buscar usuarios por nombre o email"""
        search_query = {
            "$or": [
                {"nombre": {"$regex": query, "$options": "i"}},
                {"apellido": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ]
        }
        
        if excluir_user_id:
            search_query["user_id"] = {"$ne": excluir_user_id}
        
        cursor = db.auth_users.find(
            search_query,
            {"_id": 0, "user_id": 1, "nombre": 1, "apellido": 1, "email": 1, "avatar": 1, "estado_cuenta": 1}
        ).limit(limit)
        
        return await cursor.to_list(length=limit)


# Instancia global
conexiones_service = ConexionesService()
