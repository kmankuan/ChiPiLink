"""
UI Style Service
Business logic for admin-configurable design templates.
"""
from typing import Dict, List
from datetime import datetime, timezone
from core.database import db
import logging

logger = logging.getLogger(__name__)

DEFAULT_STYLE_BASE = {
    "template": "default",
    "primary_color": "#16a34a",
    "font_family": "Inter",
    "border_radius": "0.75rem",
    "card_style": "elevated",
    "density": "comfortable",
}

DEFAULT_UI_STYLE = {
    **DEFAULT_STYLE_BASE,
    "public": {**DEFAULT_STYLE_BASE},
    "admin": {**DEFAULT_STYLE_BASE, "template": "minimal", "density": "compact"},
}

AVAILABLE_TEMPLATES = [
    {"id": "default", "name": "Default", "description": "Clean and modern with subtle green tones", "preview_colors": ["#16a34a", "#f0fdf4", "#1e293b"]},
    {"id": "elegant", "name": "Elegant", "description": "Sophisticated with deep purple and gold accents", "preview_colors": ["#7c3aed", "#faf5ff", "#1e1b4b"]},
    {"id": "warm", "name": "Warm", "description": "Inviting design with warm orange and cream palette", "preview_colors": ["#ea580c", "#fff7ed", "#431407"]},
    {"id": "ocean", "name": "Ocean", "description": "Cool blue tones with crisp white backgrounds", "preview_colors": ["#0284c7", "#f0f9ff", "#0c4a6e"]},
    {"id": "minimal", "name": "Minimal", "description": "Ultra-clean black and white with sharp contrasts", "preview_colors": ["#18181b", "#fafafa", "#52525b"]},
]


class UIStyleService:
    """Service for managing UI style/theme configuration"""

    async def get_style(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "ui_style"}, {"_id": 0})
        style = config.get("value", DEFAULT_UI_STYLE) if config else DEFAULT_UI_STYLE
        return {
            "style": style,
            "available_templates": AVAILABLE_TEMPLATES,
        }

    async def update_style(self, style: Dict, admin_id: str) -> bool:
        await db.app_config.update_one(
            {"config_key": "ui_style"},
            {"$set": {
                "config_key": "ui_style",
                "value": style,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": admin_id,
            }},
            upsert=True,
        )
        return True

    async def get_public_style(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "ui_style"}, {"_id": 0})
        if config and config.get("value"):
            return {"style": config["value"]}
        return {"style": DEFAULT_UI_STYLE}


ui_style_service = UIStyleService()
