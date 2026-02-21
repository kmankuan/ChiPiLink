"""
PinPanClub Settings & Referee Service
Manages global settings, referee profiles, and all-time leaderboard
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone

from core.base import BaseService
from core.database import db
from core.constants import PinpanClubCollections


REFEREE_BADGES = {
    "first_whistle": {"name": "First Whistle", "desc": "Refereed your first match", "threshold": 1},
    "regular_ref": {"name": "Regular Ref", "desc": "Refereed 10 matches", "threshold": 10},
    "veteran_ref": {"name": "Veteran Ref", "desc": "Refereed 50 matches", "threshold": 50},
    "iron_whistle": {"name": "Iron Whistle", "desc": "Refereed 100 matches", "threshold": 100},
    "five_star": {"name": "Five Star Referee", "desc": "Average rating of 4.5+", "threshold": None},
    "streak_7": {"name": "Week Warrior", "desc": "7-day referee streak", "threshold": 7},
    "all_rounder": {"name": "All-Rounder", "desc": "Refereed in all game types", "threshold": None},
}


class PinPanSettingsService(BaseService):
    """Manages global PinPanClub settings"""

    MODULE_NAME = "pinpanclub"

    def __init__(self):
        super().__init__()
        self.settings_col = db[PinpanClubCollections.SETTINGS]
        self.referee_col = db[PinpanClubCollections.REFEREE_PROFILES]
        self.leaderboard_col = db[PinpanClubCollections.ARENA_LEADERBOARD]
        self.referee_ratings_col = db[PinpanClubCollections.REFEREE_RATINGS]

    # ============== GLOBAL SETTINGS ==============

    async def get_settings(self) -> Dict:
        settings = await self.settings_col.find_one(
            {"settings_id": "pinpanclub_global"},
            {"_id": 0}
        )
        if not settings:
            settings = {
                "settings_id": "pinpanclub_global",
                "referee_config": {
                    "league": {"required": True, "points_awarded": 2, "allow_self_referee": False},
                    "rapidpin": {"required": True, "points_awarded": 2, "allow_self_referee": False},
                    "arena": {"required": True, "points_awarded": 3, "allow_self_referee": False},
                    "casual": {"required": True, "points_awarded": 1, "allow_self_referee": False},
                },
            }
            await self.settings_col.insert_one(settings)
            settings.pop("_id", None)
        return settings

    async def update_referee_settings(self, game_type: str, updates: Dict, updated_by: str = None) -> Dict:
        settings = await self.get_settings()
        config = settings.get("referee_config", {})
        if game_type not in config:
            config[game_type] = {"required": True, "points_awarded": 2, "allow_self_referee": False}

        for key, val in updates.items():
            if key in ("required", "points_awarded", "allow_self_referee") and val is not None:
                config[game_type][key] = val

        await self.settings_col.update_one(
            {"settings_id": "pinpanclub_global"},
            {"$set": {
                "referee_config": config,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": updated_by
            }},
            upsert=True
        )
        return await self.get_settings()

    async def is_referee_required(self, game_type: str) -> bool:
        settings = await self.get_settings()
        config = settings.get("referee_config", {}).get(game_type, {})
        return config.get("required", True)

    async def get_referee_points(self, game_type: str) -> int:
        settings = await self.get_settings()
        config = settings.get("referee_config", {}).get(game_type, {})
        return config.get("points_awarded", 2)

    # ============== REFEREE PROFILES ==============

    async def get_referee_profile(self, player_id: str) -> Optional[Dict]:
        return await self.referee_col.find_one({"player_id": player_id}, {"_id": 0})

    async def get_referee_leaderboard(self, limit: int = 20) -> List[Dict]:
        cursor = self.referee_col.find(
            {"total_matches_refereed": {"$gt": 0}},
            {"_id": 0}
        ).sort("total_points_earned", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def record_referee_activity(self, player_id: str, game_type: str, player_name: str = "", player_avatar: str = None) -> Dict:
        """Record a referee activity and update their profile"""
        points = await self.get_referee_points(game_type)
        now = datetime.now(timezone.utc).isoformat()

        game_field = f"{game_type}_matches"

        profile = await self.get_referee_profile(player_id)
        if not profile:
            profile = {
                "player_id": player_id,
                "player_name": player_name,
                "player_avatar": player_avatar,
                "total_matches_refereed": 0,
                "total_points_earned": 0,
                "league_matches": 0,
                "rapidpin_matches": 0,
                "arena_matches": 0,
                "casual_matches": 0,
                "current_streak": 0,
                "best_streak": 0,
                "avg_rating": 0.0,
                "total_ratings": 0,
                "badges": [],
                "created_at": now,
            }

        update_ops = {
            "$inc": {
                "total_matches_refereed": 1,
                "total_points_earned": points,
            },
            "$set": {
                "last_refereed_at": now,
                "updated_at": now,
                "player_name": player_name or profile.get("player_name", ""),
            }
        }
        if game_field in ("league_matches", "rapidpin_matches", "arena_matches", "casual_matches"):
            update_ops["$inc"][game_field] = 1

        await self.referee_col.update_one(
            {"player_id": player_id},
            update_ops,
            upsert=True
        )

        # Check and award badges
        updated = await self.get_referee_profile(player_id)
        if updated:
            await self._check_badges(updated)

        return await self.get_referee_profile(player_id)

    async def rate_referee(self, match_id: str, referee_id: str, rated_by: str, rating: int, comment: str = None) -> Dict:
        """Rate a referee after a match"""
        rating = max(1, min(5, rating))

        await self.referee_ratings_col.insert_one({
            "match_id": match_id,
            "referee_id": referee_id,
            "rated_by": rated_by,
            "rating": rating,
            "comment": comment,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        # Recalculate average
        cursor = self.referee_ratings_col.find(
            {"referee_id": referee_id},
            {"rating": 1, "_id": 0}
        )
        ratings = await cursor.to_list(length=1000)
        if ratings:
            avg = sum(r["rating"] for r in ratings) / len(ratings)
            await self.referee_col.update_one(
                {"player_id": referee_id},
                {"$set": {
                    "avg_rating": round(avg, 2),
                    "total_ratings": len(ratings),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            # Check five_star badge
            profile = await self.get_referee_profile(referee_id)
            if profile:
                await self._check_badges(profile)

        return await self.get_referee_profile(referee_id)

    async def _check_badges(self, profile: Dict):
        """Check and award new badges"""
        badges = list(profile.get("badges", []))
        total = profile.get("total_matches_refereed", 0)
        changed = False

        for badge_id, badge_info in REFEREE_BADGES.items():
            if badge_id in badges:
                continue

            if badge_id == "first_whistle" and total >= 1:
                badges.append(badge_id)
                changed = True
            elif badge_id == "regular_ref" and total >= 10:
                badges.append(badge_id)
                changed = True
            elif badge_id == "veteran_ref" and total >= 50:
                badges.append(badge_id)
                changed = True
            elif badge_id == "iron_whistle" and total >= 100:
                badges.append(badge_id)
                changed = True
            elif badge_id == "five_star" and profile.get("avg_rating", 0) >= 4.5 and profile.get("total_ratings", 0) >= 5:
                badges.append(badge_id)
                changed = True
            elif badge_id == "streak_7" and profile.get("best_streak", 0) >= 7:
                badges.append(badge_id)
                changed = True
            elif badge_id == "all_rounder":
                if all(profile.get(f"{gt}_matches", 0) > 0 for gt in ("league", "rapidpin", "arena", "casual")):
                    badges.append(badge_id)
                    changed = True

        if changed:
            await self.referee_col.update_one(
                {"player_id": profile["player_id"]},
                {"$set": {"badges": badges}}
            )

    # ============== ALL-TIME ARENA LEADERBOARD ==============

    async def get_arena_leaderboard(self, limit: int = 50) -> List[Dict]:
        cursor = self.leaderboard_col.find(
            {"tournaments_played": {"$gt": 0}},
            {"_id": 0}
        ).sort("total_points", -1).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_player_arena_stats(self, player_id: str) -> Optional[Dict]:
        return await self.leaderboard_col.find_one({"player_id": player_id}, {"_id": 0})

    async def update_arena_leaderboard_from_tournament(self, tournament: Dict):
        """Update all-time leaderboard after a tournament completes"""
        if tournament.get("status") != "completed":
            return

        participants = tournament.get("participants", [])
        champion_id = tournament.get("champion_id")
        runner_up_id = tournament.get("runner_up_id")
        third_place_id = tournament.get("third_place_id")

        for p in participants:
            pid = p["player_id"]
            name = p.get("player_name", "")
            avatar = p.get("player_avatar")

            points = 0
            is_champion = pid == champion_id
            is_runner = pid == runner_up_id
            is_third = pid == third_place_id

            if is_champion:
                points += 10
            elif is_runner:
                points += 6
            elif is_third:
                points += 4

            # Count matches won in this tournament
            from ..repositories.arena_repository import ArenaMatchRepository
            match_repo = ArenaMatchRepository()
            player_matches = await match_repo.get_player_matches(tournament["tournament_id"], pid)
            matches_played = len([m for m in player_matches if m.get("status") in ("completed", "bye")])
            matches_won = len([m for m in player_matches if m.get("winner_id") == pid])
            points += matches_won  # 1 point per match won

            update_ops = {
                "$inc": {
                    "tournaments_played": 1,
                    "matches_played": matches_played,
                    "matches_won": matches_won,
                    "total_points": points,
                },
                "$set": {
                    "player_name": name,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            }
            if avatar:
                update_ops["$set"]["player_avatar"] = avatar
            if is_champion:
                update_ops["$inc"]["tournaments_won"] = 1
            if is_runner:
                update_ops["$inc"]["runner_up"] = 1
            if is_third:
                update_ops["$inc"]["third_place"] = 1

            await self.leaderboard_col.update_one(
                {"player_id": pid},
                update_ops,
                upsert=True
            )

        self.log_info(f"Arena leaderboard updated for tournament {tournament.get('tournament_id')}")

    # ============== HALL OF FAME - GLOBAL ALL-TIME LEADERBOARD ==============

    async def get_hall_of_fame(self, mode: str = None, limit: int = 50) -> List[Dict]:
        """Get the combined all-time Hall of Fame leaderboard"""
        hof_col = db[PinpanClubCollections.HALL_OF_FAME]

        query = {"total_points": {"$gt": 0}}
        sort_field = "total_points"

        if mode == "arena":
            sort_field = "arena_points"
        elif mode == "league":
            sort_field = "league_points"
        elif mode == "rapidpin":
            sort_field = "rapidpin_points"
        elif mode == "referee":
            sort_field = "referee_points"

        cursor = hof_col.find(query, {"_id": 0}).sort(sort_field, -1).limit(limit)
        entries = await cursor.to_list(length=limit)

        # Add rank numbers
        for idx, entry in enumerate(entries, 1):
            entry["rank"] = idx

        return entries

    async def get_player_hall_of_fame(self, player_id: str) -> Optional[Dict]:
        """Get a player's Hall of Fame stats"""
        hof_col = db[PinpanClubCollections.HALL_OF_FAME]
        return await hof_col.find_one({"player_id": player_id}, {"_id": 0})

    async def rebuild_hall_of_fame(self) -> int:
        """Rebuild the Hall of Fame by aggregating across all game modes"""
        hof_col = db[PinpanClubCollections.HALL_OF_FAME]
        players_col = db[PinpanClubCollections.PLAYERS]
        now = datetime.now(timezone.utc).isoformat()

        # Gather all player IDs from all sources
        all_players = {}

        # 1. Arena leaderboard
        arena_entries = await self.leaderboard_col.find({}, {"_id": 0}).to_list(length=10000)
        for e in arena_entries:
            pid = e["player_id"]
            if pid not in all_players:
                all_players[pid] = self._empty_hof_entry(pid)
            p = all_players[pid]
            p["player_name"] = e.get("player_name") or p["player_name"]
            p["player_avatar"] = e.get("player_avatar") or p["player_avatar"]
            p["arena_tournaments"] = e.get("tournaments_played", 0)
            p["arena_wins"] = e.get("tournaments_won", 0)
            p["arena_matches_played"] = e.get("matches_played", 0)
            p["arena_matches_won"] = e.get("matches_won", 0)
            p["arena_points"] = e.get("total_points", 0)

        # 2. League (SuperPin) rankings — aggregate from all leagues
        league_col = db[PinpanClubCollections.SUPERPIN_RANKINGS]
        league_pipeline = [
            {"$group": {
                "_id": "$player_id",
                "total_matches": {"$sum": "$matches_played"},
                "total_wins": {"$sum": "$matches_won"},
                "total_points": {"$sum": "$points"},
                "leagues_count": {"$sum": 1},
            }}
        ]
        league_stats = await league_col.aggregate(league_pipeline).to_list(length=10000)
        for e in league_stats:
            pid = e["_id"]
            if pid not in all_players:
                all_players[pid] = self._empty_hof_entry(pid)
            p = all_players[pid]
            p["league_matches_played"] = e.get("total_matches", 0)
            p["league_matches_won"] = e.get("total_wins", 0)
            p["league_seasons"] = e.get("leagues_count", 0)
            p["league_points"] = e.get("total_points", 0)

        # 3. RapidPin rankings — aggregate from all seasons
        rp_col = db[PinpanClubCollections.RAPIDPIN_RANKINGS]
        rp_pipeline = [
            {"$group": {
                "_id": "$jugador_id",
                "total_points": {"$sum": "$puntos_totales"},
                "total_wins": {"$sum": "$partidos_ganados"},
                "total_losses": {"$sum": "$partidos_perdidos"},
                "total_refereed": {"$sum": "$partidos_arbitrados"},
                "seasons_count": {"$sum": 1},
            }}
        ]
        rp_stats = await rp_col.aggregate(rp_pipeline).to_list(length=10000)
        for e in rp_stats:
            pid = e["_id"]
            if pid not in all_players:
                all_players[pid] = self._empty_hof_entry(pid)
            p = all_players[pid]
            p["rapidpin_matches_played"] = e.get("total_wins", 0) + e.get("total_losses", 0)
            p["rapidpin_matches_won"] = e.get("total_wins", 0)
            p["rapidpin_seasons"] = e.get("seasons_count", 0)
            p["rapidpin_points"] = e.get("total_points", 0)

        # 4. Referee profiles
        ref_entries = await self.referee_col.find({}, {"_id": 0}).to_list(length=10000)
        for e in ref_entries:
            pid = e["player_id"]
            if pid not in all_players:
                all_players[pid] = self._empty_hof_entry(pid)
            p = all_players[pid]
            p["player_name"] = e.get("player_name") or p["player_name"]
            p["player_avatar"] = e.get("player_avatar") or p["player_avatar"]
            p["referee_matches"] = e.get("total_matches_refereed", 0)
            p["referee_points"] = e.get("total_points_earned", 0)
            p["referee_rating"] = e.get("avg_rating", 0)
            p["referee_badges"] = e.get("badges", [])

        # 5. Fill in player info for any still missing names
        for pid, entry in all_players.items():
            if not entry["player_name"]:
                player = await players_col.find_one({"player_id": pid}, {"_id": 0, "name": 1, "photo_url": 1, "nickname": 1})
                if player:
                    entry["player_name"] = player.get("nickname") or player.get("name", "")
                    entry["player_avatar"] = player.get("photo_url")

        # 6. Compute total points and upsert
        count = 0
        for pid, entry in all_players.items():
            entry["total_points"] = (
                entry["arena_points"]
                + entry["league_points"]
                + entry["rapidpin_points"]
                + entry["referee_points"]
            )
            entry["total_matches"] = (
                entry["arena_matches_played"]
                + entry["league_matches_played"]
                + entry["rapidpin_matches_played"]
            )
            entry["total_wins"] = (
                entry["arena_matches_won"]
                + entry["league_matches_won"]
                + entry["rapidpin_matches_won"]
            )
            entry["updated_at"] = now

            await hof_col.update_one(
                {"player_id": pid},
                {"$set": entry},
                upsert=True
            )
            count += 1

        self.log_info(f"Hall of Fame rebuilt: {count} entries")
        return count

    def _empty_hof_entry(self, player_id: str) -> Dict:
        return {
            "player_id": player_id,
            "player_name": "",
            "player_avatar": None,
            # Arena
            "arena_tournaments": 0,
            "arena_wins": 0,
            "arena_matches_played": 0,
            "arena_matches_won": 0,
            "arena_points": 0,
            # League
            "league_seasons": 0,
            "league_matches_played": 0,
            "league_matches_won": 0,
            "league_points": 0,
            # RapidPin
            "rapidpin_seasons": 0,
            "rapidpin_matches_played": 0,
            "rapidpin_matches_won": 0,
            "rapidpin_points": 0,
            # Referee
            "referee_matches": 0,
            "referee_points": 0,
            "referee_rating": 0,
            "referee_badges": [],
            # Combined
            "total_points": 0,
            "total_matches": 0,
            "total_wins": 0,
        }


# Singleton
pinpan_settings_service = PinPanSettingsService()
