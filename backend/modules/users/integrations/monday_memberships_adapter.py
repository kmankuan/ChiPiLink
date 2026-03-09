"""
Memberships Monday.com Adapter
Extends BaseMondayAdapter for membership-specific sync:
- Membership plans → Monday.com board
- User subscriptions → Monday.com board items/subitems
- Visit tracking → status updates

Admin-configurable: board IDs and column mappings are stored in
namespaced config (memberships.plans.board, memberships.plans.column_mapping, etc.)
so the admin can set up the integration later via the admin panel.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.webhook_router import register_handler
from core.database import db

logger = logging.getLogger(__name__)


class MembershipsMondayAdapter(BaseMondayAdapter):
    MODULE = "memberships"
    ENTITY = "plans"

    # Default column mapping (admin can override via config)
    DEFAULT_COLUMN_MAPPING = {
        "plan_name": "name",       # item name
        "plan_type": "status",     # status column
        "price": "numbers",        # numbers column
        "duration": "text",        # text column
        "visits_included": "numbers0",  # second numbers column
        "member_name": "text4",    # for subscription items
        "member_email": "email",   # email column
        "start_date": "date",      # date column
        "end_date": "date0",       # second date column
        "visits_used": "numbers4", # numbers column
    }

    async def get_config(self) -> Dict:
        """Get full memberships Monday config"""
        board = await self.get_board_config()
        mapping = await self.get_custom_config("column_mapping")
        sync = await self.get_custom_config("sync_settings")
        return {
            "board_id": board.get("board_id"),
            "subscriptions_board_id": board.get("subscriptions_board_id"),
            "column_mapping": mapping.get("mapping", self.DEFAULT_COLUMN_MAPPING),
            "auto_sync_plans": sync.get("auto_sync_plans", False),
            "auto_sync_subscriptions": sync.get("auto_sync_subscriptions", False),
            "enabled": sync.get("enabled", False),
        }

    async def save_config(self, data: Dict) -> bool:
        """Save full memberships Monday config"""
        await self.save_board_config({
            "board_id": data.get("board_id"),
            "subscriptions_board_id": data.get("subscriptions_board_id"),
        })
        if "column_mapping" in data:
            await self.save_custom_config("column_mapping", {"mapping": data["column_mapping"]})
        await self.save_custom_config("sync_settings", {
            "auto_sync_plans": data.get("auto_sync_plans", False),
            "auto_sync_subscriptions": data.get("auto_sync_subscriptions", False),
            "enabled": data.get("enabled", False),
        })
        return True

    # ---- Plan Sync ----

    async def sync_plan(self, plan_id: str) -> Optional[str]:
        """Sync a membership plan to Monday.com"""
        config = await self.get_config()
        if not config.get("enabled") or not config.get("board_id"):
            return None

        plan = await db.chipi_membership_plans.find_one(
            {"plan_id": plan_id}, {"_id": 0}
        )
        if not plan:
            return None

        if plan.get("monday_item_id"):
            return plan["monday_item_id"]

        mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        plan_name = plan.get("name", {})
        display_name = plan_name.get("en") or plan_name.get("es") or str(plan_name)

        column_values = {}
        if mapping.get("plan_type"):
            column_values[mapping["plan_type"]] = {"label": plan.get("type", "membership")}
        if mapping.get("price"):
            column_values[mapping["price"]] = plan.get("price", 0)
        if mapping.get("duration"):
            column_values[mapping["duration"]] = f"{plan.get('duration_days', 30)} days"
        if mapping.get("visits_included"):
            column_values[mapping["visits_included"]] = plan.get("visits_included", 0)

        monday_id = await self.client.create_item(
            config["board_id"], display_name, column_values
        )
        if monday_id:
            await db.chipi_membership_plans.update_one(
                {"plan_id": plan_id},
                {"$set": {"monday_item_id": monday_id}}
            )
            logger.info(f"Plan synced to Monday: {plan_id} -> {monday_id}")

        return monday_id

    # ---- Subscription Sync ----

    async def sync_subscription(self, membership_id: str) -> Optional[str]:
        """Sync a user subscription to Monday.com"""
        config = await self.get_config()
        board_id = config.get("subscriptions_board_id") or config.get("board_id")
        if not config.get("enabled") or not board_id:
            return None

        membership = await db.chipi_user_memberships.find_one(
            {"membership_id": membership_id}, {"_id": 0}
        )
        if not membership:
            return None

        if membership.get("monday_item_id"):
            return membership["monday_item_id"]

        mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        user = await db.auth_users.find_one(
            {"user_id": membership.get("user_id")}, {"_id": 0}
        )
        user_name = user.get("name", "Unknown") if user else "Unknown"
        item_name = f"{user_name} - {membership.get('plan_name', 'Plan')}"

        column_values = {}
        if mapping.get("member_name"):
            column_values[mapping["member_name"]] = user_name
        if mapping.get("member_email") and user:
            column_values[mapping["member_email"]] = {"email": user.get("email", ""), "text": user.get("email", "")}
        if mapping.get("plan_type"):
            column_values[mapping["plan_type"]] = {"label": membership.get("status", "active")}

        monday_id = await self.client.create_item(board_id, item_name, column_values)
        if monday_id:
            await db.chipi_user_memberships.update_one(
                {"membership_id": membership_id},
                {"$set": {"monday_item_id": monday_id}}
            )
            logger.info(f"Subscription synced to Monday: {membership_id} -> {monday_id}")

        return monday_id

    # ---- Webhook Handler ----

    async def handle_webhook(self, event: Dict) -> Dict:
        """Handle incoming Monday.com webhook events for Memberships"""
        column_id = event.get("columnId", "")
        item_id = str(event.get("pulseId", ""))
        logger.info(f"Memberships webhook: item={item_id} col={column_id}")

        if column_id == "status":
            new_value = event.get("value", {})
            label = ""
            if isinstance(new_value, dict):
                label = new_value.get("label", {}).get("text", "")

            membership = await db.chipi_user_memberships.find_one(
                {"monday_item_id": item_id}, {"_id": 0}
            )
            if membership:
                status_map = {"Active": "active", "Expired": "expired", "Suspended": "suspended", "Cancelled": "cancelled"}
                new_status = status_map.get(label)
                if new_status:
                    await db.chipi_user_memberships.update_one(
                        {"monday_item_id": item_id},
                        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
                    )
                    return {"status": "updated", "membership_id": membership.get("membership_id")}

        return {"status": "acknowledged"}

    async def register_webhooks(self):
        """Register webhook handlers for configured boards"""
        config = await self.get_config()
        for key in ["board_id", "subscriptions_board_id"]:
            board_id = config.get(key)
            if board_id:
                register_handler(board_id, self.handle_webhook)
                logger.info(f"Memberships registered webhook for {key}: {board_id}")


# Singleton
memberships_monday_adapter = MembershipsMondayAdapter()
