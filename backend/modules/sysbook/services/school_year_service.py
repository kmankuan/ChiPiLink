"""
School Year Configuration Models and Service
Manages school year settings, enrollment periods, and auto-generation of year/grade fields
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import logging

from core.database import db

logger = logging.getLogger(__name__)


class SchoolCalendarType(str, Enum):
    """Panama has two school calendar types"""
    OFFICIAL = "official"  # Calendario oficial (Marzo-Diciembre)
    PARTICULAR = "particular"  # Colegios particulares (Enero-Noviembre/Diciembre)


class SchoolYearConfig(BaseModel):
    """Configuration for school year settings"""
    calendar_type: SchoolCalendarType = SchoolCalendarType.OFFICIAL
    enrollment_start_month: int = Field(ge=1, le=12, default=1)  # When to add new year/grade field
    enrollment_start_day: int = Field(ge=1, le=31, default=15)
    current_school_year: int = Field(default_factory=lambda: datetime.now().year)
    auto_add_enabled: bool = True  # Whether to auto-add year/grade field
    months_before_year_end: int = Field(ge=0, le=6, default=2)  # Alternative: X months before year ends


class SchoolYearConfigUpdate(BaseModel):
    """Request to update school year config"""
    calendar_type: Optional[SchoolCalendarType] = None
    enrollment_start_month: Optional[int] = Field(None, ge=1, le=12)
    enrollment_start_day: Optional[int] = Field(None, ge=1, le=31)
    current_school_year: Optional[int] = None
    auto_add_enabled: Optional[bool] = None
    months_before_year_end: Optional[int] = Field(None, ge=0, le=6)


class SchoolYearService:
    """Service for managing school year configuration"""
    
    COLLECTION = "store_school_year_config"
    CONFIG_ID = "default_config"
    
    async def get_config(self) -> dict:
        """Get current school year configuration"""
        config = await db[self.COLLECTION].find_one(
            {"config_id": self.CONFIG_ID},
            {"_id": 0}
        )
        
        if not config:
            # Return default config
            return {
                "config_id": self.CONFIG_ID,
                "calendar_type": SchoolCalendarType.OFFICIAL.value,
                "enrollment_start_month": 1,
                "enrollment_start_day": 15,
                "current_school_year": datetime.now().year,
                "auto_add_enabled": True,
                "months_before_year_end": 2,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        
        return config
    
    async def update_config(self, updates: dict, admin_id: str) -> dict:
        """Update school year configuration"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        updates["updated_by"] = admin_id
        
        await db[self.COLLECTION].update_one(
            {"config_id": self.CONFIG_ID},
            {
                "$set": updates,
                "$setOnInsert": {
                    "config_id": self.CONFIG_ID,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
        
        logger.info(f"School year config updated by admin {admin_id}")
        return await self.get_config()
    
    async def should_add_new_enrollment(self) -> bool:
        """Check if it's time to add new enrollment field for next year"""
        config = await self.get_config()
        
        if not config.get("auto_add_enabled", True):
            return False
        
        today = datetime.now()
        start_month = config.get("enrollment_start_month", 1)
        start_day = config.get("enrollment_start_day", 15)
        
        # Check if we've passed the enrollment start date
        enrollment_start = datetime(today.year, start_month, start_day)
        
        return today >= enrollment_start
    
    async def get_next_school_year(self) -> int:
        """Get the next school year based on configuration"""
        config = await self.get_config()
        current_year = config.get("current_school_year", datetime.now().year)
        
        today = datetime.now()
        start_month = config.get("enrollment_start_month", 1)
        
        # If we're past the enrollment start, next year is current_year + 1
        if today.month >= start_month:
            return current_year + 1
        
        return current_year


# Singleton instance
school_year_service = SchoolYearService()
