"""
Store Module - Private Catalog Routes
Endpoints for Unatienda's private catalog (only users with linked PCA students)
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone

from core.auth import get_current_user, get_admin_user, get_optional_user
from core.database import db
from ..services.textbook_access_service import textbook_access_service

router = APIRouter(prefix="/catalogo-privado", tags=["Store - Private Catalog"])


async def verify_private_catalog_access(user_id: str) -> dict:
    """
    Verify if user has access to the private catalog.
    Uses the textbook_access system (store_textbook_access_students collection).
    """
    students = []
    grades = set()
    
    try:
        user_students = await textbook_access_service.get_user_students(user_id)
        for student in user_students:
            if student.get("has_approved_access") or student.get("status") == "approved":
                students.append({
                    "sync_id": student.get("student_id"),
                    "nombre": student.get("full_name"),
                    "grado": student.get("grade"),
                    "seccion": student.get("section"),
                    "student_id": student.get("student_id"),
                    "school_name": student.get("school_name")
                })
                if student.get("grade"):
                    grades.add(student.get("grade"))
    except Exception as e:
        print(f"Error checking textbook access: {e}")
    
    if not students:
        return {
            "tiene_acceso": False,
            "estudiantes": [],
            "grados": [],
            "mensaje": "No linked students. Link a PCA student to access the private catalog."
        }
    
    return {
        "tiene_acceso": True,
        "estudiantes": students,
        "grados": list(grades),
        "mensaje": None
    }


@router.get("/acceso")
async def check_access(
    current_user: dict = Depends(get_current_user)
):
    """
    Check if user has access to the private catalog.
    Returns list of linked students and available grades.
    """
    return await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))


@router.get("/productos")
async def get_private_catalog_products(
    grado: Optional[str] = None,
    materia: Optional[str] = None,
    search: Optional[str] = None,
    destacados: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: dict = Depends(get_current_user)
):
    """
    Get products from the private catalog.
    Only accessible to users with linked PCA students.
    """
    # Verify access
    acceso = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not acceso["tiene_acceso"]:
        raise HTTPException(
            status_code=403, 
            detail=acceso["mensaje"] or "No access to private catalog"
        )
    
    # Build query
    query = {
        "es_catalogo_privado": True,
        "activo": True
    }
    
    # Filter by grade (if not specified, show all user's grades)
    if grado:
        query["$or"] = [
            {"grado": grado},
            {"grados": grado}
        ]
    
    if materia:
        query["materia"] = materia
    
    if destacados:
        query["destacado"] = True
    
    if search:
        query["$or"] = [
            {"nombre": {"$regex": search, "$options": "i"}},
            {"descripcion": {"$regex": search, "$options": "i"}},
            {"codigo": {"$regex": search, "$options": "i"}},
            {"editorial": {"$regex": search, "$options": "i"}}
        ]
    
    # Get products
    productos = await db.libros.find(
        query,
        {"_id": 0}
    ).sort([("grado", 1), ("materia", 1), ("nombre", 1)]).skip(skip).limit(limit).to_list(limit)
    
    # Contar total
    total = await db.libros.count_documents(query)
    
    # Get grados y materias disponibles para filtros
    grados_disponibles = await db.libros.distinct("grado", {"es_catalogo_privado": True, "activo": True})
    materias_disponibles = await db.libros.distinct("materia", {"es_catalogo_privado": True, "activo": True})
    
    return {
        "productos": productos,
        "total": total,
        "filtros": {
            "grados": sorted([g for g in grados_disponibles if g]),
            "materias": sorted([m for m in materias_disponibles if m])
        },
        "acceso": {
            "estudiantes": acceso["estudiantes"],
            "grados_estudiante": acceso["grados"]
        }
    }


@router.get("/productos/{libro_id}")
async def get_producto_detalle(
    libro_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener detalle de un producto del catálogo privado.
    """
    # Verify acceso
    acceso = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not acceso["tiene_acceso"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes acceso al catálogo privado"
        )
    
    producto = await db.libros.find_one(
        {"libro_id": libro_id, "es_catalogo_privado": True},
        {"_id": 0}
    )
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return producto


@router.get("/por-grado/{grado}")
async def get_productos_por_grado(
    grado: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener todos los productos de un grado específico.
    Útil para mostrar la lista de libros de un estudiante.
    """
    # Verify acceso
    acceso = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not acceso["tiene_acceso"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes acceso al catálogo privado"
        )
    
    query = {
        "es_catalogo_privado": True,
        "activo": True,
        "$or": [
            {"grado": grado},
            {"grados": grado}
        ]
    }
    
    productos = await db.libros.find(
        query,
        {"_id": 0}
    ).sort([("materia", 1), ("nombre", 1)]).to_list(200)
    
    # Agrupar por materia
    por_materia = {}
    for p in productos:
        materia = p.get("materia", "Otros")
        if materia not in por_materia:
            por_materia[materia] = []
        por_materia[materia].append(p)
    
    return {
        "grado": grado,
        "total": len(productos),
        "productos": productos,
        "por_materia": por_materia
    }


@router.get("/resumen")
async def get_resumen_catalogo(
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener resumen del catálogo privado para el usuario.
    Muestra productos disponibles para cada estudiante vinculado.
    """
    # Verify acceso
    acceso = await verify_private_catalog_access(current_user.get("user_id") or current_user.get("user_id"))
    
    if not acceso["tiene_acceso"]:
        raise HTTPException(
            status_code=403, 
            detail="No tienes acceso al catálogo privado"
        )
    
    resumen = []
    
    for estudiante in acceso["estudiantes"]:
        grado = estudiante.get("grado")
        
        if grado:
            # Contar productos del grado
            count = await db.libros.count_documents({
                "es_catalogo_privado": True,
                "activo": True,
                "$or": [{"grado": grado}, {"grados": grado}]
            })
            
            # Calcular total estimado
            productos = await db.libros.find(
                {
                    "es_catalogo_privado": True,
                    "activo": True,
                    "$or": [{"grado": grado}, {"grados": grado}]
                },
                {"precio": 1, "precio_oferta": 1}
            ).to_list(200)
            
            total_estimado = sum(
                p.get("precio_oferta") or p.get("precio", 0) 
                for p in productos
            )
            
            resumen.append({
                "estudiante": estudiante,
                "productos_disponibles": count,
                "total_estimado": round(total_estimado, 2)
            })
    
    return {
        "resumen": resumen,
        "total_estudiantes": len(acceso["estudiantes"])
    }


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/productos")
async def admin_get_productos_catalogo_privado(
    grado: Optional[str] = None,
    materia: Optional[str] = None,
    activo: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Obtener todos los productos del catálogo privado.
    """
    query = {"es_catalogo_privado": True}
    
    if grado:
        query["$or"] = [{"grado": grado}, {"grados": grado}]
    
    if materia:
        query["materia"] = materia
    
    if activo is not None:
        query["activo"] = activo
    
    productos = await db.libros.find(
        query,
        {"_id": 0}
    ).sort([("grado", 1), ("materia", 1)]).skip(skip).limit(limit).to_list(limit)
    
    total = await db.libros.count_documents(query)
    
    return {
        "productos": productos,
        "total": total
    }


@router.post("/admin/productos")
async def admin_crear_producto_catalogo_privado(
    producto: dict,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Crear producto en el catálogo privado.
    """
    import uuid
    
    # Asegurar que sea catálogo privado
    producto["es_catalogo_privado"] = True
    producto["libro_id"] = producto.get("libro_id") or f"libro_{uuid.uuid4().hex[:12]}"
    producto["activo"] = producto.get("activo", True)
    producto["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
    
    await db.libros.insert_one(producto)
    producto.pop("_id", None)
    
    return {"success": True, "producto": producto}


@router.put("/admin/productos/{libro_id}")
async def admin_actualizar_producto_catalogo_privado(
    libro_id: str,
    updates: dict,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Actualizar producto del catálogo privado.
    """
    # Asegurar que no se pueda cambiar es_catalogo_privado
    updates["es_catalogo_privado"] = True
    updates["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.libros.update_one(
        {"libro_id": libro_id, "es_catalogo_privado": True},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    producto = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    
    return {"success": True, "producto": producto}


@router.delete("/admin/productos/{libro_id}")
async def admin_eliminar_producto_catalogo_privado(
    libro_id: str,
    hard_delete: bool = False,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin: Eliminar producto del catálogo privado.
    Por defecto hace soft delete (activo=False).
    """
    if hard_delete:
        result = await db.libros.delete_one(
            {"libro_id": libro_id, "es_catalogo_privado": True}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
    else:
        result = await db.libros.update_one(
            {"libro_id": libro_id, "es_catalogo_privado": True},
            {"$set": {"activo": False, "fecha_eliminacion": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return {"success": True, "message": "Producto eliminado"}
