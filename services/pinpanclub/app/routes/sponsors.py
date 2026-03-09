"""
Ping Pong Sponsors Module - Gestión de patrocinadores para pantallas TV
Permite configurar espacios publicitarios, logos, diseños y más
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid
import base64

router = APIRouter(prefix="/sponsors", tags=["PinpanClub Sponsors"])

# ============== MODELS ==============

class SponsorType(str, Enum):
    PRIMARY = "primary"       # Banner horizontal grande
    SPECIAL = "special"       # Espacios cuadrados en header
    SECONDARY = "secondary"   # Otros espacios
    ROTATING = "rotating"     # Rotación automática

class SponsorPosition(str, Enum):
    HEADER_LEFT = "header_left"
    HEADER_RIGHT = "header_right"
    BANNER_TOP = "banner_top"
    BANNER_BOTTOM = "banner_bottom"
    SIDEBAR_LEFT = "sidebar_left"
    SIDEBAR_RIGHT = "sidebar_right"

class DisplayAnimation(str, Enum):
    NONE = "none"
    FADE = "fade"
    SLIDE = "slide"
    ZOOM = "zoom"
    PULSE = "pulse"

class SponsorCreate(BaseModel):
    nombre: str = Field(..., description="Nombre del patrocinador")
    tipo: SponsorType = Field(default=SponsorType.PRIMARY)
    posicion: SponsorPosition = Field(default=SponsorPosition.BANNER_BOTTOM)
    logo_url: Optional[str] = None
    logo_base64: Optional[str] = None
    website_url: Optional[str] = None
    descripcion: Optional[str] = None
    
    # Diseño y estilo
    color_fondo: str = Field(default="#000000")
    color_texto: str = Field(default="#FFFFFF")
    color_acento: Optional[str] = None
    gradiente: Optional[str] = None  # "from-blue-500 to-purple-600"
    borde: Optional[str] = None  # "border-2 border-white"
    sombra: bool = False
    
    # Animación
    animacion: DisplayAnimation = Field(default=DisplayAnimation.NONE)
    duracion_animacion: int = Field(default=1000, description="ms")
    
    # Rotación (para banners rotativos)
    duracion_display: int = Field(default=10, description="Segundos que se muestra")
    orden: int = Field(default=0, description="Orden en la rotación")
    
    # Estado
    activo: bool = True
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    
    # Contenido adicional
    texto_promocional: Optional[str] = None
    mostrar_nombre: bool = True
    tamano_logo: str = Field(default="medium")  # small, medium, large, full

class SponsorUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[SponsorType] = None
    posicion: Optional[SponsorPosition] = None
    logo_url: Optional[str] = None
    logo_base64: Optional[str] = None
    website_url: Optional[str] = None
    descripcion: Optional[str] = None
    color_fondo: Optional[str] = None
    color_texto: Optional[str] = None
    color_acento: Optional[str] = None
    gradiente: Optional[str] = None
    borde: Optional[str] = None
    sombra: Optional[bool] = None
    animacion: Optional[DisplayAnimation] = None
    duracion_animacion: Optional[int] = None
    duracion_display: Optional[int] = None
    orden: Optional[int] = None
    activo: Optional[bool] = None
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    texto_promocional: Optional[str] = None
    mostrar_nombre: Optional[bool] = None
    tamano_logo: Optional[str] = None

class SponsorSpaceConfig(BaseModel):
    """Configuración de un espacio publicitario"""
    space_id: str
    nombre: str
    posicion: SponsorPosition
    ancho: str = Field(default="100%")
    alto: str = Field(default="80px")
    visible: bool = True
    color_fondo_default: str = "#1a1a2e"
    rotacion_activa: bool = True
    intervalo_rotacion: int = Field(default=10, description="Segundos")
    transicion: DisplayAnimation = DisplayAnimation.FADE
    padding: str = "8px"
    border_radius: str = "8px"

class TVLayoutConfig(BaseModel):
    """Configuración del layout de pantalla TV"""
    mostrar_header_sponsors: bool = True
    mostrar_banner_top: bool = False
    mostrar_banner_bottom: bool = True
    mostrar_sidebars: bool = False
    
    # Dimensiones
    header_sponsor_size: str = "120px"
    banner_height: str = "100px"
    sidebar_width: str = "200px"
    
    # Espacios configurados
    espacios: List[SponsorSpaceConfig] = []

# ============== DEFAULT CONFIG ==============

DEFAULT_SPONSOR_SPACES = [
    {
        "space_id": "header_left",
        "nombre": "Patrocinador Especial Izquierdo",
        "posicion": "header_left",
        "ancho": "150px",
        "alto": "60px",
        "visible": True,
        "color_fondo_default": "transparent",
        "rotacion_activa": False,
        "border_radius": "8px"
    },
    {
        "space_id": "header_right",
        "nombre": "Patrocinador Especial Derecho",
        "posicion": "header_right",
        "ancho": "150px",
        "alto": "60px",
        "visible": True,
        "color_fondo_default": "transparent",
        "rotacion_activa": False,
        "border_radius": "8px"
    },
    {
        "space_id": "banner_bottom",
        "nombre": "Banner Principal Inferior",
        "posicion": "banner_bottom",
        "ancho": "100%",
        "alto": "100px",
        "visible": True,
        "color_fondo_default": "#1a1a2e",
        "rotacion_activa": True,
        "intervalo_rotacion": 10,
        "transicion": "fade",
        "padding": "12px",
        "border_radius": "0px"
    },
    {
        "space_id": "banner_top",
        "nombre": "Banner Superior",
        "posicion": "banner_top",
        "ancho": "100%",
        "alto": "80px",
        "visible": False,
        "color_fondo_default": "#1a1a2e",
        "rotacion_activa": True,
        "intervalo_rotacion": 8
    }
]

# ============== ENDPOINTS ==============

@router.post("/", response_model=dict)
async def crear_patrocinador(sponsor: SponsorCreate):
    """Crear un nuevo patrocinador"""
    from main import db
    
    sponsor_id = f"sponsor_{uuid.uuid4().hex[:12]}"
    
    sponsor_doc = {
        "sponsor_id": sponsor_id,
        **sponsor.model_dump(),
        "fecha_creacion": datetime.now(timezone.utc),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_sponsors.insert_one(sponsor_doc)
    
    # Remove _id for response
    sponsor_doc.pop("_id", None)
    
    return {"success": True, "sponsor": sponsor_doc}


@router.get("/", response_model=List[dict])
async def listar_patrocinadores(
    tipo: Optional[SponsorType] = None,
    posicion: Optional[SponsorPosition] = None,
    activo: Optional[bool] = None
):
    """Listar todos los patrocinadores"""
    from main import db
    
    query = {}
    if tipo:
        query["tipo"] = tipo
    if posicion:
        query["posicion"] = posicion
    if activo is not None:
        query["activo"] = activo
    
    # Filter by date validity
    now = datetime.now(timezone.utc)
    
    sponsors = await db.pingpong_sponsors.find(
        query,
        {"_id": 0}
    ).sort("orden", 1).to_list(100)
    
    # Filter by date range
    valid_sponsors = []
    for s in sponsors:
        fecha_inicio = s.get("fecha_inicio")
        fecha_fin = s.get("fecha_fin")
        
        if fecha_inicio and fecha_inicio > now:
            continue
        if fecha_fin and fecha_fin < now:
            continue
        
        valid_sponsors.append(s)
    
    return valid_sponsors


@router.get("/{sponsor_id}", response_model=dict)
async def obtener_patrocinador(sponsor_id: str):
    """Obtener un patrocinador por ID"""
    from main import db
    
    sponsor = await db.pingpong_sponsors.find_one(
        {"sponsor_id": sponsor_id},
        {"_id": 0}
    )
    
    if not sponsor:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    
    return sponsor


@router.put("/{sponsor_id}", response_model=dict)
async def actualizar_patrocinador(sponsor_id: str, update: SponsorUpdate):
    """Actualizar un patrocinador"""
    from main import db
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    result = await db.pingpong_sponsors.update_one(
        {"sponsor_id": sponsor_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    
    sponsor = await db.pingpong_sponsors.find_one(
        {"sponsor_id": sponsor_id},
        {"_id": 0}
    )
    
    return {"success": True, "sponsor": sponsor}


@router.delete("/{sponsor_id}")
async def eliminar_patrocinador(sponsor_id: str):
    """Eliminar un patrocinador"""
    from main import db
    
    result = await db.pingpong_sponsors.delete_one({"sponsor_id": sponsor_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    
    return {"success": True, "message": "Patrocinador eliminado"}


# ============== LAYOUT CONFIG ==============

@router.get("/config/layout", response_model=dict)
async def obtener_layout_config():
    """Obtener configuración del layout de TV"""
    from main import db
    
    config = await db.pingpong_config.find_one(
        {"config_key": "tv_layout"},
        {"_id": 0}
    )
    
    if not config:
        # Return default config
        return {
            "config_key": "tv_layout",
            "mostrar_header_sponsors": True,
            "mostrar_banner_top": False,
            "mostrar_banner_bottom": True,
            "mostrar_sidebars": False,
            "header_sponsor_size": "120px",
            "banner_height": "100px",
            "sidebar_width": "200px",
            "espacios": DEFAULT_SPONSOR_SPACES
        }
    
    return config


@router.put("/config/layout", response_model=dict)
async def actualizar_layout_config(config: TVLayoutConfig):
    """Actualizar configuración del layout de TV"""
    from main import db
    
    config_doc = {
        "config_key": "tv_layout",
        **config.model_dump(),
        "fecha_actualizacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_config.update_one(
        {"config_key": "tv_layout"},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"success": True, "config": config_doc}


@router.put("/config/space/{space_id}", response_model=dict)
async def actualizar_espacio_config(space_id: str, space_config: SponsorSpaceConfig):
    """Actualizar configuración de un espacio específico"""
    from main import db
    
    # Get current config
    config = await db.pingpong_config.find_one({"config_key": "tv_layout"})
    
    if not config:
        config = {
            "config_key": "tv_layout",
            "espacios": DEFAULT_SPONSOR_SPACES.copy()
        }
    
    espacios = config.get("espacios", DEFAULT_SPONSOR_SPACES.copy())
    
    # Update or add the space
    space_found = False
    for i, espacio in enumerate(espacios):
        if espacio.get("space_id") == space_id:
            espacios[i] = space_config.model_dump()
            space_found = True
            break
    
    if not space_found:
        espacios.append(space_config.model_dump())
    
    config["espacios"] = espacios
    config["fecha_actualizacion"] = datetime.now(timezone.utc)
    
    await db.pingpong_config.update_one(
        {"config_key": "tv_layout"},
        {"$set": config},
        upsert=True
    )
    
    return {"success": True, "space": space_config.model_dump()}


# ============== PUBLIC ENDPOINTS FOR TV ==============

@router.get("/tv/display", response_model=dict)
async def obtener_sponsors_para_tv():
    """
    Endpoint optimizado para la pantalla TV
    Retorna todos los patrocinadores activos organizados por posición
    """
    from main import db
    
    now = datetime.now(timezone.utc)
    
    # Get all active sponsors
    sponsors = await db.pingpong_sponsors.find(
        {"activo": True},
        {"_id": 0}
    ).sort("orden", 1).to_list(100)
    
    # Filter by date and organize by position
    by_position = {
        "header_left": [],
        "header_right": [],
        "banner_top": [],
        "banner_bottom": [],
        "sidebar_left": [],
        "sidebar_right": []
    }
    
    for s in sponsors:
        fecha_inicio = s.get("fecha_inicio")
        fecha_fin = s.get("fecha_fin")
        
        if fecha_inicio and fecha_inicio > now:
            continue
        if fecha_fin and fecha_fin < now:
            continue
        
        posicion = s.get("posicion", "banner_bottom")
        if posicion in by_position:
            by_position[posicion].append(s)
    
    # Get layout config
    config = await db.pingpong_config.find_one(
        {"config_key": "tv_layout"},
        {"_id": 0}
    )
    
    if not config:
        config = {
            "mostrar_header_sponsors": True,
            "mostrar_banner_top": False,
            "mostrar_banner_bottom": True,
            "mostrar_sidebars": False,
            "espacios": DEFAULT_SPONSOR_SPACES
        }
    
    return {
        "sponsors": by_position,
        "layout": config,
        "timestamp": now.isoformat()
    }


# ============== UPLOAD LOGO ==============

@router.post("/{sponsor_id}/logo")
async def upload_logo(
    sponsor_id: str,
    file: UploadFile = File(...)
):
    """Subir logo para un patrocinador"""
    from main import db
    
    # Check if sponsor exists
    sponsor = await db.pingpong_sponsors.find_one({"sponsor_id": sponsor_id})
    if not sponsor:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    
    # Read and convert to base64
    content = await file.read()
    base64_content = base64.b64encode(content).decode()
    
    # Get content type
    content_type = file.content_type or "image/png"
    logo_base64 = f"data:{content_type};base64,{base64_content}"
    
    # Update sponsor
    await db.pingpong_sponsors.update_one(
        {"sponsor_id": sponsor_id},
        {"$set": {
            "logo_base64": logo_base64,
            "fecha_actualizacion": datetime.now(timezone.utc)
        }}
    )
    
    return {"success": True, "message": "Logo actualizado"}


# ============== BULK OPERATIONS ==============

@router.post("/bulk/reorder")
async def reordenar_patrocinadores(ordenes: Dict[str, int]):
    """
    Reordenar patrocinadores
    Body: {"sponsor_id_1": 0, "sponsor_id_2": 1, ...}
    """
    from main import db
    
    for sponsor_id, orden in ordenes.items():
        await db.pingpong_sponsors.update_one(
            {"sponsor_id": sponsor_id},
            {"$set": {"orden": orden}}
        )
    
    return {"success": True, "message": "Orden actualizado"}


@router.post("/bulk/toggle")
async def toggle_patrocinadores(sponsor_ids: List[str], activo: bool):
    """Activar/desactivar múltiples patrocinadores"""
    from main import db
    
    result = await db.pingpong_sponsors.update_many(
        {"sponsor_id": {"$in": sponsor_ids}},
        {"$set": {"activo": activo}}
    )
    
    return {"success": True, "modified": result.modified_count}
