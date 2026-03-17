from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from core.database import sport_matches, sport_players
from core.auth import get_admin_user, get_optional_user
from models.match import Match, MatchCreate, MatchValidation, MatchPlayer, MatchReferee
from services.elo import calculate_elo_changes
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/sport/matches", tags=["matches"])

@router.get("", response_model=List[Match])
async def get_matches(
    league_id: Optional[str] = Query(None, description="Filter by league"),
    player_id: Optional[str] = Query(None, description="Filter by player"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get all matches"""
    try:
        # Build query filter
        query_filter = {}
        if league_id:
            query_filter["league_id"] = league_id
        if status:
            query_filter["status"] = status
        if player_id:
            query_filter["$or"] = [
                {"player_a.player_id": player_id},
                {"player_b.player_id": player_id}
            ]
        
        # Execute query
        cursor = sport_matches.find(query_filter, {"_id": 0}).sort([("created_at", -1)]).limit(limit)
        matches_data = await cursor.to_list(length=limit)
        
        # Convert to Match objects
        matches = []
        for data in matches_data:
            # Parse datetime fields
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            if "validated_at" in data and isinstance(data["validated_at"], str):
                data["validated_at"] = datetime.fromisoformat(data["validated_at"])
            
            matches.append(Match(**data))
        
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch matches: {str(e)}")

@router.get("/{match_id}", response_model=Match)
async def get_match(match_id: str):
    """Get match by ID"""
    try:
        match_data = await sport_matches.find_one({"match_id": match_id}, {"_id": 0})
        if not match_data:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Parse datetime fields
        if "created_at" in match_data and isinstance(match_data["created_at"], str):
            match_data["created_at"] = datetime.fromisoformat(match_data["created_at"])
        if "validated_at" in match_data and isinstance(match_data["validated_at"], str):
            match_data["validated_at"] = datetime.fromisoformat(match_data["validated_at"])
        
        return Match(**match_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch match: {str(e)}")

@router.post("", response_model=Match)
async def create_match(
    match_data: MatchCreate,
    current_user = Depends(get_optional_user)
):
    """Record a new match with ELO calculation"""
    try:
        # Get player data
        player_a_data = await sport_players.find_one({"player_id": match_data.player_a_id})
        player_b_data = await sport_players.find_one({"player_id": match_data.player_b_id})
        
        if not player_a_data or not player_b_data:
            raise HTTPException(status_code=404, detail="One or both players not found")
        
        # Get referee data if provided
        referee = None
        if match_data.referee_id:
            referee_data = await sport_players.find_one({"player_id": match_data.referee_id})
            if referee_data:
                referee = MatchReferee(
                    player_id=referee_data["player_id"],
                    nickname=referee_data["nickname"]
                )
        
        # Calculate ELO changes
        winner_is_a = match_data.winner_id == match_data.player_a_id
        elo_change_a, elo_change_b = calculate_elo_changes(
            player_a_data["elo"],
            player_b_data["elo"],
            winner_is_a
        )
        
        # Create match object
        match_id = f"sm_{uuid.uuid4().hex[:10]}"
        match = Match(
            match_id=match_id,
            player_a=MatchPlayer(
                player_id=player_a_data["player_id"],
                nickname=player_a_data["nickname"],
                elo_before=player_a_data["elo"],
                elo_change=elo_change_a
            ),
            player_b=MatchPlayer(
                player_id=player_b_data["player_id"],
                nickname=player_b_data["nickname"],
                elo_before=player_b_data["elo"],
                elo_change=elo_change_b
            ),
            referee=referee,
            winner_id=match_data.winner_id,
            score_winner=match_data.score_winner,
            score_loser=match_data.score_loser,
            league_id=match_data.league_id,
            tournament_id=match_data.tournament_id,
            notes=match_data.notes,
            source=match_data.source,
            created_at=datetime.now(timezone.utc)
        )
        
        # Save match to database
        doc = match.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["validated_at"]:
            doc["validated_at"] = doc["validated_at"].isoformat()
        
        await sport_matches.insert_one(doc)
        
        # Update player ELO and stats
        await update_player_after_match(player_a_data, elo_change_a, winner_is_a, match_data.referee_id == match_data.player_a_id)
        await update_player_after_match(player_b_data, elo_change_b, not winner_is_a, match_data.referee_id == match_data.player_b_id)
        
        # Update referee stats if different from players
        if referee and referee.player_id not in [match_data.player_a_id, match_data.player_b_id]:
            await update_referee_stats(referee.player_id)
        
        return match
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create match: {str(e)}")

async def update_player_after_match(player_data: dict, elo_change: int, won: bool, was_referee: bool = False):
    """Update player stats after a match"""
    # Calculate new stats
    new_elo = player_data["elo"] + elo_change
    stats = player_data.get("stats", {})
    
    # Update match counts
    stats["matches"] = stats.get("matches", 0) + 1
    if won:
        stats["wins"] = stats.get("wins", 0) + 1
        stats["current_streak"] = stats.get("current_streak", 0) + 1
        stats["best_streak"] = max(stats.get("best_streak", 0), stats["current_streak"])
    else:
        stats["losses"] = stats.get("losses", 0) + 1
        stats["current_streak"] = 0
    
    # Calculate win rate
    if stats["matches"] > 0:
        stats["win_rate"] = round((stats["wins"] / stats["matches"]) * 100, 1)
    
    # Update referee count
    if was_referee:
        stats["matches_refereed"] = stats.get("matches_refereed", 0) + 1
    
    # Update in database
    await sport_players.update_one(
        {"player_id": player_data["player_id"]},
        {"$set": {
            "elo": new_elo,
            "stats": stats,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

async def update_referee_stats(referee_id: str):
    """Update referee match count"""
    referee_data = await sport_players.find_one({"player_id": referee_id})
    if referee_data:
        stats = referee_data.get("stats", {})
        stats["matches_refereed"] = stats.get("matches_refereed", 0) + 1
        
        await sport_players.update_one(
            {"player_id": referee_id},
            {"$set": {
                "stats": stats,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )

@router.put("/{match_id}/validate", response_model=Match)
async def validate_match(
    match_id: str,
    validation_data: MatchValidation,
    admin_user = Depends(get_admin_user)
):
    """Validate or reject a match (admin only)"""
    try:
        # Check if match exists
        existing_match = await sport_matches.find_one({"match_id": match_id})
        if not existing_match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        # Update match status
        update_data = {
            "status": validation_data.status,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "validated_by": admin_user["user_id"]
        }
        
        if validation_data.notes:
            update_data["notes"] = validation_data.notes
        
        await sport_matches.update_one(
            {"match_id": match_id},
            {"$set": update_data}
        )
        
        # Return updated match
        return await get_match(match_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to validate match: {str(e)}")
