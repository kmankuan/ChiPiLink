"""
Form Configuration Service
Business logic for managing dynamic form configurations
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import logging

from core.base import BaseService
from ..repositories.form_config_repository import form_config_repository
from ..models.form_config import (
    FormFieldCreate, FormFieldUpdate, FieldType
)

logger = logging.getLogger(__name__)


class FormConfigService(BaseService):
    """
    Service for managing form field configurations.
    Allows admins to customize forms dynamically.
    """
    
    MODULE_NAME = "form_config"
    
    def __init__(self):
        super().__init__()
        self.repo = form_config_repository
    
    # ============== FORM FIELD MANAGEMENT ==============
    
    async def get_form_fields(
        self, 
        form_type: str, 
        include_inactive: bool = False
    ) -> Dict:
        """Get all fields for a form type"""
        # Seed default fields if none exist
        fields = await self.repo.get_by_form_type(form_type, include_inactive)
        
        if not fields and form_type == "textbook_access":
            fields = await self.repo.seed_default_fields(form_type)
        
        required_count = sum(1 for f in fields if f.get("is_required", False))
        
        return {
            "form_type": form_type,
            "fields": fields,
            "total_fields": len(fields),
            "required_fields": required_count
        }
    
    async def get_field(self, field_id: str) -> Optional[Dict]:
        """Get a single field by ID"""
        return await self.repo.get_by_id(field_id)
    
    async def create_field(
        self, 
        form_type: str, 
        data: FormFieldCreate,
        admin_id: str
    ) -> Dict:
        """Create a new form field"""
        # Check if field key already exists
        existing = await self.repo.get_by_key(form_type, data.field_key)
        if existing:
            raise ValueError(f"Field with key '{data.field_key}' already exists")
        
        # Get next order if not specified
        next_order = await self.repo.get_next_order(form_type)
        
        field_data = data.model_dump()
        field_data["form_type"] = form_type
        field_data["created_by"] = admin_id
        
        if field_data.get("order") is None or field_data.get("order") == 0:
            field_data["order"] = next_order
        
        # Convert enum to string if needed
        if isinstance(field_data.get("field_type"), FieldType):
            field_data["field_type"] = field_data["field_type"].value
        
        result = await self.repo.create(field_data)
        
        self.log_info(f"Form field created: {result['field_id']} by admin {admin_id}")
        
        return result
    
    async def update_field(
        self, 
        field_id: str, 
        data: FormFieldUpdate,
        admin_id: str
    ) -> Optional[Dict]:
        """Update a form field"""
        field = await self.repo.get_by_id(field_id)
        if not field:
            raise ValueError("Field not found")
        
        update_data = data.model_dump(exclude_unset=True)
        
        # Convert enum to string if needed
        if isinstance(update_data.get("field_type"), FieldType):
            update_data["field_type"] = update_data["field_type"].value
        
        # If changing field_key, check it doesn't conflict
        if "field_key" in update_data and update_data["field_key"] != field.get("field_key"):
            existing = await self.repo.get_by_key(field["form_type"], update_data["field_key"])
            if existing:
                raise ValueError(f"Field with key '{update_data['field_key']}' already exists")
        
        await self.repo.update_field(field_id, update_data)
        
        self.log_info(f"Form field updated: {field_id} by admin {admin_id}")
        
        return await self.repo.get_by_id(field_id)
    
    async def delete_field(self, field_id: str, admin_id: str, hard: bool = False) -> bool:
        """Delete a form field (soft or hard delete)"""
        field = await self.repo.get_by_id(field_id)
        if not field:
            raise ValueError("Field not found")
        
        if hard:
            result = await self.repo.hard_delete_field(field_id)
            self.log_info(f"Form field permanently deleted: {field_id} by admin {admin_id}")
        else:
            result = await self.repo.delete_field(field_id)
            self.log_info(f"Form field deactivated: {field_id} by admin {admin_id}")
        
        return result
    
    async def reorder_fields(
        self, 
        form_type: str, 
        field_orders: List[Dict],
        admin_id: str
    ) -> bool:
        """Reorder form fields"""
        await self.repo.reorder_fields(field_orders)
        
        self.log_info(f"Form fields reordered for {form_type} by admin {admin_id}")
        
        return True
    
    async def toggle_field_active(
        self, 
        field_id: str, 
        is_active: bool,
        admin_id: str
    ) -> Optional[Dict]:
        """Toggle a field's active status"""
        field = await self.repo.get_by_id(field_id)
        if not field:
            raise ValueError("Field not found")
        
        await self.repo.update_field(field_id, {"is_active": is_active})
        
        status = "activated" if is_active else "deactivated"
        self.log_info(f"Form field {status}: {field_id} by admin {admin_id}")
        
        return await self.repo.get_by_id(field_id)
    
    # ============== FIELD TYPE UTILITIES ==============
    
    def get_field_types(self) -> List[Dict]:
        """Get available field types with descriptions"""
        return [
            {
                "value": "text",
                "label_en": "Short Text",
                "label_es": "Texto Corto",
                "label_zh": "短文本",
                "description_en": "Single line text input",
                "description_es": "Entrada de texto de una línea",
                "icon": "type"
            },
            {
                "value": "textarea",
                "label_en": "Long Text",
                "label_es": "Texto Largo",
                "label_zh": "长文本",
                "description_en": "Multi-line text input",
                "description_es": "Entrada de texto multilínea",
                "icon": "align-left"
            },
            {
                "value": "select",
                "label_en": "Dropdown",
                "label_es": "Lista Desplegable",
                "label_zh": "下拉选择",
                "description_en": "Select from predefined options",
                "description_es": "Seleccionar de options predefinidas",
                "icon": "chevron-down"
            },
            {
                "value": "number",
                "label_en": "Number",
                "label_es": "Número",
                "label_zh": "数字",
                "description_en": "Numeric input",
                "description_es": "Entrada numérica",
                "icon": "hash"
            },
            {
                "value": "file",
                "label_en": "File Upload",
                "label_es": "Subir Archivo",
                "label_zh": "文件上传",
                "description_en": "Upload documents or images",
                "description_es": "Subir documentos o imágenes",
                "icon": "upload"
            },
            {
                "value": "date",
                "label_en": "Date",
                "label_es": "Fecha",
                "label_zh": "日期",
                "description_en": "Date picker",
                "description_es": "Selector de fecha",
                "icon": "calendar"
            },
            {
                "value": "email",
                "label_en": "Email",
                "label_es": "Correo Electrónico",
                "label_zh": "电子邮件",
                "description_en": "Email address input",
                "description_es": "Entrada de correo electrónico",
                "icon": "mail"
            },
            {
                "value": "phone",
                "label_en": "Phone",
                "label_es": "Teléfono",
                "label_zh": "电话",
                "description_en": "Phone number input",
                "description_es": "Entrada de number telefónico",
                "icon": "phone"
            }
        ]
    
    # ============== VALIDATION ==============
    
    def validate_form_data(
        self, 
        fields: List[Dict], 
        form_data: Dict
    ) -> List[Dict]:
        """
        Validate form data against field configurations.
        Returns list of validation errors.
        """
        errors = []
        
        for field in fields:
            if not field.get("is_active", True):
                continue
                
            key = field.get("field_key")
            value = form_data.get(key)
            field_type = field.get("field_type")
            is_required = field.get("is_required", False)
            
            # Check required
            if is_required and (value is None or value == "" or value == []):
                errors.append({
                    "field": key,
                    "error": "required",
                    "message_en": f"{field.get('label_en', key)} is required",
                    "message_es": f"{field.get('label_es', key)} es requerido"
                })
                continue
            
            if value is None or value == "":
                continue
            
            # Type-specific validation
            if field_type == "text" or field_type == "textarea":
                if field.get("min_length") and len(str(value)) < field["min_length"]:
                    errors.append({
                        "field": key,
                        "error": "min_length",
                        "message_en": f"Minimum {field['min_length']} characters required",
                        "message_es": f"Mínimo {field['min_length']} characters requeridos"
                    })
                if field.get("max_length") and len(str(value)) > field["max_length"]:
                    errors.append({
                        "field": key,
                        "error": "max_length",
                        "message_en": f"Maximum {field['max_length']} characters allowed",
                        "message_es": f"Máximo {field['max_length']} characters permitidos"
                    })
            
            elif field_type == "number":
                try:
                    num_value = float(value)
                    if field.get("min_value") is not None and num_value < field["min_value"]:
                        errors.append({
                            "field": key,
                            "error": "min_value",
                            "message_en": f"Minimum value is {field['min_value']}",
                            "message_es": f"El valor minimum es {field['min_value']}"
                        })
                    if field.get("max_value") is not None and num_value > field["max_value"]:
                        errors.append({
                            "field": key,
                            "error": "max_value",
                            "message_en": f"Maximum value is {field['max_value']}",
                            "message_es": f"El valor maximum es {field['max_value']}"
                        })
                except (ValueError, TypeError):
                    errors.append({
                        "field": key,
                        "error": "invalid_number",
                        "message_en": "Invalid number",
                        "message_es": "Número invalid"
                    })
            
            elif field_type == "select":
                options = field.get("options", [])
                valid_values = [opt.get("value") for opt in options]
                if valid_values and value not in valid_values:
                    errors.append({
                        "field": key,
                        "error": "invalid_option",
                        "message_en": "Invalid selection",
                        "message_es": "Selección invalid"
                    })
        
        return errors


# Singleton instance
form_config_service = FormConfigService()
