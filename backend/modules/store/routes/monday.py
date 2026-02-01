"""
Store Module - Monday.com Integration Routes
Endpoints para configurar y sincronizar pedidos con Monday.com
Soporta múltiples workspaces y tableros
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, List
from pydantic import BaseModel

from core.auth import get_admin_user, get_current_user
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
    # Configuración de subitems
    subitems_enabled: bool = False
    subitem_column_mapping: Dict[str, str] = {
        "nombre": "name",
        "cantidad": "numbers",
        "precio_unitario": "numbers0",
        "subtotal": "numbers1",
        "codigo": "text",
        "materia": "text0",
        "estado": "status"
    }


class SubitemsConfigRequest(BaseModel):
    """Configuración de subitems para productos"""
    subitems_enabled: bool = True
    subitem_column_mapping: Dict[str, str] = {
        "nombre": "name",
        "cantidad": "numbers",
        "precio_unitario": "numbers0",
        "subtotal": "numbers1",
        "codigo": "text",
        "materia": "text0",
        "estado": "status"
    }


class AddWorkspaceRequest(BaseModel):
    """Request para agregar un nuevo workspace"""
    api_key: str
    name: Optional[str] = None


class ApiKeyRequest(BaseModel):
    """Request para configurar API Key"""
    api_key: str


# ============== WORKSPACE MANAGEMENT ==============

@router.get("/workspaces")
async def get_workspaces(
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener lista de workspaces configurados.
    Cada workspace tiene su propia API Key.
    """
    result = await monday_pedidos_service.get_workspaces()
    return result


@router.post("/workspaces")
async def add_workspace(
    request: AddWorkspaceRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Agregar un nuevo workspace con su API Key.
    La API Key se valida conectándose a Monday.com.
    """
    result = await monday_pedidos_service.add_workspace(
        api_key=request.api_key,
        name=request.name
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result


@router.post("/workspaces/{workspace_id}/activate")
async def activate_workspace(
    workspace_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Establecer un workspace como el activo para las operaciones.
    """
    result = await monday_pedidos_service.set_active_workspace(workspace_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
    
    return {"success": True, "message": "Workspace activado"}


@router.delete("/workspaces/{workspace_id}")
async def remove_workspace(
    workspace_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Eliminar un workspace de la configuración.
    """
    result = await monday_pedidos_service.remove_workspace(workspace_id)
    
    if not result:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
    
    return {"success": True, "message": "Workspace eliminado"}


@router.post("/api-key")
async def set_api_key(
    request: ApiKeyRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Configurar o actualizar la API Key principal de Monday.com.
    Equivalente a agregar el primer workspace.
    """
    result = await monday_pedidos_service.add_workspace(
        api_key=request.api_key,
        name="Principal"
    )
    
    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])
    
    return {"success": True, "message": "API Key configurada"}


# ============== ENDPOINTS EXISTENTES ==============

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
    - subitems_enabled: Si debe crear subitems para cada producto
    - subitem_column_mapping: Mapeo de campos de productos a columnas de subitems
    """
    config = {
        "board_id": request.board_id,
        "group_id": request.group_id,
        "auto_sync": request.auto_sync,
        "column_mapping": request.column_mapping,
        "subitems_enabled": request.subitems_enabled,
        "subitem_column_mapping": request.subitem_column_mapping
    }
    
    success = await monday_pedidos_service.save_config(config)
    
    if success:
        return {"success": True, "message": "Configuración guardada"}
    else:
        raise HTTPException(status_code=500, detail="Error guardando configuración")


@router.put("/config/subitems")
async def update_subitems_config(
    request: SubitemsConfigRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Actualizar solo la configuración de subitems.
    Más conveniente para habilitar/deshabilitar subitems sin reconfigurar todo.
    """
    current_config = await monday_pedidos_service.get_config()
    
    current_config["subitems_enabled"] = request.subitems_enabled
    current_config["subitem_column_mapping"] = request.subitem_column_mapping
    
    success = await monday_pedidos_service.save_config(current_config)
    
    if success:
        return {
            "success": True,
            "message": "Configuración de subitems actualizada",
            "subitems_enabled": request.subitems_enabled
        }
    else:
        raise HTTPException(status_code=500, detail="Error guardando configuración")


@router.get("/subitems/{pedido_id}")
async def get_pedido_subitems(
    pedido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Obtener los subitems de un pedido desde Monday.com.
    """
    from core.database import db
    
    pedido = await db.pedidos_libros.find_one(
        {"pedido_id": pedido_id},
        {"monday_item_id": 1}
    )
    
    if not pedido or not pedido.get("monday_item_id"):
        return {"subitems": [], "message": "Pedido no sincronizado con Monday.com"}
    
    subitems = await monday_pedidos_service.get_subitems(pedido["monday_item_id"])
    
    return {
        "pedido_id": pedido_id,
        "monday_item_id": pedido["monday_item_id"],
        "subitems": subitems
    }


@router.post("/subitems/{pedido_id}/sync")
async def sync_pedido_subitems(
    pedido_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Sincronizar manualmente los subitems de un pedido.
    Útil para re-sincronizar si se agregaron productos después de la sync inicial.
    """
    from core.database import db
    
    pedido = await db.pedidos_libros.find_one(
        {"pedido_id": pedido_id},
        {"monday_item_id": 1, "items": 1}
    )
    
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    if not pedido.get("monday_item_id"):
        # Sincronizar primero el pedido principal
        monday_id = await monday_pedidos_service.sync_pedido(pedido_id)
        if not monday_id:
            raise HTTPException(status_code=400, detail="Error sincronizando pedido")
        pedido["monday_item_id"] = monday_id
    
    result = await monday_pedidos_service.sync_pedido_subitems(
        pedido_id,
        pedido["monday_item_id"],
        pedido.get("items", [])
    )
    
    return {
        "success": True,
        "pedido_id": pedido_id,
        **result
    }


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


# ============== CHAT / UPDATES ==============

class PostMessageRequest(BaseModel):
    """Request para enviar mensaje"""
    message: str
    author_name: Optional[str] = None


@router.post("/pedido/{pedido_id}/message")
async def post_pedido_message(
    pedido_id: str,
    request: PostMessageRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Enviar un mensaje en el chat del pedido.
    El mensaje se publica como Update en Monday.com.
    """
    from core.database import db
    
    # Verificar que el usuario tiene acceso al pedido
    pedido = await db.pedidos_libros.find_one({"pedido_id": pedido_id})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Solo el acudiente del pedido o admins pueden enviar mensajes
    is_owner = pedido.get("user_id") == current_user.get("user_id")
    is_admin = current_user.get("es_admin", False)
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para este pedido")
    
    author_name = request.author_name or current_user.get("nombre", "Usuario")
    
    result = await monday_pedidos_service.post_pedido_message(
        pedido_id=pedido_id,
        message=request.message,
        author_name=author_name,
        is_from_client=not is_admin  # Si es admin, es de Books de Light
    )
    
    if result.get("success"):
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Error enviando mensaje"))


@router.get("/pedido/{pedido_id}/messages")
async def get_pedido_messages(
    pedido_id: str,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener mensajes del chat del pedido.
    Los mensajes vienen de los Updates de Monday.com.
    """
    from core.database import db
    
    # Verificar que el usuario tiene acceso al pedido
    pedido = await db.pedidos_libros.find_one({"pedido_id": pedido_id})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    is_owner = pedido.get("user_id") == current_user.get("user_id")
    is_admin = current_user.get("es_admin", False)
    
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail="No tienes permiso para este pedido")
    
    messages = await monday_pedidos_service.get_pedido_messages(pedido_id, limit)
    
    return {
        "pedido_id": pedido_id,
        "monday_item_id": pedido.get("monday_item_id"),
        "messages": messages,
        "total": len(messages)
    }
