"""
Wallet API Routes - ChipiWallet y transacciones
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.users.services.wallet_service import wallet_service
from modules.users.models.wallet_models import (
    Currency, PaymentMethod, PointsEarnType
)

router = APIRouter(prefix="/wallet", tags=["Wallet"])


# ============== PYDANTIC MODELS ==============

class DepositRequest(BaseModel):
    amount: float
    currency: str = "USD"
    payment_method: str
    reference: Optional[str] = None
    description: Optional[str] = None


class ChargeRequest(BaseModel):
    amount: float
    currency: str = "USD"
    description: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None


class TransferRequest(BaseModel):
    to_user_id: str
    amount: float
    currency: str = "USD"
    description: Optional[str] = None


class EarnPointsRequest(BaseModel):
    user_id: str
    points: int
    earn_type: str
    description: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None


class ConvertPointsRequest(BaseModel):
    points: int


class UpdateConfigRequest(BaseModel):
    points_per_dollar: Optional[float] = None
    conversion_rate: Optional[float] = None
    allow_points_to_usd: Optional[bool] = None
    allow_usd_to_points: Optional[bool] = None
    min_points_to_convert: Optional[int] = None
    points_per_dollar_spent: Optional[int] = None


# ============== WALLET ==============

@router.get("/me")
async def get_my_wallet(user=Depends(get_current_user)):
    """Obtener mi billetera"""
    wallet = await wallet_service.get_wallet(user["cliente_id"])
    
    if not wallet:
        # Crear billetera automáticamente
        wallet = await wallet_service.create_wallet(user["cliente_id"])
    
    return {
        "success": True,
        "wallet": wallet
    }


@router.get("/summary")
async def get_wallet_summary(user=Depends(get_current_user)):
    """Obtener resumen de mi billetera con estadísticas"""
    wallet = await wallet_service.get_or_create_wallet(user["cliente_id"])
    config = await wallet_service.get_config()
    
    # Obtener últimas transacciones
    transactions = await wallet_service.get_transactions(
        user["cliente_id"],
        limit=10
    )
    
    # Calcular valor de puntos en USD
    points_value = wallet.get("balance_points", 0) * config.get("conversion_rate", 0.008)
    
    return {
        "success": True,
        "summary": {
            "wallet_id": wallet["wallet_id"],
            "balance_usd": wallet.get("balance_usd", 0),
            "balance_points": wallet.get("balance_points", 0),
            "points_value_usd": round(points_value, 2),
            "total_balance": round(wallet.get("balance_usd", 0) + points_value, 2),
            "is_locked": wallet.get("is_locked", False),
            "stats": {
                "total_deposited": wallet.get("total_deposited", 0),
                "total_spent": wallet.get("total_spent", 0),
                "total_points_earned": wallet.get("total_points_earned", 0),
                "total_points_spent": wallet.get("total_points_spent", 0)
            },
            "recent_transactions": transactions[:5],
            "points_config": {
                "conversion_rate": config.get("conversion_rate"),
                "points_per_dollar_spent": config.get("points_per_dollar_spent"),
                "allow_conversion": config.get("allow_points_to_usd")
            }
        }
    }


@router.get("/user/{user_id}")
async def get_user_wallet(
    user_id: str,
    admin=Depends(get_admin_user)
):
    """Obtener billetera de un usuario (admin)"""
    wallet = await wallet_service.get_wallet(user_id)
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return {"success": True, "wallet": wallet}


# ============== TRANSACTIONS ==============

@router.get("/transactions")
async def get_my_transactions(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    transaction_type: Optional[str] = None,
    currency: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Obtener mis transacciones"""
    transactions = await wallet_service.get_transactions(
        user_id=user["cliente_id"],
        limit=limit,
        offset=offset,
        transaction_type=transaction_type,
        currency=currency
    )
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }


@router.get("/transactions/{transaction_id}")
async def get_transaction(
    transaction_id: str,
    user=Depends(get_current_user)
):
    """Obtener detalle de una transacción"""
    from core.database import db
    
    transaction = await db.chipi_transactions.find_one(
        {"transaction_id": transaction_id, "user_id": user["cliente_id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"success": True, "transaction": transaction}


# ============== DEPOSITS ==============

@router.post("/deposit")
async def deposit(
    data: DepositRequest,
    user=Depends(get_current_user)
):
    """Realizar un depósito en la billetera"""
    try:
        currency = Currency(data.currency)
        payment_method = PaymentMethod(data.payment_method)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid value: {e}")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    try:
        transaction = await wallet_service.deposit(
            user_id=user["cliente_id"],
            amount=data.amount,
            currency=currency,
            payment_method=payment_method,
            reference=data.reference,
            description=data.description
        )
        
        return {"success": True, "transaction": transaction}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin/deposit/{user_id}")
async def admin_deposit(
    user_id: str,
    data: DepositRequest,
    admin=Depends(get_admin_user)
):
    """Depositar en la billetera de un usuario (admin)"""
    try:
        currency = Currency(data.currency)
        payment_method = PaymentMethod(data.payment_method)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid value: {e}")
    
    try:
        transaction = await wallet_service.deposit(
            user_id=user_id,
            amount=data.amount,
            currency=currency,
            payment_method=payment_method,
            reference=data.reference,
            description=data.description
        )
        
        return {"success": True, "transaction": transaction}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== CHARGES ==============

@router.post("/charge")
async def charge(
    data: ChargeRequest,
    user=Depends(get_current_user)
):
    """Realizar un cobro/pago"""
    try:
        currency = Currency(data.currency)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid currency: {data.currency}")
    
    try:
        transaction = await wallet_service.charge(
            user_id=user["cliente_id"],
            amount=data.amount,
            currency=currency,
            description=data.description,
            reference_type=data.reference_type,
            reference_id=data.reference_id
        )
        
        return {"success": True, "transaction": transaction}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== TRANSFERS ==============

@router.post("/transfer")
async def transfer(
    data: TransferRequest,
    user=Depends(get_current_user)
):
    """Transferir fondos a otro usuario"""
    try:
        currency = Currency(data.currency)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid currency: {data.currency}")
    
    if data.to_user_id == user["cliente_id"]:
        raise HTTPException(status_code=400, detail="Cannot transfer to yourself")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    try:
        out_txn, in_txn = await wallet_service.transfer(
            from_user_id=user["cliente_id"],
            to_user_id=data.to_user_id,
            amount=data.amount,
            currency=currency,
            description=data.description
        )
        
        return {
            "success": True,
            "out_transaction": out_txn,
            "in_transaction": in_txn
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== CHIPIPOINTS ==============

@router.post("/points/earn")
async def earn_points(
    data: EarnPointsRequest,
    admin=Depends(get_admin_user)
):
    """Otorgar ChipiPoints a un usuario (admin)"""
    try:
        earn_type = PointsEarnType(data.earn_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid earn type: {data.earn_type}")
    
    if data.points <= 0:
        raise HTTPException(status_code=400, detail="Points must be positive")
    
    try:
        transaction = await wallet_service.earn_points(
            user_id=data.user_id,
            points=data.points,
            earn_type=earn_type,
            description=data.description,
            reference_type=data.reference_type,
            reference_id=data.reference_id
        )
        
        return {"success": True, "transaction": transaction}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/points/convert")
async def convert_points(
    data: ConvertPointsRequest,
    user=Depends(get_current_user)
):
    """Convertir ChipiPoints a USD"""
    if data.points <= 0:
        raise HTTPException(status_code=400, detail="Points must be positive")
    
    try:
        result = await wallet_service.convert_points_to_usd(
            user_id=user["cliente_id"],
            points=data.points
        )
        
        return {"success": True, "conversion": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/points/history")
async def get_points_history(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    user=Depends(get_current_user)
):
    """Obtener historial de ChipiPoints"""
    from core.database import db
    
    cursor = db.chipi_points_history.find(
        {"user_id": user["cliente_id"]},
        {"_id": 0}
    ).sort("created_at", -1).skip(offset).limit(limit)
    
    history = await cursor.to_list(length=limit)
    
    return {
        "success": True,
        "history": history,
        "count": len(history)
    }


# ============== CONFIGURATION ==============

@router.get("/config")
async def get_points_config():
    """Obtener configuración de ChipiPoints"""
    config = await wallet_service.get_config()
    return {"success": True, "config": config}


@router.put("/config")
async def update_points_config(
    data: UpdateConfigRequest,
    admin=Depends(get_admin_user)
):
    """Actualizar configuración de ChipiPoints (admin)"""
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")
    
    config = await wallet_service.update_config(updates)
    return {"success": True, "config": config}


@router.post("/config/initialize")
async def initialize_config(admin=Depends(get_admin_user)):
    """Inicializar configuración de ChipiPoints (admin)"""
    config = await wallet_service.initialize_config()
    rules_count = await wallet_service.initialize_earn_rules()
    
    return {
        "success": True,
        "config": config,
        "earn_rules_initialized": rules_count
    }


# ============== PENDING BALANCES ==============

@router.get("/pending")
async def get_pending_balances(user=Depends(get_current_user)):
    """Obtener saldos pendientes de mis dependientes"""
    balances = await wallet_service.get_pending_balances(user["cliente_id"])
    
    total = sum(b.get("amount", 0) for b in balances)
    
    return {
        "success": True,
        "pending_balances": balances,
        "total": total,
        "count": len(balances)
    }


@router.post("/pending/{pending_id}/pay")
async def pay_pending_balance(
    pending_id: str,
    payment_method: str = Query(...),
    user=Depends(get_current_user)
):
    """Pagar un saldo pendiente"""
    try:
        pm = PaymentMethod(payment_method)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid payment method: {payment_method}")
    
    try:
        transaction = await wallet_service.pay_pending_balance(
            pending_id=pending_id,
            payment_method=pm
        )
        
        return {"success": True, "transaction": transaction}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============== ADMIN ==============

@router.post("/admin/lock/{user_id}")
async def lock_wallet(
    user_id: str,
    reason: str = Query(...),
    admin=Depends(get_admin_user)
):
    """Bloquear billetera de un usuario (admin)"""
    from core.database import db
    
    result = await db.chipi_wallets.update_one(
        {"user_id": user_id},
        {"$set": {"is_locked": True, "lock_reason": reason}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return {"success": True, "message": "Wallet locked"}


@router.post("/admin/unlock/{user_id}")
async def unlock_wallet(
    user_id: str,
    admin=Depends(get_admin_user)
):
    """Desbloquear billetera de un usuario (admin)"""
    from core.database import db
    
    result = await db.chipi_wallets.update_one(
        {"user_id": user_id},
        {"$set": {"is_locked": False, "lock_reason": None}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    return {"success": True, "message": "Wallet unlocked"}
