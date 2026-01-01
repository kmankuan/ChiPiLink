"""
Membership Models for ChiPi Link
Handles membership plans, subscriptions, and check-ins
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from uuid import uuid4

# Plan Types
PlanType = Literal["unlimited_monthly", "credits_10", "credits_12", "credits_15"]
MembershipStatus = Literal["active", "expired", "pending", "cancelled"]
CheckInMethod = Literal["qr", "pin", "geolocation", "manual"]

class MembershipPlan(BaseModel):
    """Membership plan configuration"""
    plan_id: str = Field(default_factory=lambda: str(uuid4()))
    name: str
    name_zh: Optional[str] = None
    name_en: Optional[str] = None
    plan_type: PlanType
    price: float
    credits: Optional[int] = None  # For credit-based plans
    duration_days: int = 30  # For unlimited monthly
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class MemberProfile(BaseModel):
    """Member profile linked to user account"""
    member_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str  # Link to users collection
    qr_code: str = Field(default_factory=lambda: f"CHIPI-{uuid4().hex[:8].upper()}")
    pin_code: str = Field(default_factory=lambda: str(uuid4().int)[:6])
    
    # Current membership
    current_plan_id: Optional[str] = None
    membership_status: MembershipStatus = "pending"
    credits_remaining: int = 0
    membership_start: Optional[datetime] = None
    membership_end: Optional[datetime] = None
    
    # Stats
    total_visits: int = 0
    last_check_in: Optional[datetime] = None
    
    # Monday.com sync
    monday_item_id: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CheckIn(BaseModel):
    """Check-in/Check-out record"""
    checkin_id: str = Field(default_factory=lambda: str(uuid4()))
    member_id: str
    user_id: str
    
    check_in_time: datetime = Field(default_factory=datetime.utcnow)
    check_out_time: Optional[datetime] = None
    
    method: CheckInMethod
    
    # Geolocation data
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_verified: bool = False
    
    # Duration in minutes
    duration_minutes: Optional[int] = None
    
    # If credit was deducted
    credit_deducted: bool = False
    
    notes: Optional[str] = None

class MembershipTransaction(BaseModel):
    """Transaction record for membership purchases"""
    transaction_id: str = Field(default_factory=lambda: str(uuid4()))
    member_id: str
    user_id: str
    plan_id: str
    
    amount: float
    payment_method: str  # yappy, transfer, cash, etc.
    payment_reference: Optional[str] = None
    
    status: Literal["pending", "completed", "failed", "refunded"] = "pending"
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
