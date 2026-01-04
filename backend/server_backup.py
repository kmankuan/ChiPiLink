from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'libros-textbook-store-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Monday.com Configuration
MONDAY_API_KEY = os.environ.get('MONDAY_API_KEY', '')
# Board ID will be loaded from database, fallback to env
MONDAY_BOARD_ID_ENV = os.environ.get('MONDAY_BOARD_ID', '')

# Helper to get Monday Board ID from DB or env
async def get_monday_board_id():
    """Get Monday Board ID from database or fallback to env"""
    config = await db.app_config.find_one({"config_key": "monday_board_id"})
    if config and config.get("value"):
        return config["value"]
    return MONDAY_BOARD_ID_ENV

app = FastAPI(title="Plataforma E-Commerce API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class LibroBase(BaseModel):
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
    # New fields for category landing page
    destacado: bool = False  # Featured product
    en_promocion: bool = False  # On sale/promotion
    orden_destacado: int = 0  # Order for featured products display

class LibroCreate(LibroBase):
    pass

class Libro(LibroBase):
    model_config = ConfigDict(extra="ignore")
    libro_id: str = Field(default_factory=lambda: f"libro_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Category Banner Model
class CategoryBannerBase(BaseModel):
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
    model_config = ConfigDict(extra="ignore")
    banner_id: str = Field(default_factory=lambda: f"banner_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Vendor Permissions Model
class VendorPermissions(BaseModel):
    model_config = ConfigDict(extra="ignore")
    vendor_id: str
    puede_crear_banners: bool = False
    puede_destacar_productos: bool = False
    puede_crear_promociones: bool = False
    puede_publicar_noticias: bool = False
    max_banners: int = 3  # Maximum banners allowed
    max_productos_destacados: int = 5  # Maximum featured products
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== COMMUNITY CONTENT MODELS ==============

class CommunityPostBase(BaseModel):
    """Model for community posts (news, announcements, events)"""
    tipo: str  # "noticia", "anuncio", "evento"
    titulo: str
    contenido: str  # Rich text content
    resumen: Optional[str] = None  # Short summary for cards
    imagen_url: Optional[str] = None
    imagen_galeria: Optional[List[str]] = None  # Multiple images
    video_url: Optional[str] = None
    # Event specific fields
    fecha_evento: Optional[datetime] = None
    lugar_evento: Optional[str] = None
    # Publishing
    publicado: bool = False
    destacado: bool = False  # Show in hero/featured section
    orden: int = 0
    fecha_publicacion: Optional[datetime] = None
    fecha_expiracion: Optional[datetime] = None
    # Metadata
    tags: Optional[List[str]] = None
    categoria: Optional[str] = None  # Category for filtering
    # Engagement
    permite_comentarios: bool = True
    # Source tracking
    fuente: Optional[str] = None  # "admin", "monday", "telegram"
    fuente_id: Optional[str] = None  # External ID reference

class CommunityPost(CommunityPostBase):
    model_config = ConfigDict(extra="ignore")
    post_id: str = Field(default_factory=lambda: f"post_{uuid.uuid4().hex[:12]}")
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    creado_por: Optional[str] = None
    vistas: int = 0
    likes: int = 0

class CommunityComment(BaseModel):
    """Model for comments on community posts"""
    model_config = ConfigDict(extra="ignore")
    comment_id: str = Field(default_factory=lambda: f"comment_{uuid.uuid4().hex[:12]}")
    post_id: str
    usuario_id: Optional[str] = None
    nombre_usuario: str
    contenido: str
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    aprobado: bool = True  # For moderation
    likes: int = 0

class GalleryAlbum(BaseModel):
    """Model for photo/video gallery albums"""
    model_config = ConfigDict(extra="ignore")
    album_id: str = Field(default_factory=lambda: f"album_{uuid.uuid4().hex[:12]}")
    titulo: str
    descripcion: Optional[str] = None
    # Google Photos integration
    google_photos_url: Optional[str] = None  # Shared album URL
    google_photos_album_id: Optional[str] = None
    # Manual photos
    fotos: Optional[List[dict]] = None  # [{url, caption, fecha}]
    # Display
    imagen_portada: Optional[str] = None
    orden: int = 0
    activo: bool = True
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommunityEvent(BaseModel):
    """Model for community events (tournaments, meetings, etc.)"""
    model_config = ConfigDict(extra="ignore")
    evento_id: str = Field(default_factory=lambda: f"evento_{uuid.uuid4().hex[:12]}")
    titulo: str
    descripcion: Optional[str] = None
    tipo: str  # "torneo", "reunion", "social", "otro"
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    lugar: Optional[str] = None
    imagen_url: Optional[str] = None
    # Registration
    requiere_inscripcion: bool = False
    max_participantes: Optional[int] = None
    inscripciones: Optional[List[dict]] = None  # [{usuario_id, nombre, fecha}]
    # Status
    estado: str = "programado"  # "programado", "en_curso", "finalizado", "cancelado"
    destacado: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Current school year helper
def get_current_school_year() -> str:
    now = datetime.now()
    # School year starts in February/March typically
    if now.month >= 2:
        return f"{now.year}-{now.year + 1}"
    return f"{now.year - 1}-{now.year}"

# Similarity calculation using SequenceMatcher
from difflib import SequenceMatcher

def calcular_similitud(texto1: str, texto2: str) -> float:
    """Calculate similarity ratio between two strings (0.0 to 1.0)"""
    if not texto1 or not texto2:
        return 0.0
    # Normalize: lowercase and strip whitespace
    t1 = texto1.lower().strip()
    t2 = texto2.lower().strip()
    return SequenceMatcher(None, t1, t2).ratio()

def buscar_estudiante_en_matriculas(nombre: str, apellido: str, grado: str, db_sync_estudiantes: list) -> dict:
    """
    Search for a student in the synced enrollment database.
    Returns match info if similarity >= 90%, otherwise None.
    """
    nombre_completo = f"{nombre} {apellido}".lower().strip()
    mejor_coincidencia = None
    mejor_similitud = 0.0
    
    for est_sync in db_sync_estudiantes:
        datos = est_sync.get("datos", {})
        
        # Try to find name fields in the synced data
        sync_nombre = ""
        sync_apellido = ""
        sync_grado = ""
        
        # Look for mapped or common field names
        for key, value in datos.items():
            key_lower = key.lower()
            value_str = str(value).strip() if value else ""
            
            if "nombre" in key_lower and "apellido" not in key_lower:
                sync_nombre = value_str
            elif "apellido" in key_lower:
                sync_apellido = value_str
            elif "grado" in key_lower or "grade" in key_lower or "class" in key_lower:
                sync_grado = value_str
            # Also check for full name field
            elif "student" in key_lower and "name" in key_lower:
                # Could be full name, split it
                parts = value_str.split()
                if len(parts) >= 2:
                    sync_nombre = parts[0]
                    sync_apellido = " ".join(parts[1:])
                else:
                    sync_nombre = value_str
        
        # Calculate similarity
        sync_nombre_completo = f"{sync_nombre} {sync_apellido}".lower().strip()
        
        # Compare full names
        similitud_nombre = calcular_similitud(nombre_completo, sync_nombre_completo)
        
        # Also compare individual fields
        similitud_nombre_ind = calcular_similitud(nombre, sync_nombre)
        similitud_apellido = calcular_similitud(apellido, sync_apellido)
        
        # Use the best approach
        similitud_combinada = max(
            similitud_nombre,
            (similitud_nombre_ind + similitud_apellido) / 2
        )
        
        # Check grade match (more flexible)
        grado_match = False
        if sync_grado:
            # Normalize grades for comparison (handle "4", "4to", "4to Grado", etc.)
            grado_norm = grado.lower().replace("grado", "").replace("°", "").strip()
            sync_grado_norm = sync_grado.lower().replace("grado", "").replace("°", "").replace("th", "").replace("st", "").replace("nd", "").replace("rd", "").strip()
            
            # Try numeric comparison
            try:
                if grado_norm.isdigit() and sync_grado_norm.isdigit():
                    grado_match = grado_norm == sync_grado_norm
                else:
                    grado_match = calcular_similitud(grado_norm, sync_grado_norm) >= 0.8
            except:
                grado_match = calcular_similitud(grado, sync_grado) >= 0.8
        
        # Calculate final score (name similarity is most important, grade is secondary)
        # If grade doesn't match, reduce the score significantly
        if grado_match:
            score_final = similitud_combinada
        else:
            score_final = similitud_combinada * 0.5  # Penalize if grade doesn't match
        
        if score_final > mejor_similitud:
            mejor_similitud = score_final
            mejor_coincidencia = {
                "sync_id": est_sync.get("sync_id"),
                "datos": datos,
                "similitud": round(score_final * 100, 1),
                "nombre_encontrado": sync_nombre_completo,
                "grado_encontrado": sync_grado,
                "grado_match": grado_match
            }
    
    # Return match if >= 90% similarity
    if mejor_similitud >= 0.9:
        return mejor_coincidencia
    
    return None

class EstudianteBase(BaseModel):
    nombre: str  # First name
    apellido: str  # Last name
    grado: str
    escuela: Optional[str] = None
    es_nuevo: bool = True  # True = estudiante nuevo, False = cursado del año pasado
    notas: Optional[str] = None

class EstudianteCreate(EstudianteBase):
    pass  # No more document upload needed

class Estudiante(EstudianteBase):
    model_config = ConfigDict(extra="ignore")
    estudiante_id: str = Field(default_factory=lambda: f"est_{uuid.uuid4().hex[:12]}")
    # New status system: "encontrado" (green) or "no_encontrado" (red)
    estado_matricula: str = "no_encontrado"
    matricula_sync_id: Optional[str] = None  # Link to synced enrollment record
    similitud_matricula: Optional[float] = None  # Similarity percentage
    nombre_matricula: Optional[str] = None  # Name as found in enrollment DB
    ano_escolar: str = Field(default_factory=get_current_school_year)
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    libros_comprados: List[str] = []  # List of libro_ids already purchased this year

class ClienteBase(BaseModel):
    email: EmailStr
    nombre: str
    telefono: Optional[str] = None
    direccion: Optional[str] = None

class ClienteCreate(ClienteBase):
    contrasena: str

class Cliente(ClienteBase):
    model_config = ConfigDict(extra="ignore")
    cliente_id: str = Field(default_factory=lambda: f"cli_{uuid.uuid4().hex[:12]}")
    estudiantes: List[Estudiante] = []
    es_admin: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    google_id: Optional[str] = None

# ============== PAGE BUILDER MODELS ==============

class BloquePagina(BaseModel):
    """Block for page builder"""
    bloque_id: str = Field(default_factory=lambda: f"blk_{uuid.uuid4().hex[:8]}")
    tipo: str  # hero, features, text, image, cta, stats, cards, banner, testimonials
    orden: int = 0
    activo: bool = True
    publicado: bool = True  # True = visible para todos, False = solo visible para admin (en construcción)
    config: dict = {}  # Block-specific configuration

class ConfiguracionSitio(BaseModel):
    """Global site configuration"""
    nombre_sitio: str = "Mi Tienda"
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    descripcion: str = "Plataforma de comercio electrónico"
    color_primario: str = "#16a34a"
    color_secundario: str = "#0f766e"
    email_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    direccion: Optional[str] = None
    redes_sociales: dict = {}  # {facebook: url, instagram: url, etc}
    footer_texto: str = "© 2025 Todos los derechos reservados"

class PaginaBuilder(BaseModel):
    """Page configuration with blocks"""
    pagina_id: str = "landing"  # landing, about, contact, etc.
    titulo: str = "Página Principal"
    bloques: List[BloquePagina] = []
    publicada: bool = True
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Default block templates
BLOCK_TEMPLATES = {
    "hero": {
        "nombre": "Hero Principal",
        "descripcion": "Sección principal con imagen de fondo",
        "config_default": {
            "titulo": "Bienvenido a nuestra tienda",
            "subtitulo": "Encuentra todo lo que necesitas en un solo lugar",
            "imagen_url": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200",
            "boton_texto": "Comenzar",
            "boton_url": "/registro",
            "boton_secundario_texto": "",
            "boton_secundario_url": "",
            "overlay_color": "rgba(0,0,0,0.5)",
            "altura": "500px"
        }
    },
    "features": {
        "nombre": "Características",
        "descripcion": "Lista de características con íconos",
        "config_default": {
            "titulo": "¿Por qué elegirnos?",
            "subtitulo": "",
            "items": [
                {"icono": "shield", "titulo": "Seguro", "descripcion": "Compras 100% seguras"},
                {"icono": "truck", "titulo": "Envío Rápido", "descripcion": "Entrega en 24-48h"},
                {"icono": "headphones", "titulo": "Soporte", "descripcion": "Atención personalizada"}
            ],
            "columnas": 3
        }
    },
    "text": {
        "nombre": "Texto",
        "descripcion": "Bloque de texto con título",
        "config_default": {
            "titulo": "",
            "contenido": "Escribe tu contenido aquí...",
            "alineacion": "center",
            "ancho_max": "800px"
        }
    },
    "image": {
        "nombre": "Imagen",
        "descripcion": "Imagen con descripción opcional",
        "config_default": {
            "imagen_url": "",
            "alt": "",
            "caption": "",
            "ancho": "100%",
            "redondeado": True
        }
    },
    "cta": {
        "nombre": "Llamada a la Acción",
        "descripcion": "Botón destacado con mensaje",
        "config_default": {
            "titulo": "¿Listo para comenzar?",
            "subtitulo": "Únete a miles de clientes satisfechos",
            "boton_texto": "Registrarse Gratis",
            "boton_url": "/registro",
            "fondo_color": "#16a34a",
            "texto_color": "#ffffff"
        }
    },
    "stats": {
        "nombre": "Estadísticas",
        "descripcion": "Números destacados",
        "config_default": {
            "items": [
                {"numero": "1000+", "label": "Clientes"},
                {"numero": "500+", "label": "Productos"},
                {"numero": "99%", "label": "Satisfacción"}
            ]
        }
    },
    "cards": {
        "nombre": "Tarjetas",
        "descripcion": "Grid de tarjetas",
        "config_default": {
            "titulo": "",
            "items": [
                {"titulo": "Tarjeta 1", "descripcion": "Descripción", "imagen_url": "", "link": ""},
                {"titulo": "Tarjeta 2", "descripcion": "Descripción", "imagen_url": "", "link": ""},
                {"titulo": "Tarjeta 3", "descripcion": "Descripción", "imagen_url": "", "link": ""}
            ],
            "columnas": 3
        }
    },
    "banner": {
        "nombre": "Banner",
        "descripcion": "Banner con texto e imagen",
        "config_default": {
            "titulo": "Promoción Especial",
            "subtitulo": "Aprovecha nuestras ofertas",
            "imagen_url": "",
            "fondo_color": "#f0fdf4",
            "boton_texto": "",
            "boton_url": ""
        }
    },
    "testimonials": {
        "nombre": "Testimonios",
        "descripcion": "Opiniones de clientes",
        "config_default": {
            "titulo": "Lo que dicen nuestros clientes",
            "items": [
                {"nombre": "Cliente 1", "texto": "Excelente servicio", "avatar_url": "", "cargo": ""},
                {"nombre": "Cliente 2", "texto": "Muy recomendado", "avatar_url": "", "cargo": ""}
            ]
        }
    },
    "spacer": {
        "nombre": "Espaciador",
        "descripcion": "Espacio en blanco",
        "config_default": {
            "altura": "60px"
        }
    },
    "divider": {
        "nombre": "Divisor",
        "descripcion": "Línea divisoria",
        "config_default": {
            "estilo": "solid",
            "color": "#e5e7eb",
            "ancho": "100%",
            "margen": "40px"
        }
    }
}

class BlockOrderItem(BaseModel):
    bloque_id: str
    orden: int

class ReorderBlocksRequest(BaseModel):
    orders: List[BlockOrderItem]

class ItemPedido(BaseModel):
    libro_id: str
    nombre_libro: str
    cantidad: int
    precio_unitario: float
    
    @property
    def subtotal(self) -> float:
        return self.cantidad * self.precio_unitario

class PedidoCreate(BaseModel):
    estudiante_id: str
    items: List[ItemPedido]
    metodo_pago: str  # "transferencia_bancaria", "yappy"
    notas: Optional[str] = None

class Pedido(BaseModel):
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

class LoginRequest(BaseModel):
    email: EmailStr
    contrasena: str

class TokenResponse(BaseModel):
    token: str
    cliente: dict

# ============== PUBLIC ORDER MODELS ==============

class PedidoPublicoCreate(BaseModel):
    """Pedido sin autenticación - para formulario embebible"""
    # Sección Acudiente (Guardian)
    nombre_acudiente: str
    telefono_acudiente: str
    email_acudiente: EmailStr
    
    # Sección Estudiante
    nombre_estudiante: str
    apellido_estudiante: str
    grado_estudiante: str
    email_estudiante: Optional[EmailStr] = None  # Optional
    telefono_estudiante: Optional[str] = None  # Optional
    escuela_estudiante: Optional[str] = None
    
    # Order info
    items: List[ItemPedido]
    metodo_pago: str
    notas: Optional[str] = None

# ============== NOTIFICATION MODELS ==============

class NotificacionCreate(BaseModel):
    tipo: str  # "pedido_nuevo", "bajo_stock", "pago_confirmado", "pedido_enviado"
    titulo: str
    mensaje: str
    datos: Optional[dict] = None

class Notificacion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notificacion_id: str = Field(default_factory=lambda: f"not_{uuid.uuid4().hex[:12]}")
    tipo: str
    titulo: str
    mensaje: str
    datos: Optional[dict] = None
    leida: bool = False
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ConfiguracionNotificaciones(BaseModel):
    mostrar_pedidos_nuevos: bool = True
    mostrar_bajo_stock: bool = True
    mostrar_pagos_confirmados: bool = True
    mostrar_pedidos_enviados: bool = True

# ============== FORM CONFIG MODEL ==============

class CampoFormulario(BaseModel):
    campo_id: str
    nombre: str
    tipo: str  # "text", "email", "tel", "select", "textarea"
    requerido: bool = True
    placeholder: Optional[str] = None
    opciones: Optional[List[str]] = None  # For select fields
    orden: int = 0
    activo: bool = True

class ConfiguracionFormulario(BaseModel):
    model_config = ConfigDict(extra="ignore")
    titulo: str = "Formulario de Pedido de Libros"
    descripcion: Optional[str] = "Complete el formulario para ordenar los libros de texto"
    campos_personalizados: List[CampoFormulario] = []
    mostrar_precios: bool = True
    metodos_pago: List[str] = ["transferencia_bancaria", "yappy"]
    mensaje_exito: str = "¡Gracias! Su pedido ha sido recibido."
    color_primario: str = "#166534"
    logo_url: Optional[str] = None

# ============== GOOGLE SHEETS SYNC MODELS ==============

class ColumnaSheet(BaseModel):
    """Represents a column from Google Sheet"""
    columna_id: str = Field(default_factory=lambda: f"col_{uuid.uuid4().hex[:8]}")
    nombre_original: str  # Original column name from sheet
    nombre_display: str  # Display name in our system
    indice: int  # Column index (0-based)
    tipo_dato: str = "texto"  # texto, numero, fecha, email, etc.
    fijada: bool = False  # If true, won't auto-update from sheet changes
    mapeo_campo: Optional[str] = None  # Maps to student field (nombre, apellido, grado, etc.)
    activa: bool = True

class CambioRegistro(BaseModel):
    """Records a change detected in the sheet"""
    cambio_id: str = Field(default_factory=lambda: f"chg_{uuid.uuid4().hex[:8]}")
    tipo: str  # "nuevo", "modificado", "eliminado", "columna_nueva", "columna_eliminada"
    fila_id: Optional[str] = None
    datos_anteriores: Optional[dict] = None
    datos_nuevos: Optional[dict] = None
    columna_afectada: Optional[str] = None
    fecha_deteccion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    aplicado: bool = False
    fecha_aplicado: Optional[datetime] = None

class ConfiguracionSheetSync(BaseModel):
    """Configuration for Google Sheet synchronization"""
    config_id: str = Field(default_factory=lambda: f"cfg_{uuid.uuid4().hex[:8]}")
    nombre: str  # Friendly name for this sync config
    spreadsheet_id: str  # Google Sheet ID
    spreadsheet_url: Optional[str] = None
    hoja_nombre: Optional[str] = None  # Specific sheet tab name (default: first sheet)
    columnas: List[ColumnaSheet] = []
    ultima_sincronizacion: Optional[datetime] = None
    activo: bool = True
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EstudianteSincronizado(BaseModel):
    """Student record synced from Google Sheet"""
    sync_id: str = Field(default_factory=lambda: f"sync_{uuid.uuid4().hex[:8]}")
    config_id: str  # Reference to sync config
    fila_sheet: int  # Row number in sheet (for tracking)
    datos: dict  # All data from the sheet row
    hash_datos: str  # Hash of data for change detection
    estudiante_id: Optional[str] = None  # Link to actual student if created
    cliente_id: Optional[str] = None  # Link to parent/guardian
    estado: str = "activo"  # activo, eliminado_pendiente
    version: int = 1
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(cliente_id: str, es_admin: bool = False) -> str:
    payload = {
        "sub": cliente_id,
        "es_admin": es_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> dict:
    token = None
    
    # Check cookie first
    session_token = request.cookies.get("session_token")
    if session_token:
        # Verify session from database
        session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
        if session:
            expires_at = session.get("expires_at")
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at > datetime.now(timezone.utc):
                user = await db.clientes.find_one({"cliente_id": session["cliente_id"]}, {"_id": 0, "contrasena_hash": 0})
                if user:
                    return user
    
    # Fallback to Authorization header
    if credentials:
        token = credentials.credentials
    
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        cliente_id = payload.get("sub")
        user = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0, "contrasena_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user.get("es_admin", False):
        raise HTTPException(status_code=403, detail="Acceso denegado - Solo administradores")
    return current_user

# ============== MONDAY.COM SERVICE ==============

async def create_monday_item(pedido: dict) -> Optional[str]:
    if not MONDAY_API_KEY or not MONDAY_BOARD_ID:
        logger.warning("Monday.com not configured - missing API key or Board ID")
        return None
    
    try:
        import json
        # Use appropriate fields based on order type
        cliente_info = pedido.get("nombre_acudiente") or pedido.get("cliente_id", "")
        estudiante_nombre = pedido.get("estudiante_nombre", "")
        
        column_values = json.dumps({
            "text": cliente_info,
            "text4": estudiante_nombre,
            "numbers": str(pedido.get("total", 0)),
            "status": {"label": pedido.get("estado", "pendiente")},
            "text0": pedido.get("metodo_pago", "")
        })
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {MONDAY_BOARD_ID},
                item_name: "{pedido.get('pedido_id', '')}",
                column_values: {json.dumps(column_values)}
            ) {{
                id
            }}
        }}
        '''
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                if "data" in result and "create_item" in result["data"]:
                    return result["data"]["create_item"]["id"]
            
            logger.error(f"Monday.com API error: {response.text}")
            return None
            
    except Exception as e:
        logger.error(f"Error creating Monday.com item: {e}")
        return None

# ============== AUTH ROUTES ==============

@api_router.post("/auth/registro", response_model=TokenResponse)
async def registro(cliente: ClienteCreate):
    existing = await db.clientes.find_one({"email": cliente.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    cliente_obj = Cliente(**cliente.model_dump(exclude={"contrasena"}))
    doc = cliente_obj.model_dump()
    doc["contrasena_hash"] = hash_password(cliente.contrasena)
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.clientes.insert_one(doc)
    
    token = create_token(cliente_obj.cliente_id)
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in doc.items() if k not in ["_id", "contrasena_hash"]}
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    user = await db.clientes.find_one({"email": request.email}, {"_id": 0})
    if not user or not verify_password(request.contrasena, user.get("contrasena_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["cliente_id"], user.get("es_admin", False))
    return TokenResponse(
        token=token,
        cliente={k: v for k, v in user.items() if k != "contrasena_hash"}
    )

@api_router.get("/auth/session")
async def get_session_data(request: Request):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID requerido")
    
    try:
        async with httpx.AsyncClient() as http_client:
            response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=401, detail="Sesión inválida")
            
            data = response.json()
            
            # Check if user exists
            existing_user = await db.clientes.find_one({"email": data["email"]}, {"_id": 0})
            
            if existing_user:
                cliente_id = existing_user["cliente_id"]
                # Update user info if needed
                await db.clientes.update_one(
                    {"email": data["email"]},
                    {"$set": {
                        "nombre": data.get("name", existing_user.get("nombre")),
                        "google_id": data.get("id")
                    }}
                )
            else:
                # Create new user
                cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
                new_user = {
                    "cliente_id": cliente_id,
                    "email": data["email"],
                    "nombre": data.get("name", ""),
                    "google_id": data.get("id"),
                    "telefono": None,
                    "direccion": None,
                    "estudiantes": [],
                    "es_admin": False,
                    "fecha_creacion": datetime.now(timezone.utc).isoformat()
                }
                await db.clientes.insert_one(new_user)
            
            # Create session
            session_token = data.get("session_token", str(uuid.uuid4()))
            expires_at = datetime.now(timezone.utc) + timedelta(days=7)
            
            await db.user_sessions.insert_one({
                "cliente_id": cliente_id,
                "session_token": session_token,
                "expires_at": expires_at.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            user = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0, "contrasena_hash": 0})
            
            return {
                "session_token": session_token,
                "cliente": user
            }
            
    except httpx.RequestError as e:
        logger.error(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail="Error de autenticación")

@api_router.post("/auth/session")
async def create_session_cookie(request: Request, response: Response):
    body = await request.json()
    session_token = body.get("session_token")
    
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token requerido")
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {"success": True}

@api_router.get("/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return current_user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"success": True}

# ============== CATEGORÍAS DE PRODUCTOS ==============

@api_router.get("/categorias")
async def get_categorias():
    """Get all product categories"""
    categorias = await db.categorias.find({"activo": True}, {"_id": 0}).to_list(100)
    if not categorias:
        # Return default categories if none exist
        return [
            {"categoria_id": "libros", "nombre": "Libros", "icono": "📚", "orden": 1, "activo": True},
            {"categoria_id": "snacks", "nombre": "Snacks", "icono": "🍫", "orden": 2, "activo": True},
            {"categoria_id": "bebidas", "nombre": "Bebidas", "icono": "🥤", "orden": 3, "activo": True},
            {"categoria_id": "preparados", "nombre": "Preparados", "icono": "🌭", "orden": 4, "activo": True},
            {"categoria_id": "uniformes", "nombre": "Uniformes", "icono": "👕", "orden": 5, "activo": True},
            {"categoria_id": "servicios", "nombre": "Servicios", "icono": "🔧", "orden": 6, "activo": True},
        ]
    return sorted(categorias, key=lambda x: x.get("orden", 99))


@api_router.post("/admin/categorias")
async def create_categoria(categoria: dict, admin: dict = Depends(get_admin_user)):
    """Create a new product category"""
    categoria_id = categoria.get("categoria_id") or f"cat_{uuid.uuid4().hex[:8]}"
    
    doc = {
        "categoria_id": categoria_id,
        "nombre": categoria.get("nombre", "Nueva Categoría"),
        "icono": categoria.get("icono", "📦"),
        "orden": categoria.get("orden", 99),
        "activo": True,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categorias.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}


@api_router.put("/admin/categorias/{categoria_id}")
async def update_categoria(categoria_id: str, categoria: dict, admin: dict = Depends(get_admin_user)):
    """Update a product category"""
    update_data = {
        "nombre": categoria.get("nombre"),
        "icono": categoria.get("icono"),
        "orden": categoria.get("orden"),
        "activo": categoria.get("activo", True)
    }
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = await db.categorias.update_one(
        {"categoria_id": categoria_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    updated = await db.categorias.find_one({"categoria_id": categoria_id}, {"_id": 0})
    return updated


@api_router.delete("/admin/categorias/{categoria_id}")
async def delete_categoria(categoria_id: str, admin: dict = Depends(get_admin_user)):
    """Soft delete a product category"""
    # Check if category has products
    products_count = await db.libros.count_documents({"categoria": categoria_id, "activo": True})
    if products_count > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {products_count} productos en esta categoría."
        )
    
    result = await db.categorias.update_one(
        {"categoria_id": categoria_id},
        {"$set": {"activo": False}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return {"success": True}


# ============== LIBROS (TEXTBOOKS) ROUTES ==============

@api_router.get("/libros", response_model=List[dict])
async def get_libros(grado: Optional[str] = None, materia: Optional[str] = None):
    query = {"activo": True}
    if grado:
        # Search in both 'grado' (primary) and 'grados' (additional grades)
        query["$or"] = [
            {"grado": grado},
            {"grados": grado}
        ]
    if materia:
        query["materia"] = materia
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    return libros

@api_router.get("/libros/{libro_id}")
async def get_libro(libro_id: str):
    libro = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    if not libro:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return libro

@api_router.post("/admin/libros", response_model=dict)
async def create_libro(libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    libro_obj = Libro(**libro.model_dump())
    doc = libro_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    
    await db.libros.insert_one(doc)
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/admin/libros/{libro_id}")
async def update_libro(libro_id: str, libro: LibroCreate, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": libro.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    
    updated = await db.libros.find_one({"libro_id": libro_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/libros/{libro_id}")
async def delete_libro(libro_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"activo": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True}

# ============== INVENTARIO ROUTES ==============

@api_router.get("/admin/inventario")
async def get_inventario(admin: dict = Depends(get_admin_user)):
    libros = await db.libros.find({"activo": True}, {"_id": 0}).to_list(500)
    
    alertas_bajo_stock = [l for l in libros if l.get("cantidad_inventario", 0) < 10]
    
    return {
        "libros": libros,
        "alertas_bajo_stock": alertas_bajo_stock,
        "total_productos": len(libros),
        "productos_bajo_stock": len(alertas_bajo_stock)
    }

@api_router.put("/admin/inventario/{libro_id}")
async def update_inventario(libro_id: str, cantidad: int, admin: dict = Depends(get_admin_user)):
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": {"cantidad_inventario": cantidad}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Libro no encontrado")
    return {"success": True, "nueva_cantidad": cantidad}

# ============== ESTUDIANTES ROUTES ==============

@api_router.get("/estudiantes")
async def get_estudiantes(current_user: dict = Depends(get_current_user)):
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    return user.get("estudiantes", [])

@api_router.get("/estudiantes/{estudiante_id}")
async def get_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    return estudiante

@api_router.post("/estudiantes")
async def add_estudiante(estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    estudiante_data = estudiante.model_dump()
    estudiante_obj = Estudiante(**estudiante_data)
    estudiante_dict = estudiante_obj.model_dump()
    estudiante_dict["fecha_registro"] = estudiante_dict["fecha_registro"].isoformat()
    
    # Auto-search in enrollment database
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante.nombre,
        estudiante.apellido,
        estudiante.grado,
        estudiantes_sync
    )
    
    if coincidencia:
        # Found a match!
        estudiante_dict["estado_matricula"] = "encontrado"
        estudiante_dict["matricula_sync_id"] = coincidencia["sync_id"]
        estudiante_dict["similitud_matricula"] = coincidencia["similitud"]
        estudiante_dict["nombre_matricula"] = coincidencia["nombre_encontrado"]
    else:
        estudiante_dict["estado_matricula"] = "no_encontrado"
        estudiante_dict["matricula_sync_id"] = None
        estudiante_dict["similitud_matricula"] = None
        estudiante_dict["nombre_matricula"] = None
    
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$push": {"estudiantes": estudiante_dict}}
    )
    
    return estudiante_dict

@api_router.post("/estudiantes/{estudiante_id}/verificar-matricula")
async def verificar_matricula_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Re-verify student enrollment against the synced database"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Search in enrollment database
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante["nombre"],
        estudiante["apellido"],
        estudiante["grado"],
        estudiantes_sync
    )
    
    if coincidencia:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "encontrado",
                "estudiantes.$.matricula_sync_id": coincidencia["sync_id"],
                "estudiantes.$.similitud_matricula": coincidencia["similitud"],
                "estudiantes.$.nombre_matricula": coincidencia["nombre_encontrado"]
            }}
        )
        return {
            "success": True,
            "estado": "encontrado",
            "similitud": coincidencia["similitud"],
            "nombre_encontrado": coincidencia["nombre_encontrado"]
        }
    else:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "no_encontrado",
                "estudiantes.$.matricula_sync_id": None,
                "estudiantes.$.similitud_matricula": None,
                "estudiantes.$.nombre_matricula": None
            }}
        )
        return {
            "success": True,
            "estado": "no_encontrado",
            "mensaje": "No se encontró coincidencia en la base de datos de matrículas"
        }

@api_router.put("/estudiantes/{estudiante_id}")
async def update_estudiante(estudiante_id: str, estudiante: EstudianteCreate, current_user: dict = Depends(get_current_user)):
    # First update the basic data
    update_data = {
        "estudiantes.$.nombre": estudiante.nombre,
        "estudiantes.$.apellido": estudiante.apellido,
        "estudiantes.$.grado": estudiante.grado,
        "estudiantes.$.escuela": estudiante.escuela,
        "estudiantes.$.es_nuevo": estudiante.es_nuevo,
        "estudiantes.$.notas": estudiante.notas
    }
    
    result = await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Re-verify enrollment after update
    estudiantes_sync = await db.estudiantes_sincronizados.find(
        {"estado": "activo"},
        {"_id": 0}
    ).to_list(2000)
    
    coincidencia = buscar_estudiante_en_matriculas(
        estudiante.nombre,
        estudiante.apellido,
        estudiante.grado,
        estudiantes_sync
    )
    
    if coincidencia:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "encontrado",
                "estudiantes.$.matricula_sync_id": coincidencia["sync_id"],
                "estudiantes.$.similitud_matricula": coincidencia["similitud"],
                "estudiantes.$.nombre_matricula": coincidencia["nombre_encontrado"]
            }}
        )
    else:
        await db.clientes.update_one(
            {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": estudiante_id},
            {"$set": {
                "estudiantes.$.estado_matricula": "no_encontrado",
                "estudiantes.$.matricula_sync_id": None,
                "estudiantes.$.similitud_matricula": None,
                "estudiantes.$.nombre_matricula": None
            }}
        )
    
    return {"success": True}

@api_router.delete("/estudiantes/{estudiante_id}")
async def delete_estudiante(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"]},
        {"$pull": {"estudiantes": {"estudiante_id": estudiante_id}}}
    )
    return {"success": True}

@api_router.get("/estudiantes/{estudiante_id}/libros-disponibles")
async def get_libros_disponibles(estudiante_id: str, current_user: dict = Depends(get_current_user)):
    """Get available books for a student (excludes already purchased)"""
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(status_code=403, detail="El estudiante debe estar en la lista de matrículas para ver libros")
    
    grado = estudiante["grado"]
    libros_comprados = estudiante.get("libros_comprados", [])
    
    # Get all books for this grade
    query = {
        "activo": True,
        "$or": [{"grado": grado}, {"grados": grado}]
    }
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    
    # Mark books as purchased or available
    for libro in libros:
        libro["ya_comprado"] = libro["libro_id"] in libros_comprados
        libro["disponible"] = libro.get("cantidad_inventario", 0) > 0 and not libro["ya_comprado"]
    
    return {
        "estudiante": estudiante,
        "libros": libros,
        "libros_comprados_count": len(libros_comprados)
    }

# ============== ADMIN MATRICULA VERIFICATION ==============

@api_router.get("/admin/matriculas-pendientes")
async def get_matriculas_pendientes(admin: dict = Depends(get_admin_user)):
    """Get all students with pending enrollment verification"""
    # Get all clients with students that have pending status
    clientes = await db.clientes.find(
        {"estudiantes.estado_matricula": "pendiente"},
        {"_id": 0, "contrasena_hash": 0}
    ).to_list(500)
    
    pendientes = []
    for cliente in clientes:
        for est in cliente.get("estudiantes", []):
            if est.get("estado_matricula") == "pendiente":
                pendientes.append({
                    "cliente_id": cliente["cliente_id"],
                    "cliente_nombre": cliente.get("nombre", ""),
                    "cliente_email": cliente.get("email", ""),
                    "cliente_telefono": cliente.get("telefono", ""),
                    **est
                })
    
    # Sort by date, most recent first
    pendientes.sort(key=lambda x: x.get("fecha_registro", ""), reverse=True)
    
    return pendientes

@api_router.get("/admin/matriculas")
async def get_all_matriculas(
    estado: Optional[str] = None,
    ano_escolar: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all student enrollments with optional filters"""
    clientes = await db.clientes.find(
        {},
        {"_id": 0, "contrasena_hash": 0}
    ).to_list(500)
    
    matriculas = []
    for cliente in clientes:
        for est in cliente.get("estudiantes", []):
            # Apply filters
            if estado and est.get("estado_matricula") != estado:
                continue
            if ano_escolar and est.get("ano_escolar") != ano_escolar:
                continue
                
            matriculas.append({
                "cliente_id": cliente["cliente_id"],
                "cliente_nombre": cliente.get("nombre", ""),
                "cliente_email": cliente.get("email", ""),
                "cliente_telefono": cliente.get("telefono", ""),
                **est
            })
    
    return matriculas

@api_router.put("/admin/matriculas/{cliente_id}/{estudiante_id}/verificar")
async def verificar_matricula(
    cliente_id: str,
    estudiante_id: str,
    accion: str,  # "aprobar" or "rechazar"
    motivo: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Approve or reject a student enrollment"""
    if accion not in ["aprobar", "rechazar"]:
        raise HTTPException(status_code=400, detail="Acción debe ser 'aprobar' o 'rechazar'")
    
    nuevo_estado = "confirmada" if accion == "aprobar" else "rechazada"
    
    result = await db.clientes.update_one(
        {"cliente_id": cliente_id, "estudiantes.estudiante_id": estudiante_id},
        {"$set": {"estudiantes.$.estado_matricula": nuevo_estado}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Get student info for notification
    cliente = await db.clientes.find_one({"cliente_id": cliente_id}, {"_id": 0})
    estudiante = next((e for e in cliente.get("estudiantes", []) if e["estudiante_id"] == estudiante_id), None)
    
    # Create notification about the status change
    await create_notification(
        tipo="matricula_verificada",
        titulo=f"Matrícula {nuevo_estado.title()}",
        mensaje=f"Estudiante {estudiante['nombre']} {estudiante['apellido']} - {nuevo_estado}",
        datos={
            "estudiante_id": estudiante_id,
            "cliente_id": cliente_id,
            "estado": nuevo_estado,
            "motivo": motivo
        }
    )
    
    return {"success": True, "nuevo_estado": nuevo_estado}
    return {"success": True}

# ============== PEDIDOS (ORDERS) ROUTES ==============

@api_router.post("/pedidos")
async def create_pedido(pedido: PedidoCreate, current_user: dict = Depends(get_current_user)):
    # Get student info
    user = await db.clientes.find_one({"cliente_id": current_user["cliente_id"]}, {"_id": 0})
    estudiante = next((e for e in user.get("estudiantes", []) if e["estudiante_id"] == pedido.estudiante_id), None)
    
    if not estudiante:
        raise HTTPException(status_code=404, detail="Estudiante no encontrado")
    
    # Verify enrollment is confirmed
    if estudiante.get("estado_matricula") != "encontrado":
        raise HTTPException(status_code=403, detail="El estudiante debe estar en la lista de matrículas para realizar compras")
    
    # Check for already purchased books
    libros_comprados = estudiante.get("libros_comprados", [])
    for item in pedido.items:
        if item.libro_id in libros_comprados:
            libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
            raise HTTPException(status_code=400, detail=f"El libro '{libro['nombre']}' ya fue comprado para este estudiante")
    
    # Calculate total and verify inventory
    total = 0
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        total += item.cantidad * item.precio_unitario
    
    pedido_obj = Pedido(
        cliente_id=current_user["cliente_id"],
        estudiante_id=pedido.estudiante_id,
        estudiante_nombre=f"{estudiante['nombre']} {estudiante.get('apellido', '')}",
        items=[item.model_dump() for item in pedido.items],
        total=total,
        metodo_pago=pedido.metodo_pago,
        notas=pedido.notas
    )
    
    doc = pedido_obj.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    doc["ano_escolar"] = estudiante.get("ano_escolar", get_current_school_year())
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(doc)
    
    # Update student's purchased books list
    libro_ids = [item.libro_id for item in pedido.items]
    await db.clientes.update_one(
        {"cliente_id": current_user["cliente_id"], "estudiantes.estudiante_id": pedido.estudiante_id},
        {"$push": {"estudiantes.$.libros_comprados": {"$each": libro_ids}}}
    )
    
    # Create Monday.com item
    monday_id = await create_monday_item(doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": doc["pedido_id"]},
            {"$set": {"monday_item_id": monday_id}}
        )
        doc["monday_item_id"] = monday_id
    
    # Create notification for admin
    await create_notification(
        tipo="pedido_nuevo",
        titulo="Nuevo Pedido de Libros",
        mensaje=f"Pedido {doc['pedido_id']} - {estudiante['nombre']} {estudiante.get('apellido', '')} - ${total:.2f}",
        datos={"pedido_id": doc["pedido_id"], "total": total, "estudiante": f"{estudiante['nombre']} {estudiante.get('apellido', '')}"}
    )
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.get("/pedidos")
async def get_my_pedidos(current_user: dict = Depends(get_current_user)):
    pedidos = await db.pedidos.find(
        {"cliente_id": current_user["cliente_id"]},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(100)
    return pedidos

@api_router.get("/admin/pedidos")
async def get_all_pedidos(
    estado: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if estado:
        query["estado"] = estado
    
    pedidos = await db.pedidos.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(500)
    return pedidos

@api_router.put("/admin/pedidos/{pedido_id}")
async def update_pedido(pedido_id: str, estado: str, admin: dict = Depends(get_admin_user)):
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"estado": estado}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}

@api_router.put("/admin/pedidos/{pedido_id}/confirmar-pago")
async def confirmar_pago(pedido_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.pedidos.update_one(
        {"pedido_id": pedido_id},
        {"$set": {"pago_confirmado": True, "estado": "confirmado"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return {"success": True}

@api_router.get("/pedidos/{pedido_id}/public")
async def get_pedido_public(pedido_id: str):
    """Get order details for public checkout page (limited info)"""
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Return limited info for checkout
    return {
        "pedido_id": pedido.get("pedido_id"),
        "items": pedido.get("items", []),
        "subtotal": pedido.get("subtotal", pedido.get("total", 0)),
        "impuestos": pedido.get("impuestos", 0),
        "descuento": pedido.get("descuento", 0),
        "total": pedido.get("total", 0),
        "estado": pedido.get("estado"),
        "estado_pago": pedido.get("estado_pago", "pendiente"),
        "cliente_email": pedido.get("cliente_email"),
        "cliente_telefono": pedido.get("cliente_telefono"),
        "yappy_status": pedido.get("yappy_status"),
        "yappy_status_descripcion": pedido.get("yappy_status_descripcion")
    }

@api_router.get("/pedidos/{pedido_id}/recibo")
async def get_recibo(pedido_id: str, current_user: dict = Depends(get_current_user)):
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Verify ownership or admin
    if pedido["cliente_id"] != current_user["cliente_id"] and not current_user.get("es_admin"):
        raise HTTPException(status_code=403, detail="Acceso denegado")
    
    cliente = await db.clientes.find_one({"cliente_id": pedido["cliente_id"]}, {"_id": 0, "contrasena_hash": 0})
    
    return {
        "pedido": pedido,
        "cliente": cliente
    }

# ============== METADATA ROUTES ==============

@api_router.get("/grados")
async def get_grados():
    return {
        "grados": [
            {"id": "preescolar", "nombre": "Preescolar"},
            {"id": "1", "nombre": "1er Grado"},
            {"id": "2", "nombre": "2do Grado"},
            {"id": "3", "nombre": "3er Grado"},
            {"id": "4", "nombre": "4to Grado"},
            {"id": "5", "nombre": "5to Grado"},
            {"id": "6", "nombre": "6to Grado"},
            {"id": "7", "nombre": "7mo Grado"},
            {"id": "8", "nombre": "8vo Grado"},
            {"id": "9", "nombre": "9no Grado"},
            {"id": "10", "nombre": "10mo Grado"},
            {"id": "11", "nombre": "11vo Grado"},
            {"id": "12", "nombre": "12vo Grado"},
        ]
    }

@api_router.get("/materias")
async def get_materias():
    return {
        "materias": [
            {"id": "matematicas", "nombre": "Matemáticas"},
            {"id": "espanol", "nombre": "Español"},
            {"id": "ciencias", "nombre": "Ciencias"},
            {"id": "sociales", "nombre": "Estudios Sociales"},
            {"id": "ingles", "nombre": "Inglés"},
            {"id": "arte", "nombre": "Arte"},
            {"id": "musica", "nombre": "Música"},
            {"id": "educacion_fisica", "nombre": "Educación Física"},
            {"id": "tecnologia", "nombre": "Tecnología"},
            {"id": "religion", "nombre": "Religión"},
        ]
    }

# ============== GOOGLE SHEETS SYNC ==============

import hashlib
import csv
import io
import re

def extract_sheet_id(url_or_id: str) -> str:
    """Extract Google Sheet ID from URL or return as-is if already an ID"""
    # Pattern for Google Sheets URL
    match = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', url_or_id)
    if match:
        return match.group(1)
    # Assume it's already an ID
    return url_or_id

def hash_row_data(data: dict) -> str:
    """Create a hash of row data for change detection"""
    sorted_str = str(sorted(data.items()))
    return hashlib.md5(sorted_str.encode()).hexdigest()

async def fetch_public_sheet(spreadsheet_id: str, sheet_name: Optional[str] = None) -> tuple:
    """
    Fetch data from a public Google Sheet using CSV export.
    Returns (headers, rows) tuple.
    """
    # Build export URL
    gid = 0  # Default to first sheet
    export_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/export?format=csv&gid={gid}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(export_url, follow_redirects=True, timeout=30.0)
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=400, 
                detail=f"No se pudo acceder a la hoja. Asegúrese de que esté compartida públicamente. Status: {response.status_code}"
            )
        
        content = response.text
        
        # Parse CSV
        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        
        if not rows:
            return [], []
        
        headers = rows[0]
        data_rows = rows[1:]
        
        return headers, data_rows

@api_router.post("/admin/sheets/conectar")
async def conectar_sheet(
    url_o_id: str,
    nombre: str = "Estudiantes",
    admin: dict = Depends(get_admin_user)
):
    """Connect to a public Google Sheet and detect columns"""
    spreadsheet_id = extract_sheet_id(url_o_id)
    
    # Check if already connected
    existing = await db.sheet_configs.find_one({"spreadsheet_id": spreadsheet_id})
    if existing:
        raise HTTPException(status_code=400, detail="Esta hoja ya está conectada")
    
    # Fetch sheet data
    try:
        headers, rows = await fetch_public_sheet(spreadsheet_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al acceder a la hoja: {str(e)}")
    
    if not headers:
        raise HTTPException(status_code=400, detail="La hoja no tiene columnas")
    
    # Create column configurations
    columnas = []
    for idx, header in enumerate(headers):
        # Try to auto-detect field mapping
        mapeo = None
        header_lower = header.lower().strip()
        if "nombre" in header_lower and "apellido" not in header_lower:
            mapeo = "nombre"
        elif "apellido" in header_lower:
            mapeo = "apellido"
        elif "grado" in header_lower:
            mapeo = "grado"
        elif "email" in header_lower or "correo" in header_lower:
            mapeo = "email_acudiente"
        elif "teléfono" in header_lower or "telefono" in header_lower or "celular" in header_lower:
            mapeo = "telefono_acudiente"
        elif "cédula" in header_lower or "cedula" in header_lower:
            mapeo = "cedula"
        elif "escuela" in header_lower or "colegio" in header_lower:
            mapeo = "escuela"
        elif "acudiente" in header_lower or "padre" in header_lower or "madre" in header_lower or "tutor" in header_lower:
            mapeo = "nombre_acudiente"
        
        columnas.append(ColumnaSheet(
            nombre_original=header,
            nombre_display=header,
            indice=idx,
            mapeo_campo=mapeo
        ).model_dump())
    
    # Create config
    config = ConfiguracionSheetSync(
        nombre=nombre,
        spreadsheet_id=spreadsheet_id,
        spreadsheet_url=f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}",
        columnas=columnas
    )
    
    config_dict = config.model_dump()
    config_dict["fecha_creacion"] = config_dict["fecha_creacion"].isoformat()
    
    await db.sheet_configs.insert_one(config_dict)
    
    # Import initial data
    estudiantes_importados = 0
    for row_idx, row in enumerate(rows):
        if not any(row):  # Skip empty rows
            continue
            
        datos = {}
        for col_idx, valor in enumerate(row):
            if col_idx < len(headers):
                datos[headers[col_idx]] = valor
        
        sync_record = EstudianteSincronizado(
            config_id=config.config_id,
            fila_sheet=row_idx + 2,  # +2 because row 1 is header, and 0-indexed
            datos=datos,
            hash_datos=hash_row_data(datos)
        )
        
        sync_dict = sync_record.model_dump()
        sync_dict["fecha_creacion"] = sync_dict["fecha_creacion"].isoformat()
        sync_dict["fecha_actualizacion"] = sync_dict["fecha_actualizacion"].isoformat()
        
        await db.estudiantes_sincronizados.insert_one(sync_dict)
        estudiantes_importados += 1
    
    return {
        "success": True,
        "config_id": config.config_id,
        "columnas_detectadas": len(columnas),
        "estudiantes_importados": estudiantes_importados,
        "spreadsheet_id": spreadsheet_id
    }

@api_router.get("/admin/sheets/configs")
async def get_sheet_configs(admin: dict = Depends(get_admin_user)):
    """Get all sheet sync configurations"""
    configs = await db.sheet_configs.find({"activo": True}, {"_id": 0}).to_list(100)
    return configs

@api_router.get("/admin/sheets/{config_id}")
async def get_sheet_config(config_id: str, admin: dict = Depends(get_admin_user)):
    """Get a specific sheet config with its data"""
    config = await db.sheet_configs.find_one({"config_id": config_id}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    estudiantes = await db.estudiantes_sincronizados.find(
        {"config_id": config_id, "estado": "activo"},
        {"_id": 0}
    ).to_list(1000)
    
    return {
        "config": config,
        "estudiantes": estudiantes,
        "total": len(estudiantes)
    }

@api_router.post("/admin/sheets/{config_id}/sincronizar")
async def sincronizar_sheet(config_id: str, admin: dict = Depends(get_admin_user)):
    """
    Synchronize with Google Sheet and detect changes.
    - New rows: Auto-imported
    - Modified rows: Marked as pending change
    - Deleted rows: Marked as pending deletion
    - Column changes: Detected and reported
    """
    config = await db.sheet_configs.find_one({"config_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    
    # Fetch current data from sheet
    try:
        headers, rows = await fetch_public_sheet(config["spreadsheet_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al acceder a la hoja: {str(e)}")
    
    cambios = []
    nuevos = 0
    modificados = 0
    eliminados = 0
    
    # Check for column changes
    columnas_actuales = {c["nombre_original"]: c for c in config["columnas"]}
    columnas_nuevas = set(headers) - set(columnas_actuales.keys())
    columnas_eliminadas = set(columnas_actuales.keys()) - set(headers)
    
    # Record column changes
    for col_name in columnas_nuevas:
        cambio = CambioRegistro(
            tipo="columna_nueva",
            columna_afectada=col_name,
            datos_nuevos={"nombre": col_name, "indice": headers.index(col_name)}
        )
        cambio_dict = cambio.model_dump()
        cambio_dict["fecha_deteccion"] = cambio_dict["fecha_deteccion"].isoformat()
        await db.cambios_sheet.insert_one({"config_id": config_id, **cambio_dict})
        cambios.append({"tipo": "columna_nueva", "columna": col_name})
    
    for col_name in columnas_eliminadas:
        if not columnas_actuales[col_name].get("fijada", False):
            cambio = CambioRegistro(
                tipo="columna_eliminada",
                columna_afectada=col_name
            )
            cambio_dict = cambio.model_dump()
            cambio_dict["fecha_deteccion"] = cambio_dict["fecha_deteccion"].isoformat()
            await db.cambios_sheet.insert_one({"config_id": config_id, **cambio_dict})
            cambios.append({"tipo": "columna_eliminada", "columna": col_name})
    
    # Get existing synced students
    existentes = await db.estudiantes_sincronizados.find(
        {"config_id": config_id, "estado": "activo"},
        {"_id": 0}
    ).to_list(2000)
    existentes_por_fila = {e["fila_sheet"]: e for e in existentes}
    filas_procesadas = set()
    
    # Process each row
    for row_idx, row in enumerate(rows):
        fila_num = row_idx + 2  # +2 for header and 0-index
        filas_procesadas.add(fila_num)
        
        if not any(row):  # Skip empty rows
            continue
        
        datos = {}
        for col_idx, valor in enumerate(row):
            if col_idx < len(headers):
                datos[headers[col_idx]] = valor
        
        nuevo_hash = hash_row_data(datos)
        
        if fila_num in existentes_por_fila:
            # Existing row - check for modifications
            existente = existentes_por_fila[fila_num]
            if existente["hash_datos"] != nuevo_hash:
                # Row was modified - create pending change
                cambio = CambioRegistro(
                    tipo="modificado",
                    fila_id=existente["sync_id"],
                    datos_anteriores=existente["datos"],
                    datos_nuevos=datos
                )
                cambio_dict = cambio.model_dump()
                cambio_dict["fecha_deteccion"] = cambio_dict["fecha_deteccion"].isoformat()
                await db.cambios_sheet.insert_one({"config_id": config_id, **cambio_dict})
                modificados += 1
                cambios.append({"tipo": "modificado", "fila": fila_num, "sync_id": existente["sync_id"]})
        else:
            # New row - auto-import
            sync_record = EstudianteSincronizado(
                config_id=config_id,
                fila_sheet=fila_num,
                datos=datos,
                hash_datos=nuevo_hash
            )
            sync_dict = sync_record.model_dump()
            sync_dict["fecha_creacion"] = sync_dict["fecha_creacion"].isoformat()
            sync_dict["fecha_actualizacion"] = sync_dict["fecha_actualizacion"].isoformat()
            await db.estudiantes_sincronizados.insert_one(sync_dict)
            nuevos += 1
    
    # Check for deleted rows
    for fila_num, existente in existentes_por_fila.items():
        if fila_num not in filas_procesadas:
            # Row was deleted - create pending change
            cambio = CambioRegistro(
                tipo="eliminado",
                fila_id=existente["sync_id"],
                datos_anteriores=existente["datos"]
            )
            cambio_dict = cambio.model_dump()
            cambio_dict["fecha_deteccion"] = cambio_dict["fecha_deteccion"].isoformat()
            await db.cambios_sheet.insert_one({"config_id": config_id, **cambio_dict})
            eliminados += 1
            cambios.append({"tipo": "eliminado", "fila": fila_num, "sync_id": existente["sync_id"]})
    
    # Update last sync time
    await db.sheet_configs.update_one(
        {"config_id": config_id},
        {"$set": {"ultima_sincronizacion": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "success": True,
        "resumen": {
            "nuevos_importados": nuevos,
            "modificaciones_pendientes": modificados,
            "eliminaciones_pendientes": eliminados,
            "cambios_columnas": len(columnas_nuevas) + len(columnas_eliminadas)
        },
        "cambios": cambios
    }

@api_router.get("/admin/sheets/{config_id}/cambios-pendientes")
async def get_cambios_pendientes(config_id: str, admin: dict = Depends(get_admin_user)):
    """Get pending changes that need manual approval"""
    cambios = await db.cambios_sheet.find(
        {"config_id": config_id, "aplicado": False},
        {"_id": 0}
    ).to_list(500)
    return cambios

@api_router.post("/admin/sheets/{config_id}/aplicar-cambio/{cambio_id}")
async def aplicar_cambio(
    config_id: str,
    cambio_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Apply a pending change"""
    cambio = await db.cambios_sheet.find_one({"cambio_id": cambio_id, "config_id": config_id})
    if not cambio:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    
    if cambio["aplicado"]:
        raise HTTPException(status_code=400, detail="Este cambio ya fue aplicado")
    
    if cambio["tipo"] == "modificado":
        # Apply modification
        await db.estudiantes_sincronizados.update_one(
            {"sync_id": cambio["fila_id"]},
            {
                "$set": {
                    "datos": cambio["datos_nuevos"],
                    "hash_datos": hash_row_data(cambio["datos_nuevos"]),
                    "fecha_actualizacion": datetime.now(timezone.utc).isoformat(),
                    "version": {"$inc": 1}
                }
            }
        )
    elif cambio["tipo"] == "eliminado":
        # Mark as deleted
        await db.estudiantes_sincronizados.update_one(
            {"sync_id": cambio["fila_id"]},
            {"$set": {"estado": "eliminado", "fecha_actualizacion": datetime.now(timezone.utc).isoformat()}}
        )
    elif cambio["tipo"] == "columna_nueva":
        # Add new column to config
        config = await db.sheet_configs.find_one({"config_id": config_id})
        nueva_columna = ColumnaSheet(
            nombre_original=cambio["columna_afectada"],
            nombre_display=cambio["columna_afectada"],
            indice=cambio["datos_nuevos"]["indice"]
        ).model_dump()
        await db.sheet_configs.update_one(
            {"config_id": config_id},
            {"$push": {"columnas": nueva_columna}}
        )
    elif cambio["tipo"] == "columna_eliminada":
        # Remove column from config
        await db.sheet_configs.update_one(
            {"config_id": config_id},
            {"$pull": {"columnas": {"nombre_original": cambio["columna_afectada"]}}}
        )
    
    # Mark change as applied
    await db.cambios_sheet.update_one(
        {"cambio_id": cambio_id},
        {"$set": {"aplicado": True, "fecha_aplicado": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "mensaje": f"Cambio '{cambio['tipo']}' aplicado correctamente"}

@api_router.post("/admin/sheets/{config_id}/ignorar-cambio/{cambio_id}")
async def ignorar_cambio(config_id: str, cambio_id: str, admin: dict = Depends(get_admin_user)):
    """Ignore/dismiss a pending change"""
    result = await db.cambios_sheet.delete_one({"cambio_id": cambio_id, "config_id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cambio no encontrado")
    return {"success": True, "mensaje": "Cambio ignorado"}

@api_router.put("/admin/sheets/{config_id}/columnas/{columna_id}/fijar")
async def toggle_fijar_columna(
    config_id: str,
    columna_id: str,
    fijada: bool,
    admin: dict = Depends(get_admin_user)
):
    """Toggle column lock status"""
    result = await db.sheet_configs.update_one(
        {"config_id": config_id, "columnas.columna_id": columna_id},
        {"$set": {"columnas.$.fijada": fijada}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Columna no encontrada")
    return {"success": True, "fijada": fijada}

@api_router.put("/admin/sheets/{config_id}/columnas/{columna_id}/mapeo")
async def actualizar_mapeo_columna(
    config_id: str,
    columna_id: str,
    mapeo_campo: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Update column field mapping"""
    result = await db.sheet_configs.update_one(
        {"config_id": config_id, "columnas.columna_id": columna_id},
        {"$set": {"columnas.$.mapeo_campo": mapeo_campo}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Columna no encontrada")
    return {"success": True}

@api_router.get("/admin/sheets/{config_id}/historial")
async def get_historial_cambios(
    config_id: str,
    limite: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get change history"""
    cambios = await db.cambios_sheet.find(
        {"config_id": config_id, "aplicado": True},
        {"_id": 0}
    ).sort("fecha_aplicado", -1).limit(limite).to_list(limite)
    return cambios

@api_router.delete("/admin/sheets/{config_id}")
async def eliminar_config_sheet(config_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a sheet sync configuration"""
    await db.sheet_configs.delete_one({"config_id": config_id})
    await db.estudiantes_sincronizados.delete_many({"config_id": config_id})
    await db.cambios_sheet.delete_many({"config_id": config_id})
    return {"success": True, "mensaje": "Configuración eliminada"}

# ============== PAGE BUILDER ROUTES ==============

@api_router.get("/public/site-config")
async def get_public_site_config():
    """Get site configuration (public)"""
    config = await db.site_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        default = ConfiguracionSitio()
        return default.model_dump()
    return config

@api_router.get("/public/landing-page")
async def get_public_landing_page():
    """Get landing page blocks (public) - only returns published blocks"""
    page = await db.paginas.find_one({"pagina_id": "landing"}, {"_id": 0})
    if not page:
        # Return empty page with default blocks
        return {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [],
            "publicada": True
        }
    
    # Filter only published and active blocks for public view
    if page.get("bloques"):
        page["bloques"] = [
            b for b in page["bloques"] 
            if b.get("activo", True) and b.get("publicado", True)
        ]
    
    return page

@api_router.get("/admin/site-config")
async def get_site_config(admin: dict = Depends(get_admin_user)):
    """Get site configuration"""
    config = await db.site_config.find_one({"config_id": "main"}, {"_id": 0})
    if not config:
        default = ConfiguracionSitio()
        return default.model_dump()
    return config

@api_router.put("/admin/site-config")
async def update_site_config(config: ConfiguracionSitio, admin: dict = Depends(get_admin_user)):
    """Update site configuration"""
    config_dict = config.model_dump()
    config_dict["config_id"] = "main"
    config_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.site_config.update_one(
        {"config_id": "main"},
        {"$set": config_dict},
        upsert=True
    )
    return {"success": True, "config": config_dict}

@api_router.get("/admin/block-templates")
async def get_block_templates(admin: dict = Depends(get_admin_user)):
    """Get available block templates"""
    return BLOCK_TEMPLATES

@api_router.get("/admin/landing-page")
async def get_landing_page(admin: dict = Depends(get_admin_user)):
    """Get landing page with all blocks"""
    page = await db.paginas.find_one({"pagina_id": "landing"}, {"_id": 0})
    if not page:
        return {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [],
            "publicada": True
        }
    return page

@api_router.post("/admin/landing-page/blocks")
async def add_block(
    tipo: str,
    orden: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Add a new block to landing page"""
    if tipo not in BLOCK_TEMPLATES:
        raise HTTPException(status_code=400, detail=f"Tipo de bloque '{tipo}' no válido")
    
    template = BLOCK_TEMPLATES[tipo]
    
    # Get current page
    page = await db.paginas.find_one({"pagina_id": "landing"})
    
    # Calculate order
    if page and page.get("bloques"):
        if orden is None:
            orden = max(b.get("orden", 0) for b in page["bloques"]) + 1
    else:
        orden = 0
    
    # Create new block
    new_block = BloquePagina(
        tipo=tipo,
        orden=orden,
        config=template["config_default"].copy()
    ).model_dump()
    
    if page:
        await db.paginas.update_one(
            {"pagina_id": "landing"},
            {
                "$push": {"bloques": new_block},
                "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        new_page = {
            "pagina_id": "landing",
            "titulo": "Página Principal",
            "bloques": [new_block],
            "publicada": True,
            "fecha_actualizacion": datetime.now(timezone.utc).isoformat()
        }
        await db.paginas.insert_one(new_page)
    
    return {"success": True, "block": new_block}

@api_router.put("/admin/landing-page/blocks/reorder")
async def reorder_blocks(request: ReorderBlocksRequest, admin: dict = Depends(get_admin_user)):
    """Reorder blocks - expects {orders: [{bloque_id, orden}]}"""
    for item in request.orders:
        await db.paginas.update_one(
            {"pagina_id": "landing", "bloques.bloque_id": item.bloque_id},
            {"$set": {"bloques.$.orden": item.orden}}
        )
    
    await db.paginas.update_one(
        {"pagina_id": "landing"},
        {"$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True}

@api_router.put("/admin/landing-page/blocks/{bloque_id}")
async def update_block(
    bloque_id: str,
    config: dict,
    activo: Optional[bool] = None,
    publicado: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """Update block configuration"""
    update_doc = {"bloques.$.config": config}
    if activo is not None:
        update_doc["bloques.$.activo"] = activo
    if publicado is not None:
        update_doc["bloques.$.publicado"] = publicado
    update_doc["fecha_actualizacion"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.paginas.update_one(
        {"pagina_id": "landing", "bloques.bloque_id": bloque_id},
        {"$set": update_doc}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True}

@api_router.put("/admin/landing-page/blocks/{bloque_id}/publish")
async def toggle_block_publish(bloque_id: str, publicado: bool, admin: dict = Depends(get_admin_user)):
    """Toggle block publish status (Publicado/En construcción)"""
    result = await db.paginas.update_one(
        {"pagina_id": "landing", "bloques.bloque_id": bloque_id},
        {"$set": {
            "bloques.$.publicado": publicado,
            "fecha_actualizacion": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True, "publicado": publicado}

@api_router.delete("/admin/landing-page/blocks/{bloque_id}")
async def delete_block(bloque_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a block from landing page"""
    result = await db.paginas.update_one(
        {"pagina_id": "landing"},
        {
            "$pull": {"bloques": {"bloque_id": bloque_id}},
            "$set": {"fecha_actualizacion": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Bloque no encontrado")
    
    return {"success": True}

@api_router.put("/admin/landing-page/publish")
async def toggle_publish_landing(publicada: bool, admin: dict = Depends(get_admin_user)):
    """Toggle landing page published status"""
    await db.paginas.update_one(
        {"pagina_id": "landing"},
        {"$set": {"publicada": publicada, "fecha_actualizacion": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    return {"success": True, "publicada": publicada}

# ============== MONDAY.COM ADMIN ROUTES ==============

@api_router.get("/admin/monday/status")
async def get_monday_status(admin: dict = Depends(get_admin_user)):
    """Check Monday.com integration status"""
    board_id = await get_monday_board_id()
    
    status = {
        "api_key_configured": bool(MONDAY_API_KEY),
        "board_id_configured": bool(board_id),
        "board_id": board_id if board_id else None,
        "connected": False,
        "boards": []
    }
    
    if MONDAY_API_KEY:
        try:
            query = '''
            query {
                boards (limit: 20) {
                    id
                    name
                }
            }
            '''
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.monday.com/v2",
                    json={"query": query},
                    headers={
                        "Authorization": MONDAY_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                
                if response.status_code == 200:
                    result = response.json()
                    if "data" in result and "boards" in result["data"]:
                        status["connected"] = True
                        status["boards"] = result["data"]["boards"]
        except Exception as e:
            logger.error(f"Error checking Monday.com status: {e}")
    
    return status

@api_router.put("/admin/monday/config")
async def update_monday_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update Monday.com configuration (Board ID)"""
    board_id = config.get("board_id", "").strip()
    
    if not board_id:
        raise HTTPException(status_code=400, detail="Board ID es requerido")
    
    # Verify board exists
    if MONDAY_API_KEY:
        try:
            query = f'''
            query {{
                boards (ids: [{board_id}]) {{
                    id
                    name
                }}
            }}
            '''
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.monday.com/v2",
                    json={"query": query},
                    headers={
                        "Authorization": MONDAY_API_KEY,
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                
                result = response.json()
                if response.status_code != 200 or not result.get("data", {}).get("boards"):
                    raise HTTPException(status_code=400, detail="Board ID no válido o no encontrado")
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying board: {e}")
            raise HTTPException(status_code=500, detail="Error verificando el board")
    
    # Save to database
    await db.app_config.update_one(
        {"config_key": "monday_board_id"},
        {"$set": {"config_key": "monday_board_id", "value": board_id, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    
    return {"success": True, "board_id": board_id}
    
    return status

@api_router.post("/admin/monday/test")
async def test_monday_integration(admin: dict = Depends(get_admin_user)):
    """Test Monday.com integration by creating a test item"""
    board_id = await get_monday_board_id()
    
    if not MONDAY_API_KEY or not board_id:
        raise HTTPException(
            status_code=400, 
            detail="Monday.com no está configurado. Configura el Board ID desde el panel de administración."
        )
    
    try:
        import json
        test_item_name = f"TEST-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        
        column_values = json.dumps({
            "text": "Cliente de Prueba",
            "text4": "Estudiante de Prueba",
            "numbers": "100",
            "status": {"label": "pendiente"},
            "text0": "transferencia_bancaria"
        })
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{test_item_name}",
                column_values: {json.dumps(column_values)}
            ) {{
                id
            }}
        }}
        '''
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": mutation},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            result = response.json()
            
            if response.status_code == 200 and "data" in result and "create_item" in result["data"]:
                return {
                    "success": True,
                    "message": "Item de prueba creado exitosamente en Monday.com",
                    "item_id": result["data"]["create_item"]["id"],
                    "item_name": test_item_name
                }
            
            error_msg = result.get("errors", [{"message": "Error desconocido"}])[0].get("message", "Error desconocido")
            raise HTTPException(status_code=400, detail=f"Error de Monday.com: {error_msg}")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error conectando con Monday.com: {str(e)}")

# ============== ADMIN SETUP ==============

@api_router.post("/admin/setup")
async def setup_admin(email: str, contrasena: str):
    # Check if any admin exists
    existing_admin = await db.clientes.find_one({"es_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin ya existe")
    
    existing_user = await db.clientes.find_one({"email": email})
    if existing_user:
        # Make existing user admin
        await db.clientes.update_one({"email": email}, {"$set": {"es_admin": True}})
        return {"success": True, "message": "Usuario existente promovido a admin"}
    
    # Create admin user
    cliente_id = f"cli_{uuid.uuid4().hex[:12]}"
    admin_user = {
        "cliente_id": cliente_id,
        "email": email,
        "nombre": "Administrador",
        "telefono": None,
        "direccion": None,
        "estudiantes": [],
        "es_admin": True,
        "contrasena_hash": hash_password(contrasena),
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    await db.clientes.insert_one(admin_user)
    return {"success": True, "message": "Admin creado exitosamente"}

# ============== SEED DATA ==============

@api_router.post("/admin/seed")
async def seed_data(admin: dict = Depends(get_admin_user)):
    # Check if data already exists
    existing = await db.libros.find_one()
    if existing:
        return {"message": "Datos ya existen"}
    
    sample_libros = [
        {"nombre": "Matemáticas 1", "descripcion": "Libro de matemáticas para primer grado", "grado": "1", "materia": "matematicas", "precio": 25.00, "cantidad_inventario": 50, "isbn": "978-1-234-56789-0", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Español 1", "descripcion": "Libro de español para primer grado", "grado": "1", "materia": "espanol", "precio": 25.00, "cantidad_inventario": 45, "isbn": "978-1-234-56789-1", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Ciencias 1", "descripcion": "Libro de ciencias para primer grado", "grado": "1", "materia": "ciencias", "precio": 28.00, "cantidad_inventario": 40, "isbn": "978-1-234-56789-2", "editorial": "Editorial Norma", "activo": True},
        {"nombre": "Matemáticas 2", "descripcion": "Libro de matemáticas para segundo grado", "grado": "2", "materia": "matematicas", "precio": 26.00, "cantidad_inventario": 55, "isbn": "978-1-234-56789-3", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Español 2", "descripcion": "Libro de español para segundo grado", "grado": "2", "materia": "espanol", "precio": 26.00, "cantidad_inventario": 5, "isbn": "978-1-234-56789-4", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Ciencias 2", "descripcion": "Libro de ciencias para segundo grado", "grado": "2", "materia": "ciencias", "precio": 29.00, "cantidad_inventario": 8, "isbn": "978-1-234-56789-5", "editorial": "Editorial Norma", "activo": True},
        {"nombre": "Matemáticas 3", "descripcion": "Libro de matemáticas para tercer grado", "grado": "3", "materia": "matematicas", "precio": 27.00, "cantidad_inventario": 60, "isbn": "978-1-234-56789-6", "editorial": "Editorial Santillana", "activo": True},
        {"nombre": "Inglés 1", "descripcion": "Libro de inglés para primer grado", "grado": "1", "materia": "ingles", "precio": 30.00, "cantidad_inventario": 35, "isbn": "978-1-234-56789-7", "editorial": "Editorial Oxford", "activo": True},
    ]
    
    for libro_data in sample_libros:
        libro = Libro(**libro_data)
        doc = libro.model_dump()
        doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
        await db.libros.insert_one(doc)
    
    return {"message": f"Se agregaron {len(sample_libros)} libros de muestra"}

# ============== PUBLIC ORDER ROUTES (NO AUTH) ==============

async def create_notification(tipo: str, titulo: str, mensaje: str, datos: dict = None):
    """Helper to create notifications"""
    notificacion = Notificacion(
        tipo=tipo,
        titulo=titulo,
        mensaje=mensaje,
        datos=datos
    )
    doc = notificacion.model_dump()
    doc["fecha_creacion"] = doc["fecha_creacion"].isoformat()
    await db.notificaciones.insert_one(doc)
    return notificacion

@api_router.get("/public/libros")
async def get_public_libros(grado: Optional[str] = None):
    """Get books for public form - no auth required"""
    query = {"activo": True}
    if grado:
        # Search in both 'grado' (primary) and 'grados' (additional grades)
        query["$or"] = [
            {"grado": grado},
            {"grados": grado}
        ]
    
    libros = await db.libros.find(query, {"_id": 0}).to_list(500)
    # Filter only books with stock > 0
    libros_disponibles = [l for l in libros if l.get("cantidad_inventario", 0) > 0]
    return libros_disponibles

@api_router.get("/public/config-formulario")
async def get_form_config():
    """Get form configuration for embed"""
    config = await db.config_formulario.find_one({}, {"_id": 0})
    if not config:
        # Return default config
        default = ConfiguracionFormulario()
        return default.model_dump()
    return config

@api_router.post("/public/pedido")
async def create_public_order(pedido: PedidoPublicoCreate):
    """Create order from public form - no auth required"""
    
    # Validate and calculate total
    total = 0
    items_validados = []
    
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id, "activo": True}, {"_id": 0})
        if not libro:
            raise HTTPException(status_code=404, detail=f"Libro {item.libro_id} no encontrado")
        if libro.get("cantidad_inventario", 0) < item.cantidad:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente para {libro['nombre']}")
        
        total += item.cantidad * item.precio_unitario
        items_validados.append(item.model_dump())
    
    # Create full student name from separate fields
    nombre_completo_estudiante = f"{pedido.nombre_estudiante} {pedido.apellido_estudiante}"
    
    # Create order
    pedido_id = f"ped_{uuid.uuid4().hex[:12]}"
    pedido_doc = {
        "pedido_id": pedido_id,
        "tipo": "publico",  # Mark as public order
        "cliente_id": None,
        # Acudiente (Guardian) info
        "nombre_acudiente": pedido.nombre_acudiente,
        "telefono_acudiente": pedido.telefono_acudiente,
        "email_acudiente": pedido.email_acudiente,
        # Estudiante info
        "estudiante_id": None,
        "estudiante_nombre": nombre_completo_estudiante,
        "estudiante_primer_nombre": pedido.nombre_estudiante,
        "estudiante_apellido": pedido.apellido_estudiante,
        "grado_estudiante": pedido.grado_estudiante,
        "email_estudiante": pedido.email_estudiante,
        "telefono_estudiante": pedido.telefono_estudiante,
        "escuela_estudiante": pedido.escuela_estudiante,
        # Order details
        "items": items_validados,
        "total": total,
        "metodo_pago": pedido.metodo_pago,
        "estado": "pendiente",
        "pago_confirmado": False,
        "notas": pedido.notas,
        "fecha_creacion": datetime.now(timezone.utc).isoformat()
    }
    
    # Update inventory
    for item in pedido.items:
        await db.libros.update_one(
            {"libro_id": item.libro_id},
            {"$inc": {"cantidad_inventario": -item.cantidad}}
        )
    
    await db.pedidos.insert_one(pedido_doc)
    
    # Create Monday.com item
    monday_id = await create_monday_item(pedido_doc)
    if monday_id:
        await db.pedidos.update_one(
            {"pedido_id": pedido_id},
            {"$set": {"monday_item_id": monday_id}}
        )
    
    # Create notification
    await create_notification(
        tipo="pedido_nuevo",
        titulo="Nuevo Pedido Recibido",
        mensaje=f"Pedido {pedido_id} de {pedido.nombre_acudiente} - ${total:.2f}",
        datos={"pedido_id": pedido_id, "total": total, "acudiente": pedido.nombre_acudiente}
    )
    
    # Check low stock and create notifications
    for item in pedido.items:
        libro = await db.libros.find_one({"libro_id": item.libro_id}, {"_id": 0})
        if libro and libro.get("cantidad_inventario", 0) < 10:
            await create_notification(
                tipo="bajo_stock",
                titulo="Alerta de Stock Bajo",
                mensaje=f"{libro['nombre']} tiene solo {libro['cantidad_inventario']} unidades",
                datos={"libro_id": item.libro_id, "stock": libro['cantidad_inventario'], "nombre": libro['nombre']}
            )
    
    return {
        "success": True,
        "pedido_id": pedido_id,
        "total": total,
        "mensaje": "Pedido creado exitosamente"
    }

# ============== NOTIFICATIONS ROUTES ==============

@api_router.get("/admin/notificaciones")
async def get_notificaciones(
    limite: int = 50,
    solo_no_leidas: bool = False,
    tipos: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get notifications for admin"""
    query = {}
    if solo_no_leidas:
        query["leida"] = False
    if tipos:
        tipo_list = tipos.split(",")
        query["tipo"] = {"$in": tipo_list}
    
    notificaciones = await db.notificaciones.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(limite)
    
    # Count by type
    pipeline = [
        {"$match": {"leida": False}},
        {"$group": {"_id": "$tipo", "count": {"$sum": 1}}}
    ]
    counts = await db.notificaciones.aggregate(pipeline).to_list(10)
    conteo_por_tipo = {item["_id"]: item["count"] for item in counts}
    
    return {
        "notificaciones": notificaciones,
        "total_no_leidas": sum(conteo_por_tipo.values()),
        "conteo_por_tipo": conteo_por_tipo
    }

@api_router.put("/admin/notificaciones/{notificacion_id}/leer")
async def mark_notification_read(notificacion_id: str, admin: dict = Depends(get_admin_user)):
    """Mark notification as read"""
    await db.notificaciones.update_one(
        {"notificacion_id": notificacion_id},
        {"$set": {"leida": True}}
    )
    return {"success": True}

@api_router.put("/admin/notificaciones/leer-todas")
async def mark_all_notifications_read(
    tipos: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Mark all notifications as read"""
    query = {}
    if tipos:
        query["tipo"] = {"$in": tipos.split(",")}
    
    await db.notificaciones.update_many(query, {"$set": {"leida": True}})
    return {"success": True}

@api_router.delete("/admin/notificaciones/limpiar")
async def clear_old_notifications(dias: int = 30, admin: dict = Depends(get_admin_user)):
    """Delete notifications older than X days"""
    fecha_limite = datetime.now(timezone.utc) - timedelta(days=dias)
    result = await db.notificaciones.delete_many({
        "fecha_creacion": {"$lt": fecha_limite.isoformat()}
    })
    return {"success": True, "eliminadas": result.deleted_count}

# ============== NOTIFICATION CONFIG ROUTES ==============

@api_router.get("/admin/config-notificaciones")
async def get_notification_config(admin: dict = Depends(get_admin_user)):
    """Get notification display preferences"""
    config = await db.config_notificaciones.find_one({"admin_id": admin["cliente_id"]}, {"_id": 0})
    if not config:
        default = ConfiguracionNotificaciones()
        return default.model_dump()
    return config

@api_router.put("/admin/config-notificaciones")
async def update_notification_config(
    config: ConfiguracionNotificaciones,
    admin: dict = Depends(get_admin_user)
):
    """Update notification display preferences"""
    await db.config_notificaciones.update_one(
        {"admin_id": admin["cliente_id"]},
        {"$set": {**config.model_dump(), "admin_id": admin["cliente_id"]}},
        upsert=True
    )
    return {"success": True}

# ============== FORM CONFIGURATION ROUTES ==============

@api_router.get("/admin/config-formulario")
async def get_admin_form_config(admin: dict = Depends(get_admin_user)):
    """Get form configuration"""
    config = await db.config_formulario.find_one({}, {"_id": 0})
    if not config:
        default = ConfiguracionFormulario()
        return default.model_dump()
    return config

@api_router.put("/admin/config-formulario")
async def update_form_config(config: dict, admin: dict = Depends(get_admin_user)):
    """Update form configuration"""
    await db.config_formulario.update_one(
        {},
        {"$set": config},
        upsert=True
    )
    return {"success": True}

# ============== EMBED CODE GENERATOR ==============

@api_router.get("/admin/embed-code")
async def get_embed_code(admin: dict = Depends(get_admin_user)):
    """Generate embed code for the form"""
    base_url = os.environ.get('FRONTEND_URL', 'https://your-domain.com')
    
    iframe_code = f'''<iframe 
  src="{base_url}/embed/orden" 
  width="100%" 
  height="800" 
  frameborder="0" 
  style="border: none; max-width: 1200px; margin: 0 auto; display: block;">
</iframe>'''
    
    script_code = f'''<div id="libreria-form-container"></div>
<script src="{base_url}/embed.js"></script>
<script>
  LibreriaForm.init({{
    container: '#libreria-form-container',
    theme: 'auto'
  }});
</script>'''
    
    return {
        "iframe_code": iframe_code,
        "script_code": script_code,
        "direct_url": f"{base_url}/embed/orden"
    }

# ============== COMMUNITY CONTENT ROUTES ==============

# --- Community Posts (News, Announcements) ---

@api_router.get("/community/posts")
async def get_community_posts(
    tipo: Optional[str] = None,
    destacado: Optional[bool] = None,
    limit: int = 20
):
    """Get published community posts (public)"""
    now = datetime.now(timezone.utc)
    query = {
        "publicado": True,
        "$or": [
            {"fecha_expiracion": None},
            {"fecha_expiracion": {"$gte": now}}
        ]
    }
    if tipo:
        query["tipo"] = tipo
    if destacado is not None:
        query["destacado"] = destacado
    
    posts = await db.community_posts.find(query, {"_id": 0}).sort([
        ("destacado", -1),
        ("fecha_publicacion", -1)
    ]).to_list(limit)
    return posts

@api_router.get("/community/posts/{post_id}")
async def get_community_post(post_id: str):
    """Get a single community post and increment views"""
    post = await db.community_posts.find_one({"post_id": post_id, "publicado": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    # Increment views
    await db.community_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"vistas": 1}}
    )
    post["vistas"] = post.get("vistas", 0) + 1
    return post

@api_router.get("/admin/community/posts")
async def get_all_community_posts(admin: dict = Depends(get_admin_user)):
    """Get all community posts (admin)"""
    posts = await db.community_posts.find({}, {"_id": 0}).sort("fecha_creacion", -1).to_list(100)
    return posts

@api_router.post("/admin/community/posts")
async def create_community_post(post: dict, admin: dict = Depends(get_admin_user)):
    """Create a new community post"""
    doc = {
        "post_id": f"post_{uuid.uuid4().hex[:12]}",
        "tipo": post.get("tipo", "noticia"),
        "titulo": post.get("titulo"),
        "contenido": post.get("contenido"),
        "resumen": post.get("resumen"),
        "imagen_url": post.get("imagen_url"),
        "imagen_galeria": post.get("imagen_galeria"),
        "video_url": post.get("video_url"),
        "fecha_evento": post.get("fecha_evento"),
        "lugar_evento": post.get("lugar_evento"),
        "publicado": post.get("publicado", False),
        "destacado": post.get("destacado", False),
        "orden": post.get("orden", 0),
        "fecha_publicacion": datetime.now(timezone.utc) if post.get("publicado") else None,
        "fecha_expiracion": post.get("fecha_expiracion"),
        "tags": post.get("tags"),
        "categoria": post.get("categoria"),
        "permite_comentarios": post.get("permite_comentarios", True),
        "fuente": "admin",
        "creado_por": admin.get("cliente_id"),
        "fecha_creacion": datetime.now(timezone.utc),
        "vistas": 0,
        "likes": 0
    }
    await db.community_posts.insert_one(doc)
    del doc["_id"]
    return doc

@api_router.put("/admin/community/posts/{post_id}")
async def update_community_post(post_id: str, post: dict, admin: dict = Depends(get_admin_user)):
    """Update a community post"""
    existing = await db.community_posts.find_one({"post_id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    
    update_data = {k: v for k, v in post.items() if k not in ["post_id", "_id", "fecha_creacion"]}
    
    # Set publication date if being published for first time
    if post.get("publicado") and not existing.get("fecha_publicacion"):
        update_data["fecha_publicacion"] = datetime.now(timezone.utc)
    
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    await db.community_posts.update_one(
        {"post_id": post_id},
        {"$set": update_data}
    )
    
    updated = await db.community_posts.find_one({"post_id": post_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/community/posts/{post_id}")
async def delete_community_post(post_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a community post"""
    result = await db.community_posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    # Also delete comments
    await db.community_comments.delete_many({"post_id": post_id})
    return {"success": True}

# --- Comments ---

@api_router.get("/community/posts/{post_id}/comments")
async def get_post_comments(post_id: str):
    """Get comments for a post"""
    comments = await db.community_comments.find(
        {"post_id": post_id, "aprobado": True},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(100)
    return comments

@api_router.post("/community/posts/{post_id}/comments")
async def add_comment(post_id: str, comment: dict, user: Optional[dict] = Depends(get_current_user)):
    """Add a comment to a post"""
    # Check if post exists and allows comments
    post = await db.community_posts.find_one({"post_id": post_id, "publicado": True})
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    if not post.get("permite_comentarios", True):
        raise HTTPException(status_code=400, detail="Este post no permite comentarios")
    
    doc = {
        "comment_id": f"comment_{uuid.uuid4().hex[:12]}",
        "post_id": post_id,
        "usuario_id": user.get("cliente_id") if user else None,
        "nombre_usuario": comment.get("nombre_usuario") or (user.get("nombre") if user else "Anónimo"),
        "contenido": comment.get("contenido"),
        "fecha_creacion": datetime.now(timezone.utc),
        "aprobado": True,  # Auto-approve for now
        "likes": 0
    }
    await db.community_comments.insert_one(doc)
    del doc["_id"]
    return doc

@api_router.post("/community/posts/{post_id}/like")
async def like_post(post_id: str):
    """Like a post"""
    result = await db.community_posts.update_one(
        {"post_id": post_id},
        {"$inc": {"likes": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    return {"success": True}

# --- Community Events ---

@api_router.get("/community/events")
async def get_community_events(upcoming: bool = True, limit: int = 10):
    """Get community events"""
    now = datetime.now(timezone.utc)
    query = {"estado": {"$ne": "cancelado"}}
    
    if upcoming:
        query["fecha_inicio"] = {"$gte": now}
        sort_order = 1  # Ascending for upcoming
    else:
        sort_order = -1  # Descending for past
    
    events = await db.community_events.find(query, {"_id": 0}).sort([
        ("destacado", -1),
        ("fecha_inicio", sort_order)
    ]).to_list(limit)
    return events

@api_router.get("/community/events/{evento_id}")
async def get_community_event(evento_id: str):
    """Get a single event"""
    event = await db.community_events.find_one({"evento_id": evento_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return event

@api_router.post("/admin/community/events")
async def create_community_event(event: dict, admin: dict = Depends(get_admin_user)):
    """Create a new community event"""
    # Parse dates
    fecha_inicio = event.get("fecha_inicio")
    if isinstance(fecha_inicio, str):
        fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    fecha_fin = event.get("fecha_fin")
    if isinstance(fecha_fin, str):
        fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    doc = {
        "evento_id": f"evento_{uuid.uuid4().hex[:12]}",
        "titulo": event.get("titulo"),
        "descripcion": event.get("descripcion"),
        "tipo": event.get("tipo", "otro"),
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "lugar": event.get("lugar"),
        "imagen_url": event.get("imagen_url"),
        "requiere_inscripcion": event.get("requiere_inscripcion", False),
        "max_participantes": event.get("max_participantes"),
        "inscripciones": [],
        "estado": "programado",
        "destacado": event.get("destacado", False),
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.community_events.insert_one(doc)
    del doc["_id"]
    return doc

@api_router.put("/admin/community/events/{evento_id}")
async def update_community_event(evento_id: str, event: dict, admin: dict = Depends(get_admin_user)):
    """Update a community event"""
    update_data = {k: v for k, v in event.items() if k not in ["evento_id", "_id", "fecha_creacion"]}
    
    result = await db.community_events.update_one(
        {"evento_id": evento_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    
    updated = await db.community_events.find_one({"evento_id": evento_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/community/events/{evento_id}")
async def delete_community_event(evento_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a community event"""
    result = await db.community_events.delete_one({"evento_id": evento_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"success": True}

# --- Gallery Albums ---

@api_router.get("/community/gallery")
async def get_gallery_albums():
    """Get all active gallery albums"""
    albums = await db.gallery_albums.find({"activo": True}, {"_id": 0}).sort("orden", 1).to_list(50)
    return albums

@api_router.get("/community/gallery/{album_id}")
async def get_gallery_album(album_id: str):
    """Get a single gallery album"""
    album = await db.gallery_albums.find_one({"album_id": album_id}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return album

@api_router.post("/admin/community/gallery")
async def create_gallery_album(album: dict, admin: dict = Depends(get_admin_user)):
    """Create a new gallery album"""
    doc = {
        "album_id": f"album_{uuid.uuid4().hex[:12]}",
        "titulo": album.get("titulo"),
        "descripcion": album.get("descripcion"),
        "google_photos_url": album.get("google_photos_url"),
        "google_photos_album_id": album.get("google_photos_album_id"),
        "fotos": album.get("fotos", []),
        "imagen_portada": album.get("imagen_portada"),
        "orden": album.get("orden", 0),
        "activo": album.get("activo", True),
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.gallery_albums.insert_one(doc)
    del doc["_id"]
    return doc

@api_router.put("/admin/community/gallery/{album_id}")
async def update_gallery_album(album_id: str, album: dict, admin: dict = Depends(get_admin_user)):
    """Update a gallery album"""
    update_data = {k: v for k, v in album.items() if k not in ["album_id", "_id", "fecha_creacion"]}
    
    result = await db.gallery_albums.update_one(
        {"album_id": album_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    
    updated = await db.gallery_albums.find_one({"album_id": album_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/community/gallery/{album_id}")
async def delete_gallery_album(album_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a gallery album"""
    result = await db.gallery_albums.delete_one({"album_id": album_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return {"success": True}

# --- Landing Page Data (Combined endpoint for new community landing) ---

@api_router.get("/community/landing")
async def get_community_landing_data():
    """Get all data needed for the community landing page"""
    now = datetime.now(timezone.utc)
    
    # Featured posts (hero section)
    featured_posts = await db.community_posts.find(
        {"publicado": True, "destacado": True},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(5)
    
    # Latest news
    news = await db.community_posts.find(
        {"publicado": True, "tipo": "noticia"},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(6)
    
    # Announcements
    announcements = await db.community_posts.find(
        {"publicado": True, "tipo": "anuncio"},
        {"_id": 0}
    ).sort("fecha_publicacion", -1).to_list(4)
    
    # Upcoming events
    events = await db.community_events.find(
        {"fecha_inicio": {"$gte": now}, "estado": {"$ne": "cancelado"}},
        {"_id": 0}
    ).sort([("destacado", -1), ("fecha_inicio", 1)]).to_list(5)
    
    # Gallery albums
    albums = await db.gallery_albums.find(
        {"activo": True},
        {"_id": 0}
    ).sort("orden", 1).to_list(4)
    
    # Featured products from store (limited)
    featured_products = await db.libros.find(
        {"destacado": True, "activo": True},
        {"_id": 0}
    ).sort("orden_destacado", 1).to_list(4)
    
    # Promotional products
    promo_products = await db.libros.find(
        {"en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}},
        {"_id": 0}
    ).to_list(4)
    
    return {
        "destacados": featured_posts,
        "noticias": news,
        "anuncios": announcements,
        "eventos": events,
        "galerias": albums,
        "productos_destacados": featured_products,
        "productos_promocion": promo_products
    }

# ============== CATEGORY LANDING PAGE ROUTES ==============

# --- Category Banners ---

@api_router.get("/category-banners/{categoria}")
async def get_category_banners(categoria: str):
    """Get active banners for a category (public)"""
    now = datetime.now(timezone.utc)
    query = {
        "categoria": categoria,
        "activo": True,
        "$or": [
            {"fecha_inicio": None, "fecha_fin": None},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": None},
            {"fecha_inicio": None, "fecha_fin": {"$gte": now}},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": {"$gte": now}}
        ]
    }
    banners = await db.category_banners.find(query, {"_id": 0}).sort("orden", 1).to_list(20)
    return banners

@api_router.get("/admin/category-banners")
async def get_all_category_banners(admin: dict = Depends(get_admin_user)):
    """Get all banners (admin)"""
    banners = await db.category_banners.find({}, {"_id": 0}).sort([("categoria", 1), ("orden", 1)]).to_list(100)
    return banners

@api_router.post("/admin/category-banners")
async def create_category_banner(banner: dict, admin: dict = Depends(get_admin_user)):
    """Create a new category banner"""
    doc = {
        "banner_id": f"banner_{uuid.uuid4().hex[:12]}",
        "categoria": banner.get("categoria"),
        "titulo": banner.get("titulo"),
        "subtitulo": banner.get("subtitulo"),
        "imagen_url": banner.get("imagen_url"),
        "link_url": banner.get("link_url"),
        "activo": banner.get("activo", True),
        "orden": banner.get("orden", 0),
        "fecha_inicio": banner.get("fecha_inicio"),
        "fecha_fin": banner.get("fecha_fin"),
        "creado_por": "admin",
        "fecha_creacion": datetime.now(timezone.utc)
    }
    await db.category_banners.insert_one(doc)
    del doc["_id"]
    return doc

@api_router.put("/admin/category-banners/{banner_id}")
async def update_category_banner(banner_id: str, banner: dict, admin: dict = Depends(get_admin_user)):
    """Update a category banner"""
    update_data = {k: v for k, v in banner.items() if k not in ["banner_id", "_id", "fecha_creacion"]}
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    result = await db.category_banners.update_one(
        {"banner_id": banner_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    
    updated = await db.category_banners.find_one({"banner_id": banner_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/category-banners/{banner_id}")
async def delete_category_banner(banner_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a category banner"""
    result = await db.category_banners.delete_one({"banner_id": banner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banner no encontrado")
    return {"success": True}

# --- Featured & Promotional Products ---

@api_router.get("/category-featured/{categoria}")
async def get_category_featured_products(categoria: str, limit: int = 10):
    """Get featured products for a category (public)"""
    query = {"categoria": categoria, "destacado": True, "activo": True}
    products = await db.libros.find(query, {"_id": 0}).sort("orden_destacado", 1).to_list(limit)
    return products

@api_router.get("/category-promotions/{categoria}")
async def get_category_promotional_products(categoria: str, limit: int = 10):
    """Get promotional products for a category (public)"""
    query = {"categoria": categoria, "en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}}
    products = await db.libros.find(query, {"_id": 0}).to_list(limit)
    return products

@api_router.get("/category-newest/{categoria}")
async def get_category_newest_products(categoria: str, limit: int = 8):
    """Get newest products for a category (public)"""
    query = {"categoria": categoria, "activo": True}
    products = await db.libros.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(limit)
    return products

@api_router.put("/admin/products/{libro_id}/featured")
async def toggle_product_featured(libro_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Toggle featured status of a product"""
    update_data = {
        "destacado": data.get("destacado", False),
        "orden_destacado": data.get("orden_destacado", 0)
    }
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}

@api_router.put("/admin/products/{libro_id}/promotion")
async def toggle_product_promotion(libro_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Toggle promotion status of a product"""
    update_data = {
        "en_promocion": data.get("en_promocion", False),
        "precio_oferta": data.get("precio_oferta")
    }
    result = await db.libros.update_one(
        {"libro_id": libro_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}

# --- Vendor Permissions ---

@api_router.get("/admin/vendor-permissions")
async def get_all_vendor_permissions(admin: dict = Depends(get_admin_user)):
    """Get all vendor permissions (admin only)"""
    permissions = await db.vendor_permissions.find({}, {"_id": 0}).to_list(100)
    return permissions

@api_router.get("/admin/vendor-permissions/{vendor_id}")
async def get_vendor_permissions(vendor_id: str, admin: dict = Depends(get_admin_user)):
    """Get permissions for a specific vendor"""
    permissions = await db.vendor_permissions.find_one({"vendor_id": vendor_id}, {"_id": 0})
    if not permissions:
        # Return default permissions
        return {
            "vendor_id": vendor_id,
            "puede_crear_banners": False,
            "puede_destacar_productos": False,
            "puede_crear_promociones": False,
            "puede_publicar_noticias": False,
            "max_banners": 3,
            "max_productos_destacados": 5
        }
    return permissions

@api_router.put("/admin/vendor-permissions/{vendor_id}")
async def update_vendor_permissions(vendor_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    """Update vendor permissions (admin only)"""
    update_data = {
        "vendor_id": vendor_id,
        "puede_crear_banners": data.get("puede_crear_banners", False),
        "puede_destacar_productos": data.get("puede_destacar_productos", False),
        "puede_crear_promociones": data.get("puede_crear_promociones", False),
        "puede_publicar_noticias": data.get("puede_publicar_noticias", False),
        "max_banners": data.get("max_banners", 3),
        "max_productos_destacados": data.get("max_productos_destacados", 5),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    await db.vendor_permissions.update_one(
        {"vendor_id": vendor_id},
        {"$set": update_data},
        upsert=True
    )
    return {"success": True, "permissions": update_data}

# --- Category Landing Page Data (combined endpoint) ---

@api_router.get("/category-landing/{categoria}")
async def get_category_landing_data(categoria: str):
    """Get all data needed for a category landing page"""
    now = datetime.now(timezone.utc)
    
    # Get category info
    cat_info = await db.categorias.find_one({"categoria_id": categoria}, {"_id": 0})
    
    # Get active banners
    banner_query = {
        "categoria": categoria,
        "activo": True,
        "$or": [
            {"fecha_inicio": None, "fecha_fin": None},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": None},
            {"fecha_inicio": None, "fecha_fin": {"$gte": now}},
            {"fecha_inicio": {"$lte": now}, "fecha_fin": {"$gte": now}}
        ]
    }
    banners = await db.category_banners.find(banner_query, {"_id": 0}).sort("orden", 1).to_list(10)
    
    # Get featured products
    featured = await db.libros.find(
        {"categoria": categoria, "destacado": True, "activo": True},
        {"_id": 0}
    ).sort("orden_destacado", 1).to_list(10)
    
    # Get promotional products
    promotions = await db.libros.find(
        {"categoria": categoria, "en_promocion": True, "activo": True, "precio_oferta": {"$ne": None}},
        {"_id": 0}
    ).to_list(10)
    
    # Get newest products
    newest = await db.libros.find(
        {"categoria": categoria, "activo": True},
        {"_id": 0}
    ).sort("fecha_creacion", -1).to_list(8)
    
    # Get total product count for this category
    total_products = await db.libros.count_documents({"categoria": categoria, "activo": True})
    
    return {
        "categoria": cat_info,
        "banners": banners,
        "destacados": featured,
        "promociones": promotions,
        "novedades": newest,
        "total_productos": total_products
    }

# Include Platform Store routes
from routes.platform_store import router as platform_store_router, init_routes as init_platform_store_routes
init_platform_store_routes(db, get_admin_user, get_current_user)
api_router.include_router(platform_store_router)

# Include Ping Pong Club routes
from routes.pingpong import pingpong_router
api_router.include_router(pingpong_router)

# Include Membership routes
from routes.membership import router as membership_router, init_routes as init_membership_routes
init_membership_routes(db, get_admin_user, get_current_user)
api_router.include_router(membership_router)

# Include Translations routes
from routes.translations import router as translations_router, init_routes as init_translations_routes
init_translations_routes(db, get_admin_user, get_current_user)
api_router.include_router(translations_router)

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
