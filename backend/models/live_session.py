from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from models.player import PlayerSimple

class LiveSessionSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    sets_to_win: int = 2
    points_to_win: int = 11
    auto_service: bool = True
    auto_swap_sides: bool = True

class ScoreState(BaseModel):
    a: int = 0
    b: int = 0

class Point(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    num: int
    set: int
    scored_by: str  # "a" or "b"
    score_after: ScoreState
    technique: Optional[str] = None
    server: str  # "a" or "b"
    timestamp: datetime
    streak: int = 1
    emotions: List[str] = []
    momentum: float = 1.0

class Card(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    player: str  # "a" or "b"
    type: str  # "yellow", "red"
    reason: str
    timestamp: datetime

class Call(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    type: str  # "timeout", "injury", "disputed"
    player: Optional[str] = None  # "a" or "b" or None for referee call
    timestamp: datetime
    duration: Optional[int] = None

class LiveSessionTimers(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    match_start: Optional[datetime] = None
    set_starts: List[datetime] = []
    set_durations: List[int] = []

class LiveSessionDisplay(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    swapped: bool = False
    last_emotion: Optional[str] = None
    last_emotion_side: Optional[str] = None
    last_emotion_at: Optional[datetime] = None
    is_public: bool = True
    broadcast_mode: Optional[str] = None
    broadcast_data: Dict[str, Any] = {}
    last_card: Optional[Card] = None
    last_call: Optional[Call] = None
    last_effect: Optional[str] = None
    last_effect_at: Optional[datetime] = None

class LiveSession(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    session_id: str
    status: str = "live"  # live, paused, completed
    player_a: PlayerSimple
    player_b: PlayerSimple
    referee: Optional[PlayerSimple] = None
    league_id: Optional[str] = None
    tournament_id: Optional[str] = None
    stream_url: Optional[str] = None
    settings: LiveSessionSettings = Field(default_factory=LiveSessionSettings)
    current_set: int = 1
    sets: List[Dict[str, Any]] = []
    score: ScoreState = Field(default_factory=ScoreState)
    sets_won: ScoreState = Field(default_factory=ScoreState)
    server: str = "a"  # "a" or "b"
    points: List[Point] = []
    all_points: List[Point] = []
    timeouts: ScoreState = Field(default_factory=ScoreState)
    cards: List[Card] = []
    calls: List[Call] = []
    reactions: Dict[str, Any] = {}
    spectator_count: int = 0
    created_at: datetime
    timers: LiveSessionTimers = Field(default_factory=LiveSessionTimers)
    display: LiveSessionDisplay = Field(default_factory=LiveSessionDisplay)

class LiveSessionCreate(BaseModel):
    player_a_id: str
    player_b_id: str
    referee_id: Optional[str] = None
    league_id: Optional[str] = None
    tournament_id: Optional[str] = None
    stream_url: Optional[str] = None
    settings: Optional[LiveSessionSettings] = None

class ScorePoint(BaseModel):
    scored_by: str  # "a" or "b"
    technique: Optional[str] = None

class RefereeUpdate(BaseModel):
    referee_id: str
