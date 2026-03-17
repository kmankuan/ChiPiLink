from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi import UploadFile, File
from pydantic import BaseModel as PydanticBaseModel
import base64
from typing import List, Optional
from core.database import sport_players
from core.auth import get_admin_user, get_optional_user
from models.player import Player, PlayerCreate, PlayerUpdate, PlayerSimple
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api/sport/players", tags=["players"])

@router.get("", response_model=List[Player])
async def get_players(
    active_only: bool = Query(True, description="Filter for active players only"),
    sort_by: str = Query("elo", description="Sort by field (elo, name, created_at)"),
    order: str = Query("desc", description="Sort order (asc, desc)"),
    limit: int = Query(100, description="Maximum number of results")
):
    """Get all players"""
    try:
        return await _fetch_players_list(active_only, sort_by, order, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch players: {str(e)}")

async def _fetch_players_list(active_only=True, sort_by="elo", order="desc", limit=100):
    """Internal helper to fetch players"""
    query_filter = {}
    if active_only:
        query_filter["active"] = True
    sort_direction = -1 if order == "desc" else 1
    cursor = sport_players.find(query_filter, {"_id": 0}).sort([(sort_by, sort_direction)]).limit(limit)
    players_data = await cursor.to_list(length=limit)
    players = []
    for data in players_data:
        if "created_at" in data and isinstance(data["created_at"], str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if "updated_at" in data and isinstance(data["updated_at"], str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        players.append(Player(**data))
    return players

@router.get("/{player_id}", response_model=Player)
async def get_player(player_id: str):
    """Get player by ID"""
    try:
        player_data = await sport_players.find_one({"player_id": player_id}, {"_id": 0})
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Parse datetime fields
        if "created_at" in player_data and isinstance(player_data["created_at"], str):
            player_data["created_at"] = datetime.fromisoformat(player_data["created_at"])
        if "updated_at" in player_data and isinstance(player_data["updated_at"], str):
            player_data["updated_at"] = datetime.fromisoformat(player_data["updated_at"])
        
        return Player(**player_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch player: {str(e)}")

@router.post("", response_model=Player)
async def create_player(
    player_data: PlayerCreate,
    admin_user = Depends(get_admin_user)
):
    """Create a new player (admin only)"""
    try:
        # Generate player ID
        player_id = f"sp_{uuid.uuid4().hex[:10]}"
        
        # Create player object
        player = Player(
            player_id=player_id,
            nickname=player_data.nickname,
            name=player_data.name or player_data.nickname,
            elo=player_data.elo,
            roles=player_data.roles,
            linked_user_id=player_data.linked_user_id,
            avatar_url=player_data.avatar_url,
            created_at=datetime.now(timezone.utc),
            created_from=player_data.created_from
        )
        
        # Save to database
        doc = player.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["updated_at"]:
            doc["updated_at"] = doc["updated_at"].isoformat()
        
        await sport_players.insert_one(doc)
        
        return player
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create player: {str(e)}")

@router.put("/{player_id}", response_model=Player)
async def update_player(
    player_id: str,
    player_data: PlayerUpdate,
    admin_user = Depends(get_admin_user)
):
    """Update a player (admin only)"""
    try:
        # Check if player exists
        existing_player = await sport_players.find_one({"player_id": player_id})
        if not existing_player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Build update data
        update_data = {k: v for k, v in player_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update in database
        await sport_players.update_one(
            {"player_id": player_id},
            {"$set": update_data}
        )
        
        # Return updated player
        return await get_player(player_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update player: {str(e)}")

@router.delete("/{player_id}")
async def delete_player(
    player_id: str,
    admin_user = Depends(get_admin_user)
):
    """Soft delete a player (set active=false)"""
    try:
        # Check if player exists
        existing_player = await sport_players.find_one({"player_id": player_id})
        if not existing_player:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Soft delete by setting active=false
        await sport_players.update_one(
            {"player_id": player_id},
            {"$set": {
                "active": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Player deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete player: {str(e)}")


class PhotoUploadRequest(PydanticBaseModel):
    photo_base64: str  # base64 encoded image data

@router.post("/{player_id}/photo")
async def upload_player_photo(
    player_id: str,
    photo_data: PhotoUploadRequest,
    admin_user=Depends(get_admin_user)
):
    """Upload a player photo (base64 encoded). Admin only."""
    existing = await sport_players.find_one({"player_id": player_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Player not found")

    b64 = photo_data.photo_base64
    # Validate it's a reasonable base64 image (max ~5MB)
    if len(b64) > 7_000_000:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    await sport_players.update_one(
        {"player_id": player_id},
        {"$set": {
            "photo_base64": b64,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Photo uploaded successfully", "player_id": player_id}

@router.post("/{player_id}/photo/file")
async def upload_player_photo_file(
    player_id: str,
    file: UploadFile = File(...),
    admin_user=Depends(get_admin_user)
):
    """Upload a player photo as multipart file. Admin only."""
    existing = await sport_players.find_one({"player_id": player_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Player not found")

    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images allowed")

    contents = await file.read()
    if len(contents) > 5_000_000:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")

    b64 = f"data:{file.content_type};base64,{base64.b64encode(contents).decode()}"

    await sport_players.update_one(
        {"player_id": player_id},
        {"$set": {
            "photo_base64": b64,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Photo uploaded successfully", "player_id": player_id}
