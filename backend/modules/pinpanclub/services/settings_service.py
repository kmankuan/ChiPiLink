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


# Singleton
pinpan_settings_service = PinPanSettingsService()
