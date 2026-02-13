"""
Monday.com Adapter for Payment Alerts.
Creates items on the Chipi Wallet board for pending top-ups with:
- Amount, Sender name, Status, Warning level, Email date/time
- Email summary posted as item Update for detailed review
"""
import json
import logging
from datetime import datetime, timezone

from modules.integrations.monday.core_client import monday_client
from core.database import db

logger = logging.getLogger(__name__)

MONDAY_TOPUP_COL = "monday_topup_items"


class PaymentAlertsMondaySync:
    """Sync pending top-ups to Monday.com board."""

    def __init__(self):
        self.client = monday_client

    async def _get_board_id(self) -> str:
        """Get the Monday.com board ID from config."""
        import os
        board_id = os.environ.get("MONDAY_BOARD_ID", "")
        if not board_id:
            config = await db.monday_config.find_one(
                {"key": "users.wallet.board"}, {"_id": 0}
            )
            board_id = config.get("data", {}).get("board_id", "") if config else ""
        return board_id

    async def create_topup_item(self, topup: dict, dedup_result: dict = None) -> str:
        """Create a Monday.com item for a pending top-up.
        Returns the Monday.com item ID or empty string on failure."""
        board_id = await self._get_board_id()
        if not board_id:
            logger.warning("[monday_topup] No board configured")
            return ""

        try:
            amount = topup.get("amount", 0)
            sender = topup.get("sender_name", "Unknown")
            bank_ref = topup.get("bank_reference", "N/A")
            source = topup.get("source", "manual")
            email_date = topup.get("created_at", "")
            confidence = topup.get("ai_confidence", 0)

            # Warning info
            risk_level = "clear"
            warning_text = "No risk"
            if dedup_result:
                risk_level = dedup_result.get("risk_level", "clear")
                warning_text = dedup_result.get("warning_text", "No risk")

            # Item name: "$150 - Juan Garcia (gmail)"
            item_name = f"${amount} - {sender} ({source})"

            # Build column values - we'll use the existing board columns
            # The wallet board has: email, amount_topup, status columns
            # We create a parent item with the key info
            col_values = {}

            # Try to use existing columns if available
            # For now, create with just the name (most reliable)
            data = await self.client.execute(f"""
                mutation {{
                    create_item(
                        board_id: {board_id},
                        item_name: {json.dumps(item_name)},
                        column_values: {json.dumps(json.dumps(col_values))}
                    ) {{ id }}
                }}
            """)
            item_id = str(data.get("create_item", {}).get("id", ""))

            if not item_id:
                logger.error("[monday_topup] Failed to create item")
                return ""

            logger.info(f"[monday_topup] Created Monday.com item {item_id} for topup {topup.get('id', '')[:8]}")

            # Post email summary as an Update (comment) on the item
            update_body = self._build_update_text(topup, dedup_result)
            await self._post_update(item_id, update_body)

            # Save mapping
            await db[MONDAY_TOPUP_COL].update_one(
                {"topup_id": topup.get("id", "")},
                {"$set": {
                    "topup_id": topup.get("id", ""),
                    "monday_item_id": item_id,
                    "board_id": board_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "risk_level": risk_level,
                }},
                upsert=True
            )

            return item_id

        except Exception as e:
            logger.error(f"[monday_topup] Error creating item: {e}")
            return ""

    async def update_item_status(self, topup_id: str, new_status: str, reviewer: str = "") -> bool:
        """Update Monday.com item when approved/rejected."""
        mapping = await db[MONDAY_TOPUP_COL].find_one(
            {"topup_id": topup_id}, {"_id": 0}
        )
        if not mapping:
            logger.info(f"[monday_topup] No Monday.com item for topup {topup_id[:8]}")
            return False

        item_id = mapping.get("monday_item_id", "")
        if not item_id:
            return False

        try:
            # Post status update as a comment
            status_emoji = "Approved" if new_status == "approved" else "Rejected"
            update_text = f"Status: {status_emoji}\nReviewed by: {reviewer}\nTime: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
            await self._post_update(item_id, update_text)
            logger.info(f"[monday_topup] Updated item {item_id} status to {new_status}")
            return True
        except Exception as e:
            logger.error(f"[monday_topup] Error updating status: {e}")
            return False

    async def _post_update(self, item_id: str, body: str) -> bool:
        """Post an update (comment) to a Monday.com item."""
        try:
            await self.client.execute(f"""
                mutation {{
                    create_update(
                        item_id: {item_id},
                        body: {json.dumps(body)}
                    ) {{ id }}
                }}
            """)
            return True
        except Exception as e:
            logger.error(f"[monday_topup] Error posting update: {e}")
            return False

    def _build_update_text(self, topup: dict, dedup_result: dict = None) -> str:
        """Build the email summary text for Monday.com item update."""
        lines = []
        lines.append("=== PAYMENT ALERT DETAILS ===\n")

        # Amount & currency
        lines.append(f"Amount: ${topup.get('amount', 0)} {topup.get('currency', 'USD')}")
        lines.append(f"Sender: {topup.get('sender_name', 'Unknown')}")
        lines.append(f"Bank Reference: {topup.get('bank_reference', 'N/A')}")
        lines.append(f"Source: {topup.get('source', 'manual')}")
        lines.append(f"Date: {topup.get('created_at', 'N/A')}")

        if topup.get("ai_confidence"):
            lines.append(f"AI Confidence: {topup['ai_confidence']}%")

        # Warning section
        lines.append("\n--- RISK ASSESSMENT ---")
        if dedup_result:
            risk = dedup_result.get("risk_level", "clear")
            risk_label = {
                "clear": "NO RISK",
                "low_risk": "LOW RISK",
                "potential_duplicate": "POTENTIAL DUPLICATE",
                "duplicate": "DUPLICATE"
            }.get(risk, risk.upper())
            lines.append(f"Warning: {risk_label}")
            lines.append(f"Detail: {dedup_result.get('warning_text', 'No issues detected')}")
            for w in dedup_result.get("warnings", []):
                lines.append(f"  - {w}")
        else:
            lines.append("Warning: NOT CHECKED")

        # Email details
        if topup.get("email_from") or topup.get("email_subject"):
            lines.append("\n--- EMAIL INFO ---")
            if topup.get("email_from"):
                lines.append(f"From: {topup['email_from']}")
            if topup.get("email_subject"):
                lines.append(f"Subject: {topup['email_subject']}")

        if topup.get("email_body_preview"):
            lines.append("\n--- EMAIL CONTENT ---")
            lines.append(topup["email_body_preview"][:800])

        if topup.get("notes"):
            lines.append(f"\nNotes: {topup['notes']}")

        return "\n".join(lines)


payment_alerts_monday = PaymentAlertsMondaySync()
