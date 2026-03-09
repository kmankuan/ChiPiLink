"""
Form Configuration Models
Defines dynamic form field configurations for textbook access requests
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class FieldType(str, Enum):
    """Available field types for dynamic forms"""
    TEXT = "text"           # Short text input
    TEXTAREA = "textarea"   # Long text input
    SELECT = "select"       # Dropdown with options
    NUMBER = "number"       # Numeric input
    FILE = "file"           # File upload
    DATE = "date"           # Date picker
    EMAIL = "email"         # Email input
    PHONE = "phone"         # Phone input


class SelectOption(BaseModel):
    """Option for select/dropdown fields"""
    value: str
    label_en: str
    label_es: str
    label_zh: Optional[str] = None


class FormFieldConfig(BaseModel):
    """Configuration for a single form field"""
    field_id: Optional[str] = None
    field_key: str  # Unique key used in form data (e.g., "student_name")
    field_type: FieldType
    is_required: bool = True
    is_active: bool = True
    order: int = 0
    
    # Labels in multiple languages
    label_en: str
    label_es: str
    label_zh: Optional[str] = None
    
    # Placeholders
    placeholder_en: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_zh: Optional[str] = None
    
    # Help text
    help_text_en: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_zh: Optional[str] = None
    
    # Validation
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None  # Regex pattern for validation
    
    # For SELECT type
    options: Optional[List[SelectOption]] = None
    
    # For FILE type
    allowed_extensions: Optional[List[str]] = None  # e.g., ["pdf", "jpg", "png"]
    max_file_size_mb: Optional[float] = None  # Max file size in MB
    
    # Metadata
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None


class FormFieldCreate(BaseModel):
    """Create a new form field"""
    field_key: str
    field_type: FieldType
    is_required: bool = True
    order: int = 0
    
    label_en: str
    label_es: str
    label_zh: Optional[str] = None
    
    placeholder_en: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_zh: Optional[str] = None
    
    help_text_en: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_zh: Optional[str] = None
    
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    
    options: Optional[List[SelectOption]] = None
    allowed_extensions: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None


class FormFieldUpdate(BaseModel):
    """Update an existing form field"""
    field_key: Optional[str] = None
    field_type: Optional[FieldType] = None
    is_required: Optional[bool] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    
    label_en: Optional[str] = None
    label_es: Optional[str] = None
    label_zh: Optional[str] = None
    
    placeholder_en: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_zh: Optional[str] = None
    
    help_text_en: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_zh: Optional[str] = None
    
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    
    options: Optional[List[SelectOption]] = None
    allowed_extensions: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None


class FormConfigResponse(BaseModel):
    """Response containing all form fields"""
    form_type: str  # e.g., "textbook_access"
    fields: List[FormFieldConfig]
    total_fields: int
    required_fields: int


class ReorderFieldsRequest(BaseModel):
    """Request to reorder fields"""
    field_orders: List[Dict[str, int]]  # [{"field_id": "xxx", "order": 1}, ...]
