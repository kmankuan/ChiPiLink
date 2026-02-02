"""
Super Pin Ranking - Service Layer
Business logic for the ranking system
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
    SeasonTournamentRepository,
    PlayerBadgeRepository
)
from ..repositories.player_repository import PlayerRepository
from ..models.superpin import (
    SuperPinLeague, SuperPinLeagueCreate, SuperPinLeagueUpdate,
    SuperPinMatch, SuperPinMatchCreate,
    RankingEntry, RankingTable,
    PlayerCheckIn, PlayerCheckInCreate,
    ScoringSystem, CheckInMethod, StatsLevel,
    SeasonTournament, SeasonTournamentCreate,
    BadgeType, PlayerBadge, PlayerBadgeCreate, BADGE_DEFINITIONS
)


class SuperPinService(BaseService):
    """
    Main service for Super Pin Ranking.
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
        self.badge_repo = PlayerBadgeRepository()
    
    # ============== LEAGUE MANAGEMENT ==============
    
    async def create_league(self, data: SuperPinLeagueCreate) -> SuperPinLeague:
        """Create new Super Pin league"""
        league_dict = data.model_dump()
        
        # Set default configurations if not provided
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
        """Premios by default"""
        return [
            {"name": "Campeón", "position": 1, "icon": "🥇"},
            {"name": "Subcampeón", "position": 2, "icon": "🥈"},
            {"name": "Tercer Lugar", "position": 3, "icon": "🥉"},
            {"name": "Cuarto Lugar", "position": 4, "icon": "🏅"},
        ]
    
    async def get_league(self, liga_id: str) -> Optional[SuperPinLeague]:
        """Get liga by ID"""
        result = await self.league_repo.get_by_id(liga_id)
        return SuperPinLeague(**result) if result else None
    
    async def get_active_leagues(self) -> List[SuperPinLeague]:
        """Get ligas activas"""
        results = await self.league_repo.get_active_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def get_all_leagues(self) -> List[SuperPinLeague]:
        """Get all leagues"""
        results = await self.league_repo.get_all_leagues()
        return [SuperPinLeague(**r) for r in results]
    
    async def update_league(
        self,
        liga_id: str,
        data: SuperPinLeagueUpdate
    ) -> Optional[SuperPinLeague]:
        """Update liga"""
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
        """Register check-in de jugador"""
        # Verify si ya tiene check-in activo
        existing = await self.checkin_repo.get_player_checkin(
            data.liga_id, data.jugador_id
        )
        if existing:
            return PlayerCheckIn(**existing)
        
        # Get info of the player
        player = await self.player_repo.get_by_id(data.jugador_id)
        
        checkin_dict = data.model_dump()
        checkin_dict["jugador_info"] = player
        
        result = await self.checkin_repo.create(checkin_dict)
        
        # Increment league player counter if new
        await self.league_repo.increment_stats(data.liga_id, jugadores=1)
        
        self.log_info(f"Player checked in: {data.jugador_id} to {data.liga_id}")
        
        return PlayerCheckIn(**result)
    
    async def check_out_player(self, liga_id: str, jugador_id: str) -> bool:
        """Register check-out de jugador"""
        return await self.checkin_repo.checkout_by_player(liga_id, jugador_id)
    
    async def get_available_players(self, liga_id: str) -> List[PlayerCheckIn]:
        """Get jugadores disponibles (con check-in activo)"""
        results = await self.checkin_repo.get_active_checkins(liga_id)
        return [PlayerCheckIn(**r) for r in results]
    
    async def validate_geolocation(
        self,
        liga_id: str,
        latitude: float,
        longitude: float
    ) -> bool:
        """Validate ubicación para check-in por geolocalización"""
        league = await self.get_league(liga_id)
        if not league:
            return False
        
        config = league.checkin_config
        if not config.club_latitude or not config.club_longitude:
            return True  # Without ubicación configurada, permitir
        
        # Calculate distance using Haversine formula
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
        """Calculate distancia en metros entre dos puntos GPS"""
        R = 6371000  # Earth radius in meters
        
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
        """Create partido Super Pin"""
        # Get player info
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
        
        # Get current player ELO
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
        """Get partido by ID"""
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
        """Register punto"""
        match = await self.match_repo.get_by_id(partido_id)
        if not match or match["estado"] != "en_curso":
            raise ValueError("Partido no está en curso")
        
        # Update puntos
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
        
        # Verify if set was won
        if puntos_a >= puntos_set or puntos_b >= puntos_set:
            if abs(puntos_a - puntos_b) >= 2:
                set_ganado = True
                ganador_set = 'a' if puntos_a > puntos_b else 'b'
                
                # Save set result
                match["historial_sets"].append({
                    "set": match["set_actual"],
                    "puntos_a": puntos_a,
                    "puntos_b": puntos_b,
                    "ganador": ganador_set
                })
                
                # Update sets
                if ganador_set == 'a':
                    match["sets_jugador_a"] += 1
                else:
                    match["sets_jugador_b"] += 1
                
                # Verify si se ganó the match
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
        
        # Update advanced statistics si se proporcionan
        if stats:
            if not match.get("stats"):
                match["stats"] = {}
            match["stats"].update(stats)
        
        # Finalize partido si terminó
        if partido_terminado:
            match["estado"] = "finalizado"
            match["fecha_fin"] = datetime.now(timezone.utc).isoformat()
            
            # Calculatesr y actualizar ranking
            await self._update_ranking_after_match(match)
            
            # Increment match counter
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
        """Update ranking después de un partido"""
        liga_id = match["liga_id"]
        
        # Get configuración of the league
        league = await self.league_repo.get_by_id(liga_id)
        if not league:
            return
        
        scoring_config = league.get("scoring_config", {})
        scoring_system = scoring_config.get("system", "simple")
        
        ganador_id = match["ganador_id"]
        perdedor_id = match["jugador_b_id"] if ganador_id == match["jugador_a_id"] else match["jugador_a_id"]
        
        # Get rankings
        ranking_ganador = await self.ranking_repo.get_player_ranking(liga_id, ganador_id)
        ranking_perdedor = await self.ranking_repo.get_player_ranking(liga_id, perdedor_id)
        
        if not ranking_ganador or not ranking_perdedor:
            return
        
        # Calculate points according to system
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
        
        # Determine sets won/lost for each player
        if ganador_id == match["jugador_a_id"]:
            sets_ganador = match["sets_jugador_a"]
            sets_perdedor = match["sets_jugador_b"]
        else:
            sets_ganador = match["sets_jugador_b"]
            sets_perdedor = match["sets_jugador_a"]
        
        # Update winner ranking
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
        
        # Update loser ranking
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
        
        # Save points in the match
        await self.match_repo.update_match(match["partido_id"], {
            "puntos_ganador": puntos_ganador,
            "puntos_perdedor": puntos_perdedor,
            "elo_change_a": elo_change if ganador_id == match["jugador_a_id"] else -elo_change,
            "elo_change_b": elo_change if ganador_id == match["jugador_b_id"] else -elo_change
        })
        
        # Recalculate positions
        await self.ranking_repo.recalculate_positions(liga_id, scoring_system)
    
    def _calculate_elo(
        self,
        elo_ganador: int,
        elo_perdedor: int,
        k_factor: int = 32
    ) -> tuple:
        """Calculate cambio de ELO"""
        # Expected win probability
        expected_winner = 1 / (1 + 10 ** ((elo_perdedor - elo_ganador) / 400))
        expected_loser = 1 - expected_winner
        
        # ELO change
        change = round(k_factor * (1 - expected_winner))
        
        # Points (for points system, in addition to ELO)
        points_winner = 3
        points_loser = 1
        
        return points_winner, points_loser, change
    
    # ============== RANKING ==============
    
    async def get_ranking(self, liga_id: str) -> RankingTable:
        """Get tabla de ranking"""
        league = await self.get_league(liga_id)
        if not league:
            raise ValueError("Liga not found")
        
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
        """Get player statistics en una liga"""
        ranking = await self.ranking_repo.get_player_ranking(liga_id, jugador_id)
        if not ranking:
            return None
        
        # Get match history
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
        """Create torneo de fin de temporada"""
        league = await self.get_league(data.liga_id)
        if not league:
            raise ValueError("Liga not found")
        
        # Get participantes según configuración
        ranking = await self.get_ranking(data.liga_id)
        tournament_config = league.tournament_config
        
        if tournament_config.tournament_type == "top_n":
            participantes = [
                {"jugador_id": e.jugador_id, "posicion_ranking": e.posicion, "jugador_info": e.jugador_info}
                for e in ranking.entries[:tournament_config.top_n_players]
            ]
        elif tournament_config.tournament_type == "by_category":
            # By categorías
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
            raise ValueError("Torneo not found")
        
        participantes = tournament.get("participantes", [])
        num_players = len(participantes)
        
        if num_players < 2:
            raise ValueError("Se necesitan al menos 2 participantes")
        
        # Calculatesr rondas necesarias
        import math
        num_rounds = math.ceil(math.log2(num_players))
        bracket_size = 2 ** num_rounds
        
        # Generate bracket structure
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
        
        brackets.append({"round": 1, "name": "Final" if num_rounds == 1 else ("Octavos" if num_rounds >= 3 else "Primera Ronda"), "matches": round_1_matches})
        
        # Generate rondas siguientes vacías
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
        
        # Add partido por 3er lugar si está configurado
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
        
        # Update tournament with brackets
        await self.tournament_repo.update_tournament(torneo_id, {
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
        """Update resultado de un partido dthe tournament"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament:
            raise ValueError("Torneo not found")
        
        brackets = tournament.get("brackets", [])
        match_found = False
        current_round = 0
        match_position = 0
        
        # Search y actualizar the match
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
            raise ValueError("Match not found")
        
        # Advance winner to next round
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
        
        # Update brackets in DB
        await self.tournament_repo.update_tournament(torneo_id, {"brackets": brackets})
        
        # Verify si the tournament terminó
        final_bracket = next((b for b in brackets if b["name"] == "Final"), None)
        if final_bracket:
            final_match = final_bracket["matches"][0]
            if final_match.get("estado") == "finalizado":
                # Tournament terminado - generar resultados finales
                resultados = [
                    {"posicion": 1, "jugador_id": final_match["winner"]},
                    {"posicion": 2, "jugador_id": final_match["player_a"]["jugador_id"] 
                     if final_match["player_a"]["jugador_id"] != final_match["winner"] 
                     else final_match["player_b"]["jugador_id"]}
                ]
                
                # Add 3er lugar if exists
                third_bracket = next((b for b in brackets if b["name"] == "Tercer Lugar"), None)
                if third_bracket and third_bracket["matches"][0].get("estado") == "finalizado":
                    resultados.append({
                        "posicion": 3, 
                        "jugador_id": third_bracket["matches"][0]["winner"]
                    })
                
                await self.tournament_repo.update_tournament(torneo_id, {
                    "estado": "finalizado",
                    "resultados_finales": resultados
                })
        
        return {"success": True, "brackets": brackets}
    
    async def get_tournament_with_brackets(self, torneo_id: str) -> dict:
        """Get torneo con información completa de brackets"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament:
            return None
        return tournament
    
    # ============== BADGE SYSTEM ==============
    
    async def award_badge(
        self,
        jugador_id: str,
        badge_type: str,
        liga_id: str = None,
        torneo_id: str = None,
        partido_id: str = None,
        temporada: str = None,
        allow_duplicates: bool = False,
        metadata: Dict = None
    ) -> Optional[Dict]:
        """Otorgar un badge a un jugador"""
        
        # Verify if already has badge (if duplicates not allowed)
        if not allow_duplicates:
            existing = await self.badge_repo.get_badge_by_type(
                jugador_id, badge_type,
                liga_id=liga_id if liga_id else None,
                torneo_id=torneo_id if torneo_id else None
            )
            if existing:
                return None  # Ya tiene este badge
        
        # Get badge definition
        badge_def = BADGE_DEFINITIONS.get(badge_type, {})
        
        badge_data = {
            "jugador_id": jugador_id,
            "badge_type": badge_type,
            "name": badge_def.get("name", badge_type),
            "description": badge_def.get("description", ""),
            "icon": badge_def.get("icon", "🏅"),
            "liga_id": liga_id,
            "torneo_id": torneo_id,
            "partido_id": partido_id,
            "temporada": temporada,
            "metadata": metadata or {}
        }
        
        result = await self.badge_repo.create(badge_data)
        
        self.log_info(f"Badge awarded: {badge_type} to player {jugador_id}")
        
        return result
    
    async def award_tournament_badges(self, torneo_id: str) -> List[Dict]:
        """Otorgar badges a los ganadores de un torneo"""
        tournament = await self.tournament_repo.get_by_id(torneo_id)
        if not tournament or tournament.get("estado") != "finalizado":
            return []
        
        awarded_badges = []
        resultados = tournament.get("resultados_finales", [])
        liga_id = tournament.get("liga_id")
        temporada = None
        
        # Get temporada of the league
        league = await self.league_repo.get_by_id(liga_id)
        if league:
            temporada = league.get("temporada")
        
        for resultado in resultados:
            posicion = resultado.get("posicion")
            jugador_id = resultado.get("jugador_id")
            
            if posicion == 1:
                badge = await self.award_badge(
                    jugador_id=jugador_id,
                    badge_type=BadgeType.TOURNAMENT_CHAMPION,
                    liga_id=liga_id,
                    torneo_id=torneo_id,
                    temporada=temporada,
                    metadata={"tournament_name": tournament.get("nombre")}
                )
                if badge:
                    awarded_badges.append(badge)
                    
            elif posicion == 2:
                badge = await self.award_badge(
                    jugador_id=jugador_id,
                    badge_type=BadgeType.TOURNAMENT_RUNNER_UP,
                    liga_id=liga_id,
                    torneo_id=torneo_id,
                    temporada=temporada,
                    metadata={"tournament_name": tournament.get("nombre")}
                )
                if badge:
                    awarded_badges.append(badge)
                    
            elif posicion == 3:
                badge = await self.award_badge(
                    jugador_id=jugador_id,
                    badge_type=BadgeType.TOURNAMENT_THIRD,
                    liga_id=liga_id,
                    torneo_id=torneo_id,
                    temporada=temporada,
                    metadata={"tournament_name": tournament.get("nombre")}
                )
                if badge:
                    awarded_badges.append(badge)
        
        return awarded_badges
    
    async def check_and_award_match_badges(
        self,
        jugador_id: str,
        liga_id: str,
        partido_id: str
    ) -> List[Dict]:
        """Verify y otorgar badges basados en estadísticas de partido"""
        awarded_badges = []
        
        # Get ranking of the player
        ranking = await self.ranking_repo.get_player_ranking(liga_id, jugador_id)
        if not ranking:
            return awarded_badges
        
        # Badge: Primera victoria
        if ranking.get("partidos_ganados") == 1:
            badge = await self.award_badge(
                jugador_id=jugador_id,
                badge_type=BadgeType.FIRST_WIN,
                liga_id=liga_id,
                partido_id=partido_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 5 win streak
        if ranking.get("racha_actual", 0) >= 5:
            badge = await self.award_badge(
                jugador_id=jugador_id,
                badge_type=BadgeType.WIN_STREAK_5,
                liga_id=liga_id,
                partido_id=partido_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 10 win streak
        if ranking.get("racha_actual", 0) >= 10:
            badge = await self.award_badge(
                jugador_id=jugador_id,
                badge_type=BadgeType.WIN_STREAK_10,
                liga_id=liga_id,
                partido_id=partido_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 50 partidos jugados
        if ranking.get("partidos_jugados") == 50:
            badge = await self.award_badge(
                jugador_id=jugador_id,
                badge_type=BadgeType.MATCHES_50,
                liga_id=liga_id
            )
            if badge:
                awarded_badges.append(badge)
        
        # Badge: 100 partidos jugados
        if ranking.get("partidos_jugados") == 100:
            badge = await self.award_badge(
                jugador_id=jugador_id,
                badge_type=BadgeType.MATCHES_100,
                liga_id=liga_id
            )
            if badge:
                awarded_badges.append(badge)
        
        return awarded_badges
    
    async def get_player_badges(self, jugador_id: str) -> List[Dict]:
        """Get todos los badges de un jugador"""
        badges = await self.badge_repo.get_player_badges(jugador_id)
        
        # Enrich with definitions
        for badge in badges:
            badge_def = BADGE_DEFINITIONS.get(badge.get("badge_type"), {})
            badge["rarity"] = badge_def.get("rarity", "common")
        
        return badges
    
    async def get_badge_leaderboard(self, liga_id: str = None, limit: int = 10) -> List[Dict]:
        """Get jugadores con más badges"""
        # This requires MongoDB aggregation
        pipeline = [
            {"$group": {
                "_id": "$jugador_id",
                "total_badges": {"$sum": 1},
                "legendary": {"$sum": {"$cond": [{"$in": ["$badge_type", [
                    BadgeType.TOURNAMENT_CHAMPION, BadgeType.SEASON_MVP
                ]]}, 1, 0]}},
                "epic": {"$sum": {"$cond": [{"$in": ["$badge_type", [
                    BadgeType.TOURNAMENT_RUNNER_UP, BadgeType.WIN_STREAK_10, BadgeType.MATCHES_100, BadgeType.COMEBACK_KING
                ]]}, 1, 0]}}
            }},
            {"$sort": {"legendary": -1, "epic": -1, "total_badges": -1}},
            {"$limit": limit}
        ]
        
        if liga_id:
            pipeline.insert(0, {"$match": {"liga_id": liga_id}})
        
        # Ejecutar agregación
        collection = self.badge_repo.collection
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=limit)
        
        # Enrich with player info
        for entry in results:
            player = await self.player_repo.get_by_id(entry["_id"])
            if player:
                entry["jugador_info"] = {
                    "nombre": player.get("nombre"),
                    "apodo": player.get("apodo")
                }
        
        return results
    
    async def get_recent_badges(self, limit: int = 20) -> List[Dict]:
        """Get badges más recientes (para feed)"""
        badges = await self.badge_repo.get_recent_badges(limit)
        
        # Enrich with player info
        for badge in badges:
            player = await self.player_repo.get_by_id(badge.get("jugador_id"))
            if player:
                badge["jugador_info"] = {
                    "nombre": player.get("nombre"),
                    "apodo": player.get("apodo")
                }
            badge_def = BADGE_DEFINITIONS.get(badge.get("badge_type"), {})
            badge["rarity"] = badge_def.get("rarity", "common")
        
        return badges
    
    # ============== PLAYER STATISTICS ==============
    
    async def get_player_statistics(self, jugador_id: str, liga_id: str = None) -> Dict:
        """Get statistics detalladas de un jugador"""
        
        # Info básica of the player
        player = await self.player_repo.get_by_id(jugador_id)
        if not player:
            return None
        
        # Get rankings from all leagues or specific one
        if liga_id:
            rankings = [await self.ranking_repo.get_player_ranking(liga_id, jugador_id)]
            rankings = [r for r in rankings if r]
        else:
            # Search in all active leagues
            leagues = await self.league_repo.get_all_leagues()
            rankings = []
            for league in leagues:
                ranking = await self.ranking_repo.get_player_ranking(league["liga_id"], jugador_id)
                if ranking:
                    ranking["liga_nombre"] = league.get("nombre")
                    rankings.append(ranking)
        
        # Get match history
        matches = await self.match_repo.find_many(
            query={
                "$or": [
                    {"jugador_a_id": jugador_id},
                    {"jugador_b_id": jugador_id}
                ],
                "estado": "finalizado"
            },
            sort=[("fecha_partido", -1)],
            limit=20
        )
        
        # Enrich matches with opponent info
        match_history = []
        for match in matches:
            is_player_a = match.get("jugador_a_id") == jugador_id
            opponent_id = match.get("jugador_b_id") if is_player_a else match.get("jugador_a_id")
            opponent = await self.player_repo.get_by_id(opponent_id)
            
            player_sets = match.get("sets_jugador_a") if is_player_a else match.get("sets_jugador_b")
            opponent_sets = match.get("sets_jugador_b") if is_player_a else match.get("sets_jugador_a")
            is_winner = match.get("ganador_id") == jugador_id
            
            match_history.append({
                "partido_id": match.get("partido_id"),
                "fecha": match.get("fecha_partido"),
                "opponent": {
                    "jugador_id": opponent_id,
                    "nombre": opponent.get("nombre") if opponent else "Desconocido",
                    "apodo": opponent.get("apodo") if opponent else None
                },
                "resultado": f"{player_sets}-{opponent_sets}",
                "is_winner": is_winner,
                "liga_id": match.get("liga_id"),
                "elo_change": match.get("elo_change_a") if is_player_a else match.get("elo_change_b")
            })
        
        # Get badges
        badges = await self.get_player_badges(jugador_id)
        
        # Calculatesr estadísticas agregadas
        total_matches = sum(r.get("partidos_jugados", 0) for r in rankings)
        total_wins = sum(r.get("partidos_ganados", 0) for r in rankings)
        total_losses = sum(r.get("partidos_perdidos", 0) for r in rankings)
        total_sets_won = sum(r.get("sets_ganados", 0) for r in rankings)
        total_sets_lost = sum(r.get("sets_perdidos", 0) for r in rankings)
        best_streak = max((r.get("mejor_racha", 0) for r in rankings), default=0)
        
        win_rate = (total_wins / total_matches * 100) if total_matches > 0 else 0
        set_win_rate = (total_sets_won / (total_sets_won + total_sets_lost) * 100) if (total_sets_won + total_sets_lost) > 0 else 0
        
        # Form streak (last 10 matches)
        recent_form = []
        for m in match_history[:10]:
            recent_form.append("W" if m["is_winner"] else "L")
        
        return {
            "jugador_id": jugador_id,
            "player_info": {
                "nombre": player.get("nombre"),
                "apellido": player.get("apellido"),
                "apodo": player.get("apodo"),
                "nivel": player.get("nivel"),
                "foto_url": player.get("foto_url"),
                "fecha_registro": player.get("fecha_registro") or player.get("created_at"),
                "elo_rating": player.get("elo_rating", 1000)
            },
            "overall_stats": {
                "total_matches": total_matches,
                "wins": total_wins,
                "losses": total_losses,
                "win_rate": round(win_rate, 1),
                "sets_won": total_sets_won,
                "sets_lost": total_sets_lost,
                "set_win_rate": round(set_win_rate, 1),
                "best_streak": best_streak,
                "leagues_played": len(rankings)
            },
            "league_rankings": rankings,
            "match_history": match_history,
            "badges": badges,
            "recent_form": recent_form,
            "badge_count": {
                "total": len(badges),
                "legendary": sum(1 for b in badges if b.get("rarity") == "legendary"),
                "epic": sum(1 for b in badges if b.get("rarity") == "epic"),
                "rare": sum(1 for b in badges if b.get("rarity") == "rare"),
                "common": sum(1 for b in badges if b.get("rarity") == "common")
            }
        }
    
    async def get_head_to_head(self, jugador_a_id: str, jugador_b_id: str) -> Dict:
        """Get head-to-head statistics directos entre dos jugadores"""
        
        matches = await self.match_repo.find_many(
            query={
                "$or": [
                    {"jugador_a_id": jugador_a_id, "jugador_b_id": jugador_b_id},
                    {"jugador_a_id": jugador_b_id, "jugador_b_id": jugador_a_id}
                ],
                "estado": "finalizado"
            },
            sort=[("fecha_partido", -1)]
        )
        
        player_a = await self.player_repo.get_by_id(jugador_a_id)
        player_b = await self.player_repo.get_by_id(jugador_b_id)
        
        wins_a = 0
        wins_b = 0
        sets_a = 0
        sets_b = 0
        
        for match in matches:
            is_a_first = match.get("jugador_a_id") == jugador_a_id
            
            if match.get("ganador_id") == jugador_a_id:
                wins_a += 1
            else:
                wins_b += 1
            
            if is_a_first:
                sets_a += match.get("sets_jugador_a", 0)
                sets_b += match.get("sets_jugador_b", 0)
            else:
                sets_a += match.get("sets_jugador_b", 0)
                sets_b += match.get("sets_jugador_a", 0)
        
        return {
            "player_a": {
                "jugador_id": jugador_a_id,
                "nombre": player_a.get("nombre") if player_a else "Desconocido",
                "apodo": player_a.get("apodo") if player_a else None,
                "wins": wins_a,
                "sets": sets_a
            },
            "player_b": {
                "jugador_id": jugador_b_id,
                "nombre": player_b.get("nombre") if player_b else "Desconocido",
                "apodo": player_b.get("apodo") if player_b else None,
                "wins": wins_b,
                "sets": sets_b
            },
            "total_matches": len(matches),
            "matches": [{
                "partido_id": m.get("partido_id"),
                "fecha": m.get("fecha_partido"),
                "ganador_id": m.get("ganador_id"),
                "score": f"{m.get('sets_jugador_a')}-{m.get('sets_jugador_b')}"
            } for m in matches[:10]]
        }
    
    # ============== QUICK TOURNAMENT (TORNEO RELÁMPAGO) ==============
    
    async def create_quick_tournament(
        self,
        liga_id: str,
        nombre: str = None,
        pairing_mode: str = "random",  # random, by_ranking, swiss
        match_format: str = "best_of_1",  # best_of_1, best_of_3
        points_per_set: int = 11
    ) -> Dict:
        """
        Crear torneo relámpago con jugadores that hasn check-in activo.
        
        pairing_mode:
        - random: Emparejar aleatoriamente
        - by_ranking: Mejor vs Peor ranking
        - swiss: Sistema suizo (similar nivel)
        """
        import random
        from datetime import datetime, timezone
        
        # Get players with active check-in
        available_players = await self.get_available_players(liga_id)
        
        if len(available_players) < 2:
            raise ValueError("Se necesitan al menos 2 jugadores con check-in activo")
        
        # Get ranking info for each player
        players_with_ranking = []
        for checkin in available_players:
            jugador_id = checkin.get("jugador_id")
            ranking = await self.ranking_repo.get_player_ranking(liga_id, jugador_id)
            player = await self.player_repo.get_by_id(jugador_id)
            
            players_with_ranking.append({
                "jugador_id": jugador_id,
                "jugador_info": {
                    "nombre": player.get("nombre") if player else "Desconocido",
                    "apodo": player.get("apodo") if player else None
                },
                "elo": ranking.get("elo_rating", 1000) if ranking else 1000,
                "posicion": ranking.get("posicion", 999) if ranking else 999
            })
        
        # Sort and pair according to mode
        if pairing_mode == "by_ranking":
            # Ordenar por posición (mejor primero)
            players_with_ranking.sort(key=lambda x: x["posicion"])
        elif pairing_mode == "swiss":
            # Ordenar por ELO (similar nivel)
            players_with_ranking.sort(key=lambda x: x["elo"])
        else:
            # Random
            random.shuffle(players_with_ranking)
        
        # Create emparejamientos
        pairings = []
        used_players = set()
        
        if pairing_mode == "by_ranking":
            # Mejor vs Peor
            n = len(players_with_ranking)
            for i in range(n // 2):
                player_a = players_with_ranking[i]
                player_b = players_with_ranking[n - 1 - i]
                pairings.append((player_a, player_b))
        elif pairing_mode == "swiss":
            # Players of similar level
            for i in range(0, len(players_with_ranking) - 1, 2):
                pairings.append((players_with_ranking[i], players_with_ranking[i + 1]))
        else:
            # Random pairs
            for i in range(0, len(players_with_ranking) - 1, 2):
                pairings.append((players_with_ranking[i], players_with_ranking[i + 1]))
        
        # Player sin pareja (si número impar)
        bye_player = None
        if len(players_with_ranking) % 2 == 1:
            bye_player = players_with_ranking[-1]
        
        # Create the matches
        created_matches = []
        mejor_de = 1 if match_format == "best_of_1" else 3
        
        for player_a, player_b in pairings:
            match_data = SuperPinMatchCreate(
                liga_id=liga_id,
                jugador_a_id=player_a["jugador_id"],
                jugador_b_id=player_b["jugador_id"],
                mejor_de=mejor_de,
                puntos_por_set=points_per_set,
                match_type="quick"
            )
            
            match = await self.create_match(match_data)
            # Iniciar the match automáticamente
            await self.start_match(match.partido_id)
            
            created_matches.append({
                "partido_id": match.partido_id,
                "jugador_a": player_a,
                "jugador_b": player_b,
                "estado": "en_curso"
            })
        
        # Generate name of the torneo
        if not nombre:
            nombre = f"Torneo Relámpago {datetime.now(timezone.utc).strftime('%H:%M')}"
        
        quick_tournament = {
            "quick_tournament_id": f"qt_{uuid.uuid4().hex[:12]}",
            "liga_id": liga_id,
            "nombre": nombre,
            "pairing_mode": pairing_mode,
            "match_format": match_format,
            "total_players": len(players_with_ranking),
            "total_matches": len(created_matches),
            "matches": created_matches,
            "bye_player": bye_player,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "estado": "en_curso"
        }
        
        self.log_info(f"Quick tournament created: {quick_tournament['quick_tournament_id']} with {len(created_matches)} matches")
        
        return quick_tournament
    
    async def get_quick_tournament_status(self, liga_id: str) -> Dict:
        """Get estado de partidos rápidos activos en una liga"""
        # Search ongoing quick matches
        active_matches = await self.match_repo.find_many(
            query={
                "liga_id": liga_id,
                "match_type": "quick",
                "estado": {"$in": ["pendiente", "en_curso"]}
            },
            sort=[("created_at", -1)]
        )
        
        finished_today = await self.match_repo.find_many(
            query={
                "liga_id": liga_id,
                "match_type": "quick",
                "estado": "finalizado"
            },
            sort=[("fecha_partido", -1)],
            limit=20
        )
        
        # Enrich with player info
        for match in active_matches + finished_today:
            player_a = await self.player_repo.get_by_id(match.get("jugador_a_id"))
            player_b = await self.player_repo.get_by_id(match.get("jugador_b_id"))
            match["jugador_a_info"] = {"nombre": player_a.get("nombre") if player_a else "?"} 
            match["jugador_b_info"] = {"nombre": player_b.get("nombre") if player_b else "?"}
        
        return {
            "active_matches": active_matches,
            "finished_today": finished_today,
            "total_active": len(active_matches)
        }

    # ============== HEAD-TO-HEAD PREDICTOR ==============
    
    async def predict_match(self, jugador_a_id: str, jugador_b_id: str) -> Dict:
        """
        Predice el resultado de un partido entre dos jugadores.
        Usa ELO rating, historial de enfrentamientos y racha actual.
        """
        # Get stats for both players
        stats_a = await self.get_player_statistics(jugador_a_id)
        stats_b = await self.get_player_statistics(jugador_b_id)
        
        if not stats_a or not stats_b:
            return {"error": "Jugador not found"}
        
        # Get historial head-to-head
        h2h = await self.get_head_to_head(jugador_a_id, jugador_b_id)
        
        # Calculate probability based on ELO
        elo_a = stats_a.get("player_info", {}).get("elo_rating", 1200)
        elo_b = stats_b.get("player_info", {}).get("elo_rating", 1200)
        
        # ELO expected probability formula
        expected_a = 1 / (1 + math.pow(10, (elo_b - elo_a) / 400))
        expected_b = 1 - expected_a
        
        # Ajustar por historial H2H
        h2h_adjustment = 0
        if h2h.get("total_matches", 0) > 0:
            wins_a = h2h.get("player_a_wins", 0)
            wins_b = h2h.get("player_b_wins", 0)
            total = wins_a + wins_b
            if total > 0:
                # Adjustment factor based on H2H (máx ±10%)
                h2h_ratio = (wins_a - wins_b) / total
                h2h_adjustment = h2h_ratio * 0.10
        
        # Ajustar por racha actual
        streak_adjustment = 0
        streak_a = stats_a.get("overall_stats", {}).get("best_streak", 0)
        streak_b = stats_b.get("overall_stats", {}).get("best_streak", 0)
        
        # Racha positiva da pequeña ventaja (máx ±5%)
        if streak_a > 0 and streak_b <= 0:
            streak_adjustment = min(streak_a * 0.01, 0.05)
        elif streak_b > 0 and streak_a <= 0:
            streak_adjustment = -min(streak_b * 0.01, 0.05)
        
        # Probabilidad final ajustada
        prob_a = max(0.05, min(0.95, expected_a + h2h_adjustment + streak_adjustment))
        prob_b = 1 - prob_a
        
        # Determinar favorito
        if prob_a > prob_b:
            favorite = "player_a"
            confidence = "high" if prob_a > 0.7 else "medium" if prob_a > 0.55 else "low"
        elif prob_b > prob_a:
            favorite = "player_b"
            confidence = "high" if prob_b > 0.7 else "medium" if prob_b > 0.55 else "low"
        else:
            favorite = "draw"
            confidence = "low"
        
        # Calculatesr ventajas por categoría
        advantages = []
        
        # ELO
        if elo_a > elo_b + 50:
            advantages.append({"category": "elo", "player": "a", "detail": f"+{elo_a - elo_b} ELO"})
        elif elo_b > elo_a + 50:
            advantages.append({"category": "elo", "player": "b", "detail": f"+{elo_b - elo_a} ELO"})
        
        # Win Rate
        wr_a = stats_a.get("overall_stats", {}).get("win_rate", 0)
        wr_b = stats_b.get("overall_stats", {}).get("win_rate", 0)
        if wr_a > wr_b + 5:
            advantages.append({"category": "win_rate", "player": "a", "detail": f"{wr_a:.0f}% vs {wr_b:.0f}%"})
        elif wr_b > wr_a + 5:
            advantages.append({"category": "win_rate", "player": "b", "detail": f"{wr_b:.0f}% vs {wr_a:.0f}%"})
        
        # H2H
        if h2h.get("total_matches", 0) >= 3:
            wins_a = h2h.get("player_a_wins", 0)
            wins_b = h2h.get("player_b_wins", 0)
            if wins_a > wins_b:
                advantages.append({"category": "h2h", "player": "a", "detail": f"{wins_a}-{wins_b} en H2H"})
            elif wins_b > wins_a:
                advantages.append({"category": "h2h", "player": "b", "detail": f"{wins_b}-{wins_a} en H2H"})
        
        return {
            "player_a": {
                "jugador_id": jugador_a_id,
                "nombre": stats_a.get("player_info", {}).get("nombre", "?"),
                "apodo": stats_a.get("player_info", {}).get("apodo"),
                "elo": elo_a,
                "win_rate": wr_a,
                "probability": round(prob_a * 100, 1)
            },
            "player_b": {
                "jugador_id": jugador_b_id,
                "nombre": stats_b.get("player_info", {}).get("nombre", "?"),
                "apodo": stats_b.get("player_info", {}).get("apodo"),
                "elo": elo_b,
                "win_rate": wr_b,
                "probability": round(prob_b * 100, 1)
            },
            "prediction": {
                "favorite": favorite,
                "confidence": confidence,
                "probability_a": round(prob_a * 100, 1),
                "probability_b": round(prob_b * 100, 1)
            },
            "factors": {
                "elo_based": round(expected_a * 100, 1),
                "h2h_adjustment": round(h2h_adjustment * 100, 1),
                "streak_adjustment": round(streak_adjustment * 100, 1)
            },
            "advantages": advantages,
            "head_to_head": h2h
        }


# Singleton instance
superpin_service = SuperPinService()
