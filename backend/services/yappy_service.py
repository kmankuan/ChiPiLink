"""
Yappy Comercial Payment Service
Handles integration with Yappy payment gateway for both platform store and vendor stores
"""
import httpx
import hashlib
import hmac
import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Yappy API URLs
YAPPY_URLS = {
    "produccion": {
        "api": "https://apipagosbg.bgeneral.cloud",
        "cdn": "https://bt-cdn.yappy.cloud/v1/cdn/web-component-btn-yappy.js"
    },
    "pruebas": {
        "api": "https://api-comecom-uat.yappycloud.com",
        "cdn": "https://bt-cdn-uat.yappycloud.com/v1/cdn/web-component-btn-yappy.js"
    }
}

class YappyService:
    def __init__(self, merchant_id: str, secret_key: str, url_domain: str, ambiente: str = "pruebas"):
        self.merchant_id = merchant_id
        self.secret_key = secret_key
        self.url_domain = url_domain
        self.ambiente = ambiente
        self.base_url = YAPPY_URLS[ambiente]["api"]
        self.cdn_url = YAPPY_URLS[ambiente]["cdn"]
    
    async def validate_merchant(self) -> Dict[str, Any]:
        """
        Step 1: Validate merchant and get authentication token
        POST /payments/validate/merchant
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payments/validate/merchant",
                    json={
                        "merchantId": self.merchant_id,
                        "urlDomain": self.url_domain
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=30.0
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("status", {}).get("code") in ["00", "0000"]:
                    return {
                        "success": True,
                        "token": result.get("body", {}).get("token"),
                        "epoch_time": result.get("body", {}).get("epochTime"),
                        "message": "Merchant validated successfully"
                    }
                
                return {
                    "success": False,
                    "error": result.get("status", {}).get("description", "Error validating merchant"),
                    "code": result.get("status", {}).get("code")
                }
                
        except Exception as e:
            logger.error(f"Error validating Yappy merchant: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_order(
        self,
        token: str,
        order_id: str,
        alias_yappy: str,
        subtotal: float,
        taxes: float = 0,
        discount: float = 0,
        total: float = None,
        ipn_url: str = ""
    ) -> Dict[str, Any]:
        """
        Step 2: Create payment order
        POST /payments/payment-wc
        """
        if total is None:
            total = subtotal + taxes - discount
        
        # Validate order_id length (max 15 alphanumeric chars)
        order_id = str(order_id)[:15]
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/payments/payment-wc",
                    json={
                        "merchantId": self.merchant_id,
                        "orderId": order_id,
                        "domain": self.url_domain,
                        "paymentDate": int(time.time()),
                        "aliasYappy": alias_yappy,  # Phone number without prefix
                        "ipnUrl": ipn_url,
                        "discount": f"{discount:.2f}",
                        "taxes": f"{taxes:.2f}",
                        "subtotal": f"{subtotal:.2f}",
                        "total": f"{total:.2f}"
                    },
                    headers={
                        "Authorization": token,
                        "Content-Type": "application/json"
                    },
                    timeout=30.0
                )
                
                result = response.json()
                
                if response.status_code == 200 and result.get("status", {}).get("code") in ["00", "0000"]:
                    body = result.get("body", {})
                    return {
                        "success": True,
                        "transaction_id": body.get("transactionId"),
                        "token": body.get("token"),
                        "document_name": body.get("documentName"),
                        "message": "Order created successfully"
                    }
                
                return {
                    "success": False,
                    "error": result.get("status", {}).get("description", "Error creating order"),
                    "code": result.get("status", {}).get("code")
                }
                
        except Exception as e:
            logger.error(f"Error creating Yappy order: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def verify_ipn_hash(self, order_id: str, status: str, received_hash: str) -> bool:
        """
        Verify IPN callback hash using secret key
        Hash = HMAC-SHA256(orderId + status, secretKey)
        """
        try:
            message = f"{order_id}{status}"
            expected_hash = hmac.new(
                self.secret_key.encode('utf-8'),
                message.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            return hmac.compare_digest(expected_hash.lower(), received_hash.lower())
        except Exception as e:
            logger.error(f"Error verifying IPN hash: {e}")
            return False
    
    @staticmethod
    def get_status_description(status_code: str) -> str:
        """Get human-readable status description"""
        statuses = {
            "E": "Ejecutado - Pago completado exitosamente",
            "R": "Rechazado - El cliente no confirmed el pago",
            "C": "Cancelado - El cliente cancelled el pago",
            "X": "Expirado - La request de pago expired"
        }
        return statuses.get(status_code, f"Estado desconocido: {status_code}")
    
    @staticmethod
    def get_error_description(error_code: str) -> str:
        """Get human-readable error description"""
        errors = {
            "E002": "Algo exited mal. Intenta nuevamente.",
            "E005": "Este number no is registrado en Yappy.",
            "E006": "Algo exited mal. Intenta nuevamente.",
            "E007": "El pedido ya ha sido registrado.",
            "E008": "Algo exited mal. Intenta nuevamente.",
            "E009": "ID de la orden mayor a 15 digits.",
            "E010": "El valor de los montos no es el correcto.",
            "E011": "Error en los campos de URL.",
            "E012": "Algo exited mal. Intenta nuevamente.",
            "E100": "Bad Request."
        }
        return errors.get(error_code, f"Error desconocido: {error_code}")


class YappyServiceFactory:
    """Factory to create YappyService instances for different stores"""
    
    @staticmethod
    async def create_for_platform(db) -> Optional[YappyService]:
        """Create YappyService for platform store (Unatienda)"""
        config = await db.app_config.find_one({"config_key": "platform_store_yappy"})
        if not config or not config.get("value", {}).get("merchant_id"):
            return None
        
        value = config["value"]
        return YappyService(
            merchant_id=value.get("merchant_id", ""),
            secret_key=value.get("secret_key", ""),
            url_domain=value.get("url_domain", ""),
            ambiente=value.get("ambiente", "pruebas")
        )
    
    @staticmethod
    async def create_for_vendor(db, vendor_id: str) -> Optional[YappyService]:
        """Create YappyService for a specific vendor"""
        config = await db.vendor_payment_config.find_one({"vendor_id": vendor_id})
        if not config or not config.get("yappy", {}).get("merchant_id"):
            return None
        
        yappy = config["yappy"]
        if not yappy.get("active"):
            return None
        
        return YappyService(
            merchant_id=yappy.get("merchant_id", ""),
            secret_key=yappy.get("secret_key", ""),
            url_domain=yappy.get("url_domain", ""),
            ambiente=yappy.get("ambiente", "pruebas")
        )
