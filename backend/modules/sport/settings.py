"""
Sport Module — Settings & Default Configuration
All features have admin-configurable settings with sensible defaults.
"""
from core.database import db
from datetime import datetime, timezone
import logging

logger = logging.getLogger("sport.settings")

COLLECTION = "sport_settings"

# ═══ DEFAULT SETTINGS ═══
DEFAULTS = {
    # General
    "module_name": "Sport",
    "module_name_display": {"en": "Sport", "es": "Deporte", "zh": "\u4f53\u80b2"},
    "enabled": True,

    # Match Recording
    "match": {
        "require_referee": True,
        "min_score_to_win": 11,
        "min_lead_to_win": 2,
        "max_sets": 7,
        "default_sets_to_win": 2,
        "allow_past_matches": True,  # Can add matches that already happened
        "auto_validate": False,  # If true, matches are validated immediately (no confirmation)
        "confirmation_required_from": "any_participant",  # any_participant | referee | moderator
    },

    # Rating Systems
    "rating": {
        "default_system": "elo",
        "initial_elo": 1000,
        "elo_k_factor": 32,  # How much a single match can change ELO
        "simple_points": {"win": 3, "loss": 1, "draw": 0},
        "performance": {
            "decay_days": 90,  # Ratings decay after inactivity
            "min_matches_for_ranking": 3,
            "recent_form_weight": 0.5,  # Weight of last 5 matches
        },
    },

    # Live Scoring
    "live": {
        "enabled": True,
        "auto_service_tracking": True,
        "service_change_every": 2,  # points
        "service_change_at_deuce": 1,  # points at deuce
        "timeout_per_player": 1,
        "technique_tagging": False,  # Phase 2 feature
        "spectator_reactions": True,
    },

    # Emotion Effects (GIF/Sticker)
    "emotions": {
        "enabled": True,
        "streak_3": {"label": "On Fire!", "gif_url": "", "css_class": "fire", "duration_ms": 2500},
        "streak_5": {"label": "Dragon Mode!", "gif_url": "", "css_class": "dragon", "duration_ms": 3000},
        "streak_break": {"label": "Streak Broken!", "gif_url": "", "css_class": "explosion", "duration_ms": 2000},
        "deuce": {"label": "Deuce!", "gif_url": "", "css_class": "lightning", "duration_ms": 2000},
        "match_point": {"label": "Match Point!", "gif_url": "", "css_class": "tension", "duration_ms": 2500},
        "winner": {"label": "Winner!", "gif_url": "", "css_class": "fireworks", "duration_ms": 4000},
        "comeback": {"label": "Comeback!", "gif_url": "", "css_class": "tsunami", "duration_ms": 3000},
        "perfect_set": {"label": "Perfect!", "gif_url": "", "css_class": "golden", "duration_ms": 3500},
        "upset": {"label": "Upset!", "gif_url": "", "css_class": "shocked", "duration_ms": 2500},
    },

    # Display
    "display": {
        "theme": "chinese_modern",
        "primary_color": "#C8102E",
        "accent_color": "#B8860B",
        "show_elo_on_cards": True,
        "show_streak_counter": True,
        "show_battle_path": True,
        "battle_goal_icon": "trophy",  # trophy | dragon | lantern | star | crown
    },

    # Spectator / Streaming
    "streaming": {
        "enabled": True,
        "default_stream_platform": "telegram",
    },

    # TV Display Themes
    "tv": {
        "theme": "fighting_game",  # fighting_game | stadium | race_track
        "background": "linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)",
        "accent_a": "#ef4444",   # Player A color (red)
        "accent_b": "#3b82f6",   # Player B color (blue)
        "show_elo": True,
        "show_photos": True,
        "show_chat": True,
        "show_battle_timeline": True,
        "show_set_history": True,
        "show_combo_counter": True,
        "hp_bar_style": "gradient",  # gradient | solid | neon
        "score_size": "xl",
        "photo_size": "lg",
        "center_icon_url": "",  # GIF/image between HP bars. Empty = 🏓 emoji
        "set_win_messages": {
            "en": "Congratulations {winner}! This set is yours!",
            "es": "¡Felicidades {winner}! ¡Este set es tuyo!",
            "zh": "恭喜 {winner}！这局是你的！",
        },
        "match_win_messages": {
            "en": "🏆 {winner} WINS THE MATCH!",
            "es": "🏆 ¡{winner} GANA EL PARTIDO!",
            "zh": "🏆 {winner} 赢得比赛！",
        },
        "layout": {
            "header": "top",  # top | hidden
            "score": "center",  # center | top
            "chat": "right",  # right | bottom | hidden
            "timeline": "bottom",  # bottom | middle | hidden
        },
    },

    # Referee
    "referee": {
        "trusted_threshold": 20,  # Matches needed for "Trusted Referee" badge
        "show_referee_rankings": True,
        "allow_self_referee": False,  # Can a player referee their own match?
    },

    # Reactions
    "reactions": {
        "enabled": True,
        "available": [
            {"emoji": "clap", "label": "Great!", "id": "clap"},
            {"emoji": "fire", "label": "Fire!", "id": "fire"},
            {"emoji": "wow", "label": "Wow!", "id": "wow"},
            {"emoji": "dragon", "label": "Dragon!", "id": "dragon"},
            {"emoji": "lantern", "label": "Respect", "id": "lantern"},
            {"emoji": "strong", "label": "Strong!", "id": "strong"},
        ],
    },
}


async def get_settings() -> dict:
    """Get sport settings, merged with defaults."""
    doc = await db.sport_settings.find_one({"config_key": "sport_config"}, {"_id": 0})
    if not doc:
        return DEFAULTS.copy()
    custom = doc.get("value", {})
    # Deep merge: defaults + custom overrides
    return _deep_merge(DEFAULTS, custom)


async def update_settings(section: str, data: dict) -> dict:
    """Update a specific settings section."""
    current = await get_settings()
    if section in current and isinstance(current[section], dict):
        current[section].update(data)
    else:
        current[section] = data
    await db.sport_settings.update_one(
        {"config_key": "sport_config"},
        {"$set": {"config_key": "sport_config", "value": current, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return current


async def get_section(section: str) -> dict:
    """Get a specific settings section."""
    settings = await get_settings()
    return settings.get(section, {})


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge override into base."""
    result = base.copy()
    for k, v in override.items():
        if k in result and isinstance(result[k], dict) and isinstance(v, dict):
            result[k] = _deep_merge(result[k], v)
        else:
            result[k] = v
    return result
