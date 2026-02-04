"""
Super Pin Ranking - Service Layer
Business logic for the ranking system
"""
import math
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from core.events import event_bus, Event, PinpanClubEvents
from ..repositories.superpin_repository import (
    SuperPinLeagueRepository,
    PlayerCheckInRepository,
    SuperPinMatchRepository,
    RankingRepository,
    SeasonTournamentRepository,
    PlayerBadgeRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.superpin import (
    SuperPinLeague, SuperPinLeagueCreate, SuperPinLeagueUpdate,
    SuperPinMatch, SuperPinMatchCreate,
    RankingEntry, RankingTable,
    PlayerCheckIn, PlayerCheckInCreate,
    ScoringSystem, CheckInMethod, StatsLevel,
    SeasonTournament, SeasonTournamentCreate,
    BadgeType, PlayerBadge, PlayerBadgeCreate, BADGE_DEFINITIONS
)


class SuperPinService(BaseService):
    """
    Main service for Super Pin Ranking.
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.league_repo = SuperPinLeagueRepository()
        self.checkin_repo = PlayerCheckInRepository()
        self.match_repo = SuperPinMatchRepository()
        self.ranking_repo = RankingRepository()
        self.tournament_repo = SeasonTournamentRepository()
        self.player_repo = PlayerRepository()
        self.badge_repo = PlayerBadgeRepository()
    
    # ============== LEAGUE MANAGEMENT ==============
    
    async def create_league(self, data: SuperPinLeagueCreate) -> SuperPinLeague:
        """Create new Super Pin league"""
        league_dict = data.model_dump()
        
        # Set default configurations if not provided
        if not league_dict.get("scoring_config"):
            league_dict["scoring_config"] = {}
        if not league_dict.get("checkin_config"):
            league_dict["checkin_config"] = {}
        if not league_dict.get("stats_config"):
            league_dict["stats_config"] = {}
        if not league_dict.get("tournament_config"):
            league_dict["tournament_config"] = {}
        if not league_dict.get("prizes"):
            league_dict["prizes"] = self._default_prizes()
        
        league_dict["status"] = "draft"
        
        result = await self.league_repo.create(league_dict)
        self.log_info(f"League created: {result.get('league_id')}")
        
        return SuperPinLeague(**result)
    
    def _default_prizes(self) -> List[Dict]:
        """Default prizes"""
        return [
            {"name": "Champion", "position": 1, "icon": "🥇"},
            {"name": "Runner-up", "position": 2, "icon": "🥈"},
            {"name": "Third Place", "position": 3, "icon": "🥉"},
            {"name": "Fourth Place", "position": 4, "icon": "🏅"},
        ]
    
    async def get_league(self, league_id: str) -> Optional[SuperPinLeague]:
        """Get league by ID"""
        result = await self.league_repo.get_by_id(league_id)
        return SuperPinLeague(**result) if result else None
    
    async def get_active_leagues(self) -> List[SuperPinLeague]:
        """Get active leagues"""
        results = await self.league_repo.get_active_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def get_all_leagues(self) -> List[SuperPinLeague]:
        """Get all leagues"""
        results = await self.league_repo.get_all_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def update_league(
        self,
        league_id: str,
        data: SuperPinLeagueUpdate
    ) -> Optional[SuperPinLeague]:
        """Update league"""
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_league(league_id)
        
        success = await self.league_repo.update_league(league_id, update_data)
        
        if success:
            return await self.get_league(league_id)
        return None
    
    async def activate_league(self, league_id: str) -> Optional[SuperPinLeague]:
        """Activate league"""
        return await self.update_league(
            league_id,
            SuperPinLeagueUpdate(status="active")
        )
    
    # ============== CHECK-IN MANAGEMENT ==============
    
    async def check_in_player(
        self,
        data: PlayerCheckInCreate
    ) -> PlayerCheckIn:
        """Register player check-in"""
        # Check if already has active check-in
        existing = await self.checkin_repo.get_player_checkin(
            data.league_id, data.player_id
        )
        if existing:
            return PlayerCheckIn(**existing)
        
        # Get player info
        player = await self.player_repo.get_by_id(data.player_id)
        
        checkin_dict = data.model_dump()
        checkin_dict["player_info"] = player
        
        result = await self.checkin_repo.create(checkin_dict)
        
        # Increment league player counter if new
        await self.league_repo.increment_stats(data.league_id, players=1)
        
        self.log_info(f"Player checked in: {data.player_id} to {data.league_id}")
        
        return PlayerCheckIn(**result)
    
    async def check_out_player(self, league_id: str, player_id: str) -> bool:
        """Register player check-out"""
        return await self.checkin_repo.checkout_by_player(league_id, player_id)
    
    async def get_available_players(self, league_id: str) -> List[PlayerCheckIn]:
        """Get available players (with active check-in)"""
        results = await self.checkin_repo.get_active_checkins(league_id)
        return [PlayerCheckIn(**r) for r in results]
    
    async def validate_geolocation(
        self,
        league_id: str,
        latitude: float,
        longitude: float
    ) -> bool:
        """Validate location for check-in by geolocation"""
        league = await self.get_league(league_id)
        if not league:
            return False
        
        config = league.checkin_config
        if not config.club_latitude or not config.club_longitude:
            return True  # Without configured location, allow
        
        # Calculate distance using Haversine formula
        distance = self._haversine_distance(
            config.club_latitude, config.club_longitude,
            latitude, longitude
        )
        
        return distance <= config.radius_meters
    
    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance in meters between two GPS points"""
        R = 6371000  # Earth radius in meters
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    # ============== MATCH MANAGEMENT ==============
    
    async def create_match(
        self,
        data: SuperPinMatchCreate
    ) -> SuperPinMatch:
        """Create Super Pin match"""
        # Get player info
        player_a = await self.player_repo.get_by_id(data.player_a_id)
        player_b = await self.player_repo.get_by_id(data.player_b_id)
        referee = None
        if data.referee_id:
            referee = await self.player_repo.get_by_id(data.referee_id)
        
        match_dict = data.model_dump()
        match_dict["player_a_info"] = player_a
        match_dict["player_b_info"] = player_b
        match_dict["referee_info"] = referee
        match_dict["points_player_a"] = 0
        match_dict["points_player_b"] = 0
        match_dict["sets_player_a"] = 0
        match_dict["sets_player_b"] = 0
        match_dict["current_set"] = 1
        match_dict["set_history"] = []
        
        # Get current player ELO
        ranking_a = await self.ranking_repo.get_or_create(
            data.league_id, data.player_a_id, player_a
        )
        ranking_b = await self.ranking_repo.get_or_create(
            data.league_id, data.player_b_id, player_b
        )
        
        match_dict["initial_elo_a"] = ranking_a.get("elo_rating", 1000)
        match_dict["initial_elo_b"] = ranking_b.get("elo_rating", 1000)
        
        result = await self.match_repo.create(match_dict)
        
        self.log_info(f"Super Pin match created: {result.get('match_id')}")
        
        return SuperPinMatch(**result)
    
    async def get_match(self, match_id: str) -> Optional[SuperPinMatch]:
        """Get match by ID"""
        result = await self.match_repo.get_by_id(match_id)
        return SuperPinMatch(**result) if result else None
    
    async def start_match(self, match_id: str) -> Optional[SuperPinMatch]:
        """Start match"""
        match = await self.match_repo.get_by_id(match_id)
        if not match:
            return None
        
        await self.match_repo.update_match(match_id, {
            "status": "in_progress",
            "start_date": datetime.now(timezone.utc).isoformat()
        })
        
        return await self.get_match(match_id)
    
    async def record_point(
        self,
        match_id: str,
        player: str,  # 'a' or 'b'
        stats: Optional[Dict] = None
    ) -> Dict:
        """Register point"""
        match = await self.match_repo.get_by_id(match_id)
        if not match or match.get("status") != "in_progress":
            raise ValueError("Match is not in progress")
        
        # Update points
        if player == 'a':
            match["points_player_a"] += 1
        else:
            match["points_player_b"] += 1
        
        points_a = match["points_player_a"]
        points_b = match["points_player_b"]
        points_per_set = match.get("points_per_set", 11)
        
        set_won = False
        match_finished = False
        set_winner = None
        match_winner = None
        
        # Check if set was won
        if points_a >= points_per_set or points_b >= points_per_set:
            if abs(points_a - points_b) >= 2:
                set_won = True
                set_winner = 'a' if points_a > points_b else 'b'
                
                # Save set result
                set_history = match.get("set_history", [])
                set_history.append({
                    "set": match.get("current_set", 1),
                    "points_a": points_a,
                    "points_b": points_b,
                    "winner": set_winner
                })
                match["set_history"] = set_history
                
                # Update sets
                if set_winner == 'a':
                    match["sets_player_a"] = match.get("sets_player_a", 0) + 1
                else:
                    match["sets_player_b"] = match.get("sets_player_b", 0) + 1
                
                # Check if match was won
                sets_to_win = (match.get("best_of", 3) // 2) + 1
                if match["sets_player_a"] >= sets_to_win:
                    match_finished = True
                    match_winner = 'a'
                    match["winner_id"] = match["player_a_id"]
                elif match["sets_player_b"] >= sets_to_win:
                    match_finished = True
                    match_winner = 'b'
                    match["winner_id"] = match["player_b_id"]
                else:
                    # Next set
                    match["current_set"] = match.get("current_set", 1) + 1
                    match["points_player_a"] = 0
                    match["points_player_b"] = 0
        
        # Update advanced statistics if provided
        if stats:
            if not match.get("stats"):
                match["stats"] = {}
            match["stats"].update(stats)
        
        # Finalize match if ended
        if match_finished:
            match["status"] = "finished"
            match["end_date"] = datetime.now(timezone.utc).isoformat()
            
            # Calculate and update ranking
            await self._update_ranking_after_match(match)
            
            # Increment match counter
            await self.league_repo.increment_stats(match["league_id"], matches=1)
        
        await self.match_repo.update_match(match_id, match)
        
        return {
            "success": True,
            "match": match,
            "set_won": set_won,
            "set_winner": set_winner,
            "match_finished": match_finished,
            "match_winner": match_winner
        }
    
    async def _update_ranking_after_match(self, match: Dict):
        """Update ranking after a match"""
        league_id = match.get("league_id")
        
        # Get league configuration
        league = await self.league_repo.get_by_id(league_id)
        if not league:
            return
        
        scoring_config = league.get("scoring_config", {})
        scoring_system = scoring_config.get("system", "simple")
        
        winner_id = match["winner_id"]
        loser_id = match["player_b_id"] if winner_id == match["player_a_id"] else match["player_a_id"]
        
        # Get rankings
        winner_ranking = await self.ranking_repo.get_player_ranking(league_id, winner_id)
        loser_ranking = await self.ranking_repo.get_player_ranking(league_id, loser_id)
        
        if not winner_ranking or not loser_ranking:
            return
        
        # Calculate points by system
        if scoring_system == "elo":
            winner_points, loser_points, elo_change = self._calculate_elo(
                winner_ranking.get("elo_rating", 1000),
                loser_ranking.get("elo_rating", 1000),
                scoring_config.get("elo_k_factor", 32)
            )
        else:  # simple
            winner_points = scoring_config.get("points_win", 3)
            loser_points = scoring_config.get("points_loss", 1)
            elo_change = 0
        
        # Determine sets won/lost for each player
        if winner_id == match["player_a_id"]:
            sets_winner = match.get("sets_player_a", 0)
            sets_loser = match.get("sets_player_b", 0)
        else:
            sets_winner = match.get("sets_player_b", 0)
            sets_loser = match.get("sets_player_a", 0)
        
        # Update winner ranking
        winner_streak = winner_ranking.get("current_streak", 0)
        new_winner_streak = winner_streak + 1 if winner_streak >= 0 else 1
        
        await self.ranking_repo.update_ranking(winner_ranking["ranking_id"], {
            "total_points": winner_ranking.get("total_points", 0) + winner_points,
            "elo_rating": winner_ranking.get("elo_rating", 1000) + elo_change,
            "matches_played": winner_ranking.get("matches_played", 0) + 1,
            "matches_won": winner_ranking.get("matches_won", 0) + 1,
            "sets_won": winner_ranking.get("sets_won", 0) + sets_winner,
            "sets_lost": winner_ranking.get("sets_lost", 0) + sets_loser,
            "current_streak": new_winner_streak,
            "best_streak": max(winner_ranking.get("best_streak", 0), new_winner_streak),
            "last_match_date": datetime.now(timezone.utc).isoformat()
        })
        
        # Update loser ranking
        loser_streak = loser_ranking.get("current_streak", 0)
        new_loser_streak = loser_streak - 1 if loser_streak <= 0 else -1
        
        await self.ranking_repo.update_ranking(loser_ranking["ranking_id"], {
            "total_points": loser_ranking.get("total_points", 0) + loser_points,
            "elo_rating": loser_ranking.get("elo_rating", 1000) - elo_change,
            "matches_played": loser_ranking.get("matches_played", 0) + 1,
            "matches_lost": loser_ranking.get("matches_lost", 0) + 1,
            "sets_won": loser_ranking.get("sets_won", 0) + sets_loser,
            "sets_lost": loser_ranking.get("sets_lost", 0) + sets_winner,
            "current_streak": new_loser_streak,
            "last_match_date": datetime.now(timezone.utc).isoformat()
        })
        
        # Save points in the match
        await self.match_repo.update_match(match.get("match_id"), {
            "winner_points": winner_points,
            "loser_points": loser_points,
            "elo_change_a": elo_change if winner_id == match["player_a_id"] else -elo_change,
            "elo_change_b": elo_change if winner_id == match["player_b_id"] else -elo_change
        })
        
        # Recalculate positions
        await self.ranking_repo.recalculate_positions(league_id, scoring_system)
    
    def _calculate_elo(
        self,
        winner_elo: int,
        loser_elo: int,
        k_factor: int = 32
    ) -> tuple:
        """Calculate ELO change"""
        # Expected win probability
        expected_winner = 1 / (1 + 10 ** ((loser_elo - winner_elo) / 400))
        
        # ELO change
        change = round(k_factor * (1 - expected_winner))
        
        # Points (for points system, in addition to ELO)
        points_winner = 3
        points_loser = 1
        
        return points_winner, points_loser, change
    
    # ============== RANKING ==============
    
    async def get_ranking(self, league_id: str) -> RankingTable:
        """Get ranking table"""
        league = await self.get_league(league_id)
        if not league:
            raise ValueError("League not found")
        
        entries = await self.ranking_repo.get_league_ranking(league_id)
        
        return RankingTable(
            league_id=league_id,
            league_name=league.name,
            season=league.season,
            total_players=len(entries),
            total_matches=league.total_matches,
            scoring_system=league.scoring_config.system,
            entries=[RankingEntry(**e) for e in entries],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    
    async def get_player_stats(
        self,
        league_id: str,
        player_id: str
    ) -> Dict:
        """Get player statistics in a league"""
        ranking = await self.ranking_repo.get_player_ranking(league_id, player_id)
        if not ranking:
            return None
        
        # Get match history
        matches = await self.match_repo.get_player_matches(league_id, player_id, limit=20)
        
        return {
            "ranking": RankingEntry(**ranking),
            "recent_matches": matches
        }
    
    # ============== SEASON TOURNAMENT ==============
    
    async def create_season_tournament(
        self,
        data: SeasonTournamentCreate
    ) -> SeasonTournament:
        """Create end of season tournament"""
        league = await self.get_league(data.league_id)
        if not league:
            raise ValueError("League not found")
        
        # Get participants according to configuration
        ranking = await self.get_ranking(data.league_id)
        tournament_config = league.tournament_config
        
        if tournament_config.tournament_type == "top_n":
            participants = [
                {"player_id": e.player_id, "ranking_position": e.position, "player_info": e.player_info}
                for e in ranking.entries[:tournament_config.top_n_players]
            ]
        elif tournament_config.tournament_type == "by_category":
            # By categories
            participants = []
            for cat in tournament_config.categories:
                cat_players = [
                    {"player_id": e.player_id, "ranking_position": e.position, 
                     "category": cat["name"], "player_info": e.player_info}
                    for e in ranking.entries
                    if cat["min_rank"] <= e.position <= cat["max_rank"]
                ]
                participants.extend(cat_players)
        else:  # all_players
            participants = [
                {"player_id": e.player_id, "ranking_position": e.position, "player_info": e.player_info}
                for e in ranking.entries
            ]
        
        tournament_dict = data.model_dump()
        tournament_dict["tournament_config"] = tournament_config.model_dump()
        tournament_dict["prizes"] = [p.model_dump() if hasattr(p, 'model_dump') else p for p in league.prizes]
        tournament_dict["participants"] = participants
        
        result = await self.tournament_repo.create(tournament_dict)
        
        self.log_info(f"Season tournament created: {result.get('tournament_id')}")
        
        return SeasonTournament(**result)
    
    async def generate_tournament_brackets(self, tournament_id: str) -> dict:
        """Generate brackets for single elimination tournament"""
        tournament = await self.tournament_repo.get_by_id(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")
        
        participants = tournament.get("participants", [])
        num_players = len(participants)
        
        if num_players < 2:
            raise ValueError("At least 2 participants needed")
        
        # Calculate needed rounds
        import math
        num_rounds = math.ceil(math.log2(num_players))
        bracket_size = 2 ** num_rounds
        
        # Generate bracket structure
        brackets = []
        
        # First round - pair according to ranking (1 vs last, 2 vs second-last, etc.)
        round_1_matches = []
        for i in range(bracket_size // 2):
            match = {
                "match_id": f"R1_M{i+1}",
                "round": 1,
                "position": i,
                "player_a": participants[i] if i < num_players else None,
                "player_b": participants[-(i+1)] if (num_players - i - 1) >= 0 and i < num_players // 2 else None,
                "winner": None,
                "score_a": 0,
                "score_b": 0,
                "status": "pending"
            }
            # If only one player, advances automatically (bye)
            if match["player_a"] and not match["player_b"]:
                match["winner"] = match["player_a"]["player_id"]
                match["status"] = "bye"
            round_1_matches.append(match)
        
        brackets.append({"round": 1, "name": "Final" if num_rounds == 1 else ("Round of 16" if num_rounds >= 3 else "First Round"), "matches": round_1_matches})
        
        # Generate empty following rounds
        round_names = ["Round of 16", "Quarter-finals", "Semi-finals", "Final"]
        for r in range(2, num_rounds + 1):
            num_matches = bracket_size // (2 ** r)
            round_name = round_names[min(r-1, len(round_names)-1)]
            if r == num_rounds:
                round_name = "Final"
            elif r == num_rounds - 1:
                round_name = "Semi-finals"
            
            round_matches = [
                {
                    "match_id": f"R{r}_M{i+1}",
                    "round": r,
                    "position": i,
                    "player_a": None,
                    "player_b": None,
                    "winner": None,
                    "score_a": 0,
                    "score_b": 0,
                    "status": "pending"
                }
                for i in range(num_matches)
            ]
            brackets.append({"round": r, "name": round_name, "matches": round_matches})
        
        # Add match for 3rd place if configured
        config = tournament.get("tournament_config", {})
        if config.get("third_place_match", True) and num_rounds >= 2:
            brackets.append({
                "round": num_rounds,
                "name": "Third Place",
                "matches": [{
                    "match_id": "3RD_PLACE",
                    "round": num_rounds,
                    "position": 0,
                    "player_a": None,
                    "player_b": None,
                    "winner": None,
                    "score_a": 0,
                    "score_b": 0,
                    "status": "pending",
                    "is_third_place": True
                }]
            })
        
        # Update tournament with brackets
        await self.tournament_repo.update_tournament(tournament_id, {
            "brackets": brackets,
            "status": "in_progress"
        })
        
        return {"brackets": brackets, "total_rounds": num_rounds}
    
    async def update_tournament_match(
        self, 
        tournament_id: str, 
        match_id: str, 
        winner_id: str,
        score_a: int = 0,
        score_b: int = 0
    ) -> dict:
        """Update result of a tournament match"""
        tournament = await self.tournament_repo.get_by_id(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")
        
        brackets = tournament.get("brackets", [])
        match_found = False
        current_round = 0
        match_position = 0
        
        # Search and update the match
        for bracket in brackets:
            for match in bracket["matches"]:
                if match["match_id"] == match_id:
                    match["winner"] = winner_id
                    match["score_a"] = score_a
                    match["score_b"] = score_b
                    match["status"] = "finished"
                    match_found = True
                    current_round = match["round"]
                    match_position = match["position"]
                    break
        
        if not match_found:
            raise ValueError("Match not found")
        
        # Advance winner to next round
        next_round = current_round + 1
        for bracket in brackets:
            if bracket["round"] == next_round and bracket.get("name") != "Third Place":
                next_match_pos = match_position // 2
                for match in bracket["matches"]:
                    if match["position"] == next_match_pos:
                        # Determine winning player
                        winner_info = None
                        for p in tournament.get("participants", []):
                            if p["player_id"] == winner_id:
                                winner_info = p
                                break
                        
                        if match_position % 2 == 0:
                            match["player_a"] = winner_info
                        else:
                            match["player_b"] = winner_info
                        break
        
        # Update brackets in DB
        await self.tournament_repo.update_tournament(tournament_id, {"brackets": brackets})
        
        # Check if tournament ended
        final_bracket = next((b for b in brackets if b["name"] == "Final"), None)
        if final_bracket:
            final_match = final_bracket["matches"][0]
            if final_match.get("status") == "finished":
                # Tournament finished - generate final results
                final_results = [
                    {"position": 1, "player_id": final_match["winner"]},
                    {"position": 2, "player_id": final_match["player_a"]["player_id"] 
                     if final_match["player_a"]["player_id"] != final_match["winner"] 
                     else final_match["player_b"]["player_id"]}
                ]
                
                # Add 3rd place if exists
                third_bracket = next((b for b in brackets if b["name"] == "Third Place"), None)
                if third_bracket and third_bracket["matches"][0].get("status") == "finished":
                    final_results.append({
                        "position": 3, 
                        "player_id": third_bracket["matches"][0]["winner"]
                    })
                
                await self.tournament_repo.update_tournament(tournament_id, {
                    "status": "finished",
                    "final_results": final_results
                })
        
        return {"success": True, "brackets": brackets}
    
    async def get_tournament_with_brackets(self, tournament_id: str) -> dict:
        """Get tournament with complete bracket information"""
        tournament = await self.tournament_repo.get_by_id(tournament_id)
        if not tournament:
            return None
        return tournament
    
    # ============== BADGE SYSTEM ==============
    
    async def award_badge(
        self,
        player_id: str,
        badge_type: str,
        league_id: str = None,
        tournament_id: str = None,
        match_id: str = None,
        season: str = None,
        allow_duplicates: bool = False,
        metadata: Dict = None
    ) -> Optional[Dict]:
        """Award a badge to a player"""
        
        # Check if already has badge (if duplicates not allowed)
        if not allow_duplicates:
            existing = await self.badge_repo.get_badge_by_type(
                player_id, badge_type,
                league_id=league_id if league_id else None,
                tournament_id=tournament_id if tournament_id else None
            )
            if existing:
                return None  # Already has this badge
        
        # Get badge definition
        badge_def = BADGE_DEFINITIONS.get(badge_type, {})
        
        badge_data = {
            "player_id": player_id,
            "badge_type": badge_type,
            "name": badge_def.get("name", badge_type),
            "description": badge_def.get("description", ""),
            "icon": badge_def.get("icon", "🏅"),
            "league_id": league_id,
            "tournament_id": tournament_id,
            "match_id": match_id,
            "season": season,
            "metadata": metadata or {}
        }
        
        result = await self.badge_repo.create(badge_data)
        
        self.log_info(f"Badge awarded: {badge_type} to player {player_id}")
        
        return result
    
    async def award_tournament_badges(self, tournament_id: str) -> List[Dict]:
        """Award badges to tournament winners"""
        tournament = await self.tournament_repo.get_by_id(tournament_id)
        if not tournament or tournament.get("status") != "finished":
            return []
        
        awarded_badges = []
        final_results = tournament.get("final_results", [])
        league_id = tournament.get("league_id")
        season = None
        
        # Get season from the league
        league = await self.league_repo.get_by_id(league_id)
        if league:
            season = league.get("season")
        
        for result in final_results:
            position = result.get("position")
            player_id = result.get("player_id")
            
            if position == 1:
                badge = await self.award_badge(
                    player_id=player_id,
                    badge_type=BadgeType.TOURNAMENT_CHAMPION,
                    league_id=league_id,
                    tournament_id=tournament_id,
                    season=season,
                    metadata={"tournament_name": tournament.get("name")}
                )
                if badge:
                    awarded_badges.append(badge)
                    
            elif position == 2:
                badge = await self.award_badge(
                    player_id=player_id,
                    badge_type=BadgeType.TOURNAMENT_RUNNER_UP,
                    league_id=league_id,
                    tournament_id=tournament_id,
                    season=season,
                    metadata={"tournament_name": tournament.get("name")}
                )
                if badge:
                    awarded_badges.append(badge)
                    
            elif position == 3:
                badge = await self.award_badge(
                    player_id=player_id,
                    badge_type=BadgeType.TOURNAMENT_THIRD,
                    league_id=league_id,
                    tournament_id=tournament_id,
                    season=season,
                    metadata={"tournament_name": tournament.get("name")}
                )
                if badge:
                    awarded_badges.append(badge)
        
        return awarded_badges
    
    async def check_and_award_match_badges(
        self,
        player_id: str,
        league_id: str,
        match_id: str
    ) -> List[Dict]:
        """Check and award badges based on match statistics"""
        awarded_badges = []
        
        # Get ranking of the player
        ranking = await self.ranking_repo.get_player_ranking(league_id, player_id)
        if not ranking:
            return awarded_badges
        
        # Badge: First win
        if ranking.get("matches_won") == 1:
            badge = await self.award_badge(
                player_id=player_id,
                badge_type=BadgeType.FIRST_WIN,
                league_id=league_id,
                match_id=match_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 5 win streak
        if ranking.get("current_streak", 0) >= 5:
            badge = await self.award_badge(
                player_id=player_id,
                badge_type=BadgeType.WIN_STREAK_5,
                league_id=league_id,
                match_id=match_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 10 win streak
        if ranking.get("current_streak", 0) >= 10:
            badge = await self.award_badge(
                player_id=player_id,
                badge_type=BadgeType.WIN_STREAK_10,
                league_id=league_id,
                match_id=match_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 50 matches played
        if ranking.get("matches_played") == 50:
            badge = await self.award_badge(
                player_id=player_id,
                badge_type=BadgeType.MATCHES_50,
                league_id=league_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 100 matches played
        if ranking.get("matches_played") == 100:
            badge = await self.award_badge(
                player_id=player_id,
                badge_type=BadgeType.MATCHES_100,
                league_id=league_id
            )
            if badge:
                awarded_badges.append(badge)
        
        return awarded_badges
    
    async def get_player_badges(self, player_id: str) -> List[Dict]:
        """Get all badges for a player"""
        badges = await self.badge_repo.get_player_badges(player_id)
        
        # Enrich with definitions
        for badge in badges:
            badge_def = BADGE_DEFINITIONS.get(badge.get("badge_type"), {})
            badge["rarity"] = badge_def.get("rarity", "common")
        
        return badges
    
    async def get_badge_leaderboard(self, league_id: str = None, limit: int = 10) -> List[Dict]:
        """Get players with most badges"""
        # This requires MongoDB aggregation
        pipeline = [
            {"$group": {
                "_id": "$player_id",
                "total_badges": {"$sum": 1},
                "legendary": {"$sum": {"$cond": [{"$in": ["$badge_type", [
                    BadgeType.TOURNAMENT_CHAMPION, BadgeType.SEASON_MVP
                ]]}, 1, 0]}},
                "epic": {"$sum": {"$cond": [{"$in": ["$badge_type", [
                    BadgeType.TOURNAMENT_RUNNER_UP, BadgeType.WIN_STREAK_10, BadgeType.MATCHES_100, BadgeType.COMEBACK_KING
                ]]}, 1, 0]}}
            }},
            {"$sort": {"legendary": -1, "epic": -1, "total_badges": -1}},
            {"$limit": limit}
        ]
        
        if league_id:
            pipeline.insert(0, {"$match": {"league_id": league_id}})
        
        # Execute aggregation
        collection = self.badge_repo.collection
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
        # Enrich with player info
        for entry in results:
            player = await self.player_repo.get_by_id(entry["_id"])
            if player:
                entry["player_info"] = {
                    "name": player.get("name"),
                    "nickname": player.get("nickname")
                }
        
        return results
    
    async def get_recent_badges(self, limit: int = 20) -> List[Dict]:
        """Get most recent badges (for feed)"""
        badges = await self.badge_repo.get_recent_badges(limit)
        
        # Enrich with player info
        for badge in badges:
            player = await self.player_repo.get_by_id(badge.get("player_id"))
            if player:
                badge["player_info"] = {
                    "name": player.get("name"),
                    "nickname": player.get("nickname")
                }
            badge_def = BADGE_DEFINITIONS.get(badge.get("badge_type"), {})
            badge["rarity"] = badge_def.get("rarity", "common")
        
        return badges
    
    # ============== PLAYER STATISTICS ==============
    
    async def get_player_statistics(self, player_id: str, league_id: str = None) -> Dict:
        """Get detailed player statistics"""
        
        # Basic player info
        player = await self.player_repo.get_by_id(player_id)
        if not player:
            return None
        
        # Get rankings from all leagues or specific one
        if league_id:
            rankings = [await self.ranking_repo.get_player_ranking(league_id, player_id)]
            rankings = [r for r in rankings if r]
        else:
            # Search in all active leagues
            leagues = await self.league_repo.get_all_leagues()
            rankings = []
            for league in leagues:
                ranking = await self.ranking_repo.get_player_ranking(league.get("league_id"), player_id)
                if ranking:
                    ranking["league_name"] = league.get("name")
                    rankings.append(ranking)
        
        # Get match history
        matches = await self.match_repo.find_many(
            query={
                "$or": [
                    {"player_a_id": player_id},
                    {"player_b_id": player_id}
                ],
                "status": "finished"
            },
            sort=[("match_date", -1)],
            limit=20
        )
        
        # Enrich matches with opponent info
        match_history = []
        for match in matches:
            is_player_a = match.get("player_a_id") == player_id
            opponent_id = match.get("player_b_id") if is_player_a else match.get("player_a_id")
            opponent = await self.player_repo.get_by_id(opponent_id)
            
            player_sets = match.get("sets_player_a") if is_player_a else match.get("sets_player_b")
            opponent_sets = match.get("sets_player_b") if is_player_a else match.get("sets_player_a")
            is_winner = match.get("winner_id") == player_id
            
            match_history.append({
                "match_id": match.get("match_id"),
                "date": match.get("match_date"),
                "opponent": {
                    "player_id": opponent_id,
                    "name": opponent.get("name") if opponent else "Unknown",
                    "nickname": opponent.get("nickname") if opponent else None
                },
                "result": f"{player_sets}-{opponent_sets}",
                "is_winner": is_winner,
                "league_id": match.get("league_id"),
                "elo_change": match.get("elo_change_a") if is_player_a else match.get("elo_change_b")
            })
        
        # Get badges
        badges = await self.get_player_badges(player_id)
        
        # Calculate aggregate statistics
        total_matches = sum(r.get("matches_played", 0) for r in rankings)
        total_wins = sum(r.get("matches_won", 0) for r in rankings)
        total_losses = sum(r.get("matches_lost", 0) for r in rankings)
        total_sets_won = sum(r.get("sets_won", 0) for r in rankings)
        total_sets_lost = sum(r.get("sets_lost", 0) for r in rankings)
        best_streak = max((r.get("best_streak", 0) for r in rankings), default=0)
        
        win_rate = (total_wins / total_matches * 100) if total_matches > 0 else 0
        set_win_rate = (total_sets_won / (total_sets_won + total_sets_lost) * 100) if (total_sets_won + total_sets_lost) > 0 else 0
        
        # Form streak (last 10 matches)
        recent_form = []
        for m in match_history[:10]:
            recent_form.append("W" if m["is_winner"] else "L")
        
        return {
            "player_id": player_id,
            "player_info": {
                "name": player.get("name"),
                "last_name": player.get("last_name"),
                "nickname": player.get("nickname"),
                "level": player.get("level"),
                "photo_url": player.get("photo_url"),
                "registration_date": player.get("registration_date") or player.get("created_at"),
                "elo_rating": player.get("elo_rating", 1000)
            },
            "overall_stats": {
                "total_matches": total_matches,
                "wins": total_wins,
                "losses": total_losses,
                "win_rate": round(win_rate, 1),
                "sets_won": total_sets_won,
                "sets_lost": total_sets_lost,
                "set_win_rate": round(set_win_rate, 1),
                "best_streak": best_streak,
                "leagues_played": len(rankings)
            },
            "league_rankings": rankings,
            "match_history": match_history,
            "badges": badges,
            "recent_form": recent_form,
            "badge_count": {
                "total": len(badges),
                "legendary": sum(1 for b in badges if b.get("rarity") == "legendary"),
                "epic": sum(1 for b in badges if b.get("rarity") == "epic"),
                "rare": sum(1 for b in badges if b.get("rarity") == "rare"),
                "common": sum(1 for b in badges if b.get("rarity") == "common")
            }
        }
    
    async def get_head_to_head(self, player_a_id: str, player_b_id: str) -> Dict:
        """Get head-to-head statistics between two players"""
        
        matches = await self.match_repo.find_many(
            query={
                "$or": [
                    {"player_a_id": player_a_id, "player_b_id": player_b_id},
                    {"player_a_id": player_b_id, "player_b_id": player_a_id}
                ],
                "status": "finished"
            },
            sort=[("match_date", -1)]
        )
        
        player_a = await self.player_repo.get_by_id(player_a_id)
        player_b = await self.player_repo.get_by_id(player_b_id)
        
        wins_a = 0
        wins_b = 0
        sets_a = 0
        sets_b = 0
        
        for match in matches:
            is_a_first = match.get("player_a_id") == player_a_id
            
            if match.get("winner_id") == player_a_id:
                wins_a += 1
            else:
                wins_b += 1
            
            if is_a_first:
                sets_a += match.get("sets_player_a", 0)
                sets_b += match.get("sets_player_b", 0)
            else:
                sets_a += match.get("sets_player_b", 0)
                sets_b += match.get("sets_player_a", 0)
        
        return {
            "player_a": {
                "player_id": player_a_id,
                "name": player_a.get("name") if player_a else "Unknown",
                "nickname": player_a.get("nickname") if player_a else None,
                "wins": wins_a,
                "sets": sets_a
            },
            "player_b": {
                "player_id": player_b_id,
                "name": player_b.get("name") if player_b else "Unknown",
                "nickname": player_b.get("nickname") if player_b else None,
                "wins": wins_b,
                "sets": sets_b
            },
            "total_matches": len(matches),
            "matches": [{
                "match_id": m.get("match_id"),
                "date": m.get("match_date"),
                "winner_id": m.get("winner_id"),
                "score": f"{m.get('sets_player_a')}-{m.get('sets_player_b')}"
            } for m in matches[:10]]
        }
    
    # ============== QUICK TOURNAMENT (LIGHTNING TOURNAMENT) ==============
    
    async def create_quick_tournament(
        self,
        league_id: str,
        name: str = None,
        pairing_mode: str = "random",  # random, by_ranking, swiss
        match_format: str = "best_of_1",  # best_of_1, best_of_3
        points_per_set: int = 11
    ) -> Dict:
        """
        Create quick tournament with players having active check-in.
        
        pairing_mode:
        - random: Pair randomly
        - by_ranking: Best vs Worst ranking
        - swiss: Swiss system (similar level)
        """
        import random
        from datetime import datetime, timezone
        
        # Get players with active check-in
        available_players = await self.get_available_players(league_id)
        
        if len(available_players) < 2:
            raise ValueError("At least 2 players with active check-in needed")
        
        # Get ranking info for each player
        players_with_ranking = []
        for checkin in available_players:
            player_id = checkin.get("player_id")
            ranking = await self.ranking_repo.get_player_ranking(league_id, player_id)
            player = await self.player_repo.get_by_id(player_id)
            
            players_with_ranking.append({
                "player_id": player_id,
                "player_info": {
                    "name": player.get("name") if player else "Unknown",
                    "nickname": player.get("nickname") if player else None
                },
                "elo": ranking.get("elo_rating", 1000) if ranking else 1000,
                "position": ranking.get("position", 999) if ranking else 999
            })
        
        # Sort and pair according to mode
        if pairing_mode == "by_ranking":
            # Sort by position (best first)
            players_with_ranking.sort(key=lambda x: x["position"])
        elif pairing_mode == "swiss":
            # Sort by ELO (similar level)
            players_with_ranking.sort(key=lambda x: x["elo"])
        else:
            # Random
            random.shuffle(players_with_ranking)
        
        # Create pairings
        pairings = []
        
        if pairing_mode == "by_ranking":
            # Best vs Worst
            n = len(players_with_ranking)
            for i in range(n // 2):
                player_a = players_with_ranking[i]
                player_b = players_with_ranking[n - 1 - i]
                pairings.append((player_a, player_b))
        elif pairing_mode == "swiss":
            # Players of similar level
            for i in range(0, len(players_with_ranking) - 1, 2):
                pairings.append((players_with_ranking[i], players_with_ranking[i + 1]))
        else:
            # Random pairs
            for i in range(0, len(players_with_ranking) - 1, 2):
                pairings.append((players_with_ranking[i], players_with_ranking[i + 1]))
        
        # Player without partner (if odd number)
        bye_player = None
        if len(players_with_ranking) % 2 == 1:
            bye_player = players_with_ranking[-1]
        
        # Create the matches
        created_matches = []
        best_of = 1 if match_format == "best_of_1" else 3
        
        for player_a, player_b in pairings:
            match_data = SuperPinMatchCreate(
                league_id=league_id,
                player_a_id=player_a["player_id"],
                player_b_id=player_b["player_id"],
                best_of=best_of,
                points_per_set=points_per_set,
                match_type="quick"
            )
            
            match = await self.create_match(match_data)
            # Start the match automatically
            await self.start_match(match.match_id)
            
            created_matches.append({
                "match_id": match.match_id,
                "player_a": player_a,
                "player_b": player_b,
                "status": "in_progress"
            })
        
        # Generate tournament name
        if not name:
            name = f"Lightning Tournament {datetime.now(timezone.utc).strftime('%H:%M')}"
        
        quick_tournament = {
            "quick_tournament_id": f"qt_{uuid.uuid4().hex[:12]}",
            "league_id": league_id,
            "name": name,
            "pairing_mode": pairing_mode,
            "match_format": match_format,
            "total_players": len(players_with_ranking),
            "total_matches": len(created_matches),
            "matches": created_matches,
            "bye_player": bye_player,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "in_progress"
        }
        
        self.log_info(f"Quick tournament created: {quick_tournament['quick_tournament_id']} with {len(created_matches)} matches")
        
        return quick_tournament
    
    async def get_quick_tournament_status(self, league_id: str) -> Dict:
        """Get active quick matches status in a league"""
        # Search ongoing quick matches
        active_matches = await self.match_repo.find_many(
            query={
                "league_id": league_id,
                "match_type": "quick",
                "status": {"$in": ["pending", "in_progress"]}
            },
            sort=[("created_at", -1)]
        )
        
        finished_today = await self.match_repo.find_many(
            query={
                "league_id": league_id,
                "match_type": "quick",
                "status": "finished"
            },
            sort=[("match_date", -1)],
            limit=20
        )
        
        # Enrich with player info
        for match in active_matches + finished_today:
            player_a = await self.player_repo.get_by_id(match.get("player_a_id"))
            player_b = await self.player_repo.get_by_id(match.get("player_b_id"))
            match["player_a_info"] = {"name": player_a.get("name") if player_a else "?"} 
            match["player_b_info"] = {"name": player_b.get("name") if player_b else "?"}
        
        return {
            "active_matches": active_matches,
            "finished_today": finished_today,
            "total_active": len(active_matches)
        }

    # ============== HEAD-TO-HEAD PREDICTOR ==============
    
    async def predict_match(self, player_a_id: str, player_b_id: str) -> Dict:
        """
        Predict match outcome between two players.
        Uses ELO rating, head-to-head history and current streak.
        """
        # Get stats for both players
        stats_a = await self.get_player_statistics(player_a_id)
        stats_b = await self.get_player_statistics(player_b_id)
        
        if not stats_a or not stats_b:
            return {"error": "Player not found"}
        
        # Get head-to-head history
        h2h = await self.get_head_to_head(player_a_id, player_b_id)
        
        # Calculate probability based on ELO
        elo_a = stats_a.get("player_info", {}).get("elo_rating", 1200)
        elo_b = stats_b.get("player_info", {}).get("elo_rating", 1200)
        
        # ELO expected probability formula
        expected_a = 1 / (1 + math.pow(10, (elo_b - elo_a) / 400))
        expected_b = 1 - expected_a
        
        # Adjust by H2H history
        h2h_adjustment = 0
        if h2h.get("total_matches", 0) > 0:
            wins_a = h2h.get("player_a_wins", 0)
            wins_b = h2h.get("player_b_wins", 0)
            total = wins_a + wins_b
            if total > 0:
                # Adjustment factor based on H2H (max ±10%)
                h2h_ratio = (wins_a - wins_b) / total
                h2h_adjustment = h2h_ratio * 0.10
        
        # Adjust by current streak
        streak_adjustment = 0
        streak_a = stats_a.get("overall_stats", {}).get("best_streak", 0)
        streak_b = stats_b.get("overall_stats", {}).get("best_streak", 0)
        
        # Positive streak gives small advantage (max ±5%)
        if streak_a > 0 and streak_b <= 0:
            streak_adjustment = min(streak_a * 0.01, 0.05)
        elif streak_b > 0 and streak_a <= 0:
            streak_adjustment = -min(streak_b * 0.01, 0.05)
        
        # Final adjusted probability
        prob_a = max(0.05, min(0.95, expected_a + h2h_adjustment + streak_adjustment))
        prob_b = 1 - prob_a
        
        # Determine favorite
        if prob_a > prob_b:
            favorite = "player_a"
            confidence = "high" if prob_a > 0.7 else "medium" if prob_a > 0.55 else "low"
        elif prob_b > prob_a:
            favorite = "player_b"
            confidence = "high" if prob_b > 0.7 else "medium" if prob_b > 0.55 else "low"
        else:
            favorite = "draw"
            confidence = "low"
        
        # Calculate advantages by category
        advantages = []
        
        # ELO
        if elo_a > elo_b + 50:
            advantages.append({"category": "elo", "player": "a", "detail": f"+{elo_a - elo_b} ELO"})
        elif elo_b > elo_a + 50:
            advantages.append({"category": "elo", "player": "b", "detail": f"+{elo_b - elo_a} ELO"})
        
        # Win Rate
        wr_a = stats_a.get("overall_stats", {}).get("win_rate", 0)
        wr_b = stats_b.get("overall_stats", {}).get("win_rate", 0)
        if wr_a > wr_b + 5:
            advantages.append({"category": "win_rate", "player": "a", "detail": f"{wr_a:.0f}% vs {wr_b:.0f}%"})
        elif wr_b > wr_a + 5:
            advantages.append({"category": "win_rate", "player": "b", "detail": f"{wr_b:.0f}% vs {wr_a:.0f}%"})
        
        # H2H
        if h2h.get("total_matches", 0) >= 3:
            wins_a = h2h.get("player_a_wins", 0)
            wins_b = h2h.get("player_b_wins", 0)
            if wins_a > wins_b:
                advantages.append({"category": "h2h", "player": "a", "detail": f"{wins_a}-{wins_b} in H2H"})
            elif wins_b > wins_a:
                advantages.append({"category": "h2h", "player": "b", "detail": f"{wins_b}-{wins_a} in H2H"})
        
        return {
            "player_a": {
                "player_id": player_a_id,
                "name": stats_a.get("player_info", {}).get("name", "?"),
                "nickname": stats_a.get("player_info", {}).get("nickname"),
                "elo": elo_a,
                "win_rate": wr_a,
                "probability": round(prob_a * 100, 1)
            },
            "player_b": {
                "player_id": player_b_id,
                "name": stats_b.get("player_info", {}).get("name", "?"),
                "nickname": stats_b.get("player_info", {}).get("nickname"),
                "elo": elo_b,
                "win_rate": wr_b,
                "probability": round(prob_b * 100, 1)
            },
            "prediction": {
                "favorite": favorite,
                "confidence": confidence,
                "probability_a": round(prob_a * 100, 1),
                "probability_b": round(prob_b * 100, 1)
            },
            "factors": {
                "elo_based": round(expected_a * 100, 1),
                "h2h_adjustment": round(h2h_adjustment * 100, 1),
                "streak_adjustment": round(streak_adjustment * 100, 1)
            },
            "advantages": advantages,
            "head_to_head": h2h
        }


# Singleton instance
superpin_service = SuperPinService()
