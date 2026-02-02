"""
Ranking Seasons Service - Management of temporadas de ranking
Module: pinpanclub
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta

from core.base import BaseService
from core.database import db
from ..models.seasons import (
    SeasonStatus, SeasonType,
    get_default_season_rewards, get_season_themes
)
from ..models.social import NotificationCreate, NotificationType, ActivityFeedCreate, ActivityType


class RankingSeasonsService(BaseService):
    """Service for gestionar temporadas de ranking"""
    
    MODULE_NAME = "pinpanclub"
    
    # ============== SEASON MANAGEMENT ==============
    
    async def create_season(
        self,
        name: Dict[str, str],
        description: Dict[str, str],
        start_date: datetime,
        end_date: datetime,
        season_type: SeasonType = SeasonType.MONTHLY,
        theme_id: str = None,
        custom_rewards: List[Dict] = None
    ) -> Dict:
        """Create una new season"""
        now = datetime.now(timezone.utc)
        
        # Determine season number
        last_season = await db.pinpanclub_ranking_seasons.find_one(
            {"season_type": season_type.value},
            sort=[("season_number", -1)]
        )
        season_number = (last_season.get("season_number", 0) if last_season else 0) + 1
        
        # Get tema
        themes = get_season_themes()
        theme = next((t for t in themes if t["id"] == theme_id), themes[0]) if theme_id else None
        
        # Determinar estado inicial
        status = SeasonStatus.UPCOMING
        if start_date <= now < end_date:
            status = SeasonStatus.ACTIVE
        elif now >= end_date:
            status = SeasonStatus.COMPLETED
        
        season = {
            "season_id": f"season_{season_type.value}_{season_number}",
            "name": name,
            "description": description,
            "season_type": season_type.value,
            "season_number": season_number,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": status.value,
            "min_challenges_to_qualify": 5,
            "min_points_to_qualify": 50,
            "reward_tiers": custom_rewards or get_default_season_rewards(),
            "theme": theme,
            "total_participants": 0,
            "total_challenges_completed": 0,
            "total_points_earned": 0,
            "created_at": now.isoformat()
        }
        
        await db.pinpanclub_ranking_seasons.insert_one(season)
        
        self.log_info(f"Created season: {season['season_id']}")
        
        season.pop("_id", None)
        return season
    
    async def get_current_season(self) -> Optional[Dict]:
        """Get the season activa actual"""
        season = await db.pinpanclub_ranking_seasons.find_one(
            {"status": SeasonStatus.ACTIVE.value},
            {"_id": 0}
        )
        return season
    
    async def get_season_by_id(self, season_id: str) -> Optional[Dict]:
        """Get una temporada by ID"""
        return await db.pinpanclub_ranking_seasons.find_one(
            {"season_id": season_id},
            {"_id": 0}
        )
    
    async def get_all_seasons(self, limit: int = 20) -> List[Dict]:
        """Get all seasons"""
        cursor = db.pinpanclub_ranking_seasons.find(
            {},
            {"_id": 0}
        ).sort("created_at", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    async def get_past_seasons(self, limit: int = 10) -> List[Dict]:
        """Get temporadas pasadas completadas"""
        cursor = db.pinpanclub_ranking_seasons.find(
            {"status": SeasonStatus.COMPLETED.value},
            {"_id": 0}
        ).sort("end_date", -1).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # ============== SEASON LIFECYCLE ==============
    
    async def activate_season(self, season_id: str) -> bool:
        """Activar una temporada (cambiar a ACTIVE)"""
        # Deactivate temporada actual if exists
        await db.pinpanclub_ranking_seasons.update_many(
            {"status": SeasonStatus.ACTIVE.value},
            {"$set": {"status": SeasonStatus.UPCOMING.value}}
        )
        
        # Activate the new season
        result = await db.pinpanclub_ranking_seasons.update_one(
            {"season_id": season_id},
            {"$set": {"status": SeasonStatus.ACTIVE.value}}
        )
        
        if result.modified_count > 0:
            self.log_info(f"Activated season: {season_id}")
            return True
        return False
    
    async def close_season(self, season_id: str, lang: str = "es") -> Dict:
        """
        Cerrar una temporada y otorgar recompensas.
        Retorna resumen del cierre.
        """
        now = datetime.now(timezone.utc)
        
        # Get temporada
        season = await self.get_season_by_id(season_id)
        if not season:
            raise ValueError(f"Season not found: {season_id}")
        
        if season["status"] == SeasonStatus.COMPLETED.value:
            raise ValueError("Season already completed")
        
        # Mark como cerrando
        await db.pinpanclub_ranking_seasons.update_one(
            {"season_id": season_id},
            {"$set": {"status": SeasonStatus.CLOSING.value}}
        )
        
        self.log_info(f"Closing season: {season_id}")
        
        # Get ranking final
        final_standings = await self.get_season_leaderboard(season_id, limit=100)
        
        # Filtrar participantes calificados
        qualified = [
            p for p in final_standings
            if p.get("challenges_completed", 0) >= season.get("min_challenges_to_qualify", 5)
            and p.get("season_points", 0) >= season.get("min_points_to_qualify", 50)
        ]
        
        # Otorgar recompensas
        rewards_granted = []
        reward_tiers = season.get("reward_tiers", get_default_season_rewards())
        
        for position, participant in enumerate(qualified, 1):
            # Encontrar tier correspondiente
            tier = None
            for t in reward_tiers:
                if t["position_start"] <= position <= t["position_end"]:
                    tier = t
                    break
            
            if tier:
                reward = await self._grant_season_reward(
                    season, participant, position, tier, lang
                )
                if reward:
                    rewards_granted.append(reward)
        
        # Calculatesr statistics finales
        total_participants = len(final_standings)
        total_challenges = sum(p.get("challenges_completed", 0) for p in final_standings)
        total_points = sum(p.get("season_points", 0) for p in final_standings)
        
        # Update season como completada
        await db.pinpanclub_ranking_seasons.update_one(
            {"season_id": season_id},
            {
                "$set": {
                    "status": SeasonStatus.COMPLETED.value,
                    "closed_at": now.isoformat(),
                    "final_standings": qualified[:50],  # Top 50 in history
                    "total_participants": total_participants,
                    "total_challenges_completed": total_challenges,
                    "total_points_earned": total_points
                }
            }
        )
        
        self.log_info(f"Season closed: {season_id}, {len(rewards_granted)} rewards granted")
        
        return {
            "season_id": season_id,
            "status": "completed",
            "total_participants": total_participants,
            "qualified_participants": len(qualified),
            "rewards_granted": len(rewards_granted),
            "total_challenges_completed": total_challenges,
            "total_points_earned": total_points,
            "top_3": qualified[:3] if qualified else []
        }
    
    async def _grant_season_reward(
        self,
        season: Dict,
        participant: Dict,
        position: int,
        tier: Dict,
        lang: str
    ) -> Optional[Dict]:
        """Otorgar recompensa de fin de temporada a un participante"""
        now = datetime.now(timezone.utc).isoformat()
        jugador_id = participant["jugador_id"]
        
        # Verify if already received season reward
        existing = await db.pinpanclub_season_rewards.find_one({
            "season_id": season["season_id"],
            "jugador_id": jugador_id
        })
        
        if existing:
            return None
        
        # Prepare recompensa
        badge_earned = None
        title_earned = None
        
        if tier.get("badge"):
            badge_name = tier["badge"]["name"].get(lang, tier["badge"]["name"].get("es"))
            badge_earned = {
                "name": badge_name,
                "icon": tier["badge"]["icon"],
                "rarity": tier["badge"].get("rarity", "rare"),
                "season_id": season["season_id"]
            }
            
            # Create badge in badges collection
            await db.pinpanclub_superpin_badges.insert_one({
                "badge_id": f"season_{season['season_id']}_{jugador_id[:8]}",
                "jugador_id": jugador_id,
                "name": badge_name,
                "icon": tier["badge"]["icon"],
                "rarity": tier["badge"].get("rarity"),
                "category": "season_reward",
                "season_id": season["season_id"],
                "position": position,
                "earned_at": now
            })
        
        if tier.get("title"):
            title_earned = tier["title"].get(lang, tier["title"].get("es"))
            await db.pingpong_players.update_one(
                {"jugador_id": jugador_id},
                {"$set": {"season_title": title_earned, "season_title_id": season["season_id"]}}
            )
        
        # Otorgar puntos bonus al leaderboard global
        if tier.get("bonus_points", 0) > 0:
            await db.pinpanclub_challenges_leaderboard.update_one(
                {"jugador_id": jugador_id},
                {"$inc": {"total_points": tier["bonus_points"]}},
                upsert=True
            )
        
        # Guardar perks
        if tier.get("perks"):
            await db.pinpanclub_player_perks.update_one(
                {"jugador_id": jugador_id},
                {
                    "$addToSet": {"perks": {"$each": tier["perks"]}},
                    "$set": {"updated_at": now}
                },
                upsert=True
            )
        
        # Create reward record
        reward = {
            "reward_id": f"sr_{season['season_id']}_{jugador_id[:8]}",
            "season_id": season["season_id"],
            "jugador_id": jugador_id,
            "final_position": position,
            "tier_name": tier["tier_name"],
            "bonus_points": tier.get("bonus_points", 0),
            "badge_earned": badge_earned,
            "title_earned": title_earned,
            "perks_earned": tier.get("perks", []),
            "season_info": {
                "name": season["name"].get(lang, season["name"].get("es")),
                "season_number": season.get("season_number")
            },
            "jugador_info": participant.get("jugador_info"),
            "granted_at": now,
            "is_notified": False
        }
        
        await db.pinpanclub_season_rewards.insert_one(reward)
        
        # Create notification
        try:
            from .social_service import social_service
            
            season_name = season["name"].get(lang, season["name"].get("es"))
            
            title_text = {
                "es": f"🏆 ¡Temporada {season_name} finalizada!",
                "en": f"🏆 Season {season_name} completed!",
                "zh": f"🏆 {season_name}赛季结束！"
            }.get(lang)
            
            message_text = {
                "es": f"¡Felicidades! Terminaste en position #{position}. Ganaste {tier.get('bonus_points', 0)} puntos bonus.",
                "en": f"Congratulations! You finished in position #{position}. You earned {tier.get('bonus_points', 0)} bonus points.",
                "zh": f"恭喜！您获得第{position}名。获得{tier.get('bonus_points', 0)}积分奖励。"
            }.get(lang)
            
            await social_service.create_notification(NotificationCreate(
                user_id=jugador_id,
                type=NotificationType.BADGE_EARNED,
                title=title_text,
                message=message_text,
                data={
                    "type": "season_reward",
                    "season_id": season["season_id"],
                    "position": position,
                    "tier": tier["tier_name"],
                    "bonus_points": tier.get("bonus_points", 0)
                },
                action_url="/pinpanclub/seasons"
            ))
        except Exception as e:
            self.log_error(f"Error sending season reward notification: {e}")
        
        reward.pop("_id", None)
        return reward
    
    # ============== SEASON LEADERBOARD ==============
    
    async def get_season_leaderboard(
        self,
        season_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Get leaderboard de una temporada"""
        cursor = db.pinpanclub_season_participants.find(
            {"season_id": season_id},
            {"_id": 0}
        ).sort("season_points", -1).skip(offset).limit(limit)
        
        participants = await cursor.to_list(length=limit)
        
        # Add position
        for i, p in enumerate(participants, offset + 1):
            p["position"] = i
        
        return participants
    
    async def get_player_season_stats(
        self,
        jugador_id: str,
        season_id: str = None
    ) -> Optional[Dict]:
        """Get player statistics en una temporada"""
        if not season_id:
            season = await self.get_current_season()
            if not season:
                return None
            season_id = season["season_id"]
        
        participant = await db.pinpanclub_season_participants.find_one(
            {"season_id": season_id, "jugador_id": jugador_id},
            {"_id": 0}
        )
        
        if not participant:
            return None
        
        # Get position actual
        higher_count = await db.pinpanclub_season_participants.count_documents({
            "season_id": season_id,
            "season_points": {"$gt": participant.get("season_points", 0)}
        })
        
        participant["current_position"] = higher_count + 1
        
        return participant
    
    async def update_player_season_stats(
        self,
        jugador_id: str,
        points_earned: int,
        challenge_completed: bool = True
    ):
        """
        Actualizar statistics of the player en the season actual.
        Llamar after de completar un reto.
        """
        season = await self.get_current_season()
        if not season:
            return
        
        now = datetime.now(timezone.utc).isoformat()
        
        # Get player info
        player = await db.pingpong_players.find_one(
            {"jugador_id": jugador_id},
            {"_id": 0, "nombre": 1, "apodo": 1}
        )
        
        # Update o crear participante
        update_ops = {
            "$inc": {
                "season_points": points_earned
            },
            "$set": {
                "last_activity": now,
                "jugador_info": {
                    "nombre": player.get("nombre") if player else None,
                    "apodo": player.get("apodo") if player else None
                }
            },
            "$setOnInsert": {
                "participant_id": f"sp_{season['season_id']}_{jugador_id[:8]}",
                "season_id": season["season_id"],
                "jugador_id": jugador_id,
                "joined_at": now
            }
        }
        
        if challenge_completed:
            update_ops["$inc"]["challenges_completed"] = 1
        
        await db.pinpanclub_season_participants.update_one(
            {"season_id": season["season_id"], "jugador_id": jugador_id},
            update_ops,
            upsert=True
        )
        
        # Update statistics of the season
        await db.pinpanclub_ranking_seasons.update_one(
            {"season_id": season["season_id"]},
            {
                "$inc": {
                    "total_points_earned": points_earned,
                    "total_challenges_completed": 1 if challenge_completed else 0
                }
            }
        )
    
    # ============== PLAYER REWARDS ==============
    
    async def get_player_season_rewards(self, jugador_id: str) -> List[Dict]:
        """Get all recompensas de temporada de un jugador"""
        cursor = db.pinpanclub_season_rewards.find(
            {"jugador_id": jugador_id},
            {"_id": 0}
        ).sort("granted_at", -1)
        
        return await cursor.to_list(length=50)
    
    # ============== AUTO-CREATION ==============
    
    async def create_next_monthly_season(self, lang: str = "es") -> Dict:
        """Create automaticmente la siguiente temporada mensual"""
        now = datetime.now(timezone.utc)
        
        # Calculate next month dates
        if now.day <= 15:
            # Create for this month if not started yet
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            # Create for next month
            start_date = (now.replace(day=1) + relativedelta(months=1)).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
        
        end_date = (start_date + relativedelta(months=1)) - timedelta(seconds=1)
        
        # Month names
        month_names = {
            "es": ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                   "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"],
            "en": ["January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December"],
            "zh": ["一月", "二月", "三月", "四月", "五月", "六月",
                   "七月", "八月", "九月", "十月", "十一月", "十二月"]
        }
        
        month_idx = start_date.month - 1
        year = start_date.year
        
        name = {
            "es": f"Temporada {month_names['es'][month_idx]} {year}",
            "en": f"{month_names['en'][month_idx]} {year} Season",
            "zh": f"{year}年{month_names['zh'][month_idx]}赛季"
        }
        
        description = {
            "es": f"Temporada mensual de {month_names['es'][month_idx]} {year}. ¡Compite por el primer lugar!",
            "en": f"{month_names['en'][month_idx]} {year} monthly season. Compete for first place!",
            "zh": f"{year}年{month_names['zh'][month_idx]}月度赛季。争夺第一名！"
        }
        
        # Select theme based on month
        theme_map = {
            1: "winter", 2: "winter", 3: "spring",
            4: "spring", 5: "spring", 6: "summer",
            7: "summer", 8: "summer", 9: "autumn",
            10: "autumn", 11: "autumn", 12: "winter"
        }
        
        return await self.create_season(
            name=name,
            description=description,
            start_date=start_date,
            end_date=end_date,
            season_type=SeasonType.MONTHLY,
            theme_id=theme_map.get(start_date.month, "spring")
        )
    
    async def ensure_active_season(self) -> Optional[Dict]:
        """Asegurar que existe una temporada activa, crear si does not exist"""
        current = await self.get_current_season()
        
        if current:
            return current
        
        # Verify si hay una temporada próxima que debería activarse
        now = datetime.now(timezone.utc)
        upcoming = await db.pinpanclub_ranking_seasons.find_one({
            "status": SeasonStatus.UPCOMING.value,
            "start_date": {"$lte": now.isoformat()}
        })
        
        if upcoming:
            await self.activate_season(upcoming["season_id"])
            return await self.get_season_by_id(upcoming["season_id"])
        
        # Create new season mensual
        self.log_info("No active season found, creating new monthly season")
        new_season = await self.create_next_monthly_season()
        
        if new_season:
            await self.activate_season(new_season["season_id"])
            return await self.get_season_by_id(new_season["season_id"])
        
        return None


# Singleton
seasons_service = RankingSeasonsService()
