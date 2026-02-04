"""
PinpanClub - Event Handlers
Manejadores de eventos para integration entre modules
"""
import logging
from core.events import event_bus, Event, PinpanClubEvents

logger = logging.getLogger(__name__)


def setup_event_handlers():
    """
    Configurar handlers de eventos del module PinpanClub.
    Llamar esta function al iniciar la application.
    """
    
    @event_bus.subscribe(PinpanClubEvents.MATCH_FINISHED)
    async def update_player_stats_on_match_finish(event: Event):
        """
        Actualizar statistics de jugadores cuando termina un partido.
        """
        from .services import player_service
        
        payload = event.payload
        winner_id = payload.get("winner_id")
        player_a_id = payload.get("player_a_id")
        player_b_id = payload.get("player_b_id")
        
        if not all([winner_id, player_a_id, player_b_id]):
            return
        
        loser_id = player_b_id if winner_id == player_a_id else player_a_id
        
        # Get ELOs for calculation
        ganador = await player_service.get_player(winner_id)
        perdedor = await player_service.get_player(loser_id)
        
        if ganador and perdedor:
            # Update winner stats
            await player_service.update_player_stats(
                winner_id,
                won=True,
                opponent_elo=perdedor.elo_rating
            )
            
            # Update loser stats
            await player_service.update_player_stats(
                loser_id,
                won=False,
                opponent_elo=ganador.elo_rating
            )
            
            logger.info(
                f"Updated stats for match: winner={winner_id}, loser={loser_id}"
            )
    
    @event_bus.subscribe("pinpanclub.*")
    async def log_all_pinpanclub_events(event: Event):
        """
        Log de todos los eventos del module (para debugging/audit).
        """
        logger.debug(
            f"[PINPANCLUB EVENT] {event.event_type}: {event.payload}"
        )
    
    logger.info("PinpanClub event handlers configured")


# Export event types for external use
__all__ = ['setup_event_handlers', 'PinpanClubEvents']
