"""
Store Module - Pedidos Routes
Endpoints para gestión de pedidos de libros escolares
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from ..services.pedidos_service import pedidos_service

router = APIRouter(prefix="/pedidos", tags=["Store - Pedidos"])


def get_user_identifier(user: dict) -> str:
    """Get user identifier - supports both old cliente_id and new user_id"""
    return user.get("cliente_id") or user.get("user_id") or user.get("id")


# ============== REQUEST MODELS ==============

class CrearPedidoRequest(BaseModel):
    estudiante_sync_id: str
    ano_escolar: Optional[str] = None
    tipo: str = "pre_orden"


class AgregarItemRequest(BaseModel):
    libro_id: str
    cantidad: int = 1
    nota: Optional[str] = None


class ConfirmarPedidoRequest(BaseModel):
    acepto_terminos: bool = True
    notas: Optional[str] = None


class CancelarPedidoRequest(BaseModel):
    motivo: Optional[str] = None


class AdminActualizarEstadoRequest(BaseModel):
    nuevo_estado: str
    notas: Optional[str] = None


# ============== ENDPOINTS ACUDIENTE ==============

@router.get("/preview/{estudiante_sync_id}")
async def get_vista_previa_pedido(
    estudiante_sync_id: str,
    ano_escolar: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener vista previa del pedido para un estudiante.
    Muestra todos los libros requeridos para su grado,
    cuáles ya están pedidos y cuáles faltan por pedir.
    """
    result = await pedidos_service.obtener_vista_previa_pedido(
        estudiante_sync_id,
        get_user_identifier(current_user),
        ano_escolar
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.post("/crear")
async def crear_pedido(
    request: CrearPedidoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Crear un nuevo pedido (en estado borrador).
    Si ya existe un borrador, retorna ese.
    """
    try:
        result = await pedidos_service.crear_pedido(
            request.estudiante_sync_id,
            get_user_identifier(current_user),
            request.ano_escolar,
            request.tipo
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pedido_id}/agregar-item")
async def agregar_item_pedido(
    pedido_id: str,
    request: AgregarItemRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Agregar un libro al pedido.
    Valida:
    - Que el libro sea para el grado del estudiante
    - Que el estudiante no tenga ese libro ya pedido este año
    """
    try:
        result = await pedidos_service.agregar_item(
            pedido_id,
            request.libro_id,
            get_user_identifier(current_user),
            request.cantidad,
            request.nota
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{pedido_id}/item/{item_id}")
async def quitar_item_pedido(
    pedido_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Quitar un item del pedido (solo en estado borrador).
    """
    try:
        result = await pedidos_service.quitar_item(
            pedido_id,
            item_id,
            get_user_identifier(current_user)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pedido_id}/agregar-todos")
async def agregar_todos_libros_faltantes(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Agregar todos los libros faltantes del grado al pedido.
    Útil para hacer pedido completo con un solo clic.
    """
    try:
        result = await pedidos_service.agregar_todos_libros_faltantes(
            pedido_id,
            get_user_identifier(current_user)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{pedido_id}/confirmar")
async def confirmar_pedido(
    pedido_id: str,
    request: ConfirmarPedidoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Confirmar un pedido (pasarlo de borrador a pre_orden).
    Una vez confirmado, no se puede modificar.
    """
    try:
        result = await pedidos_service.confirmar_pedido(
            pedido_id,
            get_user_identifier(current_user),
            request.acepto_terminos,
            request.notas
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/mis-pedidos")
async def get_mis_pedidos(
    estudiante_sync_id: Optional[str] = None,
    ano_escolar: Optional[str] = None,
    estado: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener mis pedidos como acudiente.
    Puedo filtrar por estudiante, año escolar y estado.
    """
    result = await pedidos_service.obtener_mis_pedidos(
        get_user_identifier(current_user),
        estudiante_sync_id,
        ano_escolar,
        estado
    )
    return {"pedidos": result}


@router.get("/{pedido_id}")
async def get_pedido(
    pedido_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener detalle de un pedido específico.
    """
    result = await pedidos_service.obtener_pedido(
        pedido_id,
        get_user_identifier(current_user)
    )
    
    if not result:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    return result


@router.post("/{pedido_id}/cancelar")
async def cancelar_pedido(
    pedido_id: str,
    request: CancelarPedidoRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancelar un pedido (si aún no ha sido entregado).
    """
    try:
        result = await pedidos_service.cancelar_pedido(
            pedido_id,
            get_user_identifier(current_user),
            request.motivo
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ENDPOINTS ADMIN ==============

@router.get("/admin/demanda")
async def admin_get_demanda_agregada(
    ano_escolar: Optional[str] = None,
    grado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener demanda agregada de libros.
    Útil para planificar compras a editoriales.
    """
    result = await pedidos_service.admin_obtener_demanda_agregada(
        ano_escolar,
        grado
    )
    return result


@router.get("/admin/todos")
async def admin_get_todos_pedidos(
    ano_escolar: Optional[str] = None,
    estado: Optional[str] = None,
    grado: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener todos los pedidos con filtros.
    """
    result = await pedidos_service.admin_obtener_todos_pedidos(
        ano_escolar,
        estado,
        grado,
        limit,
        skip
    )
    return result


@router.get("/admin/{pedido_id}")
async def admin_get_pedido(
    pedido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener detalle de cualquier pedido (admin).
    """
    result = await pedidos_service.obtener_pedido(pedido_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    return result


@router.put("/admin/{pedido_id}/estado")
async def admin_actualizar_estado(
    pedido_id: str,
    request: AdminActualizarEstadoRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Actualizar estado de un pedido (admin).
    Estados: borrador, pre_orden, confirmado, en_proceso, listo_retiro, entregado, cancelado
    """
    try:
        result = await pedidos_service.admin_actualizar_estado_pedido(
            pedido_id,
            request.nuevo_estado,
            get_user_identifier(admin),
            request.notas
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
