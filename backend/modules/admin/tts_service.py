"""
Text-to-Speech Service for notification announcements.
Uses OpenAI TTS via emergentintegrations for high-quality voice output.
"""
import os
import logging
import hashlib
from typing import Optional, Dict
from datetime import datetime, timezone

from emergentintegrations.llm.openai import OpenAITextToSpeech
from dotenv import load_dotenv

from core.database import db

load_dotenv()

logger = logging.getLogger(__name__)

# In-memory cache for recent audio (avoid re-generating same text)
_audio_cache: Dict[str, str] = {}
_CACHE_MAX = 50


class TTSService:
    def __init__(self):
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if api_key:
            self.tts = OpenAITextToSpeech(api_key=api_key)
        else:
            self.tts = None
            logger.warning("EMERGENT_LLM_KEY not set — TTS disabled")

    async def generate_speech(
        self,
        text: str,
        voice: str = "nova",
        speed: float = 1.0,
        model: str = "tts-1",
    ) -> Optional[str]:
        """Generate speech audio from text, returns base64 string."""
        if not self.tts or not text:
            return None

        # Check cache
        cache_key = hashlib.md5(f"{text}:{voice}:{speed}:{model}".encode()).hexdigest()
        if cache_key in _audio_cache:
            return _audio_cache[cache_key]

        try:
            audio_b64 = await self.tts.generate_speech_base64(
                text=text[:4096],
                model=model,
                voice=voice,
                speed=speed,
                response_format="mp3",
            )

            # Cache (evict oldest if full)
            if len(_audio_cache) >= _CACHE_MAX:
                oldest_key = next(iter(_audio_cache))
                del _audio_cache[oldest_key]
            _audio_cache[cache_key] = audio_b64

            return audio_b64
        except Exception as e:
            logger.error(f"TTS generation failed: {e}")
            return None

    async def get_settings(self) -> Dict:
        """Get TTS notification settings."""
        doc = await db.site_config.find_one(
            {"config_type": "tts_settings"}, {"_id": 0}
        )
        defaults = {
            "enabled": True,
            "voice": "nova",
            "speed": 1.0,
            "model": "tts-1",
            "language": "es",
            "enabled_events": [
                "order_submitted", "access_request", "access_request_approved",
                "access_request_rejected", "access_request_updated",
                "user_registered", "wallet_topup", "crm_message",
                "order_status_changed",
            ],
            "volume": 0.8,
            "queue_mode": "sequential",
        }
        if not doc:
            return defaults
        saved = doc.get("settings", {})
        return {**defaults, **saved}

    async def update_settings(self, settings: Dict) -> Dict:
        """Update TTS notification settings."""
        await db.site_config.update_one(
            {"config_type": "tts_settings"},
            {"$set": {
                "config_type": "tts_settings",
                "settings": settings,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }},
            upsert=True,
        )
        return settings


tts_service = TTSService()
