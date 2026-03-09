"""
Push notification helper — fire-and-forget push notifications for key events.
Uses the existing PushNotificationService infrastructure.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_push_to_user(
    user_id: str,
    title: str,
    body: str,
    category_id: str = "general",
    action_url: Optional[str] = None,
    data: dict = None,
):
    """Send a push notification to a user. Fire-and-forget, never raises."""
    try:
        from modules.notifications.services.push_service import push_notification_service
        result = await push_notification_service.send_notification(
            user_id=user_id,
            category_id=category_id,
            title=title,
            body=body,
            data=data or {},
            action_url=action_url,
        )
        if result.get("success"):
            logger.info(f"[push] Sent to {user_id}: {title}")
        else:
            logger.debug(f"[push] Not sent to {user_id}: {result.get('reason', result.get('error', '?'))}")
        return result
    except Exception as e:
        logger.warning(f"[push] Failed to send to {user_id}: {e}")
        return {"success": False, "error": str(e)}


async def notify_new_message(user_id: str, student_name: str, message_preview: str):
    """Notify a user about a new CRM message from admin/staff."""
    return await send_push_to_user(
        user_id=user_id,
        title=f"New message for {student_name}",
        body=message_preview[:100],
        category_id="messages",
        action_url="/orders",
        data={"type": "crm_message", "student_name": student_name},
    )


async def notify_order_status(user_id: str, student_name: str, order_id: str, new_status: str):
    """Notify a user when their order status changes."""
    status_labels = {
        "submitted": "Submitted",
        "processing": "Processing",
        "ready": "Ready for pickup",
        "delivered": "Delivered",
        "cancelled": "Cancelled",
    }
    label = status_labels.get(new_status, new_status)
    return await send_push_to_user(
        user_id=user_id,
        title=f"Order update: {student_name}",
        body=f"Your order is now {label}",
        category_id="orders",
        action_url="/orders",
        data={"type": "order_status", "order_id": order_id, "status": new_status},
    )
