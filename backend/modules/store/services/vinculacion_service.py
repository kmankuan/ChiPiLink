"""
Store Module - Servicio de Vinculación Estudiante-Acudiente
Gestiona las relaciones entre estudiantes y acudientes con roles y aprobaciones
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from .google_sheets_service import google_sheets_service

logger = logging.getLogger(__name__)


class VinculacionService:
    """
    Servicio para gestionar vinculaciones estudiante-acudiente.
    
    Flujos soportados:
    1. Primera vinculación: Acudiente -> busca por número -> Admin aprueba
    2. Invitación: Principal invita a otro acudiente -> Invitado acepta
    3. Solicitud: Nuevo acudiente solicita -> Principal (o Admin) aprueba
    4. Admin: Admin puede vincular/desvincular directamente
    """
    
    async def buscar_estudiante_para_vincular(
        self,
        numero_estudiante: str
    ) -> Dict:
        """
        Buscar un estudiante por su número para vinculación.
        Retorna el estudiante y su estado de vinculación.
        """
        # Buscar en estudiantes sincronizados
        estudiante = await google_sheets_service.buscar_estudiante_por_numero(numero_estudiante)
        
        if not estudiante:
            return {
                "encontrado": False,
                "mensaje": "No se encontró estudiante con ese número en la lista de la escuela"
            }
        
        # Verificar si ya tiene acudiente principal
        vinculacion_principal = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante["sync_id"],
            "rol": "principal",
            "estado": "aprobada",
            "activo": True
        })
        
        tiene_principal = vinculacion_principal is not None
        
        return {
            "encontrado": True,
            "estudiante": {
                "sync_id": estudiante["sync_id"],
                "numero": estudiante["numero_estudiante"],
                "nombre": estudiante["nombre_completo"],
                "grado": estudiante["grado"],
                "seccion": estudiante.get("seccion")
            },
            "tiene_principal": tiene_principal,
            "accion_requerida": "solicitar_vinculacion" if tiene_principal else "primera_vinculacion"
        }
    
    async def solicitar_vinculacion(
        self,
        numero_estudiante: str,
        acudiente_cliente_id: str,
        relacion: str = "acudiente",
        acepto_responsabilidad: bool = True,
        mensaje: str = None
    ) -> Dict:
        """
        Solicitar vinculación con un estudiante.
        
        Si es la primera vinculación, va a Admin para aprobación.
        Si ya tiene Principal, va al Principal (y Admin recibe notificación).
        """
        # Buscar estudiante
        estudiante = await google_sheets_service.buscar_estudiante_por_numero(numero_estudiante)
        if not estudiante:
            raise ValueError("Estudiante no encontrado en la lista de la escuela")
        
        # Verificar que no tenga ya una vinculación activa o pendiente
        vinculacion_existente = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante["sync_id"],
            "acudiente_cliente_id": acudiente_cliente_id,
            "estado": {"$in": ["aprobada", "pendiente_admin", "pendiente_principal"]},
            "activo": True
        })
        
        if vinculacion_existente:
            raise ValueError("Ya tienes una vinculación activa o pendiente con este estudiante")
        
        # Verificar si ya tiene principal
        vinculacion_principal = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante["sync_id"],
            "rol": "principal",
            "estado": "aprobada",
            "activo": True
        })
        
        now = datetime.now(timezone.utc).isoformat()
        
        vinculacion = {
            "vinculacion_id": f"vinc_{uuid.uuid4().hex[:12]}",
            "estudiante_sync_id": estudiante["sync_id"],
            "acudiente_cliente_id": acudiente_cliente_id,
            "rol": "principal" if not vinculacion_principal else "autorizado",
            "estado": "pendiente_principal" if vinculacion_principal else "pendiente_admin",
            "activo": True,
            "solicitado_por_id": acudiente_cliente_id,
            "solicitado_por_tipo": "acudiente",
            "relacion": relacion,
            "mensaje_solicitud": mensaje,
            "acepto_responsabilidad": acepto_responsabilidad,
            "fecha_acepto_responsabilidad": now if acepto_responsabilidad else None,
            "fecha_solicitud": now,
            "fecha_actualizacion": now
        }
        
        await db.vinculaciones.insert_one(vinculacion)
        
        # Crear notificación
        if vinculacion_principal:
            # Notificar al principal
            await self._crear_notificacion(
                destinatario_id=vinculacion_principal["acudiente_cliente_id"],
                tipo="solicitud_vinculacion",
                titulo="Nueva solicitud de vinculación",
                mensaje=f"Alguien desea vincularse como acudiente de {estudiante['nombre_completo']}",
                datos={
                    "vinculacion_id": vinculacion["vinculacion_id"],
                    "estudiante_nombre": estudiante["nombre_completo"]
                }
            )
        
        # Siempre notificar a admin
        await self._crear_notificacion_admin(
            tipo="solicitud_vinculacion",
            titulo="Nueva solicitud de vinculación" + (" (primer acudiente)" if not vinculacion_principal else ""),
            mensaje=f"Solicitud de vinculación para {estudiante['nombre_completo']}",
            datos={
                "vinculacion_id": vinculacion["vinculacion_id"],
                "estudiante_sync_id": estudiante["sync_id"],
                "requiere_accion": not vinculacion_principal
            }
        )
        
        vinculacion.pop("_id", None)
        return {
            "success": True,
            "vinculacion": vinculacion,
            "mensaje": "Solicitud enviada. " + (
                "El acudiente principal debe aprobarla." if vinculacion_principal 
                else "Un administrador revisará tu solicitud."
            )
        }
    
    async def aprobar_vinculacion(
        self,
        vinculacion_id: str,
        aprobador_id: str,
        aprobador_tipo: str  # "admin" o "principal"
    ) -> Dict:
        """Aprobar una solicitud de vinculación"""
        vinculacion = await db.vinculaciones.find_one(
            {"vinculacion_id": vinculacion_id},
            {"_id": 0}
        )
        
        if not vinculacion:
            raise ValueError("Vinculación no encontrada")
        
        if vinculacion["estado"] not in ["pendiente_admin", "pendiente_principal"]:
            raise ValueError("Esta vinculación no está pendiente de aprobación")
        
        # Validar que el aprobador tenga permiso
        if aprobador_tipo == "principal":
            # Verificar que sea el principal del estudiante
            es_principal = await db.vinculaciones.find_one({
                "estudiante_sync_id": vinculacion["estudiante_sync_id"],
                "acudiente_cliente_id": aprobador_id,
                "rol": "principal",
                "estado": "aprobada",
                "activo": True
            })
            if not es_principal:
                raise ValueError("Solo el acudiente principal puede aprobar esta solicitud")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.vinculaciones.update_one(
            {"vinculacion_id": vinculacion_id},
            {"$set": {
                "estado": "aprobada",
                "aprobado_por_id": aprobador_id,
                "aprobado_por_tipo": aprobador_tipo,
                "fecha_aprobacion": now,
                "fecha_actualizacion": now
            }}
        )
        
        # Notificar al solicitante
        await self._crear_notificacion(
            destinatario_id=vinculacion["acudiente_cliente_id"],
            tipo="vinculacion_aprobada",
            titulo="Vinculación aprobada",
            mensaje="Tu solicitud de vinculación ha sido aprobada",
            datos={"vinculacion_id": vinculacion_id}
        )
        
        return {"success": True, "mensaje": "Vinculación aprobada"}
    
    async def rechazar_vinculacion(
        self,
        vinculacion_id: str,
        rechazador_id: str,
        rechazador_tipo: str,
        motivo: str = None
    ) -> Dict:
        """Rechazar una solicitud de vinculación"""
        vinculacion = await db.vinculaciones.find_one(
            {"vinculacion_id": vinculacion_id},
            {"_id": 0}
        )
        
        if not vinculacion:
            raise ValueError("Vinculación no encontrada")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.vinculaciones.update_one(
            {"vinculacion_id": vinculacion_id},
            {"$set": {
                "estado": "rechazada",
                "aprobado_por_id": rechazador_id,
                "aprobado_por_tipo": rechazador_tipo,
                "motivo_rechazo": motivo,
                "fecha_aprobacion": now,
                "fecha_actualizacion": now
            }}
        )
        
        # Notificar al solicitante
        await self._crear_notificacion(
            destinatario_id=vinculacion["acudiente_cliente_id"],
            tipo="vinculacion_rechazada",
            titulo="Vinculación rechazada",
            mensaje=f"Tu solicitud de vinculación fue rechazada. {motivo or ''}",
            datos={"vinculacion_id": vinculacion_id}
        )
        
        return {"success": True, "mensaje": "Vinculación rechazada"}
    
    async def invitar_acudiente(
        self,
        estudiante_sync_id: str,
        principal_cliente_id: str,
        email_invitado: str,
        nombre_invitado: str = None,
        rol_asignado: str = "autorizado",
        mensaje: str = None
    ) -> Dict:
        """
        El acudiente principal invita a otro acudiente.
        """
        # Verificar que quien invita es el principal
        es_principal = await db.vinculaciones.find_one({
            "estudiante_sync_id": estudiante_sync_id,
            "acudiente_cliente_id": principal_cliente_id,
            "rol": "principal",
            "estado": "aprobada",
            "activo": True
        })
        
        if not es_principal:
            raise ValueError("Solo el acudiente principal puede invitar otros acudientes")
        
        now = datetime.now(timezone.utc).isoformat()
        
        invitacion = {
            "invitacion_id": f"inv_{uuid.uuid4().hex[:12]}",
            "estudiante_sync_id": estudiante_sync_id,
            "invitado_por_id": principal_cliente_id,
            "email_invitado": email_invitado,
            "nombre_invitado": nombre_invitado,
            "rol_asignado": rol_asignado,
            "mensaje": mensaje,
            "estado": "pendiente",
            "fecha_creacion": now,
            "fecha_expiracion": None  # Podría agregarse expiración
        }
        
        await db.invitaciones_acudiente.insert_one(invitacion)
        
        # TODO: Enviar email de invitación
        
        invitacion.pop("_id", None)
        return {
            "success": True,
            "invitacion": invitacion,
            "mensaje": f"Invitación enviada a {email_invitado}"
        }
    
    async def aceptar_invitacion(
        self,
        invitacion_id: str,
        acudiente_cliente_id: str
    ) -> Dict:
        """Aceptar una invitación de vinculación"""
        invitacion = await db.invitaciones_acudiente.find_one(
            {"invitacion_id": invitacion_id, "estado": "pendiente"},
            {"_id": 0}
        )
        
        if not invitacion:
            raise ValueError("Invitación no encontrada o ya fue procesada")
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Crear la vinculación directamente como aprobada
        vinculacion = {
            "vinculacion_id": f"vinc_{uuid.uuid4().hex[:12]}",
            "estudiante_sync_id": invitacion["estudiante_sync_id"],
            "acudiente_cliente_id": acudiente_cliente_id,
            "rol": invitacion["rol_asignado"],
            "estado": "aprobada",
            "activo": True,
            "solicitado_por_id": acudiente_cliente_id,
            "solicitado_por_tipo": "acudiente",
            "invitado_por_id": invitacion["invitado_por_id"],
            "email_invitacion": invitacion["email_invitado"],
            "aprobado_por_id": invitacion["invitado_por_id"],
            "aprobado_por_tipo": "principal",
            "acepto_responsabilidad": True,
            "fecha_acepto_responsabilidad": now,
            "fecha_solicitud": now,
            "fecha_aprobacion": now,
            "fecha_actualizacion": now
        }
        
        await db.vinculaciones.insert_one(vinculacion)
        
        # Marcar invitación como aceptada
        await db.invitaciones_acudiente.update_one(
            {"invitacion_id": invitacion_id},
            {"$set": {"estado": "aceptada", "fecha_aceptacion": now}}
        )
        
        vinculacion.pop("_id", None)
        return {"success": True, "vinculacion": vinculacion}
    
    async def desvincular(
        self,
        vinculacion_id: str,
        ejecutor_id: str,
        ejecutor_tipo: str,  # "admin", "principal", "self"
        motivo: str = None
    ) -> Dict:
        """Desvincular un acudiente de un estudiante"""
        vinculacion = await db.vinculaciones.find_one(
            {"vinculacion_id": vinculacion_id},
            {"_id": 0}
        )
        
        if not vinculacion:
            raise ValueError("Vinculación no encontrada")
        
        # Validar permisos
        if ejecutor_tipo == "principal":
            es_principal = await db.vinculaciones.find_one({
                "estudiante_sync_id": vinculacion["estudiante_sync_id"],
                "acudiente_cliente_id": ejecutor_id,
                "rol": "principal",
                "estado": "aprobada",
                "activo": True
            })
            if not es_principal:
                raise ValueError("Solo el principal o admin puede desvincular")
        elif ejecutor_tipo == "self":
            if vinculacion["acudiente_cliente_id"] != ejecutor_id:
                raise ValueError("Solo puedes desvincularte a ti mismo")
        
        now = datetime.now(timezone.utc).isoformat()
        
        await db.vinculaciones.update_one(
            {"vinculacion_id": vinculacion_id},
            {"$set": {
                "activo": False,
                "estado": "cancelada",
                "motivo_rechazo": motivo,
                "fecha_actualizacion": now
            }}
        )
        
        return {"success": True, "mensaje": "Vinculación cancelada"}
    
    async def cambiar_rol(
        self,
        vinculacion_id: str,
        nuevo_rol: str,
        admin_id: str
    ) -> Dict:
        """Cambiar el rol de un acudiente (solo admin)"""
        vinculacion = await db.vinculaciones.find_one(
            {"vinculacion_id": vinculacion_id, "estado": "aprobada", "activo": True},
            {"_id": 0}
        )
        
        if not vinculacion:
            raise ValueError("Vinculación no encontrada o no está activa")
        
        # Si se está promoviendo a principal, verificar que no haya otro principal
        if nuevo_rol == "principal":
            principal_actual = await db.vinculaciones.find_one({
                "estudiante_sync_id": vinculacion["estudiante_sync_id"],
                "rol": "principal",
                "estado": "aprobada",
                "activo": True,
                "vinculacion_id": {"$ne": vinculacion_id}
            })
            
            if principal_actual:
                # Degradar al principal actual a autorizado
                await db.vinculaciones.update_one(
                    {"vinculacion_id": principal_actual["vinculacion_id"]},
                    {"$set": {"rol": "autorizado", "fecha_actualizacion": datetime.now(timezone.utc).isoformat()}}
                )
        
        await db.vinculaciones.update_one(
            {"vinculacion_id": vinculacion_id},
            {"$set": {"rol": nuevo_rol, "fecha_actualizacion": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"success": True, "mensaje": f"Rol cambiado a {nuevo_rol}"}
    
    async def obtener_mis_estudiantes(
        self,
        acudiente_cliente_id: str
    ) -> List[Dict]:
        """Obtener todos los estudiantes vinculados a un acudiente"""
        vinculaciones = await db.vinculaciones.find({
            "acudiente_cliente_id": acudiente_cliente_id,
            "estado": "aprobada",
            "activo": True
        }, {"_id": 0}).to_list(100)
        
        resultado = []
        for vinc in vinculaciones:
            estudiante = await db.estudiantes_sincronizados.find_one(
                {"sync_id": vinc["estudiante_sync_id"]},
                {"_id": 0}
            )
            
            if estudiante:
                # Obtener historial de compras
                compras = await db.compras_estudiante.find({
                    "estudiante_sync_id": estudiante["sync_id"]
                }, {"_id": 0}).to_list(100)
                
                resultado.append({
                    "vinculacion": vinc,
                    "estudiante": estudiante,
                    "compras": compras,
                    "total_compras": len(compras)
                })
        
        return resultado
    
    async def obtener_acudientes_de_estudiante(
        self,
        estudiante_sync_id: str
    ) -> List[Dict]:
        """Obtener todos los acudientes vinculados a un estudiante"""
        vinculaciones = await db.vinculaciones.find({
            "estudiante_sync_id": estudiante_sync_id,
            "estado": "aprobada",
            "activo": True
        }, {"_id": 0}).to_list(100)
        
        resultado = []
        for vinc in vinculaciones:
            cliente = await db.clientes.find_one(
                {"cliente_id": vinc["acudiente_cliente_id"]},
                {"_id": 0, "contrasena_hash": 0}
            )
            
            if cliente:
                resultado.append({
                    "vinculacion": vinc,
                    "acudiente": {
                        "cliente_id": cliente["cliente_id"],
                        "nombre": cliente.get("nombre", ""),
                        "email": cliente.get("email", ""),
                        "telefono": cliente.get("telefono", "")
                    }
                })
        
        return resultado
    
    async def obtener_solicitudes_pendientes(
        self,
        acudiente_cliente_id: str = None,
        tipo: str = None  # "admin" o "principal"
    ) -> List[Dict]:
        """Obtener solicitudes pendientes de aprobación"""
        query = {"activo": True}
        
        if tipo == "admin":
            query["estado"] = "pendiente_admin"
        elif tipo == "principal" and acudiente_cliente_id:
            # Obtener estudiantes donde es principal
            mis_principales = await db.vinculaciones.find({
                "acudiente_cliente_id": acudiente_cliente_id,
                "rol": "principal",
                "estado": "aprobada",
                "activo": True
            }).to_list(100)
            
            sync_ids = [v["estudiante_sync_id"] for v in mis_principales]
            
            query["estado"] = "pendiente_principal"
            query["estudiante_sync_id"] = {"$in": sync_ids}
        else:
            query["estado"] = {"$in": ["pendiente_admin", "pendiente_principal"]}
        
        vinculaciones = await db.vinculaciones.find(query, {"_id": 0}).to_list(200)
        
        # Enriquecer con datos del estudiante y solicitante
        resultado = []
        for vinc in vinculaciones:
            estudiante = await db.estudiantes_sincronizados.find_one(
                {"sync_id": vinc["estudiante_sync_id"]},
                {"_id": 0}
            )
            solicitante = await db.clientes.find_one(
                {"cliente_id": vinc["acudiente_cliente_id"]},
                {"_id": 0, "contrasena_hash": 0}
            )
            
            resultado.append({
                "vinculacion": vinc,
                "estudiante": estudiante,
                "solicitante": {
                    "cliente_id": solicitante["cliente_id"] if solicitante else None,
                    "nombre": solicitante.get("nombre", "") if solicitante else "",
                    "email": solicitante.get("email", "") if solicitante else ""
                } if solicitante else None
            })
        
        return resultado
    
    async def _crear_notificacion(
        self,
        destinatario_id: str,
        tipo: str,
        titulo: str,
        mensaje: str,
        datos: Dict = None
    ):
        """Crear notificación para un usuario"""
        notif = {
            "notificacion_id": f"notif_{uuid.uuid4().hex[:12]}",
            "destinatario_id": destinatario_id,
            "tipo": tipo,
            "titulo": titulo,
            "mensaje": mensaje,
            "datos": datos or {},
            "leida": False,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        await db.notificaciones.insert_one(notif)
    
    async def _crear_notificacion_admin(
        self,
        tipo: str,
        titulo: str,
        mensaje: str,
        datos: Dict = None
    ):
        """Crear notificación para admins"""
        notif = {
            "notificacion_id": f"notif_{uuid.uuid4().hex[:12]}",
            "destinatario_id": "admin",
            "tipo": tipo,
            "titulo": titulo,
            "mensaje": mensaje,
            "datos": datos or {},
            "leida": False,
            "fecha_creacion": datetime.now(timezone.utc).isoformat()
        }
        await db.notificaciones_admin.insert_one(notif)


# Singleton
vinculacion_service = VinculacionService()
