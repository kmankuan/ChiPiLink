"""
Ping Pong Club Module - Backend Routes
Sistema de torneos, partidos, arbitraje y estadísticas en tiempo real
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from bson import ObjectId
import uuid

# Router
pingpong_router = APIRouter(prefix="/pingpong", tags=["Ping Pong Club"])

# ============== MODELS ==============

class PlayerBase(BaseModel):
    """Modelo de jugador de ping pong"""
    nombre: str
    apellido: Optional[str] = None
    apodo: Optional[str] = None  # Nickname
    foto_url: Optional[str] = None
    nivel: str = "principiante"  # principiante, intermedio, avanzado, profesional
    mano_dominante: str = "derecha"  # derecha, izquierda
    estilo_juego: Optional[str] = None  # ofensivo, defensivo, all-round
    email: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool = True

class Player(PlayerBase):
    model_config = ConfigDict(extra="ignore")
    jugador_id: str = Field(default_factory=lambda: f"jugador_{uuid.uuid4().hex[:12]}")
    # Stats
    partidos_jugados: int = 0
    partidos_ganados: int = 0
    partidos_perdidos: int = 0
    sets_ganados: int = 0
    sets_perdidos: int = 0
    puntos_favor: int = 0
    puntos_contra: int = 0
    elo_rating: int = 1000  # Sistema ELO
    racha_actual: int = 0  # Positivo = victorias, Negativo = derrotas
    mejor_racha: int = 0
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TournamentBase(BaseModel):
    """Modelo de torneo"""
    nombre: str
    descripcion: Optional[str] = None
    fecha_inicio: datetime
    fecha_fin: Optional[datetime] = None
    lugar: Optional[str] = None
    formato: str = "eliminacion_directa"  # eliminacion_directa, round_robin, suizo, grupos
    tipo_partido: str = "mejor_de_3"  # mejor_de_1, mejor_de_3, mejor_de_5, mejor_de_7
    puntos_por_set: int = 11
    diferencia_minima: int = 2  # Diferencia mínima para ganar set
    max_participantes: Optional[int] = None
    premio: Optional[str] = None
    imagen_url: Optional[str] = None

class Tournament(TournamentBase):
    model_config = ConfigDict(extra="ignore")
    torneo_id: str = Field(default_factory=lambda: f"torneo_{uuid.uuid4().hex[:12]}")
    estado: str = "inscripcion"  # inscripcion, en_curso, finalizado, cancelado
    participantes: List[str] = []  # Lista de jugador_ids
    bracket: Optional[Dict] = None  # Estructura del bracket
    ganador_id: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchBase(BaseModel):
    """Modelo de partido"""
    torneo_id: Optional[str] = None
    jugador_a_id: str
    jugador_b_id: str
    mesa: Optional[str] = None  # Número o nombre de mesa
    ronda: Optional[str] = None  # "Semifinal", "Final", etc.
    tipo_partido: str = "mejor_de_3"
    puntos_por_set: int = 11
    diferencia_minima: int = 2
    arbitro_id: Optional[str] = None

class Match(MatchBase):
    model_config = ConfigDict(extra="ignore")
    partido_id: str = Field(default_factory=lambda: f"partido_{uuid.uuid4().hex[:12]}")
    estado: str = "pendiente"  # pendiente, en_curso, pausado, finalizado, cancelado
    # Score actual
    sets_jugador_a: int = 0
    sets_jugador_b: int = 0
    puntos_jugador_a: int = 0  # Puntos en set actual
    puntos_jugador_b: int = 0
    set_actual: int = 1
    # Historial de sets
    sets_detalle: List[Dict] = []  # [{set: 1, puntos_a: 11, puntos_b: 9, ganador: "a"}, ...]
    # Historial de puntos (para estadísticas detalladas)
    historial_puntos: List[Dict] = []  # [{tiempo, set, punto_a, punto_b, anotador, tipo}, ...]
    # Saque
    saque: str = "a"  # "a" o "b"
    primer_saque: str = "a"
    # Tiempos
    fecha_inicio: Optional[datetime] = None
    fecha_fin: Optional[datetime] = None
    duracion_segundos: Optional[int] = None
    # Stats del partido
    rachas: Dict = {}  # {"max_racha_a": 5, "max_racha_b": 3, ...}
    ganador_id: Optional[str] = None
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MatchConfig(BaseModel):
    """Configuración de partido"""
    tipo_partido: str = "mejor_de_3"  # mejor_de_1, mejor_de_3, mejor_de_5, mejor_de_7
    puntos_por_set: int = 11
    diferencia_minima: int = 2
    cambio_saque_cada: int = 2  # Puntos para cambiar saque
    timeout_permitidos: int = 1  # Por set
    duracion_timeout: int = 60  # Segundos

# ============== HELPER FUNCTIONS ==============

def calcular_sets_necesarios(tipo_partido: str) -> int:
    """Calcula sets necesarios para ganar"""
    mapping = {
        "mejor_de_1": 1,
        "mejor_de_3": 2,
        "mejor_de_5": 3,
        "mejor_de_7": 4
    }
    return mapping.get(tipo_partido, 2)

def calcular_estadisticas_partido(historial_puntos: List[Dict]) -> Dict:
    """Calcula estadísticas avanzadas del partido"""
    if not historial_puntos:
        return {}
    
    stats = {
        "total_puntos": len(historial_puntos),
        "puntos_a": 0,
        "puntos_b": 0,
        "max_racha_a": 0,
        "max_racha_b": 0,
        "racha_actual_a": 0,
        "racha_actual_b": 0,
        "remontadas_a": 0,
        "remontadas_b": 0,
        "mayor_desventaja_superada_a": 0,
        "mayor_desventaja_superada_b": 0
    }
    
    racha_a = 0
    racha_b = 0
    max_desventaja_a = 0
    max_desventaja_b = 0
    
    puntos_a = 0
    puntos_b = 0
    
    for punto in historial_puntos:
        anotador = punto.get("anotador")
        
        if anotador == "a":
            puntos_a += 1
            stats["puntos_a"] += 1
            racha_a += 1
            racha_b = 0
            if racha_a > stats["max_racha_a"]:
                stats["max_racha_a"] = racha_a
        else:
            puntos_b += 1
            stats["puntos_b"] += 1
            racha_b += 1
            racha_a = 0
            if racha_b > stats["max_racha_b"]:
                stats["max_racha_b"] = racha_b
        
        # Calcular desventaja
        diff = puntos_a - puntos_b
        if diff < 0 and abs(diff) > max_desventaja_a:
            max_desventaja_a = abs(diff)
        if diff > 0 and diff > max_desventaja_b:
            max_desventaja_b = diff
    
    stats["racha_actual_a"] = racha_a
    stats["racha_actual_b"] = racha_b
    stats["mayor_desventaja_superada_a"] = max_desventaja_a
    stats["mayor_desventaja_superada_b"] = max_desventaja_b
    
    return stats

def calcular_elo(rating_a: int, rating_b: int, resultado: str, k: int = 32) -> tuple:
    """Calcula nuevo rating ELO para ambos jugadores"""
    expected_a = 1 / (1 + 10 ** ((rating_b - rating_a) / 400))
    expected_b = 1 - expected_a
    
    if resultado == "a":
        score_a, score_b = 1, 0
    elif resultado == "b":
        score_a, score_b = 0, 1
    else:
        score_a, score_b = 0.5, 0.5
    
    new_rating_a = round(rating_a + k * (score_a - expected_a))
    new_rating_b = round(rating_b + k * (score_b - expected_b))
    
    return new_rating_a, new_rating_b

# ============== DATABASE DEPENDENCY ==============

async def get_db():
    from server import db
    return db

# ============== PLAYER ROUTES ==============

@pingpong_router.get("/players")
async def get_players(
    activo: Optional[bool] = None,
    nivel: Optional[str] = None,
    orden: str = "elo_rating",
    limit: int = 100
):
    """Obtener lista de jugadores"""
    from server import db
    
    query = {}
    if activo is not None:
        query["activo"] = activo
    if nivel:
        query["nivel"] = nivel
    
    sort_field = orden if orden in ["elo_rating", "nombre", "partidos_ganados"] else "elo_rating"
    sort_order = -1 if sort_field == "elo_rating" else 1
    
    players = await db.pingpong_players.find(query, {"_id": 0}).sort(sort_field, sort_order).to_list(limit)
    return players

@pingpong_router.get("/players/{jugador_id}")
async def get_player(jugador_id: str):
    """Obtener un jugador por ID"""
    from server import db
    
    player = await db.pingpong_players.find_one({"jugador_id": jugador_id}, {"_id": 0})
    if not player:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    return player

@pingpong_router.post("/players")
async def create_player(player: dict):
    """Crear nuevo jugador"""
    from server import db
    
    doc = {
        "jugador_id": f"jugador_{uuid.uuid4().hex[:12]}",
        "nombre": player.get("nombre"),
        "apellido": player.get("apellido"),
        "apodo": player.get("apodo"),
        "foto_url": player.get("foto_url"),
        "nivel": player.get("nivel", "principiante"),
        "mano_dominante": player.get("mano_dominante", "derecha"),
        "estilo_juego": player.get("estilo_juego"),
        "email": player.get("email"),
        "telefono": player.get("telefono"),
        "activo": True,
        "partidos_jugados": 0,
        "partidos_ganados": 0,
        "partidos_perdidos": 0,
        "sets_ganados": 0,
        "sets_perdidos": 0,
        "puntos_favor": 0,
        "puntos_contra": 0,
        "elo_rating": 1000,
        "racha_actual": 0,
        "mejor_racha": 0,
        "fecha_registro": datetime.now(timezone.utc)
    }
    
    await db.pingpong_players.insert_one(doc)
    del doc["_id"]
    return doc

@pingpong_router.put("/players/{jugador_id}")
async def update_player(jugador_id: str, player: dict):
    """Actualizar jugador"""
    from server import db
    
    update_data = {k: v for k, v in player.items() if k not in ["jugador_id", "_id", "fecha_registro"]}
    
    result = await db.pingpong_players.update_one(
        {"jugador_id": jugador_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Jugador no encontrado")
    
    updated = await db.pingpong_players.find_one({"jugador_id": jugador_id}, {"_id": 0})
    return updated

@pingpong_router.get("/rankings")
async def get_rankings(limit: int = 50):
    """Obtener ranking de jugadores por ELO"""
    from server import db
    
    players = await db.pingpong_players.find(
        {"activo": True, "partidos_jugados": {"$gt": 0}},
        {"_id": 0}
    ).sort("elo_rating", -1).to_list(limit)
    
    # Agregar posición
    for i, player in enumerate(players):
        player["posicion"] = i + 1
    
    return players

# ============== TOURNAMENT ROUTES ==============

@pingpong_router.get("/tournaments")
async def get_tournaments(estado: Optional[str] = None, limit: int = 50):
    """Obtener lista de torneos"""
    from server import db
    
    query = {}
    if estado:
        query["estado"] = estado
    
    tournaments = await db.pingpong_tournaments.find(query, {"_id": 0}).sort("fecha_inicio", -1).to_list(limit)
    return tournaments

@pingpong_router.get("/tournaments/{torneo_id}")
async def get_tournament(torneo_id: str):
    """Obtener un torneo por ID"""
    from server import db
    
    tournament = await db.pingpong_tournaments.find_one({"torneo_id": torneo_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    
    # Obtener información de participantes
    if tournament.get("participantes"):
        players = await db.pingpong_players.find(
            {"jugador_id": {"$in": tournament["participantes"]}},
            {"_id": 0, "jugador_id": 1, "nombre": 1, "apellido": 1, "apodo": 1, "elo_rating": 1, "foto_url": 1}
        ).to_list(100)
        tournament["participantes_info"] = players
    
    return tournament

@pingpong_router.post("/tournaments")
async def create_tournament(tournament: dict):
    """Crear nuevo torneo"""
    from server import db
    
    fecha_inicio = tournament.get("fecha_inicio")
    if isinstance(fecha_inicio, str):
        fecha_inicio = datetime.fromisoformat(fecha_inicio.replace('Z', '+00:00'))
    
    fecha_fin = tournament.get("fecha_fin")
    if isinstance(fecha_fin, str):
        fecha_fin = datetime.fromisoformat(fecha_fin.replace('Z', '+00:00'))
    
    doc = {
        "torneo_id": f"torneo_{uuid.uuid4().hex[:12]}",
        "nombre": tournament.get("nombre"),
        "descripcion": tournament.get("descripcion"),
        "fecha_inicio": fecha_inicio,
        "fecha_fin": fecha_fin,
        "lugar": tournament.get("lugar"),
        "formato": tournament.get("formato", "eliminacion_directa"),
        "tipo_partido": tournament.get("tipo_partido", "mejor_de_3"),
        "puntos_por_set": tournament.get("puntos_por_set", 11),
        "diferencia_minima": tournament.get("diferencia_minima", 2),
        "max_participantes": tournament.get("max_participantes"),
        "premio": tournament.get("premio"),
        "imagen_url": tournament.get("imagen_url"),
        "estado": "inscripcion",
        "participantes": [],
        "bracket": None,
        "ganador_id": None,
        "fecha_creacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_tournaments.insert_one(doc)
    del doc["_id"]
    return doc

@pingpong_router.post("/tournaments/{torneo_id}/register/{jugador_id}")
async def register_player_tournament(torneo_id: str, jugador_id: str):
    """Inscribir jugador en torneo"""
    from server import db
    
    tournament = await db.pingpong_tournaments.find_one({"torneo_id": torneo_id})
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    
    if tournament["estado"] != "inscripcion":
        raise HTTPException(status_code=400, detail="El torneo no está en periodo de inscripción")
    
    if jugador_id in tournament.get("participantes", []):
        raise HTTPException(status_code=400, detail="El jugador ya está inscrito")
    
    if tournament.get("max_participantes") and len(tournament.get("participantes", [])) >= tournament["max_participantes"]:
        raise HTTPException(status_code=400, detail="El torneo está lleno")
    
    await db.pingpong_tournaments.update_one(
        {"torneo_id": torneo_id},
        {"$push": {"participantes": jugador_id}}
    )
    
    return {"success": True, "message": "Jugador inscrito exitosamente"}

# ============== MATCH ROUTES ==============

@pingpong_router.get("/matches")
async def get_matches(
    estado: Optional[str] = None,
    torneo_id: Optional[str] = None,
    jugador_id: Optional[str] = None,
    limit: int = 50
):
    """Obtener lista de partidos"""
    from server import db
    
    query = {}
    if estado:
        query["estado"] = estado
    if torneo_id:
        query["torneo_id"] = torneo_id
    if jugador_id:
        query["$or"] = [{"jugador_a_id": jugador_id}, {"jugador_b_id": jugador_id}]
    
    matches = await db.pingpong_matches.find(query, {"_id": 0}).sort("fecha_creacion", -1).to_list(limit)
    
    # Agregar info de jugadores
    for match in matches:
        player_a = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_a_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        player_b = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_b_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        match["jugador_a_info"] = player_a
        match["jugador_b_info"] = player_b
    
    return matches

@pingpong_router.get("/matches/{partido_id}")
async def get_match(partido_id: str):
    """Obtener un partido por ID con toda la información"""
    from server import db
    
    match = await db.pingpong_matches.find_one({"partido_id": partido_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    # Agregar info de jugadores
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_a_id"]},
        {"_id": 0}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_b_id"]},
        {"_id": 0}
    )
    match["jugador_a_info"] = player_a
    match["jugador_b_info"] = player_b
    
    # Calcular estadísticas en vivo
    match["estadisticas"] = calcular_estadisticas_partido(match.get("historial_puntos", []))
    
    return match

@pingpong_router.post("/matches")
async def create_match(match: dict):
    """Crear nuevo partido"""
    from server import db
    
    doc = {
        "partido_id": f"partido_{uuid.uuid4().hex[:12]}",
        "torneo_id": match.get("torneo_id"),
        "jugador_a_id": match.get("jugador_a_id"),
        "jugador_b_id": match.get("jugador_b_id"),
        "mesa": match.get("mesa"),
        "ronda": match.get("ronda"),
        "tipo_partido": match.get("tipo_partido", "mejor_de_3"),
        "puntos_por_set": match.get("puntos_por_set", 11),
        "diferencia_minima": match.get("diferencia_minima", 2),
        "arbitro_id": match.get("arbitro_id"),
        "estado": "pendiente",
        "sets_jugador_a": 0,
        "sets_jugador_b": 0,
        "puntos_jugador_a": 0,
        "puntos_jugador_b": 0,
        "set_actual": 1,
        "sets_detalle": [],
        "historial_puntos": [],
        "saque": match.get("primer_saque", "a"),
        "primer_saque": match.get("primer_saque", "a"),
        "fecha_inicio": None,
        "fecha_fin": None,
        "duracion_segundos": None,
        "rachas": {},
        "ganador_id": None,
        "fecha_creacion": datetime.now(timezone.utc)
    }
    
    await db.pingpong_matches.insert_one(doc)
    del doc["_id"]
    return doc

@pingpong_router.post("/matches/{partido_id}/start")
async def start_match(partido_id: str):
    """Iniciar partido"""
    from server import db
    
    match = await db.pingpong_matches.find_one({"partido_id": partido_id})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if match["estado"] not in ["pendiente", "pausado"]:
        raise HTTPException(status_code=400, detail="El partido no puede ser iniciado")
    
    update_data = {
        "estado": "en_curso",
        "fecha_inicio": datetime.now(timezone.utc) if not match.get("fecha_inicio") else match["fecha_inicio"]
    }
    
    await db.pingpong_matches.update_one(
        {"partido_id": partido_id},
        {"$set": update_data}
    )
    
    return {"success": True, "message": "Partido iniciado"}

@pingpong_router.post("/matches/{partido_id}/point")
async def add_point(partido_id: str, data: dict):
    """Agregar punto a un jugador"""
    from server import db
    
    match = await db.pingpong_matches.find_one({"partido_id": partido_id})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if match["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="El partido no está en curso")
    
    jugador = data.get("jugador")  # "a" o "b"
    tipo_punto = data.get("tipo", "normal")  # normal, ace, winner, error_rival, etc.
    
    if jugador not in ["a", "b"]:
        raise HTTPException(status_code=400, detail="Jugador inválido")
    
    # Actualizar puntos
    puntos_a = match["puntos_jugador_a"]
    puntos_b = match["puntos_jugador_b"]
    
    if jugador == "a":
        puntos_a += 1
    else:
        puntos_b += 1
    
    # Registrar en historial
    punto_registro = {
        "tiempo": datetime.now(timezone.utc).isoformat(),
        "set": match["set_actual"],
        "punto_a": puntos_a,
        "punto_b": puntos_b,
        "anotador": jugador,
        "tipo": tipo_punto,
        "saque": match["saque"]
    }
    
    # Verificar si se ganó el set
    puntos_para_ganar = match["puntos_por_set"]
    diferencia_minima = match["diferencia_minima"]
    sets_para_ganar = calcular_sets_necesarios(match["tipo_partido"])
    
    set_ganado = False
    ganador_set = None
    partido_terminado = False
    ganador_partido = None
    
    # Verificar victoria del set
    if puntos_a >= puntos_para_ganar or puntos_b >= puntos_para_ganar:
        diferencia = abs(puntos_a - puntos_b)
        if diferencia >= diferencia_minima:
            set_ganado = True
            ganador_set = "a" if puntos_a > puntos_b else "b"
    
    sets_a = match["sets_jugador_a"]
    sets_b = match["sets_jugador_b"]
    set_actual = match["set_actual"]
    sets_detalle = match.get("sets_detalle", [])
    
    if set_ganado:
        # Registrar set
        sets_detalle.append({
            "set": set_actual,
            "puntos_a": puntos_a,
            "puntos_b": puntos_b,
            "ganador": ganador_set
        })
        
        if ganador_set == "a":
            sets_a += 1
        else:
            sets_b += 1
        
        # Verificar si se ganó el partido
        if sets_a >= sets_para_ganar:
            partido_terminado = True
            ganador_partido = "a"
        elif sets_b >= sets_para_ganar:
            partido_terminado = True
            ganador_partido = "b"
        else:
            # Siguiente set
            set_actual += 1
            puntos_a = 0
            puntos_b = 0
            # Cambiar primer saque del set
    
    # Calcular cambio de saque
    total_puntos_set = puntos_a + puntos_b
    cambio_saque_cada = 2
    
    # En deuce (10-10 o más), cambio cada punto
    if puntos_a >= 10 and puntos_b >= 10:
        cambio_saque_cada = 1
    
    # Determinar saque
    if match["primer_saque"] == "a":
        saque = "a" if (total_puntos_set // cambio_saque_cada) % 2 == 0 else "b"
    else:
        saque = "b" if (total_puntos_set // cambio_saque_cada) % 2 == 0 else "a"
    
    # Preparar actualización
    update_data = {
        "puntos_jugador_a": puntos_a,
        "puntos_jugador_b": puntos_b,
        "sets_jugador_a": sets_a,
        "sets_jugador_b": sets_b,
        "set_actual": set_actual,
        "sets_detalle": sets_detalle,
        "saque": saque
    }
    
    if partido_terminado:
        ganador_id = match["jugador_a_id"] if ganador_partido == "a" else match["jugador_b_id"]
        update_data["estado"] = "finalizado"
        update_data["fecha_fin"] = datetime.now(timezone.utc)
        update_data["ganador_id"] = ganador_id
        
        # Calcular duración
        if match.get("fecha_inicio"):
            duracion = (datetime.now(timezone.utc) - match["fecha_inicio"]).total_seconds()
            update_data["duracion_segundos"] = int(duracion)
    
    # Actualizar partido
    await db.pingpong_matches.update_one(
        {"partido_id": partido_id},
        {
            "$set": update_data,
            "$push": {"historial_puntos": punto_registro}
        }
    )
    
    # Actualizar estadísticas de jugadores si terminó
    if partido_terminado:
        await actualizar_estadisticas_jugadores(db, match, ganador_partido, sets_a, sets_b, sets_detalle)
    
    # Obtener partido actualizado
    updated_match = await db.pingpong_matches.find_one({"partido_id": partido_id}, {"_id": 0})
    updated_match["estadisticas"] = calcular_estadisticas_partido(updated_match.get("historial_puntos", []))
    
    return {
        "success": True,
        "match": updated_match,
        "set_ganado": set_ganado,
        "ganador_set": ganador_set,
        "partido_terminado": partido_terminado,
        "ganador_partido": ganador_partido
    }

@pingpong_router.post("/matches/{partido_id}/undo")
async def undo_point(partido_id: str):
    """Deshacer último punto"""
    from server import db
    
    match = await db.pingpong_matches.find_one({"partido_id": partido_id})
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    if match["estado"] != "en_curso":
        raise HTTPException(status_code=400, detail="El partido no está en curso")
    
    historial = match.get("historial_puntos", [])
    if not historial:
        raise HTTPException(status_code=400, detail="No hay puntos para deshacer")
    
    # Remover último punto
    ultimo_punto = historial.pop()
    
    # Reconstruir estado
    puntos_a = ultimo_punto["punto_a"] - (1 if ultimo_punto["anotador"] == "a" else 0)
    puntos_b = ultimo_punto["punto_b"] - (1 if ultimo_punto["anotador"] == "b" else 0)
    
    update_data = {
        "puntos_jugador_a": puntos_a,
        "puntos_jugador_b": puntos_b,
        "historial_puntos": historial,
        "saque": ultimo_punto["saque"]
    }
    
    await db.pingpong_matches.update_one(
        {"partido_id": partido_id},
        {"$set": update_data}
    )
    
    updated_match = await db.pingpong_matches.find_one({"partido_id": partido_id}, {"_id": 0})
    return {"success": True, "match": updated_match}

@pingpong_router.post("/matches/{partido_id}/pause")
async def pause_match(partido_id: str):
    """Pausar partido"""
    from server import db
    
    result = await db.pingpong_matches.update_one(
        {"partido_id": partido_id, "estado": "en_curso"},
        {"$set": {"estado": "pausado"}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=400, detail="No se puede pausar el partido")
    
    return {"success": True}

@pingpong_router.get("/matches/{partido_id}/live")
async def get_match_live(partido_id: str):
    """Obtener estado del partido para espectadores (optimizado)"""
    from server import db
    
    match = await db.pingpong_matches.find_one(
        {"partido_id": partido_id},
        {
            "_id": 0,
            "partido_id": 1,
            "estado": 1,
            "jugador_a_id": 1,
            "jugador_b_id": 1,
            "puntos_jugador_a": 1,
            "puntos_jugador_b": 1,
            "sets_jugador_a": 1,
            "sets_jugador_b": 1,
            "set_actual": 1,
            "sets_detalle": 1,
            "saque": 1,
            "tipo_partido": 1,
            "puntos_por_set": 1,
            "mesa": 1,
            "ronda": 1,
            "historial_puntos": 1,
            "ganador_id": 1
        }
    )
    
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    
    # Info de jugadores
    player_a = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_a_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
    )
    player_b = await db.pingpong_players.find_one(
        {"jugador_id": match["jugador_b_id"]},
        {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1, "elo_rating": 1}
    )
    
    match["jugador_a_info"] = player_a
    match["jugador_b_info"] = player_b
    
    # Estadísticas en vivo
    stats = calcular_estadisticas_partido(match.get("historial_puntos", []))
    match["estadisticas"] = stats
    
    # Calcular situación del partido
    sets_para_ganar = calcular_sets_necesarios(match["tipo_partido"])
    puntos_para_set = match["puntos_por_set"]
    
    situacion = []
    
    # Match point / Set point
    puntos_a = match["puntos_jugador_a"]
    puntos_b = match["puntos_jugador_b"]
    sets_a = match["sets_jugador_a"]
    sets_b = match["sets_jugador_b"]
    
    if puntos_a >= puntos_para_set - 1 and puntos_a > puntos_b:
        if sets_a == sets_para_ganar - 1:
            situacion.append({"tipo": "match_point", "jugador": "a"})
        else:
            situacion.append({"tipo": "set_point", "jugador": "a"})
    
    if puntos_b >= puntos_para_set - 1 and puntos_b > puntos_a:
        if sets_b == sets_para_ganar - 1:
            situacion.append({"tipo": "match_point", "jugador": "b"})
        else:
            situacion.append({"tipo": "set_point", "jugador": "b"})
    
    # Deuce
    if puntos_a >= puntos_para_set - 1 and puntos_b >= puntos_para_set - 1 and puntos_a == puntos_b:
        situacion.append({"tipo": "deuce"})
    
    # Racha
    if stats.get("racha_actual_a", 0) >= 3:
        situacion.append({"tipo": "racha", "jugador": "a", "puntos": stats["racha_actual_a"]})
    if stats.get("racha_actual_b", 0) >= 3:
        situacion.append({"tipo": "racha", "jugador": "b", "puntos": stats["racha_actual_b"]})
    
    match["situacion"] = situacion
    
    # No enviar historial completo para reducir tamaño
    del match["historial_puntos"]
    
    return match

# ============== HELPER FUNCTIONS ==============

async def actualizar_estadisticas_jugadores(db, match, ganador, sets_a, sets_b, sets_detalle):
    """Actualiza estadísticas de ambos jugadores después del partido"""
    jugador_a_id = match["jugador_a_id"]
    jugador_b_id = match["jugador_b_id"]
    
    # Obtener jugadores
    player_a = await db.pingpong_players.find_one({"jugador_id": jugador_a_id})
    player_b = await db.pingpong_players.find_one({"jugador_id": jugador_b_id})
    
    if not player_a or not player_b:
        return
    
    # Calcular puntos totales
    puntos_a = sum(s["puntos_a"] for s in sets_detalle)
    puntos_b = sum(s["puntos_b"] for s in sets_detalle)
    
    # Calcular nuevo ELO
    nuevo_elo_a, nuevo_elo_b = calcular_elo(
        player_a.get("elo_rating", 1000),
        player_b.get("elo_rating", 1000),
        ganador
    )
    
    # Actualizar jugador A
    racha_a = player_a.get("racha_actual", 0)
    if ganador == "a":
        racha_a = racha_a + 1 if racha_a >= 0 else 1
    else:
        racha_a = racha_a - 1 if racha_a <= 0 else -1
    
    await db.pingpong_players.update_one(
        {"jugador_id": jugador_a_id},
        {
            "$inc": {
                "partidos_jugados": 1,
                "partidos_ganados": 1 if ganador == "a" else 0,
                "partidos_perdidos": 0 if ganador == "a" else 1,
                "sets_ganados": sets_a,
                "sets_perdidos": sets_b,
                "puntos_favor": puntos_a,
                "puntos_contra": puntos_b
            },
            "$set": {
                "elo_rating": nuevo_elo_a,
                "racha_actual": racha_a,
                "mejor_racha": max(player_a.get("mejor_racha", 0), racha_a) if racha_a > 0 else player_a.get("mejor_racha", 0)
            }
        }
    )
    
    # Actualizar jugador B
    racha_b = player_b.get("racha_actual", 0)
    if ganador == "b":
        racha_b = racha_b + 1 if racha_b >= 0 else 1
    else:
        racha_b = racha_b - 1 if racha_b <= 0 else -1
    
    await db.pingpong_players.update_one(
        {"jugador_id": jugador_b_id},
        {
            "$inc": {
                "partidos_jugados": 1,
                "partidos_ganados": 1 if ganador == "b" else 0,
                "partidos_perdidos": 0 if ganador == "b" else 1,
                "sets_ganados": sets_b,
                "sets_perdidos": sets_a,
                "puntos_favor": puntos_b,
                "puntos_contra": puntos_a
            },
            "$set": {
                "elo_rating": nuevo_elo_b,
                "racha_actual": racha_b,
                "mejor_racha": max(player_b.get("mejor_racha", 0), racha_b) if racha_b > 0 else player_b.get("mejor_racha", 0)
            }
        }
    )

# ============== ACTIVE MATCHES (for live display) ==============

@pingpong_router.get("/matches/active/all")
async def get_active_matches():
    """Obtener todos los partidos activos (en curso)"""
    from server import db
    
    matches = await db.pingpong_matches.find(
        {"estado": "en_curso"},
        {"_id": 0, "historial_puntos": 0}
    ).to_list(20)
    
    for match in matches:
        player_a = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_a_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        player_b = await db.pingpong_players.find_one(
            {"jugador_id": match["jugador_b_id"]},
            {"_id": 0, "nombre": 1, "apellido": 1, "apodo": 1, "foto_url": 1}
        )
        match["jugador_a_info"] = player_a
        match["jugador_b_info"] = player_b
    
    return matches
