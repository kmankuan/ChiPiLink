"""
Textbook Access Module - Repository
Data access layer for textbook access management
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.database import db
from core.base import BaseRepository


class SchoolRepository(BaseRepository):
    """Repository for schools/institutions"""
    
    COLLECTION_NAME = "store_schools"
    ID_FIELD = "school_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        """Create a new school"""
        data["school_id"] = f"sch_{uuid.uuid4().hex[:8]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_all_active(self) -> List[Dict]:
        """Get all active schools"""
        return await self.find_many(
            query={"is_active": True},
            sort=[("name", 1)]
        )
    
    async def get_by_id(self, school_id: str) -> Optional[Dict]:
        """Get school by ID"""
        return await self.find_one({"school_id": school_id})
    
    async def get_by_catalog_id(self, catalog_id: str) -> Optional[Dict]:
        """Get school by catalog ID"""
        return await self.find_one({"catalog_id": catalog_id})
    
    async def update(self, school_id: str, data: Dict) -> Optional[Dict]:
        """Update a school"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        success = await self.update_by_id(self.ID_FIELD, school_id, data)
        if success:
            return await self.get_by_id(school_id)
        return None


class StudentRecordRepository(BaseRepository):
    """Repository for student records"""
    
    COLLECTION_NAME = "store_students"
    ID_FIELD = "student_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        """Create a new student record"""
        data["student_id"] = f"std_{uuid.uuid4().hex[:12]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = data["created_at"]
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_by_id(self, student_id: str) -> Optional[Dict]:
        """Get student record by ID"""
        return await self.find_one({"student_id": student_id})
    
    async def get_by_user(self, user_id: str, include_inactive: bool = False) -> List[Dict]:
        """Get all student records for a user"""
        query = {"user_id": user_id}
        if not include_inactive:
            query["is_active"] = True
        return await self.find_many(
            query=query,
            sort=[("created_at", -1)]
        )
    
    async def get_all(self, status: str = None, school_id: str = None, include_inactive: bool = False) -> List[Dict]:
        """Get all student records with optional filters"""
        query = {}
        if not include_inactive:
            query["is_active"] = True
        if school_id:
            query["school_id"] = school_id
        if status:
            query["enrollments.status"] = status
        return await self.find_many(
            query=query,
            sort=[("created_at", -1)]
        )
    
    async def update_student(self, student_id: str, data: Dict) -> bool:
        """Update a student record"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, student_id, data)
    
    async def add_enrollment(self, student_id: str, enrollment: Dict) -> bool:
        """Add a new enrollment year to a student"""
        result = await self._collection.update_one(
            {"student_id": student_id},
            {
                "$push": {"enrollments": enrollment},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
            }
        )
        return result.modified_count > 0
    
    async def update_enrollment(
        self, 
        student_id: str, 
        year: int, 
        updates: Dict
    ) -> bool:
        """Update a specific enrollment year"""
        result = await self._collection.update_one(
            {"student_id": student_id, "enrollments.year": year},
            {
                "$set": {
                    **{f"enrollments.$.{k}": v for k, v in updates.items()},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def get_pending_requests(
        self,
        status: Optional[str] = None,
        school_id: Optional[str] = None,
        year: Optional[int] = None
    ) -> List[Dict]:
        """Get student records with pending enrollment requests"""
        pipeline = [
            {"$match": {"is_active": True}},
            {"$unwind": "$enrollments"},
        ]
        
        # Add filters
        match_stage = {}
        if status:
            match_stage["enrollments.status"] = status
        else:
            match_stage["enrollments.status"] = {"$in": ["pending", "in_review", "info_required"]}
        
        if school_id:
            match_stage["school_id"] = school_id
        
        if year:
            match_stage["enrollments.year"] = year
        
        if match_stage:
            pipeline.append({"$match": match_stage})
        
        pipeline.extend([
            {"$sort": {"enrollments.year": -1, "created_at": -1}},
            {"$project": {
                "_id": 0,
                "student_id": 1,
                "user_id": 1,
                "full_name": 1,
                "nombre_completo": 1,  # Legacy Spanish field
                "nombre": 1,  # Legacy Spanish field
                "school_id": 1,
                "school_name": 1,
                "nombre_escuela": 1,  # Legacy Spanish field
                "student_number": 1,
                "numero_estudiante": 1,  # Legacy Spanish field
                "relation_type": 1,
                "tipo_relacion": 1,  # Legacy Spanish field
                "relation_other": 1,
                "relacion_otro": 1,  # Legacy Spanish field
                "created_at": 1,
                "enrollment": "$enrollments"
            }}
        ])
        
        cursor = self._collection.aggregate(pipeline)
        return await cursor.to_list(500)
    
    async def get_approved_for_catalog(
        self, 
        user_id: str, 
        catalog_id: str,
        year: Optional[int] = None
    ) -> List[Dict]:
        """Get approved student records for a specific catalog"""
        if year is None:
            year = datetime.now().year
        
        # First get schools with this catalog
        schools = await db.schools.find(
            {"catalog_id": catalog_id, "is_active": True},
            {"_id": 0, "school_id": 1}
        ).to_list(100)
        
        school_ids = [s["school_id"] for s in schools]
        
        if not school_ids:
            return []
        
        pipeline = [
            {
                "$match": {
                    "user_id": user_id,
                    "school_id": {"$in": school_ids},
                    "is_active": True
                }
            },
            {"$unwind": "$enrollments"},
            {
                "$match": {
                    "enrollments.year": year,
                    "enrollments.status": "approved"
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "student_id": 1,
                    "user_id": 1,
                    "first_name": 1,
                    "last_name": 1,
                    "full_name": 1,
                    "school_id": 1,
                    "school_name": 1,
                    "student_number": 1,
                    "is_active": 1,
                    "created_at": 1,
                    "updated_at": 1,
                    "sync_id": 1,
                    # Flatten enrollment data for frontend consumption
                    "grade": "$enrollments.grade",
                    "year": "$enrollments.year",
                    "status": "$enrollments.status",
                    "name": "$full_name"  # Alias for frontend compatibility
                }
            }
        ]
        
        cursor = self._collection.aggregate(pipeline)
        return await cursor.to_list(100)
    
    async def deactivate(self, student_id: str) -> bool:
        """Soft delete a student record"""
        return await self.update_student(student_id, {"is_active": False})


# Singleton instances
school_repository = SchoolRepository()
student_record_repository = StudentRecordRepository()
