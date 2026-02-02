"""
User Profile Service - Management of perfiles y tipos de usuario
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from core.base import BaseService
from core.database import db
from ..models.user_models import (
    get_default_user_types, get_default_profile_fields,
    UserTypeCategory, RelationshipType
)


class UserProfileService(BaseService):
    """Service for management of perfiles de usuario"""
    
    MODULE_NAME = "users"
    
    # ============== USER TYPES ==============
    
    async def initialize_user_types(self) -> int:
        """Inicializar tipos de usuario by default"""
        defaults = get_default_user_types()
        created = 0
        
        for type_data in defaults:
            existing = await db.chipi_user_types.find_one(
                {"type_id": type_data["type_id"]}
            )
            if not existing:
                type_data["created_at"] = datetime.now(timezone.utc).isoformat()
                type_data["is_active"] = True  # Ensure is_active is set
                await db.chipi_user_types.insert_one(type_data)
                created += 1
        
        self.log_info(f"Initialized {created} user types")
        return created
    
    async def get_user_types(self, active_only: bool = True) -> List[Dict]:
        """Get todos los tipos de usuario"""
        query = {}
        if active_only:
            query["$or"] = [{"is_active": True}, {"is_active": {"$exists": False}}]
        cursor = db.chipi_user_types.find(query, {"_id": 0}).sort("sort_order", 1)
        return await cursor.to_list(length=50)
    
    async def get_user_type(self, type_id: str) -> Optional[Dict]:
        """Get un tipo de usuario by ID"""
        return await db.chipi_user_types.find_one(
            {"type_id": type_id},
            {"_id": 0}
        )
    
    async def create_user_type(self, type_data: Dict) -> Dict:
        """Create un nuevo tipo de usuario"""
        now = datetime.now(timezone.utc).isoformat()
        type_data["created_at"] = now
        type_data["updated_at"] = now
        
        if "type_id" not in type_data:
            import uuid
            type_data["type_id"] = f"utype_{uuid.uuid4().hex[:8]}"
        
        await db.chipi_user_types.insert_one(type_data)
        type_data.pop("_id", None)
        return type_data
    
    async def update_user_type(self, type_id: str, updates: Dict) -> Optional[Dict]:
        """Update un tipo de usuario"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.chipi_user_types.find_one_and_update(
            {"type_id": type_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    # ============== PROFILE FIELDS ==============
    
    async def initialize_profile_fields(self) -> int:
        """Inicializar campos de perfil by default"""
        defaults = get_default_profile_fields()
        created = 0
        
        for field_data in defaults:
            existing = await db.chipi_profile_fields.find_one(
                {"field_id": field_data["field_id"]}
            )
            if not existing:
                field_data["created_at"] = datetime.now(timezone.utc).isoformat()
                field_data["is_active"] = True
                await db.chipi_profile_fields.insert_one(field_data)
                created += 1
        
        self.log_info(f"Initialized {created} profile fields")
        return created
    
    async def get_profile_fields(
        self, 
        user_type_id: Optional[str] = None,
        section: Optional[str] = None,
        active_only: bool = True
    ) -> List[Dict]:
        """Get campos de perfil"""
        query = {}
        if active_only:
            query["is_active"] = True
        if section:
            query["section"] = section
        
        cursor = db.chipi_profile_fields.find(query, {"_id": 0}).sort("sort_order", 1)
        fields = await cursor.to_list(length=100)
        
        # Filtrar by type de usuario si se especifica
        if user_type_id:
            fields = [
                f for f in fields 
                if not f.get("applicable_user_types") or user_type_id in f.get("applicable_user_types", [])
            ]
        
        return fields
    
    async def create_profile_field(self, field_data: Dict) -> Dict:
        """Create un nuevo campo de perfil"""
        now = datetime.now(timezone.utc).isoformat()
        field_data["created_at"] = now
        
        if "field_id" not in field_data:
            import uuid
            field_data["field_id"] = f"field_{uuid.uuid4().hex[:8]}"
        
        await db.chipi_profile_fields.insert_one(field_data)
        field_data.pop("_id", None)
        return field_data
    
    async def update_profile_field(self, field_id: str, updates: Dict) -> Optional[Dict]:
        """Update un campo de perfil"""
        result = await db.chipi_profile_fields.find_one_and_update(
            {"field_id": field_id},
            {"$set": updates},
            return_document=True
        )
        if result:
            result.pop("_id", None)
        return result
    
    # ============== USER PROFILES ==============
    
    async def get_profile(self, user_id: str) -> Optional[Dict]:
        """Get perfil de usuario"""
        profile = await db.chipi_user_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if profile and profile.get("user_type_id"):
            profile["user_type_info"] = await self.get_user_type(profile["user_type_id"])
        
        return profile
    
    async def get_profile_by_id(self, profile_id: str) -> Optional[Dict]:
        """Get perfil por profile_id"""
        profile = await db.chipi_user_profiles.find_one(
            {"profile_id": profile_id},
            {"_id": 0}
        )
        
        if profile and profile.get("user_type_id"):
            profile["user_type_info"] = await self.get_user_type(profile["user_type_id"])
        
        return profile
    
    async def create_profile(
        self,
        user_id: str,
        user_type_id: str,
        display_name: Optional[str] = None,
        custom_fields: Dict = None
    ) -> Dict:
        """Create perfil para un usuario"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        profile = {
            "profile_id": f"profile_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "user_type_id": user_type_id,
            "display_name": display_name,
            "custom_fields": custom_fields or {},
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
        
        await db.chipi_user_profiles.insert_one(profile)
        
        # Get info of the tipo
        profile["user_type_info"] = await self.get_user_type(user_type_id)
        
        profile.pop("_id", None)
        self.log_info(f"Created profile for user {user_id}")
        return profile
    
    async def update_profile(self, user_id: str, updates: Dict) -> Optional[Dict]:
        """Update perfil de usuario"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.chipi_user_profiles.find_one_and_update(
            {"user_id": user_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
            if result.get("user_type_id"):
                result["user_type_info"] = await self.get_user_type(result["user_type_id"])
        
        return result
    
    async def update_custom_field(self, user_id: str, field_key: str, value: Any) -> bool:
        """Update un campo personalizado específico"""
        result = await db.chipi_user_profiles.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    f"custom_fields.{field_key}": value,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def search_profiles(
        self,
        query: str = None,
        user_type_id: str = None,
        tags: List[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Search perfiles"""
        filter_query = {"is_active": True}
        
        if user_type_id:
            filter_query["user_type_id"] = user_type_id
        
        if tags:
            filter_query["tags"] = {"$in": tags}
        
        if query:
            filter_query["$or"] = [
                {"display_name": {"$regex": query, "$options": "i"}},
                {"tags": {"$in": [query]}}
            ]
        
        cursor = db.chipi_user_profiles.find(
            filter_query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # ============== USER RELATIONSHIPS ==============
    
    async def create_relationship(
        self,
        user_id_1: str,
        user_id_2: str,
        relationship_type: RelationshipType,
        role_1: Dict[str, str] = None,
        role_2: Dict[str, str] = None,
        permissions: Dict = None
    ) -> Dict:
        """Create relación entre usuarios"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        # Verify that does not exista ya
        existing = await db.chipi_user_relationships.find_one({
            "$or": [
                {"user_id_1": user_id_1, "user_id_2": user_id_2},
                {"user_id_1": user_id_2, "user_id_2": user_id_1}
            ],
            "relationship_type": relationship_type.value,
            "is_active": True
        })
        
        if existing:
            existing.pop("_id", None)
            return existing
        
        relationship = {
            "relationship_id": f"rel_{uuid.uuid4().hex[:8]}",
            "user_id_1": user_id_1,
            "user_id_2": user_id_2,
            "relationship_type": relationship_type.value,
            "role_1": role_1 or {},
            "role_2": role_2 or {},
            "is_active": True,
            "created_at": now,
            **(permissions or {})
        }
        
        await db.chipi_user_relationships.insert_one(relationship)
        relationship.pop("_id", None)
        
        self.log_info(f"Created relationship {relationship_type.value} between {user_id_1} and {user_id_2}")
        return relationship
    
    async def get_user_relationships(self, user_id: str) -> List[Dict]:
        """Get all relaciones de un usuario"""
        cursor = db.chipi_user_relationships.find(
            {
                "$or": [
                    {"user_id_1": user_id},
                    {"user_id_2": user_id}
                ],
                "is_active": True
            },
            {"_id": 0}
        )
        
        relationships = await cursor.to_list(length=50)
        
        # Enriquecer con info de the users relacionados
        for rel in relationships:
            other_user_id = rel["user_id_2"] if rel["user_id_1"] == user_id else rel["user_id_1"]
            other_profile = await self.get_profile(other_user_id)
            rel["related_user_profile"] = other_profile
            rel["is_primary"] = rel["user_id_1"] == user_id
        
        return relationships
    
    async def get_dependents(self, guardian_user_id: str) -> List[Dict]:
        """Get dependientes de un acudiente"""
        cursor = db.chipi_user_relationships.find(
            {
                "user_id_1": guardian_user_id,
                "relationship_type": {"$in": [
                    RelationshipType.PARENT_CHILD.value,
                    RelationshipType.GUARDIAN_DEPENDENT.value,
                    RelationshipType.CAREGIVER_WARD.value
                ]},
                "is_active": True
            },
            {"_id": 0}
        )
        
        relationships = await cursor.to_list(length=20)
        
        dependents = []
        for rel in relationships:
            profile = await self.get_profile(rel["user_id_2"])
            if profile:
                profile["relationship"] = rel
                dependents.append(profile)
        
        return dependents
    
    async def get_guardian(self, dependent_user_id: str) -> Optional[Dict]:
        """Get acudiente de un dependiente"""
        relationship = await db.chipi_user_relationships.find_one(
            {
                "user_id_2": dependent_user_id,
                "relationship_type": {"$in": [
                    RelationshipType.PARENT_CHILD.value,
                    RelationshipType.GUARDIAN_DEPENDENT.value
                ]},
                "is_financial_responsible": True,
                "is_active": True
            },
            {"_id": 0}
        )
        
        if relationship:
            guardian_profile = await self.get_profile(relationship["user_id_1"])
            if guardian_profile:
                guardian_profile["relationship"] = relationship
                return guardian_profile
        
        return None
    
    async def update_relationship(self, relationship_id: str, updates: Dict) -> Optional[Dict]:
        """Update una relación"""
        result = await db.chipi_user_relationships.find_one_and_update(
            {"relationship_id": relationship_id},
            {"$set": updates},
            return_document=True
        )
        if result:
            result.pop("_id", None)
        return result
    
    async def deactivate_relationship(self, relationship_id: str) -> bool:
        """Desactivar una relación"""
        result = await db.chipi_user_relationships.update_one(
            {"relationship_id": relationship_id},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0


# Singleton
user_profile_service = UserProfileService()
