"""
Push Notification Providers - FCM y OneSignal
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import asyncio
import httpx


class PushProvider(ABC):
    """Clase base abstracta para proveedores de push"""
    
    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass
    
    @abstractmethod
    async def send_notification(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        pass
    
    @abstractmethod
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> Dict:
        pass
    
    @abstractmethod
    async def subscribe_to_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        pass
    
    @abstractmethod
    async def unsubscribe_from_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        pass
    
    @abstractmethod
    def validate_config(self) -> bool:
        pass


class FCMProvider(PushProvider):
    """Firebase Cloud Messaging Provider"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.project_id = config.get("project_id")
        self.api_key = config.get("api_key")
        self.sender_id = config.get("sender_id")
        self.service_account = config.get("service_account_key")
        self._access_token = None
        self._token_expires = None
    
    @property
    def provider_name(self) -> str:
        return "fcm"
    
    def validate_config(self) -> bool:
        """Validate configuración FCM"""
        return all([
            self.project_id,
            self.api_key or self.service_account
        ])
    
    async def _get_access_token(self) -> str:
        """Get access token para FCM v1 API"""
        # For simplificar, usamos la API key legacy
        # In producción real, usaríamos OAuth2 con service account
        return self.api_key
    
    async def send_notification(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Send notificación a dispositivos específicos"""
        if not self.validate_config():
            return {
                "success": False,
                "error": "FCM not configured",
                "provider": self.provider_name
            }
        
        results = {
            "success": True,
            "provider": self.provider_name,
            "sent": 0,
            "failed": 0,
            "errors": []
        }
        
        # FCM Legacy API endpoint
        url = "https://fcm.googleapis.com/fcm/send"
        headers = {
            "Authorization": f"key={self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare payload
        notification = {
            "title": title,
            "body": body
        }
        
        if image_url:
            notification["image"] = image_url
        
        payload_data = data or {}
        if action_url:
            payload_data["action_url"] = action_url
        
        async with httpx.AsyncClient() as client:
            for token in device_tokens:
                try:
                    payload = {
                        "to": token,
                        "notification": notification,
                        "data": payload_data
                    }
                    
                    response = await client.post(url, json=payload, headers=headers)
                    
                    if response.status_code == 200:
                        result = response.json()
                        if result.get("success", 0) > 0:
                            results["sent"] += 1
                        else:
                            results["failed"] += 1
                            results["errors"].append({
                                "token": token[:20] + "...",
                                "error": result.get("results", [{}])[0].get("error", "Unknown")
                            })
                    else:
                        results["failed"] += 1
                        results["errors"].append({
                            "token": token[:20] + "...",
                            "error": f"HTTP {response.status_code}"
                        })
                except Exception as e:
                    results["failed"] += 1
                    results["errors"].append({
                        "token": token[:20] + "...",
                        "error": str(e)
                    })
        
        results["success"] = results["sent"] > 0 or len(device_tokens) == 0
        return results
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> Dict:
        """Send notificación a un topic"""
        if not self.validate_config():
            return {"success": False, "error": "FCM not configured"}
        
        url = "https://fcm.googleapis.com/fcm/send"
        headers = {
            "Authorization": f"key={self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "to": f"/topics/{topic}",
            "notification": {
                "title": title,
                "body": body
            },
            "data": data or {}
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": self.provider_name,
                        "message_id": response.json().get("message_id")
                    }
                else:
                    return {
                        "success": False,
                        "error": f"HTTP {response.status_code}",
                        "provider": self.provider_name
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "provider": self.provider_name
                }
    
    async def subscribe_to_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        """Suscribir dispositivos a un topic"""
        if not self.validate_config():
            return {"success": False, "error": "FCM not configured"}
        
        url = f"https://iid.googleapis.com/iid/v1:batchAdd"
        headers = {
            "Authorization": f"key={self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "to": f"/topics/{topic}",
            "registration_tokens": device_tokens
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                return {
                    "success": response.status_code == 200,
                    "provider": self.provider_name
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    async def unsubscribe_from_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        """Desuscribir dispositivos de un topic"""
        if not self.validate_config():
            return {"success": False, "error": "FCM not configured"}
        
        url = f"https://iid.googleapis.com/iid/v1:batchRemove"
        headers = {
            "Authorization": f"key={self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "to": f"/topics/{topic}",
            "registration_tokens": device_tokens
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, headers=headers)
                return {
                    "success": response.status_code == 200,
                    "provider": self.provider_name
                }
            except Exception as e:
                return {"success": False, "error": str(e)}


class OneSignalProvider(PushProvider):
    """OneSignal Push Provider - API v2"""
    
    def __init__(self, config: Dict):
        self.config = config
        self.app_id = config.get("app_id")
        self.api_key = config.get("api_key")
        self.base_url = "https://api.onesignal.com"
    
    @property
    def provider_name(self) -> str:
        return "onesignal"
    
    def validate_config(self) -> bool:
        """Validate configuración OneSignal"""
        return all([self.app_id, self.api_key])
    
    def _get_headers(self) -> Dict[str, str]:
        """Get headers para la API"""
        return {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def send_notification(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Send notificación a dispositivos específicos (por subscription_id)"""
        if not self.validate_config():
            return {
                "success": False,
                "error": "OneSignal not configured",
                "provider": self.provider_name
            }
        
        url = f"{self.base_url}/notifications"
        
        payload = {
            "app_id": self.app_id,
            "include_subscription_ids": device_tokens,
            "headings": {"en": title, "es": title},
            "contents": {"en": body, "es": body},
            "data": data or {},
            "target_channel": "push"
        }
        
        if image_url:
            payload["chrome_web_image"] = image_url
            payload["big_picture"] = image_url
        
        if action_url:
            payload["url"] = action_url
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json=payload, 
                    headers=self._get_headers(),
                    timeout=30.0
                )
                result = response.json()
                
                if response.status_code == 200:
                    return {
                        "success": True,
                        "provider": self.provider_name,
                        "notification_id": result.get("id"),
                        "sent": result.get("recipients", 0),
                        "failed": len(device_tokens) - result.get("recipients", 0),
                        "errors": result.get("errors", [])
                    }
                else:
                    return {
                        "success": False,
                        "provider": self.provider_name,
                        "error": result.get("errors", ["Unknown error"]),
                        "sent": 0,
                        "failed": len(device_tokens)
                    }
            except Exception as e:
                return {
                    "success": False,
                    "provider": self.provider_name,
                    "error": str(e),
                    "sent": 0,
                    "failed": len(device_tokens)
                }
    
    async def send_to_segment(
        self,
        segments: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Send notificación a segmentos de OneSignal"""
        if not self.validate_config():
            return {"success": False, "error": "OneSignal not configured"}
        
        url = f"{self.base_url}/notifications"
        
        payload = {
            "app_id": self.app_id,
            "included_segments": segments,
            "headings": {"en": title, "es": title},
            "contents": {"en": body, "es": body},
            "data": data or {},
            "target_channel": "push"
        }
        
        if image_url:
            payload["chrome_web_image"] = image_url
            payload["big_picture"] = image_url
        
        if action_url:
            payload["url"] = action_url
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json=payload, 
                    headers=self._get_headers(),
                    timeout=30.0
                )
                result = response.json()
                
                return {
                    "success": response.status_code == 200,
                    "provider": self.provider_name,
                    "notification_id": result.get("id"),
                    "recipients": result.get("recipients", 0),
                    "errors": result.get("errors", [])
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> Dict:
        """Send notificación usando filtros de tags"""
        if not self.validate_config():
            return {"success": False, "error": "OneSignal not configured"}
        
        url = f"{self.base_url}/notifications"
        
        payload = {
            "app_id": self.app_id,
            "filters": [{"field": "tag", "key": "topic", "relation": "=", "value": topic}],
            "headings": {"en": title, "es": title},
            "contents": {"en": body, "es": body},
            "data": data or {},
            "target_channel": "push"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json=payload, 
                    headers=self._get_headers(),
                    timeout=30.0
                )
                result = response.json()
                
                return {
                    "success": response.status_code == 200,
                    "provider": self.provider_name,
                    "notification_id": result.get("id"),
                    "recipients": result.get("recipients", 0)
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    async def send_to_all(
        self,
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Send notificación a todos los suscriptores"""
        return await self.send_to_segment(
            segments=["Subscribed Users"],
            title=title,
            body=body,
            data=data,
            image_url=image_url,
            action_url=action_url
        )
    
    async def send_by_external_id(
        self,
        external_ids: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        """Send notificación a usuarios por external_id (user_id)"""
        if not self.validate_config():
            return {"success": False, "error": "OneSignal not configured"}
        
        url = f"{self.base_url}/notifications"
        
        payload = {
            "app_id": self.app_id,
            "include_aliases": {"external_id": external_ids},
            "target_channel": "push",
            "headings": {"en": title, "es": title},
            "contents": {"en": body, "es": body},
            "data": data or {}
        }
        
        if image_url:
            payload["chrome_web_image"] = image_url
            payload["big_picture"] = image_url
        
        if action_url:
            payload["url"] = action_url
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    url, 
                    json=payload, 
                    headers=self._get_headers(),
                    timeout=30.0
                )
                result = response.json()
                
                return {
                    "success": response.status_code == 200,
                    "provider": self.provider_name,
                    "notification_id": result.get("id"),
                    "recipients": result.get("recipients", 0),
                    "errors": result.get("errors", [])
                }
            except Exception as e:
                return {"success": False, "error": str(e)}
    
    async def subscribe_to_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        """OneSignal usa tags - se maneja desde el cliente SDK"""
        return {
            "success": True,
            "provider": self.provider_name,
            "message": "Use client SDK to add tags"
        }
    
    async def unsubscribe_from_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        """OneSignal usa tags - se maneja desde el cliente SDK"""
        return {
            "success": True,
            "provider": self.provider_name,
            "message": "Use client SDK to remove tags"
        }


class MockProvider(PushProvider):
    """Mock provider para desarrollo y testing"""
    
    def __init__(self, config: Dict = None):
        self.config = config or {}
        self.sent_notifications = []
    
    @property
    def provider_name(self) -> str:
        return "mock"
    
    def validate_config(self) -> bool:
        return True
    
    async def send_notification(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Dict = None,
        image_url: str = None,
        action_url: str = None
    ) -> Dict:
        notification = {
            "tokens": device_tokens,
            "title": title,
            "body": body,
            "data": data,
            "image_url": image_url,
            "action_url": action_url,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.sent_notifications.append(notification)
        print(f"[MockProvider] Sent notification: {title} to {len(device_tokens)} devices")
        
        return {
            "success": True,
            "provider": self.provider_name,
            "sent": len(device_tokens),
            "failed": 0,
            "errors": []
        }
    
    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Dict = None
    ) -> Dict:
        print(f"[MockProvider] Sent to topic '{topic}': {title}")
        return {
            "success": True,
            "provider": self.provider_name,
            "topic": topic
        }
    
    async def subscribe_to_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        print(f"[MockProvider] Subscribed {len(device_tokens)} devices to '{topic}'")
        return {"success": True, "provider": self.provider_name}
    
    async def unsubscribe_from_topic(
        self,
        device_tokens: List[str],
        topic: str
    ) -> Dict:
        print(f"[MockProvider] Unsubscribed {len(device_tokens)} devices from '{topic}'")
        return {"success": True, "provider": self.provider_name}
