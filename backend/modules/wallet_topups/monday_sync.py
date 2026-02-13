"""
Monday.com Adapter for Payment Alerts.
Creates items on the configured board with mapped columns:
Amount, Sender, Status, Warning, Bank Reference, Email Date, Source, Confidence
Posts email summary as item Update for detailed review.
"""
import json
import logging
from datetime import datetime, timezone

from modules.integrations.monday.core_client import monday_client
from core.database import db

logger = logging.getLogger(__name__)

MONDAY_TOPUP_COL = "monday_topup_items"
MONDAY_CONFIG_COL = "wallet_topup_monday_config"


class PaymentAlertsMondaySync:

    async def _get_config(self) -> dict:
        """Get board & column mapping config."""
        config = await db[MONDAY_CONFIG_COL].find_one({"id": "default"}, {"_id": 0})
        return config or {}

    async def create_topup_item(self, topup: dict, dedup_result: dict = None) -> str:
        """Create a Monday.com item for a pending top-up. Returns item ID."""
        config = await self._get_config()
        if not config.get("enabled") or not config.get("board_id"):
            logger.info("[monday_topup] Monday.com sync not enabled or no board configured")
            return ""

        board_id = config["board_id"]
        group_id = config.get("group_id", "")
        col_map = config.get("column_mapping", {})

        try:
            amount = topup.get("amount", 0)
            sender = topup.get("sender_name", "Unknown")
            bank_ref = topup.get("bank_reference", "N/A")
            source = topup.get("source", "manual")
            email_date = topup.get("created_at", "")
            confidence = topup.get("ai_confidence", 0)

            risk_level = "clear"
            warning_text = "No risk"
            if dedup_result:
                risk_level = dedup_result.get("risk_level", "clear")
                warning_text = dedup_result.get("warning_text", "No risk")

            risk_label = {
                "clear": "No Risk",
                "low_risk": "Low Risk",
                "potential_duplicate": "POTENTIAL DUPLICATE",
                "duplicate": "DUPLICATE",
            }.get(risk_level, risk_level)

            item_name = f"${amount} - {sender} ({source})"

            # Build column values from mapping
            col_values = {}
            if col_map.get("amount"):
                col_values[col_map["amount"]] = str(amount)
            if col_map.get("sender_name"):
                col_values[col_map["sender_name"]] = sender
            if col_map.get("status"):
                col_values[col_map["status"]] = {"label": "Pending"}
            if col_map.get("warning"):
                col_values[col_map["warning"]] = risk_label
            if col_map.get("bank_reference"):
                col_values[col_map["bank_reference"]] = bank_ref
            if col_map.get("email_date"):
                if email_date:
                    try:
                        dt = datetime.fromisoformat(email_date.replace("Z", "+00:00"))
                        col_values[col_map["email_date"]] = {"date": dt.strftime("%Y-%m-%d"), "time": dt.strftime("%H:%M:%S")}
                    except Exception:
                        col_values[col_map["email_date"]] = email_date
            if col_map.get("source"):
                col_values[col_map["source"]] = source
            if col_map.get("confidence"):
                col_values[col_map["confidence"]] = str(confidence) if confidence else "N/A"

            # Create item
            item_id = await monday_client.create_item(
                board_id=board_id,
                item_name=item_name,
                column_values=col_values if col_values else None,
                group_id=group_id if group_id else None,
            )

            if not item_id:
                logger.error("[monday_topup] create_item returned None")
                return ""

            logger.info(f"[monday_topup] Created item {item_id} for topup {topup.get('id', '')[:8]}")

            # Post email summary as Update
            if config.get("post_email_as_update", True):
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
                upsert=True,
            )
            return item_id

        except Exception as e:
            logger.error(f"[monday_topup] Error creating item: {e}")
            return ""

    async def update_item_status(self, topup_id: str, new_status: str, reviewer: str = "") -> bool:
        """Update Monday.com item when approved/rejected."""
        config = await self._get_config()
        if not config.get("enabled"):
            return False

        mapping = await db[MONDAY_TOPUP_COL].find_one({"topup_id": topup_id}, {"_id": 0})
        if not mapping or not mapping.get("monday_item_id"):
            return False

        item_id = mapping["monday_item_id"]
        col_map = config.get("column_mapping", {})

        try:
            # Update status column if mapped
            if col_map.get("status"):
                label = "Approved" if new_status == "approved" else "Decline"
                col_values = {col_map["status"]: {"label": label}}
                col_json = json.dumps(json.dumps(col_values))
                await monday_client.execute(f"""
                    mutation {{
                        change_multiple_column_values(
                            board_id: {config['board_id']},
                            item_id: {item_id},
                            column_values: {col_json}
                        ) {{ id }}
                    }}
                """)

            # Post status update comment
            update_text = f"Status changed: {new_status.upper()}\nReviewed by: {reviewer}\nTime: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
            await self._post_update(item_id, update_text)
            return True
        except Exception as e:
            logger.error(f"[monday_topup] Status update error: {e}")
            return False

    async def _post_update(self, item_id: str, body: str) -> bool:
        try:
            await monday_client.execute(f"""
                mutation {{
                    create_update(item_id: {item_id}, body: {json.dumps(body)}) {{ id }}
                }}
            """)
            return True
        except Exception as e:
            logger.error(f"[monday_topup] Update post error: {e}")
            return False

    def _build_update_text(self, topup: dict, dedup_result: dict = None) -> str:
        lines = ["=== PAYMENT ALERT DETAILS ===\n"]
        lines.append(f"Amount: ${topup.get('amount', 0)} {topup.get('currency', 'USD')}")
        lines.append(f"Sender: {topup.get('sender_name', 'Unknown')}")
        lines.append(f"Bank Reference: {topup.get('bank_reference', 'N/A')}")
        lines.append(f"Source: {topup.get('source', 'manual')}")
        lines.append(f"Date: {topup.get('created_at', 'N/A')}")
        if topup.get("ai_confidence"):
            lines.append(f"AI Confidence: {topup['ai_confidence']}%")

        lines.append("\n--- RISK ASSESSMENT ---")
        if dedup_result:
            risk = dedup_result.get("risk_level", "clear")
            label = {"clear": "NO RISK", "low_risk": "LOW RISK", "potential_duplicate": "POTENTIAL DUPLICATE", "duplicate": "DUPLICATE"}.get(risk, risk.upper())
            lines.append(f"Warning: {label}")
            lines.append(f"Detail: {dedup_result.get('warning_text', '')}")
            for w in dedup_result.get("warnings", []):
                lines.append(f"  - {w}")
        else:
            lines.append("Warning: NOT CHECKED")

        if topup.get("email_from") or topup.get("email_subject"):
            lines.append("\n--- EMAIL INFO ---")
            if topup.get("email_from"): lines.append(f"From: {topup['email_from']}")
            if topup.get("email_subject"): lines.append(f"Subject: {topup['email_subject']}")
        if topup.get("email_body_preview"):
            lines.append("\n--- EMAIL CONTENT ---")
            lines.append(topup["email_body_preview"][:800])
        if topup.get("notes"):
            lines.append(f"\nNotes: {topup['notes']}")

        return "\n".join(lines)


payment_alerts_monday = PaymentAlertsMondaySync()
