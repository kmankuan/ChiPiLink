"""
Rapid Pin - API Routes
Endpoints for el sistema of matches espontáneos
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.rapidpin import (
    RapidPinSeason, RapidPinSeasonCreate, RapidPinSeasonUpdate,
    RapidPinMatch, RapidPinMatchCreate,
    RapidPinRankingTable, RapidPinRankingEntry,
    RapidPinSeasonFinalResults, RAPID_PIN_SCORING
)
from ..services.rapidpin_service import rapidpin_service

router = APIRouter(prefix="/rapidpin", tags=["Rapid Pin"])


# ============== SEASONS ==============

@router.get("/seasons", response_model=List[RapidPinSeason])
async def get_seasons(active_only: bool = False):
    """Get todas seasons or only active ones"""
    if active_only:
        return await rapidpin_service.get_active_seasons()
    return await rapidpin_service.get_all_seasons()


@router.get("/seasons/{season_id}", response_model=RapidPinSeason)
async def get_season(season_id: str):
    """Get temporada by ID"""
    season = await rapidpin_service.get_season(season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    return season


@router.post("/seasons", response_model=RapidPinSeason)
async def create_season(
    data: RapidPinSeasonCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create new season (solo admin)"""
    return await rapidpin_service.create_season(data)


@router.put("/seasons/{season_id}", response_model=RapidPinSeason)
async def update_season(
    season_id: str,
    data: RapidPinSeasonUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update temporada (solo admin)"""
    season = await rapidpin_service.update_season(season_id, data)
    if not season:
        raise HTTPException(status_code=404, detail="Temporada no encontrada")
    return season


@router.post("/seasons/{season_id}/close", response_model=RapidPinSeasonFinalResults)
async def close_season(
    season_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Cerrar temporada y calcular resultados finales (solo admin)"""
    try:
        return await rapidpin_service.close_season(season_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== MATCHES ==============

@router.post("/matches", response_model=RapidPinMatch)
async def register_match(data: RapidPinMatchCreate):
    """
    Registrar un new match Rapid Pin.
    El partido queda en estado 'pending' hasta que otro participante lo confirme.
    """
    try:
        return await rapidpin_service.register_match(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/matches/{match_id}/confirm", response_model=RapidPinMatch)
async def confirm_match(
    match_id: str,
    confirmado_por_id: str
):
    """
    Confirmar a match pendiente.
    Solo puede confirmar un participante diferente al que lo registró.
    """
    try:
        return await rapidpin_service.confirm_match(match_id, confirmado_por_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/matches/{match_id}", response_model=RapidPinMatch)
async def get_match(match_id: str):
    """Get partido by ID"""
    match = await rapidpin_service.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Partido not found")
    return match


@router.get("/seasons/{season_id}/matches", response_model=List[RapidPinMatch])
async def get_season_matches(
    season_id: str,
    estado: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Get partidos de a season"""
    return await rapidpin_service.get_season_matches(season_id, estado, limit)


@router.get("/seasons/{season_id}/pending/{user_id}")
async def get_pending_confirmations(
    season_id: str,
    user_id: str
):
    """
    Obtener partidos pendientes de confirmación para un usuario.
    Retorna partidos donde the user participa pero no fue quien lo registró.
    """
    matches = await rapidpin_service.get_pending_confirmations(season_id, user_id)
    return {
        "user_id": user_id,
        "pending_matches": matches,
        "total": len(matches)
    }


@router.get("/pending/{user_id}")
async def get_all_pending_confirmations(user_id: str):
    """
    Obtener TODOS matches pendientes de confirmación para un usuario.
    Retorna partidos de todas seasons donde the user participa pero no fue quien lo registró.
    """
    matches = await rapidpin_service.get_all_pending_confirmations(user_id)
    return {
        "user_id": user_id,
        "pending_matches": matches,
        "total": len(matches)
    }


# ============== RANKING ==============

@router.get("/seasons/{season_id}/ranking", response_model=RapidPinRankingTable)
async def get_ranking(season_id: str):
    """Get tabla de ranking of players"""
    try:
        return await rapidpin_service.get_ranking(season_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/seasons/{season_id}/ranking/referees", response_model=List[RapidPinRankingEntry])
async def get_referee_ranking(season_id: str):
    """Get ranking de árbitros"""
    return await rapidpin_service.get_referee_ranking(season_id)


@router.get("/seasons/{season_id}/players/{jugador_id}/stats")
async def get_player_stats(season_id: str, jugador_id: str):
    """Get estadísticas de a player en a season"""
    stats = await rapidpin_service.get_player_stats(season_id, jugador_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Jugador not found en esta temporada")
    return stats


# ============== CONFIG ==============

@router.get("/scoring")
async def get_scoring_config():
    """Get configuración de puntuación de Rapid Pin"""
    return {
        "scoring": RAPID_PIN_SCORING,
        "rules": {
            "participants": "2 jugadores + 1 árbitro",
            "validation": "Requiere confirmación de 1 participante adicional",
            "points_victory": RAPID_PIN_SCORING["victory"],
            "points_defeat": RAPID_PIN_SCORING["defeat"],
            "points_referee": RAPID_PIN_SCORING["referee"]
        }
    }


# ============== CHALLENGE & QUEUE SYSTEM ==============

@router.post("/challenge")
async def create_challenge(
    season_id: str,
    challenger_id: str,
    opponent_id: str,
    notes: Optional[str] = None
):
    """
    Crear desafío de jugador a jugador.
    El oponente debe aceptar antes de que se busque árbitro.
    """
    try:
        return await rapidpin_service.create_challenge(
            season_id=season_id,
            challenger_id=challenger_id,
            opponent_id=opponent_id,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/challenge/{queue_id}/accept")
async def accept_challenge(
    queue_id: str,
    user_id: str,
    user_role: str = "player"
):
    """
    Aceptar desafío.
    - El oponente (player2) puede aceptar
    - Admin/Mod pueden forzar aceptación
    """
    try:
        return await rapidpin_service.accept_challenge(queue_id, user_id, user_role)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/challenge/{queue_id}/decline")
async def decline_challenge(
    queue_id: str,
    user_id: str,
    reason: Optional[str] = None
):
    """
    Rechazar desafío.
    Solo el oponente puede rechazar.
    """
    try:
        return await rapidpin_service.decline_challenge(queue_id, user_id, reason)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/queue")
async def create_queue_match(
    season_id: str,
    player1_id: str,
    player2_id: str,
    created_by_id: str,
    created_by_role: str = "admin",
    notes: Optional[str] = None
):
    """
    Crear partido directamente in queue (admin/mod).
    Salta la fase de desafío, va directo a esperar árbitro.
    """
    try:
        return await rapidpin_service.create_queue_match(
            season_id=season_id,
            player1_id=player1_id,
            player2_id=player2_id,
            created_by_id=created_by_id,
            created_by_role=created_by_role,
            notes=notes
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/queue")
async def get_queue_matches(
    season_id: Optional[str] = None,
    status: Optional[str] = None,
    player_id: Optional[str] = None
):
    """
    Obtener partidos in queue/desafíos.
    - status: challenge_pending, waiting, assigned, completed, cancelled, declined, active (todos active)
    - player_id: filtrar by player involucrado
    """
    return await rapidpin_service.get_queue_matches(season_id, status, player_id)


@router.get("/my-challenges/{player_id}")
async def get_my_challenges(
    player_id: str,
    season_id: Optional[str] = None
):
    """
    Obtener mis desafíos pendientes (enviados y recibidos).
    """
    db = await rapidpin_service.get_db()
    
    query = {
        "status": "challenge_pending",
        "$or": [
            {"player1_id": player_id},
            {"player2_id": player_id}
        ]
    }
    if season_id:
        query["season_id"] = season_id
    
    cursor = db["rapidpin_queue"].find(query, {"_id": 0}).sort("created_at", -1)
    challenges = await cursor.to_list(length=50)
    
    # Separar enviados y recibidos
    sent = [c for c in challenges if c["player1_id"] == player_id]
    received = [c for c in challenges if c["player2_id"] == player_id]
    
    return {
        "sent": sent,
        "received": received,
        "total": len(challenges)
    }


@router.post("/queue/{queue_id}/assign")
async def assign_referee(
    queue_id: str,
    referee_id: str,
    assigned_by_id: Optional[str] = None,
    assigned_by_role: str = "player"
):
    """
    Asignarse como árbitro de a match in queue.
    - Cualquier usuario logueado puede asignarse (referee_id = su ID)
    - Admin/Mod pueden asignar a cualquiera
    """
    try:
        return await rapidpin_service.assign_referee(
            queue_id, 
            referee_id, 
            assigned_by_id,
            assigned_by_role
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/queue/{queue_id}/complete")
async def complete_queue_match(
    queue_id: str,
    ganador_id: str,
    score_ganador: int = 11,
    score_perdedor: int = 0
):
    """
    Completar partido con resultado.
    Solo el árbitro asignado puede completarlo.
    """
    try:
        return await rapidpin_service.complete_queue_match(
            queue_id=queue_id,
            ganador_id=ganador_id,
            score_ganador=score_ganador,
            score_perdedor=score_perdedor
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/queue/{queue_id}")
async def cancel_queue_match(
    queue_id: str,
    cancelled_by_id: str
):
    """
    Cancelar partido in queue.
    Solo puede cancelar quien lo creó o un admin.
    """
    try:
        return await rapidpin_service.cancel_queue_match(queue_id, cancelled_by_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== PUBLIC FEED ==============

@router.get("/public/feed")
async def get_rapid_pin_public_feed():
    """
    Feed público de Rapid Pin.
    Incluye estadísticas, partidos recientes, ranking y cola of matches.
    """
    return await rapidpin_service.get_public_feed()


# ============== DATE NEGOTIATION ==============

@router.post("/challenge-with-date")
async def create_challenge_with_date(
    season_id: str,
    challenger_id: str,
    opponent_id: str,
    proposed_date: str,
    message: Optional[str] = None
):
    """
    Crear desafío con propuesta de fecha inicial.
    El reto inicia en estado date_negotiation.
    """
    try:
        return await rapidpin_service.create_challenge_with_date(
            season_id=season_id,
            challenger_id=challenger_id,
            opponent_id=opponent_id,
            proposed_date=proposed_date,
            message=message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/challenge/{queue_id}/respond-date")
async def respond_to_date_proposal(
    queue_id: str,
    user_id: str,
    action: str,  # "accept", "counter", "queue"
    counter_date: Optional[str] = None,
    message: Optional[str] = None
):
    """
    Responder a propuesta de fecha.
    - accept: Acepta la fecha -> pasa a waiting
    - counter: Propone otra fecha -> sigue negociando
    - queue: Poner in queue para retomar después
    """
    try:
        return await rapidpin_service.respond_to_date(
            queue_id=queue_id,
            user_id=user_id,
            action=action,
            counter_date=counter_date,
            message=message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/challenge/{queue_id}/resume")
async def resume_challenge_from_queue(
    queue_id: str,
    user_id: str,
    proposed_date: str,
    message: Optional[str] = None
):
    """
    Retomar a challenge from queue proponiendo nueva fecha.
    """
    try:
        return await rapidpin_service.resume_from_queue(
            queue_id=queue_id,
            user_id=user_id,
            proposed_date=proposed_date,
            message=message
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== LIKES & COMMENTS ==============

@router.get("/comment-config")
async def get_comment_configuration():
    """Get configuración de comentarios"""
    return await rapidpin_service.get_comment_config()


@router.put("/comment-config")
async def update_comment_configuration(
    max_comment_length: Optional[int] = None,
    require_approval_for_flagged_users: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """Update configuración de comentarios (admin)"""
    updates = {}
    if max_comment_length is not None:
        updates["max_comment_length"] = max_comment_length
    if require_approval_for_flagged_users is not None:
        updates["require_approval_for_flagged_users"] = require_approval_for_flagged_users
    
    if not updates:
        raise HTTPException(status_code=400, detail="No hay cambios para aplicar")
    
    return await rapidpin_service.update_comment_config(updates)


@router.post("/challenge/{queue_id}/like")
async def toggle_challenge_like(
    queue_id: str,
    user_id: str,
    user_name: Optional[str] = None
):
    """
    Dar o quitar like a a challenge.
    Requiere authenticated user.
    Emite evento WebSocket en tiempo real.
    """
    try:
        return await rapidpin_service.toggle_like(queue_id, user_id, user_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenge/{queue_id}/liked")
async def check_user_liked_challenge(
    queue_id: str,
    user_id: str
):
    """Verify si un usuario ya dio like a a challenge"""
    liked = await rapidpin_service.check_user_liked(queue_id, user_id)
    return {"liked": liked}


@router.post("/challenge/{queue_id}/comment")
async def add_challenge_comment(
    queue_id: str,
    user_id: str,
    content: str,
    user_name: Optional[str] = None,
    user_avatar: Optional[str] = None
):
    """
    Agregar comentario a a challenge.
    Requiere authenticated user.
    Si the user tiene sanciones, el comentario irá a moderación.
    """
    try:
        user_info = {
            "user_id": user_id,
            "nombre": user_name,
            "avatar": user_avatar
        } if user_name else None
        
        return await rapidpin_service.add_comment(
            queue_id=queue_id,
            user_id=user_id,
            content=content,
            user_info=user_info
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/challenge/{queue_id}/comments")
async def get_challenge_comments(
    queue_id: str,
    limit: int = 50
):
    """Get comentarios de a challenge"""
    return await rapidpin_service.get_comments(queue_id, limit=limit)


@router.post("/comment/{comment_id}/moderate")
async def moderate_challenge_comment(
    comment_id: str,
    action: str,  # "approve", "reject", "hide"
    moderator_id: str,
    reason: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """
    Moderar un comentario (admin/mod).
    - approve: Aprobar comentario pendiente
    - reject: Rechazar y ocultar
    - hide: Ocultar comentario aprobado
    """
    try:
        return await rapidpin_service.moderate_comment(
            comment_id=comment_id,
            action=action,
            moderator_id=moderator_id,
            reason=reason
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/comments/pending")
async def get_pending_moderation_comments(
    limit: int = 50,
    admin: dict = Depends(get_admin_user)
):
    """Get comentarios pendientes de moderación (admin/mod)"""
    return await rapidpin_service.get_pending_comments(limit=limit)
