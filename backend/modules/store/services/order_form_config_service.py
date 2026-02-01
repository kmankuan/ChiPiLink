"""
Order Form Configuration Service
Business logic for managing dynamic form fields
"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from core.database import db
from ..models.order_form_config import (
    OrderFormField, OrderFormConfig, FieldType, CreateFieldRequest, UpdateFieldRequest
)


class OrderFormConfigService:
    """Service for managing textbook order form configuration"""
    
    def __init__(self):
        self.collection = db.store_order_form_config
        self.default_config_id = "textbook_order_form"
    
    async def get_config(self) -> Dict:
        """Get the form configuration"""
        config = await self.collection.find_one(
            {"config_id": self.default_config_id},
            {"_id": 0}
        )
        
        if not config:
            # Create default config with bank transfer info field
            config = await self._create_default_config()
        
        return config
    
    async def _create_default_config(self) -> Dict:
        """Create default configuration with sample fields"""
        default_fields = [
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "info",
                "label": "Payment Information",
                "label_es": "Información de Pago",
                "label_en": "Payment Information",
                "label_zh": "付款信息",
                "content": """
**Bank Transfer Details:**
- Bank: Banco General
- Account: 00-00-00-000000-0
- Account Holder: PCA School
- Reference: Use your student's name
                """,
                "content_es": """
**Datos para Transferencia Bancaria:**
- Banco: Banco General
- Cuenta: 00-00-00-000000-0
- Titular: PCA School
- Referencia: Usar el nombre del estudiante
                """,
                "content_en": """
**Bank Transfer Details:**
- Bank: Banco General
- Account: 00-00-00-000000-0
- Account Holder: PCA School
- Reference: Use your student's name
                """,
                "content_zh": """
**银行转账详情:**
- 银行: Banco General
- 账户: 00-00-00-000000-0
- 账户持有人: PCA School
- 参考: 使用学生姓名
                """,
                "required": False,
                "order": 0,
                "active": True
            },
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "file",
                "label": "Payment Receipt",
                "label_es": "Comprobante de Pago",
                "label_en": "Payment Receipt",
                "label_zh": "付款收据",
                "placeholder": "Upload payment receipt",
                "placeholder_es": "Subir comprobante de pago",
                "placeholder_en": "Upload payment receipt",
                "placeholder_zh": "上传付款收据",
                "help_text": "Upload your bank transfer receipt (PDF, JPG, PNG)",
                "help_text_es": "Sube tu comprobante de transferencia (PDF, JPG, PNG)",
                "help_text_en": "Upload your bank transfer receipt (PDF, JPG, PNG)",
                "help_text_zh": "上传您的银行转账收据 (PDF, JPG, PNG)",
                "required": True,
                "allowed_extensions": [".pdf", ".jpg", ".jpeg", ".png"],
                "max_file_size_mb": 5.0,
                "order": 1,
                "active": True
            }
        ]
        
        config = {
            "config_id": self.default_config_id,
            "name": "Textbook Order Form",
            "description": "Configuration for textbook order form fields",
            "fields": default_fields,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "active": True
        }
        
        await self.collection.insert_one(config)
        config.pop("_id", None)
        return config
    
    async def get_fields(self, include_inactive: bool = False) -> List[Dict]:
        """Get all form fields"""
        config = await self.get_config()
        fields = config.get("fields", [])
        
        if not include_inactive:
            fields = [f for f in fields if f.get("active", True)]
        
        return sorted(fields, key=lambda x: x.get("order", 0))
    
    async def add_field(self, field_data: CreateFieldRequest) -> Dict:
        """Add a new field to the form"""
        config = await self.get_config()
        fields = config.get("fields", [])
        
        # Generate field ID
        field_id = f"field_{uuid.uuid4().hex[:8]}"
        
        # Get next order number
        max_order = max([f.get("order", 0) for f in fields], default=-1)
        
        new_field = {
            "field_id": field_id,
            "field_type": field_data.field_type,
            "label": field_data.label,
            "label_es": field_data.label_es,
            "label_en": field_data.label_en,
            "label_zh": field_data.label_zh,
            "placeholder": field_data.placeholder,
            "placeholder_es": field_data.placeholder_es,
            "placeholder_en": field_data.placeholder_en,
            "placeholder_zh": field_data.placeholder_zh,
            "help_text": field_data.help_text,
            "help_text_es": field_data.help_text_es,
            "help_text_en": field_data.help_text_en,
            "help_text_zh": field_data.help_text_zh,
            "required": field_data.required,
            "options": [opt.dict() for opt in field_data.options] if field_data.options else None,
            "default_value": field_data.default_value,
            "validation": field_data.validation,
            "conditions": [c.dict() for c in field_data.conditions] if field_data.conditions else None,
            "allowed_extensions": field_data.allowed_extensions,
            "max_file_size_mb": field_data.max_file_size_mb,
            "content": field_data.content,
            "content_es": field_data.content_es,
            "content_en": field_data.content_en,
            "content_zh": field_data.content_zh,
            "order": max_order + 1,
            "active": True
        }
        
        await self.collection.update_one(
            {"config_id": self.default_config_id},
            {
                "$push": {"fields": new_field},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        
        return new_field
    
    async def update_field(self, field_id: str, field_data: UpdateFieldRequest) -> Optional[Dict]:
        """Update an existing field"""
        config = await self.get_config()
        fields = config.get("fields", [])
        
        field_index = next(
            (i for i, f in enumerate(fields) if f["field_id"] == field_id),
            None
        )
        
        if field_index is None:
            return None
        
        # Update only provided fields
        update_data = field_data.dict(exclude_unset=True)
        if "options" in update_data and update_data["options"]:
            update_data["options"] = [opt.dict() if hasattr(opt, 'dict') else opt for opt in update_data["options"]]
        if "conditions" in update_data and update_data["conditions"]:
            update_data["conditions"] = [c.dict() if hasattr(c, 'dict') else c for c in update_data["conditions"]]
        
        for key, value in update_data.items():
            fields[field_index][key] = value
        
        await self.collection.update_one(
            {"config_id": self.default_config_id},
            {
                "$set": {
                    "fields": fields,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return fields[field_index]
    
    async def delete_field(self, field_id: str) -> bool:
        """Delete a field (soft delete - sets active to False)"""
        result = await self.update_field(field_id, UpdateFieldRequest(active=False))
        return result is not None
    
    async def hard_delete_field(self, field_id: str) -> bool:
        """Permanently delete a field"""
        result = await self.collection.update_one(
            {"config_id": self.default_config_id},
            {
                "$pull": {"fields": {"field_id": field_id}},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
        return result.modified_count > 0
    
    async def reorder_fields(self, field_ids: List[str]) -> List[Dict]:
        """Reorder fields based on the provided list"""
        config = await self.get_config()
        fields = config.get("fields", [])
        
        # Update order based on position in field_ids list
        for index, field_id in enumerate(field_ids):
            for field in fields:
                if field["field_id"] == field_id:
                    field["order"] = index
                    break
        
        await self.collection.update_one(
            {"config_id": self.default_config_id},
            {
                "$set": {
                    "fields": fields,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return sorted(fields, key=lambda x: x.get("order", 0))
    
    async def get_field_types(self) -> List[Dict]:
        """Get available field types with descriptions"""
        return [
            {"type": "text", "label": "Text Input", "label_es": "Texto", "label_zh": "文本输入", "description": "Single line text"},
            {"type": "textarea", "label": "Text Area", "label_es": "Área de Texto", "label_zh": "文本区域", "description": "Multi-line text"},
            {"type": "number", "label": "Number", "label_es": "Número", "label_zh": "数字", "description": "Numeric input"},
            {"type": "select", "label": "Dropdown", "label_es": "Lista Desplegable", "label_zh": "下拉列表", "description": "Single selection"},
            {"type": "multiselect", "label": "Multi-Select", "label_es": "Selección Múltiple", "label_zh": "多选", "description": "Multiple selection"},
            {"type": "checkbox", "label": "Checkbox", "label_es": "Casilla", "label_zh": "复选框", "description": "Yes/No option"},
            {"type": "file", "label": "File Upload", "label_es": "Subir Archivo", "label_zh": "文件上传", "description": "File attachment"},
            {"type": "date", "label": "Date", "label_es": "Fecha", "label_zh": "日期", "description": "Date picker"},
            {"type": "email", "label": "Email", "label_es": "Correo", "label_zh": "电子邮件", "description": "Email address"},
            {"type": "phone", "label": "Phone", "label_es": "Teléfono", "label_zh": "电话", "description": "Phone number"},
            {"type": "info", "label": "Info Display", "label_es": "Información", "label_zh": "信息显示", "description": "Display-only content (e.g., bank details)"}
        ]


# Singleton instance
order_form_config_service = OrderFormConfigService()
