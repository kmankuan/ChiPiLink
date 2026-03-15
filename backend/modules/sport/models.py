"""
Sport Module — Data Models
Table tennis matches, players, leagues, live scoring
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime


# ═══ PLAYERS ═══

class PlayerCreate(BaseModel):
    nickname: str
    name: Optional[str] = None

class PlayerUpdate(BaseModel):
    nickname: Optional[str] = None
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class PlayerLinkRequest(BaseModel):
    user_id: str


# ═══ MATCHES ═══

class MatchRecordRequest(BaseModel):
    """Record a completed match by typing player names"""
    player_a_name: str
    player_b_name: str
    referee_name: str
    winner_name: str
    score_winner: int = 11
    score_loser: int = 0
    league_id: Optional[str] = None
    notes: Optional[str] = None


# ═══ LIVE SCORING ═══

class LiveMatchCreate(BaseModel):
    """Start a live match for real-time scoring"""
    player_a_name: str
    player_b_name: str
    referee_name: str
    player_a_photo: Optional[str] = None
    player_b_photo: Optional[str] = None
    referee_photo: Optional[str] = None
    league_id: Optional[str] = None
    sets_to_win: int = 2  # best of 3 = 2, best of 5 = 3
    points_to_win: int = 11
    stream_url: Optional[str] = None  # Telegram/YouTube live link

class LivePointScore(BaseModel):
    """Score a point in a live match"""
    scored_by: str  # 'a' or 'b'
    technique: Optional[str] = None  # forehand, backhand, serve_ace, etc.


# ═══ LEAGUES ═══

class LeagueCreate(BaseModel):
    name: str
    description: Optional[str] = None
    season: Optional[str] = None
    rating_system: str = "elo"  # simple_points | elo | performance
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class LeagueUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    rating_system: Optional[str] = None
