"""
ChiPi Users Module - Modelos para sistema de usuarios avanzado
Sistema altamente configurable con tipos de usuario, perfiles dinámicos y relaciones
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class UserTypeCategory(str, Enum):
    """Categorías base de tipos de usuario"""
    CUSTOMER = "customer"           # Cliente regular (compra en tienda)
    MEMBER = "member"               # Miembro del club
    GUARDIAN = "guardian"           # Acudiente/Padre
    DEPENDENT = "dependent"         # Dependiente (niño, etc.)
    STAFF = "staff"                 # Personal del club
    PARTNER = "partner"             # Socio/Partner
    SPECIAL = "special"             # Cortesía/Especial


class RelationshipType(str, Enum):
    """Tipos de relación entre usuarios"""
    PARENT_CHILD = "parent_child"           # Padre ↔ Hijo
    GUARDIAN_DEPENDENT = "guardian_dependent"  # Acudiente ↔ Dependiente
    TUTOR_STUDENT = "tutor_student"         # Tutor ↔ Estudiante
    SPONSOR_BENEFICIARY = "sponsor_beneficiary"  # Patrocinador ↔ Beneficiario
    CAREGIVER_WARD = "caregiver_ward"       # Cuidador ↔ A cargo
    FAMILY = "family"                        # Familia general
    CUSTOM = "custom"                        # Personalizado


class ProfileFieldType(str, Enum):
    """Tipos de campo para perfiles dinámicos"""
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    EMAIL = "email"
    PHONE = "phone"
    DATE = "date"
    DATETIME = "datetime"
    SELECT = "select"
    MULTISELECT = "multiselect"
    CHECKBOX = "checkbox"
    IMAGE = "image"
    FILE = "file"
    URL = "url"
    ADDRESS = "address"
    JSON = "json"


class MembershipType(str, Enum):
    """Tipos de membresía"""
    VISITS = "visits"           # Por visitas (ej: 12 visitas)
    UNLIMITED = "unlimited"     # Ilimitado por tiempo
    CREDITS = "credits"         # Por créditos/puntos
    COURTESY = "courtesy"       # Cortesía/Regalo
    TRIAL = "trial"             # Prueba


# ============== CONFIGURACIÓN DE TIPOS DE USUARIO ==============

class UserTypeConfig(BaseModel):
    """Configuración de un tipo de usuario"""
    type_id: str = Field(default_factory=lambda: f"utype_{uuid.uuid4().hex[:8]}")
    
    # Nombres multi-idioma
    name: Dict[str, str]  # {"es": "Cliente", "en": "Customer", "zh": "客户"}
    description: Dict[str, str] = {}
    
    # Categoría base
    category: UserTypeCategory
    
    # Icono y color para UI
    icon: str = "👤"
    color: str = "#6366f1"  # Indigo por defecto
    
    # Permisos y acceso
    can_purchase: bool = True              # Puede comprar
    can_have_wallet: bool = True           # Tiene billetera
    can_have_membership: bool = False      # Puede tener membresía
    can_be_guardian: bool = False          # Puede ser acudiente
    can_have_guardian: bool = False        # Puede tener acudiente
    can_earn_points: bool = True           # Puede ganar ChipiPoints
    can_transfer_points: bool = True       # Puede transferir puntos
    
    # Módulos accesibles
    accessible_modules: List[str] = []     # ["store", "pinpanclub", "community", etc.]
    
    # Campos de perfil requeridos para este tipo
    required_profile_fields: List[str] = []
    optional_profile_fields: List[str] = []
    
    # Si los consumos se cargan a otro usuario
    charges_to_guardian: bool = False
    
    # Restricciones
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    requires_guardian: bool = False
    
    # Estado
    is_active: bool = True
    is_default: bool = False  # Tipo por defecto para nuevos usuarios
    
    # Ordenamiento
    sort_order: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== CAMPOS DE PERFIL DINÁMICOS ==============

class ProfileFieldConfig(BaseModel):
    """Configuración de un campo de perfil"""
    field_id: str = Field(default_factory=lambda: f"field_{uuid.uuid4().hex[:8]}")
    
    # Identificador del campo (snake_case)
    field_key: str  # Ej: "emergency_contact", "school_name"
    
    # Nombres multi-idioma
    label: Dict[str, str]  # {"es": "Contacto de Emergencia", ...}
    placeholder: Dict[str, str] = {}
    help_text: Dict[str, str] = {}
    
    # Tipo de campo
    field_type: ProfileFieldType
    
    # Opciones para select/multiselect
    options: List[Dict[str, str]] = []  # [{"value": "opt1", "label": {"es": "Opción 1"}}]
    
    # Validaciones
    is_required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex para validación
    
    # Visibilidad
    is_public: bool = False         # Visible para otros usuarios
    is_searchable: bool = False     # Indexado para búsqueda
    show_in_list: bool = False      # Mostrar en listados
    show_in_card: bool = True       # Mostrar en tarjeta de perfil
    
    # Aplicable a qué tipos de usuario
    applicable_user_types: List[str] = []  # Vacío = todos
    
    # Sección/grupo
    section: str = "general"  # general, contact, medical, preferences, etc.
    
    # Ordenamiento
    sort_order: int = 0
    
    # Estado
    is_active: bool = True
    
    created_at: Optional[str] = None


# ============== PERFIL DE USUARIO ==============

class UserProfile(BaseModel):
    """Perfil extendido de usuario"""
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:8]}")
    
    # Enlace al usuario de auth
    user_id: str  # cliente_id del sistema de auth
    
    # Tipo de usuario
    user_type_id: str
    user_type_info: Optional[Dict] = None  # Cache de info del tipo
    
    # Datos básicos (siempre presentes)
    display_name: Optional[str] = None     # Nombre para mostrar/apodo
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    
    # Fecha de nacimiento (para calcular edad)
    birth_date: Optional[str] = None       # ISO format
    
    # Campos dinámicos (los valores de ProfileFieldConfig)
    custom_fields: Dict[str, Any] = {}     # {"emergency_contact": "...", "school_name": "..."}
    
    # Preferencias
    language: str = "es"
    timezone: str = "America/Panama"
    notifications_enabled: bool = True
    notification_preferences: Dict[str, bool] = {}
    
    # Etiquetas/tags para categorización
    tags: List[str] = []
    
    # Notas internas (solo admin)
    internal_notes: Optional[str] = None
    
    # Estado
    is_verified: bool = False
    is_active: bool = True
    
    # Estadísticas
    total_visits: int = 0
    total_purchases: int = 0
    total_points_earned: int = 0
    total_points_spent: int = 0
    
    # Timestamps
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_activity: Optional[str] = None


# ============== RELACIONES ENTRE USUARIOS ==============

class UserRelationship(BaseModel):
    """Relación entre dos usuarios"""
    relationship_id: str = Field(default_factory=lambda: f"rel_{uuid.uuid4().hex[:8]}")
    
    # Usuarios involucrados
    user_id_1: str          # Usuario principal (ej: padre)
    user_id_2: str          # Usuario secundario (ej: hijo)
    
    # Tipo de relación
    relationship_type: RelationshipType
    custom_type_name: Optional[Dict[str, str]] = None  # Para tipo CUSTOM
    
    # Roles en la relación
    role_1: Dict[str, str] = {}  # {"es": "Padre", "en": "Father"}
    role_2: Dict[str, str] = {}  # {"es": "Hijo", "en": "Child"}
    
    # Permisos
    can_view_profile: bool = True
    can_view_wallet: bool = False
    can_view_activity: bool = True
    can_pay_for: bool = False       # Usuario 1 puede pagar por usuario 2
    can_manage: bool = False        # Usuario 1 puede gestionar usuario 2
    receives_notifications: bool = True  # Usuario 1 recibe notificaciones de usuario 2
    
    # Responsabilidad financiera
    is_financial_responsible: bool = False  # Usuario 1 es responsable de pagos de usuario 2
    spending_limit: Optional[float] = None  # Límite de gasto (si aplica)
    
    # Verificación
    is_verified: bool = False       # Relación verificada por admin
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    
    # Estado
    is_active: bool = True
    
    # Metadata
    notes: Optional[str] = None
    created_at: Optional[str] = None
    created_by: Optional[str] = None


# ============== MEMBRESÍAS ==============

class MembershipPlanConfig(BaseModel):
    """Configuración de un plan de membresía"""
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    
    # Nombres multi-idioma
    name: Dict[str, str]  # {"es": "Recarga 12 Visitas", ...}
    description: Dict[str, str] = {}
    
    # Tipo de membresía
    membership_type: MembershipType
    
    # Precio y valor
    price: float                    # Precio en USD
    price_in_points: Optional[int] = None  # Precio en ChipiPoints (alternativo)
    
    # Configuración según tipo
    total_visits: Optional[int] = None      # Para VISITS
    duration_days: Optional[int] = None     # Para UNLIMITED
    total_credits: Optional[int] = None     # Para CREDITS
    
    # Restricciones
    applicable_user_types: List[str] = []   # Tipos de usuario que pueden comprar
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    
    # Beneficios adicionales
    bonus_points: int = 0           # ChipiPoints de regalo
    discount_percentage: float = 0  # Descuento en tienda
    
    # Transferibilidad
    is_transferable: bool = False   # Se puede transferir a otro usuario
    is_shareable: bool = False      # Se puede compartir (familia)
    
    # Renovación
    auto_renew: bool = False
    renewal_discount: float = 0     # Descuento por renovar
    
    # Estado
    is_active: bool = True
    is_featured: bool = False       # Destacado en UI
    
    # Ordenamiento
    sort_order: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserMembership(BaseModel):
    """Membresía activa de un usuario"""
    membership_id: str = Field(default_factory=lambda: f"memb_{uuid.uuid4().hex[:8]}")
    
    # Usuario y plan
    user_id: str
    plan_id: str
    plan_info: Optional[Dict] = None  # Cache de info del plan
    
    # Estado
    status: str = "active"  # active, expired, cancelled, suspended
    
    # Valores actuales
    visits_remaining: Optional[int] = None
    credits_remaining: Optional[int] = None
    
    # Fechas
    start_date: str
    end_date: Optional[str] = None
    
    # Compra
    purchase_price: float
    paid_with_points: bool = False
    transaction_id: Optional[str] = None
    
    # Patrocinador (si es cortesía)
    sponsored_by: Optional[str] = None  # user_id del patrocinador
    sponsor_note: Optional[str] = None
    
    # Renovación
    is_auto_renew: bool = False
    renewal_count: int = 0
    
    # Historial
    usage_history: List[Dict] = []  # Lista de usos con fecha y notas
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== VISITAS/CHECK-INS ==============

class VisitType(str, Enum):
    """Tipos de visita"""
    REGULAR = "regular"         # Visita normal (consume membresía)
    QUICK = "quick"             # Visita rápida (no consume)
    EVENT = "event"             # Evento especial
    GUEST = "guest"             # Invitado
    TRIAL = "trial"             # Prueba


class UserVisit(BaseModel):
    """Registro de visita de un usuario"""
    visit_id: str = Field(default_factory=lambda: f"visit_{uuid.uuid4().hex[:8]}")
    
    # Usuario
    user_id: str
    profile_id: Optional[str] = None
    
    # Tipo de visita
    visit_type: VisitType = VisitType.REGULAR
    
    # Check-in
    check_in_time: str          # ISO format
    check_in_method: str        # qr, pin, geolocation, manual
    
    # Check-out
    check_out_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    
    # Geolocalización
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_verified: bool = False
    
    # Membresía
    membership_id: Optional[str] = None
    consumed_visit: bool = False
    
    # Notas
    notes: Optional[str] = None
    registered_by: Optional[str] = None  # Admin que registró (si manual)
    
    created_at: Optional[str] = None


# ============== FUNCIONES DE UTILIDAD ==============

def get_default_user_types() -> List[Dict]:
    """Tipos de usuario por defecto"""
    return [
        {
            "type_id": "utype_customer",
            "name": {"es": "Cliente", "en": "Customer", "zh": "客户"},
            "description": {"es": "Cliente regular de la tienda", "en": "Regular store customer", "zh": "普通商店顾客"},
            "category": "customer",
            "icon": "🛒",
            "color": "#10b981",
            "can_purchase": True,
            "can_have_wallet": True,
            "can_have_membership": False,
            "accessible_modules": ["store"],
            "is_default": True,
            "sort_order": 1
        },
        {
            "type_id": "utype_member_child",
            "name": {"es": "Miembro Infantil", "en": "Child Member", "zh": "儿童会员"},
            "description": {"es": "Niño miembro del club", "en": "Child club member", "zh": "俱乐部儿童会员"},
            "category": "dependent",
            "icon": "🏓",
            "color": "#f59e0b",
            "can_purchase": True,
            "can_have_wallet": True,
            "can_have_membership": True,
            "can_be_guardian": False,
            "can_have_guardian": True,
            "charges_to_guardian": True,
            "requires_guardian": True,
            "max_age": 17,
            "accessible_modules": ["pinpanclub", "store"],
            "sort_order": 2
        },
        {
            "type_id": "utype_member_adult",
            "name": {"es": "Miembro Adulto", "en": "Adult Member", "zh": "成人会员"},
            "description": {"es": "Miembro adulto del club", "en": "Adult club member", "zh": "俱乐部成人会员"},
            "category": "member",
            "icon": "🎾",
            "color": "#6366f1",
            "can_purchase": True,
            "can_have_wallet": True,
            "can_have_membership": True,
            "can_be_guardian": True,
            "min_age": 18,
            "accessible_modules": ["pinpanclub", "store", "community"],
            "sort_order": 3
        },
        {
            "type_id": "utype_guardian",
            "name": {"es": "Acudiente", "en": "Guardian", "zh": "监护人"},
            "description": {"es": "Padre o acudiente responsable", "en": "Parent or responsible guardian", "zh": "父母或负责监护人"},
            "category": "guardian",
            "icon": "👨‍👩‍👧",
            "color": "#8b5cf6",
            "can_purchase": True,
            "can_have_wallet": True,
            "can_have_membership": False,
            "can_be_guardian": True,
            "can_have_guardian": False,
            "min_age": 18,
            "accessible_modules": ["store", "pinpanclub"],
            "sort_order": 4
        },
        {
            "type_id": "utype_special",
            "name": {"es": "Miembro Especial", "en": "Special Member", "zh": "特殊会员"},
            "description": {"es": "Membresía de cortesía", "en": "Courtesy membership", "zh": "礼遇会员"},
            "category": "special",
            "icon": "⭐",
            "color": "#ec4899",
            "can_purchase": True,
            "can_have_wallet": True,
            "can_have_membership": True,
            "accessible_modules": ["pinpanclub", "store", "community"],
            "sort_order": 5
        },
        {
            "type_id": "utype_staff",
            "name": {"es": "Personal", "en": "Staff", "zh": "员工"},
            "description": {"es": "Personal del club", "en": "Club staff", "zh": "俱乐部员工"},
            "category": "staff",
            "icon": "👔",
            "color": "#0ea5e9",
            "can_purchase": True,
            "can_have_wallet": True,
            "accessible_modules": ["store", "pinpanclub", "community", "admin"],
            "sort_order": 6
        }
    ]


def get_default_profile_fields() -> List[Dict]:
    """Campos de perfil por defecto"""
    return [
        # Contacto
        {
            "field_id": "field_emergency_contact",
            "field_key": "emergency_contact",
            "label": {"es": "Contacto de Emergencia", "en": "Emergency Contact", "zh": "紧急联系人"},
            "field_type": "text",
            "section": "contact",
            "is_required": False,
            "sort_order": 1
        },
        {
            "field_id": "field_emergency_phone",
            "field_key": "emergency_phone",
            "label": {"es": "Teléfono de Emergencia", "en": "Emergency Phone", "zh": "紧急电话"},
            "field_type": "phone",
            "section": "contact",
            "is_required": False,
            "sort_order": 2
        },
        # Información escolar (para niños)
        {
            "field_id": "field_school_name",
            "field_key": "school_name",
            "label": {"es": "Nombre de Escuela", "en": "School Name", "zh": "学校名称"},
            "field_type": "text",
            "section": "education",
            "applicable_user_types": ["utype_member_child"],
            "sort_order": 10
        },
        {
            "field_id": "field_grade_level",
            "field_key": "grade_level",
            "label": {"es": "Grado/Nivel", "en": "Grade Level", "zh": "年级"},
            "field_type": "text",
            "section": "education",
            "applicable_user_types": ["utype_member_child"],
            "sort_order": 11
        },
        # Médico
        {
            "field_id": "field_allergies",
            "field_key": "allergies",
            "label": {"es": "Alergias", "en": "Allergies", "zh": "过敏"},
            "field_type": "textarea",
            "section": "medical",
            "sort_order": 20
        },
        {
            "field_id": "field_medical_conditions",
            "field_key": "medical_conditions",
            "label": {"es": "Condiciones Médicas", "en": "Medical Conditions", "zh": "医疗状况"},
            "field_type": "textarea",
            "section": "medical",
            "sort_order": 21
        },
        # Preferencias
        {
            "field_id": "field_skill_level",
            "field_key": "skill_level",
            "label": {"es": "Nivel de Habilidad", "en": "Skill Level", "zh": "技能水平"},
            "field_type": "select",
            "options": [
                {"value": "beginner", "label": {"es": "Principiante", "en": "Beginner", "zh": "初学者"}},
                {"value": "intermediate", "label": {"es": "Intermedio", "en": "Intermediate", "zh": "中级"}},
                {"value": "advanced", "label": {"es": "Avanzado", "en": "Advanced", "zh": "高级"}},
                {"value": "professional", "label": {"es": "Profesional", "en": "Professional", "zh": "专业"}}
            ],
            "section": "preferences",
            "applicable_user_types": ["utype_member_child", "utype_member_adult"],
            "sort_order": 30
        },
        {
            "field_id": "field_preferred_hand",
            "field_key": "preferred_hand",
            "label": {"es": "Mano Preferida", "en": "Preferred Hand", "zh": "惯用手"},
            "field_type": "select",
            "options": [
                {"value": "right", "label": {"es": "Derecha", "en": "Right", "zh": "右手"}},
                {"value": "left", "label": {"es": "Izquierda", "en": "Left", "zh": "左手"}},
                {"value": "ambidextrous", "label": {"es": "Ambidiestro", "en": "Ambidextrous", "zh": "双手"}}
            ],
            "section": "preferences",
            "applicable_user_types": ["utype_member_child", "utype_member_adult"],
            "sort_order": 31
        }
    ]
