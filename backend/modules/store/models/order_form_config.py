"""
Order Form Configuration Models
Models for dynamic form fields in textbook orders
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


class FieldType(str, Enum):
    TEXT = "text"
    TEXTAREA = "textarea"
    NUMBER = "number"
    SELECT = "select"
    MULTISELECT = "multiselect"
    CHECKBOX = "checkbox"
    FILE = "file"
    DATE = "date"
    EMAIL = "email"
    PHONE = "phone"
    INFO = "info"  # Display-only field (e.g., bank transfer info)


class ConditionOperator(str, Enum):
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    CONTAINS = "contains"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"


class FieldCondition(BaseModel):
    """Condition for showing/hiding a field"""
    field_id: str  # The field to check
    operator: ConditionOperator
    value: Optional[Any] = None


class FieldOption(BaseModel):
    """Option for select/multiselect fields"""
    value: str
    label: str
    label_es: Optional[str] = None
    label_en: Optional[str] = None
    label_zh: Optional[str] = None


class OrderFormField(BaseModel):
    """Configuration for a single form field"""
    field_id: str
    field_type: FieldType
    label: str
    label_es: Optional[str] = None
    label_en: Optional[str] = None
    label_zh: Optional[str] = None
    placeholder: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_en: Optional[str] = None
    placeholder_zh: Optional[str] = None
    help_text: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_en: Optional[str] = None
    help_text_zh: Optional[str] = None
    required: bool = False
    options: Optional[List[FieldOption]] = None  # For select/multiselect
    default_value: Optional[Any] = None
    validation: Optional[Dict[str, Any]] = None  # e.g., {"min_length": 5, "max_length": 100}
    conditions: Optional[List[FieldCondition]] = None  # Show only if conditions met
    order: int = 0
    active: bool = True
    # For file fields
    allowed_extensions: Optional[List[str]] = None  # e.g., [".pdf", ".jpg", ".png"]
    max_file_size_mb: Optional[float] = None
    # For info fields (display only)
    content: Optional[str] = None  # HTML or markdown content to display
    content_es: Optional[str] = None
    content_en: Optional[str] = None
    content_zh: Optional[str] = None


class OrderFormConfig(BaseModel):
    """Full form configuration"""
    config_id: str
    name: str
    description: Optional[str] = None
    fields: List[OrderFormField] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    active: bool = True


class CreateFieldRequest(BaseModel):
    """Request to create a new field"""
    field_type: FieldType
    label: str
    label_es: Optional[str] = None
    label_en: Optional[str] = None
    label_zh: Optional[str] = None
    placeholder: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_en: Optional[str] = None
    placeholder_zh: Optional[str] = None
    help_text: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_en: Optional[str] = None
    help_text_zh: Optional[str] = None
    required: bool = False
    options: Optional[List[FieldOption]] = None
    default_value: Optional[Any] = None
    validation: Optional[Dict[str, Any]] = None
    conditions: Optional[List[FieldCondition]] = None
    allowed_extensions: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None
    content: Optional[str] = None
    content_es: Optional[str] = None
    content_en: Optional[str] = None
    content_zh: Optional[str] = None


class UpdateFieldRequest(BaseModel):
    """Request to update a field"""
    label: Optional[str] = None
    label_es: Optional[str] = None
    label_en: Optional[str] = None
    label_zh: Optional[str] = None
    placeholder: Optional[str] = None
    placeholder_es: Optional[str] = None
    placeholder_en: Optional[str] = None
    placeholder_zh: Optional[str] = None
    help_text: Optional[str] = None
    help_text_es: Optional[str] = None
    help_text_en: Optional[str] = None
    help_text_zh: Optional[str] = None
    required: Optional[bool] = None
    options: Optional[List[FieldOption]] = None
    default_value: Optional[Any] = None
    validation: Optional[Dict[str, Any]] = None
    conditions: Optional[List[FieldCondition]] = None
    order: Optional[int] = None
    active: Optional[bool] = None
    allowed_extensions: Optional[List[str]] = None
    max_file_size_mb: Optional[float] = None
    content: Optional[str] = None
    content_es: Optional[str] = None
    content_en: Optional[str] = None
    content_zh: Optional[str] = None
