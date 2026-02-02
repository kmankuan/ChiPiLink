"""
Weekly Challenges - Service Layer
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import random

from core.base import BaseService
from ..repositories.challenges_repository import (
    ChallengeDefinitionRepository,
    PlayerChallengeRepository,
    WeeklyChallengeSetRepository,
    ChallengeLeaderboardRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.challenges import (
    ChallengeDefinition, ChallengeDefinitionCreate,
    PlayerChallenge, PlayerChallengeUpdate,
    WeeklyChallengeSet,
    ChallengeLeaderboard, ChallengeLeaderboardEntry,
    ChallengeStatus, ChallengeDifficulty,
    get_auto_challenges, select_weekly_challenges
)
from .social_service import social_service
from ..models.social import NotificationCreate, NotificationType, ActivityFeedCreate, ActivityType


class ChallengeService(BaseService):
    """Service for Weekly Challenges"""
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.definition_repo = ChallengeDefinitionRepository()
        self.player_challenge_repo = PlayerChallengeRepository()
        self.weekly_repo = WeeklyChallengeSetRepository()
        self.leaderboard_repo = ChallengeLeaderboardRepository()
        self.player_repo = PlayerRepository()
    
    # ============== CHALLENGE DEFINITIONS ==============
    
    async def create_challenge(self, data: ChallengeDefinitionCreate) -> ChallengeDefinition:
        """Create definition de reto (por admin)"""
        challenge_data = data.model_dump()
        challenge_data["is_automatic"] = False
        result = await self.definition_repo.create(challenge_data)
        return ChallengeDefinition(**result)
    
    async def get_challenge(self, challenge_id: str) -> Optional[ChallengeDefinition]:
        """Get definition de reto"""
        result = await self.definition_repo.get_by_id(challenge_id)
        return ChallengeDefinition(**result) if result else None
    
    async def get_all_challenges(self) -> List[ChallengeDefinition]:
        """Get all challenges activos"""
        results = await self.definition_repo.get_active_challenges()
        return [ChallengeDefinition(**r) for r in results]
    
    async def update_challenge(
        self, 
        challenge_id: str, 
        data: Dict
    ) -> Optional[ChallengeDefinition]:
        """Update definition de reto"""
        success = await self.definition_repo.update(challenge_id, data)
        if success:
            result = await self.definition_repo.get_by_id(challenge_id)
            return ChallengeDefinition(**result) if result else None
        return None
    
    async def deactivate_challenge(self, challenge_id: str) -> bool:
        """Desactivar reto"""
        return await self.definition_repo.update(challenge_id, {"is_active": False})
    
    # ============== WEEKLY CHALLENGE SETS ==============
    
    async def get_current_week(self) -> Optional[WeeklyChallengeSet]:
        """Get conjunto de retos de la semana actual"""
        result = await self.weekly_repo.get_current_week()
        return WeeklyChallengeSet(**result) if result else None
    
    async def create_weekly_set(
        self, 
        challenge_ids: List[str] = None,
        auto_generate: bool = True
    ) -> WeeklyChallengeSet:
        """Create conjunto de retos para la semana"""
        now = datetime.now(timezone.utc)
        week_number = now.isocalendar()[1]
        year = now.year
        
        # Verify si already exists
        existing = await self.weekly_repo.get_by_week_year(week_number, year)
        if existing:
            return WeeklyChallengeSet(**existing)
        
        # Calculatesr fechas
        start_of_week = now - timedelta(days=now.weekday())
        start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_week = start_of_week + timedelta(days=6, hours=23, minutes=59, seconds=59)
        
        # Generate o usar retos proporcionados
        if auto_generate and not challenge_ids:
            # Create retos automatics
            auto_challenges = select_weekly_challenges()
            challenge_ids = []
            
            for challenge_data in auto_challenges:
                challenge_data["is_automatic"] = True
                challenge_data["valid_from"] = start_of_week.isoformat()
                challenge_data["valid_until"] = end_of_week.isoformat()
                created = await self.definition_repo.create(challenge_data)
                challenge_ids.append(created["challenge_id"])
        
        week_data = {
            "week_number": week_number,
            "year": year,
            "challenges": challenge_ids or [],
            "start_date": start_of_week.isoformat(),
            "end_date": end_of_week.isoformat()
        }
        
        result = await self.weekly_repo.create(week_data)
        self.log_info(f"Weekly challenge set created: week {week_number}/{year}")
        
        return WeeklyChallengeSet(**result)
    
    async def get_weekly_challenges(self) -> List[ChallengeDefinition]:
        """Get retos de la semana actual"""
        week = await self.get_current_week()
        if not week:
            # Create semana automaticmente
            week = await self.create_weekly_set(auto_generate=True)
        
        challenges = []
        for challenge_id in week.challenges:
            challenge = await self.definition_repo.get_by_id(challenge_id)
            if challenge:
                challenges.append(ChallengeDefinition(**challenge))
        
        return challenges
    
    # ============== PLAYER CHALLENGES ==============
    
    async def start_challenge(
        self, 
        jugador_id: str, 
        challenge_id: str
    ) -> PlayerChallenge:
        """Iniciar un reto para un jugador"""
        # Verify si ya tiene the challenge activo
        existing = await self.player_challenge_repo.find_player_challenge(jugador_id, challenge_id)
        if existing:
            return PlayerChallenge(**existing)
        
        challenge = await self.definition_repo.get_by_id(challenge_id)
        if not challenge:
            raise ValueError("Challenge not found")
        
        player = await self.player_repo.get_by_id(jugador_id)
        
        # Calculate expiration date
        expires_at = datetime.now(timezone.utc) + timedelta(days=challenge.get("duration_days", 7))
        
        progress_data = {
            "challenge_id": challenge_id,
            "jugador_id": jugador_id,
            "challenge_info": {
                "name": challenge.get("name"),
                "description": challenge.get("description"),
                "icon": challenge.get("icon"),
                "target_value": challenge.get("target_value"),
                "points_reward": challenge.get("points_reward")
            },
            "jugador_info": {
                "nombre": player.get("nombre"),
                "apodo": player.get("apodo")
            } if player else None,
            "target_value": challenge.get("target_value", 0),
            "expires_at": expires_at.isoformat()
        }
        
        result = await self.player_challenge_repo.create(progress_data)
        
        # Update weekly stats
        week = await self.get_current_week()
        if week and challenge_id in week.challenges:
            await self.weekly_repo.increment_stats(week.week_id, participants=1)
        
        return PlayerChallenge(**result)
    
    async def update_challenge_progress(
        self,
        jugador_id: str,
        challenge_type: str,
        increment: int = 1,
        extra_data: Dict = None
    ) -> List[PlayerChallenge]:
        """
        Actualizar progreso de retos of the player based on en tipo.
        Llamar esto after de cada partido, victoria, etc.
        """
        updated = []
        
        # Get retos activos of the player
        active = await self.player_challenge_repo.get_active_challenges(jugador_id)
        
        for progress in active:
            challenge = await self.definition_repo.get_by_id(progress["challenge_id"])
            if not challenge:
                continue
            
            # Verify if challenge type matches
            if challenge.get("type") != challenge_type:
                continue
            
            # Update progreso
            new_value = progress["current_value"] + increment
            target = progress["target_value"]
            
            status = None
            if new_value >= target:
                status = "completed"
                # Procesar completion
                await self._on_challenge_completed(jugador_id, progress, challenge)
            
            await self.player_challenge_repo.update_progress(
                progress["progress_id"],
                new_value,
                target,
                status
            )
            
            updated_progress = await self.player_challenge_repo.get_by_id(progress["progress_id"])
            if updated_progress:
                updated.append(PlayerChallenge(**updated_progress))
        
        return updated
    
    async def _on_challenge_completed(
        self, 
        jugador_id: str, 
        progress: Dict, 
        challenge: Dict
    ):
        """Process completion de reto"""
        # Update leaderboard
        player = await self.player_repo.get_by_id(jugador_id)
        lb_entry = await self.leaderboard_repo.get_or_create(
            jugador_id,
            {"nombre": player.get("nombre"), "apodo": player.get("apodo")} if player else None
        )
        
        await self.leaderboard_repo.update_stats(
            jugador_id,
            challenges_completed=1,
            points=challenge.get("points_reward", 0)
        )
        
        # Update weekly stats
        week = await self.get_current_week()
        if week and challenge["challenge_id"] in week.challenges:
            await self.weekly_repo.increment_stats(week.week_id, completions=1)
        
        # Create notification
        await social_service.create_notification(NotificationCreate(
            user_id=jugador_id,
            type=NotificationType.CHALLENGE_COMPLETED,
            title="¡Reto Completado!",
            message=f"Completaste '{challenge.get('name')}' y ganaste {challenge.get('points_reward', 0)} puntos",
            data={
                "challenge_id": challenge["challenge_id"],
                "points": challenge.get("points_reward", 0)
            },
            action_url="/pinpanclub/challenges"
        ))
        
        # Create feed activity
        await social_service.create_activity(ActivityFeedCreate(
            jugador_id=jugador_id,
            activity_type=ActivityType.CHALLENGE_COMPLETED,
            data={
                "challenge_name": challenge.get("name"),
                "challenge_icon": challenge.get("icon"),
                "points": challenge.get("points_reward", 0)
            },
            description=f"Completed the challenge '{challenge.get('name')}'"
        ))
        
        self.log_info(f"Challenge completed: {jugador_id} - {challenge.get('name')}")
        
        # Check and award automatic achievements
        try:
            from .achievements_service import achievements_service
            awarded = await achievements_service.check_and_award_achievements(jugador_id)
            if awarded:
                self.log_info(f"Awarded {len(awarded)} achievements to {jugador_id}")
        except Exception as e:
            self.log_error(f"Error checking achievements: {e}")
        
        # Check for rank promotion and grant rewards
        try:
            from .rank_rewards_service import rank_rewards_service
            
            # Get updated points
            updated_entry = await db.pinpanclub_challenges_leaderboard.find_one(
                {"jugador_id": jugador_id},
                {"_id": 0, "total_points": 1}
            )
            new_total_points = updated_entry.get("total_points", 0) if updated_entry else 0
            
            # Calculateste old points (before this challenge)
            old_points = new_total_points - challenge.get("points_reward", 0)
            
            # Check promotion
            promotion = await rank_rewards_service.check_rank_promotion(
                jugador_id, old_points, new_total_points, "es"
            )
            
            if promotion:
                self.log_info(f"Rank promotion: {jugador_id} -> {promotion['new_rank']['id']}")
        except Exception as e:
            self.log_error(f"Error checking rank promotion: {e}")
        
        # Update season statistics
        try:
            from .seasons_service import seasons_service
            await seasons_service.update_player_season_stats(
                jugador_id=jugador_id,
                points_earned=challenge.get("points_reward", 0),
                challenge_completed=True
            )
        except Exception as e:
            self.log_error(f"Error updating season stats: {e}")
    
    async def get_player_challenges(
        self,
        jugador_id: str,
        status: str = None
    ) -> List[PlayerChallenge]:
        """Get retos de un jugador"""
        results = await self.player_challenge_repo.get_player_challenges(jugador_id, status)
        return [PlayerChallenge(**r) for r in results]
    
    async def get_player_stats(self, jugador_id: str) -> Dict:
        """Get statistics de retos of the player"""
        completed = await self.player_challenge_repo.get_completed_count(jugador_id)
        total_points = await self.player_challenge_repo.get_total_points(jugador_id)
        active = await self.player_challenge_repo.get_active_challenges(jugador_id)
        
        return {
            "challenges_completed": completed,
            "total_points": total_points,
            "active_challenges": len(active)
        }
    
    # ============== LEADERBOARD ==============
    
    async def get_leaderboard(self, limit: int = 50) -> ChallengeLeaderboard:
        """Get leaderboard de retos"""
        await self.leaderboard_repo.recalculate_ranks()
        entries = await self.leaderboard_repo.get_leaderboard(limit)
        
        return ChallengeLeaderboard(
            period="all_time",
            entries=[ChallengeLeaderboardEntry(**e) for e in entries],
            total_participants=len(entries)
        )
    
    async def get_player_rank(self, jugador_id: str) -> Optional[int]:
        """Get position de un jugador en el leaderboard"""
        entry = await self.leaderboard_repo.find_one({"jugador_id": jugador_id})
        return entry.get("rank") if entry else None


# Singleton instance
challenge_service = ChallengeService()
