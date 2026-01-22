"""
Store Module - Vinculación Routes
Endpoints para gestión de vinculación estudiante-acudiente
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from core.auth import get_current_user, get_admin_user
from core.database import db
from ..services.vinculacion_service import vinculacion_service

router = APIRouter(prefix="/vinculacion", tags=["Store - Vinculación"])


# ============== REQUEST MODELS ==============

class BuscarEstudianteRequest(BaseModel):
    """Request para buscar estudiante"""
    numero_estudiante: str


class SolicitudVinculacionRequest(BaseModel):
    """Request para solicitar vinculación"""
    numero_estudiante: str
    relacion: str = "acudiente"  # padre, madre, tutor, acudiente
    acepto_responsabilidad: bool = True
    mensaje: Optional[str] = None


class InvitarAcudienteRequest(BaseModel):
    """Request para invitar acudiente"""
    estudiante_sync_id: str
    email_invitado: EmailStr
    nombre_invitado: Optional[str] = None
    rol_asignado: str = "autorizado"  # autorizado, solo_lectura
    mensaje: Optional[str] = None


class AprobarRechazarRequest(BaseModel):
    """Request para aprobar/rechazar vinculación"""
    motivo: Optional[str] = None


class CambiarRolRequest(BaseModel):
    """Request para cambiar rol"""
    nuevo_rol: str  # principal, autorizado, solo_lectura


# ============== ENDPOINTS PÚBLICOS (Usuario autenticado) ==============

@router.post("/buscar-estudiante")
async def buscar_estudiante(
    request: BuscarEstudianteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Buscar estudiante por número para iniciar vinculación.
    Retorna información básica del estudiante y su estado de vinculación.
    """
    result = await vinculacion_service.buscar_estudiante_para_vincular(
        request.numero_estudiante
    )
    return result


@router.post("/solicitar")
async def solicitar_vinculacion(
    request: SolicitudVinculacionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Solicitar vinculación con un estudiante.
    - Si es la primera vinculación: va a Admin para aprobación
    - Si ya tiene principal: va al Principal (Admin recibe notificación)
    """
    try:
        result = await vinculacion_service.solicitar_vinculacion(
            request.numero_estudiante,
            current_user["user_id"],
            request.relacion,
            request.acepto_responsabilidad,
            request.mensaje
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/mis-estudiantes")
async def get_mis_estudiantes(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener todos los estudiantes vinculados al usuario actual.
    Incluye información del estudiante, rol, y compras realizadas.
    """
    result = await vinculacion_service.obtener_mis_estudiantes(
        current_user["user_id"]
    )
    return {"estudiantes": result}


@router.get("/mis-solicitudes-pendientes")
async def get_mis_solicitudes_pendientes(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener solicitudes de vinculación pendientes que necesitan mi aprobación
    (como acudiente principal).
    """
    result = await vinculacion_service.obtener_solicitudes_pendientes(
        acudiente_cliente_id=current_user["user_id"],
        tipo="principal"
    )
    return {"solicitudes": result}


@router.post("/invitar")
async def invitar_acudiente(
    request: InvitarAcudienteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Invitar a otro acudiente (solo el principal puede hacer esto).
    """
    try:
        result = await vinculacion_service.invitar_acudiente(
            request.estudiante_sync_id,
            current_user["cliente_id"],
            request.email_invitado,
            request.nombre_invitado,
            request.rol_asignado,
            request.mensaje
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/invitacion/{invitacion_id}/aceptar")
async def aceptar_invitacion(
    invitacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Aceptar una invitación de vinculación.
    """
    try:
        result = await vinculacion_service.aceptar_invitacion(
            invitacion_id,
            current_user["cliente_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{vinculacion_id}/aprobar")
async def aprobar_vinculacion(
    vinculacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Aprobar una solicitud de vinculación (como principal).
    """
    try:
        result = await vinculacion_service.aprobar_vinculacion(
            vinculacion_id,
            current_user["cliente_id"],
            "principal"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{vinculacion_id}/rechazar")
async def rechazar_vinculacion(
    vinculacion_id: str,
    request: AprobarRechazarRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Rechazar una solicitud de vinculación (como principal).
    """
    try:
        result = await vinculacion_service.rechazar_vinculacion(
            vinculacion_id,
            current_user["cliente_id"],
            "principal",
            request.motivo
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{vinculacion_id}")
async def desvincularme(
    vinculacion_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Desvincularme de un estudiante (auto-desvinculación).
    """
    try:
        result = await vinculacion_service.desvincular(
            vinculacion_id,
            current_user["cliente_id"],
            "self"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ENDPOINTS ADMIN ==============

@router.get("/admin/solicitudes-pendientes")
async def admin_get_solicitudes_pendientes(
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener todas las solicitudes de vinculación pendientes de admin.
    """
    result = await vinculacion_service.obtener_solicitudes_pendientes(tipo="admin")
    return {"solicitudes": result}


@router.get("/admin/todas")
async def admin_get_todas_vinculaciones(
    estado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener todas las vinculaciones con filtros opcionales.
    """
    query = {}
    if estado:
        query["estado"] = estado
    
    vinculaciones = await db.vinculaciones.find(
        query,
        {"_id": 0}
    ).sort("fecha_solicitud", -1).to_list(500)
    
    # Enriquecer con datos
    result = []
    for vinc in vinculaciones:
        estudiante = await db.estudiantes_sincronizados.find_one(
            {"sync_id": vinc["estudiante_sync_id"]},
            {"_id": 0}
        )
        acudiente = await db.clientes.find_one(
            {"cliente_id": vinc["acudiente_cliente_id"]},
            {"_id": 0, "contrasena_hash": 0}
        )
        
        result.append({
            "vinculacion": vinc,
            "estudiante": estudiante,
            "acudiente": {
                "cliente_id": acudiente["cliente_id"] if acudiente else None,
                "nombre": acudiente.get("nombre", "") if acudiente else "",
                "email": acudiente.get("email", "") if acudiente else ""
            } if acudiente else None
        })
    
    return {"vinculaciones": result}


@router.get("/admin/estudiante/{sync_id}/acudientes")
async def admin_get_acudientes_estudiante(
    sync_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener todos los acudientes de un estudiante.
    """
    result = await vinculacion_service.obtener_acudientes_de_estudiante(sync_id)
    return {"acudientes": result}


@router.post("/admin/{vinculacion_id}/aprobar")
async def admin_aprobar_vinculacion(
    vinculacion_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Aprobar una solicitud de vinculación (como admin).
    """
    try:
        result = await vinculacion_service.aprobar_vinculacion(
            vinculacion_id,
            admin["cliente_id"],
            "admin"
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{vinculacion_id}/rechazar")
async def admin_rechazar_vinculacion(
    vinculacion_id: str,
    request: AprobarRechazarRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Rechazar una solicitud de vinculación (como admin).
    """
    try:
        result = await vinculacion_service.rechazar_vinculacion(
            vinculacion_id,
            admin["cliente_id"],
            "admin",
            request.motivo
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{vinculacion_id}/cambiar-rol")
async def admin_cambiar_rol(
    vinculacion_id: str,
    request: CambiarRolRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Cambiar el rol de un acudiente (solo admin).
    """
    try:
        result = await vinculacion_service.cambiar_rol(
            vinculacion_id,
            request.nuevo_rol,
            admin["cliente_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/admin/{vinculacion_id}")
async def admin_desvincular(
    vinculacion_id: str,
    motivo: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Desvincular un acudiente de un estudiante (como admin).
    """
    try:
        result = await vinculacion_service.desvincular(
            vinculacion_id,
            admin["cliente_id"],
            "admin",
            motivo
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/vincular-directo")
async def admin_vincular_directo(
    estudiante_sync_id: str,
    cliente_id: str,
    rol: str = "autorizado",
    admin: dict = Depends(get_admin_user)
):
    """
    Crear vinculación directa (solo admin) sin necesidad de aprobación.
    """
    from datetime import datetime, timezone
    import uuid
    
    # Verificar que el estudiante existe
    estudiante = await db.estudiantes_sincronizados.find_one(
        {"sync_id": estudiante_sync_id}
    )
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Verificar que el cliente existe (usando auth_users que es la colección correcta)
    cliente = await db.auth_users.find_one({"cliente_id": cliente_id})
    if not cliente:
        # Fallback a colección legacy
        cliente = await db.clientes.find_one({"cliente_id": cliente_id})
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    # Verificar que no exista vinculación activa
    existente = await db.vinculaciones.find_one({
        "estudiante_sync_id": estudiante_sync_id,
        "acudiente_cliente_id": cliente_id,
        "estado": "aprobada",
        "activo": True
    })
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe una vinculación activa")
    
    now = datetime.now(timezone.utc).isoformat()
    
    vinculacion = {
        "vinculacion_id": f"vinc_{uuid.uuid4().hex[:12]}",
        "estudiante_sync_id": estudiante_sync_id,
        "acudiente_cliente_id": cliente_id,
        "rol": rol,
        "estado": "aprobada",
        "activo": True,
        "solicitado_por_id": admin["cliente_id"],
        "solicitado_por_tipo": "admin",
        "aprobado_por_id": admin["cliente_id"],
        "aprobado_por_tipo": "admin",
        "acepto_responsabilidad": True,
        "fecha_acepto_responsabilidad": now,
        "fecha_solicitud": now,
        "fecha_aprobacion": now,
        "fecha_actualizacion": now
    }
    
    await db.vinculaciones.insert_one(vinculacion)
    vinculacion.pop("_id", None)
    
    return {"success": True, "vinculacion": vinculacion}
