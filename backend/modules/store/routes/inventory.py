"""
Store Module - Retail Inventory Routes
Comprehensive inventory management for Unatienda products:
- Stock overview dashboard
- Individual & batch stock adjustments with history
- Stock movement log
- Low-stock alerts with configurable thresholds
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

router = APIRouter(prefix="/inventory", tags=["Store - Inventory"])


# ============== MODELS ==============

class StockAdjustment(BaseModel):
    book_id: str
    quantity_change: int  # positive = add, negative = remove
    reason: str = "manual_adjustment"
    notes: Optional[str] = None


class BatchStockAdjustment(BaseModel):
    adjustments: List[StockAdjustment]


class LowStockThreshold(BaseModel):
    book_id: str
    threshold: int = 10


# ============== DASHBOARD ==============

@router.get("/dashboard")
async def get_inventory_dashboard(admin: dict = Depends(get_admin_user)):
    """Get comprehensive inventory overview"""
    pipeline_total = [
        {"$match": {"active": True}},
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

    result = await db.store_products.aggregate(pipeline_total).to_list(1)
    stats = result[0] if result else {
        "total_products": 0, "total_stock": 0, "total_value": 0,
        "out_of_stock": 0, "low_stock": 0
    }
    stats.pop("_id", None)

    # Recent movements (last 20)
    recent = await db.inventory_movements.find(
        {}, {"_id": 0}
    ).sort("timestamp", -1).limit(20).to_list(20)

    # Category breakdown
    cat_pipeline = [
        {"$match": {"active": True}},
        {"$group": {
            "_id": {"$ifNull": ["$category", "uncategorized"]},
            "count": {"$sum": 1},
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
        }},
        {"$sort": {"count": -1}}
    ]
    categories = await db.store_products.aggregate(cat_pipeline).to_list(50)
    for c in categories:
        c["category"] = c.pop("_id")

    return {
        **stats,
        "recent_movements": recent,
        "category_breakdown": categories,
    }


# ============== STOCK LIST ==============

@router.get("/products")
async def get_inventory_products(
    search: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    stock_filter: Optional[str] = Query(None, description="all|low|out|in"),
    sort_by: Optional[str] = Query("name", description="name|stock|price|updated"),
    sort_dir: Optional[str] = Query("asc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_admin_user),
):
    """Get products with inventory data, search, filter, sort"""
    query = {"active": True}

    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"code": {"$regex": search, "$options": "i"}},
            {"isbn": {"$regex": search, "$options": "i"}},
        ]

    if category:
        query["category"] = category

    if stock_filter == "low":
        query["inventory_quantity"] = {"$gt": 0, "$lte": 10}
    elif stock_filter == "out":
        query["$or"] = [
            {"inventory_quantity": {"$lte": 0}},
            {"inventory_quantity": {"$exists": False}},
        ]
        # Remove conflicting $or from search
        if search:
            query = {"$and": [
                {"active": True},
                {"$or": [
                    {"name": {"$regex": search, "$options": "i"}},
                    {"code": {"$regex": search, "$options": "i"}},
                ]},
                {"$or": [
                    {"inventory_quantity": {"$lte": 0}},
                    {"inventory_quantity": {"$exists": False}},
                ]}
            ]}
    elif stock_filter == "in":
        query["inventory_quantity"] = {"$gt": 10}

    sort_map = {
        "name": "name",
        "stock": "inventory_quantity",
        "price": "price",
        "updated": "updated_at",
    }
    sort_field = sort_map.get(sort_by, "name")
    direction = -1 if sort_dir == "desc" else 1

    total = await db.store_products.count_documents(query)
    products = await db.store_products.find(
        query, {"_id": 0}
    ).sort(sort_field, direction).skip(skip).limit(limit).to_list(limit)

    return {
        "products": products,
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ============== STOCK ADJUSTMENT ==============

@router.post("/adjust")
async def adjust_stock(
    adjustment: StockAdjustment,
    admin: dict = Depends(get_admin_user),
):
    """Adjust stock for a single product (add or remove)"""
    product = await db.store_products.find_one(
        {"book_id": adjustment.book_id}, {"_id": 0}
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    old_qty = product.get("inventory_quantity", 0)
    new_qty = max(0, old_qty + adjustment.quantity_change)

    # Auto-fulfill pre-sale reservations when adding stock
    reserved = product.get("reserved_quantity", 0)
    fulfilled = 0
    if adjustment.quantity_change > 0 and reserved > 0:
        # Fulfill as many reservations as the new stock allows
        fulfilled = min(reserved, new_qty)
        new_qty = new_qty - fulfilled
        new_reserved = reserved - fulfilled
    else:
        new_reserved = reserved

    update_fields = {
        "inventory_quantity": new_qty,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if fulfilled > 0:
        update_fields["reserved_quantity"] = new_reserved

    await db.store_products.update_one(
        {"book_id": adjustment.book_id},
        {"$set": update_fields}
    )

    # Log movement
    movement = {
        "movement_id": str(uuid.uuid4())[:12],
        "book_id": adjustment.book_id,
        "product_name": product.get("name", "Unknown"),
        "type": "addition" if adjustment.quantity_change > 0 else "removal",
        "quantity_change": adjustment.quantity_change,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "presale_fulfilled": fulfilled,
        "reason": adjustment.reason,
        "notes": adjustment.notes,
        "admin_id": admin.get("user_id"),
        "admin_name": admin.get("name", "Admin"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory_movements.insert_one(movement)

    result = {
        "success": True,
        "book_id": adjustment.book_id,
        "old_quantity": old_qty,
        "new_quantity": new_qty,
        "movement_id": movement["movement_id"],
    }
    if fulfilled > 0:
        result["presale_fulfilled"] = fulfilled
        result["remaining_presale"] = new_reserved

    # Sync stock to Monday.com (non-blocking, only for private catalog textbooks)
    if product.get("is_private_catalog"):
        try:
            from modules.store.integrations.monday_txb_inventory_adapter import txb_inventory_adapter
            sync_result = await txb_inventory_adapter.sync_stock_to_monday(adjustment.book_id, new_qty)
            result["monday_sync"] = sync_result
        except Exception as e:
            logger.warning(f"Monday.com stock sync failed (non-blocking): {e}")

    return result


@router.post("/adjust/batch")
async def batch_adjust_stock(
    batch: BatchStockAdjustment,
    admin: dict = Depends(get_admin_user),
):
    """Batch adjust stock for multiple products"""
    results = []
    for adj in batch.adjustments:
        product = await db.store_products.find_one(
            {"book_id": adj.book_id}, {"_id": 0}
        )
        if not product:
            results.append({"book_id": adj.book_id, "success": False, "error": "Not found"})
            continue

        old_qty = product.get("inventory_quantity", 0)
        new_qty = max(0, old_qty + adj.quantity_change)

        await db.store_products.update_one(
            {"book_id": adj.book_id},
            {"$set": {
                "inventory_quantity": new_qty,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }}
        )

        movement = {
            "movement_id": str(uuid.uuid4())[:12],
            "book_id": adj.book_id,
            "product_name": product.get("name", "Unknown"),
            "type": "addition" if adj.quantity_change > 0 else "removal",
            "quantity_change": adj.quantity_change,
            "old_quantity": old_qty,
            "new_quantity": new_qty,
            "reason": adj.reason,
            "notes": adj.notes,
            "admin_id": admin.get("user_id"),
            "admin_name": admin.get("name", "Admin"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await db.inventory_movements.insert_one(movement)
        results.append({
            "book_id": adj.book_id,
            "success": True,
            "old_quantity": old_qty,
            "new_quantity": new_qty,
        })

    return {"results": results, "total": len(results)}


# ============== MOVEMENT HISTORY ==============

@router.get("/movements")
async def get_inventory_movements(
    book_id: Optional[str] = Query(None),
    movement_type: Optional[str] = Query(None, description="addition|removal"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    admin: dict = Depends(get_admin_user),
):
    """Get inventory movement history"""
    query = {}
    if book_id:
        query["book_id"] = book_id
    if movement_type:
        query["type"] = movement_type

    total = await db.inventory_movements.count_documents(query)
    movements = await db.inventory_movements.find(
        query, {"_id": 0}
    ).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)

    return {"movements": movements, "total": total, "skip": skip, "limit": limit}


# ============== LOW STOCK ALERTS ==============

@router.get("/alerts")
async def get_low_stock_alerts(
    threshold: int = Query(10, ge=1, le=1000),
    admin: dict = Depends(get_admin_user),
):
    """Get products below stock threshold"""
    products = await db.store_products.find(
        {
            "active": True,
            "$or": [
                {"inventory_quantity": {"$lte": threshold}},
                {"inventory_quantity": {"$exists": False}},
            ],
        },
        {"_id": 0, "book_id": 1, "name": 1, "category": 1,
         "inventory_quantity": 1, "price": 1, "image_url": 1}
    ).sort("inventory_quantity", 1).to_list(200)

    return {
        "alerts": products,
        "threshold": threshold,
        "count": len(products),
    }


@router.post("/products/bulk-delete")
async def bulk_delete_products(data: dict, admin: dict = Depends(get_admin_user)):
    """Bulk delete products from inventory"""
    product_ids = data.get("product_ids", [])
    if not product_ids:
        raise HTTPException(status_code=400, detail="No products specified")
    r = await db.store_products.delete_many({"product_id": {"$in": product_ids}})
    await db.inventory_items.delete_many({"product_id": {"$in": product_ids}})
    return {"status": "deleted", "count": r.deleted_count}


@router.post("/products/bulk-archive")
async def bulk_archive_products(data: dict, admin: dict = Depends(get_admin_user)):
    """Archive products (hide from store but preserve data)"""
    from datetime import datetime, timezone
    product_ids = data.get("product_ids", [])
    if not product_ids:
        raise HTTPException(status_code=400, detail="No products specified")
    r = await db.store_products.update_many(
        {"product_id": {"$in": product_ids}},
        {"$set": {"archived": True, "archived_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"status": "archived", "count": r.modified_count}

