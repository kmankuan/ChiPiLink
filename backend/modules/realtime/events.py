"""
Realtime Event Emitters
Broadcasts events via WebSocket to relevant users/rooms when app actions happen.
Also sends push notifications for critical events (access requests).
Used by service methods to push live updates to connected clients.
"""
import logging
from typing import Optional, Dict

from modules.realtime.services.websocket_manager import ws_manager

logger = logging.getLogger(__name__)

ROOM_ADMIN = "admin"
ROOM_STORE = "store"

PUSH_CATEGORY = "student_access"


async def _send_push_to_admins(title: str, body: str, data: Dict = None):
    """Send push notification to all admin users."""
    try:
        from core.database import db
        from modules.notifications.services.push_service import push_notification_service

        admin_users = await db.users.find(
            {"is_admin": True}, {"_id": 0, "user_id": 1}
        ).to_list(50)
        admin_ids = [u["user_id"] for u in admin_users if u.get("user_id")]

        if admin_ids:
            await push_notification_service.send_to_users(
                user_ids=admin_ids,
                category_id=PUSH_CATEGORY,
                title=title,
                body=body,
                data=data or {}
            )
    except Exception as e:
        logger.warning(f"[push] Failed to send admin push: {e}")


async def _send_push_to_user(user_id: str, title: str, body: str, data: Dict = None):
    """Send push notification to a specific user."""
    try:
        from modules.notifications.services.push_service import push_notification_service

        await push_notification_service.send_notification(
            user_id=user_id,
            category_id=PUSH_CATEGORY,
            title=title,
            body=body,
            data=data or {}
        )
    except Exception as e:
        logger.warning(f"[push] Failed to send user push to {user_id}: {e}")


async def emit_order_submitted(
    order_id: str, student_name: str, total_amount: float,
    item_count: int, user_id: str
):
    """Notify admins when a user submits an order."""
    await ws_manager.broadcast_to_room(ROOM_ADMIN, {
        "type": "order_submitted",
        "payload": {
            "order_id": order_id,
            "student_name": student_name,
            "total_amount": total_amount,
            "item_count": item_count,
        },
        "message": {
            "es": f"{student_name} realizó un pedido (${total_amount:.2f})",
            "en": f"{student_name} placed an order (${total_amount:.2f})",
            "zh": f"{student_name} 下了订单 (${total_amount:.2f})",
        },
    })


async def emit_access_request_created(
    student_id: str, student_name: str, grade: str,
    school_name: str, user_id: str
):
    """Notify admins when a user creates an access request."""
    msg = {
        "es": f"Nueva solicitud de acceso: {student_name} ({grade}° - {school_name})",
        "en": f"New access request: {student_name} ({grade}° - {school_name})",
        "zh": f"新访问请求: {student_name} ({grade}° - {school_name})",
    }
    await ws_manager.broadcast_to_room(ROOM_ADMIN, {
        "type": "access_request",
        "payload": {
            "student_id": student_id,
            "student_name": student_name,
            "grade": grade,
            "school_name": school_name,
        },
        "message": msg,
    })
    # Push notification to admins
    await _send_push_to_admins(
        title="Nueva solicitud de acceso",
        body=msg["es"],
        data={"type": "access_request", "student_id": student_id}
    )


async def emit_access_request_updated(
    student_id: str, student_name: str, new_status: str,
    user_id: str, admin_name: Optional[str] = None
):
    """Notify the user when admin updates their access request."""
    status_labels = {
        "approved": {"es": "aprobada", "en": "approved", "zh": "已批准"},
        "rejected": {"es": "rechazada", "en": "rejected", "zh": "已拒绝"},
        "in_review": {"es": "en revisión", "en": "in review", "zh": "审核中"},
        "info_required": {"es": "info requerida", "en": "info required", "zh": "需要信息"},
    }
    label = status_labels.get(new_status, {"es": new_status, "en": new_status, "zh": new_status})

    # Notify the user who made the request
    await ws_manager.send_to_user(user_id, {
        "type": f"access_request_{new_status}",
        "payload": {
            "student_id": student_id,
            "student_name": student_name,
            "status": new_status,
        },
        "message": {
            "es": f"Solicitud de {student_name}: {label['es']}",
            "en": f"Request for {student_name}: {label['en']}",
            "zh": f"{student_name} 的请求: {label['zh']}",
        },
    })

    # Also notify admin room so other admins see the change
    await ws_manager.broadcast_to_room(ROOM_ADMIN, {
        "type": "access_request_updated",
        "payload": {
            "student_id": student_id,
            "student_name": student_name,
            "status": new_status,
        },
        "message": {
            "es": f"Solicitud de {student_name}: {label['es']}",
            "en": f"Request for {student_name}: {label['en']}",
            "zh": f"{student_name} 的请求: {label['zh']}",
        },
    })


async def emit_user_registered(user_id: str, name: str, email: str):
    """Notify admins when a new user registers."""
    await ws_manager.broadcast_to_room(ROOM_ADMIN, {
        "type": "user_registered",
        "payload": {"user_id": user_id, "name": name, "email": email},
        "message": {
            "es": f"Nuevo usuario registrado: {name}",
            "en": f"New user registered: {name}",
            "zh": f"新用户注册: {name}",
        },
    })


async def emit_wallet_transaction(user_id: str, tx_type: str, amount: float, description: str = ""):
    """Notify user about wallet transaction, and admins about top-ups."""
    await ws_manager.send_to_user(user_id, {
        "type": "wallet_update",
        "payload": {"tx_type": tx_type, "amount": amount, "description": description},
        "message": {
            "es": f"Transacción de billetera: ${abs(amount):.2f}",
            "en": f"Wallet transaction: ${abs(amount):.2f}",
            "zh": f"钱包交易: ${abs(amount):.2f}",
        },
    })
    if tx_type in ("topup", "recharge", "credit"):
        await ws_manager.broadcast_to_room(ROOM_ADMIN, {
            "type": "wallet_topup",
            "payload": {"user_id": user_id, "amount": amount},
            "message": {
                "es": f"Recarga de billetera: ${amount:.2f}",
                "en": f"Wallet top-up: ${amount:.2f}",
                "zh": f"钱包充值: ${amount:.2f}",
            },
        })


async def emit_crm_message(student_id: str, student_name: str, sender: str, subject: str, user_id: Optional[str] = None):
    """Notify about CRM messages — admin if from client, client if from admin."""
    if sender == "admin" and user_id:
        await ws_manager.send_to_user(user_id, {
            "type": "crm_message",
            "payload": {"student_id": student_id, "subject": subject},
            "message": {
                "es": f"Nuevo mensaje del admin sobre {student_name}",
                "en": f"New message from admin about {student_name}",
                "zh": f"管理员关于 {student_name} 的新消息",
            },
        })
    else:
        await ws_manager.broadcast_to_room(ROOM_ADMIN, {
            "type": "crm_message",
            "payload": {"student_id": student_id, "student_name": student_name, "subject": subject},
            "message": {
                "es": f"Mensaje CRM de {student_name}: {subject[:40]}",
                "en": f"CRM message from {student_name}: {subject[:40]}",
                "zh": f"{student_name} 的CRM消息: {subject[:40]}",
            },
        })


async def emit_order_status_changed(order_id: str, student_name: str, new_status: str, user_id: str):
    """Notify user when their order status changes."""
    await ws_manager.send_to_user(user_id, {
        "type": "order_status_changed",
        "payload": {"order_id": order_id, "status": new_status},
        "message": {
            "es": f"Pedido de {student_name}: {new_status}",
            "en": f"Order for {student_name}: {new_status}",
            "zh": f"{student_name} 的订单: {new_status}",
        },
    })
    await ws_manager.broadcast_to_room(ROOM_ADMIN, {
        "type": "order_status_changed",
        "payload": {"order_id": order_id, "student_name": student_name, "status": new_status},
        "message": {
            "es": f"Pedido de {student_name}: {new_status}",
            "en": f"Order for {student_name}: {new_status}",
            "zh": f"{student_name} 的订单: {new_status}",
        },
    })
