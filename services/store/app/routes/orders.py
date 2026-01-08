"""
Store Module - Order Routes
Endpoints para gestión de pedidos usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from core.database import db
from ..models import Order, OrderCreate, OrderStatus
from ..services import order_service

router = APIRouter(prefix="/orders", tags=["Store - Orders"])


@router.post("", response_model=Order)
async def create_order(
    data: OrderCreate,
    current_user: dict = Depends(get_current_user)
):
    """Crear nuevo pedido (usuario autenticado)"""
    # Obtener información del estudiante
    user = await db.clientes.find_one(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    )
    
    estudiante = next(
        (e for e in user.get("estudiantes", []) if e["estudiante_id"] == data.estudiante_id),
        None
    )
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Verificar que el estudiante está en la lista de matrículas
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(
            status_code=403,
            detail="El estudiante debe estar en la lista de matrículas para realizar compras"
        )
    
    # Verificar libros ya comprados
    libros_comprados = estudiante.get("libros_comprados", [])
    for item in data.items:
        if item.libro_id in libros_comprados:
            libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
            raise HTTPException(
                status_code=400,
                detail=f"El libro '{libro['nombre']}' ya fue comprado para este estudiante"
            )
    
    try:
        order = await order_service.create_order(
            data=data,
            cliente_id=current_user["cliente_id"],
            estudiante_info=estudiante
        )
        
        # Actualizar libros comprados del estudiante
        libro_ids = [item.libro_id for item in data.items]
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": data.estudiante_id},
            {"$push": {"estudiantes.$.libros_comprados": {"$each": libro_ids}}}
        )
        
        return order
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=List[Order])
async def get_my_orders(current_user: dict = Depends(get_current_user)):
    """Obtener pedidos del usuario actual"""
    return await order_service.get_client_orders(current_user["cliente_id"])


@router.get("/{pedido_id}", response_model=Order)
async def get_order(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener pedido por ID"""
    order = await order_service.get_order(pedido_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Verificar ownership o admin
    if order.cliente_id != current_user["cliente_id"] and not current_user.get("es_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    return order


@router.get("/{pedido_id}/receipt")
async def get_receipt(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Obtener recibo de un pedido"""
    order = await order_service.get_order(pedido_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Verificar ownership o admin
    if order.cliente_id != current_user["cliente_id"] and not current_user.get("es_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    cliente = await db.clientes.find_one(
        {"cliente_id": order.cliente_id},
        {"_id": 0, "contrasena_hash": 0}
    )
    
    return {
        "pedido": order.model_dump(),
        "cliente": cliente
    }


# ============== ADMIN ROUTES ==============

@router.get("/admin/all", response_model=List[Order])
async def get_all_orders(
    estado: Optional[str] = None,
    limit: int = Query(500, ge=1, le=1000),
    admin: dict = Depends(get_admin_user)
):
    """Obtener todos los pedidos (admin)"""
    return await order_service.get_all_orders(estado=estado, limit=limit)


@router.put("/admin/{pedido_id}/status")
async def update_order_status(
    pedido_id: str,
    estado: OrderStatus,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar estado del pedido (admin)"""
    order = await order_service.update_status(pedido_id, estado)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True, "order": order}


@router.put("/admin/{pedido_id}/confirm-payment")
async def confirm_payment(
    pedido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Confirmar pago de un pedido (admin)"""
    order = await order_service.confirm_payment(pedido_id)
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True, "order": order}


@router.get("/admin/stats")
async def get_order_stats(admin: dict = Depends(get_admin_user)):
    """Obtener estadísticas de pedidos (admin)"""
    return await order_service.get_stats()
