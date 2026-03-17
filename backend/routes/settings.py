from fastapi import APIRouter, HTTPException, Depends
from ..core.database import sport_settings
from ..core.auth import get_admin_user
from ..models.settings import SportSettings, TVSettings
from typing import Dict, Any

router = APIRouter(prefix="/api/sport/settings", tags=["settings"])

def get_default_settings() -> SportSettings:
    """Get default sport settings"""
    return SportSettings()

@router.get("", response_model=SportSettings)
async def get_settings(
    admin_user = Depends(get_admin_user)
):
    """Get sport settings (admin only)"""
    try:
        # Get settings from database
        settings_data = await sport_settings.find_one({"_id": "global"}, {"_id": 0})
        
        if not settings_data:
            # Return default settings if none exist
            return get_default_settings()
        
        return SportSettings(**settings_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch settings: {str(e)}")

@router.put("", response_model=SportSettings)
async def update_settings(
    settings: SportSettings,
    admin_user = Depends(get_admin_user)
):
    """Update sport settings (admin only)"""
    try:
        # Convert to dict
        settings_dict = settings.model_dump()
        
        # Update or insert settings
        await sport_settings.replace_one(
            {"_id": "global"},
            settings_dict,
            upsert=True
        )
        
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.get("/tv", response_model=TVSettings)
async def get_tv_settings():
    """Get TV display settings (public - no auth required)"""
    try:
        # Get settings from database
        settings_data = await sport_settings.find_one({"_id": "global"}, {"_id": 0})
        
        if not settings_data:
            # Return default TV settings
            default_settings = get_default_settings()
            return default_settings.tv
        
        full_settings = SportSettings(**settings_data)
        return full_settings.tv
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch TV settings: {str(e)}")
