"""
Widget Configuration Service
Manages widget settings: enabled features, appearance, allowed origins.
"""
from typing import Dict, Optional
from core.database import db

DEFAULT_WIDGET_CONFIG = {
    "enabled": True,
    "site_url": "https://chipilink.me",
    "features": {
        "textbook_orders": {"enabled": True, "label": "Textbook Orders", "order": 0},
        "my_students": {"enabled": True, "label": "My Students", "order": 1},
        "order_status": {"enabled": True, "label": "Order Status", "order": 2},
        "notifications": {"enabled": True, "label": "Notifications", "order": 3},
        "wallet": {"enabled": True, "label": "Wallet", "order": 4},
    },
    "display": {
        "hide_url_bar": True,
        "hide_navbar": True,
        "hide_footer": True,
        "streamlined_flow": True,
    },
    "appearance": {
        "primary_color": "#16a34a",
        "accent_color": "#f59e0b",
        "font_family": "Inter",
        "border_radius": "0.75rem",
        "compact_mode": True,
    },
    "placement": {
        "floating_button": True,
        "floating_position": "bottom-right",
        "floating_label": "ChiPi Link",
        "sidebar_width": "380px",
        "fullpage_max_width": "900px",
    },
    "security": {
        "allowed_origins": ["https://laopan.online", "https://www.laopan.online"],
    },
}


class WidgetConfigService:
    async def get_config(self) -> Dict:
        config = await db.app_config.find_one({"config_key": "widget_config"}, {"_id": 0})
        if config and config.get("value"):
            merged = {**DEFAULT_WIDGET_CONFIG, **config["value"]}
            merged["features"] = {**DEFAULT_WIDGET_CONFIG["features"], **(config["value"].get("features") or {})}
            merged["display"] = {**DEFAULT_WIDGET_CONFIG["display"], **(config["value"].get("display") or {})}
            merged["appearance"] = {**DEFAULT_WIDGET_CONFIG["appearance"], **(config["value"].get("appearance") or {})}
            merged["placement"] = {**DEFAULT_WIDGET_CONFIG["placement"], **(config["value"].get("placement") or {})}
            merged["security"] = {**DEFAULT_WIDGET_CONFIG["security"], **(config["value"].get("security") or {})}
            return merged
        return DEFAULT_WIDGET_CONFIG

    async def update_config(self, data: Dict, admin_id: Optional[str] = None) -> Dict:
        await db.app_config.update_one(
            {"config_key": "widget_config"},
            {"$set": {"value": data, "updated_by": admin_id}},
            upsert=True,
        )
        return await self.get_config()

    async def reset_config(self, admin_id: Optional[str] = None) -> Dict:
        """Reset widget config to defaults."""
        await db.app_config.update_one(
            {"config_key": "widget_config"},
            {"$set": {"value": DEFAULT_WIDGET_CONFIG, "updated_by": admin_id}},
            upsert=True,
        )
        return DEFAULT_WIDGET_CONFIG

    async def get_public_config(self) -> Dict:
        """Return only what the embed script needs (no security internals)."""
        config = await self.get_config()
        enabled_features = {
            k: {"label": v["label"], "order": v["order"]}
            for k, v in config["features"].items()
            if v.get("enabled")
        }
        return {
            "enabled": config["enabled"],
            "features": enabled_features,
            "appearance": config["appearance"],
            "placement": config["placement"],
        }


widget_config_service = WidgetConfigService()
