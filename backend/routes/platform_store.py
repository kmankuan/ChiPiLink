"""
Platform Store (Unatienda) Routes
Exclusive store owned by the platform with basic Yappy integration
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
from uuid import uuid4
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.yappy_service import YappyService, YappyServiceFactory
from models.vendor_models import PlatformStoreConfig, YappyAmbiente

router = APIRouter(prefix="/platform-store", tags=["Platform Store"])

# These will be set by the main server
db = None
get_admin_user = None
get_current_user = None

def init_routes(_db, _get_admin_user, _get_current_user):
    global db, get_admin_user, get_current_user
    db = _db
    get_admin_user = _get_admin_user
    get_current_user = _get_current_user


# ============== PUBLIC ENDPOINTS ==============

@router.get("")
async def get_platform_store():
    """Get platform store public info"""
    config = await db.app_config.find_one({"config_key": "platform_store"}, {"_id": 0})
    if not config:
        return {
            "nombre": "Unatienda",
            "descripcion": "Tienda oficial de la plataforma",
            "logo_url": "",
            "activo": True
        }
    
    value = config.get("value", {})
    return {
        "nombre": value.get("nombre", "Unatienda"),
        "descripcion": value.get("descripcion", "Tienda oficial de la plataforma"),
        "logo_url": value.get("logo_url", ""),
        "activo": value.get("activo", True)
    }


@router.get("/products")
async def get_platform_products(
    categoria: Optional[str] = None,
    buscar: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Get platform store products (uses main libros collection)"""
    query = {"activo": {"$ne": False}}
    
    if categoria:
        query["categoria"] = categoria
    
    if buscar:
        query["$or"] = [
            {"nombre": {"$regex": buscar, "$options": "i"}},
            {"descripcion": {"$regex": buscar, "$options": "i"}}
        ]
    
    skip = (page - 1) * limit
    
    products = await db.libros.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.libros.count_documents(query)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }


@router.get("/yappy/cdn")
async def get_yappy_cdn_url():
    """Get Yappy CDN URL for frontend button"""
    config = await db.app_config.find_one({"config_key": "platform_store_yappy"})
    
    if not config or not config.get("value", {}).get("activo"):
        return {"cdn_url": None, "activo": False}
    
    ambiente = config["value"].get("ambiente", "pruebas")
    
    from services.yappy_service import YAPPY_URLS
    return {
        "cdn_url": YAPPY_URLS[ambiente]["cdn"],
        "activo": True,
        "ambiente": ambiente
    }


# ============== YAPPY PAYMENT ENDPOINTS ==============

@router.post("/yappy/validate")
async def validate_yappy_merchant():
    """Validate Yappy merchant for platform store"""
    yappy_service = await YappyServiceFactory.create_for_platform(db)
    
    if not yappy_service:
        raise HTTPException(status_code=400, detail="Yappy no está configurado para la tienda de la plataforma")
    
    result = await yappy_service.validate_merchant()
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Error validando comercio"))
    
    return result


@router.post("/yappy/create-order")
async def create_yappy_order(
    order_id: str,
    alias_yappy: str,
    subtotal: float,
    taxes: float = 0,
    discount: float = 0,
    total: float = None
):
    """Create Yappy payment order for platform store"""
    yappy_service = await YappyServiceFactory.create_for_platform(db)
    
    if not yappy_service:
        raise HTTPException(status_code=400, detail="Yappy no está configurado")
    
    # First validate merchant to get token
    validation = await yappy_service.validate_merchant()
    if not validation["success"]:
        raise HTTPException(status_code=400, detail=validation.get("error"))
    
    # Get IPN URL from Yappy config domain
    yappy_config = await db.app_config.find_one({"config_key": "platform_store_yappy"})
    base_url = yappy_config.get("value", {}).get("url_domain", "") if yappy_config else ""
    ipn_url = f"{base_url}/api/platform-store/yappy/ipn"
    
    # Create order
    result = await yappy_service.create_order(
        token=validation["token"],
        order_id=order_id,
        alias_yappy=alias_yappy,
        subtotal=subtotal,
        taxes=taxes,
        discount=discount,
        total=total,
        ipn_url=ipn_url
    )
    
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


@router.get("/yappy/ipn")
async def yappy_ipn_callback(
    orderId: str,
    Hash: str,
    status: str,
    domain: str
):
    """
    IPN (Instant Payment Notification) callback from Yappy
    Status: E=Ejecutado, R=Rechazado, C=Cancelado, X=Expirado
    """
    yappy_service = await YappyServiceFactory.create_for_platform(db)
    
    if not yappy_service:
        return {"status": "error", "message": "Yappy not configured"}
    
    # Verify hash
    if not yappy_service.verify_ipn_hash(orderId, status, Hash):
        return {"status": "error", "message": "Invalid hash"}
    
    # Update order status in database
    status_map = {
        "E": "pagado",
        "R": "pago_rechazado",
        "C": "pago_cancelado",
        "X": "pago_expirado"
    }
    
    new_status = status_map.get(status, "pendiente")
    
    await db.pedidos.update_one(
        {"pedido_id": orderId},
        {
            "$set": {
                "estado_pago": new_status,
                "yappy_status": status,
                "yappy_status_descripcion": YappyService.get_status_description(status),
                "fecha_actualizacion_pago": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"status": "ok", "order_id": orderId, "payment_status": new_status}


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/config")
async def get_platform_store_config(admin: dict = Depends(lambda: get_admin_user)):
    """Get platform store configuration (admin only)"""
    # Get store config
    store_config = await db.app_config.find_one({"config_key": "platform_store"}, {"_id": 0})
    
    # Get Yappy config
    yappy_config = await db.app_config.find_one({"config_key": "platform_store_yappy"}, {"_id": 0})
    
    return {
        "store": store_config.get("value", {}) if store_config else {
            "nombre": "Unatienda",
            "descripcion": "Tienda oficial de la plataforma",
            "logo_url": "",
            "activo": True
        },
        "yappy": yappy_config.get("value", {}) if yappy_config else {
            "merchant_id": "",
            "secret_key": "",
            "url_domain": "",
            "activo": False,
            "ambiente": "pruebas"
        }
    }


@router.put("/admin/config")
async def update_platform_store_config(
    config: dict,
    admin: dict = Depends(lambda: get_admin_user)
):
    """Update platform store configuration (admin only)"""
    # Update store config
    if "store" in config:
        await db.app_config.update_one(
            {"config_key": "platform_store"},
            {
                "$set": {
                    "config_key": "platform_store",
                    "value": config["store"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
    
    # Update Yappy config
    if "yappy" in config:
        await db.app_config.update_one(
            {"config_key": "platform_store_yappy"},
            {
                "$set": {
                    "config_key": "platform_store_yappy",
                    "value": config["yappy"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            },
            upsert=True
        )
    
    return {"success": True}


@router.post("/admin/yappy/test")
async def test_platform_yappy(admin: dict = Depends(lambda: get_admin_user)):
    """Test Yappy connection for platform store (admin only)"""
    yappy_service = await YappyServiceFactory.create_for_platform(db)
    
    if not yappy_service:
        raise HTTPException(status_code=400, detail="Yappy no está configurado. Configure las credenciales primero.")
    
    result = await yappy_service.validate_merchant()
    
    if result["success"]:
        return {
            "success": True,
            "message": "Conexión con Yappy exitosa",
            "ambiente": yappy_service.ambiente
        }
    
    raise HTTPException(status_code=400, detail=f"Error de conexión: {result.get('error')}")
