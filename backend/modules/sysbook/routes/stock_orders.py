"""
Sysbook — Stock Orders (Textbook-scoped)
Shipments, Returns, Adjustments — filtered to sysbook inventory.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.auth import get_admin_user
from core.database import db

router = APIRouter(prefix="/stock-orders", tags=["Sysbook - Stock Orders"])

SHIPMENT_STATUSES = ["draft", "confirmed", "received"]
RETURN_STATUSES = ["registered", "inspected", "approved", "rejected"]
ADJUSTMENT_STATUSES = ["requested", "applied"]

VALID_TRANSITIONS = {
    "shipment": {"draft": "confirmed", "confirmed": "received"},
    "return": {"registered": "inspected", "inspected": ["approved", "rejected"]},
    "adjustment": {"requested": "applied"},
}

CATALOG_TYPE = "sysbook"


class StockOrderItem(BaseModel):
    book_id: str
    product_name: str
    expected_qty: int = 0
    received_qty: Optional[int] = None
    condition: Optional[str] = None


class CreateShipment(BaseModel):
    supplier: str
    expected_date: Optional[str] = None
    items: List[StockOrderItem]
    notes: Optional[str] = None


class CreateReturn(BaseModel):
    linked_order_id: str
    customer_name: Optional[str] = None
    return_reason: str
    items: List[StockOrderItem]
    notes: Optional[str] = None


class CreateAdjustment(BaseModel):
    adjustment_reason: str
    items: List[StockOrderItem]
    notes: Optional[str] = None


class TransitionRequest(BaseModel):
    items_update: Optional[List[dict]] = None
    notes: Optional[str] = None


def make_id():
    return f"so_{uuid.uuid4().hex[:10]}"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def apply_stock_changes(order: dict, admin: dict):
    order_type = order["type"]
    movements = []
    for item in order["items"]:
        book_id = item["book_id"]
        product = await db.store_products.find_one({"book_id": book_id}, {"_id": 0})
        if not product:
            continue
        old_qty = product.get("inventory_quantity", 0)
        if order_type == "shipment":
            qty_change = item.get("received_qty", item.get("expected_qty", 0))
        elif order_type == "return":
            qty_change = item.get("received_qty", item.get("expected_qty", 0)) if item.get("condition", "good") == "good" else 0
        elif order_type == "adjustment":
            qty_change = item.get("expected_qty", 0)
        else:
            continue
        new_qty = max(0, old_qty + qty_change)
        await db.store_products.update_one(
            {"book_id": book_id},
            {"$set": {"inventory_quantity": new_qty, "updated_at": now_iso()}}
        )
        movement = {
            "movement_id": uuid.uuid4().hex[:12],
            "book_id": book_id,
            "product_name": item.get("product_name", product.get("name", "")),
            "type": "addition" if qty_change > 0 else "removal",
            "quantity_change": qty_change,
            "old_quantity": old_qty,
            "new_quantity": new_qty,
            "reason": f"stock_order_{order_type}",
            "notes": f"Stock Order {order['order_id']}",
            "inventory_source": CATALOG_TYPE,
            "admin_id": admin.get("user_id"),
            "admin_name": admin.get("name", "Admin"),
            "stock_order_id": order["order_id"],
            "timestamp": now_iso(),
        }
        await db.inventory_movements.insert_one(movement)
        movement.pop("_id", None)
        movements.append({"book_id": book_id, "old_qty": old_qty, "new_qty": new_qty, "change": qty_change})
    return movements


@router.get("/summary/pending")
async def pending_summary(admin: dict = Depends(get_admin_user)):
    pipeline = [
        {"$match": {"inventory_source": CATALOG_TYPE, "status": {"$nin": ["received", "approved", "rejected", "applied"]}}},
        {"$group": {"_id": {"type": "$type", "status": "$status"}, "count": {"$sum": 1}}},
    ]
    result = await db.stock_orders.aggregate(pipeline).to_list(20)
    pending = {}
    for r in result:
        key = f"{r['_id']['type']}_{r['_id']['status']}"
        pending[key] = r["count"]
    return {"pending": pending, "total": sum(pending.values())}


@router.get("/search-orders")
async def search_linkable_orders(
    q: str = Query("", description="Search by order_id or student name"),
    admin: dict = Depends(get_admin_user),
):
    query = {}
    if q:
        query["$or"] = [
            {"order_id": {"$regex": q, "$options": "i"}},
            {"student_name": {"$regex": q, "$options": "i"}},
            {"user_email": {"$regex": q, "$options": "i"}},
        ]
    orders = await db.store_textbook_orders.find(
        query, {"_id": 0, "order_id": 1, "student_name": 1, "status": 1, "items": 1, "user_email": 1}
    ).sort("submitted_at", -1).limit(20).to_list(20)
    return {"orders": orders}


@router.get("")
async def list_stock_orders(
    order_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_admin_user),
):
    query = {"inventory_source": CATALOG_TYPE}
    if order_type:
        query["type"] = order_type
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"order_id": {"$regex": search, "$options": "i"}},
            {"supplier": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
        ]
    orders = await db.stock_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.stock_orders.count_documents(query)
    return {"orders": orders, "total": total}


@router.get("/{order_id}")
async def get_stock_order(order_id: str, admin: dict = Depends(get_admin_user)):
    order = await db.stock_orders.find_one({"order_id": order_id, "inventory_source": CATALOG_TYPE}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/shipment")
async def create_shipment(data: CreateShipment, admin: dict = Depends(get_admin_user)):
    order = {
        "order_id": make_id(),
        "type": "shipment",
        "inventory_source": CATALOG_TYPE,
        "status": "draft",
        "supplier": data.supplier,
        "expected_date": data.expected_date,
        "items": [i.dict() for i in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "history": [{"status": "draft", "at": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


@router.post("/return")
async def create_return(data: CreateReturn, admin: dict = Depends(get_admin_user)):
    order = {
        "order_id": make_id(),
        "type": "return",
        "inventory_source": CATALOG_TYPE,
        "status": "registered",
        "linked_order_id": data.linked_order_id,
        "customer_name": data.customer_name,
        "return_reason": data.return_reason,
        "items": [i.dict() for i in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "history": [{"status": "registered", "at": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


@router.post("/adjustment")
async def create_adjustment(data: CreateAdjustment, admin: dict = Depends(get_admin_user)):
    order = {
        "order_id": make_id(),
        "type": "adjustment",
        "inventory_source": CATALOG_TYPE,
        "status": "requested",
        "adjustment_reason": data.adjustment_reason,
        "items": [i.dict() for i in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "history": [{"status": "requested", "at": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


@router.post("/{order_id}/transition")
async def transition_order(order_id: str, body: TransitionRequest, admin: dict = Depends(get_admin_user)):
    order = await db.stock_orders.find_one({"order_id": order_id, "inventory_source": CATALOG_TYPE}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order_type = order["type"]
    current = order["status"]
    allowed = VALID_TRANSITIONS.get(order_type, {}).get(current)
    if not allowed:
        raise HTTPException(status_code=400, detail=f"No transition from '{current}'")

    next_status = allowed if isinstance(allowed, str) else allowed[0]

    update_set = {"status": next_status, "updated_at": now_iso()}
    push_history = {"status": next_status, "at": now_iso(), "by": admin.get("name", "Admin"), "notes": body.notes}

    if body.items_update:
        items = order.get("items", [])
        for upd in body.items_update:
            for item in items:
                if item["book_id"] == upd.get("book_id"):
                    if "received_qty" in upd:
                        item["received_qty"] = upd["received_qty"]
                    if "condition" in upd:
                        item["condition"] = upd["condition"]
        update_set["items"] = items

    await db.stock_orders.update_one(
        {"order_id": order_id},
        {"$set": update_set, "$push": {"history": push_history}}
    )

    stock_trigger = (
        (order_type == "shipment" and next_status == "received") or
        (order_type == "return" and next_status == "approved") or
        (order_type == "adjustment" and next_status == "applied")
    )
    stock_results = None
    if stock_trigger:
        final = await db.stock_orders.find_one({"order_id": order_id}, {"_id": 0})
        stock_results = await apply_stock_changes(final, admin)

    updated = await db.stock_orders.find_one({"order_id": order_id}, {"_id": 0})
    return {"order": updated, "stock_results": stock_results}


class BulkDeleteRequest(BaseModel):
    order_ids: List[str]


@router.delete("/clear/all")
async def clear_all_stock_orders(admin: dict = Depends(get_admin_user)):
    """Delete ALL sysbook stock orders. Use with caution."""
    result = await db.stock_orders.delete_many({"inventory_source": CATALOG_TYPE})
    return {"deleted_count": result.deleted_count}


@router.delete("/{order_id}")
async def delete_stock_order(order_id: str, admin: dict = Depends(get_admin_user)):
    """Delete a single stock order"""
    result = await db.stock_orders.delete_one({"order_id": order_id, "inventory_source": CATALOG_TYPE})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"deleted": True, "order_id": order_id}


@router.post("/bulk-delete")
async def bulk_delete_stock_orders(body: BulkDeleteRequest, admin: dict = Depends(get_admin_user)):
    """Delete multiple stock orders at once"""
    result = await db.stock_orders.delete_many({
        "order_id": {"$in": body.order_ids},
        "inventory_source": CATALOG_TYPE,
    })
    return {"deleted_count": result.deleted_count}
