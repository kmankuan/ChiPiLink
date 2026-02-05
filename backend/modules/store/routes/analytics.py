"""
Store Analytics Routes
Comprehensive analytics and reports for admin decision making
Admin-only access for sensitive financial data
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone, timedelta

from core.auth import get_admin_user
from core.database import db

router = APIRouter(prefix="/analytics", tags=["Store - Analytics"])


def check_super_admin(admin: dict):
    """Verify user is super admin for sensitive reports"""
    if not admin.get("is_admin"):
        raise HTTPException(status_code=403, detail="Super admin access required")
    return admin


@router.get("/comprehensive")
async def get_comprehensive_analytics(
    year: Optional[int] = None,
    period: str = Query("all", enum=["all", "week", "month", "quarter", "year"]),
    admin: dict = Depends(get_admin_user)
):
    """
    Get comprehensive analytics for business decisions.
    Includes revenue, inventory, sales by period, client, student, and book details.
    """
    check_super_admin(admin)
    
    # Set date range based on period
    now = datetime.now(timezone.utc)
    if year:
        start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    else:
        if period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "quarter":
            start_date = now - timedelta(days=90)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            start_date = None
        end_date = now
    
    date_filter = {}
    if start_date:
        date_filter = {
            "created_at": {
                "$gte": start_date.isoformat(),
                "$lte": end_date.isoformat()
            }
        }
    
    result = {
        "generated_at": now.isoformat(),
        "period": period,
        "year": year,
        "revenue": {},
        "orders": {},
        "inventory": {},
        "by_grade": {},
        "by_client": [],
        "by_student": [],
        "by_book": [],
        "trends": {},
        "alerts": []
    }
    
    # ============== REVENUE ANALYTICS ==============
    revenue_pipeline = [
        {"$match": {**date_filter, "status": {"$nin": ["cancelled", "draft"]}}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total_amount"},
            "avg_order_value": {"$avg": "$total_amount"},
            "total_orders": {"$sum": 1}
        }}
    ]
    revenue_results = await db.store_textbook_orders.aggregate(revenue_pipeline).to_list(1)
    if revenue_results:
        result["revenue"] = {
            "total": round(revenue_results[0].get("total_revenue", 0), 2),
            "average_order_value": round(revenue_results[0].get("avg_order_value", 0), 2),
            "order_count": revenue_results[0].get("total_orders", 0)
        }
    
    # ============== ORDERS BY STATUS ==============
    status_pipeline = [
        {"$match": date_filter} if date_filter else {"$match": {}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}, "revenue": {"$sum": "$total_amount"}}}
    ]
    status_results = await db.store_textbook_orders.aggregate(status_pipeline).to_list(20)
    result["orders"]["by_status"] = {
        r["_id"]: {"count": r["count"], "revenue": round(r["revenue"], 2)} 
        for r in status_results if r["_id"]
    }
    
    # ============== ORDERS BY GRADE ==============
    grade_pipeline = [
        {"$match": date_filter} if date_filter else {"$match": {}},
        {"$group": {
            "_id": "$grade",
            "order_count": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"},
            "unique_students": {"$addToSet": "$student_id"}
        }},
        {"$project": {
            "_id": 1,
            "order_count": 1,
            "revenue": 1,
            "student_count": {"$size": "$unique_students"}
        }},
        {"$sort": {"_id": 1}}
    ]
    grade_results = await db.store_textbook_orders.aggregate(grade_pipeline).to_list(20)
    result["by_grade"] = {
        r["_id"]: {
            "orders": r["order_count"],
            "revenue": round(r["revenue"], 2),
            "students": r["student_count"]
        } for r in grade_results if r["_id"]
    }
    
    # ============== TOP CLIENTS (USERS) ==============
    client_pipeline = [
        {"$match": {**date_filter, "status": {"$nin": ["cancelled", "draft"]}}},
        {"$group": {
            "_id": "$user_id",
            "order_count": {"$sum": 1},
            "total_spent": {"$sum": "$total_amount"},
            "students": {"$addToSet": "$student_name"}
        }},
        {"$sort": {"total_spent": -1}},
        {"$limit": 20}
    ]
    client_results = await db.store_textbook_orders.aggregate(client_pipeline).to_list(20)
    
    # Enrich with user info
    for client in client_results:
        user = await db.auth_users.find_one(
            {"user_id": client["_id"]},
            {"_id": 0, "name": 1, "email": 1}
        )
        result["by_client"].append({
            "user_id": client["_id"],
            "name": user.get("name", "Unknown") if user else "Unknown",
            "email": user.get("email", "") if user else "",
            "order_count": client["order_count"],
            "total_spent": round(client["total_spent"], 2),
            "students": client["students"]
        })
    
    # ============== TOP STUDENTS ==============
    student_pipeline = [
        {"$match": {**date_filter, "status": {"$nin": ["cancelled", "draft"]}}},
        {"$group": {
            "_id": "$student_id",
            "student_name": {"$first": "$student_name"},
            "grade": {"$first": "$grade"},
            "order_count": {"$sum": 1},
            "total_spent": {"$sum": "$total_amount"},
            "items_ordered": {"$sum": {"$size": {"$filter": {
                "input": "$items",
                "as": "item",
                "cond": {"$gt": ["$$item.quantity_ordered", 0]}
            }}}}
        }},
        {"$sort": {"total_spent": -1}},
        {"$limit": 30}
    ]
    student_results = await db.store_textbook_orders.aggregate(student_pipeline).to_list(30)
    result["by_student"] = [
        {
            "student_id": s["_id"],
            "name": s["student_name"],
            "grade": s["grade"],
            "order_count": s["order_count"],
            "items_ordered": s["items_ordered"],
            "total_spent": round(s["total_spent"], 2)
        } for s in student_results
    ]
    
    # ============== BOOK ANALYTICS ==============
    book_pipeline = [
        {"$match": date_filter} if date_filter else {"$match": {}},
        {"$unwind": "$items"},
        {"$match": {"items.quantity_ordered": {"$gt": 0}}},
        {"$group": {
            "_id": "$items.book_id",
            "book_name": {"$first": "$items.book_name"},
            "total_ordered": {"$sum": "$items.quantity_ordered"},
            "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity_ordered"]}},
            "unique_students": {"$addToSet": "$student_id"},
            "orders": {"$addToSet": "$order_id"},
            "grades": {"$addToSet": "$grade"}
        }},
        {"$project": {
            "_id": 1,
            "book_name": 1,
            "total_ordered": 1,
            "revenue": 1,
            "student_count": {"$size": "$unique_students"},
            "order_count": {"$size": "$orders"},
            "grades": 1
        }},
        {"$sort": {"total_ordered": -1}}
    ]
    book_results = await db.store_textbook_orders.aggregate(book_pipeline).to_list(100)
    
    # Get inventory info for each book
    for book in book_results:
        product = await db.store_products.find_one(
            {"book_id": book["_id"]},
            {"_id": 0, "inventory_quantity": 1, "reserved_quantity": 1, "price": 1, "grade": 1}
        )
        inventory = 0
        if product:
            inventory = product.get("inventory_quantity", 0) - product.get("reserved_quantity", 0)
        
        result["by_book"].append({
            "book_id": book["_id"],
            "name": book["book_name"],
            "total_sold": book["total_ordered"],
            "revenue": round(book["revenue"], 2),
            "student_count": book["student_count"],
            "order_count": book["order_count"],
            "grades": book["grades"],
            "current_inventory": inventory,
            "needs_restock": inventory < 5
        })
    
    # ============== INVENTORY OVERVIEW ==============
    inventory_pipeline = [
        {"$match": {"is_private_catalog": True, "active": True}},
        {"$project": {
            "_id": 0,
            "book_id": 1,
            "name": 1,
            "grade": 1,
            "price": 1,
            "inventory_quantity": {"$ifNull": ["$inventory_quantity", 0]},
            "reserved_quantity": {"$ifNull": ["$reserved_quantity", 0]}
        }}
    ]
    inventory_results = await db.store_products.aggregate(inventory_pipeline).to_list(200)
    
    total_inventory = 0
    low_stock_count = 0
    out_of_stock_count = 0
    inventory_value = 0
    
    for prod in inventory_results:
        available = prod["inventory_quantity"] - prod["reserved_quantity"]
        total_inventory += available
        inventory_value += available * prod.get("price", 0)
        if available <= 0:
            out_of_stock_count += 1
            result["alerts"].append({
                "type": "out_of_stock",
                "severity": "high",
                "book": prod["name"],
                "grade": prod.get("grade"),
                "message": f"{prod['name']} is out of stock"
            })
        elif available < 5:
            low_stock_count += 1
            result["alerts"].append({
                "type": "low_stock",
                "severity": "medium",
                "book": prod["name"],
                "grade": prod.get("grade"),
                "quantity": available,
                "message": f"{prod['name']} has only {available} units left"
            })
    
    result["inventory"] = {
        "total_products": len(inventory_results),
        "total_units": total_inventory,
        "inventory_value": round(inventory_value, 2),
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count
    }
    
    # ============== TRENDS (Monthly) ==============
    trends_pipeline = [
        {"$match": {"status": {"$nin": ["cancelled", "draft"]}}},
        {"$addFields": {
            "month": {"$substr": ["$created_at", 0, 7]}
        }},
        {"$group": {
            "_id": "$month",
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": -1}},
        {"$limit": 12}
    ]
    trends_results = await db.store_textbook_orders.aggregate(trends_pipeline).to_list(12)
    result["trends"]["monthly"] = [
        {
            "month": t["_id"],
            "orders": t["orders"],
            "revenue": round(t["revenue"], 2)
        } for t in reversed(trends_results)
    ]
    
    # ============== PURCHASE RECOMMENDATIONS ==============
    # Find books that are selling well but have low inventory
    recommendations = []
    for book in result["by_book"][:20]:  # Top 20 selling books
        if book["needs_restock"]:
            avg_monthly_sales = book["total_sold"] / max(len(result["trends"].get("monthly", [])), 1)
            recommended_qty = max(int(avg_monthly_sales * 3), 10)  # 3 months supply minimum
            recommendations.append({
                "book_id": book["book_id"],
                "name": book["name"],
                "current_inventory": book["current_inventory"],
                "monthly_avg_sales": round(avg_monthly_sales, 1),
                "recommended_purchase": recommended_qty,
                "reason": "High demand, low stock"
            })
    
    result["purchase_recommendations"] = recommendations
    
    return result


@router.get("/inventory-report")
async def get_inventory_report(
    admin: dict = Depends(get_admin_user)
):
    """
    Detailed inventory report for all textbooks.
    """
    check_super_admin(admin)
    
    pipeline = [
        {"$match": {"is_private_catalog": True}},
        {"$project": {
            "_id": 0,
            "book_id": 1,
            "name": 1,
            "grade": 1,
            "grades": 1,
            "price": 1,
            "active": 1,
            "inventory_quantity": {"$ifNull": ["$inventory_quantity", 0]},
            "reserved_quantity": {"$ifNull": ["$reserved_quantity", 0]},
            "publisher": 1,
            "isbn": 1
        }},
        {"$sort": {"grade": 1, "name": 1}}
    ]
    
    products = await db.store_products.aggregate(pipeline).to_list(500)
    
    # Get sales data for each book
    sales_pipeline = [
        {"$unwind": "$items"},
        {"$match": {"items.quantity_ordered": {"$gt": 0}}},
        {"$group": {
            "_id": "$items.book_id",
            "total_sold": {"$sum": "$items.quantity_ordered"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity_ordered"]}}
        }}
    ]
    sales_data = await db.store_textbook_orders.aggregate(sales_pipeline).to_list(500)
    sales_by_book = {s["_id"]: s for s in sales_data}
    
    result = []
    for prod in products:
        available = prod["inventory_quantity"] - prod["reserved_quantity"]
        sales = sales_by_book.get(prod["book_id"], {})
        
        result.append({
            "book_id": prod["book_id"],
            "name": prod["name"],
            "grade": prod.get("grade") or (prod.get("grades", [None])[0] if prod.get("grades") else None),
            "price": prod.get("price", 0),
            "active": prod.get("active", False),
            "inventory": prod["inventory_quantity"],
            "reserved": prod["reserved_quantity"],
            "available": available,
            "total_sold": sales.get("total_sold", 0),
            "total_revenue": round(sales.get("total_revenue", 0), 2),
            "status": "out_of_stock" if available <= 0 else ("low_stock" if available < 5 else "in_stock"),
            "publisher": prod.get("publisher"),
            "isbn": prod.get("isbn")
        })
    
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_products": len(result),
        "products": result
    }


@router.get("/client-report/{user_id}")
async def get_client_report(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """
    Detailed report for a specific client (user).
    """
    check_super_admin(admin)
    
    # Get user info
    user = await db.auth_users.find_one(
        {"user_id": user_id},
        {"_id": 0, "name": 1, "email": 1, "created_at": 1}
    )
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all orders for this user
    orders = await db.store_textbook_orders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Calculate totals
    total_spent = sum(o.get("total_amount", 0) for o in orders if o.get("status") not in ["cancelled", "draft"])
    total_orders = len([o for o in orders if o.get("status") not in ["cancelled", "draft"]])
    
    # Get students
    students = await db.store_students.find(
        {"user_id": user_id},
        {"_id": 0, "student_id": 1, "full_name": 1, "enrollments": 1}
    ).to_list(20)
    
    return {
        "user": {
            "user_id": user_id,
            "name": user.get("name"),
            "email": user.get("email"),
            "member_since": user.get("created_at")
        },
        "summary": {
            "total_orders": total_orders,
            "total_spent": round(total_spent, 2),
            "average_order": round(total_spent / total_orders, 2) if total_orders > 0 else 0,
            "students_count": len(students)
        },
        "students": [
            {
                "student_id": s["student_id"],
                "name": s.get("full_name"),
                "enrollments": s.get("enrollments", [])
            } for s in students
        ],
        "orders": orders
    }
