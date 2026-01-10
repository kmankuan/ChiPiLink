"""
Push Notification Service - Servicio principal de notificaciones
Soporta múltiples proveedores (FCM, OneSignal) con failover y balanceo de carga
"""
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import uuid
import random
import asyncio

from core.database import db
from modules.notifications.models.notification_models import (
    NotificationProvider, NotificationPriority, NotificationStatus,
    get_default_notification_categories, get_default_provider_config,
    get_default_notification_templates
)
from modules.notifications.providers.push_providers import (
    FCMProvider, OneSignalProvider, MockProvider
)


class PushNotificationService:
    """Servicio central de push notifications"""
    
    def __init__(self):
        self.collection_config = "chipi_push_config"
        self.collection_categories = "chipi_notification_categories"
        self.collection_templates = "chipi_notification_templates"
        self.collection_user_prefs = "chipi_user_notification_prefs"
        self.collection_devices = "chipi_user_devices"
        self.collection_notifications = "chipi_notifications"
        self.collection_notification_logs = "chipi_notification_logs"
        
        self._providers = {}
        self._config = None
    
    def log_info(self, message: str):
        print(f"[PushNotificationService] {message}")
    
    # ============== CONFIGURATION ==============
    
    async def initialize(self):
        """Inicializar servicio y configuración"""
        await self.initialize_config()
        await self.initialize_categories()
        await self.initialize_templates()
        await self._load_providers()
        self.log_info("Service initialized")
    
    async def initialize_config(self) -> Dict:
        """Inicializar configuración de proveedores"""
        existing = await db[self.collection_config].find_one(
            {"config_id": "push_providers_config"},
            {"_id": 0}
        )
        
        if existing:
            self._config = existing
            return existing
        
        config = get_default_provider_config()
        config["created_at"] = datetime.now(timezone.utc).isoformat()
        config["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db[self.collection_config].insert_one(config)
        config.pop("_id", None)
        self._config = config
        
        self.log_info("Provider config initialized")
        return config
    
    async def get_config(self) -> Dict:
        """Obtener configuración"""
        if self._config:
            return self._config
        
        config = await db[self.collection_config].find_one(
            {"config_id": "push_providers_config"},
            {"_id": 0}
        )
        
        if not config:
            config = await self.initialize_config()
        
        self._config = config
        return config
    
    async def update_config(self, updates: Dict) -> Dict:
        """Actualizar configuración de proveedores"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_config].find_one_and_update(
            {"config_id": "push_providers_config"},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
            self._config = result
            await self._load_providers()  # Recargar proveedores
        
        return result
    
    async def update_provider_config(self, provider: str, settings: Dict) -> Dict:
        """Actualizar configuración de un proveedor específico"""
        update_key = f"{provider}"
        
        # Merge con configuración existente
        config = await self.get_config()
        current = config.get(provider, {})
        current.update(settings)
        
        return await self.update_config({provider: current})
    
    async def _load_providers(self):
        """Cargar instancias de proveedores"""
        config = await self.get_config()
        
        self._providers = {}
        
        # FCM
        fcm_config = config.get("fcm", {})
        if fcm_config.get("enabled"):
            self._providers["fcm"] = FCMProvider(fcm_config)
            self.log_info("FCM provider loaded")
        
        # OneSignal
        onesignal_config = config.get("onesignal", {})
        if onesignal_config.get("enabled"):
            self._providers["onesignal"] = OneSignalProvider(onesignal_config)
            self.log_info("OneSignal provider loaded")
        
        # Mock provider para desarrollo
        if not self._providers:
            self._providers["mock"] = MockProvider()
            self.log_info("Mock provider loaded (no providers configured)")
    
    def _select_provider(self, category_provider: str = None) -> str:
        """Seleccionar proveedor según estrategia"""
        if not self._providers:
            return "mock"
        
        available = list(self._providers.keys())
        
        if len(available) == 1:
            return available[0]
        
        # Si se especifica un proveedor
        if category_provider and category_provider != NotificationProvider.AUTO.value:
            if category_provider == NotificationProvider.BOTH.value:
                return "both"
            if category_provider in available:
                return category_provider
        
        # Balanceo de carga automático
        config = self._config or {}
        strategy = config.get("load_balancing", "weighted")
        
        if strategy == "round_robin":
            # Simple round-robin
            return random.choice(available)
        
        elif strategy == "least_loaded":
            # Seleccionar el de menor carga
            loads = {
                p: config.get(p, {}).get("current_load", 0)
                for p in available
            }
            return min(loads, key=loads.get)
        
        else:  # weighted
            # Selección ponderada
            weights = {
                p: config.get(p, {}).get("weight", 50)
                for p in available
            }
            total = sum(weights.values())
            r = random.uniform(0, total)
            cumulative = 0
            for p, w in weights.items():
                cumulative += w
                if r <= cumulative:
                    return p
            return available[0]
    
    # ============== CATEGORIES ==============
    
    async def initialize_categories(self) -> int:
        """Inicializar categorías por defecto"""
        defaults = get_default_notification_categories()
        created = 0
        
        for cat in defaults:
            existing = await db[self.collection_categories].find_one(
                {"category_id": cat["category_id"]}
            )
            if not existing:
                cat["created_at"] = datetime.now(timezone.utc).isoformat()
                cat["is_active"] = True
                await db[self.collection_categories].insert_one(cat)
                created += 1
        
        self.log_info(f"Initialized {created} notification categories")
        return created
    
    async def get_categories(self, active_only: bool = True) -> List[Dict]:
        """Obtener categorías de notificación"""
        query = {}
        if active_only:
            query["is_active"] = True
        
        cursor = db[self.collection_categories].find(
            query,
            {"_id": 0}
        ).sort("sort_order", 1)
        
        return await cursor.to_list(length=100)
    
    async def get_category(self, category_id: str) -> Optional[Dict]:
        """Obtener una categoría específica"""
        return await db[self.collection_categories].find_one(
            {"category_id": category_id},
            {"_id": 0}
        )
    
    async def create_category(self, data: Dict) -> Dict:
        """Crear nueva categoría"""
        if "category_id" not in data:
            data["category_id"] = f"cat_{uuid.uuid4().hex[:8]}"
        
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["is_active"] = True
        
        await db[self.collection_categories].insert_one(data)
        data.pop("_id", None)
        
        self.log_info(f"Created category: {data['category_id']}")
        return data
    
    async def update_category(self, category_id: str, updates: Dict) -> Optional[Dict]:
        """Actualizar categoría"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_categories].find_one_and_update(
            {"category_id": category_id},
            {"$set": updates},
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    async def delete_category(self, category_id: str) -> bool:
        """Desactivar categoría (soft delete)"""
        result = await db[self.collection_categories].update_one(
            {"category_id": category_id},
            {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count > 0
    
    # ============== TEMPLATES ==============
    
    async def initialize_templates(self) -> int:
        """Inicializar plantillas por defecto"""
        defaults = get_default_notification_templates()
        created = 0
        
        for tpl in defaults:
            existing = await db[self.collection_templates].find_one(
                {"template_id": tpl["template_id"]}
            )
            if not existing:
                tpl["created_at"] = datetime.now(timezone.utc).isoformat()
                await db[self.collection_templates].insert_one(tpl)
                created += 1
        
        self.log_info(f"Initialized {created} notification templates")
        return created
    
    async def get_templates(self, category_id: str = None) -> List[Dict]:
        """Obtener plantillas"""
        query = {"is_active": True}
        if category_id:
            query["category_id"] = category_id
        
        cursor = db[self.collection_templates].find(query, {"_id": 0})
        return await cursor.to_list(length=100)
    
    async def get_template(self, template_id: str) -> Optional[Dict]:
        """Obtener una plantilla"""
        return await db[self.collection_templates].find_one(
            {"template_id": template_id},
            {"_id": 0}
        )
    
    # ============== USER PREFERENCES ==============
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """Obtener preferencias de notificación del usuario"""
        prefs = await db[self.collection_user_prefs].find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        if prefs:
            return prefs
        
        # Crear preferencias por defecto
        categories = await self.get_categories()
        default_prefs = {
            "user_id": user_id,
            "push_enabled": True,
            "email_enabled": True,
            "quiet_hours": {
                "enabled": False,
                "start": "22:00",
                "end": "08:00"
            },
            "categories": {
                cat["category_id"]: {
                    "enabled": cat.get("default_enabled", True),
                    "push": True,
                    "email": False
                }
                for cat in categories
            },
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db[self.collection_user_prefs].insert_one(default_prefs)
        default_prefs.pop("_id", None)
        
        return default_prefs
    
    async def update_user_preferences(self, user_id: str, updates: Dict) -> Dict:
        """Actualizar preferencias del usuario"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db[self.collection_user_prefs].find_one_and_update(
            {"user_id": user_id},
            {"$set": updates},
            upsert=True,
            return_document=True
        )
        
        if result:
            result.pop("_id", None)
        return result
    
    async def update_category_preference(
        self,
        user_id: str,
        category_id: str,
        enabled: bool = None,
        push: bool = None,
        email: bool = None
    ) -> Dict:
        """Actualizar preferencia de una categoría específica"""
        updates = {}
        
        if enabled is not None:
            updates[f"categories.{category_id}.enabled"] = enabled
        if push is not None:
            updates[f"categories.{category_id}.push"] = push
        if email is not None:
            updates[f"categories.{category_id}.email"] = email
        
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        return await self.update_user_preferences(user_id, updates)
    
    # ============== DEVICE MANAGEMENT ==============
    
    async def register_device(
        self,
        user_id: str,
        device_token: str,
        provider: str,
        device_info: Dict = None
    ) -> Dict:
        """Registrar dispositivo para push"""
        now = datetime.now(timezone.utc).isoformat()
        
        device = {
            "device_id": f"dev_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "device_token": device_token,
            "provider": provider,
            "device_info": device_info or {},
            "is_active": True,
            "created_at": now,
            "last_used_at": now
        }
        
        # Upsert basado en token
        await db[self.collection_devices].update_one(
            {"device_token": device_token},
            {"$set": device},
            upsert=True
        )
        
        self.log_info(f"Registered device for user {user_id}")
        return device
    
    async def get_user_devices(self, user_id: str, active_only: bool = True) -> List[Dict]:
        """Obtener dispositivos de un usuario"""
        query = {"user_id": user_id}
        if active_only:
            query["is_active"] = True
        
        cursor = db[self.collection_devices].find(query, {"_id": 0})
        return await cursor.to_list(length=20)
    
    async def deactivate_device(self, device_token: str) -> bool:
        """Desactivar dispositivo"""
        result = await db[self.collection_devices].update_one(
            {"device_token": device_token},
            {"$set": {"is_active": False}}
        )
        return result.modified_count > 0
    
    # ============== SEND NOTIFICATIONS ==============
    
    async def send_notification(
        self,
        user_id: str,
        category_id: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None,
        template_id: str = None,
        variables: Dict = None
    ) -> Dict:
        """Enviar notificación a un usuario"""
        # Verificar preferencias del usuario
        prefs = await self.get_user_preferences(user_id)
        
        if not prefs.get("push_enabled", True):
            return {"success": False, "reason": "User has push disabled"}
        
        cat_prefs = prefs.get("categories", {}).get(category_id, {})
        if not cat_prefs.get("enabled", True) or not cat_prefs.get("push", True):
            return {"success": False, "reason": "Category disabled by user"}
        
        # Verificar quiet hours
        if prefs.get("quiet_hours", {}).get("enabled"):
            # TODO: Implementar verificación de quiet hours
            pass
        
        # Obtener categoría para determinar proveedor
        category = await self.get_category(category_id)
        category_provider = category.get("default_provider") if category else None
        
        # Obtener dispositivos del usuario
        devices = await self.get_user_devices(user_id)
        
        if not devices:
            return {"success": False, "reason": "No devices registered"}
        
        # Procesar template si se proporciona
        final_title = title
        final_body = body
        
        if template_id and variables:
            template = await self.get_template(template_id)
            if template:
                lang = prefs.get("language", "es")
                final_title = template["title"].get(lang, title)
                final_body = template["body"].get(lang, body)
                
                # Reemplazar variables
                for key, value in variables.items():
                    final_title = final_title.replace(f"{{{{{key}}}}}", str(value))
                    final_body = final_body.replace(f"{{{{{key}}}}}", str(value))
        
        # Seleccionar proveedor
        selected_provider = self._select_provider(category_provider)
        
        results = {
            "success": False,
            "user_id": user_id,
            "category_id": category_id,
            "providers_used": [],
            "sent": 0,
            "failed": 0
        }
        
        # Agrupar dispositivos por proveedor
        devices_by_provider = {}
        for device in devices:
            p = device.get("provider", "fcm")
            if p not in devices_by_provider:
                devices_by_provider[p] = []
            devices_by_provider[p].append(device["device_token"])
        
        # Enviar según estrategia
        if selected_provider == "both":
            # Enviar a todos los proveedores
            for provider_name, tokens in devices_by_provider.items():
                if provider_name in self._providers:
                    result = await self._providers[provider_name].send_notification(
                        device_tokens=tokens,
                        title=final_title,
                        body=final_body,
                        data=data,
                        image_url=image_url,
                        action_url=action_url
                    )
                    results["providers_used"].append(provider_name)
                    results["sent"] += result.get("sent", 0)
                    results["failed"] += result.get("failed", 0)
        else:
            # Enviar al proveedor seleccionado
            tokens = []
            for provider_name, device_tokens in devices_by_provider.items():
                if selected_provider in ["auto", provider_name]:
                    tokens.extend(device_tokens)
            
            if tokens and selected_provider in self._providers:
                result = await self._providers[selected_provider].send_notification(
                    device_tokens=tokens,
                    title=final_title,
                    body=final_body,
                    data=data,
                    image_url=image_url,
                    action_url=action_url
                )
                results["providers_used"].append(selected_provider)
                results["sent"] = result.get("sent", 0)
                results["failed"] = result.get("failed", 0)
            elif tokens and "mock" in self._providers:
                result = await self._providers["mock"].send_notification(
                    device_tokens=tokens,
                    title=final_title,
                    body=final_body,
                    data=data,
                    image_url=image_url,
                    action_url=action_url
                )
                results["providers_used"].append("mock")
                results["sent"] = result.get("sent", 0)
        
        results["success"] = results["sent"] > 0
        
        # Registrar log
        await self._log_notification(
            user_id=user_id,
            category_id=category_id,
            title=final_title,
            body=final_body,
            results=results
        )
        
        return results
    
    async def send_to_users(
        self,
        user_ids: List[str],
        category_id: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Enviar notificación a múltiples usuarios"""
        results = {
            "success": True,
            "total_users": len(user_ids),
            "sent": 0,
            "failed": 0,
            "skipped": 0
        }
        
        for user_id in user_ids:
            result = await self.send_notification(
                user_id=user_id,
                category_id=category_id,
                title=title,
                body=body,
                data=data,
                image_url=image_url,
                action_url=action_url
            )
            
            if result.get("success"):
                results["sent"] += 1
            elif result.get("reason"):
                results["skipped"] += 1
            else:
                results["failed"] += 1
        
        return results
    
    async def send_to_all(
        self,
        category_id: str,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Enviar notificación a todos los usuarios con dispositivos registrados"""
        # Obtener todos los usuarios con dispositivos
        pipeline = [
            {"$match": {"is_active": True}},
            {"$group": {"_id": "$user_id"}}
        ]
        
        user_docs = await db[self.collection_devices].aggregate(pipeline).to_list(length=10000)
        user_ids = [doc["_id"] for doc in user_docs]
        
        if not user_ids:
            return {"success": False, "reason": "No users with devices"}
        
        return await self.send_to_users(
            user_ids=user_ids,
            category_id=category_id,
            title=title,
            body=body,
            data=data,
            image_url=image_url,
            action_url=action_url
        )
    
    async def _log_notification(
        self,
        user_id: str,
        category_id: str,
        title: str,
        body: str,
        results: Dict
    ):
        """Registrar log de notificación"""
        log = {
            "log_id": f"nlog_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "category_id": category_id,
            "title": title,
            "body": body,
            "results": results,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db[self.collection_notification_logs].insert_one(log)
    
    async def get_notification_logs(
        self,
        user_id: str = None,
        category_id: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """Obtener logs de notificaciones"""
        query = {}
        if user_id:
            query["user_id"] = user_id
        if category_id:
            query["category_id"] = category_id
        
        cursor = db[self.collection_notification_logs].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)


# Singleton
push_notification_service = PushNotificationService()
