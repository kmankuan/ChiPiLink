"""
PinPan Arena - Service Layer
Business logic for the unified tournament system.
Supports: Single Elimination, Round Robin, Group + Knockout, RapidPin Mode
"""
import math
import uuid
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from ..repositories.arena_repository import ArenaTournamentRepository, ArenaMatchRepository
from ..repositories.player_repository import PlayerRepository
from ..models.arena import (
    Tournament, TournamentCreate, TournamentUpdate,
    TournamentFormat, TournamentStatus, ArenaMatchStatus,
    TournamentParticipant, SeedingSource
)


class ArenaService(BaseService):
    """Main service for PinPan Arena tournaments."""

    MODULE_NAME = "pinpanclub"

    def __init__(self):
        super().__init__()
        self.tournament_repo = ArenaTournamentRepository()
        self.match_repo = ArenaMatchRepository()
        self.player_repo = PlayerRepository()

    async def _notify_participants(self, tournament: Dict, title: str, body: str, action_url: str = None):
        """Send push notification to all tournament participants (fire and forget)"""
        try:
            from modules.notifications.services.push_service import push_notification_service
            user_ids = [p.get("player_id") for p in tournament.get("participants", []) if p.get("player_id")]
            if user_ids:
                await push_notification_service.send_to_users(
                    user_ids=user_ids,
                    category_id="arena_tournament",
                    title=title,
                    body=body,
                    action_url=action_url,
                    data={"tournament_id": tournament.get("tournament_id", "")}
                )
        except Exception as e:
            self.log_warning(f"Push notification failed: {e}")

    # ============== TOURNAMENT CRUD ==============

    async def create_tournament(self, data: TournamentCreate, created_by: str = None) -> Dict:
        """Create a new tournament"""
        t = data.model_dump()
        t["status"] = TournamentStatus.DRAFT.value
        t["format"] = data.format.value
        t["seeding_source"] = data.seeding_source.value
        if created_by:
            t["created_by"] = created_by
        result = await self.tournament_repo.create(t)
        self.log_info(f"Arena tournament created: {result['tournament_id']}")
        return result

    async def get_tournament(self, tournament_id: str) -> Optional[Dict]:
        return await self.tournament_repo.get_by_id(tournament_id)

    async def list_tournaments(self, status: str = None) -> List[Dict]:
        return await self.tournament_repo.get_all(status=status)

    async def get_active_tournaments(self) -> List[Dict]:
        return await self.tournament_repo.get_active()

    async def update_tournament(self, tournament_id: str, data: TournamentUpdate) -> Optional[Dict]:
        update_data = data.model_dump(exclude_unset=True)
        if "status" in update_data and update_data["status"]:
            update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]
        if not update_data:
            return await self.get_tournament(tournament_id)
        await self.tournament_repo.update_tournament(tournament_id, update_data)
        return await self.get_tournament(tournament_id)

    async def delete_tournament(self, tournament_id: str) -> bool:
        await self.match_repo.delete_by_tournament(tournament_id)
        return await self.tournament_repo.delete_tournament(tournament_id)

    # ============== REGISTRATION ==============

    async def open_registration(self, tournament_id: str) -> Optional[Dict]:
        await self.tournament_repo.update_tournament(tournament_id, {
            "status": TournamentStatus.REGISTRATION_OPEN.value
        })
        tournament = await self.get_tournament(tournament_id)
        # Notify existing participants
        if tournament:
            await self._notify_participants(
                tournament,
                f"Registration Open: {tournament.get('name', '')}",
                "Registration is now open! Share with your friends.",
                action_url=f"/arena/{tournament_id}"
            )
        return tournament

    async def close_registration(self, tournament_id: str) -> Optional[Dict]:
        await self.tournament_repo.update_tournament(tournament_id, {
            "status": TournamentStatus.REGISTRATION_CLOSED.value
        })
        return await self.get_tournament(tournament_id)

    async def register_player(self, tournament_id: str, player_id: str) -> Dict:
        """Register a player in a tournament"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        if tournament["status"] != TournamentStatus.REGISTRATION_OPEN.value:
            raise ValueError("Registration is not open")

        if tournament["total_participants"] >= tournament["max_players"]:
            raise ValueError("Tournament is full")

        # Check already registered
        for p in tournament.get("participants", []):
            if p["player_id"] == player_id:
                raise ValueError("Player already registered")

        # Get player info
        player = await self.player_repo.get_by_id(player_id)
        player_name = player.get("nombre", player.get("name", "Unknown")) if player else "Unknown"
        player_avatar = player.get("avatar_url", None) if player else None

        participant = {
            "player_id": player_id,
            "player_name": player_name,
            "player_avatar": player_avatar,
            "seed": None,
            "group": None,
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "status": "registered"
        }

        await self.tournament_repo.add_participant(tournament_id, participant)
        self.log_info(f"Player {player_id} registered for tournament {tournament_id}")
        return await self.get_tournament(tournament_id)

    async def withdraw_player(self, tournament_id: str, player_id: str) -> Dict:
        """Remove a player from a tournament"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        if tournament["status"] not in [
            TournamentStatus.REGISTRATION_OPEN.value,
            TournamentStatus.REGISTRATION_CLOSED.value
        ]:
            raise ValueError("Cannot withdraw after tournament has started")

        await self.tournament_repo.remove_participant(tournament_id, player_id)
        self.log_info(f"Player {player_id} withdrew from tournament {tournament_id}")
        return await self.get_tournament(tournament_id)

    # ============== SEEDING ==============

    async def apply_seeding(self, tournament_id: str) -> Dict:
        """Apply seeding to registered participants"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        participants = tournament.get("participants", [])
        source = tournament.get("seeding_source", "none")

        if source == SeedingSource.ELO.value:
            # Seed by ELO rating from player profiles
            for p in participants:
                player = await self.player_repo.get_by_id(p["player_id"])
                p["seed"] = player.get("elo_rating", 1000) if player else 1000
            participants.sort(key=lambda x: x.get("seed", 0), reverse=True)
            for i, p in enumerate(participants):
                p["seed"] = i + 1

        elif source == SeedingSource.SUPERPIN.value:
            # Seed by SuperPin league ranking
            league_id = tournament.get("seeding_league_id")
            if league_id:
                from ..services.superpin_service import superpin_service
                ranking = await superpin_service.get_ranking(league_id)
                rank_map = {}
                if ranking and hasattr(ranking, "entries"):
                    for entry in ranking.entries:
                        rank_map[entry.player_id] = entry.position
                for p in participants:
                    p["seed"] = rank_map.get(p["player_id"], 999)
                participants.sort(key=lambda x: x.get("seed", 999))
                for i, p in enumerate(participants):
                    p["seed"] = i + 1
            else:
                for i, p in enumerate(participants):
                    p["seed"] = i + 1

        elif source == SeedingSource.RAPIDPIN.value:
            # Seed by RapidPin season ranking
            season_id = tournament.get("seeding_season_id")
            if season_id:
                from ..services.rapidpin_service import RapidPinService
                rp_service = RapidPinService()
                ranking_entries = await rp_service.ranking_repo.get_season_ranking(season_id)
                rank_map = {}
                for entry in ranking_entries:
                    rank_map[entry.get("jugador_id", "")] = entry.get("posicion", 999)
                for p in participants:
                    p["seed"] = rank_map.get(p["player_id"], 999)
                participants.sort(key=lambda x: x.get("seed", 999))
                for i, p in enumerate(participants):
                    p["seed"] = i + 1
            else:
                for i, p in enumerate(participants):
                    p["seed"] = i + 1

        elif source == SeedingSource.MANUAL.value:
            pass  # Seeds already set by admin
        else:
            # Random seeding
            random.shuffle(participants)
            for i, p in enumerate(participants):
                p["seed"] = i + 1

        await self.tournament_repo.update_tournament(tournament_id, {
            "participants": participants
        })
        self.log_info(f"Seeding applied for tournament {tournament_id} (source: {source})")
        return await self.get_tournament(tournament_id)

    # ============== BRACKET GENERATION ==============

    async def generate_brackets(self, tournament_id: str) -> Dict:
        """Generate brackets/schedule based on tournament format"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        participants = tournament.get("participants", [])
        num_players = len(participants)

        if num_players < 2:
            raise ValueError("At least 2 participants needed")

        fmt = tournament.get("format", TournamentFormat.SINGLE_ELIMINATION.value)

        # Clean existing matches
        await self.match_repo.delete_by_tournament(tournament_id)

        if fmt == TournamentFormat.SINGLE_ELIMINATION.value:
            result = await self._generate_single_elimination(tournament_id, tournament, participants)
        elif fmt == TournamentFormat.ROUND_ROBIN.value:
            result = await self._generate_round_robin(tournament_id, tournament, participants)
        elif fmt == TournamentFormat.GROUP_KNOCKOUT.value:
            result = await self._generate_group_knockout(tournament_id, tournament, participants)
        elif fmt == TournamentFormat.RAPIDPIN.value:
            result = await self._generate_rapidpin_mode(tournament_id, tournament, participants)
        else:
            raise ValueError(f"Unknown format: {fmt}")

        await self.tournament_repo.update_tournament(tournament_id, {
            "status": TournamentStatus.IN_PROGRESS.value,
            **result
        })

        self.log_info(f"Brackets generated for tournament {tournament_id} (format: {fmt})")
        tournament = await self.get_tournament(tournament_id)

        # Notify participants that tournament has started
        await self._notify_participants(
            tournament,
            f"Tournament Started: {tournament.get('name', '')}",
            "Brackets are live! Check your first match.",
            action_url=f"/arena/{tournament_id}"
        )

        return tournament

    async def _generate_single_elimination(self, tid: str, tournament: Dict, participants: List[Dict]) -> Dict:
        """Generate single elimination bracket"""
        participants = sorted(participants, key=lambda x: x.get("seed") or 999)
        num_players = len(participants)
        num_rounds = math.ceil(math.log2(num_players))
        bracket_size = 2 ** num_rounds

        brackets = []
        matches_to_create = []

        # Round 1: seed 1 vs last, 2 vs second-last, etc.
        round_1 = []
        for i in range(bracket_size // 2):
            top_idx = i
            bottom_idx = bracket_size - 1 - i

            player_a = participants[top_idx] if top_idx < num_players else None
            player_b = participants[bottom_idx] if bottom_idx < num_players and bottom_idx != top_idx else None

            match_data = {
                "tournament_id": tid,
                "round_num": 1,
                "position": i,
                "player_a_id": player_a["player_id"] if player_a else None,
                "player_b_id": player_b["player_id"] if player_b else None,
                "player_a_name": player_a["player_name"] if player_a else "",
                "player_b_name": player_b["player_name"] if player_b else "",
                "status": "pending"
            }

            # Bye: auto-advance
            if player_a and not player_b:
                match_data["winner_id"] = player_a["player_id"]
                match_data["status"] = "bye"
            elif player_b and not player_a:
                match_data["winner_id"] = player_b["player_id"]
                match_data["status"] = "bye"

            matches_to_create.append(match_data)
            round_1.append(match_data)

        brackets.append({"round": 1, "name": self._round_name(1, num_rounds), "match_count": len(round_1)})

        # Generate empty rounds
        for r in range(2, num_rounds + 1):
            num_matches = bracket_size // (2 ** r)
            for i in range(num_matches):
                match_data = {
                    "tournament_id": tid,
                    "round_num": r,
                    "position": i,
                    "player_a_id": None,
                    "player_b_id": None,
                    "player_a_name": "",
                    "player_b_name": "",
                    "status": "pending"
                }
                matches_to_create.append(match_data)
            brackets.append({"round": r, "name": self._round_name(r, num_rounds), "match_count": num_matches})

        # Third place match
        if tournament.get("third_place_match", True) and num_rounds >= 2:
            matches_to_create.append({
                "tournament_id": tid,
                "round_num": num_rounds + 1,
                "position": 0,
                "player_a_id": None,
                "player_b_id": None,
                "player_a_name": "",
                "player_b_name": "",
                "status": "pending",
                "group": "__third_place__"
            })
            brackets.append({"round": num_rounds + 1, "name": "Third Place", "match_count": 1})

        # Save all matches
        for m in matches_to_create:
            await self.match_repo.create(m)

        # Auto-advance byes to round 2
        await self._advance_byes(tid, 1, bracket_size // 2)

        return {"brackets": brackets}

    async def _generate_round_robin(self, tid: str, tournament: Dict, participants: List[Dict]) -> Dict:
        """Generate round-robin schedule (everyone plays everyone)"""
        n = len(participants)
        matches_to_create = []
        round_num = 0

        # Standard round-robin scheduling
        players = list(participants)
        if n % 2 == 1:
            players.append(None)  # Add bye player for odd count

        num_rounds_rr = len(players) - 1
        half = len(players) // 2

        for r in range(num_rounds_rr):
            round_num = r + 1
            pos = 0
            for i in range(half):
                p1 = players[i]
                p2 = players[len(players) - 1 - i]
                if p1 is None or p2 is None:
                    continue
                match_data = {
                    "tournament_id": tid,
                    "round_num": round_num,
                    "position": pos,
                    "player_a_id": p1["player_id"],
                    "player_b_id": p2["player_id"],
                    "player_a_name": p1["player_name"],
                    "player_b_name": p2["player_name"],
                    "status": "pending"
                }
                matches_to_create.append(match_data)
                pos += 1
            # Rotate players (first player stays fixed)
            players = [players[0]] + [players[-1]] + players[1:-1]

        for m in matches_to_create:
            await self.match_repo.create(m)

        brackets = [
            {"round": r + 1, "name": f"Round {r + 1}", "match_count": sum(1 for m in matches_to_create if m["round_num"] == r + 1)}
            for r in range(num_rounds_rr)
        ]

        return {"brackets": brackets}

    async def _generate_group_knockout(self, tid: str, tournament: Dict, participants: List[Dict]) -> Dict:
        """Generate group stage + knockout bracket"""
        num_groups = tournament.get("num_groups", 4)
        participants = sorted(participants, key=lambda x: x.get("seed") or 999)

        # Distribute into groups (snake seeding)
        groups = {chr(65 + i): [] for i in range(num_groups)}  # A, B, C, D...
        group_names = list(groups.keys())
        for i, p in enumerate(participants):
            group_idx = i % num_groups
            if (i // num_groups) % 2 == 1:
                group_idx = num_groups - 1 - group_idx
            g = group_names[group_idx]
            p["group"] = g
            groups[g].append(p["player_id"])

        # Update participants with group assignments
        await self.tournament_repo.update_tournament(tid, {
            "participants": participants,
            "groups": groups
        })

        # Generate round-robin within each group
        matches_to_create = []
        round_num = 0

        for g_name, player_ids in groups.items():
            group_players = [p for p in participants if p.get("group") == g_name]
            gn = len(group_players)
            if gn < 2:
                continue
            g_players = list(group_players)
            if gn % 2 == 1:
                g_players.append(None)

            num_g_rounds = len(g_players) - 1
            half = len(g_players) // 2

            for r in range(num_g_rounds):
                rn = r + 1
                if rn > round_num:
                    round_num = rn
                pos = 0
                for i in range(half):
                    p1 = g_players[i]
                    p2 = g_players[len(g_players) - 1 - i]
                    if p1 is None or p2 is None:
                        continue
                    matches_to_create.append({
                        "tournament_id": tid,
                        "round_num": rn,
                        "position": pos,
                        "group": g_name,
                        "player_a_id": p1["player_id"],
                        "player_b_id": p2["player_id"],
                        "player_a_name": p1["player_name"],
                        "player_b_name": p2["player_name"],
                        "status": "pending"
                    })
                    pos += 1
                g_players = [g_players[0]] + [g_players[-1]] + g_players[1:-1]

        for m in matches_to_create:
            await self.match_repo.create(m)

        brackets = []
        for r in range(1, round_num + 1):
            count = sum(1 for m in matches_to_create if m["round_num"] == r)
            brackets.append({"round": r, "name": f"Group Stage - Round {r}", "match_count": count})

        # Initialize group standings
        group_standings = {}
        for g_name, player_ids in groups.items():
            standings = []
            for pid in player_ids:
                p = next((pp for pp in participants if pp["player_id"] == pid), None)
                standings.append({
                    "player_id": pid,
                    "player_name": p["player_name"] if p else "",
                    "played": 0, "won": 0, "lost": 0,
                    "sets_won": 0, "sets_lost": 0, "points": 0
                })
            group_standings[g_name] = standings

        return {"brackets": brackets, "groups": groups, "group_standings": group_standings}

    async def _generate_rapidpin_mode(self, tid: str, tournament: Dict, participants: List[Dict]) -> Dict:
        """Generate RapidPin mode — all vs all, spontaneous matches within deadline"""
        # Similar to round robin but no fixed schedule
        # Just create the tournament state, matches are created on-the-fly
        brackets = [{"round": 1, "name": "RapidPin Open Play", "match_count": 0}]
        return {"brackets": brackets}

    # ============== MATCH RESULTS ==============

    async def submit_match_result(
        self,
        tournament_id: str,
        match_id: str,
        winner_id: str,
        score_a: int = 0,
        score_b: int = 0,
        sets: List[Dict] = None
    ) -> Dict:
        """Submit a match result and advance the bracket"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        match = await self.match_repo.get_by_id(match_id)
        if not match:
            raise ValueError("Match not found")

        if match["tournament_id"] != tournament_id:
            raise ValueError("Match does not belong to this tournament")

        if match["status"] in ["completed", "bye"]:
            raise ValueError("Match already completed")

        if winner_id not in [match.get("player_a_id"), match.get("player_b_id")]:
            raise ValueError("Winner must be one of the match players")

        # Update match
        update_data = {
            "winner_id": winner_id,
            "score_a": score_a,
            "score_b": score_b,
            "status": ArenaMatchStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        if sets:
            update_data["sets"] = sets

        await self.match_repo.update_match(match_id, update_data)

        fmt = tournament.get("format", TournamentFormat.SINGLE_ELIMINATION.value)

        if fmt == TournamentFormat.SINGLE_ELIMINATION.value:
            await self._advance_winner_elimination(tournament_id, match, winner_id, tournament)
        elif fmt in [TournamentFormat.ROUND_ROBIN.value, TournamentFormat.RAPIDPIN.value]:
            await self._update_rr_standings(tournament_id, match, winner_id, score_a, score_b, sets)
        elif fmt == TournamentFormat.GROUP_KNOCKOUT.value:
            if match.get("group") and match["group"] != "__knockout__":
                await self._update_group_standings(tournament_id, match, winner_id, score_a, score_b, sets)
            else:
                await self._advance_winner_elimination(tournament_id, match, winner_id, tournament)

        # Check if tournament is complete
        await self._check_tournament_completion(tournament_id)

        # Broadcast update via WebSocket
        updated_tournament = await self.get_tournament(tournament_id)
        updated_matches = await self.get_tournament_matches(tournament_id)
        await self._broadcast_arena_update(tournament_id, updated_tournament, updated_matches)

        return updated_tournament

    async def _broadcast_arena_update(self, tournament_id: str, tournament: dict = None, matches: list = None):
        """Broadcast arena update via WebSocket (fire and forget)"""
        try:
            from ..routes.websocket import broadcast_arena_update
            # Clean _id from tournament and matches for JSON serialization
            if tournament and "_id" in tournament:
                del tournament["_id"]
            if matches:
                for m in matches:
                    if "_id" in m:
                        del m["_id"]
            await broadcast_arena_update(tournament_id, tournament, matches)
        except Exception as e:
            self.log_warning(f"WebSocket broadcast failed: {e}")

    async def _advance_winner_elimination(self, tid: str, match: Dict, winner_id: str, tournament: Dict):
        """Advance winner to next round in elimination bracket"""
        round_num = match["round_num"]
        position = match["position"]
        next_round = round_num + 1
        next_position = position // 2

        # Find next round match
        next_matches = await self.match_repo.get_by_tournament_round(tid, next_round)
        target_match = None
        for nm in next_matches:
            if nm["position"] == next_position and nm.get("group") != "__third_place__":
                target_match = nm
                break

        if not target_match:
            return  # Final match, no next round

        # Get winner info
        winner_name = ""
        for p in tournament.get("participants", []):
            if p["player_id"] == winner_id:
                winner_name = p.get("player_name", "")
                break

        # Place winner in correct slot
        if position % 2 == 0:
            await self.match_repo.update_match(target_match["match_id"], {
                "player_a_id": winner_id,
                "player_a_name": winner_name
            })
        else:
            await self.match_repo.update_match(target_match["match_id"], {
                "player_b_id": winner_id,
                "player_b_name": winner_name
            })

        # Handle losers for third place match (semi-final losers)
        loser_id = match.get("player_a_id") if match.get("player_b_id") == winner_id else match.get("player_b_id")
        if loser_id and tournament.get("third_place_match", True):
            # Check if this is a semi-final (next round is the final)
            brackets = tournament.get("brackets", [])
            max_round = max((b["round"] for b in brackets if b["name"] != "Third Place"), default=0)
            if next_round == max_round:
                # This is a semi-final — place loser in third place match
                third_matches = await self.match_repo.get_by_tournament_round(tid, max_round + 1)
                for tm in third_matches:
                    if tm.get("group") == "__third_place__":
                        loser_name = ""
                        for p in tournament.get("participants", []):
                            if p["player_id"] == loser_id:
                                loser_name = p.get("player_name", "")
                                break
                        if not tm.get("player_a_id"):
                            await self.match_repo.update_match(tm["match_id"], {
                                "player_a_id": loser_id,
                                "player_a_name": loser_name
                            })
                        elif not tm.get("player_b_id"):
                            await self.match_repo.update_match(tm["match_id"], {
                                "player_b_id": loser_id,
                                "player_b_name": loser_name
                            })
                        break

    async def _advance_byes(self, tid: str, round_num: int, num_matches: int):
        """Auto-advance bye winners to next round"""
        matches = await self.match_repo.get_by_tournament_round(tid, round_num)
        tournament = await self.get_tournament(tid)
        for m in matches:
            if m.get("status") == "bye" and m.get("winner_id"):
                await self._advance_winner_elimination(tid, m, m["winner_id"], tournament)

    async def _update_rr_standings(self, tid: str, match: Dict, winner_id: str, score_a: int, score_b: int, sets: List = None):
        """Update round robin standings (stored in group_standings with key '__rr__')"""
        tournament = await self.get_tournament(tid)
        standings = tournament.get("group_standings", {}).get("__rr__", [])

        if not standings:
            # Initialize
            for p in tournament.get("participants", []):
                standings.append({
                    "player_id": p["player_id"],
                    "player_name": p.get("player_name", ""),
                    "played": 0, "won": 0, "lost": 0,
                    "sets_won": 0, "sets_lost": 0, "points": 0
                })

        loser_id = match.get("player_a_id") if match.get("player_b_id") == winner_id else match.get("player_b_id")
        pts_win = tournament.get("points_win", 3)
        pts_loss = tournament.get("points_loss", 1)

        for s in standings:
            if s["player_id"] == winner_id:
                s["played"] += 1
                s["won"] += 1
                s["points"] += pts_win
                s["sets_won"] += score_a if match.get("player_a_id") == winner_id else score_b
                s["sets_lost"] += score_b if match.get("player_a_id") == winner_id else score_a
            elif s["player_id"] == loser_id:
                s["played"] += 1
                s["lost"] += 1
                s["points"] += pts_loss
                s["sets_won"] += score_a if match.get("player_a_id") == loser_id else score_b
                s["sets_lost"] += score_b if match.get("player_a_id") == loser_id else score_a

        standings.sort(key=lambda x: (-x["points"], -(x["sets_won"] - x["sets_lost"])))

        group_standings = tournament.get("group_standings", {})
        group_standings["__rr__"] = standings
        await self.tournament_repo.update_tournament(tid, {"group_standings": group_standings})

    async def _update_group_standings(self, tid: str, match: Dict, winner_id: str, score_a: int, score_b: int, sets: List = None):
        """Update group stage standings"""
        group = match.get("group")
        if not group:
            return

        tournament = await self.get_tournament(tid)
        group_standings = tournament.get("group_standings", {})
        standings = group_standings.get(group, [])

        loser_id = match.get("player_a_id") if match.get("player_b_id") == winner_id else match.get("player_b_id")
        pts_win = tournament.get("points_win", 3)
        pts_loss = tournament.get("points_loss", 1)

        for s in standings:
            if s["player_id"] == winner_id:
                s["played"] += 1
                s["won"] += 1
                s["points"] += pts_win
                s["sets_won"] += score_a if match.get("player_a_id") == winner_id else score_b
                s["sets_lost"] += score_b if match.get("player_a_id") == winner_id else score_a
            elif s["player_id"] == loser_id:
                s["played"] += 1
                s["lost"] += 1
                s["points"] += pts_loss
                s["sets_won"] += score_a if match.get("player_a_id") == loser_id else score_b
                s["sets_lost"] += score_b if match.get("player_a_id") == loser_id else score_a

        standings.sort(key=lambda x: (-x["points"], -(x["sets_won"] - x["sets_lost"])))
        group_standings[group] = standings
        await self.tournament_repo.update_tournament(tid, {"group_standings": group_standings})

    async def generate_knockout_from_groups(self, tournament_id: str) -> Dict:
        """After group stage completes, generate knockout bracket from group winners"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        advance_count = tournament.get("players_per_group_advance", 2)
        group_standings = tournament.get("group_standings", {})
        qualified = []

        for g_name in sorted(group_standings.keys()):
            standings = group_standings[g_name]
            for s in standings[:advance_count]:
                p = next((pp for pp in tournament.get("participants", []) if pp["player_id"] == s["player_id"]), None)
                if p:
                    qualified.append(p)

        if len(qualified) < 2:
            raise ValueError("Not enough qualified players for knockout stage")

        # Give them seeds based on group performance
        for i, q in enumerate(qualified):
            q["seed"] = i + 1

        # Generate single elimination bracket for qualified players
        # Clean old knockout matches
        all_matches = await self.match_repo.get_by_tournament(tournament_id)
        for m in all_matches:
            if m.get("group") == "__knockout__" or m.get("group") == "__third_place__":
                await self.match_repo.collection.delete_one({"match_id": m["match_id"]})

        # Determine round offset (after group rounds)
        brackets = tournament.get("brackets", [])
        round_offset = max((b["round"] for b in brackets), default=0)

        num_players = len(qualified)
        num_rounds = math.ceil(math.log2(num_players))
        bracket_size = 2 ** num_rounds

        knockout_brackets = []

        # Round 1 of knockout
        for i in range(bracket_size // 2):
            top_idx = i
            bottom_idx = bracket_size - 1 - i
            player_a = qualified[top_idx] if top_idx < num_players else None
            player_b = qualified[bottom_idx] if bottom_idx < num_players and bottom_idx != top_idx else None

            match_data = {
                "tournament_id": tournament_id,
                "round_num": round_offset + 1,
                "position": i,
                "group": "__knockout__",
                "player_a_id": player_a["player_id"] if player_a else None,
                "player_b_id": player_b["player_id"] if player_b else None,
                "player_a_name": player_a.get("player_name", "") if player_a else "",
                "player_b_name": player_b.get("player_name", "") if player_b else "",
                "status": "bye" if (player_a and not player_b) or (player_b and not player_a) else "pending"
            }
            if match_data["status"] == "bye":
                match_data["winner_id"] = (player_a or player_b)["player_id"]

            await self.match_repo.create(match_data)

        knockout_brackets.append({
            "round": round_offset + 1,
            "name": self._round_name(1, num_rounds),
            "match_count": bracket_size // 2
        })

        for r in range(2, num_rounds + 1):
            num_m = bracket_size // (2 ** r)
            for i in range(num_m):
                await self.match_repo.create({
                    "tournament_id": tournament_id,
                    "round_num": round_offset + r,
                    "position": i,
                    "group": "__knockout__",
                    "player_a_id": None,
                    "player_b_id": None,
                    "player_a_name": "",
                    "player_b_name": "",
                    "status": "pending"
                })
            knockout_brackets.append({
                "round": round_offset + r,
                "name": self._round_name(r, num_rounds),
                "match_count": num_m
            })

        all_brackets = brackets + knockout_brackets
        await self.tournament_repo.update_tournament(tournament_id, {"brackets": all_brackets})

        # Advance byes
        tournament = await self.get_tournament(tournament_id)
        ko_r1_matches = await self.match_repo.get_by_tournament_round(tournament_id, round_offset + 1)
        for m in ko_r1_matches:
            if m.get("status") == "bye" and m.get("winner_id"):
                await self._advance_winner_elimination(tournament_id, m, m["winner_id"], tournament)

        return await self.get_tournament(tournament_id)

    # ============== RAPIDPIN MODE ==============

    async def submit_rapidpin_match(self, tournament_id: str, player_a_id: str, player_b_id: str, winner_id: str, score_a: int, score_b: int) -> Dict:
        """Submit a spontaneous match in RapidPin tournament mode"""
        tournament = await self.get_tournament(tournament_id)
        if not tournament:
            raise ValueError("Tournament not found")

        if tournament.get("format") != TournamentFormat.RAPIDPIN.value:
            raise ValueError("This is not a RapidPin tournament")

        if tournament.get("status") != TournamentStatus.IN_PROGRESS.value:
            raise ValueError("Tournament is not in progress")

        # Verify both players are registered
        participant_ids = [p["player_id"] for p in tournament.get("participants", [])]
        if player_a_id not in participant_ids or player_b_id not in participant_ids:
            raise ValueError("Both players must be registered in the tournament")

        if winner_id not in [player_a_id, player_b_id]:
            raise ValueError("Winner must be one of the players")

        # Get names
        name_a = next((p["player_name"] for p in tournament["participants"] if p["player_id"] == player_a_id), "")
        name_b = next((p["player_name"] for p in tournament["participants"] if p["player_id"] == player_b_id), "")

        # Count existing matches to determine round/position
        existing = await self.match_repo.get_by_tournament(tournament_id)
        match_data = {
            "tournament_id": tournament_id,
            "round_num": 1,
            "position": len(existing),
            "player_a_id": player_a_id,
            "player_b_id": player_b_id,
            "player_a_name": name_a,
            "player_b_name": name_b,
            "winner_id": winner_id,
            "score_a": score_a,
            "score_b": score_b,
            "status": ArenaMatchStatus.COMPLETED.value,
            "completed_at": datetime.now(timezone.utc).isoformat()
        }
        await self.match_repo.create(match_data)

        # Update standings
        fake_match = {
            "player_a_id": player_a_id,
            "player_b_id": player_b_id
        }
        await self._update_rr_standings(tournament_id, fake_match, winner_id, score_a, score_b)

        # Broadcast update via WebSocket
        updated_tournament = await self.get_tournament(tournament_id)
        updated_matches = await self.get_tournament_matches(tournament_id)
        await self._broadcast_arena_update(tournament_id, updated_tournament, updated_matches)

        return updated_tournament

    # ============== COMPLETION ==============

    async def _check_tournament_completion(self, tid: str):
        """Check if all matches are done and finalize tournament"""
        tournament = await self.get_tournament(tid)
        fmt = tournament.get("format")

        matches = await self.match_repo.get_by_tournament(tid)
        pending = [m for m in matches if m["status"] == "pending"]

        if pending:
            return  # Still matches to play

        # All done — determine champion
        if fmt == TournamentFormat.SINGLE_ELIMINATION.value:
            # Find final match
            max_round = max((m["round_num"] for m in matches if m.get("group") != "__third_place__"), default=0)
            final = [m for m in matches if m["round_num"] == max_round and m.get("group") != "__third_place__"]
            third = [m for m in matches if m.get("group") == "__third_place__"]

            result = {}
            if final and final[0].get("winner_id"):
                result["champion_id"] = final[0]["winner_id"]
                result["runner_up_id"] = final[0]["player_a_id"] if final[0]["player_b_id"] == final[0]["winner_id"] else final[0]["player_b_id"]
            if third and third[0].get("winner_id"):
                result["third_place_id"] = third[0]["winner_id"]

            result["status"] = TournamentStatus.COMPLETED.value
            await self.tournament_repo.update_tournament(tid, result)

        elif fmt in [TournamentFormat.ROUND_ROBIN.value, TournamentFormat.RAPIDPIN.value]:
            standings = tournament.get("group_standings", {}).get("__rr__", [])
            if standings:
                result = {
                    "champion_id": standings[0]["player_id"] if len(standings) > 0 else None,
                    "runner_up_id": standings[1]["player_id"] if len(standings) > 1 else None,
                    "third_place_id": standings[2]["player_id"] if len(standings) > 2 else None,
                    "status": TournamentStatus.COMPLETED.value
                }
                await self.tournament_repo.update_tournament(tid, result)

    async def complete_tournament(self, tournament_id: str) -> Dict:
        """Manually complete/finalize a tournament"""
        await self._check_tournament_completion(tournament_id)
        tournament = await self.get_tournament(tournament_id)
        if tournament["status"] != TournamentStatus.COMPLETED.value:
            await self.tournament_repo.update_tournament(tournament_id, {
                "status": TournamentStatus.COMPLETED.value
            })
        return await self.get_tournament(tournament_id)

    # ============== MATCH LISTING ==============

    async def get_tournament_matches(self, tournament_id: str) -> List[Dict]:
        return await self.match_repo.get_by_tournament(tournament_id)

    async def get_match(self, match_id: str) -> Optional[Dict]:
        return await self.match_repo.get_by_id(match_id)

    # ============== HELPERS ==============

    def _round_name(self, round_num: int, total_rounds: int) -> str:
        if round_num == total_rounds:
            return "Final"
        if round_num == total_rounds - 1:
            return "Semi-finals"
        if round_num == total_rounds - 2:
            return "Quarter-finals"
        return f"Round {round_num}"


# Singleton
arena_service = ArenaService()
