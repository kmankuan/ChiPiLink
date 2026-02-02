"""
Users API Routes - User profile management
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.users.services.user_profile_service import user_profile_service
from modules.users.models.user_models import RelationshipType

router = APIRouter(prefix="/users", tags=["Users"])


# ============== PYDANTIC MODELS ==============

class CreateProfileRequest(BaseModel):
    user_type_id: str
    display_name: Optional[str] = None
    bio: Optional[str] = None
    birth_date: Optional[str] = None
    language: str = "es"
    custom_fields: dict = {}


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    birth_date: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    custom_fields: Optional[dict] = None
    tags: Optional[List[str]] = None


class CreateRelationshipRequest(BaseModel):
    user_id_2: str
    relationship_type: str
    role_1: dict = {}
    role_2: dict = {}
    can_view_wallet: bool = False
    can_pay_for: bool = False
    can_manage: bool = False
    is_financial_responsible: bool = False
    spending_limit: Optional[float] = None


class CreateUserTypeRequest(BaseModel):
    name: dict  # {"es": "...", "en": "...", "zh": "..."}
    description: dict = {}
    category: str
    icon: str = "👤"
    color: str = "#6366f1"
    can_purchase: bool = True
    can_have_wallet: bool = True
    can_have_membership: bool = False
    can_be_guardian: bool = False
    can_have_guardian: bool = False
    can_earn_points: bool = True
    accessible_modules: List[str] = []


class CreateProfileFieldRequest(BaseModel):
    field_key: str
    label: dict  # {"es": "...", "en": "...", "zh": "..."}
    field_type: str
    placeholder: dict = {}
    help_text: dict = {}
    options: List[dict] = []
    is_required: bool = False
    section: str = "general"
    applicable_user_types: List[str] = []


# ============== USER TYPES ==============

@router.get("/types")
async def get_user_types(
    active_only: bool = Query(True),
    lang: str = Query("es")
):
    """Obtener todos los tipos de usuario"""
    try:
        types = await user_profile_service.get_user_types(active_only=active_only)
        return {
            "success": True,
            "types": types,
            "count": len(types)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/types/{type_id}")
async def get_user_type(type_id: str):
    """Obtener un tipo de usuario específico"""
    type_data = await user_profile_service.get_user_type(type_id)
    if not type_data:
        raise HTTPException(status_code=404, detail="User type not found")
    return {"success": True, "type": type_data}


@router.post("/types")
async def create_user_type(
    data: CreateUserTypeRequest,
    admin=Depends(get_admin_user)
):
    """Crear un nuevo tipo de usuario (admin)"""
    try:
        result = await user_profile_service.create_user_type(data.model_dump())
        return {"success": True, "type": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/types/{type_id}")
async def update_user_type(
    type_id: str,
    updates: dict,
    admin=Depends(get_admin_user)
):
    """Actualizar un tipo de usuario (admin)"""
    result = await user_profile_service.update_user_type(type_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="User type not found")
    return {"success": True, "type": result}


@router.post("/types/initialize")
async def initialize_user_types(admin=Depends(get_admin_user)):
    """Inicializar tipos de usuario por defecto (admin)"""
    count = await user_profile_service.initialize_user_types()
    return {"success": True, "initialized": count}


# ============== PROFILE FIELDS ==============

@router.get("/fields")
async def get_profile_fields(
    user_type_id: Optional[str] = None,
    section: Optional[str] = None,
    active_only: bool = Query(True)
):
    """Obtener campos de perfil configurados"""
    fields = await user_profile_service.get_profile_fields(
        user_type_id=user_type_id,
        section=section,
        active_only=active_only
    )
    return {"success": True, "fields": fields, "count": len(fields)}


@router.post("/fields")
async def create_profile_field(
    data: CreateProfileFieldRequest,
    admin=Depends(get_admin_user)
):
    """Crear un nuevo campo de perfil (admin)"""
    try:
        result = await user_profile_service.create_profile_field(data.model_dump())
        return {"success": True, "field": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/fields/{field_id}")
async def update_profile_field(
    field_id: str,
    updates: dict,
    admin=Depends(get_admin_user)
):
    """Actualizar un campo de perfil (admin)"""
    result = await user_profile_service.update_profile_field(field_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Field not found")
    return {"success": True, "field": result}


@router.post("/fields/initialize")
async def initialize_profile_fields(admin=Depends(get_admin_user)):
    """Inicializar campos de perfil por defecto (admin)"""
    count = await user_profile_service.initialize_profile_fields()
    return {"success": True, "initialized": count}


# ============== USER PROFILES ==============

@router.get("/profile/me")
async def get_my_profile(user=Depends(get_current_user)):
    """Obtener mi perfil"""
    profile = await user_profile_service.get_profile(user["user_id"])
    
    if not profile:
        return {
            "success": True,
            "profile": None,
            "message": "No profile created yet"
        }
    
    return {"success": True, "profile": profile}


@router.post("/profile")
async def create_profile(
    data: CreateProfileRequest,
    user=Depends(get_current_user)
):
    """Crear mi perfil"""
    try:
        # Verificar si ya existe
        existing = await user_profile_service.get_profile(user["user_id"])
        if existing:
            raise HTTPException(status_code=400, detail="Profile already exists")
        
        profile = await user_profile_service.create_profile(
            user_id=user["user_id"],
            user_type_id=data.user_type_id,
            display_name=data.display_name or user.get("nombre"),
            custom_fields=data.custom_fields
        )
        
        # Actualizar campos adicionales
        if data.bio or data.birth_date or data.language:
            updates = {}
            if data.bio:
                updates["bio"] = data.bio
            if data.birth_date:
                updates["birth_date"] = data.birth_date
            if data.language:
                updates["language"] = data.language
            
            profile = await user_profile_service.update_profile(
                user["user_id"],
                updates
            )
        
        return {"success": True, "profile": profile}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/profile")
async def update_my_profile(
    data: UpdateProfileRequest,
    user=Depends(get_current_user)
):
    """Actualizar mi perfil"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    profile = await user_profile_service.update_profile(user["user_id"], updates)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return {"success": True, "profile": profile}


class UpdateLanguageRequest(BaseModel):
    language: str  # "en", "es", "zh"


@router.put("/profile/language")
async def update_language_preference(
    data: UpdateLanguageRequest,
    user=Depends(get_current_user)
):
    """Update user's language preference - synced across devices"""
    valid_languages = ["en", "es", "zh"]
    if data.language not in valid_languages:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid language. Must be one of: {', '.join(valid_languages)}"
        )
    
    profile = await user_profile_service.update_profile(
        user["user_id"], 
        {"language": data.language}
    )
    
    if not profile:
        # If no profile exists, try to update the user document directly
        from core.database import db
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"language": data.language}}
        )
        return {
            "success": True, 
            "language": data.language,
            "message": "Language preference saved"
        }
    
    return {
        "success": True, 
        "language": profile.get("language", data.language),
        "profile": profile
    }


@router.get("/profile/language")
async def get_language_preference(user=Depends(get_current_user)):
    """Get user's language preference"""
    profile = await user_profile_service.get_profile(user["user_id"])
    
    if profile and profile.get("language"):
        return {"success": True, "language": profile["language"]}
    
    # Check user document as fallback
    from core.database import db
    user_doc = await db.users.find_one(
        {"user_id": user["user_id"]},
        {"_id": 0, "language": 1}
    )
    
    return {
        "success": True, 
        "language": user_doc.get("language", "es") if user_doc else "es"
    }


@router.get("/profile/{user_id}")
async def get_user_profile(user_id: str):
    """Obtener perfil de un usuario (público)"""
    profile = await user_profile_service.get_profile(user_id)
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Remover campos privados
    profile.pop("internal_notes", None)
    
    return {"success": True, "profile": profile}


@router.get("/search")
async def search_profiles(
    q: Optional[str] = None,
    user_type_id: Optional[str] = None,
    tags: Optional[str] = None,
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0)
):
    """Buscar perfiles"""
    tag_list = tags.split(",") if tags else None
    
    profiles = await user_profile_service.search_profiles(
        query=q,
        user_type_id=user_type_id,
        tags=tag_list,
        limit=limit,
        offset=offset
    )
    
    return {"success": True, "profiles": profiles, "count": len(profiles)}


# ============== RELATIONSHIPS ==============

@router.get("/relationships")
async def get_my_relationships(user=Depends(get_current_user)):
    """Obtener mis relaciones"""
    relationships = await user_profile_service.get_user_relationships(user["user_id"])
    return {"success": True, "relationships": relationships, "count": len(relationships)}


@router.get("/relationships/dependents")
async def get_my_dependents(user=Depends(get_current_user)):
    """Obtener mis dependientes (hijos, etc.)"""
    dependents = await user_profile_service.get_dependents(user["user_id"])
    return {"success": True, "dependents": dependents, "count": len(dependents)}


@router.get("/relationships/guardian")
async def get_my_guardian(user=Depends(get_current_user)):
    """Obtener mi acudiente"""
    guardian = await user_profile_service.get_guardian(user["user_id"])
    return {"success": True, "guardian": guardian}


@router.post("/relationships")
async def create_relationship(
    data: CreateRelationshipRequest,
    user=Depends(get_current_user)
):
    """Crear una relación con otro usuario"""
    try:
        rel_type = RelationshipType(data.relationship_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid relationship type: {data.relationship_type}")
    
    permissions = {
        "can_view_wallet": data.can_view_wallet,
        "can_pay_for": data.can_pay_for,
        "can_manage": data.can_manage,
        "is_financial_responsible": data.is_financial_responsible,
        "spending_limit": data.spending_limit
    }
    
    relationship = await user_profile_service.create_relationship(
        user_id_1=user["user_id"],
        user_id_2=data.user_id_2,
        relationship_type=rel_type,
        role_1=data.role_1,
        role_2=data.role_2,
        permissions=permissions
    )
    
    return {"success": True, "relationship": relationship}


@router.put("/relationships/{relationship_id}")
async def update_relationship(
    relationship_id: str,
    updates: dict,
    user=Depends(get_current_user)
):
    """Actualizar una relación"""
    result = await user_profile_service.update_relationship(relationship_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return {"success": True, "relationship": result}


@router.delete("/relationships/{relationship_id}")
async def deactivate_relationship(
    relationship_id: str,
    user=Depends(get_current_user)
):
    """Desactivar una relación"""
    success = await user_profile_service.deactivate_relationship(relationship_id)
    if not success:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return {"success": True, "message": "Relationship deactivated"}


# ============== ADMIN ==============

@router.post("/admin/profile/{user_id}")
async def admin_create_profile(
    user_id: str,
    data: CreateProfileRequest,
    admin=Depends(get_admin_user)
):
    """Crear perfil para un usuario (admin)"""
    try:
        profile = await user_profile_service.create_profile(
            user_id=user_id,
            user_type_id=data.user_type_id,
            display_name=data.display_name,
            custom_fields=data.custom_fields
        )
        return {"success": True, "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/admin/profile/{user_id}")
async def admin_update_profile(
    user_id: str,
    updates: dict,
    admin=Depends(get_admin_user)
):
    """Actualizar perfil de un usuario (admin)"""
    profile = await user_profile_service.update_profile(user_id, updates)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"success": True, "profile": profile}
