"""
Admin Data Cleanup Service
Provides preview + execute for cleaning up test/demo data across collections.
Supports: orders, CRM links, CRM messages, students, wallets, users, Monday.com items.
"""
from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from core.database import db
from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

# Collections touched by the store/order flow
CLEANUP_COLLECTIONS = {
    "orders": "store_textbook_orders",
    "crm_links": "crm_student_links",
    "crm_messages": "crm_chat_messages",
    "crm_notifications": "crm_chat_notifications",
    "students": "store_students",
    "order_messages": "order_messages",
    "wallets": "chipi_wallets",
    "wallet_transactions": "chipi_transactions",
    "wallet_transactions_v2": "wallet_transactions",
    "wallet_alerts": "alertas_wallet",
    "users": "users",
}

# Admin user IDs that must NEVER be deleted
PROTECTED_USER_IDS = set()


class CleanupService:

    # ------------------------------------------------------------------ #
    #  Preview — dry-run showing what WOULD be deleted
    # ------------------------------------------------------------------ #

    async def preview(
        self,
        student_ids: Optional[List[str]] = None,
        order_ids: Optional[List[str]] = None,
        demo_only: bool = False,
        date_before: Optional[str] = None,
    ) -> Dict:
        """Return counts and sample data that would be deleted."""
        result = {}

        # Build filters
        order_filter = self._build_order_filter(order_ids, student_ids, demo_only, date_before)

        # Orders
        orders = await db[CLEANUP_COLLECTIONS["orders"]].find(
            order_filter, {"_id": 0, "order_id": 1, "student_name": 1, "total_amount": 1,
                           "status": 1, "monday_item_ids": 1, "submitted_at": 1, "created_at": 1}
        ).to_list(500)
        monday_item_ids = []
        for o in orders:
            monday_item_ids.extend(o.get("monday_item_ids", []))
        result["orders"] = {
            "count": len(orders),
            "monday_items_count": len([m for m in monday_item_ids if m]),
            "samples": orders[:10],
        }

        # Resolve student IDs and user IDs
        resolved_sids = await self._resolve_student_ids(student_ids, demo_only)
        user_ids = await self._resolve_user_ids(resolved_sids)
        protected = await self._get_protected_user_ids()
        safe_user_ids = [uid for uid in user_ids if uid not in protected]

        # CRM Links
        if resolved_sids:
            link_filter = {"student_id": {"$in": resolved_sids}}
            links = await db[CLEANUP_COLLECTIONS["crm_links"]].find(link_filter, {"_id": 0}).to_list(100)
            crm_monday_ids = [l.get("monday_item_id") for l in links if l.get("monday_item_id")]
            result["crm_links"] = {"count": len(links), "crm_monday_items_count": len(crm_monday_ids)}
        else:
            result["crm_links"] = {"count": 0}

        # CRM Messages
        msg_filter = {"student_id": {"$in": resolved_sids}} if resolved_sids else {}
        result["crm_messages"] = {"count": await db[CLEANUP_COLLECTIONS["crm_messages"]].count_documents(msg_filter) if msg_filter else 0}

        # CRM Notifications
        result["crm_notifications"] = {"count": await db[CLEANUP_COLLECTIONS["crm_notifications"]].count_documents(msg_filter) if msg_filter else 0}

        # Students
        if resolved_sids:
            student_docs = await db[CLEANUP_COLLECTIONS["students"]].find(
                {"student_id": {"$in": resolved_sids}},
                {"_id": 0, "student_id": 1, "full_name": 1, "is_demo": 1, "user_id": 1}
            ).to_list(100)
            result["students"] = {"count": len(student_docs), "samples": student_docs[:10]}
        else:
            result["students"] = {"count": 0}

        # Order Messages
        order_id_list = [o["order_id"] for o in orders]
        result["order_messages"] = {
            "count": await db[CLEANUP_COLLECTIONS["order_messages"]].count_documents(
                {"order_id": {"$in": order_id_list}}
            ) if order_id_list else 0
        }

        # --- Wallets ---
        if safe_user_ids:
            uid_filter = {"user_id": {"$in": safe_user_ids}}
            wallets = await db[CLEANUP_COLLECTIONS["wallets"]].find(uid_filter, {"_id": 0, "wallet_id": 1, "user_id": 1, "balance_usd": 1}).to_list(100)
            wallet_ids = [w["wallet_id"] for w in wallets if w.get("wallet_id")]
            txn1 = await db[CLEANUP_COLLECTIONS["wallet_transactions"]].count_documents(uid_filter)
            txn2 = await db[CLEANUP_COLLECTIONS["wallet_transactions_v2"]].count_documents(uid_filter)
            # Wallet alerts use usuario_id
            alert_count = await db[CLEANUP_COLLECTIONS["wallet_alerts"]].count_documents(
                {"usuario_id": {"$in": safe_user_ids}}
            )
            result["wallets"] = {"count": len(wallets), "samples": wallets[:5]}
            result["wallet_transactions"] = {"count": txn1 + txn2}
            result["wallet_alerts"] = {"count": alert_count}
        else:
            result["wallets"] = {"count": 0}
            result["wallet_transactions"] = {"count": 0}
            result["wallet_alerts"] = {"count": 0}

        # --- Users ---
        if safe_user_ids:
            user_docs = await db[CLEANUP_COLLECTIONS["users"]].find(
                {"user_id": {"$in": safe_user_ids}},
                {"_id": 0, "user_id": 1, "email": 1, "name": 1}
            ).to_list(100)
            result["users"] = {"count": len(user_docs), "samples": user_docs[:10]}
        else:
            result["users"] = {"count": 0, "note": "Admin users are protected and won't be deleted"}

        # Summary
        result["protected_user_ids"] = list(protected & set(user_ids))
        result["total_monday_items"] = len(set(m for m in monday_item_ids if m))

        return result

    # ------------------------------------------------------------------ #
    #  Execute — actually delete
    # ------------------------------------------------------------------ #

    async def execute(
        self,
        student_ids: Optional[List[str]] = None,
        order_ids: Optional[List[str]] = None,
        demo_only: bool = False,
        date_before: Optional[str] = None,
        delete_monday_items: bool = True,
        collections_to_clean: Optional[List[str]] = None,
    ) -> Dict:
        """Execute cleanup. Returns counts of deleted records per collection."""
        results = {}
        all_collections = collections_to_clean or [
            "orders", "crm_links", "crm_messages", "crm_notifications",
            "students", "order_messages",
            "wallets", "wallet_transactions", "wallet_alerts", "users"
        ]

        # Resolve IDs upfront
        resolved_sids = await self._resolve_student_ids(student_ids, demo_only)
        user_ids = await self._resolve_user_ids(resolved_sids)
        protected = await self._get_protected_user_ids()
        safe_user_ids = [uid for uid in user_ids if uid not in protected]

        # 1. Collect Monday.com item IDs before deleting orders
        monday_ids_to_delete = set()

        if "orders" in all_collections:
            order_filter = self._build_order_filter(order_ids, student_ids, demo_only, date_before)
            orders = await db[CLEANUP_COLLECTIONS["orders"]].find(
                order_filter, {"_id": 0, "order_id": 1, "monday_item_ids": 1}
            ).to_list(1000)

            for o in orders:
                for mid in o.get("monday_item_ids", []):
                    if mid:
                        monday_ids_to_delete.add(str(mid))

            deleted_order_ids = [o["order_id"] for o in orders]

            r = await db[CLEANUP_COLLECTIONS["orders"]].delete_many(order_filter)
            results["orders"] = {"deleted": r.deleted_count}

            # Delete related order messages
            if "order_messages" in all_collections and deleted_order_ids:
                r = await db[CLEANUP_COLLECTIONS["order_messages"]].delete_many(
                    {"order_id": {"$in": deleted_order_ids}}
                )
                results["order_messages"] = {"deleted": r.deleted_count}

        # 2. CRM Links
        if "crm_links" in all_collections and resolved_sids:
            links = await db[CLEANUP_COLLECTIONS["crm_links"]].find(
                {"student_id": {"$in": resolved_sids}}, {"_id": 0, "monday_item_id": 1}
            ).to_list(200)
            for l in links:
                if l.get("monday_item_id"):
                    monday_ids_to_delete.add(str(l["monday_item_id"]))

            r = await db[CLEANUP_COLLECTIONS["crm_links"]].delete_many(
                {"student_id": {"$in": resolved_sids}}
            )
            results["crm_links"] = {"deleted": r.deleted_count}

        # 3. CRM Messages
        if "crm_messages" in all_collections and resolved_sids:
            r = await db[CLEANUP_COLLECTIONS["crm_messages"]].delete_many(
                {"student_id": {"$in": resolved_sids}}
            )
            results["crm_messages"] = {"deleted": r.deleted_count}

        # 4. CRM Notifications
        if "crm_notifications" in all_collections and resolved_sids:
            r = await db[CLEANUP_COLLECTIONS["crm_notifications"]].delete_many(
                {"student_id": {"$in": resolved_sids}}
            )
            results["crm_notifications"] = {"deleted": r.deleted_count}

        # 5. Students
        if "students" in all_collections and resolved_sids:
            r = await db[CLEANUP_COLLECTIONS["students"]].delete_many(
                {"student_id": {"$in": resolved_sids}}
            )
            results["students"] = {"deleted": r.deleted_count}

        # 6. Wallets
        if "wallets" in all_collections and safe_user_ids:
            uid_filter = {"user_id": {"$in": safe_user_ids}}
            r = await db[CLEANUP_COLLECTIONS["wallets"]].delete_many(uid_filter)
            results["wallets"] = {"deleted": r.deleted_count}

        # 7. Wallet Transactions (both collections)
        if "wallet_transactions" in all_collections and safe_user_ids:
            uid_filter = {"user_id": {"$in": safe_user_ids}}
            r1 = await db[CLEANUP_COLLECTIONS["wallet_transactions"]].delete_many(uid_filter)
            r2 = await db[CLEANUP_COLLECTIONS["wallet_transactions_v2"]].delete_many(uid_filter)
            results["wallet_transactions"] = {"deleted": r1.deleted_count + r2.deleted_count}

        # 8. Wallet Alerts
        if "wallet_alerts" in all_collections and safe_user_ids:
            r = await db[CLEANUP_COLLECTIONS["wallet_alerts"]].delete_many(
                {"usuario_id": {"$in": safe_user_ids}}
            )
            results["wallet_alerts"] = {"deleted": r.deleted_count}

        # 9. Users
        if "users" in all_collections and safe_user_ids:
            r = await db[CLEANUP_COLLECTIONS["users"]].delete_many(
                {"user_id": {"$in": safe_user_ids}}
            )
            results["users"] = {"deleted": r.deleted_count}

        # 10. Protected users info
        protected_skipped = list(protected & set(user_ids))
        if protected_skipped:
            results["protected_users_skipped"] = protected_skipped

        # 11. Delete Monday.com items
        monday_results = {"attempted": 0, "deleted": 0, "failed": 0}
        if delete_monday_items and monday_ids_to_delete:
            for mid in monday_ids_to_delete:
                monday_results["attempted"] += 1
                try:
                    success = await monday_client.delete_item(mid)
                    if success:
                        monday_results["deleted"] += 1
                    else:
                        monday_results["failed"] += 1
                except Exception as e:
                    monday_results["failed"] += 1
                    logger.error(f"Failed to delete Monday.com item {mid}: {e}")
        results["monday_items"] = monday_results

        logger.info(f"[Cleanup] Executed: {results}")
        return results

    # ------------------------------------------------------------------ #
    #  Helpers
    # ------------------------------------------------------------------ #

    def _build_order_filter(
        self,
        order_ids: Optional[List[str]],
        student_ids: Optional[List[str]],
        demo_only: bool,
        date_before: Optional[str] = None,
    ) -> Dict:
        f = {}
        conditions = []

        if order_ids:
            conditions.append({"order_id": {"$in": order_ids}})
        if student_ids:
            conditions.append({"student_id": {"$in": student_ids}})
        if demo_only:
            conditions.append({"$or": [{"is_demo": True}, {"is_presale": True}]})
        if date_before:
            conditions.append({"$or": [
                {"submitted_at": {"$lte": date_before}},
                {"created_at": {"$lte": date_before}},
            ]})

        if len(conditions) == 1:
            f = conditions[0]
        elif conditions:
            f = {"$and": conditions}
        return f

    def _build_student_filter(self, student_ids: Optional[List[str]], demo_only: bool) -> Dict:
        if student_ids:
            return {"student_id": {"$in": student_ids}}
        if demo_only:
            return {"is_demo": True}
        return {}

    async def _resolve_student_ids(self, student_ids: Optional[List[str]], demo_only: bool) -> List[str]:
        """Resolve the final list of student IDs to clean."""
        if student_ids:
            return student_ids
        if demo_only:
            docs = await db[CLEANUP_COLLECTIONS["students"]].find(
                {"is_demo": True}, {"_id": 0, "student_id": 1}
            ).to_list(500)
            return [d["student_id"] for d in docs]
        return []

    def _build_student_collection_filter(self, student_ids: Optional[List[str]], demo_only: bool) -> Dict:
        """Filter for collections keyed by student_id."""
        if student_ids:
            return {"student_id": {"$in": student_ids}}
        # For demo_only, we'd need to resolve student_ids first — caller should use _resolve_student_ids
        return {}


cleanup_service = CleanupService()
