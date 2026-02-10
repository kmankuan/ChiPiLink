"""
Wallet Monday.com Adapter
Handles wallet top-up / deduction events from the "Customers Admin" board.

Board structure:
  - Items = Customers (identified by email column)
  - Subitems = Wallet events (bank transfers, adjustments, etc.)
    - "Chipi Wallet" column = amount (positive = top-up, negative = deduct)
    - "Chipi Note" column = description/annotation
    - Status column = "Add Wallet" or "Deduct Wallet"

Webhook triggers:
  - Subitem status change to "Add Wallet" → deposit to user's wallet
  - Subitem status change to "Deduct Wallet" → charge from user's wallet

Config namespace: users.wallet.*
"""
import logging
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

    # Status labels that trigger wallet operations
    STATUS_ADD = "Add Wallet"
    STATUS_DEDUCT = "Deduct Wallet"

    # Default column mapping (admin can override via config)
    DEFAULT_COLUMN_MAPPING = {
        "email": "email",           # email column on parent item (customer)
    }

    DEFAULT_SUBITEM_COLUMN_MAPPING = {
        "amount": "chipi_wallet",   # column id for Chipi Wallet (numbers)
        "note": "chipi_note",       # column id for Chipi Note (text)
        "status": "status",         # status column
    }

    async def get_config(self) -> Dict:
        """Get full wallet Monday config"""
        board = await self.get_board_config()
        mapping = await self.get_custom_config("column_mapping")
        subitem_mapping = await self.get_custom_config("subitem_column_mapping")
        return {
            "board_id": board.get("board_id"),
            "column_mapping": mapping.get("mapping", self.DEFAULT_COLUMN_MAPPING),
            "subitem_column_mapping": subitem_mapping.get("mapping", self.DEFAULT_SUBITEM_COLUMN_MAPPING),
            "enabled": board.get("enabled", True),
        }

    async def save_config(self, data: Dict) -> bool:
        """Save full wallet Monday config"""
        await self.save_board_config({
            "board_id": data.get("board_id"),
            "enabled": data.get("enabled", True),
        })
        if "column_mapping" in data:
            await self.save_custom_config("column_mapping", {"mapping": data["column_mapping"]})
        if "subitem_column_mapping" in data:
            await self.save_custom_config("subitem_column_mapping", {"mapping": data["subitem_column_mapping"]})
        return True

    # ---- Webhook Handler ----

    async def handle_webhook(self, event: Dict) -> Dict:
        """
        Handle incoming Monday.com webhook for wallet events.
        
        Monday.com sends subitem column change events with:
          - boardId: main board
          - pulseId: the subitem ID
          - parentItemId: the customer item ID
          - columnId: which column changed
          - value: new column value
        """
        subitem_id = str(event.get("pulseId", ""))
        parent_item_id = str(event.get("parentItemId", ""))
        column_id = event.get("columnId", "")

        logger.info(
            f"[wallet_webhook] Event: subitem={subitem_id}, "
            f"parent={parent_item_id}, column={column_id}"
        )

        # Only process status column changes
        config = await self.get_config()
        subitem_mapping = config.get("subitem_column_mapping", self.DEFAULT_SUBITEM_COLUMN_MAPPING)
        status_col_id = subitem_mapping.get("status", "status")

        # Check if this is a status change
        if column_id and column_id != status_col_id:
            return {"status": "ignored", "reason": f"Column {column_id} is not the status column"}

        # Determine action from status label
        new_value = event.get("value", {})
        status_label = self._extract_status_label(new_value)

        if status_label not in (self.STATUS_ADD, self.STATUS_DEDUCT):
            return {"status": "ignored", "reason": f"Status '{status_label}' is not a wallet action"}

        action = "topup" if status_label == self.STATUS_ADD else "deduct"

        # Fetch subitem details to get amount and note
        subitem_data = await self._fetch_subitem(subitem_id, subitem_mapping)
        if not subitem_data:
            return {"status": "error", "detail": f"Could not fetch subitem {subitem_id}"}

        amount = subitem_data.get("amount")
        note = subitem_data.get("note", "")

        if not amount or amount == 0:
            return {"status": "error", "detail": "Amount is zero or missing in Chipi Wallet column"}

        # Use absolute value — the status determines the action
        amount = abs(amount)

        # Fetch parent item to identify the customer
        column_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        customer_email = await self._fetch_customer_email(parent_item_id, column_mapping)
        if not customer_email:
            return {"status": "error", "detail": f"Could not find email for customer item {parent_item_id}"}

        # Find user by email
        user = await db.auth_users.find_one(
            {"email": {"$regex": f"^{customer_email}$", "$options": "i"}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        if not user:
            logger.warning(f"[wallet_webhook] User not found for email: {customer_email}")
            return {"status": "error", "detail": f"User not found: {customer_email}"}

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

            logger.info(
                f"[wallet_webhook] Wallet {action}: user={user_id}, "
                f"amount=${amount:.2f}, txn={transaction.get('transaction_id')}"
            )

            # Post confirmation back to Monday.com item
            await self._post_confirmation(
                parent_item_id, action, amount, user.get("name", customer_email)
            )

            return {
                "status": "success",
                "action": action,
                "user_id": user_id,
                "email": customer_email,
                "amount": amount,
                "transaction_id": transaction.get("transaction_id")
            }

        except ValueError as e:
            logger.error(f"[wallet_webhook] Wallet {action} failed: {e}")
            return {"status": "error", "detail": str(e)}

    # ---- Helper Methods ----

    def _extract_status_label(self, value) -> str:
        """Extract status label text from Monday.com column value"""
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
        """Fetch subitem column values from Monday.com"""
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
            amount_col = subitem_mapping.get("amount", "chipi_wallet")
            note_col = subitem_mapping.get("note", "chipi_note")

            for col in items[0].get("column_values", []):
                col_id = col.get("id", "")
                col_title = (col.get("title") or "").lower()
                text = col.get("text") or ""

                # Match by column id or title
                if col_id == amount_col or "chipi wallet" in col_title or "wallet" in col_title:
                    result["amount"] = self._parse_number(text or col.get("value", ""))
                elif col_id == note_col or "chipi note" in col_title or "note" in col_title:
                    result["note"] = text

            return result
        except Exception as e:
            logger.error(f"[wallet_webhook] Failed to fetch subitem {subitem_id}: {e}")
            return None

    async def _fetch_customer_email(self, item_id: str, column_mapping: Dict) -> Optional[str]:
        """Fetch customer email from parent item"""
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
                col_title = (col.get("title") or "").lower()
                text = col.get("text") or ""
                value = col.get("value") or ""

                if col_id == email_col or "email" in col_title or "correo" in col_title:
                    return self._extract_email(text or value)

            return None
        except Exception as e:
            logger.error(f"[wallet_webhook] Failed to fetch customer item {item_id}: {e}")
            return None

    async def _post_confirmation(self, item_id: str, action: str, amount: float, user_name: str):
        """Post a confirmation update to the Monday.com customer item"""
        try:
            action_text = "topped up" if action == "topup" else "deducted from"
            body = f"Wallet {action_text} ${amount:.2f} for {user_name}"
            await self.client.create_update(item_id, body)
        except Exception as e:
            logger.warning(f"[wallet_webhook] Failed to post confirmation: {e}")

    @staticmethod
    def _parse_number(value: str) -> Optional[float]:
        """Parse a number from a Monday.com column value"""
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
        """Extract email from a Monday.com column value"""
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
        """Register webhook handler for configured board"""
        config = await self.get_config()
        board_id = config.get("board_id")
        if board_id:
            register_handler(str(board_id), self.handle_webhook)
            logger.info(f"Wallet registered webhook for board: {board_id}")


# Singleton
wallet_monday_adapter = WalletMondayAdapter()
