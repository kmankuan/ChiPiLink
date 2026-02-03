"""
Store Module - Models/Schemas
Definition de schemas Pydantic para el module de tienda
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class OrderStatus(str, Enum):
    PENDIENTE = "pendiente"
    CONFIRMADO = "confirmado"
    PREPARANDO = "preparando"
    ENVIADO = "enviado"
    ENTREGADO = "entregado"
    CANCELADO = "cancelado"


class PaymentStatus(str, Enum):
    PENDIENTE = "pendiente"
    PAGADO = "pagado"
    RECHAZADO = "pago_rechazado"
    CANCELADO = "pago_cancelado"
    EXPIRADO = "pago_expirado"


class PaymentMethod(str, Enum):
    TRANSFERENCIA = "transferencia_bancaria"
    YAPPY = "yappy"
    EFECTIVO = "efectivo"


# ============== PRODUCT (LIBRO) MODELS ==============

class ProductBase(BaseModel):
    """Base product model"""
    name: str
    description: Optional[str] = None
    categoria: Optional[str] = "libros"
    grade: Optional[str] = None
    grades: Optional[List[str]] = None
    subject: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    inventory_quantity: int = 0
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    image_url: Optional[str] = None
    active: bool = True
    requires_preparation: bool = False
    featured: bool = False
    on_sale: bool = False
    featured_order: int = 0
    is_private_catalog: bool = False
    code: Optional[str] = None


class ProductCreate(ProductBase):
    """Product creation model"""
    pass


class ProductUpdate(BaseModel):
    """Product update model"""
    name: Optional[str] = None
    description: Optional[str] = None
    categoria: Optional[str] = None
    grade: Optional[str] = None
    grades: Optional[List[str]] = None
    subject: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    inventory_quantity: Optional[int] = None
    isbn: Optional[str] = None
    publisher: Optional[str] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None
    featured: Optional[bool] = None
    on_sale: Optional[bool] = None


class Product(ProductBase):
    """Full product model"""
    model_config = ConfigDict(from_attributes=True)
    
    libro_id: str
    created_at: Optional[Any] = None


# ============== ORDER ITEM MODELS ==============

class OrderItem(BaseModel):
    """Order item model"""
    libro_id: str
    nombre_libro: str
    cantidad: int
    precio_unitario: float
    
    @property
    def subtotal(self) -> float:
        return self.cantidad * self.price_unitario


# ============== ORDER MODELS ==============

class OrderBase(BaseModel):
    """Base order model"""
    items: List[OrderItem]
    metodo_pago: PaymentMethod
    notas: Optional[str] = None


class OrderCreate(OrderBase):
    """Order creation model (authenticated)"""
    estudiante_id: str


class OrderPublicCreate(BaseModel):
    """Public order creation model (no auth required)"""
    # Guardian info
    nombre_acudiente: str
    telefono_acudiente: str
    email_acudiente: EmailStr
    # Student info
    nombre_estudiante: str
    apellido_estudiante: str
    grado_estudiante: str
    email_estudiante: Optional[EmailStr] = None
    telefono_estudiante: Optional[str] = None
    escuela_estudiante: Optional[str] = None
    # Order info
    items: List[OrderItem]
    metodo_pago: str
    notas: Optional[str] = None


class Order(BaseModel):
    """Full order model"""
    model_config = ConfigDict(from_attributes=True)
    
    pedido_id: str
    user_id: Optional[str] = None
    estudiante_id: Optional[str] = None
    estudiante_name: str
    items: List[Dict]
    total: float
    subtotal: Optional[float] = None
    impuestos: Optional[float] = 0
    descuento: Optional[float] = 0
    metodo_pago: str
    estado: OrderStatus = OrderStatus.PENDIENTE
    estado_pago: PaymentStatus = PaymentStatus.PENDIENTE
    pago_confirmado: bool = False
    notas: Optional[str] = None
    monday_item_id: Optional[str] = None
    tipo: Optional[str] = None  # "publico", "unatienda", etc.
    # Public order fields
    nombre_acudiente: Optional[str] = None
    telefono_acudiente: Optional[str] = None
    email_acudiente: Optional[str] = None
    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== STUDENT MODELS ==============

class StudentBase(BaseModel):
    """Base student model"""
    name: str
    apellido: str
    grade: str
    escuela: Optional[str] = None
    es_nuevo: bool = True
    notas: Optional[str] = None


class StudentCreate(StudentBase):
    """Student creation model"""
    pass


class Student(StudentBase):
    """Full student model"""
    model_config = ConfigDict(from_attributes=True)
    
    estudiante_id: str
    estado_matricula: str = "no_encontrado"
    matricula_sync_id: Optional[str] = None
    similitud_matricula: Optional[float] = None
    nombre_matricula: Optional[str] = None
    ano_escolar: Optional[str] = None
    fecha_registro: Optional[Any] = None
    libros_comprados: List[str] = []


# ============== CATEGORY MODELS ==============

class CategoryBase(BaseModel):
    """Base category model"""
    name: str
    icono: str = "📦"
    orden: int = 99
    active: bool = True


class CategoryCreate(CategoryBase):
    """Category creation model"""
    categoria_id: Optional[str] = None


class Category(CategoryBase):
    """Full category model"""
    model_config = ConfigDict(from_attributes=True)
    
    categoria_id: str
    created_at: Optional[Any] = None


# ============== BANNER MODELS ==============

class BannerBase(BaseModel):
    """Base banner model"""
    categoria: str
    titulo: Optional[str] = None
    subtitulo: Optional[str] = None
    image_url: str
    link_url: Optional[str] = None
    active: bool = True
    orden: int = 0
    fecha_inicio: Optional[Any] = None
    fecha_fin: Optional[Any] = None


class BannerCreate(BannerBase):
    """Banner creation model"""
    pass


class Banner(BannerBase):
    """Full banner model"""
    model_config = ConfigDict(from_attributes=True)
    
    banner_id: str
    creado_por: Optional[str] = None
    created_at: Optional[Any] = None


# ============== INVENTORY MODELS ==============

class InventoryUpdate(BaseModel):
    """Inventory update model"""
    cantidad: int
    motivo: Optional[str] = None


class InventoryAlert(BaseModel):
    """Low stock alert model"""
    libro_id: str
    name: str
    cantidad_actual: int
    umbral: int = 10
