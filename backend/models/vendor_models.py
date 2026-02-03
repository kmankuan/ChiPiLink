"""
Vendor and Multi-Store Models
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class VendorStatus(str, Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    SUSPENDIDO = "suspendido"
    RECHAZADO = "rechazado"

class TeamRole(str, Enum):
    PROPIETARIO = "propietario"
    ADMINISTRADOR = "administrador"
    VENDEDOR = "vendedor"
    SOPORTE = "soporte"

class YappyAmbiente(str, Enum):
    PRUEBAS = "pruebas"
    PRODUCCION = "produccion"

# Permission Sets
ROLE_PERMISSIONS = {
    TeamRole.PROPIETARIO: {
        "gestionar_productos": True,
        "gestionar_pedidos": True,
        "gestionar_configuracion": True,
        "gestionar_equipo": True,
        "ver_reportes": True,
        "gestionar_pagos": True
    },
    TeamRole.ADMINISTRADOR: {
        "gestionar_productos": True,
        "gestionar_pedidos": True,
        "gestionar_configuracion": True,
        "gestionar_equipo": False,
        "ver_reportes": True,
        "gestionar_pagos": True
    },
    TeamRole.VENDEDOR: {
        "gestionar_productos": True,
        "gestionar_pedidos": True,
        "gestionar_configuracion": False,
        "gestionar_equipo": False,
        "ver_reportes": True,
        "gestionar_pagos": False
    },
    TeamRole.SOPORTE: {
        "gestionar_productos": False,
        "gestionar_pedidos": True,
        "gestionar_configuracion": False,
        "gestionar_equipo": False,
        "ver_reportes": True,
        "gestionar_pagos": False
    }
}

class VendorContacto(BaseModel):
    email: str = ""
    telefono: str = ""
    direccion: str = ""

class VendorRedesSociales(BaseModel):
    facebook: str = ""
    instagram: str = ""
    whatsapp: str = ""

class VendorConfiguracion(BaseModel):
    campos_requeridos: List[str] = ["name", "email"]
    comision_activa: bool = False
    porcentaje_comision: float = 0
    yappy_configurado: bool = False

class VendorCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    descripcion: str = ""
    logo_url: str = ""
    banner_url: str = ""
    contacto: VendorContacto = VendorContacto()
    redes_sociales: VendorRedesSociales = VendorRedesSociales()

class VendorUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    contacto: Optional[VendorContacto] = None
    redes_sociales: Optional[VendorRedesSociales] = None

class YappyConfig(BaseModel):
    merchant_id: str = ""
    secret_key: str = ""
    url_domain: str = ""
    active: bool = False
    ambiente: YappyAmbiente = YappyAmbiente.PRUEBAS

class PaymentConfigUpdate(BaseModel):
    yappy: Optional[YappyConfig] = None
    transferencia_bancaria: Optional[Dict] = None

class TeamMemberCreate(BaseModel):
    email: str
    rol: TeamRole = TeamRole.VENDEDOR
    permisos_personalizados: Optional[Dict[str, bool]] = None

class TeamMemberUpdate(BaseModel):
    rol: Optional[TeamRole] = None
    permisos_personalizados: Optional[Dict[str, bool]] = None
    estado: Optional[str] = None

class VendorProduct(BaseModel):
    name: str
    descripcion: str = ""
    price: float
    precio_descuento: Optional[float] = None
    imagenes: List[str] = []
    categoria: str = ""
    subcategoria: str = ""
    inventario: int = 0
    active: bool = True
    featured: bool = False

class VendorSettingsUpdate(BaseModel):
    registro_libre: Optional[bool] = None
    requiere_aprobacion: Optional[bool] = None
    comision_global_activa: Optional[bool] = None
    comision_global_porcentaje: Optional[float] = None
    campos_vendor_requeridos: Optional[Dict[str, Dict[str, bool]]] = None

# Platform Store (Unatienda) Models
class PlatformStoreConfig(BaseModel):
    name: str = "Unatienda"
    descripcion: str = "Tienda oficial de la plataforma"
    logo_url: str = ""
    yappy_merchant_id: str = ""
    yappy_secret_key: str = ""
    yappy_url_domain: str = ""
    yappy_active: bool = False
    yappy_ambiente: YappyAmbiente = YappyAmbiente.PRUEBAS
