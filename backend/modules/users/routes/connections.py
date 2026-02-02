"""
Routes for User Connections System
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from core.auth import get_current_user, get_admin_user
from ..services.connections_service import conexiones_service

router = APIRouter(prefix="/conexiones", tags=["Connections"])


# ============== REQUEST MODELS ==============

class ConexionCreateRequest(BaseModel):
    user_id_destino: str
    tipo: str  # familiar, social, especial
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None


class SolicitudRequest(BaseModel):
    para_usuario_id: str
    tipo: str
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None


class SolicitudRespuestaRequest(BaseModel):
    aceptar: bool


class InvitacionRequest(BaseModel):
    email: EmailStr
    nombre: Optional[str] = None
    mensaje: Optional[str] = None
    tipo_relacion: Optional[str] = None
    subtipo: Optional[str] = None
    monto_transferir: Optional[float] = None


class TransferenciaRequest(BaseModel):
    para_usuario_id: str
    monto: float
    mensaje: Optional[str] = None


class AcudidoCreateRequest(BaseModel):
    nombre: str
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    notas: Optional[str] = None


class MarketingConfigRequest(BaseModel):
    mostrar_servicios: bool
    servicios_sugeridos: Optional[List[str]] = None
    servicios_excluidos: Optional[List[str]] = None


class OtorgarCapacidadRequest(BaseModel):
    user_id: str
    capacidad_id: str
    motivo: Optional[str] = None


class PermisosRelacionRequest(BaseModel):
    tipo: str
    subtipo: str
    transferir_wallet: bool = False
    ver_wallet: bool = False
    recargar_wallet: bool = False
    recibir_alertas: bool = False
    limite_transferencia_diario: Optional[float] = None


class CapacidadCreateRequest(BaseModel):
    capacidad_id: str
    nombre_es: str
    nombre_en: Optional[str] = None
    descripcion_es: Optional[str] = None
    descripcion_en: Optional[str] = None
    icono: Optional[str] = None
    color: Optional[str] = None
    tipo: str = "solicitada"  # predeterminada, por_suscripcion, beneficio_extendido, solicitada
    membresia_requerida: Optional[str] = None
    requiere_aprobacion: bool = False
    activa: bool = True


# ============== ENDPOINTS DE CONEXIONES ==============

@router.get("/mis-conexiones")
async def get_mis_conexiones(user: dict = Depends(get_current_user)):
    """Obtener mis conexiones"""
    conexiones = await conexiones_service.get_conexiones(user["user_id"])
    return {"conexiones": conexiones}


@router.post("/solicitar")
async def crear_solicitud_conexion(
    request: SolicitudRequest,
    user: dict = Depends(get_current_user)
):
    """Crear solicitud de conexión a otro usuario"""
    result = await conexiones_service.crear_solicitud(
        de_usuario_id=user["user_id"],
        para_usuario_id=request.para_usuario_id,
        tipo=request.tipo,
        subtipo=request.subtipo,
        etiqueta=request.etiqueta,
        mensaje=request.mensaje
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.get("/solicitudes/recibidas")
async def get_solicitudes_recibidas(user: dict = Depends(get_current_user)):
    """Obtener solicitudes de conexión recibidas"""
    solicitudes = await conexiones_service.get_solicitudes_pendientes(user["user_id"])
    return {"solicitudes": solicitudes}


@router.get("/solicitudes/enviadas")
async def get_solicitudes_enviadas(user: dict = Depends(get_current_user)):
    """Obtener solicitudes de conexión enviadas"""
    solicitudes = await conexiones_service.get_solicitudes_enviadas(user["user_id"])
    return {"solicitudes": solicitudes}


@router.post("/solicitudes/{solicitud_id}/responder")
async def responder_solicitud(
    solicitud_id: str,
    request: SolicitudRespuestaRequest,
    user: dict = Depends(get_current_user)
):
    """Responder a una solicitud de conexión"""
    result = await conexiones_service.responder_solicitud(
        solicitud_id=solicitud_id,
        aceptar=request.aceptar,
        respondido_por=user["user_id"]
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.delete("/{conexion_id}")
async def eliminar_conexion(
    conexion_id: str,
    user: dict = Depends(get_current_user)
):
    """Eliminar una conexión"""
    result = await conexiones_service.eliminar_conexion(user["user_id"], conexion_id)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== ENDPOINTS DE INVITACIONES ==============

@router.post("/invitar")
async def crear_invitacion(
    request: InvitacionRequest,
    user: dict = Depends(get_current_user)
):
    """Invitar a usuario no registrado"""
    result = await conexiones_service.crear_invitacion(
        invitado_por_id=user["user_id"],
        email=request.email,
        nombre=request.nombre,
        mensaje=request.mensaje,
        tipo_relacion=request.tipo_relacion,
        subtipo=request.subtipo,
        monto_transferir=request.monto_transferir
    )
    
    if result.get("error"):
        # Si el usuario ya existe, devolver su ID para conectar directamente
        if "user_id" in result:
            return {"existe": True, "user_id": result["user_id"]}
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== ENDPOINTS DE ACUDIDOS ==============

@router.get("/mis-acudidos")
async def get_mis_acudidos(user: dict = Depends(get_current_user)):
    """Obtener mis usuarios acudidos"""
    conexiones = await conexiones_service.get_conexiones(user["user_id"])
    acudidos = [c for c in conexiones if c.get("subtipo") == "acudido"]
    return {"acudidos": acudidos}


@router.post("/crear-acudido")
async def crear_acudido(
    request: AcudidoCreateRequest,
    user: dict = Depends(get_current_user)
):
    """Crear usuario acudido (cuenta gestionada)"""
    result = await conexiones_service.crear_acudido(
        acudiente_id=user["user_id"],
        nombre=request.nombre,
        apellido=request.apellido,
        email=request.email,
        fecha_nacimiento=request.fecha_nacimiento,
        genero=request.genero,
        notas=request.notas
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== ENDPOINTS DE TRANSFERENCIAS ==============

@router.post("/transferir")
async def transferir_wallet(
    request: TransferenciaRequest,
    user: dict = Depends(get_current_user)
):
    """Transferir saldo a otro usuario"""
    result = await conexiones_service.transferir_wallet(
        de_usuario_id=user["user_id"],
        para_usuario_id=request.para_usuario_id,
        monto=request.monto,
        mensaje=request.mensaje
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== ENDPOINTS DE CAPACIDADES ==============

@router.get("/capacidades")
async def get_capacidades_disponibles():
    """Obtener todas las capacidades configuradas"""
    capacidades = await conexiones_service.get_capacidades_config()
    return {"capacidades": capacidades}


@router.get("/mis-capacidades")
async def get_mis_capacidades(user: dict = Depends(get_current_user)):
    """Obtener mis capacidades activas"""
    capacidades = await conexiones_service.get_capacidades_usuario(user["user_id"])
    return {"capacidades": capacidades}


# ============== ENDPOINTS DE MARKETING ==============

@router.get("/servicios-sugeridos")
async def get_servicios_sugeridos(user: dict = Depends(get_current_user)):
    """Obtener servicios/membresías sugeridos para el usuario"""
    servicios = await conexiones_service.get_servicios_sugeridos(user["user_id"])
    return {"servicios": servicios}


# ============== ENDPOINTS DE BÚSQUEDA ==============

@router.get("/buscar")
async def buscar_usuarios(
    q: str,
    user: dict = Depends(get_current_user)
):
    """Buscar usuarios por nombre o email"""
    if len(q) < 2:
        return {"usuarios": []}
    
    usuarios = await conexiones_service.buscar_usuarios(
        query=q,
        excluir_user_id=user["user_id"]
    )
    return {"usuarios": usuarios}


# ============== ENDPOINTS ADMIN ==============

@router.post("/admin/solicitudes/{solicitud_id}/responder")
async def admin_responder_solicitud(
    solicitud_id: str,
    request: SolicitudRespuestaRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Responder solicitud de conexión en nombre del usuario"""
    result = await conexiones_service.responder_solicitud(
        solicitud_id=solicitud_id,
        aceptar=request.aceptar,
        respondido_por=admin["user_id"],
        es_admin=True
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/crear-acudido")
async def admin_crear_acudido(
    acudiente_id: str,
    request: AcudidoCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Crear usuario acudido para un acudiente"""
    result = await conexiones_service.crear_acudido(
        acudiente_id=acudiente_id,
        nombre=request.nombre,
        apellido=request.apellido,
        email=request.email,
        fecha_nacimiento=request.fecha_nacimiento,
        genero=request.genero,
        notas=request.notas,
        creado_por_admin=True,
        admin_id=admin["user_id"]
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/otorgar-capacidad")
async def admin_otorgar_capacidad(
    request: OtorgarCapacidadRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Otorgar capacidad a un usuario"""
    result = await conexiones_service.otorgar_capacidad(
        user_id=request.user_id,
        capacidad_id=request.capacidad_id,
        otorgado_por=admin["user_id"],
        motivo=request.motivo
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/marketing/{user_id}")
async def admin_configurar_marketing(
    user_id: str,
    request: MarketingConfigRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Configurar marketing para un usuario"""
    result = await conexiones_service.configurar_marketing_usuario(
        user_id=user_id,
        mostrar_servicios=request.mostrar_servicios,
        servicios_sugeridos=request.servicios_sugeridos,
        servicios_excluidos=request.servicios_excluidos
    )
    
    return result


@router.get("/admin/solicitudes-pendientes")
async def admin_get_solicitudes_pendientes(
    admin: dict = Depends(get_admin_user)
):
    """Admin: Obtener todas las solicitudes de conexión pendientes"""
    from core.database import db
    cursor = db.solicitudes_conexion.find(
        {"estado": "pendiente"},
        {"_id": 0}
    ).sort("creado_en", -1)
    solicitudes = await cursor.to_list(length=100)
    return {"solicitudes": solicitudes}


# ============== ENDPOINTS DE ALERTAS ==============

class AlertaSaldoRequest(BaseModel):
    monto_requerido: float
    descripcion: str


@router.post("/alerta-saldo-insuficiente")
async def crear_alerta_saldo(
    request: AlertaSaldoRequest,
    user: dict = Depends(get_current_user)
):
    """Crear alerta de saldo insuficiente (notifica al usuario y sus acudientes)"""
    wallet = user.get("wallet", {})
    saldo_actual = wallet.get("USD", 0)
    
    result = await conexiones_service.crear_alerta_saldo_insuficiente(
        usuario_id=user["user_id"],
        monto_requerido=request.monto_requerido,
        saldo_actual=saldo_actual,
        descripcion=request.descripcion
    )
    
    return result


@router.get("/mis-alertas")
async def get_mis_alertas(user: dict = Depends(get_current_user)):
    """Obtener mis alertas (como usuario o como acudiente)"""
    from core.database import db
    
    # Alertas donde soy el usuario afectado
    mis_alertas = await db.alertas_wallet.find(
        {"usuario_id": user["user_id"], "estado": {"$ne": "resuelta"}},
        {"_id": 0}
    ).sort("creado_en", -1).to_list(length=50)
    
    # Alertas donde soy acudiente
    alertas_acudidos = await db.alertas_wallet.find(
        {"acudientes_ids": user["user_id"], "estado": {"$ne": "resuelta"}},
        {"_id": 0}
    ).sort("creado_en", -1).to_list(length=50)
    
    # Combinar y marcar tipo
    for a in mis_alertas:
        a["es_mia"] = True
    for a in alertas_acudidos:
        a["es_de_acudido"] = True
    
    todas = mis_alertas + alertas_acudidos
    # Ordenar por fecha
    todas.sort(key=lambda x: x.get("creado_en", ""), reverse=True)
    
    return {"alertas": todas}


@router.post("/alertas/{alerta_id}/resolver")
async def resolver_alerta(
    alerta_id: str,
    user: dict = Depends(get_current_user)
):
    """Marcar alerta como resuelta"""
    from core.database import db
    from datetime import datetime, timezone
    
    result = await db.alertas_wallet.update_one(
        {
            "alerta_id": alerta_id,
            "$or": [
                {"usuario_id": user["user_id"]},
                {"acudientes_ids": user["user_id"]}
            ]
        },
        {"$set": {
            "estado": "resuelta",
            "resuelto_por": user["user_id"],
            "resuelto_en": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    
    return {"success": True}



# ============== ADMIN: PERMISOS Y CAPACIDADES ==============

@router.get("/admin/permisos-relacion")
async def admin_get_permisos_relacion(admin: dict = Depends(get_admin_user)):
    """Admin: Obtener todos los permisos configurados por tipo de relación"""
    from core.database import db
    cursor = db.config_permisos_relacion.find({}, {"_id": 0})
    permisos = await cursor.to_list(length=100)
    return {"permisos": permisos}


@router.put("/admin/permisos-relacion")
async def admin_update_permisos_relacion(
    request: PermisosRelacionRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Actualizar permisos para un tipo de relación"""
    from core.database import db
    from datetime import datetime, timezone
    
    permisos = {
        "transferir_wallet": request.transferir_wallet,
        "ver_wallet": request.ver_wallet,
        "recargar_wallet": request.recargar_wallet,
        "recibir_alertas": request.recibir_alertas,
        "limite_transferencia_diario": request.limite_transferencia_diario
    }
    
    result = await db.config_permisos_relacion.update_one(
        {"tipo": request.tipo, "subtipo": request.subtipo},
        {
            "$set": {
                "permisos": permisos,
                "actualizado_por": admin["user_id"],
                "actualizado_en": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"success": True, "modified": result.modified_count > 0}


@router.post("/admin/capacidades")
async def admin_crear_capacidad(
    request: CapacidadCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Crear nueva capacidad"""
    from core.database import db
    from datetime import datetime, timezone
    
    # Verificar que no existe
    existing = await db.capacidades_config.find_one({"capacidad_id": request.capacidad_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una capacidad con ese ID")
    
    capacidad = {
        "capacidad_id": request.capacidad_id,
        "nombre": {"es": request.nombre_es, "en": request.nombre_en or request.nombre_es},
        "descripcion": {"es": request.descripcion_es or "", "en": request.descripcion_en or request.descripcion_es or ""},
        "icono": request.icono or "⚡",
        "color": request.color or "#6366f1",
        "tipo": request.tipo,
        "membresia_requerida": request.membresia_requerida,
        "requiere_aprobacion": request.requiere_aprobacion,
        "activa": request.activa,
        "orden": 99,
        "creado_por": admin["user_id"],
        "creado_en": datetime.now(timezone.utc).isoformat()
    }
    
    await db.capacidades_config.insert_one(capacidad)
    capacidad.pop("_id", None)
    
    return {"success": True, "capacidad": capacidad}


@router.put("/admin/capacidades/{capacidad_id}")
async def admin_actualizar_capacidad(
    capacidad_id: str,
    request: CapacidadCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Actualizar capacidad existente"""
    from core.database import db
    from datetime import datetime, timezone
    
    existing = await db.capacidades_config.find_one({"capacidad_id": capacidad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Capacidad no encontrada")
    
    updates = {
        "nombre": {"es": request.nombre_es, "en": request.nombre_en or request.nombre_es},
        "descripcion": {"es": request.descripcion_es or "", "en": request.descripcion_en or request.descripcion_es or ""},
        "icono": request.icono or existing.get("icono", "⚡"),
        "color": request.color or existing.get("color", "#6366f1"),
        "tipo": request.tipo,
        "membresia_requerida": request.membresia_requerida,
        "requiere_aprobacion": request.requiere_aprobacion,
        "activa": request.activa,
        "actualizado_por": admin["user_id"],
        "actualizado_en": datetime.now(timezone.utc).isoformat()
    }
    
    await db.capacidades_config.update_one(
        {"capacidad_id": capacidad_id},
        {"$set": updates}
    )
    
    return {"success": True}


@router.delete("/admin/capacidades/{capacidad_id}")
async def admin_eliminar_capacidad(
    capacidad_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Desactivar capacidad (no elimina, solo desactiva)"""
    from core.database import db
    from datetime import datetime, timezone
    
    result = await db.capacidades_config.update_one(
        {"capacidad_id": capacidad_id},
        {"$set": {
            "activa": False,
            "desactivado_por": admin["user_id"],
            "desactivado_en": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Capacidad no encontrada")
    
    return {"success": True}
