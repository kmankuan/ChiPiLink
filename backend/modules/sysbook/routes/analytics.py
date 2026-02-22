"""
Sysbook — Analytics Routes
Inventory analytics for textbook stock trends.
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.auth import get_admin_user
from core.database import db

router = APIRouter(prefix="/analytics", tags=["Sysbook - Analytics"])

SYSBOOK_FILTER = {"is_sysbook": True}


@router.get("/stock-trends")
async def stock_trends(
    days: int = Query(30, ge=7, le=365),
    admin: dict = Depends(get_admin_user),
):
    """
    Stock movement trends over time — aggregated by day.
    Returns daily additions, removals, and net change for textbook products.
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()

    # Get PCA book_ids for filtering movements
    sysbook_ids = [
        p["book_id"]
        async for p in db.store_products.find(SYSBOOK_FILTER, {"book_id": 1, "_id": 0})
    ]

    pipeline = [
        {"$match": {
            "timestamp": {"$gte": since},
            "$or": [
                {"inventory_source": "sysbook"},
                {"book_id": {"$in": sysbook_ids}},
            ],
        }},
        {"$addFields": {
            "date": {"$substr": ["$timestamp", 0, 10]},
        }},
        {"$group": {
            "_id": "$date",
            "additions": {"$sum": {"$cond": [{"$eq": ["$type", "addition"]}, "$quantity_change", 0]}},
            "removals": {"$sum": {"$cond": [{"$eq": ["$type", "removal"]}, {"$abs": "$quantity_change"}, 0]}},
            "total_movements": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    data = await db.inventory_movements.aggregate(pipeline).to_list(days)
    for d in data:
        d["date"] = d.pop("_id")
        d["net_change"] = d["additions"] - d["removals"]

    return {"trends": data, "period_days": days}


@router.get("/grade-summary")
async def grade_summary(admin: dict = Depends(get_admin_user)):
    """
    Inventory breakdown by grade — product count, total stock, total value, low/out of stock.
    """
    pipeline = [
        {"$match": {**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]}},
        {"$group": {
            "_id": {"$ifNull": ["$grade", "Unassigned"]},
            "product_count": {"$sum": 1},
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
            "total_value": {"$sum": {"$multiply": [
                {"$ifNull": ["$inventory_quantity", 0]},
                {"$ifNull": ["$price", 0]},
            ]}},
            "low_stock": {"$sum": {"$cond": [
                {"$and": [
                    {"$gt": [{"$ifNull": ["$inventory_quantity", 0]}, 0]},
                    {"$lte": [{"$ifNull": ["$inventory_quantity", 0]}, 10]},
                ]}, 1, 0
            ]}},
            "out_of_stock": {"$sum": {"$cond": [
                {"$lte": [{"$ifNull": ["$inventory_quantity", 0]}, 0]}, 1, 0
            ]}},
        }},
        {"$sort": {"_id": 1}},
    ]
    data = await db.store_products.aggregate(pipeline).to_list(50)
    for d in data:
        d["grade"] = d.pop("_id")
        d["total_value"] = round(d["total_value"], 2)
    return {"grades": data}


@router.get("/subject-summary")
async def subject_summary(admin: dict = Depends(get_admin_user)):
    """Inventory breakdown by subject."""
    pipeline = [
        {"$match": {**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]}},
        {"$group": {
            "_id": {"$ifNull": ["$subject", "Unassigned"]},
            "product_count": {"$sum": 1},
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
            "total_value": {"$sum": {"$multiply": [
                {"$ifNull": ["$inventory_quantity", 0]},
                {"$ifNull": ["$price", 0]},
            ]}},
        }},
        {"$sort": {"total_stock": -1}},
    ]
    data = await db.store_products.aggregate(pipeline).to_list(50)
    for d in data:
        d["subject"] = d.pop("_id")
        d["total_value"] = round(d["total_value"], 2)
    return {"subjects": data}


@router.get("/overview")
async def analytics_overview(admin: dict = Depends(get_admin_user)):
    """High-level Sysbook analytics overview combining all metrics."""
    # Totals
    total = await db.store_products.count_documents({**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]})
    archived = await db.store_products.count_documents({**SYSBOOK_FILTER, "archived": True})

    # Stock value
    val_pipeline = [
        {"$match": {**SYSBOOK_FILTER, "active": True, "$or": [{"archived": {"$exists": False}}, {"archived": False}]}},
        {"$group": {
            "_id": None,
            "total_stock": {"$sum": {"$ifNull": ["$inventory_quantity", 0]}},
            "total_value": {"$sum": {"$multiply": [
                {"$ifNull": ["$inventory_quantity", 0]},
                {"$ifNull": ["$price", 0]},
            ]}},
        }}
    ]
    val = await db.store_products.aggregate(val_pipeline).to_list(1)
    val = val[0] if val else {"total_stock": 0, "total_value": 0}
    val.pop("_id", None)

    # Recent movements count (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_movements = await db.inventory_movements.count_documents({"timestamp": {"$gte": week_ago}})

    # Pending stock orders
    pending_orders = await db.stock_orders.count_documents({
        "inventory_source": "sysbook",
        "status": {"$nin": ["received", "approved", "rejected", "applied"]}
    })

    return {
        "total_products": total,
        "archived_products": archived,
        "total_stock": val.get("total_stock", 0),
        "total_value": round(val.get("total_value", 0), 2),
        "recent_movements_7d": recent_movements,
        "pending_stock_orders": pending_orders,
    }
