"""
Textbook Access Module - Models
Pydantic models for textbook purchase access requests
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class RequestStatus(str, Enum):
    """Status of a textbook access request"""
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    INFO_REQUIRED = "info_required"


class RelationType(str, Enum):
    """Relationship type between user and student"""
    PARENT = "parent"
    GUARDIAN = "guardian"
    GRANDPARENT = "grandparent"
    REPRESENTATIVE = "representative"
    OTHER = "other"


class SchoolGrade(str, Enum):
    """Available school grades"""
    K3 = "K3"
    K4 = "K4"
    K5 = "K5"
    GRADE_1 = "1"
    GRADE_2 = "2"
    GRADE_3 = "3"
    GRADE_4 = "4"
    GRADE_5 = "5"
    GRADE_6 = "6"
    GRADE_7 = "7"
    GRADE_8 = "8"
    GRADE_9 = "9"
    GRADE_10 = "10"
    GRADE_11 = "11"
    GRADE_12 = "12"


# ============== SCHOOL MODELS ==============

class School(BaseModel):
    """School/Institution model"""
    school_id: str
    name: str
    short_name: Optional[str] = None
    catalog_id: Optional[str] = None  # Link to private catalog
    is_active: bool = True


class SchoolCreate(BaseModel):
    """Create a new school"""
    name: str
    short_name: Optional[str] = None
    catalog_id: Optional[str] = None
    is_active: bool = True


# ============== STUDENT ENROLLMENT MODELS ==============

class SchoolYearEnrollment(BaseModel):
    """Student enrollment for a specific school year"""
    year: int  # e.g., 2026
    grade: str  # K3, K4, 1, 2, etc.
    is_editable: bool = True  # False for past years
    status: RequestStatus = RequestStatus.PENDING
    approved_at: Optional[str] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None


class StudentRecord(BaseModel):
    """A student record linked to a user"""
    student_id: Optional[str] = None
    user_id: str  # Owner of this record
    first_name: str = ""
    last_name: str = ""
    full_name: Optional[str] = None  # Computed: first_name + last_name (backward compat)
    school_id: str
    school_name: Optional[str] = None  # Denormalized for display
    student_number: Optional[str] = None  # Optional school ID
    relation_type: RelationType
    relation_other: Optional[str] = None  # If relation_type is OTHER
    enrollments: List[SchoolYearEnrollment] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_active: bool = True
    # Lock fields
    is_locked: bool = False  # True when any enrollment is approved
    locked_at: Optional[str] = None
    locked_by: Optional[str] = None  # "system" or admin user_id
    unlock_reason: Optional[str] = None  # If admin unlocked


class StudentRecordCreate(BaseModel):
    """Create a new student record"""
    first_name: str
    last_name: str
    school_id: str
    student_number: Optional[str] = None
    relation_type: RelationType
    relation_other: Optional[str] = None
    year: int  # Initial enrollment year
    grade: str  # Initial grade


class StudentRecordUpdate(BaseModel):
    """Update a student record"""
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None  # Legacy support
    school_id: Optional[str] = None
    student_number: Optional[str] = None
    relation_type: Optional[RelationType] = None
    relation_other: Optional[str] = None


class EnrollmentCreate(BaseModel):
    """Add a new enrollment year to a student"""
    year: int
    grade: str


class EnrollmentUpdate(BaseModel):
    """Update an enrollment (grade change, etc.)"""
    grade: Optional[str] = None


# ============== ADMIN APPROVAL MODELS ==============

class ApprovalAction(BaseModel):
    """Action for approving/rejecting a request"""
    status: RequestStatus
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None


class AccessRequestFilter(BaseModel):
    """Filters for querying access requests"""
    status: Optional[RequestStatus] = None
    school_id: Optional[str] = None
    year: Optional[int] = None
    user_id: Optional[str] = None


# ============== RESPONSE MODELS ==============

class StudentRecordResponse(BaseModel):
    """Response model for student record"""
    student_id: str
    user_id: str
    first_name: str = ""
    last_name: str = ""
    full_name: str = ""  # Computed for backward compat
    school_id: str
    school_name: Optional[str] = None
    student_number: Optional[str] = None
    relation_type: RelationType
    relation_other: Optional[str] = None
    enrollments: List[SchoolYearEnrollment] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    is_active: bool = True
    # Computed fields
    has_approved_access: bool = False
    current_year_status: Optional[RequestStatus] = None


class PendingRequestResponse(BaseModel):
    """Response for admin panel - pending requests"""
    student_id: str
    student_name: str
    school_id: str
    school_name: str
    year: int
    grade: str
    relation_type: str
    user_id: str
    user_name: str
    user_email: str
    status: RequestStatus
    created_at: str
    student_number: Optional[str] = None
