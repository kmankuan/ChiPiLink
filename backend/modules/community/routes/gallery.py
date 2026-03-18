"""
Community Module - Gallery Routes
Endpoints para gallery usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List

from core.auth import get_admin_user
from ..models import Album, AlbumCreate, AlbumUpdate
from ..services import album_service

router = APIRouter(prefix="/gallery", tags=["Community - Gallery"])


@router.get("", response_model=List[Album])
async def get_albums():
    """Get albumes activos"""
    return await album_service.get_active_albums()


@router.get("/{album_id}", response_model=Album)
async def get_album(album_id: str):
    """Get album by ID"""
    album = await album_service.get_album(album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


# ============== ADMIN ROUTES ==============

@router.get("/admin/all", response_model=List[Album])
async def get_all_albums(
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """Get todos los albumes (admin)"""
    return await album_service.get_all_albums(limit=limit)


@router.post("/admin", response_model=Album)
async def create_album(
    data: AlbumCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create nuevo album (admin)"""
    return await album_service.create_album(data)


@router.put("/admin/{album_id}", response_model=Album)
async def update_album(
    album_id: str,
    data: AlbumUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update album (admin)"""
    album = await album_service.update_album(album_id, data)
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album


@router.delete("/admin/{album_id}")
async def delete_album(
    album_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete album (admin)"""
    success = await album_service.delete_album(album_id)
    if not success:
        raise HTTPException(status_code=404, detail="Album not found")
    return {"success": True}
