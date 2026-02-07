"""
Dashboard Service
Business logic for admin dashboard statistics.
"""
from typing import Dict
from core.database import db
import logging

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for admin dashboard data aggregation"""

    async def get_stats(self) -> Dict:
        """Get aggregated dashboard statistics"""
        users_count = await db.auth_users.count_documents({})
        products_count = await db.store_products.count_documents({"active": True})
        orders_count = await db.store_orders.count_documents({})
        unread_count = await db.admin_notifications.count_documents({"leida": False})

        # Product health
        low_stock = await db.store_products.count_documents({
            "active": True,
            "inventory_quantity": {"$gt": 0, "$lte": 10}
        })
        out_of_stock = await db.store_products.count_documents({
            "active": True,
            "$or": [
                {"inventory_quantity": {"$lte": 0}},
                {"inventory_quantity": {"$exists": False}},
            ]
        })

        stock_status = "Healthy stock"
        if out_of_stock > 0:
            stock_status = f"{out_of_stock} out of stock"
        elif low_stock > 0:
            stock_status = f"{low_stock} low stock"

        # Order summary
        pending_orders = await db.store_orders.count_documents({"status": "pending"})
        order_status = f"{pending_orders} pending" if pending_orders else "All processed"

        return {
            "products": {"count": products_count, "status": stock_status},
            "orders": {"count": orders_count, "status": order_status},
            "users": {"count": users_count, "status": f"{users_count} registered"},
            "notifications": {"count": unread_count, "status": "Unread"},
        }


dashboard_service = DashboardService()
