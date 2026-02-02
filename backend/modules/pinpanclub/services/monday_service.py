"""
PinpanClub - Monday.com Integration Service
Business logic para sincronización con Monday.com
"""
from typing import List, Dict, Optional
import httpx
import json
import logging

from core.base import BaseService
from core.events import event_bus, Event, PinpanClubEvents
from core.config import MONDAY_API_KEY
from ..repositories import ConfigRepository, PlayerRepository, MatchRepository
from ..models import MondayConfig

logger = logging.getLogger(__name__)


class MondayService(BaseService):
    """
    Service for integración con Monday.com.
    Escucha eventos del módulo y sincroniza automáticamente.
    """
    
    MODULE_NAME = "pinpanclub"
    MONDAY_API_URL = "https://api.monday.com/v2"
    
    def __init__(self):
        super().__init__()
        self.config_repository = ConfigRepository()
        self.player_repository = PlayerRepository()
        self.match_repository = MatchRepository()
        
        # Suscribirse a eventos para sincronización automática
        self._setup_event_listeners()
    
    def _setup_event_listeners(self):
        """Configurar listeners de eventos para sync automático"""
        
        @event_bus.subscribe(PinpanClubEvents.MATCH_CREATED)
        async def on_match_created(event: Event):
            config = await self.get_config()
            if config.auto_sync_matches and config.matches_board_id:
                await self.sync_match(event.payload["partido_id"])
        
        @event_bus.subscribe(PinpanClubEvents.MATCH_FINISHED)
        async def on_match_finished(event: Event):
            config = await self.get_config()
            if config.auto_sync_results and config.matches_board_id:
                await self.sync_match_result(event.payload["partido_id"])
        
        @event_bus.subscribe(PinpanClubEvents.PLAYER_CREATED)
        async def on_player_created(event: Event):
            config = await self.get_config()
            if config.auto_sync_players and config.players_board_id:
                await self.sync_player(event.payload["jugador_id"])
    
    async def get_config(self) -> MondayConfig:
        """Get configuración de Monday.com"""
        config_dict = await self.config_repository.get_monday_config()
        return MondayConfig(**config_dict)
    
    async def save_config(self, config: MondayConfig) -> bool:
        """Save configuración de Monday.com"""
        return await self.config_repository.set_monday_config(config.model_dump())
    
    async def _graphql_request(self, query: str) -> Dict:
        """Ejecutar query GraphQL a Monday.com"""
        if not MONDAY_API_KEY:
            raise Exception("Monday.com API Key no configurada")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.MONDAY_API_URL,
                json={"query": query},
                headers={
                    "Authorization": MONDAY_API_KEY,
                    "Content-Type": "application/json"
                },
                timeout=30.0
            )
            
            result = response.json()
            
            if "errors" in result:
                raise Exception(result["errors"][0].get("message", "Error de Monday.com"))
            
            return result
    
    async def test_connection(self) -> Dict:
        """Probar conexión con Monday.com"""
        query = '''
        query {
            me { name email }
            boards(limit: 5) { id name }
        }
        '''
        result = await self._graphql_request(query)
        return {
            "connected": True,
            "user": result.get("data", {}).get("me"),
            "sample_boards": result.get("data", {}).get("boards", [])
        }
    
    async def get_boards(self) -> List[Dict]:
        """Get lista de boards"""
        query = '''
        query {
            boards(limit: 50) {
                id
                name
                items_count
                columns { id title type }
                groups { id title }
            }
        }
        '''
        result = await self._graphql_request(query)
        return result.get("data", {}).get("boards", [])
    
    async def get_board_items(self, board_id: str) -> List[Dict]:
        """Get items de un board específico (jugadores)"""
        query = f'''
        query {{
            boards(ids: [{board_id}]) {{
                items_page(limit: 100) {{
                    items {{
                        id
                        name
                        column_values {{
                            id
                            text
                            value
                        }}
                    }}
                }}
            }}
        }}
        '''
        result = await self._graphql_request(query)
        boards = result.get("data", {}).get("boards", [])
        if not boards:
            return []
        
        items = boards[0].get("items_page", {}).get("items", [])
        
        # Transforma formato de jugadores
        players = []
        for item in items:
            player = {
                "id": item["id"],
                "name": item["name"],
                "nombre": item["name"],
                "email": None
            }
            
            # Extract datos de columnas
            for col in item.get("column_values", []):
                col_id = col.get("id", "").lower()
                col_text = col.get("text", "")
                
                if "email" in col_id or col_id == "text4":
                    player["email"] = col_text
                elif col_id == "text":
                    if col_text:
                        player["nombre"] = col_text
            
            players.append(player)
        
        return players
    
    async def get_players_from_monday(self) -> List[Dict]:
        """Get jugadores desde el board configurado de Monday.com"""
        config = await self.get_config()
        if not config.players_board_id:
            return []
        
        return await self.get_board_items(config.players_board_id)
    
    async def create_item(
        self,
        board_id: str,
        item_name: str,
        column_values: Dict
    ) -> Optional[str]:
        """Create item en Monday.com"""
        column_values_json = json.dumps(column_values).replace('"', '\\"')
        
        mutation = f'''
        mutation {{
            create_item (
                board_id: {board_id},
                item_name: "{item_name}",
                column_values: "{column_values_json}"
            ) {{
                id
                name
            }}
        }}
        '''
        
        result = await self._graphql_request(mutation)
        item = result.get("data", {}).get("create_item")
        return item.get("id") if item else None
    
    async def update_item(
        self,
        board_id: str,
        item_id: str,
        column_values: Dict
    ) -> bool:
        """Update item en Monday.com"""
        column_values_json = json.dumps(column_values).replace('"', '\\"')
        
        mutation = f'''
        mutation {{
            change_multiple_column_values (
                board_id: {board_id},
                item_id: {item_id},
                column_values: "{column_values_json}"
            ) {{
                id
            }}
        }}
        '''
        
        result = await self._graphql_request(mutation)
        return result.get("data", {}).get("change_multiple_column_values") is not None
    
    async def sync_player(self, jugador_id: str) -> Optional[str]:
        """Sincronizar jugador con Monday.com"""
        config = await self.get_config()
        if not config.players_board_id:
            return None
        
        player = await self.player_repository.get_by_id(jugador_id)
        if not player:
            return None
        
        # Si ya está sincronizado, skip
        if player.get("monday_item_id"):
            return player["monday_item_id"]
        
        nombre_completo = f"{player.get('nombre', '')} {player.get('apellido', '')}"
        if player.get("apodo"):
            nombre_completo += f" ({player['apodo']})"
        
        column_values = {
            "text": player.get("nombre", ""),
            "text4": player.get("email", ""),
            "numbers": str(player.get("elo_rating", 1000)),
            "status": {"label": player.get("nivel", "principiante")}
        }
        
        monday_id = await self.create_item(
            config.players_board_id,
            nombre_completo.strip(),
            column_values
        )
        
        if monday_id:
            await self.player_repository.set_monday_item_id(jugador_id, monday_id)
            self.log_info(f"Player synced to Monday: {jugador_id} -> {monday_id}")
        
        return monday_id
    
    async def sync_match(self, partido_id: str) -> Optional[str]:
        """Sincronizar partido con Monday.com"""
        config = await self.get_config()
        if not config.matches_board_id:
            return None
        
        match = await self.match_repository.get_by_id(partido_id)
        if not match:
            return None
        
        # Get nombres de jugadores
        player_a = match.get("jugador_a_info", {})
        player_b = match.get("jugador_b_info", {})
        
        nombre_a = player_a.get("apodo") or player_a.get("nombre", "Jugador A")
        nombre_b = player_b.get("apodo") or player_b.get("nombre", "Jugador B")
        
        item_name = f"{nombre_a} vs {nombre_b}"
        
        estado_map = {
            "pendiente": "Pendiente",
            "en_curso": "En Curso",
            "pausado": "Pausado",
            "finalizado": "Finalizado",
            "cancelado": "Cancelado"
        }
        
        column_values = {
            "text": nombre_a,
            "text4": nombre_b,
            "text0": "",
            "status": {"label": estado_map.get(match.get("estado"), "Pendiente")},
            "text6": match.get("mesa", ""),
            "text7": match.get("ronda", "")
        }
        
        if match.get("monday_item_id"):
            # Update existente
            await self.update_item(
                config.matches_board_id,
                match["monday_item_id"],
                column_values
            )
            return match["monday_item_id"]
        else:
            # Create nuevo
            monday_id = await self.create_item(
                config.matches_board_id,
                item_name,
                column_values
            )
            
            if monday_id:
                await self.match_repository.set_monday_item_id(partido_id, monday_id)
                self.log_info(f"Match synced to Monday: {partido_id} -> {monday_id}")
            
            return monday_id
    
    async def sync_match_result(self, partido_id: str) -> bool:
        """Update resultado dthe match en Monday.com"""
        config = await self.get_config()
        if not config.matches_board_id:
            return False
        
        match = await self.match_repository.get_by_id(partido_id)
        if not match or not match.get("monday_item_id"):
            return False
        
        resultado = f"{match.get('sets_jugador_a', 0)}-{match.get('sets_jugador_b', 0)}"
        
        # Determinar ganador
        ganador = ""
        if match.get("ganador_id"):
            if match["ganador_id"] == match["jugador_a_id"]:
                ganador = match.get("jugador_a_info", {}).get("nombre", "A")
            else:
                ganador = match.get("jugador_b_info", {}).get("nombre", "B")
        
        column_values = {
            "text0": resultado,
            "status": {"label": "Finalizado"},
            "text8": ganador
        }
        
        success = await self.update_item(
            config.matches_board_id,
            match["monday_item_id"],
            column_values
        )
        
        if success:
            self.log_info(f"Match result synced: {partido_id}")
        
        return success
    
    async def sync_all_players(self) -> Dict:
        """Sincronizar all players pendientes"""
        players = await self.player_repository.get_not_synced_to_monday()
        
        synced = 0
        failed = 0
        
        for player in players:
            try:
                result = await self.sync_player(player["jugador_id"])
                if result:
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_error(f"Error syncing player {player['jugador_id']}", e)
                failed += 1
        
        return {"synced": synced, "failed": failed}
    
    async def sync_all_active_matches(self) -> Dict:
        """Sincronizar all matches activos"""
        matches = await self.match_repository.get_not_synced_to_monday()
        
        synced = 0
        failed = 0
        
        for match in matches:
            try:
                result = await self.sync_match(match["partido_id"])
                if result:
                    synced += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_error(f"Error syncing match {match['partido_id']}", e)
                failed += 1
        
        return {"synced": synced, "failed": failed}


# Instancia singleton del servicio
monday_service = MondayService()
