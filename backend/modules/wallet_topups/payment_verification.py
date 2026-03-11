"""
Payment Verification Service
Handles the payment verification pipeline:
1. Detect: Parse bank email → match user → create Monday item
2. Verify: ZeroWork checks bank (external) → updates Monday status
3. Act: Monday webhook → auto-credit wallet when "Top Up" action is set

Monday.com Board: Chipi Wallet (18399650704)
Group: Payment Verification (group_mm1bcd7k)
"""
import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, List

from core.database import db
from modules.integrations.monday.core_client import monday_client

logger = logging.getLogger(__name__)

# Monday.com column IDs for Chipi Wallet board
WALLET_BOARD_ID = "18399650704"
VERIFICATION_GROUP = "group_mm1bcd7k"

# Column IDs
COL = {
    "client_name": "text_mm1bhgry",
    "email": "email_mm0f7cg8",
    "top_up": "numeric_mm0ff8j3",
    "status": "status",
    "date": "date4",
    "bank_account": "color_mm1baq25",
    "bank_reference": "text_mm1b94c1",
    "verification": "color_mm1bsdk8",
    "action": "color_mm1bw8z0",
    "retry_count": "numeric_mm1bekd3",
    "verified_amount": "numeric_mm1bv9z0",
    "txn_date": "date_mm1bmw3n",
    "chipi_user_id": "text_mm1bnf5r",
}


class PaymentVerificationService:

    async def process_bank_alert(self, email_data: Dict) -> Dict:
        """
        Step 1: Process a bank email alert.
        Parses email, matches user, creates Monday board item.
        
        email_data: {
            subject: str,
            body: str,
            from: str,
            date: str,
            amount: float (if already parsed),
            reference: str (if already parsed),
        }
        """
        # Parse payment details from email
        amount = email_data.get("amount") or self._parse_amount(email_data.get("body", ""))
        reference = email_data.get("reference") or self._parse_reference(email_data.get("body", ""))
        bank_account = self._detect_bank_account(
            email_data.get("subject", ""),
            email_data.get("body", "")
        )
        sender_hint = email_data.get("sender_name", "")

        # Match user in ChiPi Link
        user_match = await self._match_user(amount, sender_hint, reference)

        client_name = "Unknown"
        client_email = ""
        chipi_user_id = ""

        if user_match:
            client_name = f"{user_match.get('name', '')} {user_match.get('last_name', '')}".strip()
            client_email = user_match.get("email", "")
            chipi_user_id = user_match.get("user_id", "")
        elif sender_hint:
            client_name = sender_hint

        # Create Monday board item
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        column_values = {
            COL["client_name"]: client_name,
            COL["email"]: {"email": client_email, "text": client_email} if client_email else "",
            COL["top_up"]: str(amount) if amount else "",
            COL["date"]: {"date": today},
            COL["bank_account"]: {"label": bank_account},
            COL["bank_reference"]: reference or "",
            COL["verification"]: {"label": "Pending"},
            COL["action"]: {"label": "None"},
            COL["retry_count"]: "0",
            COL["chipi_user_id"]: chipi_user_id,
        }

        item_name = f"${amount:.2f} — {client_name}" if amount else f"Payment — {client_name}"

        try:
            item_id = await monday_client.create_item(
                WALLET_BOARD_ID,
                item_name,
                column_values=column_values,
                group_id=VERIFICATION_GROUP,
                create_labels_if_missing=True,
            )
            logger.info(f"[payment_verify] Created Monday item {item_id}: {item_name}")
        except Exception as e:
            logger.error(f"[payment_verify] Failed to create Monday item: {e}")
            item_id = None

        # Also store in local DB for the verification portal
        record = {
            "record_id": f"pv_{uuid.uuid4().hex[:10]}",
            "monday_item_id": item_id,
            "client_name": client_name,
            "client_email": client_email,
            "chipi_user_id": chipi_user_id,
            "amount": amount,
            "bank_account": bank_account,
            "bank_reference": reference,
            "verification_status": "pending",
            "action": "none",
            "retry_count": 0,
            "email_subject": email_data.get("subject", ""),
            "email_date": email_data.get("date", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.payment_verifications.insert_one(record)
        record.pop("_id", None)

        return {"success": True, "record": record, "monday_item_id": item_id}

    async def handle_verification_webhook(self, data: Dict) -> Dict:
        """
        Step 2 result: ZeroWork (or manual) updates verification status.
        Called when Monday.com Verification column changes.
        
        data: {
            item_id: str,
            verification_status: str (Received/Not Found 1/3/etc),
            verified_amount: float (optional),
            txn_date: str (optional),
        }
        """
        item_id = str(data.get("item_id", ""))
        new_status = data.get("verification_status", "")

        # Update local record
        record = await db.payment_verifications.find_one(
            {"monday_item_id": item_id}, {"_id": 0}
        )
        if not record:
            logger.warning(f"[payment_verify] No local record for Monday item {item_id}")
            return {"success": False, "error": "Record not found"}

        update = {
            "verification_status": new_status.lower().replace(" ", "_"),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if data.get("verified_amount"):
            update["verified_amount"] = float(data["verified_amount"])
        if data.get("txn_date"):
            update["txn_date"] = data["txn_date"]

        # Track retry count
        if "not_found" in new_status.lower():
            update["retry_count"] = record.get("retry_count", 0) + 1

        await db.payment_verifications.update_one(
            {"monday_item_id": item_id},
            {"$set": update}
        )

        logger.info(f"[payment_verify] Updated {item_id}: {new_status}")
        return {"success": True, "status": new_status}

    async def handle_action_webhook(self, data: Dict) -> Dict:
        """
        Step 3: Monday.com Action column changed to "Top Up".
        Auto-credits the user's wallet.
        
        data: {
            item_id: str,
            action: str (Top Up/Done/Verify Only),
        }
        """
        item_id = str(data.get("item_id", ""))
        action = data.get("action", "")

        record = await db.payment_verifications.find_one(
            {"monday_item_id": item_id}, {"_id": 0}
        )
        if not record:
            return {"success": False, "error": "Record not found"}

        if action.lower() == "top up":
            user_id = record.get("chipi_user_id")
            amount = record.get("verified_amount") or record.get("amount", 0)

            if not user_id:
                logger.warning(f"[payment_verify] Cannot top up — no user_id for item {item_id}")
                return {"success": False, "error": "No ChiPi user linked"}

            if not amount or amount <= 0:
                return {"success": False, "error": "Invalid amount"}

            # Credit wallet
            try:
                await self._credit_wallet(user_id, amount, record.get("bank_reference", ""))
                
                # Update Monday Action to Done
                await monday_client.update_column_values(
                    WALLET_BOARD_ID, item_id,
                    {COL["action"]: {"label": "Done"}},
                    create_labels_if_missing=True,
                )

                # Update local record
                await db.payment_verifications.update_one(
                    {"monday_item_id": item_id},
                    {"$set": {
                        "action": "done",
                        "wallet_credited": True,
                        "credited_at": datetime.now(timezone.utc).isoformat(),
                        "credited_amount": amount,
                    }}
                )

                logger.info(f"[payment_verify] Wallet credited: {user_id} +${amount}")
                return {"success": True, "credited": amount, "user_id": user_id}

            except Exception as e:
                logger.error(f"[payment_verify] Wallet credit failed: {e}")
                return {"success": False, "error": str(e)}

        elif action.lower() in ("done", "verify only"):
            await db.payment_verifications.update_one(
                {"monday_item_id": item_id},
                {"$set": {"action": action.lower().replace(" ", "_"), "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"success": True, "action": action}

        return {"success": True}

    async def search_payments(self, query: str = "", status: str = None, 
                               bank: str = None, limit: int = 50) -> List[Dict]:
        """Search payment verification records for the portal."""
        match = {}
        if query:
            match["$or"] = [
                {"client_name": {"$regex": query, "$options": "i"}},
                {"client_email": {"$regex": query, "$options": "i"}},
                {"bank_reference": {"$regex": query, "$options": "i"}},
            ]
        if status:
            match["verification_status"] = status
        if bank:
            match["bank_account"] = bank

        records = await db.payment_verifications.find(
            match, {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)

        return records

    async def get_stats(self) -> Dict:
        """Get payment verification stats."""
        total = await db.payment_verifications.count_documents({})
        pending = await db.payment_verifications.count_documents({"verification_status": "pending"})
        received = await db.payment_verifications.count_documents({"verification_status": "received"})
        not_found = await db.payment_verifications.count_documents({"verification_status": {"$regex": "not_found"}})
        credited = await db.payment_verifications.count_documents({"wallet_credited": True})
        return {
            "total": total, "pending": pending, "received": received,
            "not_found": not_found, "credited": credited,
        }

    # ═══ Private Helpers ═══

    async def _match_user(self, amount: float, name_hint: str, reference: str) -> Optional[Dict]:
        """Try to match payment to a ChiPi user."""
        from core.constants import AuthCollections

        # Try by name hint (fuzzy)
        if name_hint and len(name_hint) > 2:
            parts = name_hint.strip().split()
            for part in parts:
                if len(part) < 3:
                    continue
                user = await db[AuthCollections.USERS].find_one(
                    {"$or": [
                        {"name": {"$regex": part, "$options": "i"}},
                        {"last_name": {"$regex": part, "$options": "i"}},
                        {"email": {"$regex": part, "$options": "i"}},
                    ]},
                    {"_id": 0, "user_id": 1, "name": 1, "last_name": 1, "email": 1}
                )
                if user:
                    return user

        # Try by matching pending order amount
        if amount and amount > 0:
            order = await db.store_textbook_orders.find_one(
                {"total_amount": amount, "status": {"$in": ["awaiting_link", "submitted"]}},
                {"_id": 0, "user_id": 1, "student_name": 1}
            )
            if order and order.get("user_id"):
                user = await db[AuthCollections.USERS].find_one(
                    {"user_id": order["user_id"]},
                    {"_id": 0, "user_id": 1, "name": 1, "last_name": 1, "email": 1}
                )
                if user:
                    return user

        return None

    async def _credit_wallet(self, user_id: str, amount: float, reference: str):
        """Credit user's ChiPi wallet."""
        now = datetime.now(timezone.utc).isoformat()
        
        # Update wallet balance
        await db.user_wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {"balance": amount},
                "$set": {"updated_at": now},
            },
            upsert=True,
        )

        # Record transaction
        await db.wallet_transactions.insert_one({
            "transaction_id": f"txn_{uuid.uuid4().hex[:10]}",
            "user_id": user_id,
            "type": "credit",
            "amount": amount,
            "source": "bank_verification",
            "reference": reference,
            "created_at": now,
        })

    def _parse_amount(self, text: str) -> Optional[float]:
        """Extract dollar amount from email text."""
        patterns = [
            r'\$\s*([\d,]+\.?\d*)',
            r'USD\s*([\d,]+\.?\d*)',
            r'monto[:\s]*([\d,]+\.?\d*)',
            r'amount[:\s]*([\d,]+\.?\d*)',
            r'B/\.\s*([\d,]+\.?\d*)',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", ""))
                except ValueError:
                    continue
        return None

    def _parse_reference(self, text: str) -> Optional[str]:
        """Extract bank reference number from email text."""
        patterns = [
            r'(?:ref|reference|referencia|comprobante)[#:\s]*([A-Z0-9\-]+)',
            r'(?:TRF|ACH|transfer)[#:\-\s]*([A-Z0-9\-]+)',
            r'#(\d{6,})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _detect_bank_account(self, subject: str, body: str) -> str:
        """Detect which bank account received the payment."""
        text = f"{subject} {body}".lower()
        if "books de light" in text or "books" in text:
            return "Books de Light"
        if "it community" in text or "community" in text:
            return "IT Community Inc"
        return "Books de Light"  # Default


payment_verification_service = PaymentVerificationService()
