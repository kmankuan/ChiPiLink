"""
Store Module - Public Routes
Endpoints públicos que no requieren autenticación
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
    """Obtener productos para formulario público - sin autenticación"""
    products = await product_service.get_all_products(grado=grado)
    
    # Filtrar solo productos con stock > 0
    productos_disponibles = [
        p for p in products
        if p.cantidad_inventario > 0
    ]
    
    return productos_disponibles


@router.post("/order")
async def create_public_order(pedido: OrderPublicCreate):
    """Crear pedido desde formulario público - sin autenticación"""
    try:
        order = await order_service.create_public_order(pedido)
        return {
            "success": True,
            "pedido_id": order.pedido_id,
            "total": order.total,
            "mensaje": "Pedido creado exitosamente"
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/order/{pedido_id}")
async def get_public_order(pedido_id: str):
    """Obtener detalles de pedido para página de checkout (info limitada)"""
    pedido = await db.pedidos.find_one({"pedido_id": pedido_id}, {"_id": 0})
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    # Retornar info limitada para checkout
    return {
        "pedido_id": pedido.get("pedido_id"),
        "items": pedido.get("items", []),
        "subtotal": pedido.get("subtotal", pedido.get("total", 0)),
        "impuestos": pedido.get("impuestos", 0),
        "descuento": pedido.get("descuento", 0),
        "total": pedido.get("total", 0),
        "estado": pedido.get("estado"),
        "estado_pago": pedido.get("estado_pago", "pendiente"),
        "cliente_email": pedido.get("cliente_email"),
        "cliente_telefono": pedido.get("cliente_telefono"),
        "yappy_status": pedido.get("yappy_status"),
        "yappy_status_descripcion": pedido.get("yappy_status_descripcion")
    }


@router.get("/grades")
async def get_grades():
    """Obtener grados disponibles"""
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
    """Obtener materias disponibles"""
    return {
        "materias": [
            {"id": "matematicas", "nombre": "Matemáticas"},
            {"id": "espanol", "nombre": "Español"},
            {"id": "ciencias", "nombre": "Ciencias"},
            {"id": "sociales", "nombre": "Estudios Sociales"},
            {"id": "ingles", "nombre": "Inglés"},
            {"id": "arte", "nombre": "Arte"},
            {"id": "musica", "nombre": "Música"},
            {"id": "educacion_fisica", "nombre": "Educación Física"},
            {"id": "tecnologia", "nombre": "Tecnología"},
            {"id": "religion", "nombre": "Religión"},
        ]
    }
