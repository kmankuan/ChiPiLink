from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class PlayerStats(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    matches: int = 0
    wins: int = 0
    losses: int = 0
    win_rate: float = 0.0
    current_streak: int = 0
    best_streak: int = 0
    matches_refereed: int = 0

class Player(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    player_id: str
    nickname: str
    name: str
    elo: int = 1000
    active: bool = True
    roles: List[str] = ["player"]
    linked_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    photo_base64: Optional[str] = None  # base64 encoded photo
    stats: PlayerStats = Field(default_factory=PlayerStats)
    created_at: datetime
    created_from: str = "admin"  # admin, match, registration
    updated_at: Optional[datetime] = None

class PlayerCreate(BaseModel):
    nickname: str
    name: Optional[str] = None
    elo: int = 1000
    roles: List[str] = ["player"]
    linked_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    created_from: str = "admin"

class PlayerUpdate(BaseModel):
    nickname: Optional[str] = None
    name: Optional[str] = None
    elo: Optional[int] = None
    roles: Optional[List[str]] = None
    linked_user_id: Optional[str] = None
    avatar_url: Optional[str] = None
    active: Optional[bool] = None

class PlayerSimple(BaseModel):
    player_id: str
    nickname: str
    elo: Optional[int] = None
    photo_url: Optional[str] = None
    seed: Optional[int] = None
    registered_at: Optional[datetime] = None
