"""
Wallet Monday.com Adapter
Handles wallet top-up / deduction events from the "Customers Admin" board.

Board structure (Customers Admin - 5931665026):
  - Items = Customers (email column: "email")
  - Subitems (Board 6796416579) = Wallet events
    - "Chipi Wallet" (numeric_mm0ep8ka) = amount
    - "Wallet Event" (color_mm0ewpq0) = status: "Added", "Deducted", "Stuck"
    - "Nota" (text_mkwrw3fp) = description

Webhook triggers:
  - Subitem "Wallet Event" status → "Added" = deposit to wallet
  - Subitem "Wallet Event" status → "Deducted" = charge from wallet

Config namespace: users.wallet.*
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Optional

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.webhook_router import register_handler
from modules.users.services.wallet_service import wallet_service
from modules.users.models.wallet_models import Currency, PaymentMethod
from core.database import db

logger = logging.getLogger(__name__)


class WalletMondayAdapter(BaseMondayAdapter):
    MODULE = "users"
    ENTITY = "wallet"

    # Default column IDs (matched to actual board)
    DEFAULT_COLUMN_MAPPING = {
        "email": "email",
    }

    DEFAULT_SUBITEM_COLUMN_MAPPING = {
        "amount": "numeric_mm0ep8ka",     # Chipi Wallet
        "note": "text_mkwrw3fp",          # Nota
        "status": "color_mm0ewpq0",       # Wallet Event
    }

    # Default status labels (configurable)
    DEFAULT_STATUS_LABELS = {
        "add": "Added",
        "deduct": "Deducted",
        "stuck": "Stuck",
    }

    async def get_config(self) -> Dict:
        board = await self.get_board_config()
        mapping = await self.get_custom_config("column_mapping")
        subitem_mapping = await self.get_custom_config("subitem_column_mapping")
        status_labels = await self.get_custom_config("status_labels")
        return {
            "board_id": board.get("board_id"),
            "column_mapping": mapping.get("mapping", self.DEFAULT_COLUMN_MAPPING),
            "subitem_column_mapping": subitem_mapping.get("mapping", self.DEFAULT_SUBITEM_COLUMN_MAPPING),
            "status_labels": status_labels.get("labels", self.DEFAULT_STATUS_LABELS),
            "enabled": board.get("enabled", True),
        }

    async def save_config(self, data: Dict) -> bool:
        await self.save_board_config({
            "board_id": data.get("board_id"),
            "enabled": data.get("enabled", True),
        })
        if "column_mapping" in data:
            await self.save_custom_config("column_mapping", {"mapping": data["column_mapping"]})
        if "subitem_column_mapping" in data:
            await self.save_custom_config("subitem_column_mapping", {"mapping": data["subitem_column_mapping"]})
        if "status_labels" in data:
            await self.save_custom_config("status_labels", {"labels": data["status_labels"]})
        return True

    # ---- Webhook Event Logging ----

    async def _log_event(self, event: Dict, status: str, detail: str = "", result: Dict = None):
        """Log webhook event for admin debugging"""
        doc = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "wallet_webhook",
            "status": status,
            "detail": detail,
            "event_data": {
                "boardId": event.get("boardId"),
                "pulseId": event.get("pulseId"),
                "parentItemId": event.get("parentItemId"),
                "columnId": event.get("columnId"),
            },
            "result": result,
        }
        await db.wallet_webhook_logs.insert_one(doc)

    # ---- Webhook Handler ----

    async def handle_webhook(self, event: Dict) -> Dict:
        """Handle incoming Monday.com webhook for wallet events."""
        subitem_id = str(event.get("pulseId", ""))
        parent_item_id = str(event.get("parentItemId", ""))
        column_id = event.get("columnId", "")

        logger.info(
            f"[wallet_webhook] Event received: subitem={subitem_id}, "
            f"parent={parent_item_id}, column={column_id}"
        )

        config = await self.get_config()
        subitem_mapping = config.get("subitem_column_mapping", self.DEFAULT_SUBITEM_COLUMN_MAPPING)
        status_col_id = subitem_mapping.get("status", "color_mm0ewpq0")
        status_labels = config.get("status_labels", self.DEFAULT_STATUS_LABELS)

        # Only process the wallet event status column
        if column_id and column_id != status_col_id:
            msg = f"Column {column_id} is not wallet status column ({status_col_id})"
            logger.info(f"[wallet_webhook] Ignored: {msg}")
            await self._log_event(event, "ignored", msg)
            return {"status": "ignored", "reason": msg}

        # Determine action from status label
        new_value = event.get("value", {})
        status_label = self._extract_status_label(new_value)
        logger.info(f"[wallet_webhook] Status label: '{status_label}'")

        add_label = status_labels.get("add", "Added")
        deduct_label = status_labels.get("deduct", "Deducted")

        if status_label == add_label:
            action = "topup"
        elif status_label == deduct_label:
            action = "deduct"
        else:
            msg = f"Status '{status_label}' doesn't match '{add_label}' or '{deduct_label}'"
            logger.info(f"[wallet_webhook] Ignored: {msg}")
            await self._log_event(event, "ignored", msg)
            return {"status": "ignored", "reason": msg}

        # Fetch subitem details
        subitem_data = await self._fetch_subitem(subitem_id, subitem_mapping)
        if not subitem_data:
            msg = f"Could not fetch subitem {subitem_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        amount = subitem_data.get("amount")
        note = subitem_data.get("note", "")

        if not amount or amount == 0:
            msg = "Amount is zero or missing in Chipi Wallet column"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        amount = abs(amount)

        # Fetch parent item for customer email
        column_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        customer_email = await self._fetch_customer_email(parent_item_id, column_mapping)
        if not customer_email:
            msg = f"Could not find email for customer item {parent_item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        # Find user
        user = await db.auth_users.find_one(
            {"email": {"$regex": f"^{customer_email}$", "$options": "i"}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        if not user:
            msg = f"User not found: {customer_email}"
            logger.warning(f"[wallet_webhook] {msg}")
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        user_id = user["user_id"]

        # Perform wallet operation
        try:
            if action == "topup":
                transaction = await wallet_service.deposit(
                    user_id=user_id,
                    amount=amount,
                    currency=Currency.USD,
                    payment_method=PaymentMethod.BANK_TRANSFER,
                    reference=f"monday_subitem_{subitem_id}",
                    description=note or f"Wallet top-up via Monday.com (Subitem #{subitem_id})"
                )
            else:
                transaction = await wallet_service.charge(
                    user_id=user_id,
                    amount=amount,
                    currency=Currency.USD,
                    description=note or f"Wallet deduction via Monday.com (Subitem #{subitem_id})",
                    reference_type="monday_webhook",
                    reference_id=f"monday_subitem_{subitem_id}"
                )

            result = {
                "status": "success",
                "action": action,
                "user_id": user_id,
                "email": customer_email,
                "amount": amount,
                "transaction_id": transaction.get("transaction_id")
            }

            logger.info(
                f"[wallet_webhook] Wallet {action}: user={user_id}, "
                f"amount=${amount:.2f}, txn={transaction.get('transaction_id')}"
            )

            await self._log_event(event, "success", f"{action} ${amount:.2f} for {customer_email}", result)
            await self._post_confirmation(parent_item_id, action, amount, user.get("name", customer_email))

            return result

        except ValueError as e:
            msg = f"Wallet {action} failed: {e}"
            logger.error(f"[wallet_webhook] {msg}")
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": str(e)}

    # ---- Helper Methods ----

    def _extract_status_label(self, value) -> str:
        if isinstance(value, dict):
            label = value.get("label", {})
            if isinstance(label, dict):
                return label.get("text", "")
            return str(label)
        if isinstance(value, str):
            try:
                import json
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    label = parsed.get("label", {})
                    if isinstance(label, dict):
                        return label.get("text", "")
                    return str(label)
            except (json.JSONDecodeError, TypeError):
                pass
            return value
        return ""

    async def _fetch_subitem(self, subitem_id: str, subitem_mapping: Dict) -> Optional[Dict]:
        try:
            data = await self.client.execute(
                f"""query {{ items(ids: [{subitem_id}]) {{
                    id name
                    column_values {{ id title text value }}
                }} }}"""
            )
            items = data.get("items", [])
            if not items:
                return None

            result = {"name": items[0].get("name", "")}
            amount_col = subitem_mapping.get("amount", "numeric_mm0ep8ka")
            note_col = subitem_mapping.get("note", "text_mkwrw3fp")

            for col in items[0].get("column_values", []):
                col_id = col.get("id", "")
                text = col.get("text") or ""

                if col_id == amount_col:
                    result["amount"] = self._parse_number(text or col.get("value", ""))
                elif col_id == note_col:
                    result["note"] = text

            logger.info(f"[wallet_webhook] Subitem data: {result}")
            return result
        except Exception as e:
            logger.error(f"[wallet_webhook] Failed to fetch subitem {subitem_id}: {e}")
            return None

    async def _fetch_customer_email(self, item_id: str, column_mapping: Dict) -> Optional[str]:
        try:
            data = await self.client.execute(
                f"""query {{ items(ids: [{item_id}]) {{
                    id name
                    column_values {{ id title text value }}
                }} }}"""
            )
            items = data.get("items", [])
            if not items:
                return None

            email_col = column_mapping.get("email", "email")

            for col in items[0].get("column_values", []):
                col_id = col.get("id", "")
                text = col.get("text") or ""
                value = col.get("value") or ""

                if col_id == email_col:
                    return self._extract_email(text or value)

            return None
        except Exception as e:
            logger.error(f"[wallet_webhook] Failed to fetch customer item {item_id}: {e}")
            return None

    async def _post_confirmation(self, item_id: str, action: str, amount: float, user_name: str):
        try:
            action_text = "topped up" if action == "topup" else "deducted from"
            body = f"Wallet {action_text} ${amount:.2f} for {user_name}"
            await self.client.create_update(item_id, body)
        except Exception as e:
            logger.warning(f"[wallet_webhook] Failed to post confirmation: {e}")

    @staticmethod
    def _parse_number(value: str) -> Optional[float]:
        import re
        if not value:
            return None
        try:
            import json
            parsed = json.loads(value)
            if isinstance(parsed, (int, float)):
                return float(parsed)
            if isinstance(parsed, str):
                value = parsed
        except (json.JSONDecodeError, TypeError):
            pass
        cleaned = re.sub(r'[^\d.\-]', '', str(value))
        try:
            return float(cleaned) if cleaned else None
        except ValueError:
            return None

    @staticmethod
    def _extract_email(value: str) -> Optional[str]:
        import re
        if not value:
            return None
        try:
            import json
            parsed = json.loads(value)
            if isinstance(parsed, dict):
                return parsed.get("email") or parsed.get("text")
            return str(parsed)
        except (json.JSONDecodeError, TypeError):
            pass
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', value)
        return match.group(0) if match else value.strip()

    # ---- Registration ----

    async def register_webhooks(self):
        config = await self.get_config()
        board_id = config.get("board_id")
        if board_id:
            register_handler(str(board_id), self.handle_webhook)
            logger.info(f"Wallet registered webhook for board: {board_id}")


# Singleton
wallet_monday_adapter = WalletMondayAdapter()
