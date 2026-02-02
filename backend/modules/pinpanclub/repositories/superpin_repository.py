"""
Super Pin Ranking - Repositories
Acceso a datos para el system for ranking
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from core.base import BaseRepository
from core.database import db
from core.constants import PinpanClubCollections


class SuperPinLeagueRepository(BaseRepository):
    """
    Repository para ligas Super Pin.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_LEAGUES
    ID_FIELD = "liga_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, league_data: Dict) -> Dict:
        """Create new league"""
        league_data["liga_id"] = f"liga_{uuid.uuid4().hex[:12]}"
        league_data["created_at"] = datetime.now(timezone.utc).isoformat()
        league_data["updated_at"] = league_data["created_at"]
        league_data["total_partidos"] = 0
        league_data["total_jugadores"] = 0
        return await self.insert_one(league_data)
    
    async def get_by_id(self, liga_id: str) -> Optional[Dict]:
        """Get liga by ID"""
        return await self.find_one({self.ID_FIELD: liga_id})
    
    async def get_active_leagues(self) -> List[Dict]:
        """Get ligas activas"""
        return await self.find_many(
            query={"estado": "active"},
            sort=[("created_at", -1)]
        )
    
    async def get_all_leagues(self, limit: int = 50) -> List[Dict]:
        """Get all leagues"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_league(self, liga_id: str, data: Dict) -> bool:
        """Update liga"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, liga_id, data)
    
    async def increment_stats(self, liga_id: str, partidos: int = 0, jugadores: int = 0) -> bool:
        """Incrementar estadísticas of the league"""
        update = {}
        if partidos:
            update["total_partidos"] = partidos
        if jugadores:
            update["total_jugadores"] = jugadores
        
        if update:
            result = await self._collection.update_one(
                {"liga_id": liga_id},
                {"$inc": update, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return result.modified_count > 0
        return False


class PlayerCheckInRepository(BaseRepository):
    """
    Repository para check-ins de jugadores.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_CHECKINS
    ID_FIELD = "checkin_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, checkin_data: Dict) -> Dict:
        """Create nuevo check-in"""
        checkin_data["checkin_id"] = f"checkin_{uuid.uuid4().hex[:12]}"
        checkin_data["check_in_time"] = datetime.now(timezone.utc).isoformat()
        checkin_data["is_active"] = True
        return await self.insert_one(checkin_data)
    
    async def get_active_checkins(self, liga_id: str) -> List[Dict]:
        """Get jugadores actualmente en el club"""
        return await self.find_many(
            query={"liga_id": liga_id, "is_active": True},
            sort=[("check_in_time", -1)]
        )
    
    async def get_player_checkin(self, liga_id: str, jugador_id: str) -> Optional[Dict]:
        """Get check-in activo de un jugador"""
        return await self.find_one({
            "liga_id": liga_id,
            "jugador_id": jugador_id,
            "is_active": True
        })
    
    async def checkout(self, checkin_id: str) -> bool:
        """Hacer checkout"""
        result = await self._collection.update_one(
            {"checkin_id": checkin_id},
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0
    
    async def checkout_by_player(self, liga_id: str, jugador_id: str) -> bool:
        """Hacer checkout by player"""
        result = await self._collection.update_many(
            {"liga_id": liga_id, "jugador_id": jugador_id, "is_active": True},
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0
    
    async def auto_checkout_expired(self, hours: int = 8) -> int:
        """Checkout automático de check-ins expirados"""
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
        result = await self._collection.update_many(
            {"is_active": True, "check_in_time": {"$lt": cutoff}},
            {"$set": {
                "is_active": False,
                "check_out_time": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count


class SuperPinMatchRepository(BaseRepository):
    """
    Repository para partidos Super Pin.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_MATCHES
    ID_FIELD = "partido_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, match_data: Dict) -> Dict:
        """Create new match"""
        match_data["partido_id"] = f"spm_{uuid.uuid4().hex[:12]}"
        match_data["created_at"] = datetime.now(timezone.utc).isoformat()
        match_data["updated_at"] = match_data["created_at"]
        match_data["estado"] = "pendiente"
        return await self.insert_one(match_data)
    
    async def get_by_id(self, partido_id: str) -> Optional[Dict]:
        """Get partido by ID"""
        return await self.find_one({self.ID_FIELD: partido_id})
    
    async def get_league_matches(
        self,
        liga_id: str,
        estado: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict]:
        """Get partidos de una liga"""
        query = {"liga_id": liga_id}
        if estado:
            query["estado"] = estado
        
        return await self.find_many(
            query=query,
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def get_player_matches(
        self,
        liga_id: str,
        jugador_id: str,
        limit: int = 50
    ) -> List[Dict]:
        """Get partidos de un jugador en una liga"""
        return await self.find_many(
            query={
                "liga_id": liga_id,
                "$or": [
                    {"jugador_a_id": jugador_id},
                    {"jugador_b_id": jugador_id}
                ]
            },
            limit=limit,
            sort=[("created_at", -1)]
        )
    
    async def update_match(self, partido_id: str, data: Dict) -> bool:
        """Update partido"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, partido_id, data)
    
    async def get_head_to_head(
        self,
        liga_id: str,
        jugador_a_id: str,
        jugador_b_id: str
    ) -> List[Dict]:
        """Get historial entre dos jugadores"""
        return await self.find_many(
            query={
                "liga_id": liga_id,
                "estado": "finalizado",
                "$or": [
                    {"jugador_a_id": jugador_a_id, "jugador_b_id": jugador_b_id},
                    {"jugador_a_id": jugador_b_id, "jugador_b_id": jugador_a_id}
                ]
            },
            sort=[("fecha_fin", -1)]
        )


class RankingRepository(BaseRepository):
    """
    Repository para el ranking.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_RANKINGS
    ID_FIELD = "ranking_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def get_or_create(
        self,
        liga_id: str,
        jugador_id: str,
        jugador_info: Optional[Dict] = None
    ) -> Dict:
        """Get o crear entrada de ranking"""
        existing = await self.find_one({
            "liga_id": liga_id,
            "jugador_id": jugador_id
        })
        
        if existing:
            return existing
        
        # Obtener última posición
        count = await self.count({"liga_id": liga_id})
        
        new_entry = {
            "ranking_id": f"rank_{uuid.uuid4().hex[:12]}",
            "liga_id": liga_id,
            "jugador_id": jugador_id,
            "posicion": count + 1,
            "puntos_totales": 0,
            "elo_rating": 1000,
            "partidos_jugados": 0,
            "partidos_ganados": 0,
            "partidos_perdidos": 0,
            "sets_ganados": 0,
            "sets_perdidos": 0,
            "racha_actual": 0,
            "mejor_racha": 0,
            "jugador_info": jugador_info,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        return await self.insert_one(new_entry)
    
    async def get_league_ranking(self, liga_id: str, limit: int = 100) -> List[Dict]:
        """Get ranking completo de una liga"""
        return await self.find_many(
            query={"liga_id": liga_id},
            limit=limit,
            sort=[("posicion", 1)]
        )
    
    async def get_player_ranking(self, liga_id: str, jugador_id: str) -> Optional[Dict]:
        """Get posición de un jugador"""
        return await self.find_one({
            "liga_id": liga_id,
            "jugador_id": jugador_id
        })
    
    async def update_ranking(self, ranking_id: str, data: Dict) -> bool:
        """Update entrada de ranking"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, ranking_id, data)
    
    async def recalculate_positions(self, liga_id: str, scoring_system: str = "simple") -> bool:
        """Recalcular posiciones del ranking"""
        # Obtener todos los rankings of the league
        rankings = await self.find_many(
            query={"liga_id": liga_id},
            limit=1000
        )
        
        # Ordenar según el system for puntuación
        if scoring_system == "elo":
            rankings.sort(key=lambda x: x.get("elo_rating", 0), reverse=True)
        else:
            rankings.sort(key=lambda x: (
                x.get("puntos_totales", 0),
                x.get("partidos_ganados", 0) - x.get("partidos_perdidos", 0),
                x.get("sets_ganados", 0) - x.get("sets_perdidos", 0)
            ), reverse=True)
        
        # Update posiciones
        for i, entry in enumerate(rankings):
            old_pos = entry.get("posicion", i + 1)
            new_pos = i + 1
            
            await self._collection.update_one(
                {"ranking_id": entry["ranking_id"]},
                {"$set": {
                    "posicion": new_pos,
                    "posicion_anterior": old_pos,
                    "cambio_posicion": old_pos - new_pos,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return True


class SeasonTournamentRepository(BaseRepository):
    """
    Repository para torneos de temporada.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_TOURNAMENTS
    ID_FIELD = "torneo_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, tournament_data: Dict) -> Dict:
        """Create new tournament de temporada"""
        tournament_data["torneo_id"] = f"torneo_{uuid.uuid4().hex[:12]}"
        tournament_data["created_at"] = datetime.now(timezone.utc).isoformat()
        tournament_data["updated_at"] = tournament_data["created_at"]
        tournament_data["estado"] = "pendiente"
        return await self.insert_one(tournament_data)
    
    async def get_by_id(self, torneo_id: str) -> Optional[Dict]:
        """Get torneo by ID"""
        return await self.find_one({self.ID_FIELD: torneo_id})
    
    async def get_league_tournaments(self, liga_id: str) -> List[Dict]:
        """Get torneos de una liga"""
        return await self.find_many(
            query={"liga_id": liga_id},
            sort=[("created_at", -1)]
        )
    
    async def update_tournament(self, torneo_id: str, data: Dict) -> bool:
        """Update torneo"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, torneo_id, data)


class PlayerBadgeRepository(BaseRepository):
    """
    Repository para badges de jugadores.
    """
    
    COLLECTION_NAME = PinpanClubCollections.SUPERPIN_BADGES
    ID_FIELD = "badge_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, badge_data: Dict) -> Dict:
        """Create nuevo badge"""
        badge_data["badge_id"] = f"badge_{uuid.uuid4().hex[:12]}"
        badge_data["earned_at"] = datetime.now(timezone.utc).isoformat()
        return await self.insert_one(badge_data)
    
    async def get_by_id(self, badge_id: str) -> Optional[Dict]:
        """Get badge by ID"""
        return await self.find_one({self.ID_FIELD: badge_id})
    
    async def get_player_badges(self, jugador_id: str) -> List[Dict]:
        """Get todos los badges de un jugador"""
        return await self.find_many(
            query={"jugador_id": jugador_id},
            sort=[("earned_at", -1)]
        )
    
    async def get_badge_by_type(self, jugador_id: str, badge_type: str, **filters) -> Optional[Dict]:
        """Verify si un jugador ya tiene un badge específico"""
        query = {"jugador_id": jugador_id, "badge_type": badge_type}
        query.update(filters)
        return await self.find_one(query)
    
    async def count_badges_by_type(self, jugador_id: str, badge_type: str) -> int:
        """Contar badges de un tipo para un jugador"""
        return await self.count({"jugador_id": jugador_id, "badge_type": badge_type})
    
    async def get_recent_badges(self, limit: int = 20) -> List[Dict]:
        """Get badges más recientes (para feed)"""
        return await self.find_many(
            query={},
            limit=limit,
            sort=[("earned_at", -1)]
        )
    
    async def get_league_badges(self, liga_id: str) -> List[Dict]:
        """Get todos los badges de una liga"""
        return await self.find_many(
            query={"liga_id": liga_id},
            sort=[("earned_at", -1)]
        )
