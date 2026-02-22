"""
Sysbook — Textbook Inventory Routes
Dashboard, product list, CRUD, bulk operations — all scoped to is_sysbook=True (Sysbook products).
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from core.auth import get_admin_user
from core.database import db
from .alerts import create_stock_alert_if_needed

router = APIRouter(prefix="/inventory", tags=["Sysbook - Inventory"])

SYSBOOK_FILTER = {"is_sysbook": True}


class StockAdjustment(BaseModel):
    book_id: str
    quantity_change: int
    reason: str = "manual_adjustment"
    notes: Optional[str] = None


class BatchStockAdjustment(BaseModel):
    adjustments: List[StockAdjustment]


@router.get("/dashboard")
async def sysbook_inventory_dashboard(admin: dict = Depends(get_admin_user)):
    """Textbook inventory overview — PCA products only."""
    pipeline = [
        {"$match": {**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]}},
        {"$group": {
            "_id": None,
            "total_products": {"$sum": 1},
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
            "total_value": {"$sum": {
                "$multiply": [
                    {"$ifNull": ["$inventory_quantity", 0]},
                    {"$ifNull": ["$price", 0]}
                ]
            }},
            "out_of_stock": {"$sum": {"$cond": [
                {"$lte": [{"$ifNull": ["$inventory_quantity", 0]}, 0]}, 1, 0
            ]}},
            "low_stock": {"$sum": {"$cond": [
                {"$and": [
                    {"$gt": [{"$ifNull": ["$inventory_quantity", 0]}, 0]},
                    {"$lte": [{"$ifNull": ["$inventory_quantity", 0]}, 10]}
                ]}, 1, 0
            ]}},
        }}
    ]
    result = await db.store_products.aggregate(pipeline).to_list(1)
    stats = result[0] if result else {
        "total_products": 0, "total_stock": 0, "total_value": 0,
        "out_of_stock": 0, "low_stock": 0
    }
    stats.pop("_id", None)

    recent = await db.inventory_movements.find(
        {"$or": [
            {"product_type": "sysbook"},
            {"book_id": {"$in": [
                p["book_id"] async for p in db.store_products.find(SYSBOOK_FILTER, {"book_id": 1, "_id": 0})
            ]}}
        ]},
        {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)

    grade_pipeline = [
        {"$match": {**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]}},
        {"$group": {
            "_id": {"$ifNull": ["$grade", "unassigned"]},
            "count": {"$sum": 1},
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
        }},
        {"$sort": {"_id": 1}}
    ]
    grades = await db.store_products.aggregate(grade_pipeline).to_list(50)
    for g in grades:
        g["grade"] = g.pop("_id")

    return {**stats, "recent_movements": recent, "grade_breakdown": grades}


@router.get("/products")
async def sysbook_list_products(
    search: Optional[str] = None,
    grade: Optional[str] = None,
    subject: Optional[str] = None,
    stock_filter: Optional[str] = None,
    active: Optional[bool] = None,
    archived: Optional[bool] = None,
    sort_by: str = "name",
    sort_dir: str = "asc",
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    admin: dict = Depends(get_admin_user),
):
    """List textbook products with filters."""
    query = {**SYSBOOK_FILTER}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"isbn": {"$regex": search, "$options": "i"}},
            {"publisher": {"$regex": search, "$options": "i"}},
        ]
    if grade:
        query["$and"] = query.get("$and", []) + [{"$or": [{"grade": grade}, {"grades": grade}]}]
    if subject:
        query["subject"] = subject
    if active is not None:
        query["active"] = active
    if archived is not None:
        query["archived"] = archived
    if stock_filter == "low":
        query["inventory_quantity"] = {"$gt": 0, "$lte": 10}
    elif stock_filter == "out":
        query["$and"] = query.get("$and", []) + [{"$or": [
            {"inventory_quantity": {"$lte": 0}},
            {"inventory_quantity": {"$exists": False}},
        ]}]
    elif stock_filter == "in":
        query["inventory_quantity"] = {"$gt": 10}

    sort_field = {"name": "name", "grade": "grade", "stock": "inventory_quantity", "price": "price"}.get(sort_by, "name")
    direction = 1 if sort_dir == "asc" else -1

    products = await db.store_products.find(query, {"_id": 0}).sort(sort_field, direction).skip(skip).limit(limit).to_list(limit)
    total = await db.store_products.count_documents(query)

    return {"products": products, "total": total}


@router.post("/products")
async def sysbook_create_product(product: dict, admin: dict = Depends(get_admin_user)):
    """Create a textbook product."""
    product["is_sysbook"] = True
    product["book_id"] = product.get("book_id") or f"book_{uuid.uuid4().hex[:12]}"
    product["active"] = product.get("active", True)
    product["created_at"] = datetime.now(timezone.utc).isoformat()
    product["created_by"] = admin.get("user_id")
    await db.store_products.insert_one(product)
    product.pop("_id", None)
    return {"success": True, "product": product}


@router.put("/products/{book_id}")
async def sysbook_update_product(book_id: str, updates: dict, admin: dict = Depends(get_admin_user)):
    """Update a textbook product."""
    updates["is_sysbook"] = True
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    # Separate null fields for $unset (e.g. clearing custom threshold)
    unset_fields = {k: "" for k, v in updates.items() if v is None and k != "is_sysbook"}
    set_fields = {k: v for k, v in updates.items() if v is not None or k == "is_sysbook"}
    update_ops = {}
    if set_fields:
        update_ops["$set"] = set_fields
    if unset_fields:
        update_ops["$unset"] = unset_fields
    if not update_ops:
        update_ops["$set"] = set_fields
    result = await db.store_products.update_one(
        {"book_id": book_id, **SYSBOOK_FILTER}, update_ops
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    product = await db.store_products.find_one({"book_id": book_id}, {"_id": 0})
    return {"success": True, "product": product}


@router.post("/products/{book_id}/adjust-stock")
async def sysbook_adjust_stock(book_id: str, adj: StockAdjustment, admin: dict = Depends(get_admin_user)):
    """Adjust stock for a single textbook product."""
    product = await db.store_products.find_one({"book_id": book_id, **SYSBOOK_FILTER}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_qty = product.get("inventory_quantity", 0)
    new_qty = max(0, old_qty + adj.quantity_change)
    await db.store_products.update_one(
        {"book_id": book_id},
        {"$set": {"inventory_quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    movement = {
        "movement_id": uuid.uuid4().hex[:12],
        "book_id": book_id,
        "product_name": product.get("name", ""),
        "type": "addition" if adj.quantity_change > 0 else "removal",
        "quantity_change": adj.quantity_change,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "reason": adj.reason,
        "notes": adj.notes,
        "product_type": "sysbook",
        "admin_id": admin.get("user_id"),
        "admin_name": admin.get("name", "Admin"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory_movements.insert_one(movement)
    movement.pop("_id", None)

    # Check stock alert threshold
    await create_stock_alert_if_needed(book_id, product.get("name", ""), new_qty, product.get("grade", ""), product.get("code", ""))

    return {"success": True, "old_quantity": old_qty, "new_quantity": new_qty, "movement": movement}


@router.post("/products/batch-adjust")
async def sysbook_batch_adjust(batch: BatchStockAdjustment, admin: dict = Depends(get_admin_user)):
    """Batch stock adjustment for textbook products."""
    results = []
    for adj in batch.adjustments:
        product = await db.store_products.find_one({"book_id": adj.book_id, **SYSBOOK_FILTER}, {"_id": 0})
        if not product:
            results.append({"book_id": adj.book_id, "error": "not found"})
            continue
        old_qty = product.get("inventory_quantity", 0)
        new_qty = max(0, old_qty + adj.quantity_change)
        await db.store_products.update_one(
            {"book_id": adj.book_id},
            {"$set": {"inventory_quantity": new_qty, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        movement = {
            "movement_id": uuid.uuid4().hex[:12],
            "book_id": adj.book_id,
            "product_name": product.get("name", ""),
            "type": "addition" if adj.quantity_change > 0 else "removal",
            "quantity_change": adj.quantity_change,
            "old_quantity": old_qty,
            "new_quantity": new_qty,
            "reason": adj.reason,
            "notes": adj.notes,
            "product_type": "sysbook",
            "admin_id": admin.get("user_id"),
            "admin_name": admin.get("name", "Admin"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.inventory_movements.insert_one(movement)
        movement.pop("_id", None)
        await create_stock_alert_if_needed(adj.book_id, product.get("name", ""), new_qty, product.get("grade", ""), product.get("code", ""))
        results.append({"book_id": adj.book_id, "old_quantity": old_qty, "new_quantity": new_qty})
    return {"success": True, "results": results}


@router.post("/products/{book_id}/archive")
async def sysbook_archive_product(book_id: str, admin: dict = Depends(get_admin_user)):
    """Archive a textbook product."""
    result = await db.store_products.update_one(
        {"book_id": book_id, **SYSBOOK_FILTER},
        {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@router.post("/products/{book_id}/restore")
async def sysbook_restore_product(book_id: str, admin: dict = Depends(get_admin_user)):
    """Restore a textbook product from archive."""
    result = await db.store_products.update_one(
        {"book_id": book_id, **SYSBOOK_FILTER},
        {"$set": {"archived": False}, "$unset": {"archived_at": ""}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@router.delete("/products/{book_id}")
async def sysbook_delete_product(book_id: str, hard_delete: bool = False, admin: dict = Depends(get_admin_user)):
    """Delete a textbook product. Default = soft delete."""
    if hard_delete:
        result = await db.store_products.delete_one({"book_id": book_id, **SYSBOOK_FILTER})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
    else:
        result = await db.store_products.update_one(
            {"book_id": book_id, **SYSBOOK_FILTER},
            {"$set": {"active": False, "deleted_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Product not found")
    return {"success": True}


@router.delete("/products/{book_id}/permanent")
async def sysbook_permanent_delete(book_id: str, admin: dict = Depends(get_admin_user)):
    """Permanently delete from archive."""
    result = await db.store_products.delete_one({"book_id": book_id, **SYSBOOK_FILTER, "archived": True})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found or not archived")
    return {"success": True}


@router.post("/products/bulk-archive")
async def sysbook_bulk_archive(body: dict, admin: dict = Depends(get_admin_user)):
    """Bulk archive textbook products."""
    book_ids = body.get("book_ids", [])
    if not book_ids:
        raise HTTPException(status_code=400, detail="No book_ids provided")
    r = await db.store_products.update_many(
        {"book_id": {"$in": book_ids}, **SYSBOOK_FILTER},
        {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "archived", "count": r.modified_count}


@router.post("/products/bulk-delete")
async def sysbook_bulk_delete(body: dict, admin: dict = Depends(get_admin_user)):
    """Bulk delete textbook products (permanent, from archive only)."""
    book_ids = body.get("book_ids", [])
    if not book_ids:
        raise HTTPException(status_code=400, detail="No book_ids provided")
    r = await db.store_products.delete_many({"book_id": {"$in": book_ids}, **SYSBOOK_FILTER, "archived": True})
    return {"status": "deleted", "count": r.deleted_count}


@router.post("/products/bulk-unarchive")
async def sysbook_bulk_unarchive(body: dict, admin: dict = Depends(get_admin_user)):
    """Bulk unarchive textbook products."""
    book_ids = body.get("book_ids", [])
    if not book_ids:
        raise HTTPException(status_code=400, detail="No book_ids provided")
    r = await db.store_products.update_many(
        {"book_id": {"$in": book_ids}, **SYSBOOK_FILTER},
        {"$set": {"archived": False}, "$unset": {"archived_at": ""}}
    )
    return {"status": "unarchived", "count": r.modified_count}
