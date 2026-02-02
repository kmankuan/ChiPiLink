"""
Achievements Service - Lógica de logros automáticos
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.database import db
from ..models.achievements import (
    Achievement, PlayerAchievement,
    get_challenge_achievements
)
from ..models.social import NotificationCreate, NotificationType, ActivityFeedCreate, ActivityType


class AchievementsService(BaseService):
    """Service for gestionar logros automáticos"""
    
    MODULE_NAME = "pinpanclub"
    
    async def initialize_achievements(self) -> int:
        """Inicializar logros en la base de datos si does not existn"""
        achievements = get_challenge_achievements()
        created = 0
        
        for achv_data in achievements:
            existing = await db.pinpanclub_achievements.find_one({
                "name": achv_data["name"],
                "requirement_type": achv_data["requirement_type"],
                "requirement_value": achv_data["requirement_value"]
            })
            
            if not existing:
                achv_data["created_at"] = datetime.now(timezone.utc).isoformat()
                achv_data["achievement_id"] = f"achv_{achv_data['type']}_{achv_data['requirement_value']}"
                achv_data["is_active"] = True  # Ensure is_active is set
                achv_data["is_secret"] = False
                await db.pinpanclub_achievements.insert_one(achv_data)
                created += 1
        
        return created
    
    async def get_all_achievements(self) -> List[Dict]:
        """Get all achievements activos"""
        cursor = db.pinpanclub_achievements.find(
            {},  # Get all achievements (not filtering by is_active since some may not have it)
            {"_id": 0}
        )
        results = await cursor.to_list(length=100)
        # Filter in Python to handle documents without is_active field
        return [a for a in results if a.get("is_active", True)]
    
    async def get_player_achievements(self, jugador_id: str) -> List[Dict]:
        """Get logros de un jugador"""
        cursor = db.pinpanclub_player_achievements.find(
            {"jugador_id": jugador_id},
            {"_id": 0}
        )
        return await cursor.to_list(length=100)
    
    async def check_and_award_achievements(self, jugador_id: str) -> List[Dict]:
        """
        Verificar y otorgar logros al jugador basándose en su progreso.
        Llamar después de completar un reto.
        """
        awarded = []
        
        # Obtener estadísticas of the player
        player_stats = await self._get_player_challenge_stats(jugador_id)
        
        # Obtener logros que el jugador aún does not have
        player_achievements = await self.get_player_achievements(jugador_id)
        earned_ids = {pa["achievement_id"] for pa in player_achievements}
        
        # Obtener all achievements activos
        all_achievements = await self.get_all_achievements()
        
        for achievement in all_achievements:
            if achievement["achievement_id"] in earned_ids:
                continue
            
            # Verificar si cumple el requisito
            if self._check_requirement(achievement, player_stats):
                # Otorgar logro
                new_achievement = await self._award_achievement(jugador_id, achievement)
                if new_achievement:
                    awarded.append(new_achievement)
        
        return awarded
    
    async def _get_player_challenge_stats(self, jugador_id: str) -> Dict:
        """Get estadísticas de retos of the player"""
        # Challenges completados total
        completed_total = await db.pinpanclub_challenges_progress.count_documents({
            "jugador_id": jugador_id,
            "status": "completed"
        })
        
        # Points totales
        leaderboard_entry = await db.pinpanclub_challenges_leaderboard.find_one(
            {"jugador_id": jugador_id},
            {"_id": 0}
        )
        total_points = leaderboard_entry.get("total_points", 0) if leaderboard_entry else 0
        
        # Racha de semanas
        current_streak = leaderboard_entry.get("current_streak", 0) if leaderboard_entry else 0
        
        # Challenges por dificultad
        pipeline = [
            {"$match": {"jugador_id": jugador_id, "status": "completed"}},
            {"$lookup": {
                "from": "pinpanclub_challenges_definitions",
                "localField": "challenge_id",
                "foreignField": "challenge_id",
                "as": "challenge"
            }},
            {"$unwind": {"path": "$challenge", "preserveNullAndEmptyArrays": True}},
            {"$group": {
                "_id": "$challenge.difficulty",
                "count": {"$sum": 1}
            }}
        ]
        
        cursor = db.pinpanclub_challenges_progress.aggregate(pipeline)
        difficulty_counts = await cursor.to_list(length=10)
        
        by_difficulty = {}
        for item in difficulty_counts:
            if item["_id"]:
                by_difficulty[item["_id"]] = item["count"]
        
        # Verificar semana completa
        week_complete = await self._check_weekly_complete(jugador_id)
        
        return {
            "challenges_completed": completed_total,
            "total_points": total_points,
            "streak_weeks": current_streak,
            "by_difficulty": by_difficulty,
            "weekly_complete": 1 if week_complete else 0
        }
    
    async def _check_weekly_complete(self, jugador_id: str) -> bool:
        """Verify si el jugador completó all challenges de la semana actual"""
        # Obtener semana actual
        week = await db.pinpanclub_challenges_weekly.find_one(
            {"is_active": True},
            {"_id": 0}
        )
        
        if not week or not week.get("challenges"):
            return False
        
        # Contar retos completados de esta semana
        completed = await db.pinpanclub_challenges_progress.count_documents({
            "jugador_id": jugador_id,
            "challenge_id": {"$in": week["challenges"]},
            "status": "completed"
        })
        
        return completed >= len(week["challenges"])
    
    def _check_requirement(self, achievement: Dict, stats: Dict) -> bool:
        """Verify si el jugador cumple el requisito del logro"""
        req_type = achievement.get("requirement_type")
        req_value = achievement.get("requirement_value", 0)
        req_difficulty = achievement.get("requirement_difficulty")
        
        if req_type == "challenges_completed":
            return stats.get("challenges_completed", 0) >= req_value
        
        elif req_type == "points_reached":
            return stats.get("total_points", 0) >= req_value
        
        elif req_type == "streak_weeks":
            return stats.get("streak_weeks", 0) >= req_value
        
        elif req_type == "weekly_complete":
            return stats.get("weekly_complete", 0) >= req_value
        
        elif req_type == "difficulty_challenges":
            if req_difficulty:
                return stats.get("by_difficulty", {}).get(req_difficulty, 0) >= req_value
        
        return False
    
    async def _award_achievement(self, jugador_id: str, achievement: Dict) -> Optional[Dict]:
        """Otorgar un logro al jugador"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Obtener info of the player
        player = await db.pingpong_players.find_one(
            {"jugador_id": jugador_id},
            {"_id": 0, "nombre": 1, "apodo": 1}
        )
        
        player_achievement = {
            "player_achievement_id": f"pa_{jugador_id[:6]}_{achievement['achievement_id']}",
            "jugador_id": jugador_id,
            "achievement_id": achievement["achievement_id"],
            "achievement_info": {
                "name": achievement["name"],
                "description": achievement["description"],
                "icon": achievement["icon"],
                "rarity": achievement["rarity"],
                "points_reward": achievement.get("points_reward", 0)
            },
            "jugador_info": {
                "nombre": player.get("nombre") if player else None,
                "apodo": player.get("apodo") if player else None
            },
            "earned_at": now,
            "level": 1,
            "is_notified": False
        }
        
        await db.pinpanclub_player_achievements.insert_one(player_achievement)
        
        # Update puntos en el leaderboard si hay recompensa
        if achievement.get("points_reward", 0) > 0:
            await db.pinpanclub_challenges_leaderboard.update_one(
                {"jugador_id": jugador_id},
                {"$inc": {"total_points": achievement["points_reward"]}},
                upsert=True
            )
        
        # Crear notificación
        try:
            from .social_service import social_service
            await social_service.create_notification(NotificationCreate(
                user_id=jugador_id,
                type=NotificationType.BADGE_EARNED,
                title="¡Nuevo Logro!",
                message=f"Has obtenido '{achievement['name']}' {achievement['icon']}",
                data={
                    "achievement_id": achievement["achievement_id"],
                    "points": achievement.get("points_reward", 0)
                },
                action_url="/pinpanclub/challenges"
            ))
            
            # Crear actividad en feed
            await social_service.create_activity(ActivityFeedCreate(
                jugador_id=jugador_id,
                activity_type=ActivityType.BADGE_EARNED,
                data={
                    "achievement_name": achievement["name"],
                    "achievement_icon": achievement["icon"],
                    "rarity": achievement["rarity"]
                },
                description=f"Obtuvo el logro '{achievement['name']}'"
            ))
        except Exception as e:
            self.log_error(f"Error creating notification for achievement: {e}")
        
        self.log_info(f"Achievement awarded: {jugador_id} - {achievement['name']}")
        
        # Returnsr sin _id
        player_achievement.pop("_id", None)
        return player_achievement


# Singleton
achievements_service = AchievementsService()
