from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from ..core.database import sport_leagues
from ..core.auth import get_admin_user
from ..models.league import League, LeagueCreate, LeagueUpdate
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/sport/leagues", tags=["leagues"])

@router.get("", response_model=List[League])
async def get_leagues(
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get all leagues"""
    try:
        # Build query filter
        query_filter = {}
        if status:
            query_filter["status"] = status
        
        # Execute query
        cursor = sport_leagues.find(query_filter, {"_id": 0}).sort([("created_at", -1)]).limit(limit)
        leagues_data = await cursor.to_list(length=limit)
        
        # Convert to League objects
        leagues = []
        for data in leagues_data:
            # Parse datetime fields
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            if "updated_at" in data and isinstance(data["updated_at"], str):
                data["updated_at"] = datetime.fromisoformat(data["updated_at"])
            if "start_date" in data and isinstance(data["start_date"], str):
                data["start_date"] = datetime.fromisoformat(data["start_date"])
            if "end_date" in data and isinstance(data["end_date"], str):
                data["end_date"] = datetime.fromisoformat(data["end_date"])
            
            leagues.append(League(**data))
        
        return leagues
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leagues: {str(e)}")

@router.get("/{league_id}", response_model=League)
async def get_league(league_id: str):
    """Get league by ID"""
    try:
        league_data = await sport_leagues.find_one({"league_id": league_id}, {"_id": 0})
        if not league_data:
            raise HTTPException(status_code=404, detail="League not found")
        
        # Parse datetime fields
        if "created_at" in league_data and isinstance(league_data["created_at"], str):
            league_data["created_at"] = datetime.fromisoformat(league_data["created_at"])
        if "updated_at" in league_data and isinstance(league_data["updated_at"], str):
            league_data["updated_at"] = datetime.fromisoformat(league_data["updated_at"])
        if "start_date" in league_data and isinstance(league_data["start_date"], str):
            league_data["start_date"] = datetime.fromisoformat(league_data["start_date"])
        if "end_date" in league_data and isinstance(league_data["end_date"], str):
            league_data["end_date"] = datetime.fromisoformat(league_data["end_date"])
        
        return League(**league_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch league: {str(e)}")

@router.post("", response_model=League)
async def create_league(
    league_data: LeagueCreate,
    admin_user = Depends(get_admin_user)
):
    """Create a new league (admin only)"""
    try:
        # Generate league ID
        league_id = f"sl_{uuid.uuid4().hex[:10]}"
        
        # Create league object
        league = League(
            league_id=league_id,
            name=league_data.name,
            description=league_data.description,
            season=league_data.season,
            rating_system=league_data.rating_system,
            start_date=league_data.start_date,
            end_date=league_data.end_date,
            created_by=admin_user["user_id"],
            created_at=datetime.now(timezone.utc)
        )
        
        # Save to database
        doc = league.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["updated_at"]:
            doc["updated_at"] = doc["updated_at"].isoformat()
        if doc["start_date"]:
            doc["start_date"] = doc["start_date"].isoformat()
        if doc["end_date"]:
            doc["end_date"] = doc["end_date"].isoformat()
        
        await sport_leagues.insert_one(doc)
        
        return league
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create league: {str(e)}")

@router.put("/{league_id}", response_model=League)
async def update_league(
    league_id: str,
    league_data: LeagueUpdate,
    admin_user = Depends(get_admin_user)
):
    """Update a league (admin only)"""
    try:
        # Check if league exists
        existing_league = await sport_leagues.find_one({"league_id": league_id})
        if not existing_league:
            raise HTTPException(status_code=404, detail="League not found")
        
        # Build update data
        update_data = {k: v for k, v in league_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Convert datetime fields to ISO strings
        if "start_date" in update_data and update_data["start_date"]:
            update_data["start_date"] = update_data["start_date"].isoformat()
        if "end_date" in update_data and update_data["end_date"]:
            update_data["end_date"] = update_data["end_date"].isoformat()
        
        # Update in database
        await sport_leagues.update_one(
            {"league_id": league_id},
            {"$set": update_data}
        )
        
        # Return updated league
        return await get_league(league_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update league: {str(e)}")
