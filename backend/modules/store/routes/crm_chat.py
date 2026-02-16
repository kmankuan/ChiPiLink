"""
CRM Chat Routes
Multi-topic customer chat via Monday.com Admin Customers board.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from core.auth import get_current_user, get_admin_user
from ..services.crm_chat_service import crm_chat_service
from ..integrations.monday_crm_adapter import crm_monday_adapter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/crm-chat", tags=["Store - CRM Chat"])


# ============== CLIENT ENDPOINTS ==============

@router.get("/{student_id}/topics")
async def get_topics(student_id: str, current_user: dict = Depends(get_current_user)):
    """Get all chat topics for a student"""
    try:
        return await crm_chat_service.get_topics(student_id, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{student_id}/topics/{update_id}")
async def get_topic_replies(
    student_id: str, update_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get replies for a specific topic"""
    try:
        return await crm_chat_service.get_topic_replies(student_id, update_id, current_user["user_id"])
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{student_id}/topics")
async def create_topic(student_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    """Create a new chat topic"""
    subject = (body.get("subject") or "").strip()
    message = (body.get("message") or "").strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")
    try:
        return await crm_chat_service.create_topic(student_id, current_user["user_id"], subject, message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{student_id}/topics/{update_id}/reply")
async def reply_to_topic(
    student_id: str, update_id: str, body: dict,
    current_user: dict = Depends(get_current_user)
):
    """Reply to an existing topic"""
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        return await crm_chat_service.reply_to_topic(student_id, update_id, current_user["user_id"], message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/inbox")
async def admin_inbox(admin: dict = Depends(get_admin_user)):
    """Get all CRM conversations for admin"""
    return await crm_chat_service.get_admin_inbox()


@router.get("/admin/{student_id}/topics")
async def admin_get_topics(student_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: get all topics for a student"""
    try:
        return await crm_chat_service.admin_get_topics(student_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/admin/{student_id}/topics")
async def admin_create_topic(student_id: str, body: dict, admin: dict = Depends(get_admin_user)):
    """Admin: create a new topic for a student"""
    subject = (body.get("subject") or "").strip()
    message = (body.get("message") or "").strip()
    if not subject or not message:
        raise HTTPException(status_code=400, detail="Subject and message are required")
    try:
        return await crm_chat_service.admin_create_topic(student_id, admin["user_id"], subject, message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/{student_id}/topics/{update_id}/reply")
async def admin_reply(
    student_id: str, update_id: str, body: dict,
    admin: dict = Depends(get_admin_user)
):
    """Admin: reply to a topic"""
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    try:
        return await crm_chat_service.admin_reply_to_topic(student_id, update_id, admin["user_id"], message)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ============== CONFIG ENDPOINTS ==============

@router.get("/admin/config")
async def get_crm_config(admin: dict = Depends(get_admin_user)):
    """Get CRM board configuration"""
    return await crm_monday_adapter.get_crm_config()


@router.put("/admin/config")
async def save_crm_config(body: dict, admin: dict = Depends(get_admin_user)):
    """Save CRM board configuration"""
    await crm_monday_adapter.save_crm_config(body)
    return {"success": True}


@router.get("/admin/config/board-columns")
async def get_board_columns(admin: dict = Depends(get_admin_user)):
    """Get columns for the configured CRM board"""
    config = await crm_monday_adapter.get_crm_config()
    board_id = config.get("board_id")
    if not board_id:
        raise HTTPException(status_code=400, detail="CRM board not configured")
    columns = await crm_monday_adapter.client.get_board_columns(board_id)
    return {"columns": columns}


@router.post("/admin/config/register-webhook")
async def register_crm_webhook(body: dict, admin: dict = Depends(get_admin_user)):
    """Register a Monday.com webhook for CRM board update notifications"""
    config = await crm_monday_adapter.get_crm_config()
    board_id = config.get("board_id")
    if not board_id:
        raise HTTPException(status_code=400, detail="CRM board not configured")

    callback_url = body.get("callback_url", "").strip()
    if not callback_url:
        raise HTTPException(status_code=400, detail="callback_url is required")

    try:
        webhook_id = await crm_monday_adapter.client.register_webhook(
            board_id, callback_url, event="create_update"
        )
        if webhook_id:
            # Save webhook ID in config
            config["webhook_id"] = webhook_id
            config["webhook_url"] = callback_url
            await crm_monday_adapter.save_crm_config(config)
            return {"success": True, "webhook_id": webhook_id}
        raise HTTPException(status_code=500, detail="Failed to register webhook")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== WEBHOOK ENDPOINT ==============

@router.post("/webhooks/update-created")
async def crm_webhook_update(request: Request):
    """Monday.com webhook: fires when an Update is created on the CRM board.
    Creates an in-app notification for the linked client.
    """
    body = await request.json()

    # Monday.com challenge verification
    if "challenge" in body:
        logger.info("CRM webhook challenge received")
        return JSONResponse(content={"challenge": body["challenge"]})

    event = body.get("event", {})
    if not event:
        return {"status": "no_event"}

    try:
        result = await crm_chat_service.process_webhook_update(event)
        logger.info(f"CRM webhook processed: {result}")
        return result
    except Exception as e:
        logger.error(f"CRM webhook error: {e}")
        return {"status": "error", "detail": str(e)}


# ============== NOTIFICATION ENDPOINTS ==============

@router.get("/notifications/unread")
async def get_unread_crm_notifications(current_user: dict = Depends(get_current_user)):
    """Get unread CRM chat message counts for the current user"""
    return await crm_chat_service.get_unread_counts(current_user["user_id"])


@router.post("/{student_id}/mark-read")
async def mark_student_chat_read(student_id: str, current_user: dict = Depends(get_current_user)):
    """Mark all CRM messages for a student as read"""
    await crm_chat_service.mark_read(student_id, current_user["user_id"])
    return {"success": True}


@router.post("/admin/{student_id}/mark-read")
async def admin_mark_student_chat_read(student_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: mark all CRM messages for a student as read"""
    await crm_chat_service.mark_read(student_id, "admin")
    return {"success": True}
