"""
ChiPi Users Module - Models for advanced user system
Highly configurable system with user types, dynamic profiles, and relationships
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class UserTypeCategory(str, Enum):
    """Base categories for user types"""
    CUSTOMER = "customer"           # Regular customer (shop purchases)
    MEMBER = "member"               # Club member
    GUARDIAN = "guardian"           # Guardian/Parent
    DEPENDENT = "dependent"         # Dependent (child, etc.)
    STAFF = "staff"                 # Club staff
    PARTNER = "partner"             # Business partner
    SPECIAL = "special"             # Courtesy/Special


class RelationshipType(str, Enum):
    """Types of relationships between users"""
    PARENT_CHILD = "parent_child"           # Parent ↔ Child
    GUARDIAN_DEPENDENT = "guardian_dependent"  # Guardian ↔ Dependent
    TUTOR_STUDENT = "tutor_student"         # Tutor ↔ Student
    SPONSOR_BENEFICIARY = "sponsor_beneficiary"  # Sponsor ↔ Beneficiary
    CAREGIVER_WARD = "caregiver_ward"       # Caregiver ↔ Ward
    FAMILY = "family"                        # General family
    CUSTOM = "custom"                        # Custom


class ProfileFieldType(str, Enum):
    """Field types for dynamic profiles"""
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
    """Membership types"""
    VISITS = "visits"           # By visits (e.g., 12 visits)
    UNLIMITED = "unlimited"     # Unlimited by time
    CREDITS = "credits"         # By credits/points
    COURTESY = "courtesy"       # Courtesy/Gift
    TRIAL = "trial"             # Trial


# ============== USER TYPE CONFIGURATION ==============

class UserTypeConfig(BaseModel):
    """User type configuration"""
    type_id: str = Field(default_factory=lambda: f"utype_{uuid.uuid4().hex[:8]}")
    
    # Multi-language names
    name: Dict[str, str]  # {"es": "Cliente", "en": "Customer", "zh": "客户"}
    description: Dict[str, str] = {}
    
    # Base category
    category: UserTypeCategory
    
    # Icon and color for UI
    icon: str = "👤"
    color: str = "#6366f1"  # Indigo by default
    
    # Permissions and access
    can_purchase: bool = True              # Can make purchases
    can_have_wallet: bool = True           # Has wallet
    can_have_membership: bool = False      # Can have membership
    can_be_guardian: bool = False          # Can be a guardian
    can_have_guardian: bool = False        # Can have a guardian
    can_earn_points: bool = True           # Can earn ChipiPoints
    can_transfer_points: bool = True       # Can transfer points
    
    # Accessible modules
    accessible_modules: List[str] = []     # ["store", "pinpanclub", "community", etc.]
    
    # Profile fields required for this type
    required_profile_fields: List[str] = []
    optional_profile_fields: List[str] = []
    
    # If charges are billed to another user
    charges_to_guardian: bool = False
    
    # Restrictions
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    requires_guardian: bool = False
    
    # Status
    is_active: bool = True
    is_default: bool = False  # Default type for new users
    
    # Sort order
    sort_order: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== DYNAMIC PROFILE FIELDS ==============

class ProfileFieldConfig(BaseModel):
    """Profile field configuration"""
    field_id: str = Field(default_factory=lambda: f"field_{uuid.uuid4().hex[:8]}")
    
    # Field identifier (snake_case)
    field_key: str  # E.g., "emergency_contact", "school_name"
    
    # Multi-language names
    label: Dict[str, str]  # {"es": "Contacto de Emergencia", ...}
    placeholder: Dict[str, str] = {}
    help_text: Dict[str, str] = {}
    
    # Field type
    field_type: ProfileFieldType
    
    # Options for select/multiselect
    options: List[Dict[str, str]] = []  # [{"value": "opt1", "label": {"es": "Opción 1"}}]
    
    # Validations
    is_required: bool = False
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex for validation
    
    # Visibility
    is_public: bool = False         # Visible to other users
    is_searchable: bool = False     # Indexed for search
    show_in_list: bool = False      # Show in listings
    show_in_card: bool = True       # Show in profile card
    
    # Applicable to which user types
    applicable_user_types: List[str] = []  # Empty = all
    
    # Section/group
    section: str = "general"  # general, contact, medical, preferences, etc.
    
    # Sort order
    sort_order: int = 0
    
    # Status
    is_active: bool = True
    
    created_at: Optional[str] = None


# ============== USER PROFILE ==============

class UserProfile(BaseModel):
    """Extended user profile"""
    profile_id: str = Field(default_factory=lambda: f"profile_{uuid.uuid4().hex[:8]}")
    
    # Link to auth user
    user_id: str  # cliente_id from auth system
    
    # User type
    user_type_id: str
    user_type_info: Optional[Dict] = None  # Cache of type info
    
    # Basic data (always present)
    display_name: Optional[str] = None     # Display name/nickname
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    
    # Birth date (for age calculation)
    birth_date: Optional[str] = None       # ISO format
    
    # Dynamic fields (values from ProfileFieldConfig)
    custom_fields: Dict[str, Any] = {}     # {"emergency_contact": "...", "school_name": "..."}
    
    # Preferences
    language: str = "es"
    timezone: str = "America/Panama"
    notifications_enabled: bool = True
    notification_preferences: Dict[str, bool] = {}
    
    # Tags for categorization
    tags: List[str] = []
    
    # Internal notes (admin only)
    internal_notes: Optional[str] = None
    
    # Status
    is_verified: bool = False
    is_active: bool = True
    
    # Statistics
    total_visits: int = 0
    total_purchases: int = 0
    total_points_earned: int = 0
    total_points_spent: int = 0
    
    # Timestamps
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    last_activity: Optional[str] = None


# ============== USER RELATIONSHIPS ==============

class UserRelationship(BaseModel):
    """Relationship between two users"""
    relationship_id: str = Field(default_factory=lambda: f"rel_{uuid.uuid4().hex[:8]}")
    
    # Users involved
    user_id_1: str          # Primary user (e.g., parent)
    user_id_2: str          # Secondary user (e.g., child)
    
    # Relationship type
    relationship_type: RelationshipType
    custom_type_name: Optional[Dict[str, str]] = None  # For CUSTOM type
    
    # Roles in the relationship
    role_1: Dict[str, str] = {}  # {"es": "Padre", "en": "Father"}
    role_2: Dict[str, str] = {}  # {"es": "Hijo", "en": "Child"}
    
    # Permissions
    can_view_profile: bool = True
    can_view_wallet: bool = False
    can_view_activity: bool = True
    can_pay_for: bool = False       # User 1 can pay for user 2
    can_manage: bool = False        # User 1 can manage user 2
    receives_notifications: bool = True  # User 1 receives notifications from user 2
    
    # Financial responsibility
    is_financial_responsible: bool = False  # User 1 is responsible for user 2's payments
    spending_limit: Optional[float] = None  # Spending limit (if applicable)
    
    # Verification
    is_verified: bool = False       # Relationship verified by admin
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    
    # Status
    is_active: bool = True
    
    # Metadata
    notes: Optional[str] = None
    created_at: Optional[str] = None
    created_by: Optional[str] = None


# ============== MEMBERSHIPS ==============

class MembershipPlanConfig(BaseModel):
    """Membership plan configuration"""
    plan_id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    
    # Multi-language names
    name: Dict[str, str]  # {"es": "Recarga 12 Visitas", ...}
    description: Dict[str, str] = {}
    
    # Membership type
    membership_type: MembershipType
    
    # Price and value
    price: float                    # Price in USD
    price_in_points: Optional[int] = None  # Price in ChipiPoints (alternative)
    
    # Configuration by type
    total_visits: Optional[int] = None      # For VISITS
    duration_days: Optional[int] = None     # For UNLIMITED
    total_credits: Optional[int] = None     # For CREDITS
    
    # Restrictions
    applicable_user_types: List[str] = []   # User types that can purchase
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    
    # Additional benefits
    bonus_points: int = 0           # ChipiPoints bonus
    discount_percentage: float = 0  # Store discount
    
    # Transferability
    is_transferable: bool = False   # Can be transferred to another user
    is_shareable: bool = False      # Can be shared (family)
    
    # Renewal
    auto_renew: bool = False
    renewal_discount: float = 0     # Discount for renewal
    
    # Status
    is_active: bool = True
    is_featured: bool = False       # Featured in UI
    
    # Sort order
    sort_order: int = 0
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class UserMembership(BaseModel):
    """User's active membership"""
    membership_id: str = Field(default_factory=lambda: f"memb_{uuid.uuid4().hex[:8]}")
    
    # User and plan
    user_id: str
    plan_id: str
    plan_info: Optional[Dict] = None  # Cache of plan info
    
    # Status
    status: str = "active"  # active, expired, cancelled, suspended
    
    # Current values
    visits_remaining: Optional[int] = None
    credits_remaining: Optional[int] = None
    
    # Dates
    start_date: str
    end_date: Optional[str] = None
    
    # Purchase
    purchase_price: float
    paid_with_points: bool = False
    transaction_id: Optional[str] = None
    
    # Sponsor (if courtesy)
    sponsored_by: Optional[str] = None  # sponsor's user_id
    sponsor_note: Optional[str] = None
    
    # Renewal
    is_auto_renew: bool = False
    renewal_count: int = 0
    
    # History
    usage_history: List[Dict] = []  # List of usages with date and notes
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== VISITS/CHECK-INS ==============

class VisitType(str, Enum):
    """Visit types"""
    REGULAR = "regular"         # Regular visit (consumes membership)
    QUICK = "quick"             # Quick visit (does not consume)
    EVENT = "event"             # Special event
    GUEST = "guest"             # Guest
    TRIAL = "trial"             # Trial


class UserVisit(BaseModel):
    """User visit record"""
    visit_id: str = Field(default_factory=lambda: f"visit_{uuid.uuid4().hex[:8]}")
    
    # User
    user_id: str
    profile_id: Optional[str] = None
    
    # Visit type
    visit_type: VisitType = VisitType.REGULAR
    
    # Check-in
    check_in_time: str          # ISO format
    check_in_method: str        # qr, pin, geolocation, manual
    
    # Check-out
    check_out_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    
    # Geolocation
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_verified: bool = False
    
    # Membership
    membership_id: Optional[str] = None
    consumed_visit: bool = False
    
    # Notes
    notes: Optional[str] = None
    registered_by: Optional[str] = None  # Admin who registered (if manual)
    
    created_at: Optional[str] = None


# ============== UTILITY FUNCTIONS ==============

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
        # Information escolar (para niños)
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
