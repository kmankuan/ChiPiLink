"""
PinPan Arena - Models
Unified tournament system for PinPanClub.
Supports: Single Elimination, Round Robin, Group + Knockout, RapidPin Mode
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ============== ENUMS ==============

class TournamentFormat(str, Enum):
    SINGLE_ELIMINATION = "single_elimination"
    ROUND_ROBIN = "round_robin"
    GROUP_KNOCKOUT = "group_knockout"
    RAPIDPIN = "rapidpin"


class TournamentStatus(str, Enum):
    DRAFT = "draft"
    REGISTRATION_OPEN = "registration_open"
    REGISTRATION_CLOSED = "registration_closed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ArenaMatchStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BYE = "bye"
    WALKOVER = "walkover"


class SeedingSource(str, Enum):
    NONE = "none"
    SUPERPIN = "superpin"
    RAPIDPIN = "rapidpin"
    MANUAL = "manual"
    ELO = "elo"


# ============== PARTICIPANT MODEL ==============

class TournamentParticipant(BaseModel):
    player_id: str
    player_name: str = ""
    player_avatar: Optional[str] = None
    seed: Optional[int] = None
    group: Optional[str] = None  # For group stage
    registered_at: Optional[str] = None
    status: str = "registered"  # registered, withdrawn, eliminated, active


# ============== GROUP STAGE STANDING ==============

class GroupStanding(BaseModel):
    player_id: str
    player_name: str = ""
    played: int = 0
    won: int = 0
    lost: int = 0
    sets_won: int = 0
    sets_lost: int = 0
    points: int = 0


# ============== ARENA MATCH MODEL ==============

class ArenaMatchCreate(BaseModel):
    tournament_id: str
    round_num: int = 1
    position: int = 0
    player_a_id: Optional[str] = None
    player_b_id: Optional[str] = None
    group: Optional[str] = None
    scheduled_time: Optional[str] = None


class ArenaMatch(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    match_id: str
    tournament_id: str
    round_num: int = 1
    position: int = 0
    group: Optional[str] = None

    player_a_id: Optional[str] = None
    player_b_id: Optional[str] = None
    player_a_name: str = ""
    player_b_name: str = ""

    score_a: int = 0
    score_b: int = 0
    sets: List[Dict[str, int]] = []  # [{"a": 11, "b": 9}, ...]

    winner_id: Optional[str] = None
    status: ArenaMatchStatus = ArenaMatchStatus.PENDING

    scheduled_time: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None


# ============== TOURNAMENT CREATE/UPDATE ==============

class TournamentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    format: TournamentFormat = TournamentFormat.SINGLE_ELIMINATION
    max_players: int = 16
    best_of: int = 3
    points_per_set: int = 11
    third_place_match: bool = True

    # Scheduling
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None

    # Seeding
    seeding_source: SeedingSource = SeedingSource.NONE
    seeding_league_id: Optional[str] = None
    seeding_season_id: Optional[str] = None

    # Group stage config (for group_knockout)
    num_groups: int = 4
    players_per_group_advance: int = 2

    # RapidPin mode config
    rapidpin_deadline_hours: Optional[int] = 72
    points_win: int = 3
    points_loss: int = 1

    image_url: Optional[str] = None


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    max_players: Optional[int] = None
    best_of: Optional[int] = None
    points_per_set: Optional[int] = None
    third_place_match: Optional[bool] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None
    status: Optional[TournamentStatus] = None
    image_url: Optional[str] = None
    num_groups: Optional[int] = None
    players_per_group_advance: Optional[int] = None
    rapidpin_deadline_hours: Optional[int] = None
    points_win: Optional[int] = None
    points_loss: Optional[int] = None


# ============== TOURNAMENT MODEL ==============

class Tournament(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tournament_id: str
    name: str
    description: Optional[str] = None
    format: TournamentFormat = TournamentFormat.SINGLE_ELIMINATION
    status: TournamentStatus = TournamentStatus.DRAFT
    max_players: int = 16
    best_of: int = 3
    points_per_set: int = 11
    third_place_match: bool = True

    # Seeding
    seeding_source: SeedingSource = SeedingSource.NONE
    seeding_league_id: Optional[str] = None
    seeding_season_id: Optional[str] = None

    # Schedule
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    registration_deadline: Optional[str] = None

    # Group config
    num_groups: int = 4
    players_per_group_advance: int = 2

    # RapidPin config
    rapidpin_deadline_hours: Optional[int] = 72
    points_win: int = 3
    points_loss: int = 1

    # Participants
    participants: List[TournamentParticipant] = []
    total_participants: int = 0

    # Brackets / Groups / Standings
    brackets: List[Dict[str, Any]] = []
    groups: Dict[str, List[str]] = {}  # group_name -> [player_ids]
    group_standings: Dict[str, List[Dict]] = {}  # group_name -> [standings]

    # Results
    champion_id: Optional[str] = None
    runner_up_id: Optional[str] = None
    third_place_id: Optional[str] = None

    # Metadata
    created_by: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
