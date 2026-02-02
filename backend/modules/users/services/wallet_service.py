"""
ChipiWallet Service - Gestión de billetera y ChipiPoints
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timezone

from core.base.service import BaseService
from core.database import db
from ..models.wallet_models import (
    TransactionType, TransactionStatus, Currency, PaymentMethod,
    PointsEarnType, get_default_points_config, get_default_earn_rules
)


class WalletService(BaseService):
    """Servicio para gestión de billeteras y transacciones"""
    
    MODULE_NAME = "users"
    
    # ============== INITIALIZATION ==============
    
    async def initialize_config(self) -> Dict:
        """Inicializar configuración de ChipiPoints"""
        existing = await db.chipi_wallet_config.find_one(
            {"config_id": "chipipoints_config"}
        )
        
        if not existing:
            config = get_default_points_config()
            config["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.chipi_wallet_config.insert_one(config)
            self.log_info("Initialized ChipiPoints config")
            config.pop("_id", None)
            return config
        
        existing.pop("_id", None)
        return existing
    
    async def initialize_earn_rules(self) -> int:
        """Inicializar reglas de ganancia de puntos"""
        defaults = get_default_earn_rules()
        created = 0
        
        for rule in defaults:
            existing = await db.chipi_points_rules.find_one(
                {"rule_id": rule["rule_id"]}
            )
            if not existing:
                rule["created_at"] = datetime.now(timezone.utc).isoformat()
                await db.chipi_points_rules.insert_one(rule)
                created += 1
        
        self.log_info(f"Initialized {created} earn rules")
        return created
    
    async def get_config(self) -> Dict:
        """Get configuración de ChipiPoints"""
        config = await db.chipi_wallet_config.find_one(
            {"config_id": "chipipoints_config"},
            {"_id": 0}
        )
        return config or get_default_points_config()
    
    async def update_config(self, updates: Dict) -> Dict:
        """Update configuración de ChipiPoints"""
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        result = await db.chipi_wallet_config.find_one_and_update(
            {"config_id": "chipipoints_config"},
            {"$set": updates},
            return_document=True,
            upsert=True
        )
        result.pop("_id", None)
        return result
    
    # ============== WALLET MANAGEMENT ==============
    
    async def get_wallet(self, user_id: str) -> Optional[Dict]:
        """Get billetera de un usuario"""
        return await db.chipi_wallets.find_one(
            {"user_id": user_id},
            {"_id": 0}
        )
    
    async def create_wallet(self, user_id: str, profile_id: str = None) -> Dict:
        """Create billetera para un usuario"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        # Verificar si ya existe
        existing = await self.get_wallet(user_id)
        if existing:
            return existing
        
        wallet = {
            "wallet_id": f"wallet_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "profile_id": profile_id,
            "balance_usd": 0.0,
            "balance_points": 0,
            "pending_points": 0,
            "total_deposited": 0.0,
            "total_spent": 0.0,
            "total_points_earned": 0,
            "total_points_spent": 0,
            "total_points_converted": 0,
            "is_active": True,
            "is_locked": False,
            "created_at": now,
            "updated_at": now
        }
        
        await db.chipi_wallets.insert_one(wallet)
        wallet.pop("_id", None)
        
        self.log_info(f"Created wallet for user {user_id}")
        return wallet
    
    async def get_or_create_wallet(self, user_id: str, profile_id: str = None) -> Dict:
        """Get o crear billetera"""
        wallet = await self.get_wallet(user_id)
        if not wallet:
            wallet = await self.create_wallet(user_id, profile_id)
        return wallet
    
    # ============== TRANSACTIONS ==============
    
    async def create_transaction(
        self,
        user_id: str,
        transaction_type: TransactionType,
        currency: Currency,
        amount: float,
        description: str = None,
        payment_method: PaymentMethod = None,
        reference_type: str = None,
        reference_id: str = None,
        related_user_id: str = None,
        metadata: Dict = None
    ) -> Dict:
        """Create una transacción"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        # Obtener billetera
        wallet = await self.get_or_create_wallet(user_id)
        
        # Calcular saldo antes
        if currency == Currency.USD:
            balance_before = wallet["balance_usd"]
        else:
            balance_before = wallet["balance_points"]
        
        # Determinar si es entrada o salida
        is_credit = transaction_type in [
            TransactionType.DEPOSIT, TransactionType.REFUND,
            TransactionType.TRANSFER_IN, TransactionType.REWARD,
            TransactionType.BONUS, TransactionType.POINTS_TO_USD
        ]
        
        # Calcular nuevo saldo
        if is_credit:
            balance_after = balance_before + amount
        else:
            balance_after = balance_before - amount
            
            # Verificar saldo suficiente
            if balance_after < 0:
                raise ValueError(f"Saldo insuficiente. Disponible: {balance_before}")
        
        transaction = {
            "transaction_id": f"txn_{uuid.uuid4().hex[:8]}",
            "wallet_id": wallet["wallet_id"],
            "user_id": user_id,
            "transaction_type": transaction_type.value,
            "status": TransactionStatus.PENDING.value,
            "currency": currency.value,
            "amount": amount,
            "balance_before": balance_before,
            "balance_after": balance_after,
            "payment_method": payment_method.value if payment_method else None,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "related_user_id": related_user_id,
            "description": description,
            "metadata": metadata or {},
            "created_at": now
        }
        
        await db.chipi_transactions.insert_one(transaction)
        transaction.pop("_id", None)
        
        return transaction
    
    async def complete_transaction(self, transaction_id: str) -> Dict:
        """Completar una transacción pendiente"""
        now = datetime.now(timezone.utc).isoformat()
        
        # Obtener transacción
        transaction = await db.chipi_transactions.find_one(
            {"transaction_id": transaction_id}
        )
        
        if not transaction:
            raise ValueError("Transacción no encontrada")
        
        if transaction["status"] != TransactionStatus.PENDING.value:
            raise ValueError(f"Transacción ya procesada: {transaction['status']}")
        
        # Actualizar saldo de billetera
        currency = transaction["currency"]
        balance_field = "balance_usd" if currency == Currency.USD.value else "balance_points"
        
        is_credit = transaction["transaction_type"] in [
            TransactionType.DEPOSIT.value, TransactionType.REFUND.value,
            TransactionType.TRANSFER_IN.value, TransactionType.REWARD.value,
            TransactionType.BONUS.value
        ]
        
        update_amount = transaction["amount"] if is_credit else -transaction["amount"]
        
        # Actualizar totales según tipo
        totals_update = {}
        if transaction["transaction_type"] == TransactionType.DEPOSIT.value:
            totals_update["total_deposited"] = transaction["amount"]
        elif transaction["transaction_type"] in [
            TransactionType.PURCHASE.value, TransactionType.PAYMENT.value
        ]:
            if currency == Currency.USD.value:
                totals_update["total_spent"] = transaction["amount"]
            else:
                totals_update["total_points_spent"] = int(transaction["amount"])
        
        await db.chipi_wallets.update_one(
            {"wallet_id": transaction["wallet_id"]},
            {
                "$inc": {
                    balance_field: update_amount,
                    **{f: v for f, v in totals_update.items()}
                },
                "$set": {"updated_at": now}
            }
        )
        
        # Marcar transacción como completada
        result = await db.chipi_transactions.find_one_and_update(
            {"transaction_id": transaction_id},
            {"$set": {
                "status": TransactionStatus.COMPLETED.value,
                "completed_at": now
            }},
            return_document=True
        )
        
        result.pop("_id", None)
        self.log_info(f"Completed transaction {transaction_id}")
        return result
    
    async def get_transactions(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
        transaction_type: str = None,
        currency: str = None
    ) -> List[Dict]:
        """Get transacciones de un usuario"""
        query = {"user_id": user_id}
        
        if transaction_type:
            query["transaction_type"] = transaction_type
        if currency:
            query["currency"] = currency
        
        cursor = db.chipi_transactions.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).skip(offset).limit(limit)
        
        return await cursor.to_list(length=limit)
    
    # ============== DEPOSITS & WITHDRAWALS ==============
    
    async def deposit(
        self,
        user_id: str,
        amount: float,
        currency: Currency,
        payment_method: PaymentMethod,
        reference: str = None,
        description: str = None
    ) -> Dict:
        """Realizar un depósito/recarga"""
        transaction = await self.create_transaction(
            user_id=user_id,
            transaction_type=TransactionType.DEPOSIT,
            currency=currency,
            amount=amount,
            payment_method=payment_method,
            description=description or f"Depósito de {amount} {currency.value}",
            metadata={"payment_reference": reference}
        )
        
        # Completar automáticamente
        return await self.complete_transaction(transaction["transaction_id"])
    
    async def charge(
        self,
        user_id: str,
        amount: float,
        currency: Currency,
        description: str,
        reference_type: str = None,
        reference_id: str = None
    ) -> Dict:
        """Realizar un cobro/compra"""
        wallet = await self.get_wallet(user_id)
        
        if not wallet:
            raise ValueError("Usuario sin billetera")
        
        # Verificar saldo
        balance = wallet["balance_usd"] if currency == Currency.USD else wallet["balance_points"]
        if balance < amount:
            raise ValueError(f"Saldo insuficiente. Disponible: {balance}, Requerido: {amount}")
        
        transaction = await self.create_transaction(
            user_id=user_id,
            transaction_type=TransactionType.PURCHASE,
            currency=currency,
            amount=amount,
            description=description,
            reference_type=reference_type,
            reference_id=reference_id
        )
        
        return await self.complete_transaction(transaction["transaction_id"])
    
    # ============== CHIPIPOINTS ==============
    
    async def earn_points(
        self,
        user_id: str,
        points: int,
        earn_type: PointsEarnType,
        description: str = None,
        reference_type: str = None,
        reference_id: str = None
    ) -> Dict:
        """Otorgar ChipiPoints a un usuario"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        wallet = await self.get_or_create_wallet(user_id)
        
        # Crear transacción
        transaction = await self.create_transaction(
            user_id=user_id,
            transaction_type=TransactionType.REWARD,
            currency=Currency.CHIPIPOINTS,
            amount=points,
            description=description or f"Ganaste {points} ChipiPoints",
            reference_type=reference_type,
            reference_id=reference_id,
            metadata={"earn_type": earn_type.value}
        )
        
        # Completar
        result = await self.complete_transaction(transaction["transaction_id"])
        
        # Actualizar totales de puntos
        await db.chipi_wallets.update_one(
            {"wallet_id": wallet["wallet_id"]},
            {"$inc": {"total_points_earned": points}}
        )
        
        # Registrar en historial de puntos
        history = {
            "history_id": f"ph_{uuid.uuid4().hex[:8]}",
            "wallet_id": wallet["wallet_id"],
            "user_id": user_id,
            "action": "earned",
            "earn_type": earn_type.value,
            "points": points,
            "balance_after": result["balance_after"],
            "description": {"es": description} if description else {},
            "transaction_id": result["transaction_id"],
            "reference_type": reference_type,
            "reference_id": reference_id,
            "created_at": now
        }
        await db.chipi_points_history.insert_one(history)
        
        self.log_info(f"User {user_id} earned {points} ChipiPoints ({earn_type.value})")
        return result
    
    async def convert_points_to_usd(self, user_id: str, points: int) -> Dict:
        """Convertir ChipiPoints a USD"""
        config = await self.get_config()
        
        if not config.get("allow_points_to_usd"):
            raise ValueError("Conversión de puntos a USD no permitida")
        
        if points < config.get("min_points_to_convert", 100):
            raise ValueError(f"Mínimo {config['min_points_to_convert']} puntos para convertir")
        
        wallet = await self.get_wallet(user_id)
        if not wallet or wallet["balance_points"] < points:
            raise ValueError("Puntos insuficientes")
        
        # Calcular USD
        usd_amount = points * config.get("conversion_rate", 0.008)
        
        # Descontar puntos
        await self.charge(
            user_id=user_id,
            amount=points,
            currency=Currency.CHIPIPOINTS,
            description=f"Conversión de {points} puntos a ${usd_amount:.2f}",
            reference_type="conversion"
        )
        
        # Agregar USD
        result = await self.deposit(
            user_id=user_id,
            amount=usd_amount,
            currency=Currency.USD,
            payment_method=PaymentMethod.CHIPIPOINTS,
            description=f"Conversión de {points} ChipiPoints"
        )
        
        # Registrar conversión
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        conversion = {
            "conversion_id": f"conv_{uuid.uuid4().hex[:8]}",
            "wallet_id": wallet["wallet_id"],
            "user_id": user_id,
            "from_currency": Currency.CHIPIPOINTS.value,
            "to_currency": Currency.USD.value,
            "from_amount": points,
            "to_amount": usd_amount,
            "conversion_rate": config.get("conversion_rate"),
            "status": TransactionStatus.COMPLETED.value,
            "created_at": now
        }
        await db.chipi_conversions.insert_one(conversion)
        
        # Actualizar total convertido
        await db.chipi_wallets.update_one(
            {"wallet_id": wallet["wallet_id"]},
            {"$inc": {"total_points_converted": points}}
        )
        
        self.log_info(f"User {user_id} converted {points} points to ${usd_amount:.2f}")
        return {
            "points_converted": points,
            "usd_received": usd_amount,
            "conversion_rate": config.get("conversion_rate"),
            "new_balance_points": wallet["balance_points"] - points,
            "new_balance_usd": wallet["balance_usd"] + usd_amount
        }
    
    # ============== TRANSFERS ==============
    
    async def transfer(
        self,
        from_user_id: str,
        to_user_id: str,
        amount: float,
        currency: Currency,
        description: str = None
    ) -> Tuple[Dict, Dict]:
        """Transferir fondos entre usuarios"""
        # Verificar billeteras
        from_wallet = await self.get_wallet(from_user_id)
        to_wallet = await self.get_or_create_wallet(to_user_id)
        
        if not from_wallet:
            raise ValueError("Billetera origen no encontrada")
        
        # Verificar saldo
        balance = from_wallet["balance_usd"] if currency == Currency.USD else from_wallet["balance_points"]
        if balance < amount:
            raise ValueError(f"Saldo insuficiente. Disponible: {balance}")
        
        # Transaction de salida
        out_txn = await self.create_transaction(
            user_id=from_user_id,
            transaction_type=TransactionType.TRANSFER_OUT,
            currency=currency,
            amount=amount,
            description=description or f"Transferencia enviada",
            related_user_id=to_user_id
        )
        
        # Transaction de entrada
        in_txn = await self.create_transaction(
            user_id=to_user_id,
            transaction_type=TransactionType.TRANSFER_IN,
            currency=currency,
            amount=amount,
            description=description or f"Transferencia recibida",
            related_user_id=from_user_id
        )
        
        # Completar ambas
        out_result = await self.complete_transaction(out_txn["transaction_id"])
        in_result = await self.complete_transaction(in_txn["transaction_id"])
        
        self.log_info(f"Transfer {amount} {currency.value} from {from_user_id} to {to_user_id}")
        return out_result, in_result
    
    # ============== PENDING BALANCES (NIÑOS) ==============
    
    async def create_pending_balance(
        self,
        user_id: str,
        guardian_user_id: str,
        amount: float,
        description: str,
        reference_type: str = None,
        reference_id: str = None
    ) -> Dict:
        """Create saldo pendiente para que pague el acudiente"""
        import uuid
        now = datetime.now(timezone.utc).isoformat()
        
        # Buscar pending existente
        existing = await db.chipi_pending_balances.find_one({
            "user_id": user_id,
            "guardian_user_id": guardian_user_id,
            "status": "pending"
        })
        
        item = {
            "description": description,
            "amount": amount,
            "date": now,
            "reference_type": reference_type,
            "reference_id": reference_id
        }
        
        if existing:
            # Agregar al existente
            await db.chipi_pending_balances.update_one(
                {"pending_id": existing["pending_id"]},
                {
                    "$inc": {"amount": amount},
                    "$push": {"items": item}
                }
            )
            existing["amount"] += amount
            existing["items"].append(item)
            existing.pop("_id", None)
            return existing
        
        # Crear nuevo
        pending = {
            "pending_id": f"pend_{uuid.uuid4().hex[:8]}",
            "user_id": user_id,
            "guardian_user_id": guardian_user_id,
            "amount": amount,
            "currency": Currency.USD.value,
            "items": [item],
            "status": "pending",
            "created_at": now
        }
        
        await db.chipi_pending_balances.insert_one(pending)
        pending.pop("_id", None)
        
        self.log_info(f"Created pending balance ${amount} for {user_id} -> guardian {guardian_user_id}")
        return pending
    
    async def get_pending_balances(self, guardian_user_id: str) -> List[Dict]:
        """Get saldos pendientes de un acudiente"""
        cursor = db.chipi_pending_balances.find(
            {"guardian_user_id": guardian_user_id, "status": "pending"},
            {"_id": 0}
        )
        return await cursor.to_list(length=50)
    
    async def pay_pending_balance(self, pending_id: str, payment_method: PaymentMethod) -> Dict:
        """Pagar un saldo pendiente"""
        now = datetime.now(timezone.utc).isoformat()
        
        pending = await db.chipi_pending_balances.find_one({"pending_id": pending_id})
        if not pending:
            raise ValueError("Saldo pendiente no encontrado")
        
        if pending["status"] != "pending":
            raise ValueError("Saldo ya pagado o cancelado")
        
        # Cobrar al guardian
        transaction = await self.charge(
            user_id=pending["guardian_user_id"],
            amount=pending["amount"],
            currency=Currency.USD,
            description=f"Pago de consumos pendientes",
            reference_type="pending_balance",
            reference_id=pending_id
        )
        
        # Marcar como pagado
        await db.chipi_pending_balances.update_one(
            {"pending_id": pending_id},
            {"$set": {
                "status": "paid",
                "paid_at": now,
                "paid_transaction_id": transaction["transaction_id"]
            }}
        )
        
        self.log_info(f"Paid pending balance {pending_id}")
        return transaction


# Singleton
wallet_service = WalletService()
