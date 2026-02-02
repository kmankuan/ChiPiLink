"""
QR Code API Routes - Check-in y pagos via QR
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from pydantic import BaseModel

from core.auth import get_current_user, get_admin_user
from modules.users.services.qr_code_service import qr_code_service

router = APIRouter(prefix="/qr", tags=["QR Code"])


# ============== PYDANTIC MODELS ==============

class ScanQRRequest(BaseModel):
    qr_string: str


class ProcessQRActionRequest(BaseModel):
    qr_string: str
    action: str  # "checkin", "pay_usd", "pay_points"
    amount: Optional[float] = None
    description: Optional[str] = None


class CreatePaymentSessionRequest(BaseModel):
    amount: float
    currency: str  # "USD" or "CHIPIPOINTS"
    description: str
    expires_minutes: int = 5


# ============== USER QR CODE ==============

@router.get("/me")
async def get_my_qr(user=Depends(get_current_user)):
    """Get mi código QR"""
    qr = await qr_code_service.get_or_create_user_qr(
        user_id=user["user_id"]
    )
    
    return {
        "success": True,
        "qr_code": qr
    }


@router.post("/me/regenerate")
async def regenerate_my_qr(user=Depends(get_current_user)):
    """Regenerar mi código QR (invalida el anterior)"""
    qr = await qr_code_service.regenerate_user_qr(
        user_id=user["user_id"]
    )
    
    return {
        "success": True,
        "qr_code": qr,
        "message": {
            "es": "Código QR regenerado. El anterior ya no es válido.",
            "en": "QR code regenerated. The previous one is no longer valid.",
            "zh": "二维码已重新生成。旧的已失效。"
        }
    }


@router.get("/transactions")
async def get_my_qr_transactions(
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    user=Depends(get_current_user)
):
    """Get mis transacciones por QR"""
    transactions = await qr_code_service.get_qr_transactions(
        user_id=user["user_id"],
        action=action,
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }


# ============== QR SCANNING (STAFF/ADMIN) ==============

@router.post("/scan")
async def scan_qr(
    data: ScanQRRequest,
    admin=Depends(get_admin_user)
):
    """Escanear un código QR y obtener información del usuario"""
    result = await qr_code_service.scan_qr_code(data.qr_string)
    
    if not result.get("valid"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return {
        "success": True,
        "scan_result": result
    }


@router.post("/process")
async def process_qr_action(
    data: ProcessQRActionRequest,
    admin=Depends(get_admin_user)
):
    """Process una acción desde QR (check-in o pago)"""
    if data.action not in ["checkin", "pay_usd", "pay_points"]:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid action: {data.action}. Use 'checkin', 'pay_usd', or 'pay_points'"
        )
    
    if data.action in ["pay_usd", "pay_points"] and not data.amount:
        raise HTTPException(status_code=400, detail="Amount required for payment actions")
    
    if data.action == "pay_usd" and data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if data.action == "pay_points" and data.amount <= 0:
        raise HTTPException(status_code=400, detail="Points must be positive")
    
    result = await qr_code_service.process_qr_action(
        qr_string=data.qr_string,
        action=data.action,
        amount=data.amount,
        description=data.description,
        processed_by=admin["user_id"]
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("result", {}).get("error", "Action failed"))
    
    return result


@router.post("/checkin")
async def qr_checkin(
    data: ScanQRRequest,
    admin=Depends(get_admin_user)
):
    """Check-in rápido vía QR"""
    result = await qr_code_service.process_qr_action(
        qr_string=data.qr_string,
        action="checkin",
        processed_by=admin["user_id"]
    )
    
    if not result.get("success"):
        error_msg = result.get("result", {}).get("error", "Check-in failed")
        raise HTTPException(status_code=400, detail=error_msg)
    
    return result


@router.post("/pay")
async def qr_payment(
    data: ProcessQRActionRequest,
    admin=Depends(get_admin_user)
):
    """Process pago vía QR"""
    if data.action not in ["pay_usd", "pay_points"]:
        raise HTTPException(status_code=400, detail="Action must be 'pay_usd' or 'pay_points'")
    
    if not data.amount or data.amount <= 0:
        raise HTTPException(status_code=400, detail="Valid amount required")
    
    result = await qr_code_service.process_qr_action(
        qr_string=data.qr_string,
        action=data.action,
        amount=data.amount,
        description=data.description,
        processed_by=admin["user_id"]
    )
    
    if not result.get("success"):
        error_msg = result.get("result", {}).get("error", "Payment failed")
        raise HTTPException(status_code=400, detail=error_msg)
    
    return result


# ============== PAYMENT SESSIONS ==============

@router.post("/session/create")
async def create_payment_session(
    data: CreatePaymentSessionRequest,
    user=Depends(get_current_user)
):
    """Create sesión de pago (para montos grandes que requieren confirmación)"""
    if data.currency not in ["USD", "CHIPIPOINTS"]:
        raise HTTPException(status_code=400, detail="Currency must be 'USD' or 'CHIPIPOINTS'")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    session = await qr_code_service.create_payment_session(
        user_id=user["user_id"],
        amount=data.amount,
        currency=data.currency,
        description=data.description,
        expires_minutes=data.expires_minutes
    )
    
    return {
        "success": True,
        "session": session
    }


@router.post("/session/{session_id}/confirm")
async def confirm_payment_session(
    session_id: str,
    admin=Depends(get_admin_user)
):
    """Confirmar y procesar sesión de pago"""
    result = await qr_code_service.confirm_payment_session(
        session_id=session_id,
        processed_by=admin["user_id"]
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


# ============== ADMIN ==============

@router.get("/admin/transactions")
async def admin_get_transactions(
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    admin=Depends(get_admin_user)
):
    """Get all transactions QR (admin)"""
    transactions = await qr_code_service.get_qr_transactions(
        user_id=user_id,
        action=action,
        limit=limit,
        offset=offset
    )
    
    return {
        "success": True,
        "transactions": transactions,
        "count": len(transactions)
    }


@router.get("/admin/user/{user_id}")
async def admin_get_user_qr(
    user_id: str,
    admin=Depends(get_admin_user)
):
    """Get QR de un usuario específico (admin)"""
    qr = await qr_code_service.get_or_create_user_qr(user_id=user_id)
    
    return {
        "success": True,
        "qr_code": qr
    }
