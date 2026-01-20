"""
Field Mapping Utilities
Maps between database field names (legacy Spanish) and code field names (English)

This allows gradual migration from Spanish to English naming conventions
while maintaining backward compatibility with existing data.
"""
from typing import Dict, Any, Optional


# Database field to Code field mapping
DB_TO_CODE_MAPPING = {
    # User fields
    "cliente_id": "user_id",
    "nombre": "name",
    "telefono": "phone",
    "direccion": "address",
    "contrasena": "password",
    "contrasena_hash": "password_hash",
    "es_admin": "is_admin",
    "fecha_creacion": "created_at",
    "fecha_actualizacion": "updated_at",
    "activo": "is_active",
    "estudiantes": "students",
    "ultimo_login": "last_login",
    
    # Role fields
    "permisos": "permissions",
    "asignado_por": "assigned_by",
    "fecha_asignacion": "assigned_at",
}

# Code field to Database field mapping (reverse)
CODE_TO_DB_MAPPING = {v: k for k, v in DB_TO_CODE_MAPPING.items()}


def map_from_db(data: Optional[Dict[str, Any]], exclude_fields: list = None) -> Optional[Dict[str, Any]]:
    """
    Map database document to code-friendly format (Spanish -> English)
    
    Args:
        data: Document from database
        exclude_fields: Fields to exclude from result
        
    Returns:
        Mapped dictionary with English field names
    """
    if data is None:
        return None
    
    exclude_fields = exclude_fields or []
    result = {}
    
    for key, value in data.items():
        if key in exclude_fields or key == "_id":
            continue
        
        # Map to English name if mapping exists
        mapped_key = DB_TO_CODE_MAPPING.get(key, key)
        result[mapped_key] = value
    
    return result


def map_to_db(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map code data to database format (English -> Spanish)
    
    Args:
        data: Dictionary with English field names
        
    Returns:
        Mapped dictionary with database field names
    """
    if data is None:
        return None
    
    result = {}
    
    for key, value in data.items():
        # Map to database name if mapping exists
        mapped_key = CODE_TO_DB_MAPPING.get(key, key)
        result[mapped_key] = value
    
    return result


def get_db_field(code_field: str) -> str:
    """Get database field name from code field name"""
    return CODE_TO_DB_MAPPING.get(code_field, code_field)


def get_code_field(db_field: str) -> str:
    """Get code field name from database field name"""
    return DB_TO_CODE_MAPPING.get(db_field, db_field)


# User-specific mapping functions
def map_user_from_db(user_doc: Optional[Dict[str, Any]], include_password: bool = False) -> Optional[Dict[str, Any]]:
    """
    Map user document from database to API response format
    
    Args:
        user_doc: User document from database
        include_password: Whether to include password_hash
        
    Returns:
        User data with English field names, ready for API response
    """
    if user_doc is None:
        return None
    
    exclude = ["password_hash", "contrasena_hash"] if not include_password else []
    mapped = map_from_db(user_doc, exclude_fields=exclude)
    
    # Ensure required fields exist with defaults
    mapped.setdefault("is_admin", False)
    mapped.setdefault("is_active", True)
    mapped.setdefault("students", [])
    
    return mapped


def map_user_to_db(user_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Map user data from API request to database format
    
    Args:
        user_data: User data with English field names
        
    Returns:
        User data with database field names
    """
    return map_to_db(user_data)
