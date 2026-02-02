"""
Routes for User Connections System
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from core.auth import get_current_user, get_admin_user
from ..services.connections_service import connections_service

router = APIRouter(prefix="/connections", tags=["Connections"])


# ============== REQUEST MODELS ==============

class ConnectionCreateRequest(BaseModel):
    user_id_destino: str
    tipo: str  # familiar, social, especial
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None


class ConnectionRequestModel(BaseModel):
    para_usuario_id: str
    tipo: str
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None


class ConnectionResponseRequest(BaseModel):
    aceptar: bool


class InvitationRequest(BaseModel):
    email: EmailStr
    nombre: Optional[str] = None
    mensaje: Optional[str] = None
    tipo_relacion: Optional[str] = None
    subtipo: Optional[str] = None
    monto_transferir: Optional[float] = None


class TransferRequest(BaseModel):
    para_usuario_id: str
    monto: float
    mensaje: Optional[str] = None


class DependentCreateRequest(BaseModel):
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


class GrantCapabilityRequest(BaseModel):
    user_id: str
    capacidad_id: str
    motivo: Optional[str] = None


class RelationshipPermissionsRequest(BaseModel):
    tipo: str
    subtipo: str
    transferir_wallet: bool = False
    ver_wallet: bool = False
    recargar_wallet: bool = False
    recibir_alertas: bool = False
    limite_transferencia_diario: Optional[float] = None


class CapabilityCreateRequest(BaseModel):
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


# ============== CONNECTION ENDPOINTS ==============

@router.get("/my-connections")
async def get_my_connections(user: dict = Depends(get_current_user)):
    """Get my connections"""
    connections = await connections_service.get_connections(user["user_id"])
    return {"connections": connections}


@router.post("/request")
async def create_connection_request(
    request: ConnectionRequestModel,
    user: dict = Depends(get_current_user)
):
    """Create a connection request to another user"""
    result = await connections_service.crear_request(
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


@router.get("/requests/received")
async def get_received_requests(user: dict = Depends(get_current_user)):
    """Get received connection requests"""
    requestes = await connections_service.get_requestes_pendientes(user["user_id"])
    return {"requestes": requestes}


@router.get("/requests/sent")
async def get_sent_requests(user: dict = Depends(get_current_user)):
    """Get sent connection requests"""
    requestes = await connections_service.get_requestes_enviadas(user["user_id"])
    return {"requestes": requestes}


@router.post("/requests/{request_id}/respond")
async def respond_to_request(
    request_id: str,
    request: ConnectionResponseRequest,
    user: dict = Depends(get_current_user)
):
    """Respond to a connection request"""
    result = await connections_service.responder_request(
        request_id=request_id,
        aceptar=request.aceptar,
        respondido_por=user["user_id"]
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.delete("/{connection_id}")
async def delete_connection(
    connection_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a connection"""
    result = await connections_service.eliminar_conexion(user["user_id"], connection_id)
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== INVITATION ENDPOINTS ==============

@router.post("/invite")
async def create_invitation(
    request: InvitationRequest,
    user: dict = Depends(get_current_user)
):
    """Invite an unregistered user"""
    result = await connections_service.crear_invitacion(
        invitado_por_id=user["user_id"],
        email=request.email,
        nombre=request.nombre,
        mensaje=request.mensaje,
        tipo_relacion=request.tipo_relacion,
        subtipo=request.subtipo,
        monto_transferir=request.monto_transferir
    )
    
    if result.get("error"):
        # If user already exists, return their ID to connect directly
        if "user_id" in result:
            return {"existe": True, "user_id": result["user_id"]}
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== DEPENDENT ENDPOINTS ==============

@router.get("/my-dependents")
async def get_my_dependents(user: dict = Depends(get_current_user)):
    """Get my dependent users"""
    connections = await connections_service.get_connections(user["user_id"])
    acudidos = [c for c in connections if c.get("subtipo") == "acudido"]
    return {"acudidos": acudidos}


@router.post("/create-dependent")
async def create_dependent(
    request: DependentCreateRequest,
    user: dict = Depends(get_current_user)
):
    """Create a dependent user (managed account)"""
    result = await connections_service.crear_acudido(
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


# ============== TRANSFER ENDPOINTS ==============

@router.post("/transfer")
async def transfer_wallet(
    request: TransferRequest,
    user: dict = Depends(get_current_user)
):
    """Transfer balance to another user"""
    result = await connections_service.transferir_wallet(
        de_usuario_id=user["user_id"],
        para_usuario_id=request.para_usuario_id,
        monto=request.monto,
        mensaje=request.mensaje
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


# ============== CAPABILITY ENDPOINTS ==============

@router.get("/capabilities")
async def get_available_capabilities():
    """Get all configured capabilities"""
    capacidades = await connections_service.get_capacidades_config()
    return {"capacidades": capacidades}


@router.get("/my-capabilities")
async def get_my_capabilities(user: dict = Depends(get_current_user)):
    """Get my active capabilities"""
    capacidades = await connections_service.get_capacidades_usuario(user["user_id"])
    return {"capacidades": capacidades}


# ============== MARKETING ENDPOINTS ==============

@router.get("/suggested-services")
async def get_suggested_services(user: dict = Depends(get_current_user)):
    """Get suggested services/memberships for the user"""
    servicios = await connections_service.get_servicios_sugeridos(user["user_id"])
    return {"servicios": servicios}


# ============== SEARCH ENDPOINTS ==============

@router.get("/search")
async def search_users(
    q: str,
    user: dict = Depends(get_current_user)
):
    """Search users by name or email"""
    if len(q) < 2:
        return {"usuarios": []}
    
    usuarios = await connections_service.buscar_usuarios(
        query=q,
        excluir_user_id=user["user_id"]
    )
    return {"usuarios": usuarios}


# ============== ADMIN ENDPOINTS ==============

@router.post("/admin/requests/{request_id}/respond")
async def admin_respond_to_request(
    request_id: str,
    request: ConnectionResponseRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Respond to connection request on behalf of user"""
    result = await connections_service.responder_request(
        request_id=request_id,
        aceptar=request.aceptar,
        respondido_por=admin["user_id"],
        es_admin=True
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/create-dependent")
async def admin_create_dependent(
    acudiente_id: str,
    request: DependentCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Create dependent user for a guardian"""
    result = await connections_service.crear_acudido(
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


@router.post("/admin/grant-capability")
async def admin_grant_capability(
    request: GrantCapabilityRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Grant capability to a user"""
    result = await connections_service.otorgar_capacidad(
        user_id=request.user_id,
        capacidad_id=request.capacidad_id,
        otorgado_por=admin["user_id"],
        motivo=request.motivo
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/admin/marketing/{user_id}")
async def admin_configure_marketing(
    user_id: str,
    request: MarketingConfigRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Configure marketing for a user"""
    result = await connections_service.configurar_marketing_usuario(
        user_id=user_id,
        mostrar_servicios=request.mostrar_servicios,
        servicios_sugeridos=request.servicios_sugeridos,
        servicios_excluidos=request.servicios_excluidos
    )
    
    return result


@router.get("/admin/pending-requests")
async def admin_get_pending_requests(
    admin: dict = Depends(get_admin_user)
):
    """Admin: Get all pending connection requests"""
    from core.database import db
    cursor = db.requestes_conexion.find(
        {"estado": "pendiente"},
        {"_id": 0}
    ).sort("creado_en", -1)
    requestes = await cursor.to_list(length=100)
    return {"requestes": requestes}


# ============== ALERT ENDPOINTS ==============

class BalanceAlertRequest(BaseModel):
    monto_requerido: float
    descripcion: str


@router.post("/balance-alert")
async def create_balance_alert(
    request: BalanceAlertRequest,
    user: dict = Depends(get_current_user)
):
    """Create insufficient balance alert (notifies user and their guardians)"""
    wallet = user.get("wallet", {})
    saldo_actual = wallet.get("USD", 0)
    
    result = await connections_service.crear_alerta_saldo_insuficiente(
        usuario_id=user["user_id"],
        monto_requerido=request.monto_requerido,
        saldo_actual=saldo_actual,
        descripcion=request.descripcion
    )
    
    return result


@router.get("/my-alerts")
async def get_my_alerts(user: dict = Depends(get_current_user)):
    """Get my alerts (as user or as guardian)"""
    from core.database import db
    
    # Alerts where I am the affected user
    my_alerts = await db.alertas_wallet.find(
        {"usuario_id": user["user_id"], "estado": {"$ne": "resuelta"}},
        {"_id": 0}
    ).sort("creado_en", -1).to_list(length=50)
    
    # Alerts where I am a guardian
    dependent_alerts = await db.alertas_wallet.find(
        {"acudientes_ids": user["user_id"], "estado": {"$ne": "resuelta"}},
        {"_id": 0}
    ).sort("creado_en", -1).to_list(length=50)
    
    # Combine and mark type
    for a in my_alerts:
        a["es_mia"] = True
    for a in dependent_alerts:
        a["es_de_acudido"] = True
    
    all_alerts = my_alerts + dependent_alerts
    # Sort by date
    all_alerts.sort(key=lambda x: x.get("creado_en", ""), reverse=True)
    
    return {"alertas": all_alerts}


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    user: dict = Depends(get_current_user)
):
    """Mark alert as resolved"""
    from core.database import db
    from datetime import datetime, timezone
    
    result = await db.alertas_wallet.update_one(
        {
            "alerta_id": alert_id,
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
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {"success": True}



# ============== ADMIN: PERMISSIONS AND CAPABILITIES ==============

@router.get("/admin/relationship-permissions")
async def admin_get_relationship_permissions(admin: dict = Depends(get_admin_user)):
    """Admin: Get all configured permissions by relationship type"""
    from core.database import db
    cursor = db.config_permisos_relacion.find({}, {"_id": 0})
    permisos = await cursor.to_list(length=100)
    return {"permisos": permisos}


@router.put("/admin/relationship-permissions")
async def admin_update_relationship_permissions(
    request: RelationshipPermissionsRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Update permissions for a relationship type"""
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


@router.post("/admin/capabilities")
async def admin_create_capability(
    request: CapabilityCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Create new capability"""
    from core.database import db
    from datetime import datetime, timezone
    
    # Check if exists
    existing = await db.config_capacidades.find_one({"capacidad_id": request.capacidad_id})
    if existing:
        raise HTTPException(status_code=400, detail="Capability already exists")
    
    capacidad = {
        "capacidad_id": request.capacidad_id,
        "nombre": {"es": request.nombre_es, "en": request.nombre_en or request.nombre_es},
        "descripcion": {"es": request.descripcion_es or "", "en": request.descripcion_en or request.descripcion_es or ""},
        "icono": request.icono or "✨",
        "color": request.color or "#6366f1",
        "tipo": request.tipo,
        "membresia_requerida": request.membresia_requerida,
        "requiere_aprobacion": request.requiere_aprobacion,
        "activa": request.activa,
        "creado_por": admin["user_id"],
        "creado_en": datetime.now(timezone.utc).isoformat()
    }
    
    await db.config_capacidades.insert_one(capacidad)
    
    return {"success": True, "capacidad_id": request.capacidad_id}


@router.put("/admin/capabilities/{capability_id}")
async def admin_update_capability(
    capability_id: str,
    request: CapabilityCreateRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Update existing capability"""
    from core.database import db
    from datetime import datetime, timezone
    
    result = await db.config_capacidades.update_one(
        {"capacidad_id": capability_id},
        {"$set": {
            "nombre": {"es": request.nombre_es, "en": request.nombre_en or request.nombre_es},
            "descripcion": {"es": request.descripcion_es or "", "en": request.descripcion_en or request.descripcion_es or ""},
            "icono": request.icono,
            "color": request.color,
            "tipo": request.tipo,
            "membresia_requerida": request.membresia_requerida,
            "requiere_aprobacion": request.requiere_aprobacion,
            "activa": request.activa,
            "actualizado_por": admin["user_id"],
            "actualizado_en": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Capability not found")
    
    return {"success": True}


@router.delete("/admin/capabilities/{capability_id}")
async def admin_delete_capability(
    capability_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Admin: Delete capability"""
    from core.database import db
    
    result = await db.config_capacidades.delete_one({"capacidad_id": capability_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Capability not found")
    
    return {"success": True}
