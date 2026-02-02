"""
QR Code Service - Management of códigos QR para check-in y pagos
"""
from typing import Dict, Optional, Any
from datetime import datetime, timezone, timedelta
import uuid
import hashlib
import json
import base64

from core.database import db


class QRCodeService:
    """Service for management of códigos QR"""
    
    def __init__(self):
        self.collection_qr_codes = "chipi_qr_codes"
        self.collection_qr_transactions = "chipi_qr_transactions"
        self.collection_qr_sessions = "chipi_qr_sessions"
    
    def log_info(self, message: str):
        print(f"[QRCodeService] {message}")
    
    # ============== QR CODE GENERATION ==============
    
    def generate_user_qr_data(self, user_id: str, profile_id: str = None) -> Dict:
        """Generar datos para QR code de usuario"""
        # Crear un código único basado en user_id y timestamp
        timestamp = datetime.now(timezone.utc).isoformat()
        raw_data = f"{user_id}:{profile_id or ''}:{timestamp}"
        
        # Generar hash único
        qr_hash = hashlib.sha256(raw_data.encode()).hexdigest()[:16]
        
        qr_data = {
            "type": "chipi_user",
            "version": "1.0",
            "user_id": user_id,
            "profile_id": profile_id,
            "qr_id": f"qr_{qr_hash}",
            "generated_at": timestamp
        }
        
        return qr_data
    
    async def get_or_create_user_qr(self, user_id: str, profile_id: str = None) -> Dict:
        """Get o crear QR code para un usuario"""
        # Buscar QR existente
        existing = await db[self.collection_qr_codes].find_one(
            {"user_id": user_id, "is_active": True},
            {"_id": 0}
        )
        
        if existing:
            return existing
        
        # Crear nuevo QR
        qr_data = self.generate_user_qr_data(user_id, profile_id)
        
        qr_record = {
            "qr_id": qr_data["qr_id"],
            "user_id": user_id,
            "profile_id": profile_id,
            "qr_data": qr_data,
            "qr_string": self._encode_qr_data(qr_data),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used_at": None,
            "use_count": 0
        }
        
        await db[self.collection_qr_codes].insert_one(qr_record)
        qr_record.pop("_id", None)
        
        self.log_info(f"Created QR code for user {user_id}")
        return qr_record
    
    def _encode_qr_data(self, qr_data: Dict) -> str:
        """Codificar datos del QR a string"""
        json_str = json.dumps(qr_data, separators=(',', ':'))
        return base64.b64encode(json_str.encode()).decode()
    
    def _decode_qr_data(self, qr_string: str) -> Optional[Dict]:
        """Decodificar string de QR a datos"""
        try:
            json_str = base64.b64decode(qr_string.encode()).decode()
            return json.loads(json_str)
        except Exception as e:
            self.log_info(f"Error decoding QR: {e}")
            return None
    
    async def regenerate_user_qr(self, user_id: str, profile_id: str = None) -> Dict:
        """Regenerar QR code de un usuario (invalida el anterior)"""
        # Desactivar QR anterior
        await db[self.collection_qr_codes].update_many(
            {"user_id": user_id},
            {"$set": {"is_active": False}}
        )
        
        # Crear nuevo QR
        qr_data = self.generate_user_qr_data(user_id, profile_id)
        
        qr_record = {
            "qr_id": qr_data["qr_id"],
            "user_id": user_id,
            "profile_id": profile_id,
            "qr_data": qr_data,
            "qr_string": self._encode_qr_data(qr_data),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used_at": None,
            "use_count": 0
        }
        
        await db[self.collection_qr_codes].insert_one(qr_record)
        qr_record.pop("_id", None)
        
        self.log_info(f"Regenerated QR code for user {user_id}")
        return qr_record
    
    # ============== QR CODE SCANNING ==============
    
    async def scan_qr_code(self, qr_string: str) -> Dict:
        """Escanear y validar un QR code"""
        # Intentar decodificar
        qr_data = self._decode_qr_data(qr_string)
        
        if not qr_data:
            return {"valid": False, "error": "Invalid QR code format"}
        
        # Verificar tipo
        if qr_data.get("type") != "chipi_user":
            return {"valid": False, "error": "Unknown QR type"}
        
        # Buscar en base de datos
        qr_record = await db[self.collection_qr_codes].find_one(
            {"qr_id": qr_data.get("qr_id"), "is_active": True},
            {"_id": 0}
        )
        
        if not qr_record:
            return {"valid": False, "error": "QR code not found or inactive"}
        
        # Obtener información of the user
        user_id = qr_record["user_id"]
        
        # Obtener wallet
        wallet = await db.chipi_wallets.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        # Obtener perfil
        profile = await db.chipi_user_profiles.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
        
        # Obtener membresía activa
        now = datetime.now(timezone.utc).isoformat()
        membership = await db.chipi_user_memberships.find_one(
            {
                "user_id": user_id,
                "status": "active",
                "end_date": {"$gt": now}
            },
            {"_id": 0}
        )
        
        # Actualizar uso
        await db[self.collection_qr_codes].update_one(
            {"qr_id": qr_data["qr_id"]},
            {
                "$set": {"last_used_at": now},
                "$inc": {"use_count": 1}
            }
        )
        
        return {
            "valid": True,
            "qr_id": qr_record["qr_id"],
            "user_id": user_id,
            "profile": profile,
            "wallet": {
                "wallet_id": wallet.get("wallet_id") if wallet else None,
                "balance_usd": wallet.get("balance_usd", 0) if wallet else 0,
                "balance_points": wallet.get("balance_points", 0) if wallet else 0,
                "is_locked": wallet.get("is_locked", False) if wallet else False
            } if wallet else None,
            "membership": {
                "membership_id": membership.get("membership_id") if membership else None,
                "plan_id": membership.get("plan_id") if membership else None,
                "visits_remaining": membership.get("visits_remaining") if membership else None,
                "end_date": membership.get("end_date") if membership else None
            } if membership else None,
            "available_actions": self._get_available_actions(wallet, membership)
        }
    
    def _get_available_actions(self, wallet: Dict, membership: Dict) -> list:
        """Determinar acciones disponibles basadas en wallet y membresía"""
        actions = []
        
        if membership:
            actions.append({
                "action": "checkin",
                "label": {"es": "Check-in", "en": "Check-in", "zh": "签到"},
                "enabled": True
            })
        
        if wallet:
            if wallet.get("balance_usd", 0) > 0:
                actions.append({
                    "action": "pay_usd",
                    "label": {"es": "Pagar con USD", "en": "Pay with USD", "zh": "用美元支付"},
                    "enabled": not wallet.get("is_locked", False),
                    "max_amount": wallet.get("balance_usd", 0)
                })
            
            if wallet.get("balance_points", 0) > 0:
                actions.append({
                    "action": "pay_points",
                    "label": {"es": "Pagar con ChipiPoints", "en": "Pay with ChipiPoints", "zh": "用积分支付"},
                    "enabled": not wallet.get("is_locked", False),
                    "max_amount": wallet.get("balance_points", 0)
                })
        
        return actions
    
    # ============== QR ACTIONS ==============
    
    async def process_qr_action(
        self,
        qr_string: str,
        action: str,
        amount: float = None,
        description: str = None,
        processed_by: str = None,
        metadata: Dict = None
    ) -> Dict:
        """Process una acción desde QR code"""
        # Validate QR
        scan_result = await self.scan_qr_code(qr_string)
        
        if not scan_result.get("valid"):
            return {"success": False, "error": scan_result.get("error")}
        
        user_id = scan_result["user_id"]
        
        # Registrar transacción
        now = datetime.now(timezone.utc).isoformat()
        
        qr_transaction = {
            "qr_transaction_id": f"qrtxn_{uuid.uuid4().hex[:12]}",
            "qr_id": scan_result["qr_id"],
            "user_id": user_id,
            "action": action,
            "amount": amount,
            "description": description,
            "processed_by": processed_by,
            "metadata": metadata or {},
            "status": "pending",
            "created_at": now
        }
        
        # Procesar según acción
        if action == "checkin":
            result = await self._process_checkin(user_id, processed_by)
        elif action == "pay_usd":
            result = await self._process_payment_usd(user_id, amount, description, processed_by)
        elif action == "pay_points":
            result = await self._process_payment_points(user_id, int(amount), description, processed_by)
        else:
            result = {"success": False, "error": f"Unknown action: {action}"}
        
        # Actualizar transacción
        qr_transaction["status"] = "completed" if result.get("success") else "failed"
        qr_transaction["result"] = result
        qr_transaction["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db[self.collection_qr_transactions].insert_one(qr_transaction)
        qr_transaction.pop("_id", None)
        
        return {
            "success": result.get("success", False),
            "qr_transaction_id": qr_transaction["qr_transaction_id"],
            "action": action,
            "result": result,
            "user_info": {
                "user_id": user_id,
                "profile": scan_result.get("profile"),
                "wallet": scan_result.get("wallet")
            }
        }
    
    async def _process_checkin(self, user_id: str, processed_by: str = None) -> Dict:
        """Process check-in desde QR"""
        from modules.users.services.membership_service import membership_service
        
        try:
            result = await membership_service.check_in(
                user_id=user_id,
                check_in_method="qr",
                registered_by=processed_by
            )
            
            if "error" in result:
                return {"success": False, "error": result["error"]}
            
            return {
                "success": True,
                "visit": result,
                "message": {
                    "es": "Check-in exitoso",
                    "en": "Check-in successful",
                    "zh": "签到成功"
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _process_payment_usd(
        self,
        user_id: str,
        amount: float,
        description: str = None,
        processed_by: str = None
    ) -> Dict:
        """Process pago en USD desde QR"""
        from modules.users.services.wallet_service import wallet_service
        from modules.users.models.wallet_models import Currency, TransactionType
        
        if not amount or amount <= 0:
            return {"success": False, "error": "Invalid amount"}
        
        try:
            wallet = await wallet_service.get_wallet(user_id)
            
            if not wallet:
                return {"success": False, "error": "Wallet not found"}
            
            if wallet.get("is_locked"):
                return {"success": False, "error": "Wallet is locked"}
            
            if wallet.get("balance_usd", 0) < amount:
                return {
                    "success": False,
                    "error": "Insufficient USD balance",
                    "available": wallet.get("balance_usd", 0),
                    "required": amount
                }
            
            # Crear transacción usando la firma correcta
            transaction = await wallet_service.create_transaction(
                user_id=user_id,
                transaction_type=TransactionType.PURCHASE,
                currency=Currency.USD,
                amount=amount,
                description=description or f"Pago QR: ${amount:.2f}",
                reference_type="qr_payment",
                metadata={"processed_by": processed_by}
            )
            
            # Completar transacción
            completed = await wallet_service.complete_transaction(transaction["transaction_id"])
            
            return {
                "success": True,
                "transaction": completed,
                "new_balance": completed["balance_after"],
                "message": {
                    "es": f"Pago de ${amount:.2f} procesado",
                    "en": f"Payment of ${amount:.2f} processed",
                    "zh": f"支付 ${amount:.2f} 已处理"
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _process_payment_points(
        self,
        user_id: str,
        points: int,
        description: str = None,
        processed_by: str = None
    ) -> Dict:
        """Process pago en ChipiPoints desde QR"""
        from modules.users.services.wallet_service import wallet_service
        from modules.users.models.wallet_models import Currency, TransactionType
        
        if not points or points <= 0:
            return {"success": False, "error": "Invalid points amount"}
        
        try:
            wallet = await wallet_service.get_wallet(user_id)
            
            if not wallet:
                return {"success": False, "error": "Wallet not found"}
            
            if wallet.get("is_locked"):
                return {"success": False, "error": "Wallet is locked"}
            
            if wallet.get("balance_points", 0) < points:
                return {
                    "success": False,
                    "error": "Insufficient ChipiPoints balance",
                    "available": wallet.get("balance_points", 0),
                    "required": points
                }
            
            # Crear transacción usando la firma correcta
            transaction = await wallet_service.create_transaction(
                user_id=user_id,
                transaction_type=TransactionType.PURCHASE,
                currency=Currency.CHIPIPOINTS,
                amount=points,
                description=description or f"Pago QR: {points} ChipiPoints",
                reference_type="qr_payment",
                metadata={"processed_by": processed_by}
            )
            
            # Completar transacción
            completed = await wallet_service.complete_transaction(transaction["transaction_id"])
            
            return {
                "success": True,
                "transaction": completed,
                "new_balance": completed["balance_after"],
                "message": {
                    "es": f"Pago de {points} ChipiPoints procesado",
                    "en": f"Payment of {points} ChipiPoints processed",
                    "zh": f"积分支付 {points} 已处理"
                }
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ============== QR TRANSACTION HISTORY ==============
    
    async def get_qr_transactions(
        self,
        user_id: str = None,
        qr_id: str = None,
        action: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> list:
        """Get historial de transacciones QR"""
        query = {}
        
        if user_id:
            query["user_id"] = user_id
        if qr_id:
            query["qr_id"] = qr_id
        if action:
            query["action"] = action
        
        cursor = db[self.collection_qr_transactions].find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # ============== PAYMENT SESSION (for larger amounts) ==============
    
    async def create_payment_session(
        self,
        user_id: str,
        amount: float,
        currency: str,
        description: str,
        expires_minutes: int = 5
    ) -> Dict:
        """Create sesión de pago para montos grandes (requiere confirmación)"""
        now = datetime.now(timezone.utc)
        expires_at = (now + timedelta(minutes=expires_minutes)).isoformat()
        
        session = {
            "session_id": f"pay_{uuid.uuid4().hex[:12]}",
            "user_id": user_id,
            "amount": amount,
            "currency": currency,
            "description": description,
            "status": "pending",
            "created_at": now.isoformat(),
            "expires_at": expires_at
        }
        
        await db[self.collection_qr_sessions].insert_one(session)
        session.pop("_id", None)
        
        return session
    
    async def confirm_payment_session(
        self,
        session_id: str,
        confirmation_code: str = None,
        processed_by: str = None
    ) -> Dict:
        """Confirmar y procesar sesión de pago"""
        session = await db[self.collection_qr_sessions].find_one(
            {"session_id": session_id},
            {"_id": 0}
        )
        
        if not session:
            return {"success": False, "error": "Session not found"}
        
        if session["status"] != "pending":
            return {"success": False, "error": f"Session already {session['status']}"}
        
        now = datetime.now(timezone.utc).isoformat()
        if session["expires_at"] < now:
            await db[self.collection_qr_sessions].update_one(
                {"session_id": session_id},
                {"$set": {"status": "expired"}}
            )
            return {"success": False, "error": "Session expired"}
        
        # Procesar pago
        if session["currency"] == "USD":
            result = await self._process_payment_usd(
                session["user_id"],
                session["amount"],
                session["description"],
                processed_by
            )
        else:
            result = await self._process_payment_points(
                session["user_id"],
                int(session["amount"]),
                session["description"],
                processed_by
            )
        
        # Actualizar sesión
        await db[self.collection_qr_sessions].update_one(
            {"session_id": session_id},
            {
                "$set": {
                    "status": "completed" if result.get("success") else "failed",
                    "completed_at": now,
                    "result": result
                }
            }
        )
        
        return result


# Singleton
qr_code_service = QRCodeService()
