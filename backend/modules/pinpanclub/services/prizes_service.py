"""
Prizes - Service Layer
System for premios avanzado
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from ..repositories.prizes_repository import (
    PrizeDefinitionRepository,
    AwardedPrizeRepository,
    PrizeCatalogRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.prizes import (
    PrizeDefinition, PrizeDefinitionCreate,
    AwardedPrize,
    PrizeCatalog,
    PrizeType, PrizeStatus, PrizeConditionType,
    get_default_prize_catalog
)
from .social_service import social_service
from ..models.social import NotificationCreate, NotificationType, ActivityFeedCreate, ActivityType


class PrizeService(BaseService):
    """Service for system for premios avanzado"""
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.definition_repo = PrizeDefinitionRepository()
        self.awarded_repo = AwardedPrizeRepository()
        self.catalog_repo = PrizeCatalogRepository()
        self.player_repo = PlayerRepository()
    
    # ============== PRIZE DEFINITIONS ==============
    
    async def create_prize(self, data: PrizeDefinitionCreate) -> PrizeDefinition:
        """Create definición de premio"""
        # Convertir conditions a lista de dicts
        prize_data = data.model_dump()
        result = await self.definition_repo.create(prize_data)
        return PrizeDefinition(**result)
    
    async def get_prize(self, prize_id: str) -> Optional[PrizeDefinition]:
        """Get definición de premio"""
        result = await self.definition_repo.get_by_id(prize_id)
        return PrizeDefinition(**result) if result else None
    
    async def get_all_prizes(self) -> List[PrizeDefinition]:
        """Get all prizes"""
        results = await self.definition_repo.get_all_prizes()
        return [PrizeDefinition(**r) for r in results]
    
    async def update_prize(self, prize_id: str, data: Dict) -> Optional[PrizeDefinition]:
        """Update premio"""
        success = await self.definition_repo.update(prize_id, data)
        if success:
            result = await self.definition_repo.get_by_id(prize_id)
            return PrizeDefinition(**result) if result else None
        return None
    
    async def get_prizes_by_type(self, prize_type: PrizeType) -> List[PrizeDefinition]:
        """Get premios by type"""
        results = await self.definition_repo.get_prizes_by_type(prize_type.value)
        return [PrizeDefinition(**r) for r in results]
    
    # ============== PRIZE CATALOG ==============
    
    async def get_or_create_default_catalog(self) -> PrizeCatalog:
        """Get o crear catálogo por defecto"""
        existing = await self.catalog_repo.get_active_catalog()
        if existing:
            return PrizeCatalog(**existing)
        
        # Crear premios por defecto
        default_prizes = get_default_prize_catalog()
        prize_defs = []
        
        for prize_data in default_prizes:
            created = await self.definition_repo.create(prize_data)
            prize_defs.append(PrizeDefinition(**created))
        
        # Crear catálogo
        catalog_data = {
            "name": "Catálogo Principal",
            "description": "Premios estándar para temporadas",
            "prizes": [p.model_dump() for p in prize_defs]
        }
        result = await self.catalog_repo.create(catalog_data)
        
        return PrizeCatalog(**result)
    
    async def get_season_catalog(self, season_id: str) -> Optional[PrizeCatalog]:
        """Get catálogo de una temporada"""
        result = await self.catalog_repo.get_season_catalog(season_id)
        return PrizeCatalog(**result) if result else None
    
    # ============== AWARD PRIZES ==============
    
    async def award_prize(
        self,
        prize_id: str,
        jugador_id: str,
        awarded_for: str,
        position: int = None,
        season_id: str = None,
        challenge_id: str = None
    ) -> AwardedPrize:
        """Otorgar premio a un jugador"""
        prize = await self.definition_repo.get_by_id(prize_id)
        if not prize:
            raise ValueError("Premio not found")
        
        player = await self.player_repo.get_by_id(jugador_id)
        
        # Verificar límite de ganadores
        if prize.get("max_winners"):
            current_winners = await self.awarded_repo.count_prize_winners(prize_id)
            if current_winners >= prize["max_winners"]:
                raise ValueError("Este premio ha alcanzado el límite de ganadores")
        
        award_data = {
            "prize_id": prize_id,
            "jugador_id": jugador_id,
            "season_id": season_id,
            "challenge_id": challenge_id,
            "prize_info": {
                "name": prize.get("name"),
                "description": prize.get("description"),
                "type": prize.get("type"),
                "icon": prize.get("icon"),
                "value": prize.get("value")
            },
            "jugador_info": {
                "nombre": player.get("nombre"),
                "apodo": player.get("apodo")
            } if player else None,
            "awarded_for": awarded_for,
            "position": position
        }
        
        result = await self.awarded_repo.create(award_data)
        
        # Notificar al jugador
        await social_service.create_notification(NotificationCreate(
            user_id=jugador_id,
            type=NotificationType.PRIZE_WON,
            title="¡Premio Ganado!",
            message=f"Has ganado: {prize.get('name')}",
            data={
                "prize_id": prize_id,
                "award_id": result["award_id"],
                "prize_type": prize.get("type")
            },
            action_url="/pinpanclub/prizes"
        ))
        
        # Crear actividad en feed
        await social_service.create_activity(ActivityFeedCreate(
            jugador_id=jugador_id,
            activity_type=ActivityType.PRIZE_WON,
            data={
                "prize_name": prize.get("name"),
                "prize_icon": prize.get("icon"),
                "prize_type": prize.get("type"),
                "position": position
            },
            description=f"Ganó el premio '{prize.get('name')}'"
        ))
        
        self.log_info(f"Prize awarded: {prize.get('name')} to {jugador_id}")
        
        return AwardedPrize(**result)
    
    async def award_season_prizes(
        self,
        season_id: str,
        player_rankings: List[Dict],
        referee_rankings: List[Dict] = None
    ) -> List[AwardedPrize]:
        """
        Otorgar premios automáticamente al cerrar una temporada.
        Evalúa las condiciones de cada premio.
        """
        awarded = []
        
        # Obtener catálogo de premios
        catalog = await self.get_or_create_default_catalog()
        
        for prize_data in catalog.prizes:
            prize = PrizeDefinition(**prize_data) if isinstance(prize_data, dict) else prize_data
            
            # Evaluar condiciones para cada jugador
            rankings = player_rankings if prize.for_players else (referee_rankings or [])
            
            for idx, ranking in enumerate(rankings, start=1):
                if self._check_conditions(prize.conditions, ranking, idx):
                    # Verificar límite
                    if prize.max_winners:
                        current = await self.awarded_repo.count_prize_winners(prize.prize_id)
                        if current >= prize.max_winners:
                            continue
                    
                    try:
                        award = await self.award_prize(
                            prize_id=prize.prize_id,
                            jugador_id=ranking.get("jugador_id"),
                            awarded_for=f"Posición #{idx} en temporada",
                            position=idx,
                            season_id=season_id
                        )
                        awarded.append(award)
                    except Exception as e:
                        self.log_error(f"Error awarding prize: {e}")
        
        return awarded
    
    def _check_conditions(
        self, 
        conditions: List[Dict], 
        ranking: Dict,
        position: int
    ) -> bool:
        """Verify si se cumplen las condiciones de un premio"""
        if not conditions:
            return True
        
        for condition in conditions:
            cond_type = condition.get("type")
            value = condition.get("value")
            comparison = condition.get("comparison", "eq")
            
            actual_value = None
            
            if cond_type == "position":
                actual_value = position
            elif cond_type == "matches_played":
                actual_value = ranking.get("partidos_jugados", 0)
            elif cond_type == "matches_won":
                actual_value = ranking.get("partidos_ganados", 0)
            elif cond_type == "matches_refereed":
                actual_value = ranking.get("partidos_arbitrados", 0)
            elif cond_type == "streak":
                actual_value = ranking.get("best_streak", 0)
            elif cond_type == "participation":
                actual_value = 1 if ranking.get("partidos_jugados", 0) > 0 else 0
            
            if actual_value is None:
                continue
            
            # Evaluar comparación
            if comparison == "eq" and actual_value != value:
                return False
            elif comparison == "gte" and actual_value < value:
                return False
            elif comparison == "lte" and actual_value > value:
                return False
        
        return True
    
    # ============== PLAYER PRIZES ==============
    
    async def get_player_prizes(
        self,
        jugador_id: str,
        status: str = None
    ) -> List[AwardedPrize]:
        """Get premios de un jugador"""
        results = await self.awarded_repo.get_player_prizes(jugador_id, status)
        return [AwardedPrize(**r) for r in results]
    
    async def get_season_awarded_prizes(self, season_id: str) -> List[AwardedPrize]:
        """Get premios otorgados en una temporada"""
        results = await self.awarded_repo.get_season_prizes(season_id)
        return [AwardedPrize(**r) for r in results]
    
    async def update_prize_status(
        self,
        award_id: str,
        status: PrizeStatus
    ) -> bool:
        """Update estado de un premio otorgado"""
        return await self.awarded_repo.update_status(award_id, status.value)
    
    async def mark_prize_delivered(self, award_id: str) -> bool:
        """Marcar premio como entregado"""
        return await self.update_prize_status(award_id, PrizeStatus.DELIVERED)


# Instancia singleton
prize_service = PrizeService()
