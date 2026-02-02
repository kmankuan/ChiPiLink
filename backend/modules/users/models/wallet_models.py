"""
ChipiWallet - Models for digital wallet system
Supports USD and ChipiPoints with transactions and conversions
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class TransactionType(str, Enum):
    """Transaction types"""
    # Money inflows
    DEPOSIT = "deposit"                 # Deposit/Reload
    REFUND = "refund"                   # Refund
    TRANSFER_IN = "transfer_in"         # Received transfer
    REWARD = "reward"                   # Reward/Prize
    BONUS = "bonus"                     # Bonus
    
    # Money outflows
    PURCHASE = "purchase"               # Purchase
    PAYMENT = "payment"                 # Service payment
    TRANSFER_OUT = "transfer_out"       # Sent transfer
    WITHDRAWAL = "withdrawal"           # Withdrawal
    FEE = "fee"                         # Fee
    
    # Conversions
    POINTS_TO_USD = "points_to_usd"     # Convert points to dollars
    USD_TO_POINTS = "usd_to_points"     # Convert dollars to points
    
    # Adjustments
    ADJUSTMENT = "adjustment"           # Manual adjustment (admin)
    CORRECTION = "correction"           # Correction


class TransactionStatus(str, Enum):
    """Transaction status"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Currency(str, Enum):
    """Supported currencies"""
    USD = "USD"
    CHIPIPOINTS = "CHIPIPOINTS"


class PaymentMethod(str, Enum):
    """Payment methods"""
    CASH = "cash"
    CARD = "card"
    YAPPY = "yappy"
    BANK_TRANSFER = "bank_transfer"
    CHIPIPOINTS = "chipipoints"
    MIXED = "mixed"                     # Combination USD + Points
    WALLET = "wallet"                   # From wallet balance


class PointsEarnType(str, Enum):
    """Ways to earn ChipiPoints"""
    PURCHASE = "purchase"               # From purchases
    CHALLENGE = "challenge"             # From completed challenges
    ACHIEVEMENT = "achievement"         # From achievements
    REFERRAL = "referral"               # From referrals
    WORK = "work"                       # From work/help
    PROMOTION = "promotion"             # Special promotion
    SEASON_REWARD = "season_reward"     # Season reward
    RANK_UP = "rank_up"                 # Rank up
    MANUAL = "manual"                   # Manually granted
    MEMBERSHIP = "membership"           # Membership bonus


# ============== CHIPIPOINTS CONFIGURATION ==============

class ChipiPointsConfig(BaseModel):
    """Global ChipiPoints configuration"""
    config_id: str = "chipipoints_config"
    
    # Conversion rate
    points_per_dollar: float = 100      # How many points equal $1 USD
    conversion_rate: float = 0.008      # 1 point = $0.008 USD (1000 pts = $8)
    
    # Conversion enabled
    allow_points_to_usd: bool = True
    allow_usd_to_points: bool = True
    
    # Minimum for conversion
    min_points_to_convert: int = 100
    min_usd_to_convert: float = 1.0
    
    # Points earned per purchase
    points_per_dollar_spent: int = 10   # Points earned per $1 spent
    
    # Expiration
    points_expire: bool = False
    expiration_days: Optional[int] = None  # Días hasta vencimiento
    
    # Limits
    max_points_per_transaction: Optional[int] = None
    daily_conversion_limit: Optional[float] = None
    
    # Estado
    is_active: bool = True
    
    updated_at: Optional[str] = None
    updated_by: Optional[str] = None


class PointsEarnRule(BaseModel):
    """Regla to win ChipiPoints"""
    rule_id: str = Field(default_factory=lambda: f"rule_{uuid.uuid4().hex[:8]}")
    
    # Nombre y description
    name: Dict[str, str]
    description: Dict[str, str] = {}
    
    # Type of action que otorga puntos
    earn_type: PointsEarnType
    
    # Points a otorgar
    points_amount: int
    
    # Or percentage of value
    points_percentage: Optional[float] = None  # E.g. 5% of purchase value
    
    # Condiciones
    min_purchase_amount: Optional[float] = None
    max_points_per_day: Optional[int] = None
    applicable_user_types: List[str] = []  # Empty = todos
    
    # Vigencia
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Estado
    is_active: bool = True
    
    created_at: Optional[str] = None


# ============== BILLETERA ==============

class Wallet(BaseModel):
    """Billetera de un usuario"""
    wallet_id: str = Field(default_factory=lambda: f"wallet_{uuid.uuid4().hex[:8]}")
    
    # User
    user_id: str
    profile_id: Optional[str] = None
    
    # Balances
    balance_usd: float = 0.0
    balance_points: int = 0
    
    # Points pendientes (por compras no confirmadas, etc.)
    pending_points: int = 0
    
    # Totales históricos
    total_deposited: float = 0.0
    total_spent: float = 0.0
    total_points_earned: int = 0
    total_points_spent: int = 0
    total_points_converted: int = 0
    
    # Limits personalizados (null = usar global)
    daily_spend_limit: Optional[float] = None
    daily_transfer_limit: Optional[float] = None
    
    # Estado
    is_active: bool = True
    is_locked: bool = False
    lock_reason: Optional[str] = None
    
    # Security PIN (hash)
    security_pin_hash: Optional[str] = None
    
    # Timestamps
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


# ============== TRANSACCIONES ==============

class Transaction(BaseModel):
    """Transaction en la billetera"""
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:8]}")
    
    # Wallet
    wallet_id: str
    user_id: str
    
    # Tipo y estado
    transaction_type: TransactionType
    status: TransactionStatus = TransactionStatus.PENDING
    
    # Moneda y monto
    currency: Currency
    amount: float               # Monto de the transaction
    
    # Balances resultantes
    balance_before: float = 0
    balance_after: float = 0
    
    # For transactions mixtas (USD + Puntos)
    usd_amount: Optional[float] = None
    points_amount: Optional[int] = None
    
    # Method de pago (para deposits/compras)
    payment_method: Optional[PaymentMethod] = None
    payment_reference: Optional[str] = None
    
    # Relacionados
    related_user_id: Optional[str] = None       # User relacionado (transferencias)
    related_transaction_id: Optional[str] = None # Transaction relacionada
    
    # Reference to compra/servicio
    reference_type: Optional[str] = None        # "purchase", "membership", "service"
    reference_id: Optional[str] = None
    
    # Description
    description: Optional[str] = None
    description_i18n: Dict[str, str] = {}
    
    # Notas
    notes: Optional[str] = None
    internal_notes: Optional[str] = None        # Only visible para admin
    
    # Metadata
    metadata: Dict[str, Any] = {}
    
    # Procesado por
    processed_by: Optional[str] = None          # user_ID of the admin (si manual)
    
    # Timestamps
    created_at: Optional[str] = None
    completed_at: Optional[str] = None
    
    # IP y dispositivo (seguridad)
    ip_address: Optional[str] = None
    device_info: Optional[str] = None


# ============== CONVERSIONES ==============

class PointsConversion(BaseModel):
    """Registro de conversion de puntos"""
    conversion_id: str = Field(default_factory=lambda: f"conv_{uuid.uuid4().hex[:8]}")
    
    # User
    wallet_id: str
    user_id: str
    
    # Address de conversion
    from_currency: Currency
    to_currency: Currency
    
    # Montos
    from_amount: float
    to_amount: float
    
    # Tasa aplicada
    conversion_rate: float
    
    # Estado
    status: TransactionStatus = TransactionStatus.COMPLETED
    
    # Transactions relacionadas
    transaction_id_from: Optional[str] = None
    transaction_id_to: Optional[str] = None
    
    created_at: Optional[str] = None


# ============== SALDO PENDIENTE (CHILDREN) ==============

class PendingBalance(BaseModel):
    """Saldo pendiente de un usuario (cargado a acudiente)"""
    pending_id: str = Field(default_factory=lambda: f"pend_{uuid.uuid4().hex[:8]}")
    
    # User que consumed
    user_id: str
    profile_id: Optional[str] = None
    
    # Acudiente responsable
    guardian_user_id: str
    
    # Monto pendiente
    amount: float
    currency: Currency = Currency.USD
    
    # Detalle de consumos
    items: List[Dict] = []  # [{"description": "...", "amount": X, "date": "..."}]
    
    # Estado
    status: str = "pending"  # pending, notified, paid, cancelled
    
    # Fechas
    created_at: Optional[str] = None
    notified_at: Optional[str] = None
    paid_at: Optional[str] = None
    paid_transaction_id: Optional[str] = None
    
    notes: Optional[str] = None


# ============== PRODUCTOS CON CHIPIPOINTS ==============

class PointsProduct(BaseModel):
    """Producto/servicio adquirible con ChipiPoints"""
    product_id: str = Field(default_factory=lambda: f"pprod_{uuid.uuid4().hex[:8]}")
    
    # Information
    name: Dict[str, str]
    description: Dict[str, str] = {}
    image_url: Optional[str] = None
    
    # Precios
    price_usd: Optional[float] = None       # Precio en USD (puede ser null)
    price_points: int                        # Precio en ChipiPoints
    
    # Category
    category: str = "general"
    
    # Stock
    has_stock: bool = False
    stock_quantity: Optional[int] = None
    
    # Restricciones
    applicable_user_types: List[str] = []
    max_per_user: Optional[int] = None
    
    # Vigencia
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Estado
    is_active: bool = True
    is_featured: bool = False
    
    sort_order: int = 0
    
    created_at: Optional[str] = None


# ============== HISTORIAL DE PUNTOS ==============

class PointsHistory(BaseModel):
    """Historial de puntos ganados/usados"""
    history_id: str = Field(default_factory=lambda: f"ph_{uuid.uuid4().hex[:8]}")
    
    wallet_id: str
    user_id: str
    
    # Action
    action: str  # earned, spent, converted, expired, adjusted
    earn_type: Optional[PointsEarnType] = None
    
    # Points
    points: int  # Positivo = ganado, Negativo = gastado
    balance_after: int
    
    # Description
    description: Dict[str, str] = {}
    
    # Referencias
    transaction_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    
    # Vencimiento (si aplica)
    expires_at: Optional[str] = None
    
    created_at: Optional[str] = None


# ============== FUNCIONES DE UTILIDAD ==============

def get_default_points_config() -> Dict:
    """Configuration by default de ChipiPoints"""
    return {
        "config_id": "chipipoints_config",
        "points_per_dollar": 100,
        "conversion_rate": 0.008,
        "allow_points_to_usd": True,
        "allow_usd_to_points": True,
        "min_points_to_convert": 100,
        "min_usd_to_convert": 1.0,
        "points_per_dollar_spent": 10,
        "points_expire": False,
        "is_active": True
    }


def get_default_earn_rules() -> List[Dict]:
    """Reglas by default to win puntos"""
    return [
        {
            "rule_id": "rule_purchase",
            "name": {"es": "Puntos por Compra", "en": "Purchase Points", "zh": "购物积分"},
            "description": {"es": "Gana 10 puntos por cada $1 gastado", "en": "Earn 10 points per $1 spent", "zh": "每消费1美元获得10积分"},
            "earn_type": "purchase",
            "points_percentage": 10,  # 10 puntos por dólar
            "is_active": True
        },
        {
            "rule_id": "rule_challenge",
            "name": {"es": "Reto Completado", "en": "Challenge Completed", "zh": "完成挑战"},
            "description": {"es": "Puntos por completar retos semanales", "en": "Points for completing weekly challenges", "zh": "完成每周挑战获得积分"},
            "earn_type": "challenge",
            "points_amount": 50,
            "is_active": True
        },
        {
            "rule_id": "rule_work",
            "name": {"es": "Ayuda en el Club", "en": "Club Help", "zh": "俱乐部帮助"},
            "description": {"es": "Puntos por ayudar en tareas del club", "en": "Points for helping with club tasks", "zh": "帮助俱乐部任务获得积分"},
            "earn_type": "work",
            "points_amount": 10,
            "is_active": True
        },
        {
            "rule_id": "rule_referral",
            "name": {"es": "Referido", "en": "Referral", "zh": "推荐"},
            "description": {"es": "Puntos por traer nuevos miembros", "en": "Points for bringing new members", "zh": "推荐新会员获得积分"},
            "earn_type": "referral",
            "points_amount": 100,
            "is_active": True
        }
    ]
