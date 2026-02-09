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
    "layout": "mobile_app",
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
    {"id": "china_panama", "name": "China-Panama", "description": "Cultural fusion — Chinese red & gold with Panama blue", "preview_colors": ["#dc2626", "#fbbf24", "#1d4ed8"]},
]

AVAILABLE_LAYOUTS = [
    {"id": "mobile_app", "name": "Classic", "description": "Hero carousel, icon grid, stacked sections — original mobile app feel", "icon": "smartphone", "category": "structural"},
    {"id": "bento_grid", "name": "Bento Grid", "description": "Asymmetric tile dashboard — no hero, content in varied-size tiles like Notion/Apple", "icon": "layout-grid", "category": "structural"},
    {"id": "tab_hub", "name": "Tab Hub", "description": "Greeting + horizontal tabs (Services, Community, Events, Gallery) — WeChat/Grab style", "icon": "layout-list", "category": "structural"},
    {"id": "social_feed", "name": "Social Feed", "description": "Stories carousel + unified mixed-content timeline — Instagram/Twitter style", "icon": "rss", "category": "structural"},
    {"id": "magazine", "name": "Magazine", "description": "Featured article + 2-column editorial layout with sidebar — Medium/Bloomberg style", "icon": "book-open", "category": "structural"},
    {"id": "storefront", "name": "Storefront", "description": "Top category menu, hero banners, product grid — shopping experience", "icon": "store", "category": "css_overlay"},
    {"id": "portal", "name": "Portal", "description": "Left sidebar nav + top bar, content panels — returning users", "icon": "layout-dashboard", "category": "css_overlay"},
    {"id": "single_page", "name": "Single Page", "description": "Scrollable sections, sticky nav, anchor links — landing/marketing", "icon": "scroll", "category": "css_overlay"},
    {"id": "chat_app", "name": "Chat / App", "description": "Full-height layout, floating action button, swipe panels — community", "icon": "message-circle", "category": "css_overlay"},
    {"id": "card_grid", "name": "Card Grid", "description": "Masonry grid, filter bar, infinite scroll — content discovery", "icon": "grid-3x3", "category": "css_overlay"},
    {"id": "china_panama", "name": "China-Panama", "description": "Cultural fusion — lattice-inspired frames, red lantern accents, balanced symmetry", "icon": "globe", "category": "css_overlay"},
]


AVAILABLE_FONTS = [
    {"value": "Inter", "label": "Inter", "category": "sans-serif"},
    {"value": "Poppins", "label": "Poppins", "category": "sans-serif"},
    {"value": "DM Sans", "label": "DM Sans", "category": "sans-serif"},
    {"value": "Nunito", "label": "Nunito", "category": "sans-serif"},
    {"value": "Lora", "label": "Lora", "category": "serif"},
    {"value": "Source Sans 3", "label": "Source Sans 3", "category": "sans-serif"},
    {"value": "Noto Sans", "label": "Noto Sans", "category": "sans-serif"},
    {"value": "Rubik", "label": "Rubik", "category": "sans-serif"},
    {"value": "Outfit", "label": "Outfit", "category": "sans-serif"},
    {"value": "Space Grotesk", "label": "Space Grotesk", "category": "sans-serif"},
    {"value": "Merriweather", "label": "Merriweather", "category": "serif"},
    {"value": "Playfair Display", "label": "Playfair Display", "category": "serif"},
]

DENSITY_OPTIONS = [
    {"value": "compact", "label": "Compact", "description": "Dense layout, smaller spacing — native-app feel"},
    {"value": "comfortable", "label": "Comfortable", "description": "Balanced spacing — default"},
    {"value": "spacious", "label": "Spacious", "description": "Generous padding and whitespace"},
]


class UIStyleService:
    """Service for managing UI style/theme configuration"""

    async def get_style(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "ui_style"}, {"_id": 0})
        style = config.get("value", DEFAULT_UI_STYLE) if config else DEFAULT_UI_STYLE
        # Ensure public/admin sub-objects exist for backward compatibility
        if "public" not in style:
            style["public"] = {k: v for k, v in style.items() if k not in ("public", "admin")}
        if "admin" not in style:
            style["admin"] = {**DEFAULT_STYLE_BASE, "template": "minimal", "density": "compact"}
        return {
            "style": style,
            "available_templates": AVAILABLE_TEMPLATES,
            "available_fonts": AVAILABLE_FONTS,
            "available_layouts": AVAILABLE_LAYOUTS,
            "density_options": DENSITY_OPTIONS,
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
            style = config["value"]
            # Return public-specific style if available, else root-level
            public_style = style.get("public", {k: v for k, v in style.items() if k not in ("public", "admin")})
            admin_style = style.get("admin", {**DEFAULT_STYLE_BASE, "template": "minimal", "density": "compact"})
            return {"public": public_style, "admin": admin_style}
        return {"public": DEFAULT_STYLE_BASE, "admin": {**DEFAULT_STYLE_BASE, "template": "minimal", "density": "compact"}}


ui_style_service = UIStyleService()
