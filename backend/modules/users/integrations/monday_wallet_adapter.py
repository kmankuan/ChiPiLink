"""
Wallet Monday.com Adapter — 2-Way Sync
Syncs users and wallet transactions between the app and the "Chipi Wallet" Monday.com board.

Board structure:
  - Parent Item = User (Name, Email, Status)
  - Subitem = Wallet Transaction (Amount, Note, Event status, Date)

Flows:
  App → Monday.com:
    1. User registers → create parent item (Name + Email)
    2. Wallet transaction (top-up/deduct) → create subitem under user's item

  Monday.com → App:
    3. Admin adds subitems, changes parent Status to "Process" → webhook fires
       → backend reads unprocessed subitems → processes wallet transactions

Config namespace: users.wallet.*
"""
import logging
import json
import re
from datetime import datetime, timezone
from typing import Dict, Optional, List

from modules.integrations.monday.base_adapter import BaseMondayAdapter
from modules.integrations.monday.webhook_router import register_handler
from modules.users.services.wallet_service import wallet_service
from modules.users.models.wallet_models import Currency, PaymentMethod
from core.database import db

logger = logging.getLogger(__name__)


class WalletMondayAdapter(BaseMondayAdapter):
    MODULE = "users"
    ENTITY = "wallet"

    # Parent item columns
    DEFAULT_COLUMN_MAPPING = {
        "email": "email_mm0f7cg8",
        "amount_topup": "numeric_mm0ff8j3",
        "amount_deduct": "numeric_mm0f60w7",
        "status": "status",
    }

    # Subitem columns
    DEFAULT_SUBITEM_MAPPING = {
        "amount": "numeric_mm0fgnq9",
        "note": "text_mm0fpbht",
        "event": "status",
        "date": "date0",
    }

    # Subitem status labels (different from parent board)
    DEFAULT_SUBITEM_STATUS_LABELS = {
        "add": "Added",
        "deduct": "Deducted",
        "stuck": "Stuck",
    }

    DEFAULT_STATUS_LABELS = {
        "add": "Top Up",
        "deduct": "Deduct",
        "process": "Process",
        "stuck": "Stuck",
    }

    async def get_config(self) -> Dict:
        board = await self.get_board_config()
        mapping = await self.get_custom_config("column_mapping")
        sub_mapping = await self.get_custom_config("subitem_column_mapping")
        status_labels = await self.get_custom_config("status_labels")
        sub_status_labels = await self.get_custom_config("subitem_status_labels")
        return {
            "board_id": board.get("board_id"),
            "column_mapping": mapping.get("mapping", self.DEFAULT_COLUMN_MAPPING),
            "subitem_mapping": sub_mapping.get("mapping", self.DEFAULT_SUBITEM_MAPPING),
            "status_labels": status_labels.get("labels", self.DEFAULT_STATUS_LABELS),
            "subitem_status_labels": sub_status_labels.get("labels", self.DEFAULT_SUBITEM_STATUS_LABELS),
            "enabled": board.get("enabled", True),
        }

    async def save_config(self, data: Dict) -> bool:
        await self.save_board_config({
            "board_id": data.get("board_id"),
            "enabled": data.get("enabled", True),
        })
        if "column_mapping" in data:
            await self.save_custom_config("column_mapping", {"mapping": data["column_mapping"]})
        if "subitem_mapping" in data:
            await self.save_custom_config("subitem_column_mapping", {"mapping": data["subitem_mapping"]})
        if "status_labels" in data:
            await self.save_custom_config("status_labels", {"labels": data["status_labels"]})
        return True

    # ================================================================
    # APP → MONDAY.COM: Create items & subitems
    # ================================================================

    async def sync_user_to_monday(self, user_id: str, name: str, email: str) -> Optional[str]:
        """Create a parent item on Chipi Wallet board for a new user.
        Returns the Monday.com item ID, or None on failure."""
        config = await self.get_config()
        board_id = config.get("board_id")
        if not board_id:
            logger.warning("[monday_sync] No board configured, skipping user sync")
            return None

        # Check if user already has a Monday.com item
        existing = await db.monday_user_items.find_one(
            {"user_id": user_id}, {"_id": 0, "monday_item_id": 1}
        )
        if existing:
            logger.info(f"[monday_sync] User {email} already has Monday item {existing['monday_item_id']}")
            return existing["monday_item_id"]

        col_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        email_col = col_mapping.get("email", "email_mm0f7cg8")

        try:
            col_values = json.dumps({
                email_col: {"email": email, "text": email}
            })
            data = await self.client.execute(f"""
                mutation {{
                    create_item(
                        board_id: {board_id},
                        item_name: {json.dumps(name or email)},
                        column_values: {json.dumps(col_values)}
                    ) {{ id }}
                }}
            """)
            item_id = data.get("create_item", {}).get("id")
            if item_id:
                await db.monday_user_items.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "user_id": user_id,
                        "email": email,
                        "monday_item_id": item_id,
                        "board_id": board_id,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }},
                    upsert=True,
                )
                logger.info(f"[monday_sync] Created Monday item {item_id} for user {email}")
            return item_id
        except Exception as e:
            logger.error(f"[monday_sync] Failed to create item for {email}: {e}")
            return None

    async def _get_subitem_board_id(self) -> str:
        """Get the subitem board ID dynamically. Falls back to fetching from Monday.com API."""
        config = await self.get_config()
        sub_board = config.get("subitem_board_id")
        if sub_board:
            return sub_board
        # Fallback: try to detect from first user's subitems
        board_id = config.get("board_id")
        if board_id:
            try:
                data = await self.client.execute(f"""
                    query {{ boards(ids: [{board_id}]) {{ columns {{ id type settings_str }} }} }}
                """)
                for col in data.get("boards", [{}])[0].get("columns", []):
                    if col.get("type") == "subtasks":
                        import json as _json
                        settings = _json.loads(col.get("settings_str", "{}"))
                        bid = settings.get("boardIds", [None])[0]
                        if bid:
                            # Cache it
                            await self.save_custom_config("subitem_board_id", {"board_id": str(bid)})
                            return str(bid)
            except Exception as e:
                logger.warning(f"[monday_sync] Could not detect subitem board: {e}")
        return ""

    async def sync_transaction_to_monday(
        self, user_id: str, amount: float, action: str, description: str = ""
    ) -> Optional[str]:
        """Create a subitem under the user's Monday.com item for a wallet transaction.
        Returns the subitem ID, or None on failure."""
        config = await self.get_config()
        board_id = config.get("board_id")
        if not board_id:
            return None

        # Find user's Monday.com item
        user_item = await db.monday_user_items.find_one(
            {"user_id": user_id}, {"_id": 0, "monday_item_id": 1, "email": 1}
        )
        if not user_item:
            # Try to create the item first
            user_doc = await db.auth_users.find_one(
                {"user_id": user_id}, {"_id": 0, "name": 1, "email": 1}
            )
            if user_doc:
                item_id = await self.sync_user_to_monday(
                    user_id, user_doc.get("name", ""), user_doc["email"]
                )
                if not item_id:
                    return None
                user_item = {"monday_item_id": item_id}
            else:
                return None

        parent_id = user_item["monday_item_id"]
        sub_mapping = config.get("subitem_mapping", self.DEFAULT_SUBITEM_MAPPING)
        sub_status_labels = config.get("subitem_status_labels", self.DEFAULT_SUBITEM_STATUS_LABELS)

        amount_col = sub_mapping.get("amount", "numeric_mm0fgnq9")
        note_col = sub_mapping.get("note", "text_mm0fpbht")
        event_col = sub_mapping.get("event", "status")
        date_col = sub_mapping.get("date", "date0")

        event_label = sub_status_labels.get("add", "Added") if action == "topup" else sub_status_labels.get("deduct", "Deducted")
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        try:
            col_values = json.dumps({
                amount_col: str(abs(amount)),
                note_col: description or "",
                date_col: {"date": today},
            })
            subitem_name = f"{'+'if action=='topup'else'-'}${abs(amount):.2f}"

            data = await self.client.execute(f"""
                mutation {{
                    create_subitem(
                        parent_item_id: {parent_id},
                        item_name: {json.dumps(subitem_name)},
                        column_values: {json.dumps(col_values)}
                    ) {{ id }}
                }}
            """)
            subitem_id = data.get("create_subitem", {}).get("id")
            if subitem_id:
                # Set the event status via change_simple_column_value
                try:
                    sub_board_id = await self._get_subitem_board_id()
                    if sub_board_id:
                        await self.client.execute(f"""
                            mutation {{
                                change_simple_column_value(
                                    item_id: {subitem_id},
                                    board_id: {sub_board_id},
                                    column_id: "{event_col}",
                                    value: {json.dumps(event_label)}
                                ) {{ id }}
                            }}
                        """)
                except Exception:
                    pass  # Non-critical: subitem still created
                logger.info(f"[monday_sync] Created subitem {subitem_id} under item {parent_id}")
            return subitem_id
        except Exception as e:
            logger.error(f"[monday_sync] Failed to create subitem for user {user_id}: {e}")
            return None

    # ================================================================
    # MONDAY.COM → APP: Webhook handler (parent Status = "Process")
    # ================================================================

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
                "value": str(event.get("value", ""))[:200],
            },
            "result": result,
        }
        await db.wallet_webhook_logs.insert_one(doc)

    async def handle_webhook(self, event: Dict) -> Dict:
        """Handle incoming webhook. Supports two modes:
        1. Parent status → "Process": reads all unprocessed subitems, processes them
        2. Parent status → "Top Up"/"Deducted": item-level single transaction (legacy)
        """
        item_id = str(event.get("pulseId", ""))
        column_id = event.get("columnId", "")
        new_value = event.get("value", {})
        status_label = self._extract_status_label(new_value)

        logger.info(f"[wallet_webhook] Event: item={item_id}, col={column_id}, label='{status_label}'")

        config = await self.get_config()
        status_labels = config.get("status_labels", self.DEFAULT_STATUS_LABELS)
        process_label = status_labels.get("process", "Process")
        add_label = status_labels.get("add", "Top Up")
        deduct_label = status_labels.get("deduct", "Deducted")

        if status_label == process_label:
            # Mode 1: Process all subitems
            return await self._process_subitems(item_id, config, event)
        elif status_label == add_label:
            # Mode 2: Legacy item-level top-up
            return await self._process_item_level(item_id, "topup", config, event)
        elif status_label == deduct_label:
            return await self._process_item_level(item_id, "deduct", config, event)
        else:
            msg = f"Status '{status_label}' not actionable (col={column_id})"
            logger.info(f"[wallet_webhook] Ignored: {msg}")
            await self._log_event(event, "ignored", msg)
            return {"status": "ignored", "reason": msg}

    async def _process_subitems(self, parent_item_id: str, config: Dict, event: Dict) -> Dict:
        """Process all unprocessed subitems under a parent item."""
        col_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        sub_mapping = config.get("subitem_mapping", self.DEFAULT_SUBITEM_MAPPING)

        # Fetch parent item email
        email = await self._get_item_email(parent_item_id, col_mapping)
        if not email:
            msg = f"No email found on parent item {parent_item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        # Find user
        user = await db.auth_users.find_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        if not user:
            msg = f"User not found: {email}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        # Fetch subitems
        subitems = await self._fetch_subitems(parent_item_id, sub_mapping)
        if not subitems:
            msg = f"No subitems found on item {parent_item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        # Get already-processed subitem IDs from DB to avoid re-processing
        processed_cursor = db.monday_processed_subitems.find(
            {"parent_item_id": parent_item_id}, {"_id": 0, "subitem_id": 1}
        )
        processed_ids = {doc["subitem_id"] async for doc in processed_cursor}

        sub_status_labels = config.get("subitem_status_labels", self.DEFAULT_SUBITEM_STATUS_LABELS)
        add_label = sub_status_labels.get("add", "Added")
        deduct_label = sub_status_labels.get("deduct", "Deducted")
        results = []

        for sub in subitems:
            sub_event = sub.get("event_label", "")
            amount = sub.get("amount")
            note = sub.get("note", "")
            sub_id = sub.get("id")

            # Skip already processed or non-actionable subitems
            if sub_id in processed_ids:
                continue
            if sub_event != add_label and sub_event != deduct_label:
                continue
            if not amount or amount == 0:
                continue

            amount = abs(amount)
            action = "topup" if sub_event == add_label else "deduct"

            try:
                from modules.users.routes.wallet import _get_default_description
                if action == "topup":
                    desc = note or await _get_default_description("monday_topup")
                    tx = await wallet_service.deposit(
                        user_id=user["user_id"], amount=amount,
                        currency=Currency.USD, payment_method=PaymentMethod.BANK_TRANSFER,
                        reference=f"monday_sub_{sub_id}",
                        description=desc,
                    )
                else:
                    desc = note or await _get_default_description("monday_deduct")
                    tx = await wallet_service.charge(
                        user_id=user["user_id"], amount=amount,
                        currency=Currency.USD, description=desc,
                        reference_type="monday_webhook",
                        reference_id=f"monday_sub_{sub_id}",
                    )

                results.append({"sub_id": sub_id, "action": action, "amount": amount, "status": "success"})

                # Track as processed in DB
                await db.monday_processed_subitems.insert_one({
                    "subitem_id": sub_id,
                    "parent_item_id": parent_item_id,
                    "action": action,
                    "amount": amount,
                    "processed_at": datetime.now(timezone.utc).isoformat(),
                })

            except ValueError as e:
                results.append({"sub_id": sub_id, "action": action, "error": str(e)})

        # Post confirmation update on the Monday item
        if results:
            await self._post_confirmation_subitems(parent_item_id, results, user.get("name", email))

        summary = f"Processed {len(results)} subitems for {email}"
        await self._log_event(event, "success", summary, {"results": results, "email": email})
        logger.info(f"[wallet_webhook] {summary}")
        return {"status": "success", "processed": len(results), "results": results}

    async def _process_item_level(self, item_id: str, action: str, config: Dict, event: Dict) -> Dict:
        """Legacy: Process a single item-level transaction (no subitems)."""
        col_mapping = config.get("column_mapping", self.DEFAULT_COLUMN_MAPPING)
        item_data = await self._fetch_item(item_id, col_mapping)
        if not item_data:
            msg = f"Could not fetch item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        email = item_data.get("email")
        if not email:
            msg = f"No email on item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        amount = item_data.get("amount_topup") if action == "topup" else item_data.get("amount_deduct")
        amount = amount or item_data.get("amount_topup") or item_data.get("amount_deduct")
        if not amount or amount == 0:
            msg = f"Amount missing on item {item_id}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        amount = abs(amount)
        user = await db.auth_users.find_one(
            {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
            {"_id": 0, "user_id": 1, "email": 1, "name": 1}
        )
        if not user:
            msg = f"User not found: {email}"
            await self._log_event(event, "error", msg)
            return {"status": "error", "detail": msg}

        try:
            from modules.users.routes.wallet import _get_default_description
            if action == "topup":
                desc = await _get_default_description("monday_topup")
                tx = await wallet_service.deposit(
                    user_id=user["user_id"], amount=amount,
                    currency=Currency.USD, payment_method=PaymentMethod.BANK_TRANSFER,
                    reference=f"monday_item_{item_id}", description=desc,
                )
            else:
                desc = await _get_default_description("monday_deduct")
                tx = await wallet_service.charge(
                    user_id=user["user_id"], amount=amount,
                    currency=Currency.USD, description=desc,
                    reference_type="monday_webhook", reference_id=f"monday_item_{item_id}",
                )
            result = {"action": action, "email": email, "amount": amount, "tx": tx.get("transaction_id")}
            await self._log_event(event, "success", f"{action} ${amount:.2f} for {email}", result)
            return {"status": "success", **result}
        except ValueError as e:
            await self._log_event(event, "error", str(e))
            return {"status": "error", "detail": str(e)}

    # ================================================================
    # HELPERS
    # ================================================================

    async def _get_item_email(self, item_id: str, col_mapping: Dict) -> Optional[str]:
        email_col = col_mapping.get("email", "email_mm0f7cg8")
        try:
            data = await self.client.execute(
                f"""query {{ items(ids: [{item_id}]) {{ column_values {{ id text value }} }} }}"""
            )
            items = data.get("items", [])
            if not items:
                return None
            for col in items[0].get("column_values", []):
                if col["id"] == email_col:
                    return self._extract_email(col.get("text") or col.get("value") or "")
        except Exception as e:
            logger.error(f"[monday_sync] Failed to get email for item {item_id}: {e}")
        return None

    async def _fetch_subitems(self, parent_item_id: str, sub_mapping: Dict) -> List[Dict]:
        amount_col = sub_mapping.get("amount", "numeric_mm0fgnq9")
        note_col = sub_mapping.get("note", "text_mm0fpbht")
        event_col = sub_mapping.get("event", "status")
        try:
            data = await self.client.execute(f"""
                query {{ items(ids: [{parent_item_id}]) {{
                    subitems {{ id name column_values {{ id text value }} }}
                }} }}
            """)
            items = data.get("items", [])
            if not items:
                return []
            results = []
            for sub in items[0].get("subitems", []):
                entry = {"id": sub["id"], "name": sub.get("name", "")}
                for col in sub.get("column_values", []):
                    cid = col["id"]
                    text = col.get("text") or ""
                    value = col.get("value") or ""
                    if cid == amount_col:
                        entry["amount"] = self._parse_number(text or value)
                    elif cid == note_col:
                        entry["note"] = text
                    elif cid == event_col:
                        entry["event_label"] = self._extract_status_from_column(value, text)
                results.append(entry)
            return results
        except Exception as e:
            logger.error(f"[monday_sync] Failed to fetch subitems for {parent_item_id}: {e}")
            return []

    async def _fetch_item(self, item_id: str, col_mapping: Dict) -> Optional[Dict]:
        email_col = col_mapping.get("email", "email_mm0f7cg8")
        topup_col = col_mapping.get("amount_topup", "numeric_mm0ff8j3")
        deduct_col = col_mapping.get("amount_deduct", "numeric_mm0f60w7")
        try:
            data = await self.client.execute(
                f"""query {{ items(ids: [{item_id}]) {{ id name column_values {{ id text value }} }} }}"""
            )
            items = data.get("items", [])
            if not items:
                return None
            result = {"name": items[0].get("name", "")}
            for col in items[0].get("column_values", []):
                cid, text, value = col["id"], col.get("text") or "", col.get("value") or ""
                if cid == email_col:
                    result["email"] = self._extract_email(text or value)
                elif cid == topup_col:
                    result["amount_topup"] = self._parse_number(text or value)
                elif cid == deduct_col:
                    result["amount_deduct"] = self._parse_number(text or value)
            return result
        except Exception as e:
            logger.error(f"[monday_sync] Failed to fetch item {item_id}: {e}")
            return None

    async def _mark_subitem_done(self, subitem_id: str, sub_mapping: dict, done_label: str):
        event_col = sub_mapping.get("event", "status")
        try:
            sub_board_id = await self._get_subitem_board_id()
            if not sub_board_id:
                return
            await self.client.execute(f"""
                mutation {{ change_simple_column_value(
                    item_id: {subitem_id}, board_id: {sub_board_id},
                    column_id: "{event_col}",
                    value: {json.dumps(done_label)}
                ) {{ id }} }}
            """)
        except Exception as e:
            logger.warning(f"[monday_sync] Failed to mark subitem {subitem_id} as done: {e}")

    async def _set_parent_status(self, item_id: str, config: Dict, label: str):
        status_col = config.get("column_mapping", {}).get("status", "status")
        board_id = config.get("board_id", "18399650704")
        try:
            await self.client.execute(f"""
                mutation {{ change_simple_column_value(
                    item_id: {item_id}, board_id: {board_id},
                    column_id: "{status_col}",
                    value: {json.dumps(label)}
                ) {{ id }} }}
            """)
        except Exception as e:
            logger.warning(f"[monday_sync] Failed to set parent status: {e}")

    async def _post_confirmation_subitems(self, item_id: str, results: list, user_name: str):
        try:
            lines = [f"Processed {len(results)} transaction(s) for {user_name}:"]
            for r in results:
                s = "+" if r["action"] == "topup" else "-"
                lines.append(f"  {s}${r['amount']:.2f} — {r.get('status', 'error')}")
            await self.client.create_update(item_id, "\n".join(lines))
        except Exception:
            pass

    def _extract_status_label(self, value) -> str:
        if isinstance(value, dict):
            label = value.get("label") or value.get("name") or value.get("text")
            if isinstance(label, dict):
                return label.get("text") or label.get("name") or ""
            if label:
                return str(label)
            return ""
        if isinstance(value, str):
            try:
                return self._extract_status_label(json.loads(value))
            except (json.JSONDecodeError, TypeError):
                return value.strip()
        return ""

    def _extract_status_from_column(self, value: str, text: str) -> str:
        if text:
            return text
        if value:
            try:
                parsed = json.loads(value)
                if isinstance(parsed, dict):
                    idx = parsed.get("index")
                    if idx is not None:
                        return text or ""
            except (json.JSONDecodeError, TypeError):
                pass
        return text or ""

    @staticmethod
    def _parse_number(value: str) -> Optional[float]:
        if not value:
            return None
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (int, float)):
                return float(parsed)
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
        except (json.JSONDecodeError, TypeError):
            pass
        match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', value)
        return match.group(0) if match else value.strip()

    # ================================================================
    # REGISTRATION & EVENT HANDLERS
    # ================================================================

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
            logger.warning("Wallet board_id not configured")

    def init_event_handlers(self):
        """Subscribe to app events for App→Monday.com sync."""
        from core.events import event_bus, AuthEvents
        event_bus.subscribe_handler(AuthEvents.USER_REGISTERED, self._on_user_registered)
        logger.info("[monday_sync] Subscribed to auth.user.registered event")

    async def _on_user_registered(self, event):
        """Event handler: create Monday.com parent item when user registers."""
        try:
            payload = event.payload
            user_id = payload.get("user_id")
            email = payload.get("email")
            name = payload.get("name", "")
            if user_id and email:
                await self.sync_user_to_monday(user_id, name, email)
        except Exception as e:
            logger.error(f"[monday_sync] Failed to sync new user to Monday.com: {e}")

    async def sync_transaction_if_not_from_monday(
        self, user_id: str, amount: float, action: str, description: str = "", reference: str = ""
    ):
        """Sync a wallet transaction to Monday.com, skipping if it originated from Monday.com."""
        if reference and "monday_" in reference:
            return
        try:
            await self.sync_transaction_to_monday(user_id, amount, action, description)
        except Exception as e:
            logger.error(f"[monday_sync] Background tx sync failed: {e}")


# Singleton
wallet_monday_adapter = WalletMondayAdapter()
