"""
Ably Integration — Token auth + pub/sub helpers
Backend generates Ably tokens for authenticated users.
Frontend never sees the root API key.
"""
import os
import logging
from ably import AblyRest
from fastapi import APIRouter, HTTPException, Depends, Request
from core.auth import get_current_user

logger = logging.getLogger("ably")
router = APIRouter(prefix="/ably", tags=["Ably Real-time"])

# Ably API key — hardcoded fallback (deployment overrides env vars)
_PROD_ABLY_KEY = "iSnkeg.4eXC5g:IKqOacwNnWqd6ABHUiMW-CG3zEMCF5-XBSNVWe1_ldI"
ABLY_API_KEY = os.environ.get("ABLY_API_KEY", "") or _PROD_ABLY_KEY

_client = None

def get_ably_client():
    global _client
    if _client is None:
        _client = AblyRest(ABLY_API_KEY)
    return _client


@router.get("/auth")
async def ably_token_auth(request: Request):
    """
    Generate an Ably token for the requesting user.
    Called by Ably SDK's authUrl option.
    No user auth required — spectators need tokens too.
    Uses clientId from query param or 'anonymous'.
    """
    client_id = request.query_params.get("clientId", "anonymous")
    
    try:
        client = get_ably_client()
        token_request = await client.auth.create_token_request({
            'client_id': client_id,
            'capability': {'*': ['publish', 'subscribe', 'presence']},
        })
        # Convert to dict for JSON response
        return dict(token_request.to_dict()) if hasattr(token_request, 'to_dict') else token_request
    except Exception as e:
        logger.error(f"Ably token error: {e}")
        raise HTTPException(500, f"Failed to generate Ably token: {str(e)}")


@router.get("/auth/user")
async def ably_token_auth_user(user: dict = Depends(get_current_user)):
    """
    Generate Ably token for authenticated user (with their user_id as clientId).
    """
    client_id = user.get("user_id", "anonymous")
    user_name = user.get("name", "User")
    
    try:
        client = get_ably_client()
        token_request = await client.auth.create_token_request({
            'client_id': client_id,
            'capability': {'*': ['publish', 'subscribe', 'presence']},
        })
        result = dict(token_request.to_dict()) if hasattr(token_request, 'to_dict') else token_request
        result['user_name'] = user_name  # Extra info for chat display
        return result
    except Exception as e:
        logger.error(f"Ably user token error: {e}")
        raise HTTPException(500, f"Failed to generate token")


async def publish_to_channel(channel_name: str, event: str, data: dict):
    """Publish a message to an Ably channel from the backend."""
    try:
        client = get_ably_client()
        channel = client.channels.get(channel_name)
        await channel.publish(event, data)
    except Exception as e:
        logger.error(f"Ably publish error on {channel_name}: {e}")


# ═══ AUTO-TRANSLATION FOR CHAT ═══

async def _translate_message(text: str, target_lang: str) -> str:
    """Translate a chat message using AI."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        import uuid
        key = os.environ.get("EMERGENT_LLM_KEY", "sk-emergent-b97C7D44b98C31a073")
        lang_names = {"en": "English", "es": "Spanish", "zh": "Chinese (Simplified)"}
        lang_name = lang_names.get(target_lang, target_lang)
        system = f"You are a real-time chat translator. Translate the following message to {lang_name}. Return ONLY the translation, nothing else. Keep it natural and concise. If the message is already in {lang_name}, return it unchanged."
        llm = LlmChat(api_key=key, session_id=f"translate_{uuid.uuid4().hex[:6]}", system_message=system)
        result = await llm.send_message(UserMessage(text=text))
        return result.strip() if isinstance(result, str) else str(result).strip()
    except Exception as e:
        logger.warning(f"Translation error: {e}")
        return ""


@router.post("/chat/send")
async def send_chat_message(data: dict, user: dict = Depends(get_current_user)):
    """
    Send a chat message with auto-translation.
    Body: { room_id, text, source_lang (optional, auto-detected) }
    Translates to the other two supported languages (en/es/zh) and publishes to Ably.
    """
    room_id = data.get("room_id", "")
    text = data.get("text", "").strip()
    source_lang = data.get("source_lang", "")

    if not room_id or not text:
        raise HTTPException(400, "room_id and text required")

    sender_name = user.get("name", "User")
    sender_id = user.get("user_id", "anonymous")

    # Detect source language if not provided (simple heuristic)
    if not source_lang:
        # Check for Chinese characters
        if any('\u4e00' <= c <= '\u9fff' for c in text):
            source_lang = "zh"
        # Check for common Spanish characters/patterns
        elif any(c in text for c in 'áéíóúñ¿¡'):
            source_lang = "es"
        else:
            source_lang = "en"

    # Translate to other languages
    target_langs = [l for l in ["en", "es", "zh"] if l != source_lang]
    translations = {}

    for lang in target_langs:
        tr = await _translate_message(text, lang)
        if tr and tr != text:
            translations[lang] = tr

    # Build message payload
    message_data = {
        "text": text,
        "sender": sender_id,
        "senderName": sender_name,
        "source_lang": source_lang,
        "translations": translations,
        # For backward compatibility, include a single "translation" field
        # (first available non-source translation)
        "translation": next(iter(translations.values()), None),
    }

    # Publish to Ably
    try:
        client = get_ably_client()
        channel = client.channels.get(f"sport:{room_id}")
        await channel.publish("message", message_data)
    except Exception as e:
        logger.error(f"Ably publish error: {e}")
        raise HTTPException(500, "Failed to publish message")

    return {"success": True, "translations": translations}
