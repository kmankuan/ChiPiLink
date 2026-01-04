"""
Landing Models - Page builder models
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid


class BloquePagina(BaseModel):
    """Block for page builder"""
    bloque_id: str = Field(default_factory=lambda: f"blk_{uuid.uuid4().hex[:8]}")
    tipo: str  # hero, features, text, image, cta, stats, cards, banner, testimonials
    orden: int = 0
    activo: bool = True
    publicado: bool = True  # True = visible for all, False = admin only (under construction)
    config: dict = {}


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
    pagina_id: str = "landing"
    titulo: str = "Página Principal"
    bloques: List[BloquePagina] = []
    publicada: bool = True
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BlockOrderItem(BaseModel):
    """Block order item for reordering"""
    bloque_id: str
    orden: int


class ReorderBlocksRequest(BaseModel):
    """Request model for reordering blocks"""
    orders: List[BlockOrderItem]


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
