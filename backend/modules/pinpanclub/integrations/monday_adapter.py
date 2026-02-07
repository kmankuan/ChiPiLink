"""
PinPanClub Monday.com Adapter
Extends BaseMondayAdapter for PinPanClub-specific sync:
- Players → Monday.com board
- Matches → Monday.com board
- Match results → status updates
Maintains backward compatibility with event listeners for auto-sync.
"""
import json
import logging
from typing import Dict, List, Optional

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.webhook_router import register_handler
from core.events import event_bus, Event, PinpanClubEvents
from core.database import db

logger = logging.getLogger(__name__)


class PinPanClubMondayAdapter(BaseMondayAdapter):
    MODULE = "pinpanclub"
    ENTITY = "main"

    def __init__(self):
        super().__init__()
        self._setup_event_listeners()

    def _setup_event_listeners(self):
        """Backward-compatible event listeners for auto-sync"""

        @event_bus.subscribe(PinpanClubEvents.MATCH_CREATED)
        async def on_match_created(event: Event):
            config = await self._get_sync_config()
            if config.get("auto_sync_matches"):
                await self.sync_match(event.payload.get("partido_id"))

        @event_bus.subscribe(PinpanClubEvents.MATCH_FINISHED)
        async def on_match_finished(event: Event):
            config = await self._get_sync_config()
            if config.get("auto_sync_results"):
                await self.sync_match_result(event.payload.get("partido_id"))

        @event_bus.subscribe(PinpanClubEvents.PLAYER_CREATED)
        async def on_player_created(event: Event):
            config = await self._get_sync_config()
            if config.get("auto_sync_players"):
                await self.sync_player(event.payload.get("jugador_id"))

    async def _get_sync_config(self) -> Dict:
        """Get sync configuration (auto_sync flags + board IDs)"""
        config = await self.get_custom_config("sync_settings")
        return {
            "players_board_id": config.get("players_board_id"),
            "matches_board_id": config.get("matches_board_id"),
            "tournaments_board_id": config.get("tournaments_board_id"),
            "auto_sync_players": config.get("auto_sync_players", False),
            "auto_sync_matches": config.get("auto_sync_matches", True),
            "auto_sync_results": config.get("auto_sync_results", True),
        }

    async def save_sync_config(self, data: Dict) -> bool:
        """Save sync configuration"""
        return await self.save_custom_config("sync_settings", data)

    # ---- Player Sync ----

    async def sync_player(self, jugador_id: str) -> Optional[str]:
        """Sync a player to Monday.com"""
        config = await self._get_sync_config()
        board_id = config.get("players_board_id")
        if not board_id:
            return None

        player = await db.pinpanclub_jugadores.find_one(
            {"jugador_id": jugador_id}, {"_id": 0}
        )
        if not player:
            return None

        if player.get("monday_item_id"):
            return player["monday_item_id"]

        full_name = f"{player.get('nombre', '')} {player.get('apellido', '')}".strip()
        if player.get("apodo"):
            full_name += f" ({player['apodo']})"

        column_values = {
            "text": player.get("name", full_name),
            "text4": player.get("email", ""),
            "numbers": str(player.get("elo_rating", 1000)),
            "status": {"label": player.get("nivel", "principiante")},
        }

        monday_id = await self.client.create_item(board_id, full_name, column_values)
        if monday_id:
            await db.pinpanclub_jugadores.update_one(
                {"jugador_id": jugador_id},
                {"$set": {"monday_item_id": monday_id}}
            )
            logger.info(f"Player synced to Monday: {jugador_id} -> {monday_id}")

        return monday_id

    # ---- Match Sync ----

    async def sync_match(self, partido_id: str) -> Optional[str]:
        """Sync a match to Monday.com"""
        config = await self._get_sync_config()
        board_id = config.get("matches_board_id")
        if not board_id:
            return None

        match = await db.pinpanclub_partidos.find_one(
            {"partido_id": partido_id}, {"_id": 0}
        )
        if not match:
            return None

        player_a = match.get("player_a_info", {})
        player_b = match.get("player_b_info", {})
        nombre_a = player_a.get("apodo") or player_a.get("name", "Player A")
        nombre_b = player_b.get("apodo") or player_b.get("name", "Player B")
        item_name = f"{nombre_a} vs {nombre_b}"

        estado_map = {
            "pendiente": "Pendiente", "en_curso": "En Curso",
            "pausado": "Pausado", "finalizado": "Finalizado",
            "cancelado": "Cancelado",
        }

        column_values = {
            "text": nombre_a,
            "text4": nombre_b,
            "text0": "",
            "status": {"label": estado_map.get(match.get("estado"), "Pendiente")},
            "text6": match.get("mesa", ""),
            "text7": match.get("ronda", ""),
        }

        if match.get("monday_item_id"):
            await self.client.update_item(board_id, match["monday_item_id"], column_values)
            return match["monday_item_id"]

        monday_id = await self.client.create_item(board_id, item_name, column_values)
        if monday_id:
            await db.pinpanclub_partidos.update_one(
                {"partido_id": partido_id},
                {"$set": {"monday_item_id": monday_id}}
            )
            logger.info(f"Match synced to Monday: {partido_id} -> {monday_id}")

        return monday_id

    async def sync_match_result(self, partido_id: str) -> bool:
        """Update match result in Monday.com"""
        config = await self._get_sync_config()
        board_id = config.get("matches_board_id")
        if not board_id:
            return False

        match = await db.pinpanclub_partidos.find_one(
            {"partido_id": partido_id}, {"_id": 0}
        )
        if not match or not match.get("monday_item_id"):
            return False

        resultado = f"{match.get('sets_jugador_a', 0)}-{match.get('sets_jugador_b', 0)}"
        ganador = ""
        if match.get("winner_id"):
            if match["winner_id"] == match.get("player_a_id"):
                ganador = match.get("player_a_info", {}).get("name", "A")
            else:
                ganador = match.get("player_b_info", {}).get("name", "B")

        column_values = {
            "text0": resultado,
            "status": {"label": "Finalizado"},
            "text8": ganador,
        }

        success = await self.client.update_item(
            board_id, match["monday_item_id"], column_values
        )
        if success:
            logger.info(f"Match result synced: {partido_id}")
        return success

    # ---- Bulk Sync ----

    async def sync_all_players(self) -> Dict:
        """Sync all un-synced players"""
        players = await db.pinpanclub_jugadores.find(
            {"monday_item_id": {"$exists": False}}, {"_id": 0}
        ).to_list(500)
        synced, failed = 0, 0
        for p in players:
            try:
                if await self.sync_player(p["jugador_id"]):
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Error syncing player {p['jugador_id']}: {e}")
                failed += 1
        return {"synced": synced, "failed": failed}

    async def sync_all_matches(self) -> Dict:
        """Sync all un-synced active matches"""
        matches = await db.pinpanclub_partidos.find(
            {"monday_item_id": {"$exists": False}}, {"_id": 0}
        ).to_list(500)
        synced, failed = 0, 0
        for m in matches:
            try:
                if await self.sync_match(m["partido_id"]):
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                logger.error(f"Error syncing match {m['partido_id']}: {e}")
                failed += 1
        return {"synced": synced, "failed": failed}

    # ---- Webhook Handler ----

    async def handle_webhook(self, event: Dict) -> Dict:
        """Handle incoming Monday.com webhook events for PinPanClub"""
        column_id = event.get("columnId", "")
        item_id = str(event.get("pulseId", ""))
        board_id = str(event.get("boardId", ""))
        new_value = event.get("value", {})

        logger.info(f"PinPanClub webhook: board={board_id} item={item_id} col={column_id}")

        if column_id == "status":
            label = ""
            if isinstance(new_value, dict):
                label = new_value.get("label", {}).get("text", "")

            if label == "Finalizado":
                match = await db.pinpanclub_partidos.find_one(
                    {"monday_item_id": item_id}, {"_id": 0}
                )
                if match:
                    await db.pinpanclub_partidos.update_one(
                        {"monday_item_id": item_id},
                        {"$set": {"estado": "finalizado"}}
                    )
                    return {"status": "updated", "partido_id": match.get("partido_id")}

        return {"status": "acknowledged"}

    async def register_webhooks(self):
        """Register webhook handlers for configured boards"""
        config = await self._get_sync_config()
        for key in ["players_board_id", "matches_board_id"]:
            board_id = config.get(key)
            if board_id:
                register_handler(board_id, self.handle_webhook)
                logger.info(f"PinPanClub registered webhook for {key}: {board_id}")


# Singleton
pinpanclub_monday_adapter = PinPanClubMondayAdapter()
