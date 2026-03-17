from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime

class MatchPlayer(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    player_id: str
    nickname: str
    elo_before: int
    elo_change: int = 0

class MatchReferee(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    player_id: str
    nickname: str

class Match(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    match_id: str
    player_a: MatchPlayer
    player_b: MatchPlayer
    referee: Optional[MatchReferee] = None
    winner_id: Optional[str] = None
    score_winner: Optional[int] = None
    score_loser: Optional[int] = None
    league_id: Optional[str] = None
    tournament_id: Optional[str] = None
    status: str = "pending"  # pending, validated, rejected
    notes: Optional[str] = None
    source: str = "manual"  # manual, live, tournament
    created_at: datetime
    validated_at: Optional[datetime] = None
    validated_by: Optional[str] = None

class MatchCreate(BaseModel):
    player_a_id: str
    player_b_id: str
    referee_id: Optional[str] = None
    winner_id: str
    score_winner: int
    score_loser: int
    league_id: Optional[str] = None
    tournament_id: Optional[str] = None
    notes: Optional[str] = None
    source: str = "manual"

class MatchValidation(BaseModel):
    status: str  # validated, rejected
    notes: Optional[str] = None
