"""
Auth Module - User Routes
Endpoints para gestión de usuarios usando el Service Layer
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models import User, UserUpdate
from ..services import user_service

router = APIRouter(prefix="/users", tags=["Auth - Users"])


@router.get("/me", response_model=User)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Obtener perfil del usuario actual"""
    user = await user_service.get_user(current_user["cliente_id"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/me", response_model=User)
async def update_my_profile(
    data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Actualizar perfil del usuario actual"""
    user = await user_service.update_user(current_user["cliente_id"], data)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


# ============== ADMIN ROUTES ==============

@router.get("", response_model=List[User])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    es_admin: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """Obtener todos los usuarios (admin)"""
    return await user_service.get_all_users(
        skip=skip,
        limit=limit,
        es_admin=es_admin
    )


@router.get("/stats")
async def get_user_stats(admin: dict = Depends(get_admin_user)):
    """Obtener estadísticas de usuarios (admin)"""
    return await user_service.get_user_stats()


@router.get("/{cliente_id}", response_model=User)
async def get_user(
    cliente_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Obtener usuario por ID (admin)"""
    user = await user_service.get_user(cliente_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user


@router.put("/{cliente_id}", response_model=User)
async def update_user(
    cliente_id: str,
    data: UserUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Actualizar usuario (admin)"""
    user = await user_service.update_user(cliente_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return user
