"""
Store Module - Student Routes
Endpoints para gestión de estudiantes
Nota: Los estudiantes están embebidos en el documento del cliente,
por lo que estas rutas acceden directamente a la DB (no hay StudentRepository)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from core.database import db
from shared.utils import get_current_school_year, buscar_estudiante_en_matriculas
from ..models import StudentCreate, Student

router = APIRouter(prefix="/students", tags=["Store - Students"])


@router.get("")
async def get_my_students(current_user: dict = Depends(get_current_user)):
    """Obtener estudiantes del usuario actual"""
    user = await db.clientes.find_one(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    )
    return user.get("estudiantes", [])


@router.get("/{estudiante_id}")
async def get_student(
    estudiante_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener estudiante por ID"""
    user = await db.clientes.find_one(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    )
    estudiante = next(
        (e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id),
        None
    )
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return estudiante


@router.post("")
async def add_student(
    estudiante: StudentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Agregar nuevo estudiante al usuario actual"""
    from datetime import datetime, timezone
    import uuid
    
    estudiante_dict = {
        "estudiante_id": f"est_{uuid.uuid4().hex[:12]}",
        **estudiante.model_dump(),
        "fecha_registro": datetime.now(timezone.utc).isoformat(),
        "libros_comprados": []
    }
    
    # Auto-buscar en base de datos de matrículas
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0, "sync_id": 1, "datos": 1}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante.nombre,
        estudiante.apellido,
        estudiante.grado,
        estudiantes_sync
    )
    
    if coincidencia:
        estudiante_dict["estado_matricula"] = "encontrado"
        estudiante_dict["matricula_sync_id"] = coincidencia["sync_id"]
        estudiante_dict["similitud_matricula"] = coincidencia["similitud"]
        estudiante_dict["nombre_matricula"] = coincidencia["nombre_encontrado"]
    else:
        estudiante_dict["estado_matricula"] = "no_encontrado"
        estudiante_dict["matricula_sync_id"] = None
        estudiante_dict["similitud_matricula"] = None
        estudiante_dict["nombre_matricula"] = None
    
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$push": {"estudiantes": estudiante_dict}}
    )
    
    return estudiante_dict


@router.put("/{estudiante_id}")
async def update_student(
    estudiante_id: str,
    estudiante: StudentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar estudiante"""
    update_data = {
        "estudiantes.$.nombre": estudiante.nombre,
        "estudiantes.$.apellido": estudiante.apellido,
        "estudiantes.$.grado": estudiante.grado,
        "estudiantes.$.escuela": estudiante.escuela,
        "estudiantes.$.es_nuevo": estudiante.es_nuevo,
        "estudiantes.$.notas": estudiante.notas
    }
    
    result = await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Re-verificar matrícula después de actualizar
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0, "sync_id": 1, "datos": 1}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante.nombre,
        estudiante.apellido,
        estudiante.grado,
        estudiantes_sync
    )
    
    if coincidencia:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "encontrado",
                "estudiantes.$.matricula_sync_id": coincidencia["sync_id"],
                "estudiantes.$.similitud_matricula": coincidencia["similitud"],
                "estudiantes.$.nombre_matricula": coincidencia["nombre_encontrado"]
            }}
        )
    else:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "no_encontrado",
                "estudiantes.$.matricula_sync_id": None,
                "estudiantes.$.similitud_matricula": None,
                "estudiantes.$.nombre_matricula": None
            }}
        )
    
    return {"success": True}


@router.delete("/{estudiante_id}")
async def delete_student(
    estudiante_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Eliminar estudiante"""
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$pull": {"estudiantes": {"estudiante_id": estudiante_id}}}
    )
    return {"success": True}


@router.post("/{estudiante_id}/verify-enrollment")
async def verify_enrollment(
    estudiante_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Re-verificar matrícula del estudiante"""
    user = await db.clientes.find_one(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    )
    estudiante = next(
        (e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id),
        None
    )
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0, "sync_id": 1, "datos": 1}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante["nombre"],
        estudiante["apellido"],
        estudiante["grado"],
        estudiantes_sync
    )
    
    if coincidencia:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "encontrado",
                "estudiantes.$.matricula_sync_id": coincidencia["sync_id"],
                "estudiantes.$.similitud_matricula": coincidencia["similitud"],
                "estudiantes.$.nombre_matricula": coincidencia["nombre_encontrado"]
            }}
        )
        return {
            "success": True,
            "estado": "encontrado",
            "similitud": coincidencia["similitud"],
            "nombre_encontrado": coincidencia["nombre_encontrado"]
        }
    else:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "no_encontrado",
                "estudiantes.$.matricula_sync_id": None,
                "estudiantes.$.similitud_matricula": None,
                "estudiantes.$.nombre_matricula": None
            }}
        )
        return {
            "success": True,
            "estado": "no_encontrado",
            "mensaje": "No se encontró coincidencia en la base de datos de matrículas"
        }


@router.get("/{estudiante_id}/available-books")
async def get_available_books(
    estudiante_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener libros disponibles para un estudiante (excluye ya comprados)"""
    user = await db.clientes.find_one(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    )
    estudiante = next(
        (e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id),
        None
    )
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(
            status_code=403,
            detail="El estudiante debe estar en la lista de matrículas para ver libros"
        )
    
    grado = estudiante["grado"]
    libros_comprados = estudiante.get("libros_comprados", [])
    
    # Obtener libros para este grado
    query = {
        "activo": True,
        "$or": [{"grado": grado}, {"grados": grado}]
    }
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    
    # Marcar libros como comprados o disponibles
    for libro in libros:
        libro["ya_comprado"] = libro["libro_id"] in libros_comprados
        libro["disponible"] = libro.get("cantidad_inventario", 0) > 0 and not libro["ya_comprado"]
    
    return {
        "estudiante": estudiante,
        "libros": libros,
        "libros_comprados_count": len(libros_comprados)
    }


# ============== ADMIN ROUTES ==============

@router.get("/admin/pending-enrollments")
async def get_pending_enrollments(admin: dict = Depends(get_admin_user)):
    """Obtener estudiantes con matrícula pendiente (admin)"""
    clientes = await db.clientes.find(
        {"estudiantes.estado_matricula": "pendiente"},
        {"_id": 0, "contrasena_hash": 0}
    ).to_list(500)
    
    pendientes = []
    for cliente in clientes:
        for est in cliente.get("estudiantes", []):
            if est.get("estado_matricula") == "pendiente":
                pendientes.append({
                    "cliente_id": cliente["cliente_id"],
                    "cliente_nombre": cliente.get("nombre", ""),
                    "cliente_email": cliente.get("email", ""),
                    "cliente_telefono": cliente.get("telefono", ""),
                    **est
                })
    
    pendientes.sort(key=lambda x: x.get("fecha_registro", ""), reverse=True)
    return pendientes


@router.get("/admin/all-enrollments")
async def get_all_enrollments(
    estado: Optional[str] = None,
    ano_escolar: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Obtener todas las matrículas con filtros (admin)"""
    clientes = await db.clientes.find(
        {},
        {"_id": 0, "contrasena_hash": 0}
    ).to_list(500)
    
    matriculas = []
    for cliente in clientes:
        for est in cliente.get("estudiantes", []):
            if estado and est.get("estado_matricula") != estado:
                continue
            if ano_escolar and est.get("ano_escolar") != ano_escolar:
                continue
            
            matriculas.append({
                "cliente_id": cliente["cliente_id"],
                "cliente_nombre": cliente.get("nombre", ""),
                "cliente_email": cliente.get("email", ""),
                "cliente_telefono": cliente.get("telefono", ""),
                **est
            })
    
    return matriculas


@router.put("/admin/verify/{cliente_id}/{estudiante_id}")
async def admin_verify_enrollment(
    cliente_id: str,
    estudiante_id: str,
    accion: str,  # "aprobar" or "rechazar"
    motivo: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Aprobar o rechazar matrícula (admin)"""
    from datetime import datetime, timezone
    
    if accion not in ["aprobar", "rechazar"]:
        raise HTTPException(status_code=400, detail="Acción debe ser 'aprobar' o 'rechazar'")
    
    nuevo_estado = "confirmada" if accion == "aprobar" else "rechazada"
    
    result = await db.clientes.update_one(
        {"cliente_id": cliente_id, "estudiantes.estudiante_id": estudiante_id},
        {"$set": {"estudiantes.$.estado_matricula": nuevo_estado}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Crear notificación
    cliente = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0})
    estudiante = next(
        (e for e in cliente.get("estudiantes", []) if e["estudiante_id"] == estudiante_id),
        None
    )
    
    notificacion = {
        "notificacion_id": f"notif_{datetime.now(timezone.utc).timestamp()}",
        "tipo": "matricula_verificada",
        "titulo": f"Matrícula {nuevo_estado.title()}",
        "mensaje": f"Estudiante {estudiante['nombre']} {estudiante['apellido']} - {nuevo_estado}",
        "datos": {
            "estudiante_id": estudiante_id,
            "cliente_id": cliente_id,
            "estado": nuevo_estado,
            "motivo": motivo
        },
        "leida": False,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    await db.notificaciones.insert_one(notificacion)
    
    return {"success": True, "nuevo_estado": nuevo_estado}
