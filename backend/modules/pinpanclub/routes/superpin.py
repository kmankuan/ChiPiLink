"""
Super Pin Ranking - API Routes
Endpoints for the ranking system
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models.superpin import (
    SuperPinLeague, SuperPinLeagueCreate, SuperPinLeagueUpdate,
    SuperPinMatch, SuperPinMatchCreate,
    PlayerCheckIn, PlayerCheckInCreate,
    RankingTable, RankingEntry,
    SeasonTournament, SeasonTournamentCreate,
    CheckInMethod
)
from ..services.superpin_service import superpin_service

router = APIRouter(prefix="/superpin", tags=["Super Pin Ranking"])


# ============== LEAGUES ==============

@router.get("/leagues", response_model=List[SuperPinLeague])
async def get_leagues(active_only: bool = False):
    """Get all leagues or only active ones"""
    if active_only:
        return await superpin_service.get_active_leagues()
    return await superpin_service.get_all_leagues()


@router.get("/leagues/{league_id}", response_model=SuperPinLeague)
async def get_league(league_id: str):
    """Get league by ID"""
    league = await superpin_service.get_league(league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@router.post("/leagues", response_model=SuperPinLeague)
async def create_league(
    data: SuperPinLeagueCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create new league (admin only)"""
    return await superpin_service.create_league(data)


@router.put("/leagues/{league_id}", response_model=SuperPinLeague)
async def update_league(
    league_id: str,
    data: SuperPinLeagueUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update league (admin only)"""
    league = await superpin_service.update_league(league_id, data)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@router.post("/leagues/{league_id}/activate", response_model=SuperPinLeague)
async def activate_league(
    league_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Activate league (admin only)"""
    league = await superpin_service.activate_league(league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


# ============== CHECK-IN ==============

@router.get("/leagues/{league_id}/available-players", response_model=List[PlayerCheckIn])
async def get_available_players(league_id: str):
    """Get available players (with active check-in)"""
    return await superpin_service.get_available_players(league_id)


@router.post("/leagues/{league_id}/checkin", response_model=PlayerCheckIn)
async def check_in(
    league_id: str,
    player_id: str,
    method: CheckInMethod = CheckInMethod.MANUAL,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    qr_code: Optional[str] = None
):
    """Register player check-in"""
    # Validate geolocation if it is the method
    if method == CheckInMethod.GEOLOCATION:
        if not latitude or not longitude:
            raise HTTPException(
                status_code=400,
                detail="Latitude and longitude required for geolocation check-in"
            )
        is_valid = await superpin_service.validate_geolocation(league_id, latitude, longitude)
        if not is_valid:
            raise HTTPException(
                status_code=400,
                detail="Location outside allowed range"
            )
    
    data = PlayerCheckInCreate(
        player_id=player_id,
        league_id=league_id,
        method=method,
        latitude=latitude,
        longitude=longitude,
        qr_code=qr_code
    )
    
    return await superpin_service.check_in_player(data)


@router.post("/leagues/{league_id}/checkout")
async def check_out(league_id: str, player_id: str):
    """Register player check-out"""
    success = await superpin_service.check_out_player(league_id, player_id)
    return {"success": success}


# ============== MATCHES ==============

@router.post("/matches", response_model=SuperPinMatch)
async def create_match(data: SuperPinMatchCreate):
    """Create new Super Pin match"""
    return await superpin_service.create_match(data)


@router.get("/matches/{match_id}", response_model=SuperPinMatch)
async def get_match(match_id: str):
    """Get match by ID"""
    match = await superpin_service.get_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/matches/{match_id}/start", response_model=SuperPinMatch)
async def start_match(match_id: str):
    """Start match"""
    match = await superpin_service.start_match(match_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    return match


@router.post("/matches/{match_id}/point")
async def record_point(
    match_id: str,
    player: str,  # 'a' or 'b'
    ace: bool = False,
    forced_error: bool = False,
    serve_point: bool = False
):
    """Record point in the match"""
    if player not in ['a', 'b']:
        raise HTTPException(status_code=400, detail="Player must be 'a' or 'b'")
    
    # Optional advanced statistics
    stats = {}
    if ace:
        stats[f"aces_{player}"] = 1
    if serve_point:
        stats[f"serve_points_{player}"] = 1
    
    try:
        result = await superpin_service.record_point(match_id, player, stats if stats else None)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leagues/{league_id}/matches")
async def get_league_matches(
    league_id: str,
    status: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200)
):
    """Get matches from a league"""
    matches = await superpin_service.match_repo.get_league_matches(league_id, status, limit)
    return matches


# ============== RANKING ==============

@router.get("/leagues/{league_id}/ranking", response_model=RankingTable)
async def get_ranking(league_id: str):
    """Get ranking table for a league"""
    try:
        return await superpin_service.get_ranking(league_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/leagues/{league_id}/ranking/{player_id}")
async def get_player_stats(league_id: str, player_id: str):
    """Get statistics for a player in a league"""
    stats = await superpin_service.get_player_stats(league_id, player_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Player not found in this league")
    return stats


@router.get("/leagues/{league_id}/head-to-head")
async def get_head_to_head(
    league_id: str,
    player_a_id: str,
    player_b_id: str
):
    """Get history between two players"""
    matches = await superpin_service.match_repo.get_head_to_head(
        league_id, player_a_id, player_b_id
    )
    
    # Calculate statistics
    wins_a = sum(1 for m in matches if m.get("winner_id") == player_a_id)
    wins_b = sum(1 for m in matches if m.get("winner_id") == player_b_id)
    
    return {
        "total_matches": len(matches),
        "wins_a": wins_a,
        "wins_b": wins_b,
        "matches": matches
    }


# ============== SEASON TOURNAMENT ==============

@router.post("/tournaments", response_model=SeasonTournament)
async def create_tournament(
    data: SeasonTournamentCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create end of season tournament (admin only)"""
    try:
        return await superpin_service.create_season_tournament(data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/leagues/{league_id}/tournaments")
async def get_league_tournaments(league_id: str):
    """Get tournaments for a league"""
    return await superpin_service.tournament_repo.get_league_tournaments(league_id)


@router.get("/tournaments/{tournament_id}", response_model=SeasonTournament)
async def get_tournament(tournament_id: str):
    """Get tournament by ID"""
    tournament = await superpin_service.tournament_repo.get_by_id(tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return SeasonTournament(**tournament)


@router.post("/tournaments/{tournament_id}/generate-brackets")
async def generate_brackets(tournament_id: str, admin: dict = Depends(get_admin_user)):
    """Generate brackets for elimination tournament"""
    try:
        result = await superpin_service.generate_tournament_brackets(tournament_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tournaments/{tournament_id}/matches/{match_id}/result")
async def update_match_result(
    tournament_id: str,
    match_id: str,
    winner_id: str,
    score_a: int = 0,
    score_b: int = 0,
    admin: dict = Depends(get_admin_user)
):
    """Update result of a tournament match"""
    try:
        result = await superpin_service.update_tournament_match(
            tournament_id, match_id, winner_id, score_a, score_b
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tournaments/{tournament_id}/brackets")
async def get_tournament_brackets(tournament_id: str):
    """Get brackets for a tournament"""
    tournament = await superpin_service.get_tournament_with_brackets(tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return {
        "tournament_id": tournament.get("tournament_id") or tournament.get("torneo_id"),
        "name": tournament.get("name"),
        "status": tournament.get("status") or tournament.get("estado"),
        "brackets": tournament.get("brackets", []),
        "participants": tournament.get("participants") or tournament.get("participantes", []),
        "final_results": tournament.get("final_results") or tournament.get("resultados_finales", [])
    }


# ============== BADGES ==============

@router.get("/badges/recent")
async def get_recent_badges(limit: int = 20):
    """Get most recent badges (feed)"""
    return await superpin_service.get_recent_badges(limit)


@router.get("/badges/leaderboard")
async def get_badge_leaderboard(league_id: str = None, limit: int = 10):
    """Get ranking of players by badges"""
    return await superpin_service.get_badge_leaderboard(league_id, limit)


@router.get("/players/{player_id}/badges")
async def get_player_badges(player_id: str):
    """Get all badges for a player"""
    badges = await superpin_service.get_player_badges(player_id)
    return {"player_id": player_id, "badges": badges, "total": len(badges)}


@router.post("/tournaments/{tournament_id}/award-badges")
async def award_tournament_badges(tournament_id: str, admin: dict = Depends(get_admin_user)):
    """Award badges to winners of a finished tournament"""
    badges = await superpin_service.award_tournament_badges(tournament_id)
    return {"awarded_badges": badges, "total": len(badges)}


@router.get("/badges/definitions")
async def get_badge_definitions():
    """Get all badge definitions"""
    from ..models.superpin import BADGE_DEFINITIONS
    return BADGE_DEFINITIONS


# ============== PLAYER STATISTICS ==============

@router.get("/players/{player_id}/statistics")
async def get_player_statistics(player_id: str, league_id: str = None):
    """Get detailed player statistics"""
    stats = await superpin_service.get_player_statistics(player_id, league_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Player not found")
    return stats


@router.get("/head-to-head")
async def get_head_to_head_stats(player_a_id: str, player_b_id: str):
    """Get direct head-to-head statistics"""
    return await superpin_service.get_head_to_head(player_a_id, player_b_id)


@router.get("/predict-match")
async def predict_match(player_a_id: str, player_b_id: str):
    """
    Predict match outcome between two players.
    Returns probabilities based on ELO, H2H history and current streak.
    """
    return await superpin_service.predict_match(player_a_id, player_b_id)
