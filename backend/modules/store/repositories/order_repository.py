"""
Store Module - Order Repository
Acceso a datos de pedidos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db


class OrderRepository(BaseRepository):
    """
    Repository para pedidos de la tienda.
    """
    
    COLLECTION_NAME = "pedidos"
    ID_FIELD = "pedido_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, order_data: Dict) -> Dict:
        """Crear nuevo pedido"""
        if "pedido_id" not in order_data:
            order_data["pedido_id"] = f"ped_{uuid.uuid4().hex[:12]}"
        order_data["fecha_creacion"] = datetime.now(timezone.utc).isoformat()
        order_data["fecha_actualizacion"] = order_data["fecha_creacion"]
        return await self.insert_one(order_data)
    
    async def get_by_id(self, pedido_id: str) -> Optional[Dict]:
        """Obtener pedido por ID"""
        return await self.find_by_id(self.ID_FIELD, pedido_id)
    
    async def get_by_client(self, cliente_id: str, limit: int = 100) -> List[Dict]:
        """Obtener pedidos de un cliente"""
        return await self.find_many(
            query={"cliente_id": cliente_id},
            limit=limit,
            sort=[("fecha_creacion", -1)]
        )
    
    async def get_by_status(self, estado: str, limit: int = 500) -> List[Dict]:
        """Obtener pedidos por estado"""
        return await self.find_many(
            query={"estado": estado},
            limit=limit,
            sort=[("fecha_creacion", -1)]
        )
    
    async def get_all(self, estado: Optional[str] = None, limit: int = 500) -> List[Dict]:
        """Obtener todos los pedidos"""
        query = {}
        if estado:
            query["estado"] = estado
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("fecha_creacion", -1)]
        )
    
    async def update_order(self, pedido_id: str, data: Dict) -> bool:
        """Actualizar pedido"""
        data["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, pedido_id, data)
    
    async def update_status(self, pedido_id: str, estado: str) -> bool:
        """Actualizar estado del pedido"""
        return await self.update_order(pedido_id, {"estado": estado})
    
    async def confirm_payment(self, pedido_id: str) -> bool:
        """Confirmar pago del pedido"""
        return await self.update_order(pedido_id, {
            "pago_confirmado": True,
            "estado": "confirmado",
            "estado_pago": "pagado"
        })
    
    async def set_monday_item_id(self, pedido_id: str, monday_id: str) -> bool:
        """Establecer ID de Monday.com"""
        return await self.update_order(pedido_id, {"monday_item_id": monday_id})
    
    async def count_by_status(self) -> Dict[str, int]:
        """Contar pedidos por estado"""
        pipeline = [
            {"$group": {"_id": "$estado", "count": {"$sum": 1}}}
        ]
        results = await self.aggregate(pipeline)
        return {r["_id"]: r["count"] for r in results}
    
    async def get_total_sales(self, fecha_inicio: Optional[str] = None) -> float:
        """Obtener total de ventas"""
        query = {"pago_confirmado": True}
        if fecha_inicio:
            query["fecha_creacion"] = {"$gte": fecha_inicio}
        
        pipeline = [
            {"$match": query},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]
        results = await self.aggregate(pipeline)
        return results[0]["total"] if results else 0
