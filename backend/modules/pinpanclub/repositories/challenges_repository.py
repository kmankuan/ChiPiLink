"""
Weekly Challenges - Repository Layer
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from core.database import db
from core.base import BaseRepository


class ChallengeDefinitionRepository(BaseRepository):
    """Repository for definiciones de retos"""
    
    COLLECTION_NAME = "pinpanclub_challenge_definitions"
    ID_FIELD = "challenge_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["challenge_id"] = f"challenge_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_by_id(self, challenge_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: challenge_id})
    
    async def update(self, challenge_id: str, data: Dict) -> bool:
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, challenge_id, data)
    
    async def get_active_challenges(self) -> List[Dict]:
        return await self.find_many(
            query={"is_active": True},
            sort=[("created_at", -1)]
        )
    
    async def get_automatic_challenges(self) -> List[Dict]:
        return await self.find_many(
            query={"is_active": True, "is_automatic": True},
            sort=[("difficulty", 1)]
        )
    
    async def get_by_difficulty(self, difficulty: str) -> List[Dict]:
        return await self.find_many(
            query={"is_active": True, "difficulty": difficulty}
        )


class PlayerChallengeRepository(BaseRepository):
    """Repository for progreso de jugadores en retos"""
    
    COLLECTION_NAME = "pinpanclub_player_challenges"
    ID_FIELD = "progress_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["progress_id"] = f"progress_{uuid.uuid4().hex[:8]}"
        data["started_at"] = datetime.now(timezone.utc).isoformat()
        data["current_value"] = 0
        data["progress_percent"] = 0.0
        data["status"] = "in_progress"
        return await self.insert_one(data)
    
    async def get_by_id(self, progress_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: progress_id})
    
    async def find_player_challenge(
        self, 
        jugador_id: str, 
        challenge_id: str
    ) -> Optional[Dict]:
        return await self.find_one({
            "jugador_id": jugador_id,
            "challenge_id": challenge_id,
            "status": {"$in": ["in_progress", "available"]}
        })
    
    async def update_progress(
        self, 
        progress_id: str, 
        current_value: int,
        target_value: int,
        status: str = None
    ) -> bool:
        progress_percent = min((current_value / target_value) * 100, 100) if target_value > 0 else 0
        
        update_data = {
            "current_value": current_value,
            "progress_percent": progress_percent
        }
        
        if status:
            update_data["status"] = status
            if status == "completed":
                update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        return await self.update_by_id(self.ID_FIELD, progress_id, update_data)
    
    async def get_player_challenges(
        self, 
        jugador_id: str,
        status: str = None,
        limit: int = 20
    ) -> List[Dict]:
        query = {"jugador_id": jugador_id}
        if status:
            query["status"] = status
        return await self.find_many(
            query=query,
            sort=[("started_at", -1)],
            limit=limit
        )
    
    async def get_active_challenges(self, jugador_id: str) -> List[Dict]:
        """Get retos activos of the player"""
        return await self.find_many(
            query={
                "jugador_id": jugador_id,
                "status": "in_progress"
            },
            sort=[("expires_at", 1)]
        )
    
    async def get_completed_count(self, jugador_id: str) -> int:
        return await self._collection.count_documents({
            "jugador_id": jugador_id,
            "status": "completed"
        })
    
    async def get_total_points(self, jugador_id: str) -> int:
        """Get total de puntos ganados por retos"""
        pipeline = [
            {"$match": {"jugador_id": jugador_id, "status": "completed"}},
            {"$lookup": {
                "from": "pinpanclub_challenge_definitions",
                "localField": "challenge_id",
                "foreignField": "challenge_id",
                "as": "challenge"
            }},
            {"$unwind": "$challenge"},
            {"$group": {
                "_id": None,
                "total": {"$sum": "$challenge.points_reward"}
            }}
        ]
        cursor = self._collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        return results[0]["total"] if results else 0


class WeeklyChallengeSetRepository(BaseRepository):
    """Repository for conjuntos semanales de retos"""
    
    COLLECTION_NAME = "pinpanclub_weekly_challenges"
    ID_FIELD = "week_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        data["week_id"] = f"week_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["total_participants"] = 0
        data["total_completions"] = 0
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_by_id(self, week_id: str) -> Optional[Dict]:
        return await self.find_one({self.ID_FIELD: week_id})
    
    async def get_current_week(self) -> Optional[Dict]:
        """Get la semana activa actual"""
        now = datetime.now(timezone.utc).isoformat()
        return await self.find_one({
            "is_active": True,
            "start_date": {"$lte": now},
            "end_date": {"$gte": now}
        })
    
    async def get_by_week_year(self, week_number: int, year: int) -> Optional[Dict]:
        return await self.find_one({
            "week_number": week_number,
            "year": year
        })
    
    async def increment_stats(
        self, 
        week_id: str, 
        participants: int = 0, 
        completions: int = 0
    ) -> bool:
        update = {}
        if participants:
            update["total_participants"] = participants
        if completions:
            update["total_completions"] = completions
        
        if not update:
            return True
        
        result = await self._collection.update_one(
            {self.ID_FIELD: week_id},
            {"$inc": update}
        )
        return result.modified_count > 0
    
    async def get_recent_weeks(self, limit: int = 10) -> List[Dict]:
        return await self.find_many(
            query={},
            sort=[("year", -1), ("week_number", -1)],
            limit=limit
        )


class ChallengeLeaderboardRepository(BaseRepository):
    """Repository for leaderboard de retos"""
    
    COLLECTION_NAME = "pinpanclub_challenge_leaderboard"
    ID_FIELD = "entry_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def get_or_create(self, jugador_id: str, jugador_info: Dict = None) -> Dict:
        existing = await self.find_one({"jugador_id": jugador_id})
        if existing:
            return existing
        
        data = {
            "entry_id": f"lb_{uuid.uuid4().hex[:8]}",
            "jugador_id": jugador_id,
            "jugador_info": jugador_info,
            "challenges_completed": 0,
            "total_points": 0,
            "current_streak": 0,
            "rank": 0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        return await self.insert_one(data)
    
    async def update_stats(
        self, 
        jugador_id: str,
        challenges_completed: int = 0,
        points: int = 0
    ) -> bool:
        result = await self._collection.update_one(
            {"jugador_id": jugador_id},
            {
                "$inc": {
                    "challenges_completed": challenges_completed,
                    "total_points": points
                },
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0
    
    async def get_leaderboard(self, limit: int = 50) -> List[Dict]:
        return await self.find_many(
            query={},
            sort=[("total_points", -1), ("challenges_completed", -1)],
            limit=limit
        )
    
    async def recalculate_ranks(self) -> bool:
        """Recalculate positions del leaderboard"""
        leaderboard = await self.get_leaderboard(limit=1000)
        
        for idx, entry in enumerate(leaderboard, start=1):
            await self._collection.update_one(
                {self.ID_FIELD: entry["entry_id"]},
                {"$set": {"rank": idx}}
            )
        
        return True
