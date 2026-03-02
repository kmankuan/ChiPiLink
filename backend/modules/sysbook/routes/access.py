"""
Sysbook Module - Access Routes
Student-parent linking and textbook access management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List

from core.auth import get_current_user, get_admin_user, require_permission
from modules.sysbook.models.textbook_access import (
    StudentRecordCreate, StudentRecordUpdate,
    EnrollmentCreate, ApprovalAction, RequestStatus,
    SchoolCreate
)
from modules.sysbook.services.textbook_access_service import textbook_access_service

router = APIRouter(prefix="/access", tags=["Sysbook - Access"])


# ============== PUBLIC/USER ENDPOINTS ==============

@router.get("/config")
async def get_config():
    """
    Get configuration data for textbook access forms.
    Returns available years, grades, and relation types.
    """
    from core.database import db
    access_config = await db.app_config.find_one({"key": "sysbook_access_config"}, {"_id": 0})
    return {
        "available_years": textbook_access_service.get_available_years(),
        "current_year": textbook_access_service.get_current_school_year(),
        "grades": textbook_access_service.get_available_grades(),
        "relation_types": textbook_access_service.get_relation_types(),
        "require_approval": (access_config or {}).get("require_approval", False),
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

        # Save guardian profile for auto-fill on next student link
        try:
            from core.database import db as _db
            guardian_update = {}
            if data.guardian_name: guardian_update["guardian_name"] = data.guardian_name.strip()
            if data.guardian_email: guardian_update["guardian_email"] = data.guardian_email.strip()
            if data.guardian_phone: guardian_update["guardian_phone"] = data.guardian_phone.strip()
            if guardian_update:
                await _db.auth_users.update_one(
                    {"user_id": current_user["user_id"]},
                    {"$set": guardian_update}
                )
        except Exception:
            pass

        # Suggest pre-sale order link (admin must confirm)
        try:
            from modules.sysbook.services.presale_import_service import presale_import_service
            student_name = f"{data.first_name} {data.last_name}".strip()
            grade = data.grade or ""
            student_id = result.get("student_id", "")
            if student_id and student_name:
                suggestion = await presale_import_service.suggest_link(
                    student_id=student_id,
                    student_name=student_name,
                    grade=str(grade),
                    user_id=current_user["user_id"]
                )
                if suggestion:
                    result["presale_suggestion"] = suggestion
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Pre-sale link suggestion failed (non-blocking): {e}")

        # Broadcast real-time event to admin
        try:
            from modules.realtime.events import emit_access_request_created
            student_name = f"{data.first_name} {data.last_name}".strip()
            await emit_access_request_created(
                student_id=result.get("student_id", ""),
                student_name=student_name,
                grade=str(data.grade or ""),
                school_name=data.school_name or "",
                user_id=current_user["user_id"],
            )
        except Exception:
            pass  # Non-blocking

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


@router.get("/check-access/{inventory_id}")
async def check_inventory_access(
    inventory_id: str,
    year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """Check if user has approved access to a sysbook inventory"""
    result = await textbook_access_service.check_inventory_access(
        user_id=current_user["user_id"],
        inventory_id=inventory_id,
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
    try:
        result = await textbook_access_service.process_approval(
            student_id=student_id,
            year=year,
            action=action,
            admin_id=admin["user_id"]
        )

        # Broadcast real-time event
        try:
            from modules.realtime.events import emit_access_request_updated
            from core.database import db
            student = await db.store_students.find_one(
                {"student_id": student_id}, {"_id": 0, "full_name": 1, "user_id": 1}
            )
            if student:
                await emit_access_request_updated(
                    student_id=student_id,
                    student_name=student.get("full_name", ""),
                    new_status=action.status,
                    user_id=student.get("user_id", ""),
                    admin_name=admin.get("nombre", admin.get("email", "")),
                )
        except Exception:
            pass  # Non-blocking

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
        inventory_id=data.catalog_id,
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


# ============== ACCESS CONFIG (approval settings) ==============

@router.get("/admin/access-config")
async def get_access_config(admin: dict = Depends(get_admin_user)):
    """Get access/linking configuration"""
    from core.database import db
    config = await db.app_config.find_one({"key": "sysbook_access_config"}, {"_id": 0})
    return config or {"key": "sysbook_access_config", "require_approval": False}


@router.put("/admin/access-config")
async def update_access_config(data: dict, admin: dict = Depends(get_admin_user)):
    """Update access/linking configuration"""
    from core.database import db
    from datetime import datetime, timezone
    await db.app_config.update_one(
        {"key": "sysbook_access_config"},
        {"$set": {
            "key": "sysbook_access_config",
            "require_approval": data.get("require_approval", False),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": admin["user_id"],
        }},
        upsert=True,
    )
    return {"success": True}
