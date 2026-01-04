"""
Store Models - Products, orders, inventory models
"""
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from shared.utils import get_current_school_year


# ============== PRODUCT MODELS ==============

class LibroBase(BaseModel):
    """Base product model"""
    nombre: str
    descripcion: Optional[str] = None
    categoria: Optional[str] = "libros"  # Category (libros, snacks, bebidas, preparados, uniformes, servicios)
    grado: Optional[str] = None  # Grade level (only for books)
    grados: Optional[List[str]] = None  # Additional grades that use this book
    materia: Optional[str] = None  # Subject (only for books)
    precio: float
    precio_oferta: Optional[float] = None  # Sale price (if on promotion)
    cantidad_inventario: int = 0
    isbn: Optional[str] = None
    editorial: Optional[str] = None  # Publisher
    imagen_url: Optional[str] = None
    activo: bool = True
    requiere_preparacion: bool = False  # For prepared items (hotdogs, coffee, etc.)
    # Fields for category landing page
    destacado: bool = False  # Featured product
    en_promocion: bool = False  # On sale/promotion
    orden_destacado: int = 0  # Order for featured products display


class LibroCreate(LibroBase):
    """Product creation model"""
    pass


class Libro(LibroBase):
    """Full product model"""
    model_config = ConfigDict(extra="ignore")
    libro_id: str = Field(default_factory=lambda: f"libro_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ============== ORDER MODELS ==============

class ItemPedido(BaseModel):
    """Order item model"""
    libro_id: str
    nombre_libro: str
    cantidad: int
    precio_unitario: float
    
    @property
    def subtotal(self) -> float:
        return self.cantidad * self.precio_unitario


class PedidoCreate(BaseModel):
    """Order creation model (authenticated)"""
    estudiante_id: str
    items: List[ItemPedido]
    metodo_pago: str  # "transferencia_bancaria", "yappy"
    notas: Optional[str] = None


class Pedido(BaseModel):
    """Full order model"""
    model_config = ConfigDict(extra="ignore")
    pedido_id: str = Field(default_factory=lambda: f"ped_{uuid.uuid4().hex[:12]}")
    cliente_id: str
    estudiante_id: str
    estudiante_nombre: str
    items: List[ItemPedido]
    total: float
    metodo_pago: str
    estado: str = "pendiente"  # pendiente, confirmado, preparando, enviado, entregado, cancelado
    pago_confirmado: bool = False
    notas: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    monday_item_id: Optional[str] = None


class PedidoPublicoCreate(BaseModel):
    """Public order creation model (no auth required)"""
    # Guardian section
    nombre_acudiente: str
    telefono_acudiente: str
    email_acudiente: EmailStr
    
    # Student section
    nombre_estudiante: str
    apellido_estudiante: str
    grado_estudiante: str
    email_estudiante: Optional[EmailStr] = None
    telefono_estudiante: Optional[str] = None
    escuela_estudiante: Optional[str] = None
    
    # Order info
    items: List[ItemPedido]
    metodo_pago: str
    notas: Optional[str] = None


# ============== STUDENT MODELS ==============

class EstudianteBase(BaseModel):
    """Base student model"""
    nombre: str  # First name
    apellido: str  # Last name
    grado: str
    escuela: Optional[str] = None
    es_nuevo: bool = True  # True = new student, False = returning student
    notas: Optional[str] = None


class EstudianteCreate(EstudianteBase):
    """Student creation model"""
    pass


class Estudiante(EstudianteBase):
    """Full student model"""
    model_config = ConfigDict(extra="ignore")
    estudiante_id: str = Field(default_factory=lambda: f"est_{uuid.uuid4().hex[:12]}")
    # Status system: "encontrado" (green) or "no_encontrado" (red)
    estado_matricula: str = "no_encontrado"
    matricula_sync_id: Optional[str] = None  # Link to synced enrollment record
    similitud_matricula: Optional[float] = None  # Similarity percentage
    nombre_matricula: Optional[str] = None  # Name as found in enrollment DB
    ano_escolar: str = Field(default_factory=get_current_school_year)
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    libros_comprados: List[str] = []  # List of libro_ids already purchased this year


# ============== CATEGORY MODELS ==============

class CategoryBannerBase(BaseModel):
    """Category banner model"""
    categoria: str  # Category ID this banner belongs to
    titulo: Optional[str] = None
    subtitulo: Optional[str] = None
    imagen_url: str
    link_url: Optional[str] = None  # Optional link when clicked
    activo: bool = True
    orden: int = 0
    fecha_inicio: Optional[datetime] = None  # When to start showing
    fecha_fin: Optional[datetime] = None  # When to stop showing
    creado_por: Optional[str] = None  # "admin" or vendor_id


class CategoryBanner(CategoryBannerBase):
    """Full category banner model"""
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class VendorPermissions(BaseModel):
    """Vendor permissions model"""
    model_config = ConfigDict(extra="ignore")
    vendor_id: str
    puede_crear_banners: bool = False
    puede_destacar_productos: bool = False
    puede_crear_promociones: bool = False
    puede_publicar_noticias: bool = False
    max_banners: int = 3  # Maximum banners allowed
    max_productos_destacados: int = 5  # Maximum featured products
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
