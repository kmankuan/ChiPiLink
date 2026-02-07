"""
Textbook Access Module - Service
Business logic for textbook access management
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import logging

from core.base import BaseService
from core.database import db
from ..repositories.textbook_access_repository import school_repository, student_record_repository
from ..models.textbook_access import (
    RequestStatus, RelationType, SchoolGrade,
    StudentRecordCreate, StudentRecordUpdate, 
    EnrollmentCreate, ApprovalAction
)

logger = logging.getLogger(__name__)


class TextbookAccessService(BaseService):
    """
    Service for managing textbook purchase access requests.
    Handles student records, enrollment years, and approval workflow.
    """
    
    MODULE_NAME = "textbook_access"
    
    def __init__(self):
        super().__init__()
        self.school_repo = school_repository
        self.student_repo = student_record_repository
    
    # ============== SCHOOL MANAGEMENT ==============
    
    async def get_schools(self) -> List[Dict]:
        """Get all active schools"""
        return await self.school_repo.get_all_active()
    
    async def create_school(self, name: str, short_name: str = None, catalog_id: str = None) -> Dict:
        """Create a new school"""
        data = {
            "name": name,
            "short_name": short_name,
            "catalog_id": catalog_id
        }
        return await self.school_repo.create(data)
    
    async def update_school(self, school_id: str, name: str, short_name: str = None, 
                           catalog_id: str = None, is_active: bool = True) -> Optional[Dict]:
        """Update a school"""
        return await self.school_repo.update(school_id, {
            "name": name,
            "short_name": short_name,
            "catalog_id": catalog_id,
            "is_active": is_active
        })
    
    async def delete_school(self, school_id: str) -> bool:
        """Delete (deactivate) a school"""
        result = await self.school_repo.update(school_id, {"is_active": False})
        return result is not None
    
    async def get_school(self, school_id: str) -> Optional[Dict]:
        """Get a school by ID"""
        return await self.school_repo.get_by_id(school_id)
    
    # ============== YEAR LOGIC ==============
    
    def get_current_school_year(self) -> int:
        """Get the current school year based on date"""
        now = datetime.now(timezone.utc)
        # School year starts in January
        return now.year
    
    def get_available_years(self) -> List[Dict]:
        """
        Get available years for enrollment.
        Current year is always available.
        From October onwards, next year is also available.
        """
        now = datetime.now(timezone.utc)
        current_year = now.year
        current_month = now.month
        
        years = [{"year": current_year, "is_current": True}]
        
        # From October onwards, allow next year
        if current_month >= 10:
            years.append({"year": current_year + 1, "is_current": False})
        
        return years
    
    def is_year_editable(self, year: int) -> bool:
        """
        Check if a year is editable.
        Current and future years are editable, past years are not.
        """
        current_year = self.get_current_school_year()
        return year >= current_year
    
    # ============== STUDENT RECORD MANAGEMENT ==============
    
    @staticmethod
    def _normalize_name_fields(student: Dict) -> None:
        """Ensure first_name, last_name, and full_name are all present (backward compat)"""
        first = student.get("first_name", "")
        last = student.get("last_name", "")
        full = student.get("full_name", "")
        
        if first or last:
            # New-style record: compute full_name
            student["first_name"] = first
            student["last_name"] = last
            student["full_name"] = f"{first} {last}".strip()
        elif full:
            # Legacy record: split full_name into first/last
            parts = full.strip().split(" ", 1)
            student["first_name"] = parts[0]
            student["last_name"] = parts[1] if len(parts) > 1 else ""
            student["full_name"] = full
        else:
            student["first_name"] = ""
            student["last_name"] = ""
            student["full_name"] = ""
    
    async def get_user_students(self, user_id: str) -> List[Dict]:
        """Get all student records for a user with computed fields"""
        students = await self.student_repo.get_by_user(user_id)
        current_year = self.get_current_school_year()
        
        # Enrich with computed fields
        for student in students:
            # Get school name
            school = await self.school_repo.get_by_id(student.get("school_id"))
            student["school_name"] = school.get("name") if school else "Unknown"
            
            # Mark which years are editable
            enrollments = student.get("enrollments", [])
            for enrollment in enrollments:
                enrollment["is_editable"] = self.is_year_editable(enrollment.get("year", 0))
            
            # Check if user has approved access for current year
            student["has_approved_access"] = any(
                e.get("year") == current_year and e.get("status") == "approved"
                for e in enrollments
            )
            
            # Get current year enrollment and flatten key fields for frontend
            current_enrollment = next(
                (e for e in enrollments if e.get("year") == current_year),
                None
            )
            
            # Flatten status, grade, and year for easy frontend access
            if current_enrollment:
                student["status"] = current_enrollment.get("status", "pending")
                student["grade"] = current_enrollment.get("grade", "")
                student["year"] = current_enrollment.get("year")
            else:
                # Fallback to first enrollment if no current year
                first_enrollment = enrollments[0] if enrollments else {}
                student["status"] = first_enrollment.get("status", "pending")
                student["grade"] = first_enrollment.get("grade", "")
                student["year"] = first_enrollment.get("year", current_year)
            
            student["current_year_status"] = student["status"]
        
        return students
    
    async def get_all_students(self, status: str = None, school_id: str = None) -> List[Dict]:
        """Get all student records from all users (admin view)"""
        students = await self.student_repo.get_all(status=status, school_id=school_id)
        current_year = self.get_current_school_year()
        
        # Enrich with computed fields
        for student in students:
            # Get school name
            school = await self.school_repo.get_by_id(student.get("school_id"))
            student["school_name"] = school.get("name") if school else "Unknown"
            
            # Flatten enrollment data
            enrollments = student.get("enrollments", [])
            current_enrollment = next(
                (e for e in enrollments if e.get("year") == current_year),
                enrollments[0] if enrollments else {}
            )
            
            student["status"] = current_enrollment.get("status", "pending")
            student["grade"] = current_enrollment.get("grade", "")
            student["year"] = current_enrollment.get("year", current_year)
        
        return students
    
    async def create_student_record(self, user_id: str, data: StudentRecordCreate) -> Dict:
        """Create a new student record with initial enrollment"""
        # Get school info
        school = await self.school_repo.get_by_id(data.school_id)
        if not school:
            raise ValueError("School not found")
        
        # Validate relation_other if relation_type is OTHER
        if data.relation_type == RelationType.OTHER and not data.relation_other:
            raise ValueError("Please specify the relationship type")
        
        # Create initial enrollment
        enrollment = {
            "year": data.year,
            "grade": data.grade,
            "is_editable": self.is_year_editable(data.year),
            "status": RequestStatus.PENDING.value,
            "approved_at": None,
            "approved_by": None,
            "rejection_reason": None,
            "admin_notes": None
        }
        
        full_name = f"{data.first_name} {data.last_name}".strip()
        student_data = {
            "user_id": user_id,
            "first_name": data.first_name,
            "last_name": data.last_name,
            "full_name": full_name,
            "school_id": data.school_id,
            "school_name": school.get("name"),
            "student_number": data.student_number,
            "relation_type": data.relation_type.value,
            "relation_other": data.relation_other if data.relation_type == RelationType.OTHER else None,
            "enrollments": [enrollment]
        }
        
        result = await self.student_repo.create(student_data)
        
        self.log_info(f"Student record created: {result['student_id']} by user {user_id}")
        
        # Send notification to admins/moderators
        await self._notify_new_request(result, enrollment)
        
        return result
    
    async def update_student_record(
        self, 
        student_id: str, 
        user_id: str,
        data: StudentRecordUpdate,
        is_admin: bool = False
    ) -> Optional[Dict]:
        """Update a student record"""
        student = await self.student_repo.get_by_id(student_id)
        
        if not student:
            raise ValueError("Student record not found")
        
        # Check ownership (unless admin)
        if not is_admin and student.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Check if student is locked (users cannot edit, admins can)
        if student.get("is_locked", False) and not is_admin:
            raise ValueError("This student record is locked. Contact admin if you need to make changes.")
        
        update_data = data.model_dump(exclude_unset=True)
        
        # If changing school, get new school name
        if "school_id" in update_data:
            school = await self.school_repo.get_by_id(update_data["school_id"])
            if school:
                update_data["school_name"] = school.get("name")
        
        # Handle relation_other
        if "relation_type" in update_data:
            if update_data["relation_type"] != RelationType.OTHER.value:
                update_data["relation_other"] = None
        
        await self.student_repo.update_student(student_id, update_data)
        
        return await self.student_repo.get_by_id(student_id)
    
    async def add_enrollment_year(
        self,
        student_id: str,
        user_id: str,
        data: EnrollmentCreate,
        is_admin: bool = False
    ) -> Dict:
        """Add a new enrollment year to a student record"""
        student = await self.student_repo.get_by_id(student_id)
        
        if not student:
            raise ValueError("Student record not found")
        
        # Check ownership (unless admin)
        if not is_admin and student.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Check if year is available
        available_years = [y["year"] for y in self.get_available_years()]
        if data.year not in available_years:
            raise ValueError(f"Year {data.year} is not available for enrollment")
        
        # Check if year already exists
        existing_years = [e.get("year") for e in student.get("enrollments", [])]
        if data.year in existing_years:
            raise ValueError(f"Enrollment for year {data.year} already exists")
        
        enrollment = {
            "year": data.year,
            "grade": data.grade,
            "is_editable": True,
            "status": RequestStatus.PENDING.value,
            "approved_at": None,
            "approved_by": None,
            "rejection_reason": None,
            "admin_notes": None
        }
        
        await self.student_repo.add_enrollment(student_id, enrollment)
        
        self.log_info(f"Enrollment added: student {student_id}, year {data.year}")
        
        # Notify admins
        await self._notify_new_request(student, enrollment)
        
        return await self.student_repo.get_by_id(student_id)
    
    async def update_enrollment(
        self,
        student_id: str,
        year: int,
        user_id: str,
        grade: str,
        is_admin: bool = False
    ) -> Dict:
        """Update an enrollment year (grade change)"""
        student = await self.student_repo.get_by_id(student_id)
        
        if not student:
            raise ValueError("Student record not found")
        
        # Check ownership (unless admin)
        if not is_admin and student.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        # Check if year is editable
        if not self.is_year_editable(year):
            raise ValueError(f"Year {year} is no longer editable")
        
        await self.student_repo.update_enrollment(student_id, year, {"grade": grade})
        
        return await self.student_repo.get_by_id(student_id)
    
    async def delete_student_record(
        self,
        student_id: str,
        user_id: str,
        is_admin: bool = False
    ) -> bool:
        """Soft delete a student record"""
        student = await self.student_repo.get_by_id(student_id)
        
        if not student:
            raise ValueError("Student record not found")
        
        # Check ownership (unless admin)
        if not is_admin and student.get("user_id") != user_id:
            raise ValueError("Access denied")
        
        return await self.student_repo.deactivate(student_id)
    
    # ============== APPROVAL WORKFLOW ==============
    
    async def get_pending_requests(
        self,
        status: Optional[str] = None,
        school_id: Optional[str] = None,
        year: Optional[int] = None
    ) -> List[Dict]:
        """Get pending access requests for admin/moderator review"""
        requests = await self.student_repo.get_pending_requests(status, school_id, year)
        
        # Enrich with user info
        enriched = []
        for req in requests:
            user = await db.auth_users.find_one(
                {"user_id": req["user_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            
            # Get student name with backward compatibility for old Spanish field names
            student_name = req.get("full_name") or req.get("nombre_completo") or req.get("nombre") or "Unknown"
            
            enriched.append({
                "student_id": req["student_id"],
                "student_name": student_name,
                "school_id": req["school_id"],
                "school_name": req.get("school_name") or req.get("nombre_escuela") or "Unknown",
                "year": req["enrollment"]["year"],
                "grade": req["enrollment"]["grade"],
                "relation_type": req.get("relation_type") or req.get("tipo_relacion") or "parent",
                "relation_other": req.get("relation_other") or req.get("relacion_otro"),
                "user_id": req["user_id"],
                "user_name": user.get("name", "Unknown") if user else "Unknown",
                "user_email": user.get("email", "") if user else "",
                "status": req["enrollment"]["status"],
                "created_at": req["created_at"],
                "student_number": req.get("student_number") or req.get("numero_estudiante"),
                "admin_notes": req["enrollment"].get("admin_notes") or req["enrollment"].get("notas_admin")
            })
        
        return enriched
    
    async def process_approval(
        self,
        student_id: str,
        year: int,
        action: ApprovalAction,
        admin_id: str
    ) -> Dict:
        """Process an approval action on an enrollment request"""
        student = await self.student_repo.get_by_id(student_id)
        
        if not student:
            raise ValueError("Student record not found")
        
        # Find the enrollment
        enrollment = next(
            (e for e in student.get("enrollments", []) if e.get("year") == year),
            None
        )
        
        if not enrollment:
            raise ValueError(f"Enrollment for year {year} not found")
        
        updates = {
            "status": action.status.value,
            "admin_notes": action.admin_notes
        }
        
        if action.status == RequestStatus.APPROVED:
            updates["approved_at"] = datetime.now(timezone.utc).isoformat()
            updates["approved_by"] = admin_id
            updates["rejection_reason"] = None
            updates["is_editable"] = False  # Lock the enrollment once approved
        elif action.status == RequestStatus.REJECTED:
            updates["rejection_reason"] = action.rejection_reason
            updates["approved_at"] = None
            updates["approved_by"] = None
        
        await self.student_repo.update_enrollment(student_id, year, updates)
        
        # Auto-lock student record if this is an approval
        if action.status == RequestStatus.APPROVED:
            await self.student_repo.update_student(student_id, {
                "is_locked": True,
                "locked_at": datetime.now(timezone.utc).isoformat(),
                "locked_by": "system"
            })
            self.log_info(f"Student {student_id} auto-locked after approval")
        
        self.log_info(f"Enrollment {student_id}/{year} updated to {action.status.value} by {admin_id}")
        
        # Notify user
        await self._notify_status_change(student, year, action.status)
        
        return await self.student_repo.get_by_id(student_id)
    
    # ============== CATALOG ACCESS CHECK ==============
    
    async def check_catalog_access(
        self,
        user_id: str,
        catalog_id: str,
        year: Optional[int] = None
    ) -> Dict:
        """
        Check if a user has approved access to a catalog.
        Returns access info including approved students.
        """
        if year is None:
            year = self.get_current_school_year()
        
        approved_students = await self.student_repo.get_approved_for_catalog(
            user_id, catalog_id, year
        )
        
        return {
            "has_access": len(approved_students) > 0,
            "year": year,
            "students": approved_students
        }
    
    # ============== NOTIFICATIONS ==============
    
    async def _notify_new_request(self, student: Dict, enrollment: Dict):
        """Notify admins/moderators of a new access request"""
        try:
            # Get user info
            user = await db.auth_users.find_one(
                {"user_id": student["user_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            
            # Create notification for admins
            notification = {
                "type": "textbook_access_request",
                "title": "Nueva request de acceso a textos",
                "message": f"{user.get('name', 'Usuario')} solicita acceso para {student['full_name']} ({enrollment['grade']}, {enrollment['year']})",
                "data": {
                    "student_id": student["student_id"],
                    "year": enrollment["year"]
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # TODO: Send via OneSignal to admins/moderators with textbook_access.approve permission
            logger.info(f"New textbook access request notification: {notification['message']}")
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    async def _notify_status_change(self, student: Dict, year: int, status: RequestStatus):
        """Notify user of status change"""
        try:
            status_messages = {
                RequestStatus.APPROVED: "aprobada",
                RequestStatus.REJECTED: "rechazada",
                RequestStatus.IN_REVIEW: "en review",
                RequestStatus.INFO_REQUIRED: "requiere information adicional"
            }
            
            notification = {
                "type": "textbook_access_status",
                "title": "Update de request de textos",
                "message": f"Tu request para {student['full_name']} ha sido {status_messages.get(status, status.value)}",
                "data": {
                    "student_id": student["student_id"],
                    "year": year,
                    "status": status.value
                },
                "user_id": student["user_id"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            # TODO: Send via OneSignal to specific user
            logger.info(f"Status change notification: {notification['message']} for user {student['user_id']}")
            
        except Exception as e:
            logger.error(f"Error sending notification: {e}")
    
    # ============== GRADES LIST ==============
    
    def get_available_grades(self) -> List[Dict]:
        """Get list of available grades with display names"""
        return [
            {"value": "K3", "label": "K3 (Pre-Kinder)"},
            {"value": "K4", "label": "K4"},
            {"value": "K5", "label": "K5 (Kinder)"},
            {"value": "1", "label": "1° Grado"},
            {"value": "2", "label": "2° Grado"},
            {"value": "3", "label": "3° Grado"},
            {"value": "4", "label": "4° Grado"},
            {"value": "5", "label": "5° Grado"},
            {"value": "6", "label": "6° Grado"},
            {"value": "7", "label": "7° Grado"},
            {"value": "8", "label": "8° Grado"},
            {"value": "9", "label": "9° Grado"},
            {"value": "10", "label": "10° Grado"},
            {"value": "11", "label": "11° Grado"},
            {"value": "12", "label": "12° Grado"},
        ]
    
    def get_relation_types(self) -> List[Dict]:
        """Get list of relation types"""
        return [
            {"value": "parent", "label_en": "Parent", "label_es": "Padre/Madre", "label_zh": "父母"},
            {"value": "guardian", "label_en": "Legal Guardian", "label_es": "Tutor Legal", "label_zh": "法定监护人"},
            {"value": "grandparent", "label_en": "Grandparent", "label_es": "Abuelo/a", "label_zh": "祖父母"},
            {"value": "representative", "label_en": "Representative", "label_es": "Representante", "label_zh": "代表"},
            {"value": "other", "label_en": "Other", "label_es": "Otro", "label_zh": "其他"},
        ]


# Singleton instance
textbook_access_service = TextbookAccessService()
