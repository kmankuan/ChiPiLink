"""
PinpanClub - Player Service
Business logic para jugadores
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone

from core.base import BaseService
from core.events import PinpanClubEvents, EventPriority
from ..repositories import PlayerRepository
from ..models import PlayerCreate, PlayerUpdate, Player


class PlayerService(BaseService):
    """
    Service for management of jugadores.
    Contiene toda la business logic relacionada con jugadores.
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.repository = PlayerRepository()
    
    async def create_player(self, data: PlayerCreate) -> Player:
        """
        Crear new player.
        Emite evento: pinpanclub.player.created
        """
        player_dict = data.model_dump()
        result = await self.repository.create(player_dict)
        
        # Emit evento
        await self.emit_event(
            PinpanClubEvents.PLAYER_CREATED,
            {
                "jugador_id": result["jugador_id"],
                "nombre": result["nombre"],
                "elo_rating": result["elo_rating"]
            }
        )
        
        self.log_info(f"Player created: {result['jugador_id']}")
        return Player(**result)
    
    async def get_player(self, jugador_id: str) -> Optional[Player]:
        """Get jugador by ID"""
        result = await self.repository.get_by_id(jugador_id)
        return Player(**result) if result else None
    
    async def get_all_players(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> List[Player]:
        """Get all players activos"""
        results = await self.repository.get_all_active(skip, limit)
        return [Player(**r) for r in results]
    
    async def get_rankings(self, limit: int = 50) -> List[Player]:
        """Get ranking de jugadores"""
        results = await self.repository.get_rankings(limit)
        return [Player(**r) for r in results]
    
    async def update_player(
        self,
        jugador_id: str,
        data: PlayerUpdate
    ) -> Optional[Player]:
        """
        Actualizar jugador.
        Emite evento: pinpanclub.player.updated
        """
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_player(jugador_id)
        
        success = await self.repository.update_player(jugador_id, update_data)
        
        if success:
            await self.emit_event(
                PinpanClubEvents.PLAYER_UPDATED,
                {"jugador_id": jugador_id, "updated_fields": list(update_data.keys())}
            )
            return await self.get_player(jugador_id)
        
        return None
    
    async def update_player_stats(
        self,
        jugador_id: str,
        won: bool,
        opponent_elo: int
    ) -> Optional[Player]:
        """
        Actualizar statistics of the player después de un partido.
        Calcula cambio de ELO y emite evento.
        """
        player = await self.get_player(jugador_id)
        if not player:
            return None
        
        # Calculate ELO change (simplified ELO system)
        k_factor = 32
        expected = 1 / (1 + 10 ** ((opponent_elo - player.elo_rating) / 400))
        actual = 1 if won else 0
        elo_change = int(k_factor * (actual - expected))
        
        # Update in repository
        await self.repository.update_stats(jugador_id, won, elo_change)
        
        # Emit ELO change event
        await self.emit_event(
            PinpanClubEvents.PLAYER_ELO_CHANGED,
            {
                "jugador_id": jugador_id,
                "old_elo": player.elo_rating,
                "new_elo": player.elo_rating + elo_change,
                "change": elo_change,
                "won": won
            },
            priority=EventPriority.HIGH
        )
        
        return await self.get_player(jugador_id)
    
    async def search_players(self, query: str) -> List[Player]:
        """Search jugadores"""
        results = await self.repository.search(query)
        return [Player(**r) for r in results]
    
    async def deactivate_player(self, jugador_id: str) -> bool:
        """Desactivar jugador"""
        return await self.repository.deactivate(jugador_id)
    
    async def get_players_not_synced(self) -> List[Player]:
        """Get jugadores no sincronizados con Monday.com"""
        results = await self.repository.get_not_synced_to_monday()
        return [Player(**r) for r in results]
    
    async def set_monday_sync(
        self,
        jugador_id: str,
        monday_item_id: str
    ) -> bool:
        """Marcar jugador como sincronizado con Monday.com"""
        return await self.repository.set_monday_item_id(jugador_id, monday_item_id)


# Service singleton instance
player_service = PlayerService()
