"""
Store Module - Public Routes
Endpoints publics that does not requieren authentication
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from core.database import db
from ..models import OrderPublicCreate, Order
from ..services import order_service, product_service

router = APIRouter(prefix="/public", tags=["Store - Public"])


@router.get("/products")
async def get_public_products(grado: Optional[str] = None):
    """Get productos para formulario public - sin authentication"""
    products = await product_service.get_all_products(grado=grado)
    
    # Filter solo productos con stock > 0
    productos_disponibles = [
        p for p in products
        if p.cantidad_inventario > 0
    ]
    
    return productos_disponibles


@router.post("/order")
async def create_public_order(pedido: OrderPublicCreate):
    """Create pedido desde formulario public - sin authentication"""
    try:
        order = await order_service.create_public_order(pedido)
        return {
            "success": True,
            "pedido_id": order.pedido_id,
            "total": order.total,
            "mensaje": "Pedido creado successfully"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/order/{order_id}")
async def get_public_order(order_id: str):
    """Get order details for checkout page (limited info)"""
    # Try new collection first, then legacy
    order = await db.store_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        # Fallback to textbook_orders if not in store_orders
        order = await db.textbook_orders.find_one({"order_id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Return limited info for checkout
    return {
        "order_id": order.get("order_id"),
        "items": order.get("items", []),
        "subtotal": order.get("subtotal", order.get("total_amount", 0)),
        "tax": order.get("tax", 0),
        "discount": order.get("discount", 0),
        "total": order.get("total", order.get("total_amount", 0)),
        "status": order.get("status"),
        "payment_status": order.get("payment_status", "pending"),
        "customer_email": order.get("customer_email", order.get("user_email")),
        "customer_phone": order.get("customer_phone", order.get("user_phone")),
        "yappy_status": order.get("yappy_status"),
        "yappy_status_description": order.get("yappy_status_description")
    }


@router.get("/grades")
async def get_grades():
    """Get grados disponibles"""
    return {
        "grados": [
            {"id": "preescolar", "nombre": "Preescolar"},
            {"id": "1", "nombre": "1er Grado"},
            {"id": "2", "nombre": "2do Grado"},
            {"id": "3", "nombre": "3er Grado"},
            {"id": "4", "nombre": "4to Grado"},
            {"id": "5", "nombre": "5to Grado"},
            {"id": "6", "nombre": "6to Grado"},
            {"id": "7", "nombre": "7mo Grado"},
            {"id": "8", "nombre": "8vo Grado"},
            {"id": "9", "nombre": "9no Grado"},
            {"id": "10", "nombre": "10mo Grado"},
            {"id": "11", "nombre": "11vo Grado"},
            {"id": "12", "nombre": "12vo Grado"},
        ]
    }


@router.get("/subjects")
async def get_subjects():
    """Get materias disponibles"""
    return {
        "materias": [
            {"id": "matematicas", "nombre": "Mathematics"},
            {"id": "espanol", "nombre": "Espyearl"},
            {"id": "ciencias", "nombre": "Ciencias"},
            {"id": "sociales", "nombre": "Estudios Sociales"},
            {"id": "ingles", "nombre": "English"},
            {"id": "arte", "nombre": "Arte"},
            {"id": "musica", "nombre": "Música"},
            {"id": "educacion_fisica", "nombre": "Educación Física"},
            {"id": "tecnologia", "nombre": "Tecnología"},
            {"id": "religion", "nombre": "Religión"},
        ]
    }
