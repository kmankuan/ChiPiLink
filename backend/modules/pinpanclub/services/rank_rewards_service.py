"""
Rank Rewards Service - System for recompensas por subida de rango
Módulo: pinpanclub
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone

from core.base import BaseService
from core.database import db
from ..models.social import NotificationCreate, NotificationType, ActivityFeedCreate, ActivityType


# Rank definitions with rewards
RANK_DEFINITIONS = [
    {
        "id": "bronze",
        "name": {"es": "Bronce", "en": "Bronze", "zh": "青铜"},
        "min_points": 0,
        "max_points": 99,
        "icon": "🥉",
        "reward": None  # No reward for initial rank
    },
    {
        "id": "silver",
        "name": {"es": "Plata", "en": "Silver", "zh": "白银"},
        "min_points": 100,
        "max_points": 299,
        "icon": "🥈",
        "reward": {
            "type": "points_bonus",
            "value": 50,
            "description": {
                "es": "Bono de 50 puntos por alcanzar Plata",
                "en": "50 points bonus for reaching Silver",
                "zh": "达到白银获得50积分奖励"
            }
        }
    },
    {
        "id": "gold",
        "name": {"es": "Oro", "en": "Gold", "zh": "黄金"},
        "min_points": 300,
        "max_points": 599,
        "icon": "🥇",
        "reward": {
            "type": "points_bonus",
            "value": 100,
            "description": {
                "es": "Bono de 100 puntos por alcanzar Oro",
                "en": "100 points bonus for reaching Gold",
                "zh": "达到黄金获得100积分奖励"
            }
        }
    },
    {
        "id": "platinum",
        "name": {"es": "Platino", "en": "Platinum", "zh": "铂金"},
        "min_points": 600,
        "max_points": 999,
        "icon": "💎",
        "reward": {
            "type": "prize",
            "prize_type": "exclusive_badge",
            "value": 200,
            "description": {
                "es": "Badge exclusivo 'Élite' + 200 puntos bonus",
                "en": "Exclusive 'Elite' badge + 200 bonus points",
                "zh": "独家'精英'徽章 + 200积分奖励"
            },
            "badge": {
                "name": {"es": "Élite del Club", "en": "Club Elite", "zh": "俱乐部精英"},
                "icon": "⚡",
                "rarity": "rare"
            }
        }
    },
    {
        "id": "diamond",
        "name": {"es": "Diamante", "en": "Diamond", "zh": "钻石"},
        "min_points": 1000,
        "max_points": 1999,
        "icon": "💠",
        "reward": {
            "type": "prize",
            "prize_type": "special_title",
            "value": 500,
            "description": {
                "es": "Título 'Leyenda' + 500 puntos bonus + Prioridad en torneos",
                "en": "'Legend' title + 500 bonus points + Tournament priority",
                "zh": "'传奇'称号 + 500积分奖励 + 锦标赛优先权"
            },
            "title": {"es": "Leyenda", "en": "Legend", "zh": "传奇"}
        }
    },
    {
        "id": "master",
        "name": {"es": "Maestro", "en": "Master", "zh": "大师"},
        "min_points": 2000,
        "max_points": 4999,
        "icon": "👑",
        "reward": {
            "type": "prize",
            "prize_type": "premium_package",
            "value": 1000,
            "description": {
                "es": "Paquete Premium: 1000 puntos + Badge 'Maestro' + Acceso VIP",
                "en": "Premium Package: 1000 points + 'Master' badge + VIP Access",
                "zh": "高级套餐：1000积分 + '大师'徽章 + VIP访问权"
            },
            "badge": {
                "name": {"es": "Maestro Supremo", "en": "Supreme Master", "zh": "至尊大师"},
                "icon": "👑",
                "rarity": "epic"
            },
            "perks": ["vip_access", "tournament_priority", "custom_profile"]
        }
    },
    {
        "id": "grandmaster",
        "name": {"es": "Gran Maestro", "en": "Grand Master", "zh": "宗师"},
        "min_points": 5000,
        "max_points": float('inf'),
        "icon": "🏆",
        "reward": {
            "type": "prize",
            "prize_type": "legendary_package",
            "value": 2500,
            "description": {
                "es": "Paquete Legendario: 2500 puntos + Badge Legendario + Todos los beneficios VIP + Reconocimiento en el Hall of Fame",
                "en": "Legendary Package: 2500 points + Legendary Badge + All VIP benefits + Hall of Fame recognition",
                "zh": "传奇套餐：2500积分 + 传奇徽章 + 所有VIP福利 + 名人堂认可"
            },
            "badge": {
                "name": {"es": "Gran Maestro Legendario", "en": "Legendary Grand Master", "zh": "传奇宗师"},
                "icon": "🏆",
                "rarity": "legendary"
            },
            "perks": ["vip_access", "tournament_priority", "custom_profile", "hall_of_fame", "mentorship_program"]
        }
    }
]


class RankRewardsService(BaseService):
    """Service for gestionar recompensas por subida de rango"""
    
    MODULE_NAME = "pinpanclub"
    
    def get_rank_by_points(self, points: int) -> Dict:
        """Get rango actual basado en puntos"""
        for i in range(len(RANK_DEFINITIONS) - 1, -1, -1):
            if points >= RANK_DEFINITIONS[i]["min_points"]:
                return {**RANK_DEFINITIONS[i], "index": i}
        return {**RANK_DEFINITIONS[0], "index": 0}
    
    def get_rank_by_id(self, rank_id: str) -> Optional[Dict]:
        """Get definición de rango by ID"""
        for i, rank in enumerate(RANK_DEFINITIONS):
            if rank["id"] == rank_id:
                return {**rank, "index": i}
        return None
    
    async def check_rank_promotion(
        self, 
        jugador_id: str, 
        old_points: int, 
        new_points: int,
        lang: str = "es"
    ) -> Optional[Dict]:
        """
        Verificar si the player subió de rango y otorgar recompensas.
        Retorna information de la promoción si hubo una.
        """
        old_rank = self.get_rank_by_points(old_points)
        new_rank = self.get_rank_by_points(new_points)
        
        # No hubo promoción
        if new_rank["index"] <= old_rank["index"]:
            return None
        
        # ¡Hubo promoción!
        self.log_info(f"Rank promotion: {jugador_id} from {old_rank['id']} to {new_rank['id']}")
        
        # Verify si ya recibió esta recompensa
        existing_reward = await db.pinpanclub_rank_rewards.find_one({
            "jugador_id": jugador_id,
            "rank_id": new_rank["id"]
        })
        
        if existing_reward:
            self.log_info(f"Reward already granted for rank {new_rank['id']}")
            return None
        
        # Otorgar recompensa
        reward_result = await self._grant_rank_reward(jugador_id, new_rank, lang)
        
        return reward_result
    
    async def _grant_rank_reward(
        self, 
        jugador_id: str, 
        rank: Dict,
        lang: str = "es"
    ) -> Dict:
        """Otorgar la recompensa del rango"""
        now = datetime.now(timezone.utc).isoformat()
        reward = rank.get("reward")
        
        # Get player info
        player = await db.pingpong_players.find_one(
            {"jugador_id": jugador_id},
            {"_id": 0, "nombre": 1, "apodo": 1}
        )
        player_name = player.get("apodo") or player.get("nombre", "Jugador") if player else "Jugador"
        
        # Get localized rank name
        rank_name = rank["name"].get(lang, rank["name"].get("es", rank["id"]))
        
        # Register the reward
        reward_record = {
            "jugador_id": jugador_id,
            "rank_id": rank["id"],
            "rank_name": rank_name,
            "rank_icon": rank["icon"],
            "reward_type": reward["type"] if reward else None,
            "reward_value": reward.get("value", 0) if reward else 0,
            "reward_details": reward,
            "granted_at": now,
            "lang": lang
        }
        
        await db.pinpanclub_rank_rewards.insert_one(reward_record)
        
        # Aplicar recompensas specifics
        bonus_points = 0
        badges_granted = []
        perks_granted = []
        
        if reward:
            # Points bonus
            bonus_points = reward.get("value", 0)
            if bonus_points > 0:
                await db.pinpanclub_challenges_leaderboard.update_one(
                    {"jugador_id": jugador_id},
                    {"$inc": {"total_points": bonus_points}},
                    upsert=True
                )
            
            # Badge especial
            if reward.get("badge"):
                badge_data = reward["badge"]
                badge_name = badge_data["name"].get(lang, badge_data["name"].get("es"))
                
                new_badge = {
                    "badge_id": f"rank_{rank['id']}_{jugador_id[:8]}",
                    "jugador_id": jugador_id,
                    "name": badge_name,
                    "icon": badge_data["icon"],
                    "rarity": badge_data.get("rarity", "rare"),
                    "category": "rank_reward",
                    "description": reward["description"].get(lang, ""),
                    "earned_at": now
                }
                
                await db.pinpanclub_superpin_badges.insert_one(new_badge)
                badges_granted.append(new_badge)
            
            # Perks/beneficios
            if reward.get("perks"):
                perks_granted = reward["perks"]
                await db.pinpanclub_player_perks.update_one(
                    {"jugador_id": jugador_id},
                    {
                        "$addToSet": {"perks": {"$each": perks_granted}},
                        "$set": {"updated_at": now}
                    },
                    upsert=True
                )
            
            # Título especial
            if reward.get("title"):
                title = reward["title"].get(lang, reward["title"].get("es"))
                await db.pingpong_players.update_one(
                    {"jugador_id": jugador_id},
                    {"$set": {"special_title": title, "title_rank": rank["id"]}}
                )
        
        # Create promotion notification
        notification_title = {
            "es": f"¡Subiste a {rank_name}!",
            "en": f"You reached {rank_name}!",
            "zh": f"您已达到{rank_name}！"
        }.get(lang, f"¡Subiste a {rank_name}!")
        
        reward_desc = reward["description"].get(lang, "") if reward else ""
        notification_message = {
            "es": f"¡Felicidades! Has alcanzado el rango {rank_name} {rank['icon']}. {reward_desc}",
            "en": f"Congratulations! You've reached {rank_name} rank {rank['icon']}. {reward_desc}",
            "zh": f"恭喜！您已达到{rank_name}级别 {rank['icon']}。{reward_desc}"
        }.get(lang)
        
        try:
            from .social_service import social_service
            
            await social_service.create_notification(NotificationCreate(
                user_id=jugador_id,
                type=NotificationType.BADGE_EARNED,
                title=notification_title,
                message=notification_message,
                data={
                    "type": "rank_promotion",
                    "rank_id": rank["id"],
                    "rank_name": rank_name,
                    "rank_icon": rank["icon"],
                    "bonus_points": bonus_points,
                    "badges": [b["name"] for b in badges_granted],
                    "perks": perks_granted
                },
                action_url="/pinpanclub/challenges"
            ))
            
            # Feed activity
            activity_desc = {
                "es": f"Ascendió al rango {rank_name}",
                "en": f"Promoted to {rank_name} rank",
                "zh": f"晋升到{rank_name}级别"
            }.get(lang)
            
            await social_service.create_activity(ActivityFeedCreate(
                jugador_id=jugador_id,
                activity_type=ActivityType.BADGE_EARNED,
                data={
                    "rank_id": rank["id"],
                    "rank_name": rank_name,
                    "rank_icon": rank["icon"]
                },
                description=activity_desc
            ))
        except Exception as e:
            self.log_error(f"Error creating rank promotion notification: {e}")
        
        self.log_info(f"Rank reward granted: {jugador_id} -> {rank['id']} (+{bonus_points} pts)")
        
        return {
            "promoted": True,
            "jugador_id": jugador_id,
            "old_rank": None,  # Will be filled by caller
            "new_rank": {
                "id": rank["id"],
                "name": rank_name,
                "icon": rank["icon"]
            },
            "reward": {
                "bonus_points": bonus_points,
                "badges": badges_granted,
                "perks": perks_granted,
                "description": reward_desc
            },
            "granted_at": now
        }
    
    async def get_player_rank_history(self, jugador_id: str) -> List[Dict]:
        """Get historial de rangos alcanzados por un jugador"""
        cursor = db.pinpanclub_rank_rewards.find(
            {"jugador_id": jugador_id},
            {"_id": 0}
        ).sort("granted_at", 1)
        
        return await cursor.to_list(length=20)
    
    async def get_rank_rewards_info(self, lang: str = "es") -> List[Dict]:
        """Get information de recompensas por rango (para mostrar en UI)"""
        result = []
        
        for rank in RANK_DEFINITIONS:
            rank_info = {
                "id": rank["id"],
                "name": rank["name"].get(lang, rank["name"].get("es")),
                "icon": rank["icon"],
                "min_points": rank["min_points"],
                "max_points": rank["max_points"] if rank["max_points"] != float('inf') else None,
                "reward": None
            }
            
            if rank.get("reward"):
                reward = rank["reward"]
                rank_info["reward"] = {
                    "type": reward["type"],
                    "value": reward.get("value", 0),
                    "description": reward["description"].get(lang, reward["description"].get("es")),
                    "badge": None,
                    "perks": reward.get("perks", [])
                }
                
                if reward.get("badge"):
                    rank_info["reward"]["badge"] = {
                        "name": reward["badge"]["name"].get(lang, reward["badge"]["name"].get("es")),
                        "icon": reward["badge"]["icon"],
                        "rarity": reward["badge"].get("rarity")
                    }
            
            result.append(rank_info)
        
        return result


# Singleton
rank_rewards_service = RankRewardsService()
