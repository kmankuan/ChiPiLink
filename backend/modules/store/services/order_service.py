"""
Store Module - Order Service
Business logic para pedidos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.events import event_bus, Event, EventPriority, StoreEvents
from core.database import db
from ..repositories import OrderRepository, ProductRepository
from ..models import OrderCreate, OrderPublicCreate, Order, OrderStatus


class OrderService(BaseService):
    """
    Service for management of pedidos.
    """
    
    MODULE_NAME = "store"
    
    def __init__(self):
        super().__init__()
        self.repository = OrderRepository()
        self.product_repository = ProductRepository()
    
    async def create_order(
        self,
        data: OrderCreate,
        user_id: str,
        estudiante_info: Dict
    ) -> Order:
        """
        Crear pedido autenticado.
        Emite evento: store.order.created
        """
        # Validate y calcular total
        total = 0
        for item in data.items:
            product = await self.product_repository.get_by_id(item.libro_id)
            if not product:
                raise ValueError(f"Producto {item.libro_id} not found")
            if product.get("cantidad_inventario", 0) < item.cantidad:
                raise ValueError(f"Stock insuficiente para {product['nombre']}")
            total += item.cantidad * item.precio_unitario
        
        # Crear documento del pedido
        order_dict = {
            "user_id": user_id,
            "estudiante_id": data.estudiante_id,
            "estudiante_nombre": f"{estudiante_info['nombre']} {estudiante_info.get('apellido', '')}",
            "items": [item.model_dump() for item in data.items],
            "total": total,
            "metodo_pago": data.metodo_pago.value if hasattr(data.metodo_pago, 'value') else data.metodo_pago,
            "estado": "pendiente",
            "pago_confirmado": False,
            "notas": data.notas,
            "ano_escolar": estudiante_info.get("ano_escolar")
        }
        
        result = await self.repository.create(order_dict)
        
        # Decrement inventario
        for item in data.items:
            await self.product_repository.decrement_inventory(item.libro_id, item.cantidad)
        
        # Emitir evento
        await self.emit_event(
            StoreEvents.ORDER_CREATED,
            {
                "pedido_id": result["pedido_id"],
                "user_id": user_id,
                "total": total,
                "items_count": len(data.items)
            },
            priority=EventPriority.HIGH
        )
        
        self.log_info(f"Order created: {result['pedido_id']}")
        return Order(**result)
    
    async def create_public_order(self, data: OrderPublicCreate) -> Order:
        """
        Crear pedido público (sin autenticación).
        Emite evento: store.order.created
        """
        # Validate y calcular total
        total = 0
        items_validados = []
        
        for item in data.items:
            product = await self.product_repository.get_by_id(item.libro_id)
            if not product:
                raise ValueError(f"Producto {item.libro_id} not found")
            if product.get("cantidad_inventario", 0) < item.cantidad:
                raise ValueError(f"Stock insuficiente para {product['nombre']}")
            total += item.cantidad * item.precio_unitario
            items_validados.append(item.model_dump())
        
        nombre_completo = f"{data.nombre_estudiante} {data.apellido_estudiante}"
        
        order_dict = {
            "tipo": "publico",
            "user_id": None,
            "nombre_acudiente": data.nombre_acudiente,
            "telefono_acudiente": data.telefono_acudiente,
            "email_acudiente": data.email_acudiente,
            "estudiante_id": None,
            "estudiante_nombre": nombre_completo,
            "estudiante_primer_nombre": data.nombre_estudiante,
            "estudiante_apellido": data.apellido_estudiante,
            "grado_estudiante": data.grado_estudiante,
            "email_estudiante": data.email_estudiante,
            "telefono_estudiante": data.telefono_estudiante,
            "escuela_estudiante": data.escuela_estudiante,
            "items": items_validados,
            "total": total,
            "metodo_pago": data.metodo_pago,
            "estado": "pendiente",
            "pago_confirmado": False,
            "notas": data.notas
        }
        
        result = await self.repository.create(order_dict)
        
        # Decrement inventario
        for item in data.items:
            await self.product_repository.decrement_inventory(item.libro_id, item.cantidad)
        
        # Emitir evento
        await self.emit_event(
            StoreEvents.ORDER_CREATED,
            {
                "pedido_id": result["pedido_id"],
                "tipo": "publico",
                "total": total,
                "acudiente": data.nombre_acudiente
            },
            priority=EventPriority.HIGH
        )
        
        self.log_info(f"Public order created: {result['pedido_id']}")
        return Order(**result)
    
    async def get_order(self, pedido_id: str) -> Optional[Order]:
        """Get pedido by ID"""
        result = await self.repository.get_by_id(pedido_id)
        return Order(**result) if result else None
    
    async def get_client_orders(self, user_id: str) -> List[Order]:
        """Get pedidos de un cliente"""
        results = await self.repository.get_by_client(user_id)
        return [Order(**r) for r in results]
    
    async def get_all_orders(
        self,
        estado: Optional[str] = None,
        limit: int = 500
    ) -> List[Order]:
        """Get all orders (admin)"""
        results = await self.repository.get_all(estado, limit)
        return [Order(**r) for r in results]
    
    async def update_status(
        self,
        pedido_id: str,
        estado: OrderStatus
    ) -> Optional[Order]:
        """Update estado del pedido"""
        success = await self.repository.update_status(
            pedido_id,
            estado.value if hasattr(estado, 'value') else estado
        )
        
        if success:
            order = await self.get_order(pedido_id)
            
            # Emitir eventos según el estado
            if estado == OrderStatus.ENVIADO:
                await self.emit_event(
                    StoreEvents.ORDER_SHIPPED,
                    {"pedido_id": pedido_id}
                )
            elif estado == OrderStatus.ENTREGADO:
                await self.emit_event(
                    StoreEvents.ORDER_COMPLETED,
                    {"pedido_id": pedido_id}
                )
            elif estado == OrderStatus.CANCELADO:
                await self.emit_event(
                    StoreEvents.ORDER_CANCELLED,
                    {"pedido_id": pedido_id}
                )
            
            return order
        
        return None
    
    async def confirm_payment(self, pedido_id: str) -> Optional[Order]:
        """
        Confirmar pago del pedido.
        Emite evento: store.order.paid
        """
        success = await self.repository.confirm_payment(pedido_id)
        
        if success:
            await self.emit_event(
                StoreEvents.ORDER_PAID,
                {"pedido_id": pedido_id},
                priority=EventPriority.HIGH
            )
            return await self.get_order(pedido_id)
        
        return None
    
    async def set_monday_sync(self, pedido_id: str, monday_id: str) -> bool:
        """Establecer ID de Monday.com"""
        return await self.repository.set_monday_item_id(pedido_id, monday_id)
    
    async def get_stats(self) -> Dict:
        """Get estadísticas de pedidos"""
        by_status = await self.repository.count_by_status()
        total_sales = await self.repository.get_total_sales()
        
        return {
            "total_pedidos": sum(by_status.values()),
            "por_estado": by_status,
            "total_ventas": total_sales
        }


# Instancia singleton del servicio
order_service = OrderService()
