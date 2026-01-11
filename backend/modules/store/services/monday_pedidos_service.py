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
    
    async def _graphql_request(self, query: str) -> Dict:
        """Ejecutar query GraphQL a Monday.com"""
        if not MONDAY_API_KEY:
            raise Exception("Monday.com API Key no configurada. Configúrala en el .env como MONDAY_API_KEY")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.MONDAY_API_URL,
                json={"query": query},
                headers={
                    "Authorization": MONDAY_API_KEY,
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
    
    async def create_item(
        self,
        board_id: str,
        item_name: str,
        column_values: Dict,
        group_id: str = None
    ) -> Optional[str]:
        """Crear item en Monday.com"""
        column_values_json = json.dumps(column_values).replace('"', '\\"')
        
        group_part = f', group_id: "{group_id}"' if group_id else ''
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{item_name}"{group_part},
                column_values: "{column_values_json}"
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
        column_values_json = json.dumps(column_values).replace('"', '\\"')
        
        mutation = f'''
        mutation {{
            change_multiple_column_values (
                board_id: {board_id},
                item_id: {item_id},
                column_values: "{column_values_json}"
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
        
        if col_map.get("estado"):
            column_values[col_map["estado"]] = {
                "label": estado_map.get(pedido.get("estado"), "Pre-Orden")
            }
        
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
        
        col_map = config.get("column_mapping", {})
        estado_col = col_map.get("estado", "status")
        
        column_values = {
            estado_col: {"label": estado_map.get(nuevo_estado, "Pre-Orden")}
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


# Singleton
monday_pedidos_service = MondayPedidosService()
