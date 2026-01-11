"""
Store Module - Modelos para Sistema de Acudientes y Catálogos Privados
Sistema de vinculación estudiante-acudiente con roles y aprobaciones
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class AcudienteRol(str, Enum):
    """Roles de acudiente sobre un estudiante"""
    PRINCIPAL = "principal"      # Puede invitar, aprobar, gestionar todo
    AUTORIZADO = "autorizado"    # Puede comprar, ver historial
    SOLO_LECTURA = "solo_lectura"  # Solo puede ver


class VinculacionEstado(str, Enum):
    """Estado de una solicitud de vinculación"""
    PENDIENTE_ADMIN = "pendiente_admin"        # Esperando aprobación de admin
    PENDIENTE_PRINCIPAL = "pendiente_principal"  # Esperando aprobación del principal
    APROBADA = "aprobada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


class EstudianteEstado(str, Enum):
    """Estado del estudiante en el sistema"""
    ACTIVO = "activo"
    INACTIVO = "inactivo"
    GRADUADO = "graduado"
    RETIRADO = "retirado"


class ProductoEstadoDisponibilidad(str, Enum):
    """Estado de disponibilidad de un producto/texto"""
    DISPONIBLE = "disponible"          # Puede pedir normalmente
    CONSULTAR = "consultar"            # Debe consultar disponibilidad (ticket)
    PROXIMAMENTE = "proximamente"      # Próximamente disponible
    NO_DISPONIBLE = "no_disponible"    # No disponible
    AGOTADO = "agotado"               # Stock agotado


# ============== ESTUDIANTE SINCRONIZADO (Google Sheets) ==============

class EstudianteSincronizado(BaseModel):
    """Estudiante sincronizado desde Google Sheets de la escuela"""
    sync_id: str = Field(default_factory=lambda: f"sync_{uuid.uuid4().hex[:12]}")
    
    # Datos del Sheet
    numero_estudiante: str              # ID único de la escuela
    nombre_completo: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    grado: str
    seccion: Optional[str] = None
    
    # Metadata de sincronización
    sheet_id: str                       # ID del Google Sheet
    hoja_nombre: str                    # Nombre de la pestaña/tab
    fila_numero: int                    # Número de fila en el sheet
    
    # Estado
    estado: EstudianteEstado = EstudianteEstado.ACTIVO
    override_local: bool = False        # Si está marcado, no se actualiza desde Sheet
    
    # Datos adicionales del sheet (flexibles)
    datos_extra: Dict[str, Any] = {}
    
    # Timestamps
    fecha_sync: Optional[str] = None
    fecha_creacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None


class SyncConfig(BaseModel):
    """Configuración de sincronización con Google Sheets"""
    config_id: str = "google_sheets_sync_config"
    
    # Credenciales (se guardan encriptadas o en env)
    service_account_email: Optional[str] = None
    has_credentials: bool = False
    
    # Sheets configurados
    sheets: List[Dict[str, Any]] = []  # [{sheet_id, nombre, hojas: [{nombre, grado, columnas}]}]
    
    # Frecuencia de sync
    sync_habilitado: bool = False
    sync_frecuencia: str = "diario"    # "cada_hora", "cada_6_horas", "diario", "manual"
    ultima_sync: Optional[str] = None
    proxima_sync: Optional[str] = None
    
    # Mapeo de columnas por defecto
    columna_numero: str = "numero_estudiante"
    columna_nombre: str = "nombre_completo"
    columna_grado: str = "grado"
    columna_seccion: str = "seccion"
    columna_estado: str = "estado"


# ============== VINCULACIÓN ESTUDIANTE-ACUDIENTE ==============

class VinculacionEstudianteAcudiente(BaseModel):
    """Relación entre un estudiante y un acudiente"""
    vinculacion_id: str = Field(default_factory=lambda: f"vinc_{uuid.uuid4().hex[:12]}")
    
    # Partes de la vinculación
    estudiante_sync_id: str             # ID del estudiante sincronizado
    acudiente_cliente_id: str           # ID del cliente/usuario acudiente
    
    # Rol y estado
    rol: AcudienteRol = AcudienteRol.AUTORIZADO
    estado: VinculacionEstado = VinculacionEstado.PENDIENTE_ADMIN
    activo: bool = True
    
    # Quién creó/aprobó
    solicitado_por_id: str              # Quién pidió la vinculación
    solicitado_por_tipo: str = "acudiente"  # "acudiente", "admin"
    aprobado_por_id: Optional[str] = None
    aprobado_por_tipo: Optional[str] = None  # "admin", "principal"
    
    # Invitación (si fue por invitación del principal)
    invitado_por_id: Optional[str] = None
    email_invitacion: Optional[str] = None
    
    # Motivo de rechazo (si aplica)
    motivo_rechazo: Optional[str] = None
    
    # Timestamps
    fecha_solicitud: Optional[str] = None
    fecha_aprobacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None
    
    # Declaración de responsabilidad
    acepto_responsabilidad: bool = False
    fecha_acepto_responsabilidad: Optional[str] = None


class SolicitudVinculacion(BaseModel):
    """Solicitud para vincular un acudiente a un estudiante"""
    numero_estudiante: str              # Número del estudiante (de la escuela)
    relacion: str = "acudiente"         # "padre", "madre", "tutor", "acudiente"
    acepto_responsabilidad: bool = True
    mensaje: Optional[str] = None       # Mensaje opcional para admin


class InvitacionAcudiente(BaseModel):
    """Invitación del principal a otro acudiente"""
    email_invitado: str
    nombre_invitado: Optional[str] = None
    rol_asignado: AcudienteRol = AcudienteRol.AUTORIZADO
    mensaje: Optional[str] = None


# ============== CATÁLOGO PRIVADO ==============

class CatalogoPrivado(BaseModel):
    """Catálogo privado con condiciones de acceso"""
    catalogo_id: str = Field(default_factory=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    
    # Info básica
    nombre: Dict[str, str]              # Multi-idioma: {"es": "...", "en": "..."}
    descripcion: Optional[Dict[str, str]] = None
    icono: str = "📚"
    
    # Tipo y configuración
    tipo: str = "texto_escolar"         # "texto_escolar", "uniforme", "material", etc.
    activo: bool = True
    visible: bool = True
    
    # Condiciones de acceso
    requiere_estudiante_vinculado: bool = True
    requiere_matricula_verificada: bool = True
    grados_permitidos: Optional[List[str]] = None  # None = todos
    
    # Reglas de compra
    limite_por_estudiante: int = 1      # Cuántas veces puede comprar el mismo producto
    permite_reposicion: bool = True     # Si permite comprar de nuevo (con ticket)
    
    # Comisión (para pago con tarjeta)
    comision_tipo: str = "porcentaje"   # "porcentaje", "fijo", "por_item"
    comision_valor: float = 5.0         # 5% o $5 según tipo
    comision_minima: float = 2.0        # Mínimo por pedido
    
    # Monday.com integration
    monday_board_id: Optional[str] = None
    
    # Timestamps
    fecha_creacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None


# ============== PRODUCTO CON ESTADO DE DISPONIBILIDAD ==============

class ProductoTextoEscolar(BaseModel):
    """Extensión de producto para textos escolares"""
    libro_id: str = Field(default_factory=lambda: f"libro_{uuid.uuid4().hex[:12]}")
    
    # Info básica
    codigo: str                         # Código del producto/libro
    nombre: str
    descripcion: Optional[str] = None
    
    # Clasificación
    categoria: str = "texto_escolar"
    catalogo_id: Optional[str] = None   # Catálogo al que pertenece
    grados: List[str] = []              # Grados para los que aplica
    materia: Optional[str] = None
    
    # Precio
    precio: float
    precio_oferta: Optional[float] = None
    
    # Inventario
    cantidad_inventario: int = 0
    cantidad_reservada: int = 0         # Reservadas en pedidos pendientes
    
    # Estado de disponibilidad (control manual por admin)
    estado_disponibilidad: ProductoEstadoDisponibilidad = ProductoEstadoDisponibilidad.DISPONIBLE
    nota_estado: Optional[Dict[str, str]] = None  # Multi-idioma
    fecha_cambio_estado: Optional[str] = None
    
    # Editorial
    editorial: Optional[str] = None
    isbn: Optional[str] = None
    ano_edicion: Optional[str] = None
    
    # Multimedia
    imagen_url: Optional[str] = None
    imagenes: List[str] = []
    
    # Flags
    activo: bool = True
    destacado: bool = False
    
    # Metadata del Sheet (si viene de Google Sheets)
    sheet_sync_id: Optional[str] = None
    
    # Timestamps
    fecha_creacion: Optional[str] = None
    fecha_actualizacion: Optional[str] = None


class ActualizarEstadoProducto(BaseModel):
    """Actualizar estado de disponibilidad de un producto"""
    estado_disponibilidad: ProductoEstadoDisponibilidad
    nota_estado: Optional[Dict[str, str]] = None  # {"es": "...", "en": "..."}


# ============== HISTORIAL DE COMPRAS POR ESTUDIANTE ==============

class CompraEstudiante(BaseModel):
    """Registro de compra de un texto por un estudiante"""
    compra_id: str = Field(default_factory=lambda: f"compra_{uuid.uuid4().hex[:12]}")
    
    estudiante_sync_id: str
    libro_id: str
    pedido_id: str
    
    # Quién compró
    comprado_por_cliente_id: str
    comprado_por_nombre: str
    
    # Info del momento de compra
    precio_compra: float
    cantidad: int = 1
    
    # Timestamps
    fecha_compra: Optional[str] = None


# ============== SOLICITUD DE REPOSICIÓN ==============

class SolicitudReposicion(BaseModel):
    """Solicitud para comprar un texto que ya se compró (pérdida, daño, etc.)"""
    solicitud_id: str = Field(default_factory=lambda: f"repos_{uuid.uuid4().hex[:12]}")
    
    estudiante_sync_id: str
    libro_id: str
    acudiente_cliente_id: str
    
    # Motivo
    motivo: str                         # "perdida", "dano", "otro"
    descripcion: Optional[str] = None
    
    # Estado
    estado: str = "pendiente"           # "pendiente", "aprobada", "rechazada"
    aprobada_por_id: Optional[str] = None
    motivo_rechazo: Optional[str] = None
    
    # Timestamps
    fecha_solicitud: Optional[str] = None
    fecha_resolucion: Optional[str] = None
