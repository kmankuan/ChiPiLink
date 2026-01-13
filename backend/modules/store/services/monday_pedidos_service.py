"""
Store Module - Monday.com Integration Service
Sincroniza pedidos de libros con Monday.com
"""
from typing import Dict, Optional, List
import httpx
import json
import logging
from datetime import datetime, timezone

from core.config import MONDAY_API_KEY
from core.database import db

logger = logging.getLogger(__name__)


class MondayPedidosService:
    """
    Servicio para sincronizar pedidos de libros con Monday.com.
    Reutiliza la misma API Key configurada para PinpanClub.
    """
    
    MONDAY_API_URL = "https://api.monday.com/v2"
    CONFIG_KEY = "monday_pedidos_config"
    
    async def get_config(self) -> Dict:
        """Obtener configuración de Monday.com para pedidos"""
        config = await db.store_config.find_one({"key": self.CONFIG_KEY})
        if not config:
            return {
                "board_id": None,
                "auto_sync": False,
                "column_mapping": {
                    "estudiante": "text",
                    "grado": "text0",
                    "acudiente": "text4",
                    "libros": "long_text",
                    "total": "numbers",
                    "estado": "status",
                    "fecha": "date"
                },
                # Configuración de subitems para productos
                "subitems_enabled": False,
                "subitem_column_mapping": {
                    "nombre": "name",           # Nombre del producto (columna especial)
                    "cantidad": "numbers",       # Cantidad
                    "precio_unitario": "numbers0",  # Precio unitario
                    "subtotal": "numbers1",      # Subtotal
                    "codigo": "text",            # Código del producto
                    "materia": "text0",          # Materia/Categoría
                    "estado": "status"           # Estado del item
                }
            }
        return config.get("value", {})
    
    async def save_config(self, config: Dict) -> bool:
        """Guardar configuración de Monday.com para pedidos"""
        await db.store_config.update_one(
            {"key": self.CONFIG_KEY},
            {"$set": {"key": self.CONFIG_KEY, "value": config}},
            upsert=True
        )
        return True
    
    # ============== WORKSPACE MANAGEMENT ==============
    
    WORKSPACES_KEY = "monday_workspaces_config"
    
    async def get_workspaces(self) -> Dict:
        """Obtener configuración de workspaces"""
        config = await db.store_config.find_one({"key": self.WORKSPACES_KEY})
        if not config:
            # Si hay una API Key en el .env, crear un workspace por defecto
            if MONDAY_API_KEY:
                return {
                    "workspaces": [{
                        "workspace_id": "default",
                        "name": "Principal (ENV)",
                        "api_key_masked": f"...{MONDAY_API_KEY[-8:]}",
                        "boards_count": 0,
                        "is_env_key": True
                    }],
                    "active_workspace_id": "default"
                }
            return {
                "workspaces": [],
                "active_workspace_id": None
            }
        return config.get("value", {"workspaces": [], "active_workspace_id": None})
    
    async def add_workspace(self, api_key: str, name: str = None) -> Dict:
        """
        Agregar un nuevo workspace con su API Key.
        Valida la conexión antes de guardar.
        """
        # Validar API Key conectándose a Monday.com
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.MONDAY_API_URL,
                    json={"query": "query { me { name email } account { id name } }"},
                    headers={
                        "Authorization": api_key,
                        "Content-Type": "application/json",
                        "API-Version": "2024-01"
                    },
                    timeout=15.0
                )
                result = response.json()
                
                if "errors" in result:
                    return {"error": f"API Key inválida: {result['errors'][0].get('message', 'Error desconocido')}"}
                
                user_data = result.get("data", {}).get("me", {})
                account_data = result.get("data", {}).get("account", {})
                
                workspace_name = name or account_data.get("name", user_data.get("name", "Workspace"))
                workspace_id = f"ws_{account_data.get('id', datetime.now(timezone.utc).timestamp())}"
                
        except Exception as e:
            return {"error": f"Error conectando: {str(e)}"}
        
        # Obtener boards del workspace para el conteo
        boards_count = 0
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.MONDAY_API_URL,
                    json={"query": "query { boards(limit: 100) { id } }"},
                    headers={
                        "Authorization": api_key,
                        "Content-Type": "application/json",
                        "API-Version": "2024-01"
                    },
                    timeout=15.0
                )
                result = response.json()
                boards_count = len(result.get("data", {}).get("boards", []))
        except Exception:
            pass
        
        # Guardar workspace
        config = await self.get_workspaces()
        
        # Verificar si ya existe este workspace
        for ws in config.get("workspaces", []):
            if ws.get("workspace_id") == workspace_id or ws.get("api_key_masked") == f"...{api_key[-8:]}":
                return {"error": "Este workspace ya está configurado"}
        
        new_workspace = {
            "workspace_id": workspace_id,
            "name": workspace_name,
            "api_key": api_key,  # Se guarda encriptado en producción
            "api_key_masked": f"...{api_key[-8:]}",
            "boards_count": boards_count,
            "user_name": user_data.get("name"),
            "user_email": user_data.get("email"),
            "added_at": datetime.now(timezone.utc).isoformat()
        }
        
        workspaces = config.get("workspaces", [])
        # Remover workspace de ENV si existe
        workspaces = [ws for ws in workspaces if not ws.get("is_env_key")]
        workspaces.append(new_workspace)
        
        # Si es el primer workspace, activarlo
        active_id = config.get("active_workspace_id")
        if not active_id or active_id == "default":
            active_id = workspace_id
        
        await db.store_config.update_one(
            {"key": self.WORKSPACES_KEY},
            {"$set": {
                "key": self.WORKSPACES_KEY,
                "value": {
                    "workspaces": workspaces,
                    "active_workspace_id": active_id
                }
            }},
            upsert=True
        )
        
        return {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace_name,
            "boards_count": boards_count
        }
    
    async def set_active_workspace(self, workspace_id: str) -> bool:
        """Establecer workspace activo"""
        config = await self.get_workspaces()
        
        # Verificar que existe
        found = False
        for ws in config.get("workspaces", []):
            if ws.get("workspace_id") == workspace_id:
                found = True
                break
        
        if not found:
            return False
        
        config["active_workspace_id"] = workspace_id
        
        await db.store_config.update_one(
            {"key": self.WORKSPACES_KEY},
            {"$set": {"key": self.WORKSPACES_KEY, "value": config}},
            upsert=True
        )
        
        return True
    
    async def remove_workspace(self, workspace_id: str) -> bool:
        """Eliminar workspace"""
        config = await self.get_workspaces()
        
        workspaces = [ws for ws in config.get("workspaces", []) if ws.get("workspace_id") != workspace_id]
        
        if len(workspaces) == len(config.get("workspaces", [])):
            return False  # No se encontró
        
        # Si era el activo, limpiar o asignar otro
        if config.get("active_workspace_id") == workspace_id:
            config["active_workspace_id"] = workspaces[0]["workspace_id"] if workspaces else None
        
        config["workspaces"] = workspaces
        
        await db.store_config.update_one(
            {"key": self.WORKSPACES_KEY},
            {"$set": {"key": self.WORKSPACES_KEY, "value": config}},
            upsert=True
        )
        
        return True
    
    async def _get_active_api_key(self) -> Optional[str]:
        """Obtener la API Key del workspace activo"""
        config = await self.get_workspaces()
        active_id = config.get("active_workspace_id")
        
        if active_id == "default":
            return MONDAY_API_KEY
        
        for ws in config.get("workspaces", []):
            if ws.get("workspace_id") == active_id:
                return ws.get("api_key")
        
        # Fallback a ENV
        return MONDAY_API_KEY
    
    # ============== GRAPHQL ==============
    
    async def _graphql_request(self, query: str, api_key: str = None) -> Dict:
        """Ejecutar query GraphQL a Monday.com"""
        # Usar API Key proporcionada o obtener del workspace activo
        if not api_key:
            api_key = await self._get_active_api_key()
        
        if not api_key:
            raise Exception("Monday.com API Key no configurada. Agrega un workspace con tu API Key.")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.MONDAY_API_URL,
                json={"query": query},
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json",
                    "API-Version": "2024-01"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if "errors" in result:
                error_msg = result["errors"][0].get("message", "Error de Monday.com")
                logger.error(f"Monday.com API Error: {error_msg}")
                raise Exception(error_msg)
            
            return result
    
    async def test_connection(self) -> Dict:
        """Probar conexión con Monday.com"""
        try:
            query = '''
            query {
                me { name email }
                boards(limit: 5) { id name }
            }
            '''
            result = await self._graphql_request(query)
            return {
                "connected": True,
                "user": result.get("data", {}).get("me"),
                "sample_boards": result.get("data", {}).get("boards", [])
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }
    
    async def get_boards(self) -> List[Dict]:
        """Obtener lista de boards disponibles"""
        query = '''
        query {
            boards(limit: 50) {
                id
                name
                items_count
                columns { id title type }
                groups { id title }
            }
        }
        '''
        result = await self._graphql_request(query)
        return result.get("data", {}).get("boards", [])
    
    async def get_board_columns(self, board_id: str) -> List[Dict]:
        """Obtener columnas de un board específico"""
        query = f'''
        query {{
            boards(ids: [{board_id}]) {{
                columns {{
                    id
                    title
                    type
                }}
                groups {{
                    id
                    title
                }}
            }}
        }}
        '''
        result = await self._graphql_request(query)
        boards = result.get("data", {}).get("boards", [])
        if boards:
            return {
                "columns": boards[0].get("columns", []),
                "groups": boards[0].get("groups", [])
            }
        return {"columns": [], "groups": []}
    
    def _escape_for_graphql(self, value: str) -> str:
        """Escape string for use in GraphQL query"""
        # Escape backslashes first, then quotes, then newlines
        return value.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
    
    async def create_item(
        self,
        board_id: str,
        item_name: str,
        column_values: Dict,
        group_id: str = None
    ) -> Optional[str]:
        """Crear item en Monday.com"""
        # Properly escape JSON for GraphQL
        column_values_json = json.dumps(column_values, ensure_ascii=False)
        column_values_escaped = self._escape_for_graphql(column_values_json)
        item_name_escaped = self._escape_for_graphql(item_name)
        
        group_part = f', group_id: "{group_id}"' if group_id else ''
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{item_name_escaped}"{group_part},
                column_values: "{column_values_escaped}"
            ) {{
                id
                name
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            item = result.get("data", {}).get("create_item")
            return item.get("id") if item else None
        except Exception as e:
            logger.error(f"Error creating Monday item: {e}")
            return None
    
    async def update_item(
        self,
        board_id: str,
        item_id: str,
        column_values: Dict
    ) -> bool:
        """Actualizar item en Monday.com"""
        column_values_json = json.dumps(column_values, ensure_ascii=False)
        column_values_escaped = self._escape_for_graphql(column_values_json)
        
        mutation = f'''
        mutation {{
            change_multiple_column_values (
                board_id: {board_id},
                item_id: {item_id},
                column_values: "{column_values_escaped}"
            ) {{
                id
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            return result.get("data", {}).get("change_multiple_column_values") is not None
        except Exception as e:
            logger.error(f"Error updating Monday item: {e}")
            return False
    
    # ============== SUBITEMS ==============
    
    async def create_subitem(
        self,
        parent_item_id: str,
        subitem_name: str,
        column_values: Dict = None
    ) -> Optional[str]:
        """
        Crear un subitem en Monday.com asociado a un item padre.
        Usado para los productos/libros dentro de un pedido.
        """
        subitem_name_escaped = self._escape_for_graphql(subitem_name)
        
        # Construir la parte de column_values solo si hay valores
        column_values_part = ""
        if column_values:
            column_values_json = json.dumps(column_values, ensure_ascii=False)
            column_values_escaped = self._escape_for_graphql(column_values_json)
            column_values_part = f', column_values: "{column_values_escaped}"'
        
        mutation = f'''
        mutation {{
            create_subitem (
                parent_item_id: {parent_item_id},
                item_name: "{subitem_name_escaped}"{column_values_part}
            ) {{
                id
                name
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            subitem = result.get("data", {}).get("create_subitem")
            return subitem.get("id") if subitem else None
        except Exception as e:
            logger.error(f"Error creating Monday subitem: {e}")
            return None
    
    async def get_subitems(self, parent_item_id: str) -> List[Dict]:
        """Obtener subitems de un item"""
        query = f'''
        query {{
            items(ids: [{parent_item_id}]) {{
                subitems {{
                    id
                    name
                    column_values {{
                        id
                        text
                        value
                    }}
                }}
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(query)
            items = result.get("data", {}).get("items", [])
            if items:
                return items[0].get("subitems", [])
            return []
        except Exception as e:
            logger.error(f"Error getting subitems: {e}")
            return []
    
    async def delete_subitem(self, subitem_id: str) -> bool:
        """Eliminar un subitem"""
        mutation = f'''
        mutation {{
            delete_item (item_id: {subitem_id}) {{
                id
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            return result.get("data", {}).get("delete_item") is not None
        except Exception as e:
            logger.error(f"Error deleting subitem: {e}")
            return False
    
    async def sync_pedido_subitems(
        self,
        pedido_id: str,
        monday_item_id: str,
        items: List[Dict]
    ) -> Dict:
        """
        Sincronizar los items/productos de un pedido como subitems en Monday.com.
        
        Args:
            pedido_id: ID del pedido local
            monday_item_id: ID del item padre en Monday.com
            items: Lista de productos del pedido
            
        Returns:
            Dict con contadores de éxito/error
        """
        config = await self.get_config()
        
        if not config.get("subitems_enabled"):
            logger.info(f"Subitems deshabilitados para pedido {pedido_id}")
            return {"created": 0, "failed": 0, "skipped": True}
        
        subitem_col_map = config.get("subitem_column_mapping", {})
        
        # Obtener subitems existentes para evitar duplicados
        existing_subitems = await self.get_subitems(monday_item_id)
        existing_names = {si.get("name", "").lower() for si in existing_subitems}
        
        created = 0
        failed = 0
        subitem_ids = []
        
        for item in items:
            libro_nombre = item.get("libro_nombre", "Producto")
            
            # Verificar si ya existe (por nombre)
            if libro_nombre.lower() in existing_names:
                logger.info(f"Subitem '{libro_nombre}' ya existe, omitiendo")
                continue
            
            # Construir valores de columnas para el subitem
            column_values = {}
            
            if subitem_col_map.get("cantidad"):
                column_values[subitem_col_map["cantidad"]] = str(item.get("cantidad", 1))
            
            if subitem_col_map.get("precio_unitario"):
                column_values[subitem_col_map["precio_unitario"]] = str(item.get("precio_unitario", 0))
            
            if subitem_col_map.get("subtotal"):
                subtotal = item.get("cantidad", 1) * item.get("precio_unitario", 0)
                column_values[subitem_col_map["subtotal"]] = str(subtotal)
            
            if subitem_col_map.get("codigo"):
                column_values[subitem_col_map["codigo"]] = item.get("libro_codigo", "")
            
            if subitem_col_map.get("materia"):
                column_values[subitem_col_map["materia"]] = item.get("materia", "")
            
            if subitem_col_map.get("estado"):
                # Mapear estado del item
                estado_map = {
                    "pendiente": {"index": 0},
                    "disponible": {"index": 1},
                    "reservado": {"index": 0},
                    "entregado": {"index": 1},
                    "cancelado": {"index": 2}
                }
                estado = item.get("estado", "pendiente")
                column_values[subitem_col_map["estado"]] = estado_map.get(estado, {"index": 0})
            
            # Crear el subitem
            subitem_id = await self.create_subitem(
                monday_item_id,
                libro_nombre,
                column_values if column_values else None
            )
            
            if subitem_id:
                created += 1
                subitem_ids.append(subitem_id)
                logger.info(f"Subitem creado: {libro_nombre} (ID: {subitem_id})")
            else:
                failed += 1
                logger.error(f"Error creando subitem: {libro_nombre}")
        
        # Guardar IDs de subitems en el pedido
        if subitem_ids:
            await db.pedidos_libros.update_one(
                {"pedido_id": pedido_id},
                {"$set": {"monday_subitem_ids": subitem_ids}}
            )
        
        return {"created": created, "failed": failed, "skipped": False}
    
    async def sync_pedido(self, pedido_id: str) -> Optional[str]:
        """
        Sincronizar un pedido con Monday.com.
        Crea o actualiza el item según corresponda.
        """
        config = await self.get_config()
        
        if not config.get("board_id"):
            logger.warning("Monday.com board_id no configurado para pedidos")
            return None
        
        # Obtener pedido
        pedido = await db.pedidos_libros.find_one(
            {"pedido_id": pedido_id},
            {"_id": 0}
        )
        
        if not pedido:
            logger.warning(f"Pedido {pedido_id} no encontrado")
            return None
        
        # Obtener acudiente
        acudiente = await db.auth_users.find_one(
            {"cliente_id": pedido.get("acudiente_cliente_id")},
            {"nombre": 1, "email": 1}
        )
        acudiente_nombre = acudiente.get("nombre", "") if acudiente else ""
        acudiente_email = acudiente.get("email", "") if acudiente else ""
        
        # Preparar lista de libros
        libros_texto = "\n".join([
            f"• {item.get('libro_nombre', '')} (${item.get('precio_unitario', 0):.2f})"
            for item in pedido.get("items", [])
        ])
        
        # Mapear estado
        estado_map = {
            "borrador": "Borrador",
            "pre_orden": "Pre-Orden",
            "confirmado": "Confirmado",
            "en_proceso": "En Proceso",
            "listo_retiro": "Listo para Retiro",
            "entregado": "Entregado",
            "cancelado": "Cancelado"
        }
        
        # Construir nombre del item
        item_name = f"{pedido.get('estudiante_nombre', 'Estudiante')} - {pedido.get('estudiante_grado', '')}"
        
        # Obtener mapeo de columnas
        col_map = config.get("column_mapping", {})
        
        # Construir valores de columnas
        column_values = {}
        
        if col_map.get("estudiante"):
            column_values[col_map["estudiante"]] = pedido.get("estudiante_nombre", "")
        
        if col_map.get("grado"):
            column_values[col_map["grado"]] = pedido.get("estudiante_grado", "")
        
        if col_map.get("acudiente"):
            column_values[col_map["acudiente"]] = f"{acudiente_nombre} ({acudiente_email})"
        
        if col_map.get("libros"):
            column_values[col_map["libros"]] = libros_texto
        
        if col_map.get("total"):
            column_values[col_map["total"]] = pedido.get("total", 0)
        
        # Estado: solo agregar si el board tiene mapeo correcto de estados
        # Si el board usa índices en lugar de labels, usar índices
        if col_map.get("estado"):
            estado_label = estado_map.get(pedido.get("estado"), "Pre-Orden")
            # Intentar mapear a índices comunes si el board no tiene labels personalizados
            estado_index_map = {
                "Borrador": 0,       # Working on it
                "Pre-Orden": 0,      # Working on it
                "Confirmado": 1,     # Done
                "En Proceso": 0,     # Working on it
                "Listo para Retiro": 1,  # Done
                "Entregado": 1,      # Done
                "Cancelado": 2       # Stuck
            }
            # Usar índice si existe
            if estado_label in estado_index_map:
                column_values[col_map["estado"]] = {"index": estado_index_map[estado_label]}
        
        if col_map.get("fecha"):
            fecha = pedido.get("fecha_creacion", "")
            if fecha:
                try:
                    dt = datetime.fromisoformat(fecha.replace('Z', '+00:00'))
                    column_values[col_map["fecha"]] = {"date": dt.strftime("%Y-%m-%d")}
                except:
                    pass
        
        if col_map.get("pedido_id"):
            column_values[col_map["pedido_id"]] = pedido_id
        
        board_id = config["board_id"]
        monday_item_id = pedido.get("monday_item_id")
        
        if monday_item_id:
            # Actualizar existente
            success = await self.update_item(board_id, monday_item_id, column_values)
            if success:
                logger.info(f"Pedido {pedido_id} actualizado en Monday.com (item {monday_item_id})")
                
                # Sincronizar subitems si está habilitado
                if config.get("subitems_enabled") and pedido.get("items"):
                    subitem_result = await self.sync_pedido_subitems(
                        pedido_id,
                        monday_item_id,
                        pedido.get("items", [])
                    )
                    logger.info(f"Subitems sincronizados: {subitem_result}")
            
            return monday_item_id if success else None
        else:
            # Crear nuevo
            new_item_id = await self.create_item(
                board_id,
                item_name,
                column_values,
                config.get("group_id")
            )
            
            if new_item_id:
                # Guardar referencia en el pedido
                await db.pedidos_libros.update_one(
                    {"pedido_id": pedido_id},
                    {"$set": {"monday_item_id": new_item_id}}
                )
                logger.info(f"Pedido {pedido_id} creado en Monday.com (item {new_item_id})")
                
                # Sincronizar subitems si está habilitado
                if config.get("subitems_enabled") and pedido.get("items"):
                    subitem_result = await self.sync_pedido_subitems(
                        pedido_id,
                        new_item_id,
                        pedido.get("items", [])
                    )
                    logger.info(f"Subitems sincronizados: {subitem_result}")
            
            return new_item_id
    
    async def sync_estado_pedido(self, pedido_id: str, nuevo_estado: str) -> bool:
        """
        Actualizar solo el estado de un pedido en Monday.com.
        Más eficiente que sync_pedido completo.
        """
        config = await self.get_config()
        
        if not config.get("board_id"):
            return False
        
        pedido = await db.pedidos_libros.find_one(
            {"pedido_id": pedido_id},
            {"monday_item_id": 1}
        )
        
        if not pedido or not pedido.get("monday_item_id"):
            # Si no tiene monday_item_id, sincronizar completo
            return await self.sync_pedido(pedido_id) is not None
        
        estado_map = {
            "borrador": "Borrador",
            "pre_orden": "Pre-Orden",
            "confirmado": "Confirmado",
            "en_proceso": "En Proceso",
            "listo_retiro": "Listo para Retiro",
            "entregado": "Entregado",
            "cancelado": "Cancelado"
        }
        
        # Mapeo a índices para boards genéricos
        estado_index_map = {
            "Borrador": 0,       # Working on it
            "Pre-Orden": 0,      # Working on it
            "Confirmado": 1,     # Done
            "En Proceso": 0,     # Working on it
            "Listo para Retiro": 1,  # Done
            "Entregado": 1,      # Done
            "Cancelado": 2       # Stuck
        }
        
        col_map = config.get("column_mapping", {})
        estado_col = col_map.get("estado", "status")
        estado_label = estado_map.get(nuevo_estado, "Pre-Orden")
        
        column_values = {
            estado_col: {"index": estado_index_map.get(estado_label, 0)}
        }
        
        return await self.update_item(
            config["board_id"],
            pedido["monday_item_id"],
            column_values
        )
    
    async def sync_all_pedidos(self, estado: str = None) -> Dict:
        """Sincronizar todos los pedidos pendientes de sync"""
        config = await self.get_config()
        
        if not config.get("board_id"):
            return {"error": "Board ID no configurado", "synced": 0, "failed": 0}
        
        query = {"monday_item_id": {"$exists": False}}
        if estado:
            query["estado"] = estado
        
        pedidos = await db.pedidos_libros.find(query, {"pedido_id": 1}).to_list(100)
        
        synced = 0
        failed = 0
        
        for pedido in pedidos:
            try:
                result = await self.sync_pedido(pedido["pedido_id"])
                if result:
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Error syncing pedido {pedido['pedido_id']}: {e}")
                failed += 1
        
        return {"synced": synced, "failed": failed}
    
    # ============== UPDATES (CHAT) ==============
    
    async def post_update(
        self,
        item_id: str,
        body: str,
        author_name: str = None
    ) -> Optional[str]:
        """
        Publicar un update (mensaje) en un item de Monday.com.
        Esto aparece en la sección de Updates del item.
        """
        # Escapar comillas en el mensaje
        body_escaped = body.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        
        # Si hay nombre de autor, agregarlo al inicio del mensaje
        if author_name:
            body_escaped = f"**{author_name}:**\\n{body_escaped}"
        
        mutation = f'''
        mutation {{
            create_update (
                item_id: {item_id},
                body: "{body_escaped}"
            ) {{
                id
                created_at
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            update = result.get("data", {}).get("create_update")
            return update.get("id") if update else None
        except Exception as e:
            logger.error(f"Error posting Monday update: {e}")
            return None
    
    async def get_updates(
        self,
        item_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """
        Obtener updates (mensajes) de un item de Monday.com.
        """
        query = f'''
        query {{
            items(ids: [{item_id}]) {{
                updates(limit: {limit}) {{
                    id
                    body
                    text_body
                    created_at
                    creator {{
                        id
                        name
                        email
                        photo_thumb
                    }}
                    replies {{
                        id
                        body
                        text_body
                        created_at
                        creator {{
                            id
                            name
                            email
                            photo_thumb
                        }}
                    }}
                }}
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(query)
            items = result.get("data", {}).get("items", [])
            if items:
                return items[0].get("updates", [])
            return []
        except Exception as e:
            logger.error(f"Error getting Monday updates: {e}")
            return []
    
    async def reply_to_update(
        self,
        update_id: str,
        body: str,
        author_name: str = None
    ) -> Optional[str]:
        """
        Responder a un update específico.
        """
        body_escaped = body.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        
        if author_name:
            body_escaped = f"**{author_name}:**\\n{body_escaped}"
        
        mutation = f'''
        mutation {{
            create_update (
                update_id: {update_id},
                body: "{body_escaped}"
            ) {{
                id
                created_at
            }}
        }}
        '''
        
        try:
            result = await self._graphql_request(mutation)
            update = result.get("data", {}).get("create_update")
            return update.get("id") if update else None
        except Exception as e:
            logger.error(f"Error replying to Monday update: {e}")
            return None
    
    async def post_pedido_message(
        self,
        pedido_id: str,
        message: str,
        author_name: str,
        is_from_client: bool = True
    ) -> Dict:
        """
        Publicar un mensaje en el pedido (vía Monday.com Updates).
        
        Args:
            pedido_id: ID del pedido en ChipiLink
            message: Texto del mensaje
            author_name: Nombre del autor
            is_from_client: Si es del cliente/acudiente (True) o de Books de Light (False)
        """
        pedido = await db.pedidos_libros.find_one(
            {"pedido_id": pedido_id},
            {"monday_item_id": 1}
        )
        
        if not pedido:
            return {"success": False, "error": "Pedido no encontrado"}
        
        monday_item_id = pedido.get("monday_item_id")
        
        if not monday_item_id:
            # Si no está sincronizado con Monday, sincronizar primero
            monday_item_id = await self.sync_pedido(pedido_id)
            if not monday_item_id:
                return {"success": False, "error": "No se pudo sincronizar con Monday.com"}
        
        # Agregar etiqueta de origen
        prefix = "🏠 Cliente" if is_from_client else "📚 Books de Light"
        formatted_message = f"[{prefix}]\n{message}"
        
        update_id = await self.post_update(
            monday_item_id,
            formatted_message,
            author_name
        )
        
        if update_id:
            # Guardar copia local del mensaje
            from datetime import datetime, timezone
            import uuid
            
            local_message = {
                "message_id": f"msg_{uuid.uuid4().hex[:12]}",
                "pedido_id": pedido_id,
                "monday_update_id": update_id,
                "monday_item_id": monday_item_id,
                "author_name": author_name,
                "message": message,
                "is_from_client": is_from_client,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.pedido_messages.insert_one(local_message)
            
            return {"success": True, "update_id": update_id}
        
        return {"success": False, "error": "Error publicando mensaje"}
    
    async def get_pedido_messages(
        self,
        pedido_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """
        Obtener mensajes de un pedido desde Monday.com.
        """
        pedido = await db.pedidos_libros.find_one(
            {"pedido_id": pedido_id},
            {"monday_item_id": 1}
        )
        
        if not pedido or not pedido.get("monday_item_id"):
            return []
        
        updates = await self.get_updates(pedido["monday_item_id"], limit)
        
        # Formatear para el frontend
        messages = []
        for update in updates:
            creator = update.get("creator", {})
            
            # Detectar si es del cliente o de Books de Light
            body = update.get("text_body", "") or update.get("body", "")
            body_lower = body.lower()
            # Detectar cliente por marcadores de texto
            is_from_client = (
                "cliente]" in body_lower or
                "[cliente]" in body_lower or
                "🏠" in body
            )
            
            # Limpiar el prefijo del mensaje
            clean_body = body
            prefixes_to_remove = [
                "[🏠 Cliente]\n", "[📚 Books de Light]\n", 
                "[🏠 Cliente]", "[📚 Books de Light]",
                "[Cliente]\n", "[Books de Light]\n",
                "[Cliente]", "[Books de Light]"
            ]
            for prefix in prefixes_to_remove:
                clean_body = clean_body.replace(prefix, "")
            
            # También limpiar el formato de autor al inicio
            if clean_body.startswith("**") and ":**\n" in clean_body:
                idx = clean_body.find(":**\n")
                if idx > 0 and idx < 50:  # Nombre de autor no debería ser muy largo
                    clean_body = clean_body[idx + 4:]
            
            messages.append({
                "id": update.get("id"),
                "body": clean_body.strip(),
                "raw_body": body,
                "created_at": update.get("created_at"),
                "is_from_client": is_from_client,
                "author": {
                    "id": creator.get("id"),
                    "name": creator.get("name", ""),
                    "email": creator.get("email", ""),
                    "photo": creator.get("photo_thumb")
                },
                "replies": [
                    {
                        "id": reply.get("id"),
                        "body": reply.get("text_body", "") or reply.get("body", ""),
                        "created_at": reply.get("created_at"),
                        "author": {
                            "name": reply.get("creator", {}).get("name", ""),
                            "photo": reply.get("creator", {}).get("photo_thumb")
                        }
                    }
                    for reply in update.get("replies", [])
                ]
            })
        
        return messages


# Singleton
monday_pedidos_service = MondayPedidosService()
