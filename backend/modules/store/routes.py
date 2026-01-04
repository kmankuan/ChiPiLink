"""
Store Routes - Products, orders, inventory, categories, students endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

from core.database import db
from core.auth import get_current_user, get_admin_user
from shared.utils import get_current_school_year, buscar_estudiante_en_matriculas
from .models import (
    LibroBase, LibroCreate, Libro,
    ItemPedido, PedidoCreate, Pedido, PedidoPublicoCreate,
    EstudianteBase, EstudianteCreate, Estudiante,
    CategoryBanner
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Store"])


# ============== HELPER FUNCTIONS ==============

async def create_notification(tipo: str, titulo: str, mensaje: str, datos: dict = None):
    """Helper to create notifications"""
    from modules.admin.models import Notificacion
    notificacion = Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        datos=datos
    )
    doc = notificacion.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    await db.notificaciones.insert_one(doc)
    return notificacion


async def create_monday_item(pedido: dict) -> Optional[str]:
    """Create item in Monday.com board"""
    from core.config import MONDAY_API_KEY, get_monday_board_id
    import httpx
    import json
    
    board_id = await get_monday_board_id(db)
    
    if not MONDAY_API_KEY or not board_id:
        logger.warning("Monday.com not configured - missing API key or Board ID")
        return None
    
    try:
        # Use appropriate fields based on order type
        cliente_info = pedido.get("nombre_acudiente") or pedido.get("cliente_id", "")
        estudiante_nombre = pedido.get("estudiante_nombre", "")
        
        column_values = json.dumps({
            "text": cliente_info,
            "text4": estudiante_nombre,
            "numbers": str(pedido.get("total", 0)),
            "status": {"label": pedido.get("estado", "pendiente")},
            "text0": pedido.get("metodo_pago", "")
        })
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{pedido.get('pedido_id', '')}",
                column_values: {json.dumps(column_values)}
            ) {{
                id
            }}
        }}
        '''
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "data" in result and "create_item" in result["data"]:
                    return result["data"]["create_item"]["id"]
            
            logger.error(f"Monday.com API error: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error creating Monday.com item: {e}")
        return None


# ============== CATEGORIES ROUTES ==============

@router.get("/categorias")
async def get_categorias():
    """Get all product categories"""
    categorias = await db.categorias.find({"activo": True}, {"_id": 0}).to_list(100)
    if not categorias:
        # Return default categories if none exist
        return [
            {"categoria_id": "libros", "nombre": "Libros", "icono": "📚", "orden": 1, "activo": True},
            {"categoria_id": "snacks", "nombre": "Snacks", "icono": "🍫", "orden": 2, "activo": True},
            {"categoria_id": "bebidas", "nombre": "Bebidas", "icono": "🥤", "orden": 3, "activo": True},
            {"categoria_id": "preparados", "nombre": "Preparados", "icono": "🌭", "orden": 4, "activo": True},
            {"categoria_id": "uniformes", "nombre": "Uniformes", "icono": "👕", "orden": 5, "activo": True},
            {"categoria_id": "servicios", "nombre": "Servicios", "icono": "🔧", "orden": 6, "activo": True},
        ]
    return sorted(categorias, key=lambda x: x.get("orden", 99))


@router.post("/admin/categorias")
async def create_categoria(categoria: dict, admin: dict = Depends(get_admin_user)):
    """Create a new product category"""
    categoria_id = categoria.get("categoria_id") or f"cat_{uuid.uuid4().hex[:8]}"
    
    doc = {
        "categoria_id": categoria_id,
        "nombre": categoria.get("nombre", "Nueva Categoría"),
        "icono": categoria.get("icono", "📦"),
        "orden": categoria.get("orden", 99),
        "activo": True,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categorias.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/admin/categorias/{categoria_id}")
async def update_categoria(categoria_id: str, categoria: dict, admin: dict = Depends(get_admin_user)):
    """Update a product category"""
    update_data = {
        "nombre": categoria.get("nombre"),
        "icono": categoria.get("icono"),
        "orden": categoria.get("orden"),
        "activo": categoria.get("activo", True)
    }
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.categorias.update_one(
        {"categoria_id": categoria_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    updated = await db.categorias.find_one({"categoria_id": categoria_id}, {"_id": 0})
    return updated


@router.delete("/admin/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, admin: dict = Depends(get_admin_user)):
    """Soft delete a product category"""
    # Check if category has products
    products_count = await db.libros.count_documents({"categoria": categoria_id, "activo": True})
    if products_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {products_count} productos en esta categoría."
        )
    
    result = await db.categorias.update_one(
        {"categoria_id": categoria_id},
        {"$set": {"activo": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return {"success": True}


# ============== PRODUCTS (LIBROS) ROUTES ==============

@router.get("/libros", response_model=List[dict])
async def get_libros(grado: Optional[str] = None, materia: Optional[str] = None):
    """Get all active products"""
    query = {"activo": True}
    if grado:
        # Search in both 'grado' (primary) and 'grados' (additional grades)
        query["$or"] = [
            {"grado": grado},
            {"grados": grado}
        ]
    if materia:
        query["materia"] = materia
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    return libros


@router.get("/libros/{libro_id}")
async def get_libro(libro_id: str):
    """Get a single product by ID"""
    libro = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro


@router.post("/admin/libros", response_model=dict)
async def create_libro(libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    """Create a new product"""
    libro_obj = Libro(**libro.model_dump())
    doc = libro_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.libros.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@router.put("/admin/libros/{libro_id}")
async def update_libro(libro_id: str, libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    """Update a product"""
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": libro.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    updated = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    return updated


@router.delete("/admin/libros/{libro_id}")
async def delete_libro(libro_id: str, admin: dict = Depends(get_admin_user)):
    """Soft delete a product"""
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"activo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True}


@router.get("/public/libros")
async def get_public_libros(grado: Optional[str] = None):
    """Get books for public form - no auth required"""
    query = {"activo": True}
    if grado:
        # Search in both 'grado' (primary) and 'grados' (additional grades)
        query["$or"] = [
            {"grado": grado},
            {"grados": grado}
        ]
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    # Filter only books with stock > 0
    libros_disponibles = [l for l in libros if l.get("cantidad_inventario", 0) > 0]
    return libros_disponibles


# ============== INVENTORY ROUTES ==============

@router.get("/admin/inventario")
async def get_inventario(admin: dict = Depends(get_admin_user)):
    """Get inventory status"""
    libros = await db.libros.find({"activo": True}, {"_id": 0}).to_list(500)
    
    alertas_bajo_stock = [l for l in libros if l.get("cantidad_inventario", 0) < 10]
    
    return {
        "libros": libros,
        "alertas_bajo_stock": alertas_bajo_stock,
        "total_productos": len(libros),
        "productos_bajo_stock": len(alertas_bajo_stock)
    }


@router.put("/admin/inventario/{libro_id}")
async def update_inventario(libro_id: str, cantidad: int, admin: dict = Depends(get_admin_user)):
    """Update product inventory"""
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"cantidad_inventario": cantidad}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True, "nueva_cantidad": cantidad}


# ============== STUDENTS ROUTES ==============

@router.get("/estudiantes")
async def get_estudiantes(current_user: dict = Depends(get_current_user)):
    """Get current user's students"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    return user.get("estudiantes", [])


@router.get("/estudiantes/{estudiante_id}")
async def get_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single student by ID"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return estudiante


@router.post("/estudiantes")
async def add_estudiante(estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    """Add a new student to current user"""
    estudiante_data = estudiante.model_dump()
    estudiante_obj = Estudiante(**estudiante_data)
    estudiante_dict = estudiante_obj.model_dump()
    estudiante_dict["fecha_registro"] = estudiante_dict["fecha_registro"].isoformat()
    
    # Auto-search in enrollment database (OPTIMIZED: only fetch needed fields)
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0, "sync_id": 1, "datos": 1}  # Only fetch required fields
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante.nombre,
        estudiante.apellido,
        estudiante.grado,
        estudiantes_sync
    )
    
    if coincidencia:
        # Found a match!
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


@router.post("/estudiantes/{estudiante_id}/verificar-matricula")
async def verificar_matricula_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Re-verify student enrollment against the synced database"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Search in enrollment database (OPTIMIZED: only fetch needed fields)
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0, "sync_id": 1, "datos": 1}  # Only fetch required fields
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


@router.put("/estudiantes/{estudiante_id}")
async def update_estudiante(estudiante_id: str, estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    """Update a student"""
    # First update the basic data
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
    
    # Re-verify enrollment after update
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0}
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


@router.delete("/estudiantes/{estudiante_id}")
async def delete_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a student"""
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$pull": {"estudiantes": {"estudiante_id": estudiante_id}}}
    )
    return {"success": True}


@router.get("/estudiantes/{estudiante_id}/libros-disponibles")
async def get_libros_disponibles(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Get available books for a student (excludes already purchased)"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(status_code=403, detail="El estudiante debe estar en la lista de matrículas para ver libros")
    
    grado = estudiante["grado"]
    libros_comprados = estudiante.get("libros_comprados", [])
    
    # Get all books for this grade
    query = {
        "activo": True,
        "$or": [{"grado": grado}, {"grados": grado}]
    }
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    
    # Mark books as purchased or available
    for libro in libros:
        libro["ya_comprado"] = libro["libro_id"] in libros_comprados
        libro["disponible"] = libro.get("cantidad_inventario", 0) > 0 and not libro["ya_comprado"]
    
    return {
        "estudiante": estudiante,
        "libros": libros,
        "libros_comprados_count": len(libros_comprados)
    }


# ============== ADMIN ENROLLMENT VERIFICATION ==============

@router.get("/admin/matriculas-pendientes")
async def get_matriculas_pendientes(admin: dict = Depends(get_admin_user)):
    """Get all students with pending enrollment verification"""
    # Get all clients with students that have pending status
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
    
    # Sort by date, most recent first
    pendientes.sort(key=lambda x: x.get("fecha_registro", ""), reverse=True)
    
    return pendientes


@router.get("/admin/matriculas")
async def get_all_matriculas(
    estado: Optional[str] = None,
    ano_escolar: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all student enrollments with optional filters"""
    clientes = await db.clientes.find(
        {},
        {"_id": 0, "contrasena_hash": 0}
    ).to_list(500)
    
    matriculas = []
    for cliente in clientes:
        for est in cliente.get("estudiantes", []):
            # Apply filters
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


@router.put("/admin/matriculas/{cliente_id}/{estudiante_id}/verificar")
async def verificar_matricula(
    cliente_id: str,
    estudiante_id: str,
    accion: str,  # "aprobar" or "rechazar"
    motivo: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Approve or reject a student enrollment"""
    if accion not in ["aprobar", "rechazar"]:
        raise HTTPException(status_code=400, detail="Acción debe ser 'aprobar' o 'rechazar'")
    
    nuevo_estado = "confirmada" if accion == "aprobar" else "rechazada"
    
    result = await db.clientes.update_one(
        {"cliente_id": cliente_id, "estudiantes.estudiante_id": estudiante_id},
        {"$set": {"estudiantes.$.estado_matricula": nuevo_estado}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Get student info for notification
    cliente = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0})
    estudiante = next((e for e in cliente.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    # Create notification about the status change
    await create_notification(
        tipo="matricula_verificada",
        titulo=f"Matrícula {nuevo_estado.title()}",
        mensaje=f"Estudiante {estudiante['nombre']} {estudiante['apellido']} - {nuevo_estado}",
        datos={
            "estudiante_id": estudiante_id,
            "cliente_id": cliente_id,
            "estado": nuevo_estado,
            "motivo": motivo
        }
    )
    
    return {"success": True, "nuevo_estado": nuevo_estado}


# ============== ORDERS ROUTES ==============

@router.post("/pedidos")
async def create_pedido(pedido: PedidoCreate, current_user: dict = Depends(get_current_user)):
    """Create a new order (authenticated)"""
    # Get student info
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == pedido.estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Verify enrollment is confirmed
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(status_code=403, detail="El estudiante debe estar en la lista de matrículas para realizar compras")
    
    # Check for already purchased books
    libros_comprados = estudiante.get("libros_comprados", [])
    for item in pedido.items:
        if item.libro_id in libros_comprados:
            libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
            raise HTTPException(status_code=400, detail=f"El libro '{libro['nombre']}' ya fue comprado para este estudiante")
    
    # Calculate total and verify inventory
    total = 0
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        total += item.cantidad * item.precio_unitario
    
    pedido_obj = Pedido(
        cliente_id=current_user["cliente_id"],
        estudiante_id=pedido.estudiante_id,
        estudiante_nombre=f"{estudiante['nombre']} {estudiante.get('apellido', '')}",
        items=[item.model_dump() for item in pedido.items],
        total=total,
        metodo_pago=pedido.metodo_pago,
        notas=pedido.notas
    )
    
    doc = pedido_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    doc["ano_escolar"] = estudiante.get("ano_escolar", get_current_school_year())
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(doc)
    
    # Update student's purchased books list
    libro_ids = [item.libro_id for item in pedido.items]
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": pedido.estudiante_id},
        {"$push": {"estudiantes.$.libros_comprados": {"$each": libro_ids}}}
    )
    
    # Create Monday.com item
    monday_id = await create_monday_item(doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": doc["pedido_id"]},
            {"$set": {"monday_item_id": monday_id}}
        )
        doc["monday_item_id"] = monday_id
    
    # Create notification for admin
    await create_notification(
        tipo="pedido_nuevo",
        titulo="Nuevo Pedido de Libros",
        mensaje=f"Pedido {doc['pedido_id']} - {estudiante['nombre']} {estudiante.get('apellido', '')} - ${total:.2f}",
        datos={"pedido_id": doc["pedido_id"], "total": total, "estudiante": f"{estudiante['nombre']} {estudiante.get('apellido', '')}"}
    )
    
    return {k: v for k, v in doc.items() if k != "_id"}


@router.get("/pedidos")
async def get_my_pedidos(current_user: dict = Depends(get_current_user)):
    """Get current user's orders"""
    pedidos = await db.pedidos.find(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(100)
    return pedidos


@router.get("/admin/pedidos")
async def get_all_pedidos(
    estado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all orders (admin)"""
    query = {}
    if estado:
        query["estado"] = estado
    
    pedidos = await db.pedidos.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(500)
    return pedidos


@router.put("/admin/pedidos/{pedido_id}")
async def update_pedido(pedido_id: str, estado: str, admin: dict = Depends(get_admin_user)):
    """Update order status"""
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"estado": estado}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}


@router.put("/admin/pedidos/{pedido_id}/confirmar-pago")
async def confirmar_pago(pedido_id: str, admin: dict = Depends(get_admin_user)):
    """Confirm payment for an order"""
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"pago_confirmado": True, "estado": "confirmado"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}


@router.get("/pedidos/{pedido_id}/public")
async def get_pedido_public(pedido_id: str):
    """Get order details for public checkout page (limited info)"""
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Return limited info for checkout
    return {
        "pedido_id": pedido.get("pedido_id"),
        "items": pedido.get("items", []),
        "subtotal": pedido.get("subtotal", pedido.get("total", 0)),
        "impuestos": pedido.get("impuestos", 0),
        "descuento": pedido.get("descuento", 0),
        "total": pedido.get("total", 0),
        "estado": pedido.get("estado"),
        "estado_pago": pedido.get("estado_pago", "pendiente"),
        "cliente_email": pedido.get("cliente_email"),
        "cliente_telefono": pedido.get("cliente_telefono"),
        "yappy_status": pedido.get("yappy_status"),
        "yappy_status_descripcion": pedido.get("yappy_status_descripcion")
    }


@router.get("/pedidos/{pedido_id}/recibo")
async def get_recibo(pedido_id: str, current_user: dict = Depends(get_current_user)):
    """Get receipt for an order"""
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Verify ownership or admin
    if pedido["cliente_id"] != current_user["cliente_id"] and not current_user.get("es_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    cliente = await db.clientes.find_one({"cliente_id": pedido["cliente_id"]}, {"_id": 0, "contrasena_hash": 0})
    
    return {
        "pedido": pedido,
        "cliente": cliente
    }


# ============== PUBLIC ORDER ROUTES ==============

@router.post("/public/pedido")
async def create_public_order(pedido: PedidoPublicoCreate):
    """Create order from public form - no auth required"""
    
    # Validate and calculate total
    total = 0
    items_validados = []
    
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id, "activo": True}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        
        total += item.cantidad * item.precio_unitario
        items_validados.append(item.model_dump())
    
    # Create full student name from separate fields
    nombre_completo_estudiante = f"{pedido.nombre_estudiante} {pedido.apellido_estudiante}"
    
    # Create order
    pedido_id = f"ped_{uuid.uuid4().hex[:12]}"
    pedido_doc = {
        "pedido_id": pedido_id,
        "tipo": "publico",  # Mark as public order
        "cliente_id": None,
        # Guardian info
        "nombre_acudiente": pedido.nombre_acudiente,
        "telefono_acudiente": pedido.telefono_acudiente,
        "email_acudiente": pedido.email_acudiente,
        # Student info
        "estudiante_id": None,
        "estudiante_nombre": nombre_completo_estudiante,
        "estudiante_primer_nombre": pedido.nombre_estudiante,
        "estudiante_apellido": pedido.apellido_estudiante,
        "grado_estudiante": pedido.grado_estudiante,
        "email_estudiante": pedido.email_estudiante,
        "telefono_estudiante": pedido.telefono_estudiante,
        "escuela_estudiante": pedido.escuela_estudiante,
        # Order details
        "items": items_validados,
        "total": total,
        "metodo_pago": pedido.metodo_pago,
        "estado": "pendiente",
        "pago_confirmado": False,
        "notas": pedido.notas,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(pedido_doc)
    
    # Create Monday.com item
    monday_id = await create_monday_item(pedido_doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": pedido_id},
            {"$set": {"monday_item_id": monday_id}}
        )
    
    # Create notification
    await create_notification(
        tipo="pedido_nuevo",
        titulo="Nuevo Pedido Recibido",
        mensaje=f"Pedido {pedido_id} de {pedido.nombre_acudiente} - ${total:.2f}",
        datos={"pedido_id": pedido_id, "total": total, "acudiente": pedido.nombre_acudiente}
    )
    
    # Check low stock and create notifications
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if libro and libro.get("cantidad_inventario", 0) < 10:
            await create_notification(
                tipo="bajo_stock",
                titulo="Alerta de Stock Bajo",
                mensaje=f"{libro['nombre']} tiene solo {libro['cantidad_inventario']} unidades",
                datos={"libro_id": item.libro_id, "stock": libro['cantidad_inventario'], "nombre": libro['nombre']}
            )
    
    return {
        "success": True,
        "pedido_id": pedido_id,
        "total": total,
        "mensaje": "Pedido creado exitosamente"
    }


# ============== METADATA ROUTES ==============

@router.get("/grados")
async def get_grados():
    """Get available grades"""
    return {
        "grados": [
            {"id": "preescolar", "nombre": "Preescolar"},
            {"id": "1", "nombre": "1er Grado"},
            {"id": "2", "nombre": "2do Grado"},
            {"id": "3", "nombre": "3er Grado"},
            {"id": "4", "nombre": "4to Grado"},
            {"id": "5", "nombre": "5to Grado"},
            {"id": "6", "nombre": "6to Grado"},
            {"id": "7", "nombre": "7mo Grado"},
            {"id": "8", "nombre": "8vo Grado"},
            {"id": "9", "nombre": "9no Grado"},
            {"id": "10", "nombre": "10mo Grado"},
            {"id": "11", "nombre": "11vo Grado"},
            {"id": "12", "nombre": "12vo Grado"},
        ]
    }


@router.get("/materias")
async def get_materias():
    """Get available subjects"""
    return {
        "materias": [
            {"id": "matematicas", "nombre": "Matemáticas"},
            {"id": "espanol", "nombre": "Español"},
            {"id": "ciencias", "nombre": "Ciencias"},
            {"id": "sociales", "nombre": "Estudios Sociales"},
            {"id": "ingles", "nombre": "Inglés"},
            {"id": "arte", "nombre": "Arte"},
            {"id": "musica", "nombre": "Música"},
            {"id": "educacion_fisica", "nombre": "Educación Física"},
            {"id": "tecnologia", "nombre": "Tecnología"},
            {"id": "religion", "nombre": "Religión"},
        ]
    }


# ============== CATEGORY LANDING PAGE ROUTES ==============

@router.get("/category-banners/{categoria}")
async def get_category_banners(categoria: str):
    """Get active banners for a category (public)"""
    now = datetime.now(timezone.utc)
    query = {
        "categoria": categoria,
        "activo": True,
        "$or": [
            {"fecha_inicio": None, "fecha_fin": None},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": None},
            {"fecha_inicio": None, "fecha_fin": {"$gte": now}},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": {"$gte": now}}
        ]
    }
    banners = await db.category_banners.find(query, {"_id": 0}).sort("orden", 1).to_list(20)
    return banners


@router.get("/admin/category-banners")
async def get_all_category_banners(admin: dict = Depends(get_admin_user)):
    """Get all banners (admin)"""
    banners = await db.category_banners.find({}, {"_id": 0}).sort([("categoria", 1), ("orden", 1)]).to_list(100)
    return banners


@router.post("/admin/category-banners")
async def create_category_banner(banner: dict, admin: dict = Depends(get_admin_user)):
    """Create a new category banner"""
    doc = {
        "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
        "categoria": banner.get("categoria"),
        "titulo": banner.get("titulo"),
        "subtitulo": banner.get("subtitulo"),
        "imagen_url": banner.get("imagen_url"),
        "link_url": banner.get("link_url"),
        "activo": banner.get("activo", True),
        "orden": banner.get("orden", 0),
        "fecha_inicio": banner.get("fecha_inicio"),
        "fecha_fin": banner.get("fecha_fin"),
        "creado_por": "admin",
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.category_banners.insert_one(doc)
    del doc["_id"]
    return doc


@router.put("/admin/category-banners/{banner_id}")
async def update_category_banner(banner_id: str, banner: dict, admin: dict = Depends(get_admin_user)):
    """Update a category banner"""
    update_data = {k: v for k, v in banner.items() if k not in ["banner_id", "_id", "fecha_creacion"]}
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    result = await db.category_banners.update_one(
        {"banner_id": banner_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    
    updated = await db.category_banners.find_one({"banner_id": banner_id}, {"_id": 0})
    return updated


@router.delete("/admin/category-banners/{banner_id}")
async def delete_category_banner(banner_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a category banner"""
    result = await db.category_banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    return {"success": True}


@router.get("/category-featured/{categoria}")
async def get_category_featured_products(categoria: str, limit: int = 10):
    """Get featured products for a category (public)"""
    query = {"categoria": categoria, "destacado": True, "activo": True}
    products = await db.libros.find(query, {"_id": 0}).sort("orden_destacado", 1).to_list(limit)
    return products


@router.get("/category-promotions/{categoria}")
async def get_category_promotional_products(categoria: str, limit: int = 10):
    """Get promotional products for a category (public)"""
    query = {"categoria": categoria, "en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}}
    products = await db.libros.find(query, {"_id": 0}).to_list(limit)
    return products


@router.get("/category-newest/{categoria}")
async def get_category_newest_products(categoria: str, limit: int = 8):
    """Get newest products for a category (public)"""
    query = {"categoria": categoria, "activo": True}
    products = await db.libros.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(limit)
    return products


@router.put("/admin/products/{libro_id}/featured")
async def toggle_product_featured(libro_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Toggle featured status of a product"""
    update_data = {
        "destacado": data.get("destacado", False),
        "orden_destacado": data.get("orden_destacado", 0)
    }
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}


@router.put("/admin/products/{libro_id}/promotion")
async def toggle_product_promotion(libro_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Toggle promotion status of a product"""
    update_data = {
        "en_promocion": data.get("en_promocion", False),
        "precio_oferta": data.get("precio_oferta")
    }
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}


@router.get("/admin/vendor-permissions")
async def get_all_vendor_permissions(admin: dict = Depends(get_admin_user)):
    """Get all vendor permissions (admin only)"""
    permissions = await db.vendor_permissions.find({}, {"_id": 0}).to_list(100)
    return permissions


@router.get("/admin/vendor-permissions/{vendor_id}")
async def get_vendor_permissions(vendor_id: str, admin: dict = Depends(get_admin_user)):
    """Get permissions for a specific vendor"""
    permissions = await db.vendor_permissions.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not permissions:
        # Return default permissions
        return {
            "vendor_id": vendor_id,
            "puede_crear_banners": False,
            "puede_destacar_productos": False,
            "puede_crear_promociones": False,
            "puede_publicar_noticias": False,
            "max_banners": 3,
            "max_productos_destacados": 5
        }
    return permissions


@router.put("/admin/vendor-permissions/{vendor_id}")
async def update_vendor_permissions(vendor_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update vendor permissions (admin only)"""
    update_data = {
        "vendor_id": vendor_id,
        "puede_crear_banners": data.get("puede_crear_banners", False),
        "puede_destacar_productos": data.get("puede_destacar_productos", False),
        "puede_crear_promociones": data.get("puede_crear_promociones", False),
        "puede_publicar_noticias": data.get("puede_publicar_noticias", False),
        "max_banners": data.get("max_banners", 3),
        "max_productos_destacados": data.get("max_productos_destacados", 5),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    await db.vendor_permissions.update_one(
        {"vendor_id": vendor_id},
        {"$set": update_data},
        upsert=True
    )
    return {"success": True, "permissions": update_data}


@router.get("/category-landing/{categoria}")
async def get_category_landing_data(categoria: str):
    """Get all data needed for a category landing page"""
    now = datetime.now(timezone.utc)
    
    # Get category info
    cat_info = await db.categorias.find_one({"categoria_id": categoria}, {"_id": 0})
    
    # Get active banners
    banner_query = {
        "categoria": categoria,
        "activo": True,
        "$or": [
            {"fecha_inicio": None, "fecha_fin": None},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": None},
            {"fecha_inicio": None, "fecha_fin": {"$gte": now}},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": {"$gte": now}}
        ]
    }
    banners = await db.category_banners.find(banner_query, {"_id": 0}).sort("orden", 1).to_list(10)
    
    # Get featured products
    featured = await db.libros.find(
        {"categoria": categoria, "destacado": True, "activo": True},
        {"_id": 0}
    ).sort("orden_destacado", 1).to_list(10)
    
    # Get promotional products
    promotions = await db.libros.find(
        {"categoria": categoria, "en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}},
        {"_id": 0}
    ).to_list(10)
    
    # Get newest products
    newest = await db.libros.find(
        {"categoria": categoria, "activo": True},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(8)
    
    # Get total product count for this category
    total_products = await db.libros.count_documents({"categoria": categoria, "activo": True})
    
    return {
        "categoria": cat_info,
        "banners": banners,
        "destacados": featured,
        "promociones": promotions,
        "novedades": newest,
        "total_productos": total_products
    }
