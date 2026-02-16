"""
Textbook Access Module - Routes
API endpoints for textbook access management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.auth import get_current_user, get_admin_user, require_permission
from ..models.textbook_access import (
    StudentRecordCreate, StudentRecordUpdate,
    EnrollmentCreate, ApprovalAction, RequestStatus,
    SchoolCreate
)
from ..services.textbook_access_service import textbook_access_service

router = APIRouter(prefix="/textbook-access", tags=["Store - Textbook Access"])


# ============== PUBLIC/USER ENDPOINTS ==============

@router.get("/config")
async def get_config():
    """
    Get configuration data for textbook access forms.
    Returns available years, grades, and relation types.
    """
    return {
        "available_years": textbook_access_service.get_available_years(),
        "current_year": textbook_access_service.get_current_school_year(),
        "grades": textbook_access_service.get_available_grades(),
        "relation_types": textbook_access_service.get_relation_types()
    }


@router.get("/schools")
async def get_schools():
    """Get list of available schools"""
    schools = await textbook_access_service.get_schools()
    return {"schools": schools}


@router.get("/my-students")
async def get_my_students(current_user: dict = Depends(get_current_user)):
    """Get all student records for the current user"""
    students = await textbook_access_service.get_user_students(current_user["user_id"])
    return {"students": students}


@router.post("/students")
async def create_student(
    data: StudentRecordCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new student record with initial enrollment"""
    try:
        result = await textbook_access_service.create_student_record(
            user_id=current_user["user_id"],
            data=data
        )
        # Auto-link pre-sale orders
        try:
            from ..services.presale_import_service import presale_import_service
            student_name = f"{data.first_name} {data.last_name}".strip()
            grade = data.initial_grade or ""
            student_id = result.get("student_id", "")
            if student_id and student_name:
                linked = await presale_import_service.try_auto_link(
                    student_id=student_id,
                    student_name=student_name,
                    grade=str(grade),
                    user_id=current_user["user_id"]
                )
                if linked:
                    result["presale_linked"] = linked
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Pre-sale auto-link failed (non-blocking): {e}")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/students/{student_id}")
async def update_student(
    student_id: str,
    data: StudentRecordUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a student record"""
    try:
        result = await textbook_access_service.update_student_record(
            student_id=student_id,
            user_id=current_user["user_id"],
            data=data,
            is_admin=current_user.get("is_admin", False)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/students/{student_id}/enrollments")
async def add_enrollment(
    student_id: str,
    data: EnrollmentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a new enrollment year to a student"""
    try:
        result = await textbook_access_service.add_enrollment_year(
            student_id=student_id,
            user_id=current_user["user_id"],
            data=data,
            is_admin=current_user.get("is_admin", False)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/students/{student_id}/enrollments/{year}")
async def update_enrollment(
    student_id: str,
    year: int,
    grade: str = Query(..., description="New grade"),
    current_user: dict = Depends(get_current_user)
):
    """Update an enrollment year (change grade)"""
    try:
        result = await textbook_access_service.update_enrollment(
            student_id=student_id,
            year=year,
            user_id=current_user["user_id"],
            grade=grade,
            is_admin=current_user.get("is_admin", False)
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/students/{student_id}")
async def delete_student(
    student_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete (deactivate) a student record"""
    try:
        success = await textbook_access_service.delete_student_record(
            student_id=student_id,
            user_id=current_user["user_id"],
            is_admin=current_user.get("is_admin", False)
        )
        return {"success": success}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/check-access/{catalog_id}")
async def check_catalog_access(
    catalog_id: str,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has approved access to a catalog"""
    result = await textbook_access_service.check_catalog_access(
        user_id=current_user["user_id"],
        catalog_id=catalog_id,
        year=year
    )
    return result


# ============== ADMIN/MODERATOR ENDPOINTS ==============

@router.get("/admin/requests")
async def get_pending_requests(
    status: Optional[str] = None,
    school_id: Optional[str] = None,
    year: Optional[int] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get pending access requests for review"""
    # TODO: Check for textbook_access.view permission for moderators
    requests = await textbook_access_service.get_pending_requests(
        status=status,
        school_id=school_id,
        year=year
    )
    return {"requests": requests}


@router.post("/admin/requests/{student_id}/{year}/approve")
async def approve_request(
    student_id: str,
    year: int,
    action: ApprovalAction,
    admin: dict = Depends(get_admin_user)
):
    """Process approval action on an enrollment request"""
    # TODO: Check for textbook_access.approve permission for moderators
    try:
        result = await textbook_access_service.process_approval(
            student_id=student_id,
            year=year,
            action=action,
            admin_id=admin["user_id"]
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/admin/students/{user_id}")
async def get_user_students_admin(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get all student records for a specific user (admin view)"""
    students = await textbook_access_service.get_user_students(user_id)
    return {"students": students}


@router.get("/admin/all-students")
async def get_all_students_admin(
    status: Optional[str] = None,
    school_id: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """Get all student records from all users (admin view)"""
    students = await textbook_access_service.get_all_students(
        status=status,
        school_id=school_id
    )
    return {"students": students}


@router.get("/students/synced")
async def get_synced_students(
    admin: dict = Depends(get_admin_user)
):
    """Get all synced students (admin view) - for EstudiantesTab"""
    students = await textbook_access_service.get_all_students()
    return {"students": students}


@router.put("/admin/students/{student_id}")
async def update_student_admin(
    student_id: str,
    data: StudentRecordUpdate,
    admin: dict = Depends(get_admin_user)
):
    """Update a student record (admin)"""
    try:
        result = await textbook_access_service.update_student_record(
            student_id=student_id,
            user_id=admin["user_id"],
            data=data,
            is_admin=True
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


from pydantic import BaseModel as _BaseModel

class BulkPresaleRequest(_BaseModel):
    student_ids: List[str]
    presale_mode: bool


@router.post("/admin/students/bulk-presale")
async def bulk_toggle_presale(
    data: BulkPresaleRequest,
    admin: dict = Depends(get_admin_user)
):
    """Toggle pre-sale mode for multiple students"""
    from core.database import get_database
    db = get_database()
    result = await db.store_students.update_many(
        {"student_id": {"$in": data.student_ids}},
        {"$set": {"presale_mode": data.presale_mode}}
    )
    return {
        "success": True,
        "modified": result.modified_count,
        "presale_mode": data.presale_mode
    }



# ============== SCHOOL MANAGEMENT (ADMIN) ==============

@router.post("/admin/schools")
async def create_school(
    data: SchoolCreate,
    admin: dict = Depends(get_admin_user)
):
    """Create a new school"""
    result = await textbook_access_service.create_school(
        name=data.name,
        short_name=data.short_name,
        catalog_id=data.catalog_id
    )
    return result


@router.get("/admin/schools")
async def get_schools_admin(
    admin: dict = Depends(get_admin_user)
):
    """Get all schools (admin view)"""
    schools = await textbook_access_service.get_schools()
    return {"schools": schools}


@router.put("/admin/schools/{school_id}")
async def update_school(
    school_id: str,
    data: SchoolCreate,
    admin: dict = Depends(get_admin_user)
):
    """Update a school"""
    result = await textbook_access_service.update_school(
        school_id=school_id,
        name=data.name,
        short_name=data.short_name,
        catalog_id=data.catalog_id,
        is_active=getattr(data, 'is_active', True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="School not found")
    return result


@router.delete("/admin/schools/{school_id}")
async def delete_school(
    school_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a school"""
    success = await textbook_access_service.delete_school(school_id)
    if not success:
        raise HTTPException(status_code=404, detail="School not found")
    return {"success": True}
