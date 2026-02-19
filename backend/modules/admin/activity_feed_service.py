"""
Activity Feed Service
Aggregates recent events from multiple collections into a unified timeline.
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from core.database import db

logger = logging.getLogger(__name__)

EVENT_TYPES = {
    "order_submitted": {"icon": "shopping-cart", "color": "green", "label": "Order Submitted"},
    "order_status_changed": {"icon": "package", "color": "blue", "label": "Order Updated"},
    "access_request": {"icon": "clipboard-list", "color": "amber", "label": "Access Request"},
    "access_request_approved": {"icon": "check-circle", "color": "green", "label": "Request Approved"},
    "access_request_rejected": {"icon": "x-circle", "color": "red", "label": "Request Rejected"},
    "user_registered": {"icon": "user-plus", "color": "purple", "label": "New User"},
    "wallet_topup": {"icon": "wallet", "color": "emerald", "label": "Wallet Top-up"},
    "wallet_transaction": {"icon": "credit-card", "color": "blue", "label": "Wallet Transaction"},
    "crm_message": {"icon": "message-square", "color": "indigo", "label": "CRM Message"},
    "monday_sync": {"icon": "refresh-cw", "color": "teal", "label": "Monday.com Sync"},
    "student_linked": {"icon": "link", "color": "violet", "label": "Student Linked"},
}


class ActivityFeedService:

    async def get_feed(
        self,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        event_types: Optional[List[str]] = None,
        limit: int = 50,
    ) -> Dict:
        """Get unified activity feed from multiple collections."""
        now = datetime.now(timezone.utc)
        if not date_from:
            date_from = (now - timedelta(days=7)).isoformat()
        if not date_to:
            date_to = now.isoformat()

        events = []

        type_filter = set(event_types) if event_types else None

        # 1. Textbook Orders
        if not type_filter or "order_submitted" in type_filter or "order_status_changed" in type_filter:
            events.extend(await self._get_order_events(date_from, date_to))

        # 2. Access / Enrollment Requests
        if not type_filter or any(t in (type_filter or set()) for t in ("access_request", "access_request_approved", "access_request_rejected")):
            events.extend(await self._get_access_request_events(date_from, date_to))

        # 3. User Registrations
        if not type_filter or "user_registered" in type_filter:
            events.extend(await self._get_user_events(date_from, date_to))

        # 4. Wallet Transactions
        if not type_filter or "wallet_topup" in type_filter or "wallet_transaction" in type_filter:
            events.extend(await self._get_wallet_events(date_from, date_to))

        # 5. CRM Messages
        if not type_filter or "crm_message" in type_filter:
            events.extend(await self._get_crm_events(date_from, date_to))

        # 6. Monday.com Sync logs
        if not type_filter or "monday_sync" in type_filter:
            events.extend(await self._get_monday_sync_events(date_from, date_to))

        # Apply type filter if specified
        if type_filter:
            events = [e for e in events if e["type"] in type_filter]

        # Sort newest first
        events.sort(key=lambda e: e.get("timestamp", ""), reverse=True)

        return {
            "events": events[:limit],
            "total": len(events),
            "date_from": date_from,
            "date_to": date_to,
            "event_type_meta": EVENT_TYPES,
        }

    async def get_settings(self) -> Dict:
        """Get activity feed settings (which event types are enabled)."""
        doc = await db.site_config.find_one(
            {"config_type": "activity_feed_settings"}, {"_id": 0}
        )
        if not doc:
            return {"enabled_types": list(EVENT_TYPES.keys()), "auto_refresh_seconds": 30}
        return doc.get("settings", {"enabled_types": list(EVENT_TYPES.keys()), "auto_refresh_seconds": 30})

    async def update_settings(self, settings: Dict) -> Dict:
        """Update activity feed settings."""
        await db.site_config.update_one(
            {"config_type": "activity_feed_settings"},
            {"$set": {"config_type": "activity_feed_settings", "settings": settings}},
            upsert=True,
        )
        return settings

    # ------------------------------------------------------------------ #
    #  Private helpers — each returns a list of event dicts
    # ------------------------------------------------------------------ #

    async def _get_order_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        orders = await db.store_textbook_orders.find(
            {"$or": [
                {"submitted_at": {"$gte": date_from, "$lte": date_to}},
                {"created_at": {"$gte": date_from, "$lte": date_to}},
            ]},
            {"_id": 0, "order_id": 1, "student_name": 1, "status": 1,
             "total_amount": 1, "submitted_at": 1, "created_at": 1, "items": 1}
        ).to_list(200)

        for o in orders:
            ts = o.get("submitted_at") or o.get("created_at", "")
            item_count = len(o.get("items", []))
            events.append({
                "type": "order_submitted",
                "timestamp": ts,
                "title": f"{o.get('student_name', 'Unknown')} placed an order",
                "description": f"Order {o.get('order_id', '')[:12]} - {item_count} item(s) - ${o.get('total_amount', 0):.2f}",
                "meta": {"order_id": o.get("order_id"), "status": o.get("status"), "amount": o.get("total_amount", 0)},
            })
        return events

    async def _get_access_request_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        students = await db.store_students.find(
            {"enrollments": {"$exists": True, "$ne": []}},
            {"_id": 0, "student_id": 1, "full_name": 1, "enrollments": 1}
        ).to_list(500)

        for s in students:
            for enr in s.get("enrollments", []):
                ts = enr.get("updated_at") or enr.get("requested_at", "")
                if not ts or ts < date_from or ts > date_to:
                    continue
                status = enr.get("status", "pending")
                if status == "approved":
                    etype = "access_request_approved"
                    title = f"{s.get('full_name', 'Unknown')} access approved"
                elif status == "rejected":
                    etype = "access_request_rejected"
                    title = f"{s.get('full_name', 'Unknown')} access rejected"
                else:
                    etype = "access_request"
                    title = f"{s.get('full_name', 'Unknown')} requested access"
                events.append({
                    "type": etype,
                    "timestamp": ts,
                    "title": title,
                    "description": f"Grade {enr.get('grade', '?')} - Year {enr.get('year', '?')} - {enr.get('school_name', '')}",
                    "meta": {"student_id": s.get("student_id"), "status": status},
                })
        return events

    async def _get_user_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        users = await db.auth_users.find(
            {"created_at": {"$gte": date_from, "$lte": date_to}},
            {"_id": 0, "user_id": 1, "nombre": 1, "email": 1, "created_at": 1, "is_admin": 1}
        ).to_list(200)

        for u in users:
            events.append({
                "type": "user_registered",
                "timestamp": u.get("created_at", ""),
                "title": f"New user: {u.get('nombre', u.get('email', 'Unknown'))}",
                "description": u.get("email", ""),
                "meta": {"user_id": u.get("user_id"), "is_admin": u.get("is_admin", False)},
            })
        return events

    async def _get_wallet_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        # chipi_transactions
        txns = await db.chipi_transactions.find(
            {"created_at": {"$gte": date_from, "$lte": date_to}},
            {"_id": 0, "user_id": 1, "type": 1, "amount": 1, "description": 1, "created_at": 1}
        ).to_list(200)

        for tx in txns:
            is_topup = tx.get("type") in ("topup", "recharge", "credit")
            events.append({
                "type": "wallet_topup" if is_topup else "wallet_transaction",
                "timestamp": tx.get("created_at", ""),
                "title": f"Wallet {'top-up' if is_topup else 'transaction'}: ${abs(tx.get('amount', 0)):.2f}",
                "description": tx.get("description", ""),
                "meta": {"user_id": tx.get("user_id"), "amount": tx.get("amount", 0)},
            })

        # wallet_transactions (v2)
        txns2 = await db.wallet_transactions.find(
            {"created_at": {"$gte": date_from, "$lte": date_to}},
            {"_id": 0, "user_id": 1, "type": 1, "amount": 1, "description": 1, "created_at": 1}
        ).to_list(200)

        for tx in txns2:
            is_topup = tx.get("type") in ("topup", "recharge", "credit")
            events.append({
                "type": "wallet_topup" if is_topup else "wallet_transaction",
                "timestamp": tx.get("created_at", ""),
                "title": f"Wallet {'top-up' if is_topup else 'transaction'}: ${abs(tx.get('amount', 0)):.2f}",
                "description": tx.get("description", ""),
                "meta": {"user_id": tx.get("user_id"), "amount": tx.get("amount", 0)},
            })
        return events

    async def _get_crm_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        msgs = await db.crm_chat_messages.find(
            {"created_at": {"$gte": date_from, "$lte": date_to}},
            {"_id": 0, "student_id": 1, "student_name": 1, "subject": 1,
             "sender": 1, "created_at": 1, "is_topic": 1}
        ).to_list(200)

        for m in msgs:
            sender = m.get("sender", "unknown")
            is_topic = m.get("is_topic", False)
            events.append({
                "type": "crm_message",
                "timestamp": m.get("created_at", ""),
                "title": f"{'New topic' if is_topic else 'Reply'} from {sender}: {m.get('student_name', '')}",
                "description": m.get("subject", "")[:80],
                "meta": {"student_id": m.get("student_id"), "sender": sender},
            })
        return events

    async def _get_monday_sync_events(self, date_from: str, date_to: str) -> List[Dict]:
        events = []
        logs = await db.monday_sync_logs.find(
            {"timestamp": {"$gte": date_from, "$lte": date_to}},
            {"_id": 0, "board_name": 1, "action": 1, "items_synced": 1,
             "timestamp": 1, "status": 1}
        ).to_list(100)

        for log in logs:
            events.append({
                "type": "monday_sync",
                "timestamp": log.get("timestamp", ""),
                "title": f"Monday.com sync: {log.get('board_name', 'Unknown board')}",
                "description": f"{log.get('action', 'sync')} - {log.get('items_synced', 0)} items - {log.get('status', 'complete')}",
                "meta": {"board_name": log.get("board_name")},
            })
        return events


activity_feed_service = ActivityFeedService()
