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
    descripcion: str = "Plataforma de comercio electronic"
    color_primario: str = "#16a34a"
    color_secundario: str = "#0f766e"
    email_contacto: Optional[str] = None
    telefono_contacto: Optional[str] = None
    direccion: Optional[str] = None
    redes_sociales: dict = {}  # {facebook: url, instagram: url, etc}
    footer_texto: str = "© 2025 Todos los derechos reservados"
    # SEO & Meta Tags
    meta_titulo: Optional[str] = None  # Browser tab title (falls back to nombre_sitio)
    meta_descripcion: Optional[str] = None  # Meta description for SEO
    meta_keywords: Optional[str] = None  # Meta keywords
    og_image: Optional[str] = None  # Open Graph image for social sharing
    # Analytics & Scripts
    google_analytics_id: Optional[str] = None  # GA4 Measurement ID
    custom_head_scripts: Optional[str] = None  # Custom scripts for <head>
    custom_body_scripts: Optional[str] = None  # Custom scripts for <body>


class PaginaBuilder(BaseModel):
    """Page configuration with blocks"""
    pagina_id: str = "landing"
    titulo: str = "Page Principal"
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
        "nombre": "Features",
        "descripcion": "Lista de features con íconos",
        "config_default": {
            "titulo": "¿Por what elegirnos?",
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
        "descripcion": "Bloque de texto con title",
        "config_default": {
            "titulo": "",
            "contenido": "Escribe tu contenido here...",
            "alineacion": "center",
            "ancho_max": "800px"
        }
    },
    "image": {
        "nombre": "Imagen",
        "descripcion": "Imagen con description opcional",
        "config_default": {
            "imagen_url": "",
            "alt": "",
            "caption": "",
            "ancho": "100%",
            "redondeado": True
        }
    },
    "cta": {
        "nombre": "Llamada a la Action",
        "descripcion": "Botón destacado con mensaje",
        "config_default": {
            "titulo": "¿Listo para comenzar?",
            "subtitulo": "Join a miles de clientes satisfechos",
            "boton_texto": "Registrarse Gratis",
            "boton_url": "/registro",
            "fondo_color": "#16a34a",
            "texto_color": "#ffffff"
        }
    },
    "stats": {
        "nombre": "Statistics",
        "descripcion": "Numbers destacados",
        "config_default": {
            "items": [
                {"numero": "1000+", "label": "Clientes"},
                {"numero": "500+", "label": "Productos"},
                {"numero": "99%", "label": "Satisfaction"}
            ]
        }
    },
    "cards": {
        "nombre": "Tarjetas",
        "descripcion": "Grid de tarjetas",
        "config_default": {
            "titulo": "",
            "items": [
                {"titulo": "Tarjeta 1", "descripcion": "Description", "imagen_url": "", "link": ""},
                {"titulo": "Tarjeta 2", "descripcion": "Description", "imagen_url": "", "link": ""},
                {"titulo": "Tarjeta 3", "descripcion": "Description", "imagen_url": "", "link": ""}
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
    },
    "pinpanclub_feed": {
        "nombre": "PinPanClub Activity Feed",
        "descripcion": "Actividades en vivo del club de ping pong",
        "config_default": {
            "titulo": {
                "es": "Actividad del Club",
                "en": "Club Activity",
                "zh": "俱乐部活动"
            },
            "subtitulo": {
                "es": "Lo last en PinPanClub",
                "en": "Latest from PinPanClub",
                "zh": "PinPanClub最新动态"
            },
            # Visibility settings per audience
            "visibility": {
                "public": True,           # Non-registered users
                "registered": True,       # Logged in users
                "moderator": True,        # Moderators
                "admin": True,            # Admins
                "super_admin": True,      # Super Admins
                "specific_users": []      # List of user IDs
            },
            # Section toggles (all enabled by default)
            "sections": {
                "recent_matches": {
                    "enabled": True,
                    "limit": 5,
                    "title": {"es": "Partidos Recientes", "en": "Recent Matches", "zh": "最近比赛"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                },
                "leaderboard": {
                    "enabled": True,
                    "limit": 10,
                    "title": {"es": "Top Jugadores", "en": "Top Players", "zh": "顶级玩家"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                },
                "active_challenges": {
                    "enabled": True,
                    "limit": 4,
                    "title": {"es": "Retos Activos", "en": "Active Challenges", "zh": "活跃挑战"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                },
                "recent_achievements": {
                    "enabled": True,
                    "limit": 6,
                    "title": {"es": "Logros Recientes", "en": "Recent Achievements", "zh": "最近成就"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                },
                "active_players": {
                    "enabled": True,
                    "title": {"es": "Jugadores Activos", "en": "Active Players", "zh": "活跃玩家"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                },
                "upcoming_tournaments": {
                    "enabled": True,
                    "limit": 3,
                    "title": {"es": "Próximos Torneos", "en": "Upcoming Tournaments", "zh": "即将举行的比赛"},
                    "visibility": {
                        "public": True,
                        "registered": True,
                        "moderator": True,
                        "admin": True,
                        "super_admin": True,
                        "specific_users": []
                    }
                }
            },
            # Style options
            "style": {
                "background": "transparent",
                "card_style": "default",  # default, compact, expanded
                "show_cta": True,
                "cta_text": {"es": "Ver more en PinPanClub", "en": "See more in PinPanClub", "zh": "在PinPanClub查看更多"},
                "cta_url": "/pinpanclub"
            }
        }
    }
}
