"""
Push Notification Models - Modelos para el system for notifications
"""
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime


class NotificationProvider(str, Enum):
    """Proveedores de push notifications"""
    FCM = "fcm"
    ONESIGNAL = "onesignal"
    BOTH = "both"  # Send a ambos
    AUTO = "auto"  # Selection automatic basada en carga/disponibilidad


class NotificationPriority(str, Enum):
    """Prioridad de notifications"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationStatus(str, Enum):
    """Estado de notifications"""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ContentBlockType(str, Enum):
    """Tipos de bloques para editor avanzado"""
    PARAGRAPH = "paragraph"
    HEADING_1 = "heading_1"
    HEADING_2 = "heading_2"
    HEADING_3 = "heading_3"
    BULLET_LIST = "bullet_list"
    NUMBERED_LIST = "numbered_list"
    IMAGE = "image"
    VIDEO = "video"
    QUOTE = "quote"
    CODE = "code"
    DIVIDER = "divider"
    CALLOUT = "callout"
    BUTTON = "button"
    EMBED = "embed"


def get_default_notification_categories() -> List[Dict]:
    """Categorys de notification by default"""
    return [
        {
            "category_id": "cat_qr_payments",
            "name": {
                "es": "Pagos QR",
                "en": "QR Payments",
                "zh": "二维码支付"
            },
            "description": {
                "es": "Confirmation de pagos y cobros via QR",
                "en": "QR payment and charge confirmations",
                "zh": "二维码支付和收费确认"
            },
            "icon": "💳",
            "color": "#10b981",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.HIGH.value,
            "module": "wallet",
            "sort_order": 1
        },
        {
            "category_id": "cat_checkin",
            "name": {
                "es": "Check-in/Check-out",
                "en": "Check-in/Check-out",
                "zh": "签到/签退"
            },
            "description": {
                "es": "Confirmaciones de entrada y salida del club",
                "en": "Club entry and exit confirmations",
                "zh": "俱乐部进出确认"
            },
            "icon": "📍",
            "color": "#3b82f6",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.NORMAL.value,
            "module": "membership",
            "sort_order": 2
        },
        {
            "category_id": "cat_membership",
            "name": {
                "es": "Memberships",
                "en": "Memberships",
                "zh": "会员资格"
            },
            "description": {
                "es": "Recordatorios de vencimiento, visitas restantes",
                "en": "Expiration reminders, remaining visits",
                "zh": "到期提醒，剩余访问次数"
            },
            "icon": "🎫",
            "color": "#8b5cf6",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.NORMAL.value,
            "module": "membership",
            "sort_order": 3
        },
        {
            "category_id": "cat_challenges",
            "name": {
                "es": "Retos Semanales",
                "en": "Weekly Challenges",
                "zh": "每周挑战"
            },
            "description": {
                "es": "Nuevos retos, recordatorios, resultados",
                "en": "New challenges, reminders, results",
                "zh": "新挑战、提醒、结果"
            },
            "icon": "🏆",
            "color": "#f59e0b",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.NORMAL.value,
            "module": "pinpanclub",
            "sort_order": 4
        },
        {
            "category_id": "cat_seasons",
            "name": {
                "es": "Temporadas y Rankings",
                "en": "Seasons & Rankings",
                "zh": "赛季和排名"
            },
            "description": {
                "es": "Cambios de position, premios, nuevas temporadas",
                "en": "Position changes, prizes, new seasons",
                "zh": "排名变化、奖品、新赛季"
            },
            "icon": "📊",
            "color": "#ef4444",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.NORMAL.value,
            "module": "pinpanclub",
            "sort_order": 5
        },
        {
            "category_id": "cat_rapidpin",
            "name": {
                "es": "Challenges Rapid Pin",
                "en": "Rapid Pin Challenges",
                "zh": "快速对决挑战"
            },
            "description": {
                "es": "Nuevos challenges, aceptaciones, partidos esperando referee",
                "en": "New challenges, acceptances, matches waiting for referee",
                "zh": "新挑战、接受、等待裁判的比赛"
            },
            "icon": "⚔️",
            "color": "#f97316",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.HIGH.value,
            "module": "pinpanclub",
            "sort_order": 5.5
        },
        {
            "category_id": "cat_social",
            "name": {
                "es": "Social",
                "en": "Social",
                "zh": "社交"
            },
            "description": {
                "es": "Nuevos seguidores, comentarios, menciones",
                "en": "New followers, comments, mentions",
                "zh": "新关注者、评论、提及"
            },
            "icon": "👥",
            "color": "#ec4899",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.LOW.value,
            "module": "social",
            "sort_order": 6
        },
        {
            "category_id": "cat_announcements",
            "name": {
                "es": "Avisos del Club",
                "en": "Club Announcements",
                "zh": "俱乐部公告"
            },
            "description": {
                "es": "Posts y anuncios de administration",
                "en": "Admin posts and announcements",
                "zh": "管理员帖子和公告"
            },
            "icon": "📢",
            "color": "#6366f1",
            "default_enabled": True,
            "default_provider": NotificationProvider.BOTH.value,
            "priority": NotificationPriority.HIGH.value,
            "module": "admin",
            "sort_order": 7
        },
        {
            "category_id": "cat_promotions",
            "name": {
                "es": "Promociones",
                "en": "Promotions",
                "zh": "促销"
            },
            "description": {
                "es": "Ofertas, descuentos, eventos especiales",
                "en": "Offers, discounts, special events",
                "zh": "优惠、折扣、特别活动"
            },
            "icon": "🎉",
            "color": "#14b8a6",
            "default_enabled": False,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.LOW.value,
            "module": "marketing",
            "sort_order": 8
        },
        {
            "category_id": "wallet_alerts",
            "name": {
                "es": "Alertas de Wallet",
                "en": "Wallet Alerts",
                "zh": "钱包警报"
            },
            "description": {
                "es": "Alertas de saldo insuficiente, transferencias, recargas",
                "en": "Insufficient balance alerts, transfers, recharges",
                "zh": "余额不足警报、转账、充值"
            },
            "icon": "💰",
            "color": "#f59e0b",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.HIGH.value,
            "module": "wallet",
            "sort_order": 0.5
        },
        {
            "category_id": "connections",
            "name": {
                "es": "Conexiones",
                "en": "Connections",
                "zh": "连接"
            },
            "description": {
                "es": "Solicitudes de connection, aprobaciones, nuevos acudidos",
                "en": "Connection requests, approvals, new dependents",
                "zh": "连接请求、批准、新的受抚养人"
            },
            "icon": "🔗",
            "color": "#8b5cf6",
            "default_enabled": True,
            "default_provider": NotificationProvider.AUTO.value,
            "priority": NotificationPriority.NORMAL.value,
            "module": "users",
            "sort_order": 0.7
        }
    ]


def get_default_provider_config() -> Dict:
    """Configuration by default de proveedores"""
    return {
        "config_id": "push_providers_config",
        "fcm": {
            "enabled": False,
            "project_id": None,
            "api_key": None,
            "sender_id": None,
            "service_account_key": None,  # JSON string
            "weight": 50,  # For balanceo de carga (0-100)
            "rate_limit": 1000,  # Messages por minuto
            "current_load": 0,
            "last_error": None,
            "error_count": 0,
            "status": "inactive"
        },
        "onesignal": {
            "enabled": False,
            "app_id": None,
            "api_key": None,
            "weight": 50,
            "rate_limit": 1000,
            "current_load": 0,
            "last_error": None,
            "error_count": 0,
            "status": "inactive"
        },
        "failover_enabled": True,
        "failover_threshold": 3,  # Errores antes de cambiar proveedor
        "load_balancing": "weighted",  # "weighted", "round_robin", "least_loaded"
        "default_provider": NotificationProvider.AUTO.value,
        "retry_attempts": 3,
        "retry_delay_seconds": 5
    }


def get_default_notification_templates() -> List[Dict]:
    """Plantillas de notification by default"""
    return [
        {
            "template_id": "tpl_qr_payment_received",
            "category_id": "cat_qr_payments",
            "name": "QR Payment Received",
            "title": {
                "es": "Pago Recibido",
                "en": "Payment Received",
                "zh": "收到付款"
            },
            "body": {
                "es": "Se ha procesado un pago de {{amount}} desde tu ChipiWallet",
                "en": "A payment of {{amount}} has been processed from your ChipiWallet",
                "zh": "已从您的ChipiWallet处理了{{amount}}的付款"
            },
            "variables": ["amount", "description", "balance"],
            "icon": "payment",
            "action_url": "/mi-cuenta",
            "is_active": True
        },
        {
            "template_id": "tpl_checkin_confirmed",
            "category_id": "cat_checkin",
            "name": "Check-in Confirmed",
            "title": {
                "es": "Check-in Confirmado",
                "en": "Check-in Confirmed",
                "zh": "签到已确认"
            },
            "body": {
                "es": "¡Bienvenido al club! Tu entrada ha sido registrada.",
                "en": "Welcome to the club! Your entry has been registered.",
                "zh": "欢迎来到俱乐部！您的入场已登记。"
            },
            "variables": ["time", "visits_remaining"],
            "icon": "checkin",
            "action_url": "/mi-cuenta",
            "is_active": True
        },
        {
            "template_id": "tpl_checkout_confirmed",
            "category_id": "cat_checkin",
            "name": "Check-out Confirmed",
            "title": {
                "es": "Check-out Confirmado",
                "en": "Check-out Confirmed",
                "zh": "签退已确认"
            },
            "body": {
                "es": "Tu visita de {{duration}} minutos ha sido registrada. ¡Hasta pronto!",
                "en": "Your {{duration}} minute visit has been recorded. See you soon!",
                "zh": "您{{duration}}分钟的访问已记录。再见！"
            },
            "variables": ["duration", "visits_remaining"],
            "icon": "checkout",
            "action_url": "/mi-cuenta",
            "is_active": True
        },
        {
            "template_id": "tpl_membership_expiring",
            "category_id": "cat_membership",
            "name": "Membership Expiring",
            "title": {
                "es": "Tu membership vence pronto",
                "en": "Your membership is expiring soon",
                "zh": "您的会员资格即将到期"
            },
            "body": {
                "es": "Tu membership vence en {{days}} days. Renew it para seguir disfrutando.",
                "en": "Your membership expires in {{days}} days. Renew to keep enjoying.",
                "zh": "您的会员资格将在{{days}}天后到期。续订以继续享受。"
            },
            "variables": ["days", "plan_name"],
            "icon": "membership",
            "action_url": "/mi-cuenta",
            "is_active": True
        },
        {
            "template_id": "tpl_new_challenge",
            "category_id": "cat_challenges",
            "name": "New Challenge Available",
            "title": {
                "es": "¡Nuevo Reto Disponible!",
                "en": "New Challenge Available!",
                "zh": "新挑战可用！"
            },
            "body": {
                "es": "{{challenge_name}} - Completa the challenge y gana {{points}} puntos",
                "en": "{{challenge_name}} - Complete the challenge and earn {{points}} points",
                "zh": "{{challenge_name}} - 完成挑战赢取{{points}}积分"
            },
            "variables": ["challenge_name", "points", "end_date"],
            "icon": "challenge",
            "action_url": "/pinpanclub/challenges",
            "is_active": True
        },
        {
            "template_id": "tpl_announcement",
            "category_id": "cat_announcements",
            "name": "Club Announcement",
            "title": {
                "es": "{{title}}",
                "en": "{{title}}",
                "zh": "{{title}}"
            },
            "body": {
                "es": "{{summary}}",
                "en": "{{summary}}",
                "zh": "{{summary}}"
            },
            "variables": ["title", "summary", "post_id"],
            "icon": "announcement",
            "action_url": "/announcements/{{post_id}}",
            "is_active": True
        }
    ]
