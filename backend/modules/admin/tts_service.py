"""
Text-to-Speech Service for notification announcements.
Supports OpenAI TTS (via emergentintegrations) and ElevenLabs as providers.
"""
import os
import logging
import hashlib
import base64
from typing import Optional, Dict, List
from datetime import datetime, timezone

from emergentintegrations.llm.openai import OpenAITextToSpeech
from dotenv import load_dotenv

from core.database import db

load_dotenv()

logger = logging.getLogger(__name__)

# In-memory cache for recent audio (avoid re-generating same text)
_audio_cache: Dict[str, str] = {}
_CACHE_MAX = 50

# ElevenLabs default voices (id → label)
ELEVENLABS_DEFAULT_VOICES = [
    {"id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "label": "Rachel (Calm)"},
    {"id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "label": "Domi (Strong)"},
    {"id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "label": "Bella (Soft)"},
    {"id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "label": "Antoni (Warm)"},
    {"id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "label": "Elli (Young)"},
    {"id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "label": "Josh (Deep)"},
    {"id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "label": "Arnold (Bold)"},
    {"id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "label": "Adam (Clear)"},
    {"id": "yoZ06aMxZJJ28mfd3POQ", "name": "Sam", "label": "Sam (Raspy)"},
]


class TTSService:
    def __init__(self):
        # OpenAI TTS
        openai_key = os.environ.get("EMERGENT_LLM_KEY")
        self.openai_tts = OpenAITextToSpeech(api_key=openai_key) if openai_key else None

        # ElevenLabs
        self.elevenlabs_key = os.environ.get("ELEVENLABS_API_KEY")
        self._elevenlabs_client = None

    def _get_elevenlabs_client(self):
        """Lazy-init ElevenLabs client (key may be added later)."""
        key = os.environ.get("ELEVENLABS_API_KEY") or self.elevenlabs_key
        if not key:
            return None
        if not self._elevenlabs_client:
            from elevenlabs import ElevenLabs
            self._elevenlabs_client = ElevenLabs(api_key=key)
        return self._elevenlabs_client

    async def generate_speech(
        self,
        text: str,
        provider: str = "openai",
        voice: str = "nova",
        speed: float = 1.0,
        model: str = "tts-1",
        voice_id: str = "",
        stability: float = 0.5,
        similarity_boost: float = 0.75,
    ) -> Optional[str]:
        """Generate speech audio from text, returns base64 string."""
        if not text:
            return None

        cache_key = hashlib.md5(
            f"{provider}:{text}:{voice}:{voice_id}:{speed}:{model}:{stability}".encode()
        ).hexdigest()
        if cache_key in _audio_cache:
            return _audio_cache[cache_key]

        audio_b64 = None
        if provider == "elevenlabs":
            audio_b64 = await self._generate_elevenlabs(text, voice_id or voice, stability, similarity_boost)
        else:
            audio_b64 = await self._generate_openai(text, voice, speed, model)

        if audio_b64:
            if len(_audio_cache) >= _CACHE_MAX:
                oldest_key = next(iter(_audio_cache))
                del _audio_cache[oldest_key]
            _audio_cache[cache_key] = audio_b64

        return audio_b64

    async def _generate_openai(self, text: str, voice: str, speed: float, model: str) -> Optional[str]:
        if not self.openai_tts:
            return None
        try:
            return await self.openai_tts.generate_speech_base64(
                text=text[:4096], model=model, voice=voice,
                speed=speed, response_format="mp3",
            )
        except Exception as e:
            logger.error(f"OpenAI TTS failed: {e}")
            return None

    async def _generate_elevenlabs(self, text: str, voice_id: str, stability: float, similarity_boost: float) -> Optional[str]:
        client = self._get_elevenlabs_client()
        if not client:
            return None
        try:
            from elevenlabs import VoiceSettings
            audio_gen = client.text_to_speech.convert(
                text=text[:5000],
                voice_id=voice_id or "21m00Tcm4TlvDq8ikWAM",
                model_id="eleven_multilingual_v2",
                voice_settings=VoiceSettings(
                    stability=stability,
                    similarity_boost=similarity_boost,
                ),
            )
            audio_data = b""
            for chunk in audio_gen:
                audio_data += chunk
            return base64.b64encode(audio_data).decode()
        except Exception as e:
            logger.error(f"ElevenLabs TTS failed: {e}")
            return None

    async def get_elevenlabs_voices(self) -> List[Dict]:
        """Fetch available ElevenLabs voices. Returns defaults if API unavailable."""
        client = self._get_elevenlabs_client()
        if not client:
            return ELEVENLABS_DEFAULT_VOICES
        try:
            resp = client.voices.get_all()
            voices = []
            for v in resp.voices:
                voices.append({
                    "id": v.voice_id,
                    "name": v.name,
                    "label": f"{v.name} ({v.labels.get('accent', v.labels.get('description', ''))[:20]})" if v.labels else v.name,
                })
            return voices if voices else ELEVENLABS_DEFAULT_VOICES
        except Exception as e:
            logger.warning(f"Failed to fetch ElevenLabs voices: {e}")
            return ELEVENLABS_DEFAULT_VOICES

    async def get_provider_status(self) -> Dict:
        """Check which providers are available."""
        el_key = os.environ.get("ELEVENLABS_API_KEY")
        return {
            "openai": {"available": self.openai_tts is not None, "name": "OpenAI"},
            "elevenlabs": {"available": bool(el_key), "name": "ElevenLabs"},
        }

    async def get_settings(self) -> Dict:
        """Get TTS notification settings."""
        doc = await db.site_config.find_one(
            {"config_type": "tts_settings"}, {"_id": 0}
        )
        defaults = {
            "enabled": True,
            "provider": "openai",
            "voice": "nova",
            "speed": 1.0,
            "model": "tts-1",
            "language": "es",
            "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM",
            "elevenlabs_stability": 0.5,
            "elevenlabs_similarity": 0.75,
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
