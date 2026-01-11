"""
Store Module - Monday.com Integration Routes
Endpoints para configurar y sincronizar pedidos con Monday.com
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict
from pydantic import BaseModel

from core.auth import get_admin_user
from ..services.monday_pedidos_service import monday_pedidos_service

router = APIRouter(prefix="/monday", tags=["Store - Monday.com"])


# ============== REQUEST MODELS ==============

class MondayConfigRequest(BaseModel):
    """Configuración de Monday.com para pedidos"""
    board_id: str
    group_id: Optional[str] = None
    auto_sync: bool = True
    column_mapping: Dict[str, str] = {
        "estudiante": "text",
        "grado": "text0",
        "acudiente": "text4",
        "libros": "long_text",
        "total": "numbers",
        "estado": "status",
        "fecha": "date",
        "pedido_id": "text6"
    }


# ============== ENDPOINTS ==============

@router.get("/test-connection")
async def test_monday_connection(
    admin: dict = Depends(get_admin_user)
):
    """
    Probar conexión con Monday.com.
    Usa la API Key configurada en el .env (MONDAY_API_KEY).
    """
    result = await monday_pedidos_service.test_connection()
    return result


@router.get("/boards")
async def get_monday_boards(
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener lista de boards disponibles en Monday.com.
    """
    try:
        boards = await monday_pedidos_service.get_boards()
        return {"boards": boards}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/boards/{board_id}/columns")
async def get_board_columns(
    board_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener columnas y grupos de un board específico.
    Útil para configurar el mapeo de columnas.
    """
    try:
        result = await monday_pedidos_service.get_board_columns(board_id)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/config")
async def get_monday_config(
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener configuración actual de Monday.com para pedidos.
    """
    config = await monday_pedidos_service.get_config()
    return config


@router.post("/config")
async def save_monday_config(
    request: MondayConfigRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Guardar configuración de Monday.com para pedidos.
    
    Parámetros:
    - board_id: ID del board de pedidos en Monday.com
    - group_id: (Opcional) ID del grupo donde crear items
    - auto_sync: Si debe sincronizar automáticamente al cambiar estados
    - column_mapping: Mapeo de campos a columnas de Monday.com
    """
    config = {
        "board_id": request.board_id,
        "group_id": request.group_id,
        "auto_sync": request.auto_sync,
        "column_mapping": request.column_mapping
    }
    
    success = await monday_pedidos_service.save_config(config)
    
    if success:
        return {"success": True, "message": "Configuración guardada"}
    else:
        raise HTTPException(status_code=500, detail="Error guardando configuración")


@router.post("/sync/{pedido_id}")
async def sync_single_pedido(
    pedido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Sincronizar un pedido específico con Monday.com.
    Crea el item si no existe, o lo actualiza si ya está sincronizado.
    """
    try:
        result = await monday_pedidos_service.sync_pedido(pedido_id)
        
        if result:
            return {
                "success": True,
                "monday_item_id": result,
                "message": "Pedido sincronizado con Monday.com"
            }
        else:
            return {
                "success": False,
                "message": "No se pudo sincronizar. Verifica la configuración."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-all")
async def sync_all_pedidos(
    estado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Sincronizar todos los pedidos pendientes de sincronización.
    
    Parámetros:
    - estado: (Opcional) Solo sincronizar pedidos con este estado
    """
    try:
        result = await monday_pedidos_service.sync_all_pedidos(estado)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
