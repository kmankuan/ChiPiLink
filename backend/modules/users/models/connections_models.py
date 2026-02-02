"""
ChiPi Users Module - Models for Connections and Capabilities System
System for relationships between users, wallet transfers and invitations
"""
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class EstadoCuenta(str, Enum):
    """User account status"""
    ACTIVO = "activo"       # User with credentials, manages their own account
    ACUDIDO = "acudido"     # User created by guardian/admin, managed account


class TipoRelacion(str, Enum):
    """Main relationship categories"""
    FAMILIAR = "familiar"
    SOCIAL = "social"
    ESPECIAL = "especial"


class SubtipoFamiliar(str, Enum):
    """Family relationship subtypes"""
    PADRE = "padre"
    MADRE = "madre"
    HIJO = "hijo"
    HIJA = "hija"
    ABUELO = "abuelo"
    ABUELA = "abuela"
    TIO = "tio"
    TIA = "tia"
    PRIMO = "primo"
    PRIMA = "prima"
    HERMANO = "hermano"
    HERMANA = "hermana"
    OTRO_FAMILIAR = "otro_familiar"


class SubtipoSocial(str, Enum):
    """Social relationship subtypes"""
    AMIGO = "amigo"
    CONOCIDO = "conocido"
    COMPANERO_TRABAJO = "companero_trabajo"
    COMPANERO_CLUB = "companero_club"
    VECINO = "vecino"


class SubtipoEspecial(str, Enum):
    """Special relationship subtypes"""
    ACUDIENTE = "acudiente"     # Legal guardian
    ACUDIDO = "acudido"         # Under guardianship
    TUTOR = "tutor"


class EstadoConexion(str, Enum):
    """Connection status between users"""
    PENDIENTE = "pendiente"
    ACTIVO = "activo"
    RECHAZADO = "rechazado"
    BLOQUEADO = "bloqueado"


class EstadoSolicitud(str, Enum):
    """Connection request status"""
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    RECHAZADA = "rechazada"
    CANCELADA = "cancelada"


class TipoCapacidad(str, Enum):
    """Capability/ability types"""
    PREDETERMINADA = "predeterminada"       # Automatic on registration
    POR_SUSCRIPCION = "por_suscripcion"     # Automatic on subscription
    BENEFICIO_EXTENDIDO = "beneficio_extendido"  # Granted by admin as courtesy
    SOLICITADA = "solicitada"               # User requests, admin approves


class EstadoInvitacion(str, Enum):
    """Status of invitation to unregistered user"""
    PENDIENTE = "pendiente"
    ACEPTADA = "aceptada"
    EXPIRADA = "expirada"
    CANCELADA = "cancelada"


# ============== PERMISSION MODELS ==============

class PermisosConexion(BaseModel):
    """Permissions a user has over another through their connection"""
    transferir_wallet: bool = False
    ver_wallet: bool = False
    recargar_wallet: bool = False
    recibir_alertas: bool = False
    limite_transferencia_diario: Optional[float] = None


# ============== MODELOS DE CONEXIÓN ==============

class Conexion(BaseModel):
    """Conexión entre dos usuarios"""
    conexion_id: str = Field(default_factory=lambda: f"con_{uuid.uuid4().hex[:12]}")
    user_id: str                    # User conectado
    tipo: TipoRelacion
    subtipo: str                    # Puede ser cualquier subtipo
    etiqueta: Optional[str] = None  # Etiqueta personalizada (ej: "Mi hijo mayor")
    permisos: PermisosConexion = Field(default_factory=PermisosConexion)
    estado: EstadoConexion = EstadoConexion.ACTIVO
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    notas: Optional[str] = None


class ConexionCreate(BaseModel):
    """Request para crear conexión"""
    user_id_destino: str
    tipo: TipoRelacion
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None   # Message para solicitud


class ConexionUpdate(BaseModel):
    """Request para actualizar conexión"""
    etiqueta: Optional[str] = None
    permisos: Optional[PermisosConexion] = None
    notas: Optional[str] = None


# ============== MODELOS DE SOLICITUD ==============

class SolicitudConexion(BaseModel):
    """Solicitud de conexión entre usuarios"""
    solicitud_id: str = Field(default_factory=lambda: f"sol_{uuid.uuid4().hex[:12]}")
    de_usuario_id: str
    de_usuario_nombre: Optional[str] = None
    para_usuario_id: str
    para_usuario_nombre: Optional[str] = None
    tipo: TipoRelacion
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None
    estado: EstadoSolicitud = EstadoSolicitud.PENDIENTE
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    respondido_en: Optional[str] = None
    respondido_por: Optional[str] = None  # user_id o "admin:user_id"


class SolicitudCreate(BaseModel):
    """Request para crear solicitud de conexión"""
    para_usuario_id: str
    tipo: TipoRelacion
    subtipo: str
    etiqueta: Optional[str] = None
    mensaje: Optional[str] = None


# ============== MODELOS DE INVITACIÓN ==============

class Invitacion(BaseModel):
    """Invitación a usuario no registrado"""
    invitacion_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    invitado_por_id: str
    invitado_por_nombre: Optional[str] = None
    email_destino: EmailStr
    nombre_destino: Optional[str] = None
    mensaje: Optional[str] = None
    tipo_relacion_propuesta: Optional[TipoRelacion] = None
    subtipo_propuesto: Optional[str] = None
    monto_transferir: Optional[float] = None  # Si quería transferir al invitarlo
    estado: EstadoInvitacion = EstadoInvitacion.PENDIENTE
    token: str = Field(default_factory=lambda: uuid.uuid4().hex)
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    expira_en: Optional[str] = None
    aceptado_en: Optional[str] = None
    usuario_creado_id: Optional[str] = None  # ID ofl usuario cuando se registre


class InvitacionCreate(BaseModel):
    """Request para crear invitación"""
    email: EmailStr
    nombre: Optional[str] = None
    mensaje: Optional[str] = None
    tipo_relacion: Optional[TipoRelacion] = None
    subtipo: Optional[str] = None
    monto_transferir: Optional[float] = None


# ============== MODELOS DE CAPACIDAD ==============

class CapacidadUsuario(BaseModel):
    """Capacidad/habilidad activa de un usuario"""
    capacidad_id: str
    tipo: TipoCapacidad
    activa: bool = True
    origen: Optional[str] = None            # ej: "suscripcion_pinpanclub"
    otorgado_por: Optional[str] = None      # user_id de admin si fue manual
    motivo: Optional[str] = None            # Razón del otorgamiento
    fecha_activacion: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    fecha_expiracion: Optional[str] = None


class CapacidadConfig(BaseModel):
    """Configuración de una capacidad (admin configurable)"""
    capacidad_id: str = Field(default_factory=lambda: f"cap_{uuid.uuid4().hex[:8]}")
    nombre: Dict[str, str]          # {"es": "Árbitro", "en": "Referee"}
    descripcion: Dict[str, str] = {}
    icono: str = "⚡"
    color: str = "#6366f1"
    tipo: TipoCapacidad
    membresia_requerida: Optional[str] = None   # ID of membresía si requiere
    auto_asignar_a: List[str] = []              # ["suscriptor", "acudido"]
    puede_extender_a: List[str] = []            # ["acudiente"] - admin puede extender
    requiere_aprobacion: bool = False
    activa: bool = True
    orden: int = 0


class CapacidadSolicitud(BaseModel):
    """Solicitud de usuario para obtener una capacidad"""
    solicitud_id: str = Field(default_factory=lambda: f"capsol_{uuid.uuid4().hex[:12]}")
    user_id: str
    capacidad_id: str
    motivo: Optional[str] = None
    estado: EstadoSolicitud = EstadoSolicitud.PENDIENTE
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    respondido_en: Optional[str] = None
    respondido_por: Optional[str] = None


# ============== MODELOS DE ACUDIDO ==============

class AcudidoCreate(BaseModel):
    """Request para crear usuario acudido"""
    nombre: str
    apellido: Optional[str] = None
    email: Optional[EmailStr] = None        # Opcional para menores
    telefono: Optional[str] = None
    fecha_nacimiento: Optional[str] = None
    genero: Optional[str] = None
    notas: Optional[str] = None
    # Suscripción inicial opcional
    membresia_id: Optional[str] = None
    plan_id: Optional[str] = None


# ============== MODELOS DE TRANSFERENCIA ==============

class TransferenciaWallet(BaseModel):
    """Transferencia de wallet entre usuarios"""
    transferencia_id: str = Field(default_factory=lambda: f"txf_{uuid.uuid4().hex[:12]}")
    de_usuario_id: str
    para_usuario_id: str
    monto: float
    moneda: str = "USD"
    mensaje: Optional[str] = None
    tipo_relacion: Optional[str] = None     # Relationship entre usuarios
    estado: str = "completada"
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TransferenciaCreate(BaseModel):
    """Request para crear transferencia"""
    para_usuario_id: str
    monto: float
    mensaje: Optional[str] = None


# ============== MODELOS DE ALERTA ==============

class AlertaWallet(BaseModel):
    """Alerta de saldo insuficiente"""
    alerta_id: str = Field(default_factory=lambda: f"alrt_{uuid.uuid4().hex[:12]}")
    usuario_id: str                     # User que intentó comprar
    acudientes_ids: List[str] = []      # Acudientes a notificar
    monto_requerido: float
    saldo_actual: float
    descripcion: str
    estado: str = "pendiente"           # pendiente | resuelta | ignorada
    creado_en: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    resuelta_en: Optional[str] = None


# ============== CONFIGURACIÓN DE PERMISOS POR RELACIÓN ==============

class ConfigPermisosRelacion(BaseModel):
    """Configuración de permisos por defecto para un tipo de relación"""
    tipo: TipoRelacion
    subtipo: str
    permisos_default: PermisosConexion
    descripcion: Optional[str] = None


# ============== CONFIGURACIÓN DE MARKETING ==============

class MarketingConfig(BaseModel):
    """Configuración de marketing para un usuario"""
    mostrar_servicios: bool = True
    servicios_sugeridos: Optional[List[str]] = None  # null = todos
    servicios_excluidos: List[str] = []


# ============== FUNCIONES HELPER ==============

def get_default_permisos_por_relacion() -> List[Dict]:
    """Retorna configuración por defecto de permisos por relación"""
    return [
        {
            "tipo": "especial",
            "subtipo": "acudiente",
            "permisos_default": {
                "transferir_wallet": True,
                "ver_wallet": True,
                "recargar_wallet": True,
                "recibir_alertas": True,
                "limite_transferencia_diario": None
            },
            "descripcion": "Acudiente tiene acceso completo al acudido"
        },
        {
            "tipo": "especial",
            "subtipo": "acudido",
            "permisos_default": {
                "transferir_wallet": False,
                "ver_wallet": False,
                "recargar_wallet": False,
                "recibir_alertas": False,
                "limite_transferencia_diario": None
            },
            "descripcion": "Acudido no tiene permisos sobre acudiente"
        },
        {
            "tipo": "familiar",
            "subtipo": "padre",
            "permisos_default": {
                "transferir_wallet": True,
                "ver_wallet": False,
                "recargar_wallet": True,
                "recibir_alertas": False,
                "limite_transferencia_diario": None
            }
        },
        {
            "tipo": "familiar",
            "subtipo": "tio",
            "permisos_default": {
                "transferir_wallet": True,
                "ver_wallet": False,
                "recargar_wallet": True,
                "recibir_alertas": False,
                "limite_transferencia_diario": 500
            }
        },
        {
            "tipo": "social",
            "subtipo": "amigo",
            "permisos_default": {
                "transferir_wallet": True,
                "ver_wallet": False,
                "recargar_wallet": False,
                "recibir_alertas": False,
                "limite_transferencia_diario": 100
            }
        },
        {
            "tipo": "social",
            "subtipo": "conocido",
            "permisos_default": {
                "transferir_wallet": True,
                "ver_wallet": False,
                "recargar_wallet": False,
                "recibir_alertas": False,
                "limite_transferencia_diario": 50
            }
        }
    ]


def get_default_capacidades() -> List[Dict]:
    """Retorna capacidades por defecto del sistema"""
    return [
        {
            "capacidad_id": "cliente",
            "nombre": {"es": "Cliente", "en": "Customer", "zh": "客户"},
            "descripcion": {"es": "Puede comprar productos y servicios", "en": "Can buy products and services"},
            "icono": "🛒",
            "color": "#10b981",
            "tipo": "predeterminada",
            "membresia_requerida": None,
            "auto_asignar_a": ["todos"],
            "puede_extender_a": [],
            "requiere_aprobacion": False,
            "activa": True,
            "orden": 1
        },
        {
            "capacidad_id": "jugador_ranking",
            "nombre": {"es": "Jugador en Ranking", "en": "Ranked Player", "zh": "排名玩家"},
            "descripcion": {"es": "Aparece in ranking oficial de PinpanClub", "en": "Appears in official PinpanClub ranking"},
            "icono": "🏓",
            "color": "#f59e0b",
            "tipo": "por_suscripcion",
            "membresia_requerida": "pinpanclub",
            "auto_asignar_a": ["suscriptor"],
            "puede_extender_a": ["acudiente"],
            "requiere_aprobacion": False,
            "activa": True,
            "orden": 2
        },
        {
            "capacidad_id": "arbitro",
            "nombre": {"es": "Árbitro", "en": "Referee", "zh": "裁判"},
            "descripcion": {"es": "Puede arbitrar partidos oficiales", "en": "Can referee official matches"},
            "icono": "🏅",
            "color": "#8b5cf6",
            "tipo": "solicitada",
            "membresia_requerida": "pinpanclub",
            "auto_asignar_a": [],
            "puede_extender_a": ["acudiente", "suscriptor"],
            "requiere_aprobacion": True,
            "activa": True,
            "orden": 3
        },
        {
            "capacidad_id": "acudiente",
            "nombre": {"es": "Acudiente", "en": "Guardian", "zh": "监护人"},
            "descripcion": {"es": "Puede vincular y gestionar acudidos", "en": "Can link and manage dependents"},
            "icono": "👨‍👩‍👧",
            "color": "#3b82f6",
            "tipo": "solicitada",
            "membresia_requerida": None,
            "auto_asignar_a": [],
            "puede_extender_a": [],
            "requiere_aprobacion": False,  # Auto-aprobado al crear acudido
            "activa": True,
            "orden": 4
        },
        {
            "capacidad_id": "estudiante_tutoria",
            "nombre": {"es": "Estudiante Tutoría", "en": "Tutoring Student", "zh": "辅导学生"},
            "descripcion": {"es": "Inscrito en programa de Tutoría Integral", "en": "Enrolled in Integral Tutoring program"},
            "icono": "📚",
            "color": "#ec4899",
            "tipo": "por_suscripcion",
            "membresia_requerida": "tutoria_integral",
            "auto_asignar_a": ["suscriptor"],
            "puede_extender_a": [],
            "requiere_aprobacion": False,
            "activa": True,
            "orden": 5
        }
    ]


def get_default_membresias() -> List[Dict]:
    """Retorna membresías (productos) por defecto del sistema"""
    return [
        {
            "membresia_id": "pinpanclub",
            "nombre": {"es": "PinpanClub", "en": "PinpanClub", "zh": "乒乓俱乐部"},
            "descripcion": {"es": "Club de Tenis de Mesa", "en": "Table Tennis Club"},
            "icono": "🏓",
            "color": "#f59e0b",
            "planes": [
                {"plan_id": "pase_6", "nombre": "Pase 6 Visitas", "precio": 165, "tipo": "visits", "visitas": 6, "dias_validez": 60},
                {"plan_id": "pase_12", "nombre": "Pase 12 Visitas", "precio": 300, "tipo": "visits", "visitas": 12, "dias_validez": 90},
                {"plan_id": "ilimitado_mensual", "nombre": "Ilimitado Mensual", "precio": 150, "tipo": "unlimited", "dias_validez": 30},
                {"plan_id": "prueba", "nombre": "Prueba Gratis", "precio": 0, "tipo": "trial", "visitas": 2, "dias_validez": 14},
                {"plan_id": "cortesia", "nombre": "Cortesía", "precio": 0, "tipo": "courtesy", "dias_validez": 365}
            ],
            "activa": True,
            "orden": 1
        },
        {
            "membresia_id": "tutoria_integral",
            "nombre": {"es": "Tutoría Integral", "en": "Integral Tutoring", "zh": "综合辅导"},
            "descripcion": {"es": "Programa de apoyo académico", "en": "Academic support program"},
            "icono": "📚",
            "color": "#ec4899",
            "planes": [
                {"plan_id": "mensual", "nombre": "Plan Mensual", "precio": 200, "tipo": "unlimited", "dias_validez": 30},
                {"plan_id": "trimestral", "nombre": "Plan Trimestral", "precio": 500, "tipo": "unlimited", "dias_validez": 90},
                {"plan_id": "anual", "nombre": "Plan Anual", "precio": 1800, "tipo": "unlimited", "dias_validez": 365}
            ],
            "activa": True,
            "orden": 2
        }
    ]
