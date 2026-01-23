"""
Form Configuration Repository
Data access layer for form field configurations
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.database import db
from core.base import BaseRepository


class FormConfigRepository(BaseRepository):
    """Repository for form field configurations"""
    
    COLLECTION_NAME = "store_form_configs"
    ID_FIELD = "field_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        """Create a new form field configuration"""
        data["field_id"] = f"fld_{uuid.uuid4().hex[:12]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = data["created_at"]
        data["is_active"] = True
        return await self.insert_one(data)
    
    async def get_by_id(self, field_id: str) -> Optional[Dict]:
        """Get form field by ID"""
        return await self.find_one({"field_id": field_id})
    
    async def get_by_form_type(self, form_type: str, include_inactive: bool = False) -> List[Dict]:
        """Get all fields for a specific form type"""
        query = {"form_type": form_type}
        if not include_inactive:
            query["is_active"] = True
        return await self.find_many(
            query=query,
            sort=[("order", 1)]
        )
    
    async def get_by_key(self, form_type: str, field_key: str) -> Optional[Dict]:
        """Get field by form type and key"""
        return await self.find_one({
            "form_type": form_type,
            "field_key": field_key
        })
    
    async def update_field(self, field_id: str, data: Dict) -> bool:
        """Update a form field"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, field_id, data)
    
    async def delete_field(self, field_id: str) -> bool:
        """Soft delete a form field"""
        return await self.update_field(field_id, {"is_active": False})
    
    async def hard_delete_field(self, field_id: str) -> bool:
        """Permanently delete a form field"""
        result = await self._collection.delete_one({"field_id": field_id})
        return result.deleted_count > 0
    
    async def reorder_fields(self, field_orders: List[Dict]) -> bool:
        """Update order of multiple fields"""
        for item in field_orders:
            await self._collection.update_one(
                {"field_id": item["field_id"]},
                {"$set": {
                    "order": item["order"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        return True
    
    async def get_next_order(self, form_type: str) -> int:
        """Get the next order number for a new field"""
        pipeline = [
            {"$match": {"form_type": form_type}},
            {"$group": {"_id": None, "max_order": {"$max": "$order"}}}
        ]
        result = await self._collection.aggregate(pipeline).to_list(1)
        if result and result[0].get("max_order") is not None:
            return result[0]["max_order"] + 1
        return 0
    
    async def seed_default_fields(self, form_type: str) -> List[Dict]:
        """Seed default fields for a form type if none exist"""
        existing = await self.get_by_form_type(form_type, include_inactive=True)
        if existing:
            return existing
        
        if form_type == "textbook_access":
            default_fields = [
                {
                    "form_type": "textbook_access",
                    "field_key": "student_name",
                    "field_type": "text",
                    "is_required": True,
                    "order": 0,
                    "label_en": "Student Full Name",
                    "label_es": "Nombre Completo del Estudiante",
                    "label_zh": "学生全名",
                    "placeholder_en": "e.g., John Smith",
                    "placeholder_es": "ej: Juan Pérez García",
                    "placeholder_zh": "例如：张三",
                    "min_length": 2,
                    "max_length": 100
                },
                {
                    "form_type": "textbook_access",
                    "field_key": "school_id",
                    "field_type": "select",
                    "is_required": True,
                    "order": 1,
                    "label_en": "School",
                    "label_es": "Colegio",
                    "label_zh": "学校",
                    "help_text_en": "Select the school where the student is enrolled",
                    "help_text_es": "Selecciona el colegio donde está matriculado el estudiante",
                    "help_text_zh": "选择学生就读的学校",
                    "options": []  # Will be populated dynamically from schools collection
                },
                {
                    "form_type": "textbook_access",
                    "field_key": "school_year",
                    "field_type": "select",
                    "is_required": True,
                    "order": 2,
                    "label_en": "School Year",
                    "label_es": "Año Escolar",
                    "label_zh": "学年",
                    "options": []  # Will be populated dynamically
                },
                {
                    "form_type": "textbook_access",
                    "field_key": "grade",
                    "field_type": "select",
                    "is_required": True,
                    "order": 3,
                    "label_en": "Grade",
                    "label_es": "Grado",
                    "label_zh": "年级",
                    "options": []  # Will be populated dynamically from config
                },
                {
                    "form_type": "textbook_access",
                    "field_key": "relationship",
                    "field_type": "select",
                    "is_required": True,
                    "order": 4,
                    "label_en": "Relationship to Student",
                    "label_es": "Relación con el Estudiante",
                    "label_zh": "与学生的关系",
                    "options": [
                        {"value": "parent", "label_en": "Parent", "label_es": "Padre/Madre", "label_zh": "父母"},
                        {"value": "guardian", "label_en": "Legal Guardian", "label_es": "Tutor Legal", "label_zh": "法定监护人"},
                        {"value": "grandparent", "label_en": "Grandparent", "label_es": "Abuelo/a", "label_zh": "祖父母"},
                        {"value": "representative", "label_en": "Representative", "label_es": "Representante", "label_zh": "代表"},
                        {"value": "other", "label_en": "Other", "label_es": "Otro", "label_zh": "其他"}
                    ]
                },
                {
                    "form_type": "textbook_access",
                    "field_key": "student_id_number",
                    "field_type": "text",
                    "is_required": False,
                    "order": 5,
                    "label_en": "Student ID Number",
                    "label_es": "Número de Estudiante",
                    "label_zh": "学生编号",
                    "placeholder_en": "e.g., STD-2024-001",
                    "placeholder_es": "ej: STD-2024-001",
                    "placeholder_zh": "例如：STD-2024-001",
                    "help_text_en": "If you know the school ID, it helps speed up verification",
                    "help_text_es": "Si conoces el ID escolar, ayuda a acelerar la verificación",
                    "help_text_zh": "如果您知道学校ID，可以加快验证速度"
                }
            ]
            
            created_fields = []
            for field_data in default_fields:
                created = await self.create(field_data)
                created_fields.append(created)
            
            return created_fields
        
        return []


# Singleton instance
form_config_repository = FormConfigRepository()
