"""
Store Module - Modelos de Pedidos de Libros Escolares
Sistema de pre-pedidos con restricciones por estudiante y año escolar
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class EstadoPedido(str, Enum):
    """Estados de un pedido"""
    borrador = "borrador"           # El acudiente está armando el pedido
    pre_orden = "pre_orden"         # Pre-orden registrada (esperando stock)
    confirmado = "confirmado"       # Confirmado, listo para procesar
    en_proceso = "en_proceso"       # En proceso de preparación
    listo_retiro = "listo_retiro"   # Listo para retiro
    entregado = "entregado"         # Entregado al acudiente
    cancelado = "cancelado"         # Cancelado


class EstadoItemPedido(str, Enum):
    """Estados de un item del pedido"""
    pendiente = "pendiente"         # Pendiente de stock
    disponible = "disponible"       # Stock disponible
    reservado = "reservado"         # Reservado para este pedido
    entregado = "entregado"         # Entregado
    cancelado = "cancelado"         # Cancelado


class TipoPedido(str, Enum):
    """Tipo de pedido"""
    pre_orden = "pre_orden"         # Pre-orden antes de compra a editorial
    orden_normal = "orden_normal"   # Orden normal con stock disponible
    recompra = "recompra"           # Recompra especial (libro perdido)


# ============== REQUEST MODELS ==============

class CrearPedidoRequest(BaseModel):
    """Request para crear un pedido"""
    estudiante_sync_id: str
    ano_escolar: str = Field(default="2025-2026")
    tipo: TipoPedido = TipoPedido.pre_orden


class AgregarItemRequest(BaseModel):
    """Request para agregar item al pedido"""
    libro_id: str
    cantidad: int = 1
    nota: Optional[str] = None


class ConfirmarPedidoRequest(BaseModel):
    """Request para confirmar pedido"""
    metodo_pago: Optional[str] = None  # Para futuro
    acepto_terminos: bool = True
    direccion_entrega: Optional[str] = None
    notas: Optional[str] = None


class SolicitudRecompraRequest(BaseModel):
    """Request para solicitud de recompra"""
    estudiante_sync_id: str
    libro_id: str
    motivo: str  # "perdido", "danado", etc.
    descripcion: Optional[str] = None


# ============== RESPONSE MODELS ==============

class LibroParaGrado(BaseModel):
    """Libro disponible para un grado"""
    libro_id: str
    codigo: str
    nombre: str
    precio: float
    editorial: Optional[str] = None
    materia: Optional[str] = None
    estado_disponibilidad: str = "disponible"
    ya_pedido: bool = False
    pedido_id: Optional[str] = None
    estado_pedido: Optional[str] = None


class VistaPreviewPedido(BaseModel):
    """Vista previa del pedido para un estudiante"""
    estudiante: Dict[str, Any]
    ano_escolar: str
    libros_requeridos: List[LibroParaGrado]
    libros_pendientes: List[LibroParaGrado]
    libros_ya_pedidos: List[LibroParaGrado]
    total_estimado: float
    total_pendiente: float
    puede_ordenar: bool
    mensaje: Optional[str] = None


class ItemPedidoResponse(BaseModel):
    """Item de un pedido"""
    item_id: str
    libro_id: str
    libro_nombre: str
    libro_codigo: str
    cantidad: int
    precio_unitario: float
    subtotal: float
    estado: EstadoItemPedido
    nota: Optional[str] = None


class PedidoResponse(BaseModel):
    """Respuesta de pedido"""
    pedido_id: str
    estudiante_sync_id: str
    estudiante_nombre: str
    estudiante_grado: str
    acudiente_cliente_id: str
    ano_escolar: str
    tipo: TipoPedido
    estado: EstadoPedido
    items: List[ItemPedidoResponse]
    subtotal: float
    descuento: float
    total: float
    fecha_creacion: str
    fecha_confirmacion: Optional[str] = None
    fecha_entrega: Optional[str] = None
    notas: Optional[str] = None


class DemandaAgregada(BaseModel):
    """Demanda agregada de un libro"""
    libro_id: str
    codigo: str
    nombre: str
    editorial: Optional[str] = None
    grados: List[str]
    cantidad_pre_ordenes: int
    cantidad_confirmados: int
    cantidad_total: int
    precio_unitario: float
    valor_total: float


class ResumenDemanda(BaseModel):
    """Resumen de demanda agregada"""
    ano_escolar: str
    fecha_corte: str
    total_pre_ordenes: int
    total_confirmados: int
    total_estudiantes: int
    valor_total_estimado: float
    libros: List[DemandaAgregada]
