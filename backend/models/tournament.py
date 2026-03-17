from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from .player import PlayerSimple

class TournamentMatch(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    match_id: str
    round: int
    position: int
    player_a: Optional[PlayerSimple] = None
    player_b: Optional[PlayerSimple] = None
    winner_id: Optional[str] = None
    score: Optional[str] = None
    status: str = "pending"  # pending, in_progress, completed

class TournamentBracket(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    round: int
    name: str
    matches: List[TournamentMatch] = []

class TournamentSettings(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    auto_advance: bool = True
    show_seeding: bool = True
    bracket_style: str = "standard"

class Tournament(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    tournament_id: str
    name: str
    description: Optional[str] = None
    format: str = "single_elimination"
    status: str = "draft"  # draft, registration, in_progress, completed
    max_participants: int = 8
    min_participants: int = 4
    seeds_from_league: Optional[str] = None
    third_place_match: bool = True
    points_to_win: int = 11
    sets_to_win: int = 2
    participants: List[PlayerSimple] = []
    brackets: List[TournamentBracket] = []
    rounds: List[Dict[str, Any]] = []
    current_round: int = 1
    winner_id: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    settings: TournamentSettings = Field(default_factory=TournamentSettings)

class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    format: str = "single_elimination"
    max_participants: int = 8
    min_participants: int = 4
    seeds_from_league: Optional[str] = None
    third_place_match: bool = True
    points_to_win: int = 11
    sets_to_win: int = 2

class TournamentRegistration(BaseModel):
    player_id: str

class TournamentMatchResult(BaseModel):
    winner_id: str
    score_winner: int
    score_loser: int
