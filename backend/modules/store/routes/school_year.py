"""
School Year Configuration Routes
Admin endpoints for managing school year settings and student locks
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from datetime import datetime, timezone

from core.auth import get_admin_user
from core.database import db
from ..services.school_year_service import school_year_service, SchoolYearConfigUpdate

router = APIRouter(prefix="/school-year", tags=["Store - School Year Config"])


# ============== SCHOOL YEAR CONFIG ==============

@router.get("/config")
async def get_school_year_config(admin: dict = Depends(get_admin_user)):
    """Get school year configuration"""
    config = await school_year_service.get_config()
    return config


@router.put("/config")
async def update_school_year_config(
    updates: SchoolYearConfigUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update school year configuration"""
    update_dict = updates.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    config = await school_year_service.update_config(
        updates=update_dict,
        admin_id=admin["user_id"]
    )
    return {"success": True, "config": config}


@router.get("/status")
async def get_enrollment_status(admin: dict = Depends(get_admin_user)):
    """Get current enrollment status and next school year"""
    config = await school_year_service.get_config()
    should_add = await school_year_service.should_add_new_enrollment()
    next_year = await school_year_service.get_next_school_year()
    
    return {
        "config": config,
        "should_add_new_enrollment": should_add,
        "next_school_year": next_year,
        "current_date": datetime.now(timezone.utc).isoformat()
    }


# ============== STUDENT LOCK/UNLOCK ==============

@router.post("/students/{student_id}/unlock")
async def unlock_student(
    student_id: str,
    reason: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Unlock a student record for editing (admin only)"""
    result = await db.store_students.update_one(
        {"student_id": student_id},
        {
            "$set": {
                "is_locked": False,
                "unlock_reason": reason,
                "unlocked_at": datetime.now(timezone.utc).isoformat(),
                "unlocked_by": admin["user_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"success": True, "message": "Student record unlocked"}


@router.post("/students/{student_id}/lock")
async def lock_student(
    student_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Lock a student record (admin only)"""
    result = await db.store_students.update_one(
        {"student_id": student_id},
        {
            "$set": {
                "is_locked": True,
                "locked_at": datetime.now(timezone.utc).isoformat(),
                "locked_by": admin["user_id"],
                "unlock_reason": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {"success": True, "message": "Student record locked"}


# ============== ENROLLMENT MANAGEMENT ==============

@router.post("/students/{student_id}/enrollments")
async def add_enrollment_year(
    student_id: str,
    year: int,
    grade: str,
    admin: dict = Depends(get_admin_user)
):
    """Add a new enrollment year to a student (admin only)"""
    # Check if student exists
    student = await db.store_students.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if enrollment for this year already exists
    enrollments = student.get("enrollments", [])
    for e in enrollments:
        if e.get("year") == year:
            raise HTTPException(status_code=400, detail=f"Enrollment for year {year} already exists")
    
    # Add new enrollment
    new_enrollment = {
        "year": year,
        "grade": grade,
        "is_editable": True,
        "status": "pending",
        "approved_at": None,
        "approved_by": None,
        "rejection_reason": None,
        "admin_notes": None,
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": admin["user_id"]
    }
    
    await db.store_students.update_one(
        {"student_id": student_id},
        {
            "$push": {"enrollments": new_enrollment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    return {"success": True, "message": f"Enrollment for year {year} added", "enrollment": new_enrollment}


@router.post("/trigger-auto-enrollment")
async def trigger_auto_enrollment(
    admin: dict = Depends(get_admin_user)
):
    """Manually trigger auto-enrollment for next school year (admin only)
    This adds a new enrollment entry to all students who have an approved current year
    """
    config = await school_year_service.get_config()
    next_year = await school_year_service.get_next_school_year()
    current_year = config.get("current_school_year", datetime.now().year)
    
    # Find all students with approved enrollment in current year
    students = await db.store_students.find({
        "enrollments": {
            "$elemMatch": {
                "year": current_year,
                "status": "approved"
            }
        }
    }, {"_id": 0}).to_list(1000)
    
    added_count = 0
    skipped_count = 0
    
    for student in students:
        enrollments = student.get("enrollments", [])
        
        # Check if next year enrollment already exists
        has_next_year = any(e.get("year") == next_year for e in enrollments)
        if has_next_year:
            skipped_count += 1
            continue
        
        # Get current year grade
        current_enrollment = next((e for e in enrollments if e.get("year") == current_year), None)
        if not current_enrollment:
            continue
        
        # Add new enrollment with empty grade (user will select)
        new_enrollment = {
            "year": next_year,
            "grade": "",  # Empty - user must select
            "is_editable": True,
            "status": "pending",
            "approved_at": None,
            "approved_by": None,
            "added_at": datetime.now(timezone.utc).isoformat(),
            "added_by": "system_auto"
        }
        
        await db.store_students.update_one(
            {"student_id": student["student_id"]},
            {
                "$push": {"enrollments": new_enrollment},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        added_count += 1
    
    return {
        "success": True,
        "next_year": next_year,
        "students_processed": len(students),
        "enrollments_added": added_count,
        "skipped_already_exists": skipped_count
    }
