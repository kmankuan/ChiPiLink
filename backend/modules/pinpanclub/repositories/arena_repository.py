"""
PinPan Arena - Repository Layer
Data access for the unified tournament system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections


class ArenaTournamentRepository(BaseRepository):
    """Repository for PinPan Arena tournaments."""

    COLLECTION_NAME = PinpanClubCollections.ARENA_TOURNAMENTS
    ID_FIELD = "tournament_id"

    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)

    async def create(self, data: Dict) -> Dict:
        data["tournament_id"] = f"arena_{uuid.uuid4().hex[:12]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = data["created_at"]
        data.setdefault("participants", [])
        data.setdefault("total_participants", 0)
        data.setdefault("brackets", [])
        data.setdefault("groups", {})
        data.setdefault("group_standings", {})
        return await self.insert_one(data)

    async def get_by_id(self, tournament_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: tournament_id})

    async def get_all(self, status: str = None, limit: int = 50) -> List[Dict]:
        query = {}
        if status:
            query["status"] = status
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("created_at", -1)]
        )

    async def get_active(self) -> List[Dict]:
        return await self.find_many(
            query={"status": {"$in": ["registration_open", "in_progress"]}},
            sort=[("created_at", -1)]
        )

    async def update_tournament(self, tournament_id: str, data: Dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, tournament_id, data)

    async def delete_tournament(self, tournament_id: str) -> bool:
        return await self.delete_by_id(self.ID_FIELD, tournament_id)

    async def add_participant(self, tournament_id: str, participant: Dict) -> bool:
        result = await self.collection.update_one(
            {self.ID_FIELD: tournament_id},
            {
                "$push": {"participants": participant},
                "$inc": {"total_participants": 1},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0

    async def remove_participant(self, tournament_id: str, player_id: str) -> bool:
        result = await self.collection.update_one(
            {self.ID_FIELD: tournament_id},
            {
                "$pull": {"participants": {"player_id": player_id}},
                "$inc": {"total_participants": -1},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0


class ArenaMatchRepository(BaseRepository):
    """Repository for PinPan Arena matches."""

    COLLECTION_NAME = PinpanClubCollections.ARENA_MATCHES
    ID_FIELD = "match_id"

    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)

    async def create(self, data: Dict) -> Dict:
        data["match_id"] = f"am_{uuid.uuid4().hex[:12]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data.setdefault("status", "pending")
        data.setdefault("score_a", 0)
        data.setdefault("score_b", 0)
        data.setdefault("sets", [])
        return await self.insert_one(data)

    async def get_by_id(self, match_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: match_id})

    async def get_by_tournament(self, tournament_id: str) -> List[Dict]:
        return await self.find_many(
            query={"tournament_id": tournament_id},
            sort=[("round_num", 1), ("position", 1)],
            limit=500
        )

    async def get_by_tournament_round(self, tournament_id: str, round_num: int) -> List[Dict]:
        return await self.find_many(
            query={"tournament_id": tournament_id, "round_num": round_num},
            sort=[("position", 1)],
            limit=100
        )

    async def get_by_tournament_group(self, tournament_id: str, group: str) -> List[Dict]:
        return await self.find_many(
            query={"tournament_id": tournament_id, "group": group},
            sort=[("round_num", 1), ("position", 1)],
            limit=100
        )

    async def update_match(self, match_id: str, data: Dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, match_id, data)

    async def delete_by_tournament(self, tournament_id: str) -> int:
        result = await self.collection.delete_many({"tournament_id": tournament_id})
        return result.deleted_count

    async def get_player_matches(self, tournament_id: str, player_id: str) -> List[Dict]:
        return await self.find_many(
            query={
                "tournament_id": tournament_id,
                "$or": [
                    {"player_a_id": player_id},
                    {"player_b_id": player_id}
                ]
            },
            sort=[("round_num", 1)],
            limit=100
        )
