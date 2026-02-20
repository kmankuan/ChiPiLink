"""
Store Checkout Form Configuration Service
Reuses OrderFormConfigService pattern with a different config_id for the public store checkout
"""
from ..services.order_form_config_service import OrderFormConfigService


class StoreCheckoutFormService(OrderFormConfigService):
    """Service for managing public store checkout form configuration"""

    def __init__(self):
        super().__init__()
        self.default_config_id = "store_checkout_form"

    async def _create_default_config(self):
        """Create default config with common checkout fields"""
        from datetime import datetime, timezone
        import uuid

        default_fields = [
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "text",
                "label": "Full Name",
                "label_es": "Nombre Completo",
                "label_zh": "全名",
                "placeholder": "Enter your full name",
                "placeholder_es": "Ingrese su nombre completo",
                "placeholder_zh": "输入您的全名",
                "required": True,
                "order": 0,
                "active": True,
            },
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "email",
                "label": "Email",
                "label_es": "Correo Electrónico",
                "label_zh": "电子邮件",
                "placeholder": "email@example.com",
                "placeholder_es": "correo@ejemplo.com",
                "placeholder_zh": "email@example.com",
                "required": True,
                "order": 1,
                "active": True,
            },
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "phone",
                "label": "Phone",
                "label_es": "Teléfono",
                "label_zh": "电话",
                "placeholder": "+507 6000-0000",
                "placeholder_es": "+507 6000-0000",
                "placeholder_zh": "+507 6000-0000",
                "required": True,
                "order": 2,
                "active": True,
            },
            {
                "field_id": f"field_{uuid.uuid4().hex[:8]}",
                "field_type": "textarea",
                "label": "Delivery Address",
                "label_es": "Dirección de Entrega",
                "label_zh": "送货地址",
                "placeholder": "Enter your delivery address",
                "placeholder_es": "Ingrese su dirección de entrega",
                "placeholder_zh": "输入您的送货地址",
                "required": False,
                "order": 3,
                "active": True,
            },
        ]

        config = {
            "config_id": self.default_config_id,
            "name": "Store Checkout Form",
            "description": "Configuration for public store checkout form fields",
            "fields": default_fields,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "active": True,
        }

        await self.collection.insert_one(config)
        config.pop("_id", None)
        return config


# Singleton instance
store_checkout_form_service = StoreCheckoutFormService()
