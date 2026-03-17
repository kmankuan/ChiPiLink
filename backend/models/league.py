from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class League(BaseModel):
    model_config = ConfigDict(extra="allow")
    
    league_id: str
    name: str
    description: Optional[str] = None
    season: Optional[str] = None
    rating_system: str = "elo"
    status: str = "active"  # active, inactive, completed
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    total_matches: int = 0
    total_players: int = 0
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class LeagueCreate(BaseModel):
    name: str
    description: Optional[str] = None
    season: Optional[str] = None
    rating_system: str = "elo"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    season: Optional[str] = None
    rating_system: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
