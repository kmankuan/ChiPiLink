"""
Textbook Order Repository
Data access layer for textbook orders
"""
from typing import List, Optional, Dict
from datetime import datetime, timezone
import uuid

from core.database import db
from core.base import BaseRepository


class TextbookOrderRepository(BaseRepository):
    """Repository for textbook orders"""
    
    COLLECTION_NAME = "store_textbook_orders"
    ID_FIELD = "order_id"
    
    def __init__(self):
        super().__init__(db, self.COLLECTION_NAME)
    
    async def create(self, data: Dict) -> Dict:
        """Create a new order"""
        data["order_id"] = f"ord_{uuid.uuid4().hex[:12]}"
        data["created_at"] = datetime.now(timezone.utc).isoformat()
        data["updated_at"] = data["created_at"]
        return await self.insert_one(data)
    
    async def get_by_id(self, order_id: str) -> Optional[Dict]:
        """Get order by ID"""
        return await self.find_one({"order_id": order_id})
    
    async def get_by_student(self, student_id: str, year: int) -> Optional[Dict]:
        """Get order for a specific student and year"""
        return await self.find_one({
            "student_id": student_id,
            "year": year
        })
    
    async def get_by_user(self, user_id: str, year: Optional[int] = None) -> List[Dict]:
        """Get all orders for a user"""
        query = {"user_id": user_id}
        if year:
            query["year"] = year
        return await self.find_many(query=query, sort=[("created_at", -1)])
    
    async def get_all(
        self, 
        status: Optional[str] = None,
        grade: Optional[str] = None,
        year: Optional[int] = None,
        limit: int = 500
    ) -> List[Dict]:
        """Get all orders with optional filters"""
        query = {}
        if status:
            query["status"] = status
        if grade:
            query["grade"] = grade
        if year:
            query["year"] = year
        return await self.find_many(query=query, sort=[("created_at", -1)], limit=limit)
    
    async def update_order(self, order_id: str, data: Dict) -> bool:
        """Update an order"""
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        return await self.update_by_id(self.ID_FIELD, order_id, data)
    
    async def update_item_status(
        self, 
        order_id: str, 
        book_id: str, 
        updates: Dict
    ) -> bool:
        """Update a specific item in an order"""
        result = await self._collection.update_one(
            {"order_id": order_id, "items.book_id": book_id},
            {
                "$set": {
                    **{f"items.$.{k}": v for k, v in updates.items()},
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        return result.modified_count > 0
    
    async def get_stats(self, year: Optional[int] = None) -> Dict:
        """Get order statistics"""
        match_stage = {}
        if year:
            match_stage["year"] = year
        
        # Orders by status
        status_pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]
        
        # Orders by grade
        grade_pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {"$group": {"_id": "$grade", "count": {"$sum": 1}, "revenue": {"$sum": "$total_amount"}}}
        ]
        
        # Top books
        books_pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {"$unwind": "$items"},
            {"$match": {"items.quantity_ordered": {"$gt": 0}}},
            {"$group": {
                "_id": "$items.book_id",
                "book_name": {"$first": "$items.book_name"},
                "total_ordered": {"$sum": "$items.quantity_ordered"},
                "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity_ordered"]}}
            }},
            {"$sort": {"total_ordered": -1}},
            {"$limit": 10}
        ]
        
        # Total revenue
        revenue_pipeline = [
            {"$match": {**match_stage, "status": {"$nin": ["cancelled", "draft"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        
        # Pending reorder requests
        reorder_pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {"$unwind": "$items"},
            {"$match": {"items.status": "reorder_requested"}},
            {"$count": "count"}
        ]
        
        status_results = await self._collection.aggregate(status_pipeline).to_list(20)
        grade_results = await self._collection.aggregate(grade_pipeline).to_list(20)
        books_results = await self._collection.aggregate(books_pipeline).to_list(10)
        revenue_results = await self._collection.aggregate(revenue_pipeline).to_list(1)
        reorder_results = await self._collection.aggregate(reorder_pipeline).to_list(1)
        
        return {
            "orders_by_status": {r["_id"]: r["count"] for r in status_results},
            "orders_by_grade": {r["_id"]: {"count": r["count"], "revenue": r["revenue"]} for r in grade_results},
            "top_books": books_results,
            "total_revenue": revenue_results[0]["total"] if revenue_results else 0,
            "pending_reorder_requests": reorder_results[0]["count"] if reorder_results else 0
        }
    
    async def get_pending_reorders(self) -> List[Dict]:
        """Get all orders with pending reorder requests"""
        pipeline = [
            {"$unwind": "$items"},
            {"$match": {"items.status": "reorder_requested"}},
            {"$project": {
                "_id": 0,
                "order_id": 1,
                "student_id": 1,
                "student_name": 1,
                "user_id": 1,
                "grade": 1,
                "year": 1,
                "item": "$items"
            }}
        ]
        return await self._collection.aggregate(pipeline).to_list(100)


# Singleton instance
textbook_order_repository = TextbookOrderRepository()
