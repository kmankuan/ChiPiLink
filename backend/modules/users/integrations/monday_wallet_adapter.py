"""
Wallet Monday.com Adapter
Handles wallet top-up / deduction events from the "Chipi Wallet" board.

Board structure (Chipi Wallet - 18399650704):
  - Each ITEM is a wallet transaction
  - Item columns: Email, Amount (number), Note (text), Status
  - Automation: "When Status changes to Added/Deducted → send webhook"

Webhook triggers (ITEM-LEVEL):
  - Item "Status" → "Added" = deposit to wallet
  - Item "Status" → "Deducted" = charge from wallet

Config namespace: users.wallet.*
"""
import logging
import json
import re
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

    # Default column IDs for item-level mapping
    DEFAULT_COLUMN_MAPPING = {
        "email": "email_mm0f7cg8",
        "amount_topup": "numeric_mm0ff8j3",   # Top Up column
        "amount_deduct": "numeric_mm0f60w7",  # Deduct column
        "note": "",                            # Optional
        "status": "status",
    }

    DEFAULT_STATUS_LABELS = {
        "add": "Added",
        "deduct": "Deducted",
        "stuck": "Stuck",
    }

    async def get_config(self) -> Dict:
        board = await self.get_board_config()
        mapping = await self.get_custom_config("column_mapping")
        status_labels = await self.get_custom_config("status_labels")
        return {
            "board_id": board.get("board_id"),
            "column_mapping": mapping.get("mapping", self.DEFAULT_COLUMN_MAPPING),
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
        if "status_labels" in data:
            await self.save_custom_config("status_labels", {"labels": data["status_labels"]})
        return True

    # ---- Webhook Event Logging ----

    async def _log_event(self, event: Dict, status: str, detail: str = "", result: Dict = None):
        doc = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "event_type": "wallet_webhook",
            "status": status,
            "detail": detail,
            "event_data": {
                "boardId": event.get("boardId"),
                "pulseId": event.get("pulseId"),
                "columnId": event.get("columnId"),
            },
            "result": result,
        }
        await db.wallet_webhook_logs.insert_one(doc)

    # ---- Webhook Handler (ITEM-LEVEL) ----

    async def handle_webhook(self, event: Dict) -> Dict:
        """Handle incoming Monday.com webhook for wallet events.
        
        Item-level trigger: "When Status changes → send webhook"
        pulseId = the item that changed (contains email, amount, note, status)
        """
        item_id = str(event.get("pulseId", ""))
        column_id = event.get("columnId", "")

        logger.info(f"[wallet_webhook] Event: item={item_id}, column={column_id}")

        config = await self.get_config()
        column_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        status_col_id = column_mapping.get("status", "status")
        status_labels = config.get("status_labels", self.DEFAULT_STATUS_LABELS)

        # Only process the status column trigger
        if column_id and column_id != status_col_id:
            msg = f"Column {column_id} != status column ({status_col_id}), ignoring"
            logger.info(f"[wallet_webhook] {msg}")
            await self._log_event(event, "ignored", msg)
            return {"status": "ignored", "reason": msg}

        # Determine action from webhook value
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
            msg = f"Status '{status_label}' not in ['{add_label}', '{deduct_label}']"
            logger.info(f"[wallet_webhook] Ignored: {msg}")
            await self._log_event(event, "ignored", msg)
            return {"status": "ignored", "reason": msg}

        # Fetch item data (email, amounts — all at item level)
        item_data = await self._fetch_item(item_id, column_mapping)
        if not item_data:
            msg = f"Could not fetch item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        email = item_data.get("email")
        note = item_data.get("note", "")

        # Pick amount from the correct column based on action
        if action == "topup":
            amount = item_data.get("amount_topup") or item_data.get("amount_deduct")
        else:
            amount = item_data.get("amount_deduct") or item_data.get("amount_topup")

        if not email:
            msg = f"No email found on item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        if not amount or amount == 0:
            msg = f"Amount is zero or missing on item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        amount = abs(amount)

        # Find user by email
        user = await db.auth_users.find_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        if not user:
            msg = f"User not found: {email}"
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
                    reference=f"monday_item_{item_id}",
                    description=note or f"Wallet top-up via Monday.com (Item #{item_id})"
                )
            else:
                transaction = await wallet_service.charge(
                    user_id=user_id,
                    amount=amount,
                    currency=Currency.USD,
                    description=note or f"Wallet deduction via Monday.com (Item #{item_id})",
                    reference_type="monday_webhook",
                    reference_id=f"monday_item_{item_id}"
                )

            result = {
                "status": "success",
                "action": action,
                "user_id": user_id,
                "email": email,
                "amount": amount,
                "transaction_id": transaction.get("transaction_id")
            }

            logger.info(
                f"[wallet_webhook] Wallet {action}: user={user_id}, "
                f"amount=${amount:.2f}, txn={transaction.get('transaction_id')}"
            )

            await self._log_event(event, "success", f"{action} ${amount:.2f} for {email}", result)
            await self._post_confirmation(item_id, action, amount, user.get("name", email))

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

    async def _fetch_item(self, item_id: str, column_mapping: Dict) -> Optional[Dict]:
        """Fetch all mapped columns from a single item."""
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

            result = {"name": items[0].get("name", "")}
            email_col = column_mapping.get("email", "email_mm0f7cg8")
            amount_col = column_mapping.get("amount", "numeric_mm0fgnq9")
            note_col = column_mapping.get("note", "text_mm0fpbht")

            for col in items[0].get("column_values", []):
                col_id = col.get("id", "")
                text = col.get("text") or ""
                value = col.get("value") or ""

                if col_id == email_col:
                    result["email"] = self._extract_email(text or value)
                elif col_id == amount_col:
                    result["amount"] = self._parse_number(text or value)
                elif col_id == note_col:
                    result["note"] = text

            logger.info(f"[wallet_webhook] Item data: {result}")
            return result
        except Exception as e:
            logger.error(f"[wallet_webhook] Failed to fetch item {item_id}: {e}")
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
        if not value:
            return None
        try:
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
        if not value:
            return None
        try:
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
        from modules.integrations.monday.webhook_router import unregister_handler, get_registered_boards
        for old_board in get_registered_boards():
            unregister_handler(old_board)
        config = await self.get_config()
        board_id = config.get("board_id")
        if board_id:
            register_handler(str(board_id), self.handle_webhook)
            logger.info(f"Wallet registered webhook for board: {board_id}")
        else:
            logger.warning("Wallet board_id is not configured, no handler registered")


# Singleton
wallet_monday_adapter = WalletMondayAdapter()
