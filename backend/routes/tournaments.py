from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from ..core.database import sport_tournaments, sport_players
from ..core.auth import get_admin_user
from ..models.tournament import Tournament, TournamentCreate, TournamentRegistration, TournamentMatchResult
from ..models.player import PlayerSimple
from ..services.bracket import generate_single_elimination_brackets, advance_winner_in_bracket
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/sport/tournaments", tags=["tournaments"])

@router.get("", response_model=List[Tournament])
async def get_tournaments(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get all tournaments"""
    try:
        # Build query filter
        query_filter = {}
        if status:
            query_filter["status"] = status
        
        # Execute query
        cursor = sport_tournaments.find(query_filter, {"_id": 0}).sort([("created_at", -1)]).limit(limit)
        tournaments_data = await cursor.to_list(length=limit)
        
        # Convert to Tournament objects
        tournaments = []
        for data in tournaments_data:
            # Parse datetime fields
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            if "updated_at" in data and isinstance(data["updated_at"], str):
                data["updated_at"] = datetime.fromisoformat(data["updated_at"])
            
            # Parse participant registered_at dates
            for participant in data.get("participants", []):
                if "registered_at" in participant and isinstance(participant["registered_at"], str):
                    participant["registered_at"] = datetime.fromisoformat(participant["registered_at"])
            
            tournaments.append(Tournament(**data))
        
        return tournaments
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tournaments: {str(e)}")

@router.get("/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: str):
    """Get tournament by ID"""
    try:
        tournament_data = await sport_tournaments.find_one({"tournament_id": tournament_id}, {"_id": 0})
        if not tournament_data:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        # Parse datetime fields
        if "created_at" in tournament_data and isinstance(tournament_data["created_at"], str):
            tournament_data["created_at"] = datetime.fromisoformat(tournament_data["created_at"])
        if "updated_at" in tournament_data and isinstance(tournament_data["updated_at"], str):
            tournament_data["updated_at"] = datetime.fromisoformat(tournament_data["updated_at"])
        
        # Parse participant registered_at dates
        for participant in tournament_data.get("participants", []):
            if "registered_at" in participant and isinstance(participant["registered_at"], str):
                participant["registered_at"] = datetime.fromisoformat(participant["registered_at"])
        
        return Tournament(**tournament_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tournament: {str(e)}")

@router.post("", response_model=Tournament)
async def create_tournament(
    tournament_data: TournamentCreate,
    admin_user = Depends(get_admin_user)
):
    """Create a new tournament (admin only)"""
    try:
        # Generate tournament ID
        tournament_id = f"st_{uuid.uuid4().hex[:10]}"
        
        # Create tournament object
        tournament = Tournament(
            tournament_id=tournament_id,
            name=tournament_data.name,
            description=tournament_data.description,
            format=tournament_data.format,
            max_participants=tournament_data.max_participants,
            min_participants=tournament_data.min_participants,
            seeds_from_league=tournament_data.seeds_from_league,
            third_place_match=tournament_data.third_place_match,
            points_to_win=tournament_data.points_to_win,
            sets_to_win=tournament_data.sets_to_win,
            created_by=admin_user["user_id"],
            created_at=datetime.now(timezone.utc)
        )
        
        # Save to database
        doc = tournament.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["updated_at"]:
            doc["updated_at"] = doc["updated_at"].isoformat()
        
        await sport_tournaments.insert_one(doc)
        
        return tournament
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create tournament: {str(e)}")

@router.post("/{tournament_id}/register", response_model=Tournament)
async def register_player(
    tournament_id: str,
    registration_data: TournamentRegistration,
    admin_user = Depends(get_admin_user)
):
    """Register a player for the tournament"""
    try:
        # Get tournament
        tournament_data = await sport_tournaments.find_one({"tournament_id": tournament_id})
        if not tournament_data:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        if tournament_data["status"] != "registration":
            raise HTTPException(status_code=400, detail="Tournament is not open for registration")
        
        # Get player data
        player_data = await sport_players.find_one({"player_id": registration_data.player_id})
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Check if already registered
        participants = tournament_data.get("participants", [])
        if any(p["player_id"] == registration_data.player_id for p in participants):
            raise HTTPException(status_code=400, detail="Player already registered")
        
        # Check if tournament is full
        if len(participants) >= tournament_data["max_participants"]:
            raise HTTPException(status_code=400, detail="Tournament is full")
        
        # Add player to participants
        new_participant = PlayerSimple(
            player_id=player_data["player_id"],
            nickname=player_data["nickname"],
            elo=player_data["elo"],
            photo_url=player_data.get("avatar_url"),
            seed=len(participants) + 1,  # Simple seeding for now
            registered_at=datetime.now(timezone.utc)
        )
        
        participants.append(new_participant.model_dump())
        
        # Update tournament
        await sport_tournaments.update_one(
            {"tournament_id": tournament_id},
            {"$set": {
                "participants": participants,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return await get_tournament(tournament_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register player: {str(e)}")

@router.post("/{tournament_id}/start", response_model=Tournament)
async def start_tournament(
    tournament_id: str,
    admin_user = Depends(get_admin_user)
):
    """Start the tournament and generate brackets"""
    try:
        # Get tournament
        tournament_data = await sport_tournaments.find_one({"tournament_id": tournament_id})
        if not tournament_data:
            raise HTTPException(status_code=404, detail="Tournament not found")
        
        if tournament_data["status"] != "registration":
            raise HTTPException(status_code=400, detail="Tournament cannot be started")
        
        participants = tournament_data.get("participants", [])
        if len(participants) < tournament_data["min_participants"]:
            raise HTTPException(status_code=400, detail="Not enough participants")
        
        # Sort participants by ELO for seeding
        participants.sort(key=lambda x: x.get("elo", 0), reverse=True)
        
        # Update seeds based on ELO ranking
        for i, participant in enumerate(participants):
            participant["seed"] = i + 1
        
        # Convert to PlayerSimple objects
        player_participants = []
        for p in participants:
            if "registered_at" in p and isinstance(p["registered_at"], str):
                p["registered_at"] = datetime.fromisoformat(p["registered_at"])
            player_participants.append(PlayerSimple(**p))
        
        # Generate brackets
        brackets = generate_single_elimination_brackets(player_participants, tournament_data["third_place_match"])
        
        # Convert brackets to dict format for storage
        brackets_data = []
        for bracket in brackets:
            bracket_dict = bracket.model_dump()
            brackets_data.append(bracket_dict)
        
        # Update tournament
        await sport_tournaments.update_one(
            {"tournament_id": tournament_id},
            {"$set": {
                "status": "in_progress",
                "participants": [p.model_dump() for p in player_participants],
                "brackets": brackets_data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return await get_tournament(tournament_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start tournament: {str(e)}")

@router.post("/{tournament_id}/match/{match_id}/result", response_model=Tournament)
async def submit_match_result(
    tournament_id: str,
    match_id: str,
    result_data: TournamentMatchResult,
    admin_user = Depends(get_admin_user)
):
    """Submit match result and advance winner"""
    try:
        # Get tournament
        tournament = await get_tournament(tournament_id)
        
        if tournament.status != "in_progress":
            raise HTTPException(status_code=400, detail="Tournament is not in progress")
        
        # Find the match in brackets
        completed_match = None
        for bracket in tournament.brackets:
            for match in bracket.matches:
                if match.match_id == match_id:
                    completed_match = match
                    break
            if completed_match:
                break
        
        if not completed_match:
            raise HTTPException(status_code=404, detail="Match not found")
        
        if completed_match.status == "completed":
            raise HTTPException(status_code=400, detail="Match already completed")
        
        # Validate that both players are set
        if not completed_match.player_a or not completed_match.player_b:
            raise HTTPException(status_code=400, detail="Match players not set")
        
        # Validate winner
        if result_data.winner_id not in [completed_match.player_a.player_id, completed_match.player_b.player_id]:
            raise HTTPException(status_code=400, detail="Invalid winner")
        
        # Update match
        completed_match.winner_id = result_data.winner_id
        completed_match.score = f"{result_data.score_winner}-{result_data.score_loser}"
        completed_match.status = "completed"
        
        # Get winner player object
        winner = completed_match.player_a if completed_match.player_a.player_id == result_data.winner_id else completed_match.player_b
        
        # Advance winner to next round
        next_match = advance_winner_in_bracket(tournament.brackets, completed_match, winner)
        
        # Check if tournament is complete
        is_complete = True
        for bracket in tournament.brackets:
            for match in bracket.matches:
                if match.status != "completed":
                    is_complete = False
                    break
            if not is_complete:
                break
        
        # Update status if complete
        new_status = "completed" if is_complete else "in_progress"
        winner_id = None
        if is_complete:
            # Find the final match winner
            final_bracket = max(tournament.brackets, key=lambda b: b.round if b.name != "Third Place" else 0)
            final_match = final_bracket.matches[0]
            winner_id = final_match.winner_id
        
        # Convert brackets back to dict format
        brackets_data = [bracket.model_dump() for bracket in tournament.brackets]
        
        # Update tournament in database
        await sport_tournaments.update_one(
            {"tournament_id": tournament_id},
            {"$set": {
                "brackets": brackets_data,
                "status": new_status,
                "winner_id": winner_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return await get_tournament(tournament_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit match result: {str(e)}")
