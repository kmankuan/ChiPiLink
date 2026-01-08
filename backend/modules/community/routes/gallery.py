"""
Community Module - Gallery Routes
Endpoints para galería usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List

from core.auth import get_admin_user
from ..models import Album, AlbumCreate, AlbumUpdate
from ..services import album_service

router = APIRouter(prefix="/gallery", tags=["Community - Gallery"])


@router.get("", response_model=List[Album])
async def get_albums():
    """Obtener álbumes activos"""
    return await album_service.get_active_albums()


@router.get("/{album_id}", response_model=Album)
async def get_album(album_id: str):
    """Obtener álbum por ID"""
    album = await album_service.get_album(album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return album


# ============== ADMIN ROUTES ==============

@router.get("/admin/all", response_model=List[Album])
async def get_all_albums(
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user)
):
    """Obtener todos los álbumes (admin)"""
    return await album_service.get_all_albums(limit=limit)


@router.post("/admin", response_model=Album)
async def create_album(
    data: AlbumCreate,
    admin: dict = Depends(get_admin_user)
):
    """Crear nuevo álbum (admin)"""
    return await album_service.create_album(data)


@router.put("/admin/{album_id}", response_model=Album)
async def update_album(
    album_id: str,
    data: AlbumUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar álbum (admin)"""
    album = await album_service.update_album(album_id, data)
    if not album:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return album


@router.delete("/admin/{album_id}")
async def delete_album(
    album_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Eliminar álbum (admin)"""
    success = await album_service.delete_album(album_id)
    if not success:
        raise HTTPException(status_code=404, detail="Álbum no encontrado")
    return {"success": True}
