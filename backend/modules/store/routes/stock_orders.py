"""
Stock Orders — Workflow-based inventory management
3 workflow types:
  1. Shipment:   draft → confirmed → received (stock updates here)
  2. Return:     registered → inspected → approved|rejected (linked to existing orders)
  3. Adjustment: requested → applied (corrections, write-offs)

Stock only changes at specific transitions, guaranteeing audit trail and process integrity.
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

from core.auth import get_admin_user
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stock-orders", tags=["Store - Stock Orders"])

# ============== MODELS ==============

SHIPMENT_STATUSES = ["draft", "confirmed", "received"]
RETURN_STATUSES = ["registered", "inspected", "approved", "rejected"]
ADJUSTMENT_STATUSES = ["requested", "applied"]

VALID_TRANSITIONS = {
    "shipment": {"draft": "confirmed", "confirmed": "received"},
    "return": {"registered": "inspected", "inspected": ["approved", "rejected"]},
    "adjustment": {"requested": "applied"},
}


class StockOrderItem(BaseModel):
    book_id: str
    product_name: str
    expected_qty: int = 0
    received_qty: Optional[int] = None
    condition: Optional[str] = None  # good, damaged, defective (for returns)


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
    items_update: Optional[List[dict]] = None  # [{book_id, received_qty, condition}]
    notes: Optional[str] = None


# ============== HELPERS ==============

def make_id():
    return f"so_{uuid.uuid4().hex[:10]}"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


async def apply_stock_changes(order: dict, admin: dict):
    """Apply stock changes based on order type and items."""
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
            condition = item.get("condition", "good")
            qty_change = item.get("received_qty", item.get("expected_qty", 0)) if condition == "good" else 0
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
            "product_name": item.get("product_name", product.get("name", "Unknown")),
            "type": "addition" if qty_change > 0 else "removal",
            "quantity_change": qty_change,
            "old_quantity": old_qty,
            "new_quantity": new_qty,
            "reason": f"stock_order_{order_type}",
            "notes": f"Stock Order {order['order_id']}",
            "admin_id": admin.get("user_id"),
            "admin_name": admin.get("name", "Admin"),
            "stock_order_id": order["order_id"],
            "timestamp": now_iso(),
        }
        await db.inventory_movements.insert_one(movement)
        movements.append({"book_id": book_id, "old_qty": old_qty, "new_qty": new_qty, "change": qty_change})

    return movements


# ============== DASHBOARD SUMMARY (must be before /{order_id}) ==============

@router.get("/summary/pending")
async def get_pending_summary(admin: dict = Depends(get_admin_user)):
    """Get counts of orders requiring action."""
    pipeline = [
        {"$match": {"status": {"$nin": ["received", "approved", "rejected", "applied"]}}},
        {"$group": {"_id": {"type": "$type", "status": "$status"}, "count": {"$sum": 1}}},
    ]
    result = await db.stock_orders.aggregate(pipeline).to_list(20)
    pending = {}
    for r in result:
        key = f"{r['_id']['type']}_{r['_id']['status']}"
        pending[key] = r["count"]
    total = sum(pending.values())
    return {"pending": pending, "total": total}


# ============== SEARCH ORDERS for return linking (must be before /{order_id}) ==============

@router.get("/search-orders")
async def search_linkable_orders(
    q: str = Query("", description="Search by order_id or student name"),
    admin: dict = Depends(get_admin_user),
):
    """Search existing textbook orders to link with a return."""
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


# ============== LIST / GET ==============

@router.get("")
async def list_stock_orders(
    order_type: Optional[str] = Query(None, description="shipment|return|adjustment"),
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_admin_user),
):
    """List stock orders with filters."""
    query = {}
    if order_type:
        query["type"] = order_type
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"order_id": {"$regex": search, "$options": "i"}},
            {"supplier": {"$regex": search, "$options": "i"}},
            {"customer_name": {"$regex": search, "$options": "i"}},
            {"linked_order_id": {"$regex": search, "$options": "i"}},
        ]

    total = await db.stock_orders.count_documents(query)
    orders = await db.stock_orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    # Count by status for quick filters
    counts_pipeline = [
        {"$group": {"_id": {"type": "$type", "status": "$status"}, "count": {"$sum": 1}}}
    ]
    counts_raw = await db.stock_orders.aggregate(counts_pipeline).to_list(50)
    counts = {}
    for c in counts_raw:
        key = f"{c['_id']['type']}_{c['_id']['status']}"
        counts[key] = c["count"]

    return {"orders": orders, "total": total, "skip": skip, "limit": limit, "counts": counts}


@router.get("/{order_id}")
async def get_stock_order(order_id: str, admin: dict = Depends(get_admin_user)):
    """Get a single stock order with full detail."""
    order = await db.stock_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Stock order not found")
    return order


# ============== CREATE ==============

@router.post("/shipment")
async def create_shipment(data: CreateShipment, admin: dict = Depends(get_admin_user)):
    """Create a new incoming shipment order (status: draft)."""
    order = {
        "order_id": make_id(),
        "type": "shipment",
        "status": "draft",
        "supplier": data.supplier,
        "expected_date": data.expected_date,
        "items": [it.dict() for it in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status_history": [{"status": "draft", "timestamp": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


@router.post("/return")
async def create_return(data: CreateReturn, admin: dict = Depends(get_admin_user)):
    """Create a customer return order (status: registered). Linked to an existing order."""
    # Verify linked order exists
    linked = await db.store_textbook_orders.find_one({"order_id": data.linked_order_id}, {"_id": 0})
    if not linked:
        raise HTTPException(404, f"Linked order {data.linked_order_id} not found")

    order = {
        "order_id": make_id(),
        "type": "return",
        "status": "registered",
        "linked_order_id": data.linked_order_id,
        "customer_name": data.customer_name or linked.get("student_name", ""),
        "return_reason": data.return_reason,
        "items": [it.dict() for it in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status_history": [{"status": "registered", "timestamp": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


@router.post("/adjustment")
async def create_adjustment(data: CreateAdjustment, admin: dict = Depends(get_admin_user)):
    """Create a stock adjustment order (status: requested)."""
    order = {
        "order_id": make_id(),
        "type": "adjustment",
        "status": "requested",
        "adjustment_reason": data.adjustment_reason,
        "items": [it.dict() for it in data.items],
        "notes": data.notes,
        "created_by": admin.get("user_id"),
        "created_by_name": admin.get("name", "Admin"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "status_history": [{"status": "requested", "timestamp": now_iso(), "by": admin.get("name", "Admin")}],
    }
    await db.stock_orders.insert_one(order)
    order.pop("_id", None)
    return order


# ============== TRANSITION ==============

@router.post("/{order_id}/transition/{next_status}")
async def transition_stock_order(
    order_id: str,
    next_status: str,
    body: TransitionRequest,
    admin: dict = Depends(get_admin_user),
):
    """Advance a stock order to its next status. Stock is updated at terminal steps."""
    order = await db.stock_orders.find_one({"order_id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Stock order not found")

    order_type = order["type"]
    current_status = order["status"]
    allowed = VALID_TRANSITIONS.get(order_type, {}).get(current_status)

    if allowed is None:
        raise HTTPException(400, f"No transitions available from '{current_status}' for {order_type}")
    if isinstance(allowed, list):
        if next_status not in allowed:
            raise HTTPException(400, f"Invalid transition. Allowed: {allowed}")
    else:
        if next_status != allowed:
            raise HTTPException(400, f"Invalid transition. Expected: {allowed}")

    # Update items if provided (e.g., received_qty, condition)
    if body.items_update:
        items = order["items"]
        update_map = {u["book_id"]: u for u in body.items_update}
        for item in items:
            if item["book_id"] in update_map:
                upd = update_map[item["book_id"]]
                if "received_qty" in upd:
                    item["received_qty"] = upd["received_qty"]
                if "condition" in upd:
                    item["condition"] = upd["condition"]
        order["items"] = items

    # Apply stock changes at terminal steps
    stock_result = None
    applies_stock = (
        (order_type == "shipment" and next_status == "received") or
        (order_type == "return" and next_status == "approved") or
        (order_type == "adjustment" and next_status == "applied")
    )
    if applies_stock:
        stock_result = await apply_stock_changes(order, admin)

    # Update order
    history_entry = {"status": next_status, "timestamp": now_iso(), "by": admin.get("name", "Admin")}
    if body.notes:
        history_entry["notes"] = body.notes

    update = {
        "$set": {
            "status": next_status,
            "items": order["items"],
            "updated_at": now_iso(),
        },
        "$push": {"status_history": history_entry},
    }
    if body.notes:
        update["$set"]["notes"] = (order.get("notes") or "") + f"\n[{next_status}] {body.notes}"

    await db.stock_orders.update_one({"order_id": order_id}, update)

    result = {"status": "ok", "order_id": order_id, "new_status": next_status}
    if stock_result:
        result["stock_changes"] = stock_result
    return result
