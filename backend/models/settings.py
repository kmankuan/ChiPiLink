from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List

class MatchSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    require_referee: bool = True
    min_score_to_win: int = 11
    min_lead_to_win: int = 2
    max_sets: int = 7
    default_sets_to_win: int = 2
    allow_past_matches: bool = True
    auto_validate: bool = False
    confirmation_required_from: str = "any_participant"

class RatingSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    default_system: str = "elo"
    initial_elo: int = 1000
    elo_k_factor: int = 32
    simple_points: Dict[str, int] = {"win": 3, "loss": 1, "draw": 0}
    performance: Dict[str, Any] = {
        "decay_days": 90,
        "min_matches_for_ranking": 3,
        "recent_form_weight": 0.5
    }

class LiveSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    enabled: bool = True
    auto_service_tracking: bool = True
    service_change_every: int = 2
    service_change_at_deuce: int = 1
    timeout_per_player: int = 1
    technique_tagging: bool = False
    spectator_reactions: bool = True

class EmotionConfig(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    label: str
    gif_url: str = ""
    css_class: str = ""
    duration_ms: int = 2500

class EmotionSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    enabled: bool = True
    streak_3: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="On Fire!", css_class="fire", duration_ms=2500
    ))
    streak_5: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Dragon Mode!", css_class="dragon", duration_ms=3000
    ))
    streak_break: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Streak Broken!", css_class="explosion", duration_ms=2000
    ))
    deuce: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Deuce!", css_class="lightning", duration_ms=2000
    ))
    match_point: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Match Point!", css_class="tension", duration_ms=2500
    ))
    winner: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Winner!", css_class="fireworks", duration_ms=4000
    ))
    comeback: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Comeback!", css_class="tsunami", duration_ms=3000
    ))
    perfect_set: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Perfect!", css_class="golden", duration_ms=3500
    ))
    upset: EmotionConfig = Field(default_factory=lambda: EmotionConfig(
        label="Upset!", css_class="shocked", duration_ms=2500
    ))

class DisplaySettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    theme: str = "chinese_modern"
    primary_color: str = "#C8102E"
    accent_color: str = "#B8860B"
    show_elo_on_cards: bool = True
    show_streak_counter: bool = True
    show_battle_path: bool = True
    battle_goal_icon: str = "trophy"

class StreamingSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    enabled: bool = True
    default_stream_platform: str = "telegram"

class TVLayout(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    header: str = "top"
    score: str = "center"
    chat: str = "right"
    timeline: str = "bottom"

class TVSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    theme: str = "fighting_game"
    background: str = "linear-gradient(180deg, #1a1a2e 0%, #0f0f23 100%)"
    accent_a: str = "#ef4444"
    accent_b: str = "#3b82f6"
    show_elo: bool = True
    show_photos: bool = True
    show_chat: bool = True
    show_battle_timeline: bool = True
    show_set_history: bool = True
    show_combo_counter: bool = True
    hp_bar_style: str = "chevron"
    score_size: str = "xl"
    photo_size: str = "lg"
    center_icon_url: str = ""
    set_win_messages: Dict[str, str] = {
        "en": "Congratulations {winner}!",
        "es": "¡Felicidades {winner}!",
        "zh": "恭喜 {winner}！"
    }
    match_win_messages: Dict[str, str] = {
        "en": "🏆 {winner} WINS!",
        "es": "🏆 ¡{winner} GANA!",
        "zh": "🏆 {winner} 赢！"
    }
    layout: TVLayout = Field(default_factory=TVLayout)

class RefereeSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    trusted_threshold: int = 20
    show_referee_rankings: bool = True
    allow_self_referee: bool = False

class ReactionItem(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    emoji: str
    label: str
    id: str

class ReactionSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    enabled: bool = True
    available: List[ReactionItem] = Field(default_factory=lambda: [
        ReactionItem(emoji="clap", label="Great!", id="clap"),
        ReactionItem(emoji="fire", label="Fire!", id="fire"),
        ReactionItem(emoji="wow", label="Wow!", id="wow"),
        ReactionItem(emoji="dragon", label="Dragon!", id="dragon"),
        ReactionItem(emoji="lantern", label="Respect", id="lantern"),
        ReactionItem(emoji="strong", label="Strong!", id="strong")
    ])

class SportSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    module_name: str = "Sport"
    module_name_display: Dict[str, str] = {
        "en": "Sport",
        "es": "Deporte",
        "zh": "体育"
    }
    enabled: bool = True
    match: MatchSettings = Field(default_factory=MatchSettings)
    rating: RatingSettings = Field(default_factory=RatingSettings)
    live: LiveSettings = Field(default_factory=LiveSettings)
    emotions: EmotionSettings = Field(default_factory=EmotionSettings)
    display: DisplaySettings = Field(default_factory=DisplaySettings)
    streaming: StreamingSettings = Field(default_factory=StreamingSettings)
    tv: TVSettings = Field(default_factory=TVSettings)
    referee: RefereeSettings = Field(default_factory=RefereeSettings)
    reactions: ReactionSettings = Field(default_factory=ReactionSettings)
