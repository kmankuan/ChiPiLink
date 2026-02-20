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


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete user (admin). Cannot delete yourself."""
    if user_id == admin["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    deleted = await user_service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found")
    return {"detail": "User deleted"}


@router.post("/{user_id}/impersonate")
async def impersonate_user(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Generate a short-lived impersonation token so admin can view the app as this user.
    Token expires in 30 minutes. Logged for audit."""
    from core.auth import create_impersonation_token
    from core.database import db
    from datetime import datetime, timezone

    target = await user_service.get_user(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_impersonation_token(user_id, admin["user_id"])

    # Audit log
    target_dict = target.dict() if hasattr(target, 'dict') else target
    await db.impersonation_logs.insert_one({
        "admin_user_id": admin["user_id"],
        "admin_name": admin.get("name", admin.get("email", "")),
        "target_user_id": user_id,
        "target_name": target_dict.get("name", target_dict.get("email", "")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "token": token,
        "user": {
            "user_id": target_dict.get("user_id"),
            "name": target_dict.get("name"),
            "email": target_dict.get("email"),
        }
    }
