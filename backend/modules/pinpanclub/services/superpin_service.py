"""
Super Pin Ranking - Service Layer
Lógica de negocio para el sistema de ranking
"""
import math
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from core.base import BaseService
from core.events import event_bus, Event, PinpanClubEvents
from ..repositories.superpin_repository import (
    SuperPinLeagueRepository,
    PlayerCheckInRepository,
    SuperPinMatchRepository,
    RankingRepository,
    SeasonTournamentRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.superpin import (
    SuperPinLeague, SuperPinLeagueCreate, SuperPinLeagueUpdate,
    SuperPinMatch, SuperPinMatchCreate,
    RankingEntry, RankingTable,
    PlayerCheckIn, PlayerCheckInCreate,
    ScoringSystem, CheckInMethod, StatsLevel,
    SeasonTournament, SeasonTournamentCreate
)


class SuperPinService(BaseService):
    """
    Servicio principal para Super Pin Ranking.
    """
    
    MODULE_NAME = "pinpanclub"
    
    def __init__(self):
        super().__init__()
        self.league_repo = SuperPinLeagueRepository()
        self.checkin_repo = PlayerCheckInRepository()
        self.match_repo = SuperPinMatchRepository()
        self.ranking_repo = RankingRepository()
        self.tournament_repo = SeasonTournamentRepository()
        self.player_repo = PlayerRepository()
    
    # ============== LEAGUE MANAGEMENT ==============
    
    async def create_league(self, data: SuperPinLeagueCreate) -> SuperPinLeague:
        """Crear nueva liga Super Pin"""
        league_dict = data.model_dump()
        
        # Establecer configuraciones por defecto si no se proporcionan
        if not league_dict.get("scoring_config"):
            league_dict["scoring_config"] = {}
        if not league_dict.get("checkin_config"):
            league_dict["checkin_config"] = {}
        if not league_dict.get("stats_config"):
            league_dict["stats_config"] = {}
        if not league_dict.get("tournament_config"):
            league_dict["tournament_config"] = {}
        if not league_dict.get("prizes"):
            league_dict["prizes"] = self._default_prizes()
        
        league_dict["estado"] = "draft"
        
        result = await self.league_repo.create(league_dict)
        self.log_info(f"League created: {result['liga_id']}")
        
        return SuperPinLeague(**result)
    
    def _default_prizes(self) -> List[Dict]:
        """Premios por defecto"""
        return [
            {"name": "Campeón", "position": 1, "icon": "🥇"},
            {"name": "Subcampeón", "position": 2, "icon": "🥈"},
            {"name": "Tercer Lugar", "position": 3, "icon": "🥉"},
            {"name": "Cuarto Lugar", "position": 4, "icon": "🏅"},
        ]
    
    async def get_league(self, liga_id: str) -> Optional[SuperPinLeague]:
        """Obtener liga por ID"""
        result = await self.league_repo.get_by_id(liga_id)
        return SuperPinLeague(**result) if result else None
    
    async def get_active_leagues(self) -> List[SuperPinLeague]:
        """Obtener ligas activas"""
        results = await self.league_repo.get_active_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def get_all_leagues(self) -> List[SuperPinLeague]:
        """Obtener todas las ligas"""
        results = await self.league_repo.get_all_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def update_league(
        self,
        liga_id: str,
        data: SuperPinLeagueUpdate
    ) -> Optional[SuperPinLeague]:
        """Actualizar liga"""
        update_data = data.model_dump(exclude_unset=True)
        
        if not update_data:
            return await self.get_league(liga_id)
        
        success = await self.league_repo.update_league(liga_id, update_data)
        
        if success:
            return await self.get_league(liga_id)
        return None
    
    async def activate_league(self, liga_id: str) -> Optional[SuperPinLeague]:
        """Activar liga"""
        return await self.update_league(
            liga_id,
            SuperPinLeagueUpdate(estado="active")
        )
    
    # ============== CHECK-IN MANAGEMENT ==============
    
    async def check_in_player(
        self,
        data: PlayerCheckInCreate
    ) -> PlayerCheckIn:
        """Registrar check-in de jugador"""
        # Verificar si ya tiene check-in activo
        existing = await self.checkin_repo.get_player_checkin(
            data.liga_id, data.jugador_id
        )
        if existing:
            return PlayerCheckIn(**existing)
        
        # Obtener info del jugador
        player = await self.player_repo.get_by_id(data.jugador_id)
        
        checkin_dict = data.model_dump()
        checkin_dict["jugador_info"] = player
        
        result = await self.checkin_repo.create(checkin_dict)
        
        # Incrementar contador de jugadores en liga si es nuevo
        await self.league_repo.increment_stats(data.liga_id, jugadores=1)
        
        self.log_info(f"Player checked in: {data.jugador_id} to {data.liga_id}")
        
        return PlayerCheckIn(**result)
    
    async def check_out_player(self, liga_id: str, jugador_id: str) -> bool:
        """Registrar check-out de jugador"""
        return await self.checkin_repo.checkout_by_player(liga_id, jugador_id)
    
    async def get_available_players(self, liga_id: str) -> List[PlayerCheckIn]:
        """Obtener jugadores disponibles (con check-in activo)"""
        results = await self.checkin_repo.get_active_checkins(liga_id)
        return [PlayerCheckIn(**r) for r in results]
    
    async def validate_geolocation(
        self,
        liga_id: str,
        latitude: float,
        longitude: float
    ) -> bool:
        """Validar ubicación para check-in por geolocalización"""
        league = await self.get_league(liga_id)
        if not league:
            return False
        
        config = league.checkin_config
        if not config.club_latitude or not config.club_longitude:
            return True  # Sin ubicación configurada, permitir
        
        # Calcular distancia usando fórmula de Haversine
        distance = self._haversine_distance(
            config.club_latitude, config.club_longitude,
            latitude, longitude
        )
        
        return distance <= config.radius_meters
    
    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calcular distancia en metros entre dos puntos GPS"""
        R = 6371000  # Radio de la Tierra en metros
        
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        
        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c
    
    # ============== MATCH MANAGEMENT ==============
    
    async def create_match(
        self,
        data: SuperPinMatchCreate
    ) -> SuperPinMatch:
        """Crear partido Super Pin"""
        # Obtener info de jugadores
        player_a = await self.player_repo.get_by_id(data.jugador_a_id)
        player_b = await self.player_repo.get_by_id(data.jugador_b_id)
        arbitro = None
        if data.arbitro_id:
            arbitro = await self.player_repo.get_by_id(data.arbitro_id)
        
        match_dict = data.model_dump()
        match_dict["jugador_a_info"] = player_a
        match_dict["jugador_b_info"] = player_b
        match_dict["arbitro_info"] = arbitro
        match_dict["puntos_jugador_a"] = 0
        match_dict["puntos_jugador_b"] = 0
        match_dict["sets_jugador_a"] = 0
        match_dict["sets_jugador_b"] = 0
        match_dict["set_actual"] = 1
        match_dict["historial_sets"] = []
        
        # Obtener ELO actual de los jugadores
        ranking_a = await self.ranking_repo.get_or_create(
            data.liga_id, data.jugador_a_id, player_a
        )
        ranking_b = await self.ranking_repo.get_or_create(
            data.liga_id, data.jugador_b_id, player_b
        )
        
        match_dict["elo_inicial_a"] = ranking_a.get("elo_rating", 1000)
        match_dict["elo_inicial_b"] = ranking_b.get("elo_rating", 1000)
        
        result = await self.match_repo.create(match_dict)
        
        self.log_info(f"Super Pin match created: {result['partido_id']}")
        
        return SuperPinMatch(**result)
    
    async def get_match(self, partido_id: str) -> Optional[SuperPinMatch]:
        """Obtener partido por ID"""
        result = await self.match_repo.get_by_id(partido_id)
        return SuperPinMatch(**result) if result else None
    
    async def start_match(self, partido_id: str) -> Optional[SuperPinMatch]:
        """Iniciar partido"""
        match = await self.match_repo.get_by_id(partido_id)
        if not match:
            return None
        
        await self.match_repo.update_match(partido_id, {
            "estado": "en_curso",
            "fecha_inicio": datetime.now(timezone.utc).isoformat()
        })
        
        return await self.get_match(partido_id)
    
    async def record_point(
        self,
        partido_id: str,
        jugador: str,  # 'a' o 'b'
        stats: Optional[Dict] = None
    ) -> Dict:
        """Registrar punto"""
        match = await self.match_repo.get_by_id(partido_id)
        if not match or match["estado"] != "en_curso":
            raise ValueError("Partido no está en curso")
        
        # Actualizar puntos
        if jugador == 'a':
            match["puntos_jugador_a"] += 1
        else:
            match["puntos_jugador_b"] += 1
        
        puntos_a = match["puntos_jugador_a"]
        puntos_b = match["puntos_jugador_b"]
        puntos_set = match["puntos_por_set"]
        
        set_ganado = False
        partido_terminado = False
        ganador_set = None
        ganador_partido = None
        
        # Verificar si se ganó el set
        if puntos_a >= puntos_set or puntos_b >= puntos_set:
            if abs(puntos_a - puntos_b) >= 2:
                set_ganado = True
                ganador_set = 'a' if puntos_a > puntos_b else 'b'
                
                # Guardar resultado del set
                match["historial_sets"].append({
                    "set": match["set_actual"],
                    "puntos_a": puntos_a,
                    "puntos_b": puntos_b,
                    "ganador": ganador_set
                })
                
                # Actualizar sets
                if ganador_set == 'a':
                    match["sets_jugador_a"] += 1
                else:
                    match["sets_jugador_b"] += 1
                
                # Verificar si se ganó el partido
                sets_para_ganar = (match["mejor_de"] // 2) + 1
                if match["sets_jugador_a"] >= sets_para_ganar:
                    partido_terminado = True
                    ganador_partido = 'a'
                    match["ganador_id"] = match["jugador_a_id"]
                elif match["sets_jugador_b"] >= sets_para_ganar:
                    partido_terminado = True
                    ganador_partido = 'b'
                    match["ganador_id"] = match["jugador_b_id"]
                else:
                    # Siguiente set
                    match["set_actual"] += 1
                    match["puntos_jugador_a"] = 0
                    match["puntos_jugador_b"] = 0
        
        # Actualizar estadísticas avanzadas si se proporcionan
        if stats:
            if not match.get("stats"):
                match["stats"] = {}
            match["stats"].update(stats)
        
        # Finalizar partido si terminó
        if partido_terminado:
            match["estado"] = "finalizado"
            match["fecha_fin"] = datetime.now(timezone.utc).isoformat()
            
            # Calcular y actualizar ranking
            await self._update_ranking_after_match(match)
            
            # Incrementar contador de partidos
            await self.league_repo.increment_stats(match["liga_id"], partidos=1)
        
        await self.match_repo.update_match(partido_id, match)
        
        return {
            "success": True,
            "match": match,
            "set_ganado": set_ganado,
            "ganador_set": ganador_set,
            "partido_terminado": partido_terminado,
            "ganador_partido": ganador_partido
        }
    
    async def _update_ranking_after_match(self, match: Dict):
        """Actualizar ranking después de un partido"""
        liga_id = match["liga_id"]
        
        # Obtener configuración de la liga
        league = await self.league_repo.get_by_id(liga_id)
        if not league:
            return
        
        scoring_config = league.get("scoring_config", {})
        scoring_system = scoring_config.get("system", "simple")
        
        ganador_id = match["ganador_id"]
        perdedor_id = match["jugador_b_id"] if ganador_id == match["jugador_a_id"] else match["jugador_a_id"]
        
        # Obtener rankings
        ranking_ganador = await self.ranking_repo.get_player_ranking(liga_id, ganador_id)
        ranking_perdedor = await self.ranking_repo.get_player_ranking(liga_id, perdedor_id)
        
        if not ranking_ganador or not ranking_perdedor:
            return
        
        # Calcular puntos según el sistema
        if scoring_system == "elo":
            puntos_ganador, puntos_perdedor, elo_change = self._calculate_elo(
                ranking_ganador.get("elo_rating", 1000),
                ranking_perdedor.get("elo_rating", 1000),
                scoring_config.get("elo_k_factor", 32)
            )
        else:  # simple
            puntos_ganador = scoring_config.get("points_win", 3)
            puntos_perdedor = scoring_config.get("points_loss", 1)
            elo_change = 0
        
        # Determinar sets ganados/perdidos para cada jugador
        if ganador_id == match["jugador_a_id"]:
            sets_ganador = match["sets_jugador_a"]
            sets_perdedor = match["sets_jugador_b"]
        else:
            sets_ganador = match["sets_jugador_b"]
            sets_perdedor = match["sets_jugador_a"]
        
        # Actualizar ranking del ganador
        racha_ganador = ranking_ganador.get("racha_actual", 0)
        nueva_racha_ganador = racha_ganador + 1 if racha_ganador >= 0 else 1
        
        await self.ranking_repo.update_ranking(ranking_ganador["ranking_id"], {
            "puntos_totales": ranking_ganador.get("puntos_totales", 0) + puntos_ganador,
            "elo_rating": ranking_ganador.get("elo_rating", 1000) + elo_change,
            "partidos_jugados": ranking_ganador.get("partidos_jugados", 0) + 1,
            "partidos_ganados": ranking_ganador.get("partidos_ganados", 0) + 1,
            "sets_ganados": ranking_ganador.get("sets_ganados", 0) + sets_ganador,
            "sets_perdidos": ranking_ganador.get("sets_perdidos", 0) + sets_perdedor,
            "racha_actual": nueva_racha_ganador,
            "mejor_racha": max(ranking_ganador.get("mejor_racha", 0), nueva_racha_ganador),
            "last_match_date": datetime.now(timezone.utc).isoformat()
        })
        
        # Actualizar ranking del perdedor
        racha_perdedor = ranking_perdedor.get("racha_actual", 0)
        nueva_racha_perdedor = racha_perdedor - 1 if racha_perdedor <= 0 else -1
        
        await self.ranking_repo.update_ranking(ranking_perdedor["ranking_id"], {
            "puntos_totales": ranking_perdedor.get("puntos_totales", 0) + puntos_perdedor,
            "elo_rating": ranking_perdedor.get("elo_rating", 1000) - elo_change,
            "partidos_jugados": ranking_perdedor.get("partidos_jugados", 0) + 1,
            "partidos_perdidos": ranking_perdedor.get("partidos_perdidos", 0) + 1,
            "sets_ganados": ranking_perdedor.get("sets_ganados", 0) + sets_perdedor,
            "sets_perdidos": ranking_perdedor.get("sets_perdidos", 0) + sets_ganador,
            "racha_actual": nueva_racha_perdedor,
            "last_match_date": datetime.now(timezone.utc).isoformat()
        })
        
        # Guardar puntos en el partido
        await self.match_repo.update_match(match["partido_id"], {
            "puntos_ganador": puntos_ganador,
            "puntos_perdedor": puntos_perdedor,
            "elo_change_a": elo_change if ganador_id == match["jugador_a_id"] else -elo_change,
            "elo_change_b": elo_change if ganador_id == match["jugador_b_id"] else -elo_change
        })
        
        # Recalcular posiciones
        await self.ranking_repo.recalculate_positions(liga_id, scoring_system)
    
    def _calculate_elo(
        self,
        elo_ganador: int,
        elo_perdedor: int,
        k_factor: int = 32
    ) -> tuple:
        """Calcular cambio de ELO"""
        # Probabilidad esperada de victoria
        expected_winner = 1 / (1 + 10 ** ((elo_perdedor - elo_ganador) / 400))
        expected_loser = 1 - expected_winner
        
        # Cambio de ELO
        change = round(k_factor * (1 - expected_winner))
        
        # Puntos (para el sistema de puntos, además del ELO)
        points_winner = 3
        points_loser = 1
        
        return points_winner, points_loser, change
    
    # ============== RANKING ==============
    
    async def get_ranking(self, liga_id: str) -> RankingTable:
        """Obtener tabla de ranking"""
        league = await self.get_league(liga_id)
        if not league:
            raise ValueError("Liga no encontrada")
        
        entries = await self.ranking_repo.get_league_ranking(liga_id)
        
        return RankingTable(
            liga_id=liga_id,
            liga_nombre=league.nombre,
            temporada=league.temporada,
            total_jugadores=len(entries),
            total_partidos=league.total_partidos,
            scoring_system=league.scoring_config.system,
            entries=[RankingEntry(**e) for e in entries],
            last_updated=datetime.now(timezone.utc).isoformat()
        )
    
    async def get_player_stats(
        self,
        liga_id: str,
        jugador_id: str
    ) -> Dict:
        """Obtener estadísticas de un jugador en una liga"""
        ranking = await self.ranking_repo.get_player_ranking(liga_id, jugador_id)
        if not ranking:
            return None
        
        # Obtener historial de partidos
        matches = await self.match_repo.get_player_matches(liga_id, jugador_id, limit=20)
        
        return {
            "ranking": RankingEntry(**ranking),
            "recent_matches": matches
        }
    
    # ============== SEASON TOURNAMENT ==============
    
    async def create_season_tournament(
        self,
        data: SeasonTournamentCreate
    ) -> SeasonTournament:
        """Crear torneo de fin de temporada"""
        league = await self.get_league(data.liga_id)
        if not league:
            raise ValueError("Liga no encontrada")
        
        # Obtener participantes según configuración
        ranking = await self.get_ranking(data.liga_id)
        tournament_config = league.tournament_config
        
        if tournament_config.tournament_type == "top_n":
            participantes = [
                {"jugador_id": e.jugador_id, "posicion_ranking": e.posicion, "jugador_info": e.jugador_info}
                for e in ranking.entries[:tournament_config.top_n_players]
            ]
        elif tournament_config.tournament_type == "by_category":
            # Por categorías
            participantes = []
            for cat in tournament_config.categories:
                cat_players = [
                    {"jugador_id": e.jugador_id, "posicion_ranking": e.posicion, 
                     "categoria": cat["name"], "jugador_info": e.jugador_info}
                    for e in ranking.entries
                    if cat["min_rank"] <= e.posicion <= cat["max_rank"]
                ]
                participantes.extend(cat_players)
        else:  # all_players
            participantes = [
                {"jugador_id": e.jugador_id, "posicion_ranking": e.posicion, "jugador_info": e.jugador_info}
                for e in ranking.entries
            ]
        
        tournament_dict = data.model_dump()
        tournament_dict["tournament_config"] = tournament_config.model_dump()
        tournament_dict["prizes"] = [p.model_dump() if hasattr(p, 'model_dump') else p for p in league.prizes]
        tournament_dict["participantes"] = participantes
        
        result = await self.tournament_repo.create(tournament_dict)
        
        self.log_info(f"Season tournament created: {result['torneo_id']}")
        
        return SeasonTournament(**result)
    
    async def generate_tournament_brackets(self, torneo_id: str) -> dict:
        """Generar brackets para torneo de eliminación simple"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament:
            raise ValueError("Torneo no encontrado")
        
        participantes = tournament.get("participantes", [])
        num_players = len(participantes)
        
        if num_players < 2:
            raise ValueError("Se necesitan al menos 2 participantes")
        
        # Calcular rondas necesarias
        import math
        num_rounds = math.ceil(math.log2(num_players))
        bracket_size = 2 ** num_rounds
        
        # Generar estructura de brackets
        brackets = []
        
        # Primera ronda - emparejar según ranking (1 vs último, 2 vs penúltimo, etc.)
        round_1_matches = []
        for i in range(bracket_size // 2):
            match = {
                "match_id": f"R1_M{i+1}",
                "round": 1,
                "position": i,
                "player_a": participantes[i] if i < num_players else None,
                "player_b": participantes[-(i+1)] if (num_players - i - 1) >= 0 and i < num_players // 2 else None,
                "winner": None,
                "score_a": 0,
                "score_b": 0,
                "estado": "pendiente"
            }
            # Si solo hay un jugador, avanza automáticamente (bye)
            if match["player_a"] and not match["player_b"]:
                match["winner"] = match["player_a"]["jugador_id"]
                match["estado"] = "bye"
            round_1_matches.append(match)
        
        brackets.append({"round": 1, "name": "Octavos" if num_rounds >= 3 else "Primera Ronda", "matches": round_1_matches})
        
        # Generar rondas siguientes vacías
        round_names = ["Octavos", "Cuartos", "Semifinal", "Final"]
        for r in range(2, num_rounds + 1):
            num_matches = bracket_size // (2 ** r)
            round_name = round_names[min(r-1, len(round_names)-1)]
            if r == num_rounds:
                round_name = "Final"
            elif r == num_rounds - 1:
                round_name = "Semifinal"
            
            round_matches = [
                {
                    "match_id": f"R{r}_M{i+1}",
                    "round": r,
                    "position": i,
                    "player_a": None,
                    "player_b": None,
                    "winner": None,
                    "score_a": 0,
                    "score_b": 0,
                    "estado": "pendiente"
                }
                for i in range(num_matches)
            ]
            brackets.append({"round": r, "name": round_name, "matches": round_matches})
        
        # Agregar partido por 3er lugar si está configurado
        config = tournament.get("tournament_config", {})
        if config.get("third_place_match", True) and num_rounds >= 2:
            brackets.append({
                "round": num_rounds,
                "name": "Tercer Lugar",
                "matches": [{
                    "match_id": "3RD_PLACE",
                    "round": num_rounds,
                    "position": 0,
                    "player_a": None,
                    "player_b": None,
                    "winner": None,
                    "score_a": 0,
                    "score_b": 0,
                    "estado": "pendiente",
                    "is_third_place": True
                }]
            })
        
        # Actualizar torneo con brackets
        await self.tournament_repo.update(torneo_id, {
            "brackets": brackets,
            "estado": "en_curso"
        })
        
        return {"brackets": brackets, "total_rounds": num_rounds}
    
    async def update_tournament_match(
        self, 
        torneo_id: str, 
        match_id: str, 
        winner_id: str,
        score_a: int = 0,
        score_b: int = 0
    ) -> dict:
        """Actualizar resultado de un partido del torneo"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament:
            raise ValueError("Torneo no encontrado")
        
        brackets = tournament.get("brackets", [])
        match_found = False
        current_round = 0
        match_position = 0
        
        # Buscar y actualizar el partido
        for bracket in brackets:
            for match in bracket["matches"]:
                if match["match_id"] == match_id:
                    match["winner"] = winner_id
                    match["score_a"] = score_a
                    match["score_b"] = score_b
                    match["estado"] = "finalizado"
                    match_found = True
                    current_round = match["round"]
                    match_position = match["position"]
                    break
        
        if not match_found:
            raise ValueError("Partido no encontrado")
        
        # Avanzar ganador a la siguiente ronda
        next_round = current_round + 1
        for bracket in brackets:
            if bracket["round"] == next_round and bracket.get("name") != "Tercer Lugar":
                next_match_pos = match_position // 2
                for match in bracket["matches"]:
                    if match["position"] == next_match_pos:
                        # Determinar jugador ganador
                        winner_info = None
                        for p in tournament.get("participantes", []):
                            if p["jugador_id"] == winner_id:
                                winner_info = p
                                break
                        
                        if match_position % 2 == 0:
                            match["player_a"] = winner_info
                        else:
                            match["player_b"] = winner_info
                        break
        
        # Actualizar brackets en DB
        await self.tournament_repo.update(torneo_id, {"brackets": brackets})
        
        # Verificar si el torneo terminó
        final_bracket = next((b for b in brackets if b["name"] == "Final"), None)
        if final_bracket:
            final_match = final_bracket["matches"][0]
            if final_match.get("estado") == "finalizado":
                # Torneo terminado - generar resultados finales
                resultados = [
                    {"posicion": 1, "jugador_id": final_match["winner"]},
                    {"posicion": 2, "jugador_id": final_match["player_a"]["jugador_id"] 
                     if final_match["player_a"]["jugador_id"] != final_match["winner"] 
                     else final_match["player_b"]["jugador_id"]}
                ]
                
                # Agregar 3er lugar si existe
                third_bracket = next((b for b in brackets if b["name"] == "Tercer Lugar"), None)
                if third_bracket and third_bracket["matches"][0].get("estado") == "finalizado":
                    resultados.append({
                        "posicion": 3, 
                        "jugador_id": third_bracket["matches"][0]["winner"]
                    })
                
                await self.tournament_repo.update(torneo_id, {
                    "estado": "finalizado",
                    "resultados_finales": resultados
                })
        
        return {"success": True, "brackets": brackets}
    
    async def get_tournament_with_brackets(self, torneo_id: str) -> dict:
        """Obtener torneo con información completa de brackets"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament:
            return None
        return tournament


# Instancia singleton
superpin_service = SuperPinService()
