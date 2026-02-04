"""
Super Pin Ranking - Repositories
Data access for the ranking system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections


class SuperPinLeagueRepository(BaseRepository):
    """
    Repository for Super Pin leagues.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_LEAGUES
    ID_FIELD = "league_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, league_data: Dict) -> Dict:
        """Create new league"""
        league_data["league_id"] = f"league_{uuid.uuid4().hex[:12]}"
        league_data["created_at"] = datetime.now(timezone.utc).isoformat()
        league_data["updated_at"] = league_data["created_at"]
        league_data["total_matches"] = 0
        league_data["total_players"] = 0
        return await self.insert_one(league_data)
    
    async def get_by_id(self, league_id: str) -> Optional[Dict]:
        """Get league by ID"""
        # Support both old and new field names during migration
        result = await self.find_one({self.ID_FIELD: league_id})
        if not result:
            result = await self.find_one({"liga_id": league_id})
        return result
    
    async def get_active_leagues(self) -> List[Dict]:
        """Get active leagues"""
        return await self.find_many(
            query={"status": "active"},
            sort=[("created_at", -1)]
        )
    
    async def get_all_leagues(self, limit: int = 50) -> List[Dict]:
        """Get all leagues"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_league(self, league_id: str, data: Dict) -> bool:
        """Update league"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        # Try both field names
        result = await self.update_by_id(self.ID_FIELD, league_id, data)
        if not result:
            result = await self.update_by_id("liga_id", league_id, data)
        return result
    
    async def increment_stats(self, league_id: str, matches: int = 0, players: int = 0) -> bool:
        """Increment statistics of the league"""
        update = {}
        if matches:
            update["total_matches"] = matches
        if players:
            update["total_players"] = players
        
        if update:
            result = await self._collection.update_one(
                {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                {"$inc": update, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return result.modified_count > 0
        return False


class PlayerCheckInRepository(BaseRepository):
    """
    Repository for player check-ins.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_CHECKINS
    ID_FIELD = "checkin_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, checkin_data: Dict) -> Dict:
        """Create new check-in"""
        checkin_data["checkin_id"] = f"checkin_{uuid.uuid4().hex[:12]}"
        checkin_data["check_in_time"] = datetime.now(timezone.utc).isoformat()
        checkin_data["is_active"] = True
        return await self.insert_one(checkin_data)
    
    async def get_active_checkins(self, league_id: str) -> List[Dict]:
        """Get players currently in the club"""
        return await self.find_many(
            query={
                "$or": [{"league_id": league_id}, {"liga_id": league_id}],
                "is_active": True
            },
            sort=[("check_in_time", -1)]
        )
    
    async def get_player_checkin(self, league_id: str, player_id: str) -> Optional[Dict]:
        """Get active check-in for a player"""
        return await self.find_one({
            "$and": [
                {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                {"$or": [{"player_id": player_id}, {"jugador_id": player_id}]}
            ],
            "is_active": True
        })
    
    async def checkout(self, checkin_id: str) -> bool:
        """Perform checkout"""
        result = await self._collection.update_one(
            {"checkin_id": checkin_id},
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0
    
    async def checkout_by_player(self, league_id: str, player_id: str) -> bool:
        """Perform checkout by player"""
        result = await self._collection.update_many(
            {
                "$and": [
                    {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                    {"$or": [{"player_id": player_id}, {"jugador_id": player_id}]}
                ],
                "is_active": True
            },
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0
    
    async def auto_checkout_expired(self, hours: int = 8) -> int:
        """Automatic checkout of expired check-ins"""
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        result = await self._collection.update_many(
            {"is_active": True, "check_in_time": {"$lt": cutoff}},
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count


class SuperPinMatchRepository(BaseRepository):
    """
    Repository for Super Pin matches.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_MATCHES
    ID_FIELD = "match_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, match_data: Dict) -> Dict:
        """Create new match"""
        match_data["match_id"] = f"spm_{uuid.uuid4().hex[:12]}"
        match_data["created_at"] = datetime.now(timezone.utc).isoformat()
        match_data["updated_at"] = match_data["created_at"]
        match_data["status"] = "pending"
        return await self.insert_one(match_data)
    
    async def get_by_id(self, match_id: str) -> Optional[Dict]:
        """Get match by ID"""
        result = await self.find_one({self.ID_FIELD: match_id})
        if not result:
            result = await self.find_one({"partido_id": match_id})
        return result
    
    async def get_league_matches(
        self,
        league_id: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get matches from a league"""
        query = {"$or": [{"league_id": league_id}, {"liga_id": league_id}]}
        if status:
            query["status"] = status
        
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_player_matches(
        self,
        league_id: str,
        player_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get matches for a player in a league"""
        return await self.find_many(
            query={
                "$and": [
                    {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                    {"$or": [
                        {"player_a_id": player_id},
                        {"player_b_id": player_id}
                    ]}
                ]
            },
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_match(self, match_id: str, data: Dict) -> bool:
        """Update match"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await self.update_by_id(self.ID_FIELD, match_id, data)
        if not result:
            result = await self.update_by_id("partido_id", match_id, data)
        return result
    
    async def get_head_to_head(
        self,
        league_id: str,
        player_a_id: str,
        player_b_id: str
    ) -> List[Dict]:
        """Get match history between two players"""
        return await self.find_many(
            query={
                "$and": [
                    {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                    {"$or": [
                        {"player_a_id": player_a_id, "player_b_id": player_b_id},
                        {"player_a_id": player_b_id, "player_b_id": player_a_id}
                    ]}
                ],
                "status": "finished"
            },
            sort=[("end_date", -1)]
        )


class RankingRepository(BaseRepository):
    """
    Repository for rankings.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_RANKINGS
    ID_FIELD = "ranking_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def get_or_create(
        self,
        league_id: str,
        player_id: str,
        player_info: Optional[Dict] = None
    ) -> Dict:
        """Get or create ranking entry"""
        existing = await self.find_one({
            "$and": [
                {"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
                {"$or": [{"player_id": player_id}, {"jugador_id": player_id}]}
            ]
        })
        
        if existing:
            return existing
        
        # Get last position
        count = await self.count({"$or": [{"league_id": league_id}, {"liga_id": league_id}]})
        
        new_entry = {
            "ranking_id": f"rank_{uuid.uuid4().hex[:12]}",
            "league_id": league_id,
            "player_id": player_id,
            "position": count + 1,
            "total_points": 0,
            "elo_rating": 1000,
            "matches_played": 0,
            "matches_won": 0,
            "matches_lost": 0,
            "sets_won": 0,
            "sets_lost": 0,
            "current_streak": 0,
            "best_streak": 0,
            "player_info": player_info,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return await self.insert_one(new_entry)
    
    async def get_league_ranking(self, league_id: str, limit: int = 100) -> List[Dict]:
        """Get complete ranking for a league"""
        return await self.find_many(
            query={"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
            limit=limit,
            sort=[("position", 1)]
        )
    
    async def get_player_ranking(self, league_id: str, player_id: str) -> Optional[Dict]:
        """Get position for a player"""
        return await self.find_one({
            "$or": [{"league_id": league_id}, {"liga_id": league_id}],
            "$or": [{"player_id": player_id}, {"jugador_id": player_id}]
        })
    
    async def update_ranking(self, ranking_id: str, data: Dict) -> bool:
        """Update ranking entry"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, ranking_id, data)
    
    async def recalculate_positions(self, league_id: str, scoring_system: str = "simple") -> bool:
        """Recalculate ranking positions"""
        # Get all league rankings
        rankings = await self.find_many(
            query={"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
            limit=1000
        )
        
        # Sort according to scoring system
        if scoring_system == "elo":
            rankings.sort(key=lambda x: x.get("elo_rating", 0), reverse=True)
        else:
            rankings.sort(key=lambda x: (
                x.get("total_points", 0),
                x.get("matches_won", 0) - x.get("matches_lost", 0),
                x.get("sets_won", 0) - x.get("sets_lost", 0)
            ), reverse=True)
        
        # Update positions
        for i, entry in enumerate(rankings):
            old_pos = entry.get("position", i + 1)
            new_pos = i + 1
            
            await self._collection.update_one(
                {"ranking_id": entry["ranking_id"]},
                {"$set": {
                    "position": new_pos,
                    "previous_position": old_pos,
                    "position_change": old_pos - new_pos,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return True


class SeasonTournamentRepository(BaseRepository):
    """
    Repository for season tournaments.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_TOURNAMENTS
    ID_FIELD = "tournament_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, tournament_data: Dict) -> Dict:
        """Create new season tournament"""
        tournament_data["tournament_id"] = f"tourney_{uuid.uuid4().hex[:12]}"
        tournament_data["created_at"] = datetime.now(timezone.utc).isoformat()
        tournament_data["updated_at"] = tournament_data["created_at"]
        tournament_data["status"] = "pending"
        return await self.insert_one(tournament_data)
    
    async def get_by_id(self, tournament_id: str) -> Optional[Dict]:
        """Get tournament by ID"""
        result = await self.find_one({self.ID_FIELD: tournament_id})
        if not result:
            result = await self.find_one({"torneo_id": tournament_id})
        return result
    
    async def get_league_tournaments(self, league_id: str) -> List[Dict]:
        """Get league tournaments"""
        return await self.find_many(
            query={"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
            sort=[("created_at", -1)]
        )
    
    async def update_tournament(self, tournament_id: str, data: Dict) -> bool:
        """Update tournament"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await self.update_by_id(self.ID_FIELD, tournament_id, data)
        if not result:
            result = await self.update_by_id("torneo_id", tournament_id, data)
        return result


class PlayerBadgeRepository(BaseRepository):
    """
    Repository for player badges.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_BADGES
    ID_FIELD = "badge_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, badge_data: Dict) -> Dict:
        """Create new badge"""
        badge_data["badge_id"] = f"badge_{uuid.uuid4().hex[:12]}"
        badge_data["earned_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(badge_data)
    
    async def get_by_id(self, badge_id: str) -> Optional[Dict]:
        """Get badge by ID"""
        return await self.find_one({self.ID_FIELD: badge_id})
    
    async def get_player_badges(self, player_id: str) -> List[Dict]:
        """Get all badges for a player"""
        return await self.find_many(
            query={"$or": [{"player_id": player_id}, {"jugador_id": player_id}]},
            sort=[("earned_at", -1)]
        )
    
    async def get_badge_by_type(self, player_id: str, badge_type: str, **filters) -> Optional[Dict]:
        """Check if a player already has a specific badge"""
        query = {
            "$or": [{"player_id": player_id}, {"jugador_id": player_id}],
            "badge_type": badge_type
        }
        query.update(filters)
        return await self.find_one(query)
    
    async def count_badges_by_type(self, player_id: str, badge_type: str) -> int:
        """Count badges of a type for a player"""
        return await self.count({
            "$or": [{"player_id": player_id}, {"jugador_id": player_id}],
            "badge_type": badge_type
        })
    
    async def get_recent_badges(self, limit: int = 20) -> List[Dict]:
        """Get most recent badges (for feed)"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("earned_at", -1)]
        )
    
    async def get_league_badges(self, league_id: str) -> List[Dict]:
        """Get all badges for a league"""
        return await self.find_many(
            query={"$or": [{"league_id": league_id}, {"liga_id": league_id}]},
            sort=[("earned_at", -1)]
        )
