"""
Auth Module - User Routes
Endpoints for user management using the Service Layer
All field names use English conventions
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional

from core.auth import get_current_user, get_admin_user
from ..models import User, UserUpdate
from ..services import user_service

router = APIRouter(prefix="/users", tags=["Auth - Users"])


@router.get("/me", response_model=User)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get current user profile"""
    user = await user_service.get_user(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/me", response_model=User)
async def update_my_profile(
    data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update current user profile"""
    user = await user_service.update_user(current_user["user_id"], data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============== ADMIN ROUTES ==============

@router.get("", response_model=List[User])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_admin: Optional[bool] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all users (admin)"""
    return await user_service.get_all_users(
        skip=skip,
        limit=limit,
        is_admin=is_admin
    )


@router.get("/stats")
async def get_user_stats(admin: dict = Depends(get_admin_user)):
    """Get user statistics (admin)"""
    return await user_service.get_user_stats()


@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get user by ID (admin)"""
    user = await user_service.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    data: UserUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update user (admin)"""
    user = await user_service.update_user(user_id, data)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
