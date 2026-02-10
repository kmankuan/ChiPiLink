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
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "books"
    grade: Optional[str] = None
    grades: Optional[List[str]] = None
    subject: Optional[str] = None
    price: Optional[float] = 0
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
    category: Optional[str] = None
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
    
    book_id: str
    created_at: Optional[Any] = None


# ============== ORDER ITEM MODELS ==============

class OrderItem(BaseModel):
    """Order item model"""
    book_id: str
    book_name: str
    quantity: int
    unit_price: float
    
    @property
    def subtotal(self) -> float:
        return self.quantity * self.unit_price


# ============== ORDER MODELS ==============

class OrderBase(BaseModel):
    """Base order model"""
    items: List[OrderItem]
    payment_method: PaymentMethod
    notes: Optional[str] = None


class OrderCreate(OrderBase):
    """Order creation model (authenticated)"""
    student_id: str


class OrderPublicCreate(BaseModel):
    """Public order creation model (no auth required)"""
    # Guardian info
    guardian_name: str
    guardian_phone: str
    guardian_email: EmailStr
    # Student info
    student_name: str
    student_last_name: str
    student_grade: str
    student_email: Optional[EmailStr] = None
    student_phone: Optional[str] = None
    student_school: Optional[str] = None
    # Order info
    items: List[OrderItem]
    payment_method: str
    notes: Optional[str] = None


class Order(BaseModel):
    """Full order model"""
    model_config = ConfigDict(from_attributes=True)
    
    order_id: str
    user_id: Optional[str] = None
    student_id: Optional[str] = None
    student_name: str
    items: List[Dict]
    total: float
    subtotal: Optional[float] = None
    taxes: Optional[float] = 0
    discount: Optional[float] = 0
    payment_method: str
    status: OrderStatus = OrderStatus.PENDIENTE
    payment_status: PaymentStatus = PaymentStatus.PENDIENTE
    payment_confirmed: bool = False
    notes: Optional[str] = None
    monday_item_id: Optional[str] = None
    type: Optional[str] = None  # "public", "unatienda", etc.
    # Public order fields
    guardian_name: Optional[str] = None
    guardian_phone: Optional[str] = None
    guardian_email: Optional[str] = None
    # Timestamps
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None


# ============== STUDENT MODELS ==============

class StudentBase(BaseModel):
    """Base student model"""
    name: str
    last_name: str
    grade: str
    school: Optional[str] = None
    is_new: bool = True
    notes: Optional[str] = None


class StudentCreate(StudentBase):
    """Student creation model"""
    pass


class Student(StudentBase):
    """Full student model"""
    model_config = ConfigDict(from_attributes=True)
    
    student_id: str
    enrollment_status: str = "not_found"
    enrollment_sync_id: Optional[str] = None
    enrollment_similarity: Optional[float] = None
    enrollment_name: Optional[str] = None
    school_year: Optional[str] = None
    registration_date: Optional[Any] = None
    purchased_books: List[str] = []


# ============== CATEGORY MODELS ==============

class CategoryBase(BaseModel):
    """Base category model"""
    name: str
    icon: str = "📦"
    order: int = 99
    active: bool = True


class CategoryCreate(CategoryBase):
    """Category creation model"""
    category_id: Optional[str] = None


class Category(CategoryBase):
    """Full category model"""
    model_config = ConfigDict(from_attributes=True)
    
    category_id: str
    created_at: Optional[Any] = None


# ============== BANNER MODELS ==============

class BannerBase(BaseModel):
    """Base banner model"""
    category: str
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
    book_id: str
    name: str
    cantidad_actual: int
    umbral: int = 10
