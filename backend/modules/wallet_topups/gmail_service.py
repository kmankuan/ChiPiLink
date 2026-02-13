"""
Gmail IMAP Service - Connects to Gmail, fetches bank alert emails,
parses with AI, applies rules, creates pending top-ups.
"""
import imaplib
import email
from email.header import decode_header
import os
import re
import json
import logging
import uuid
import asyncio
from datetime import datetime, timezone

from core.database import db

logger = logging.getLogger(__name__)

PENDING_COL = "wallet_pending_topups"
RULES_COL = "wallet_topup_rules"
SETTINGS_COL = "wallet_topup_settings"
PROCESSED_COL = "wallet_processed_emails"


class GmailService:
    """IMAP-based Gmail reader for bank alert emails."""

    def __init__(self):
        self.email_addr = os.environ.get("GMAIL_EMAIL", "")
        self.app_password = os.environ.get("GMAIL_APP_PASSWORD", "")
        self.imap_server = "imap.gmail.com"
        self.imap_port = 993

    @property
    def is_configured(self) -> bool:
        return bool(self.email_addr and self.app_password)

    def _connect(self):
        """Create IMAP connection."""
        mail = imaplib.IMAP4_SSL(self.imap_server, self.imap_port)
        mail.login(self.email_addr, self.app_password)
        return mail

    def test_connection(self) -> dict:
        """Test Gmail IMAP connection."""
        if not self.is_configured:
            return {"connected": False, "error": "Gmail credentials not configured"}
        try:
            mail = self._connect()
            mail.select("INBOX")
            status, messages = mail.search(None, "ALL")
            total = len(messages[0].split()) if status == "OK" and messages[0] else 0
            mail.logout()
            return {"connected": True, "email": self.email_addr, "total_emails": total}
        except Exception as e:
            return {"connected": False, "error": str(e)}

    def fetch_recent_emails(self, limit: int = 20, since_date: str = None) -> list:
        """Fetch recent emails from inbox."""
        if not self.is_configured:
            return []
        try:
            mail = self._connect()
            mail.select("INBOX")

            if since_date:
                status, messages = mail.search(None, f'(SINCE "{since_date}")')
            else:
                status, messages = mail.search(None, "ALL")

            if status != "OK" or not messages[0]:
                mail.logout()
                return []

            email_ids = messages[0].split()
            recent_ids = email_ids[-limit:]  # Last N emails

            emails = []
            for eid in reversed(recent_ids):
                status, msg_data = mail.fetch(eid, "(RFC822)")
                if status != "OK":
                    continue
                msg = email.message_from_bytes(msg_data[0][1])

                subject = self._decode_header(msg["Subject"])
                from_addr = self._decode_header(msg["From"])
                date_str = msg["Date"]
                message_id = msg["Message-ID"] or str(eid)

                body = self._extract_body(msg)

                emails.append({
                    "id": message_id,
                    "imap_id": eid.decode(),
                    "from": from_addr,
                    "subject": subject,
                    "date": date_str,
                    "body": body[:3000],
                    "body_preview": body[:500],
                })

            mail.logout()
            return emails
        except Exception as e:
            logger.error(f"Gmail fetch error: {e}")
            return []

    def _decode_header(self, header) -> str:
        if not header:
            return ""
        decoded = decode_header(header)
        parts = []
        for part, charset in decoded:
            if isinstance(part, bytes):
                parts.append(part.decode(charset or "utf-8", errors="replace"))
            else:
                parts.append(str(part))
        return " ".join(parts)

    def _extract_body(self, msg) -> str:
        """Extract text body from email."""
        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                ctype = part.get_content_type()
                if ctype == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode(errors="replace")
                        break
                    except Exception:
                        pass
                elif ctype == "text/html" and not body:
                    try:
                        html = part.get_payload(decode=True).decode(errors="replace")
                        body = re.sub(r"<[^>]+>", " ", html)
                        body = re.sub(r"\s+", " ", body).strip()
                    except Exception:
                        pass
        else:
            try:
                body = msg.get_payload(decode=True).decode(errors="replace")
                if msg.get_content_type() == "text/html":
                    body = re.sub(r"<[^>]+>", " ", body)
                    body = re.sub(r"\s+", " ", body).strip()
            except Exception:
                pass
        return body


async def parse_email_with_ai(email_body: str, email_subject: str, email_from: str) -> dict:
    """Use GPT-4o to parse bank alert email and extract transaction details."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage

        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return {"error": "LLM key not configured", "parsed": False}

        chat = LlmChat(
            api_key=api_key,
            session_id=f"email_parse_{uuid.uuid4()}",
            system_message="""You are a bank email parser. Extract transaction details from bank alert emails.
Return ONLY a JSON object with these fields:
- amount: number (the transaction amount, 0 if not found)
- currency: string (USD, EUR, PAB, etc. Default "USD")
- sender_name: string (who sent the money)
- bank_reference: string (transaction reference/confirmation number)
- transaction_type: string (deposit/transfer/payment/unknown)
- date: string (transaction date if mentioned)
- confidence: number (0-100, how confident you are in the extraction)
- summary: string (one-line summary of the transaction)

If the email is NOT a bank transaction alert, set amount to 0 and confidence to 0.
Return ONLY valid JSON, no markdown or explanation."""
        )
        chat.with_model("openai", "gpt-4o")

        prompt = f"""Parse this bank alert email:

FROM: {email_from}
SUBJECT: {email_subject}
BODY:
{email_body[:2000]}"""

        user_msg = UserMessage(text=prompt)
        response = await chat.send_message(user_msg)

        # Parse JSON from response
        response = response.strip()
        if response.startswith("```"):
            response = re.sub(r"```json?\n?", "", response)
            response = response.replace("```", "")
        parsed = json.loads(response)
        parsed["parsed"] = True
        return parsed

    except json.JSONDecodeError as e:
        logger.error(f"AI parse JSON error: {e}")
        return {"error": f"JSON parse error: {str(e)}", "parsed": False}
    except Exception as e:
        logger.error(f"AI parse error: {e}")
        return {"error": str(e), "parsed": False}


async def apply_rules(email_data: dict, parsed_data: dict) -> dict:
    """Apply email filter rules. Returns {pass: bool, reason: str, auto_approve: bool}."""
    rules = await db[RULES_COL].find_one({"id": "default"}, {"_id": 0})
    if not rules or not rules.get("enabled", True):
        return {"pass": True, "reason": "Rules disabled", "auto_approve": False}

    email_from = (email_data.get("from", "") or "").lower()
    email_body = (email_data.get("body", "") or "").lower()
    email_subject = (email_data.get("subject", "") or "").lower()
    full_text = f"{email_subject} {email_body}"

    # Check sender whitelist
    whitelist = rules.get("sender_whitelist", [])
    if whitelist:
        sender_match = any(s.lower() in email_from for s in whitelist)
        if not sender_match:
            return {"pass": False, "reason": f"Sender not in whitelist: {email_from}"}

    # Check must-not-contain keywords
    must_not = rules.get("must_not_contain_keywords", [])
    for kw in must_not:
        if kw.lower() in full_text:
            return {"pass": False, "reason": f"Contains rejected keyword: '{kw}'"}

    # Check must-contain keywords
    must_contain = rules.get("must_contain_keywords", [])
    if must_contain:
        has_keyword = any(kw.lower() in full_text for kw in must_contain)
        if not has_keyword:
            return {"pass": False, "reason": f"Missing required keywords"}

    # Check amount thresholds
    amount = parsed_data.get("amount", 0)
    max_threshold = rules.get("amount_max_threshold", 10000)
    if amount > max_threshold:
        return {"pass": False, "reason": f"Amount ${amount} exceeds max threshold ${max_threshold}"}

    # Check auto-approve threshold
    auto_approve_threshold = rules.get("amount_auto_approve_threshold", 0)
    auto_approve = auto_approve_threshold > 0 and amount <= auto_approve_threshold

    return {"pass": True, "reason": "All rules passed", "auto_approve": auto_approve}


async def process_email(email_data: dict) -> dict:
    """Full pipeline: check if already processed → parse with AI → apply rules → create pending."""
    email_id = email_data.get("id", "")

    # Check if already processed
    existing = await db[PROCESSED_COL].find_one({"email_id": email_id})
    if existing:
        return {"skipped": True, "reason": "Already processed"}

    # Parse with AI
    parsed = await parse_email_with_ai(
        email_data.get("body", ""),
        email_data.get("subject", ""),
        email_data.get("from", "")
    )

    if not parsed.get("parsed") or parsed.get("amount", 0) <= 0 or parsed.get("confidence", 0) < 30:
        # Mark as processed but not a valid transaction
        await db[PROCESSED_COL].insert_one({
            "email_id": email_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "result": "skipped_not_transaction",
            "parsed_data": parsed,
        })
        return {"skipped": True, "reason": "Not a valid bank transaction", "parsed": parsed}

    # Apply rules
    rule_result = await apply_rules(email_data, parsed)

    if not rule_result["pass"]:
        await db[PROCESSED_COL].insert_one({
            "email_id": email_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "result": "rejected_by_rules",
            "reason": rule_result["reason"],
            "parsed_data": parsed,
        })
        return {"skipped": False, "rejected": True, "reason": rule_result["reason"], "parsed": parsed}

    # Run dedup engine (4 layers)
    from .dedup_engine import check_duplicate
    dedup_result = await check_duplicate(parsed, email_data)

    # Create pending top-up
    doc = {
        "id": str(uuid.uuid4()),
        "status": "pending",
        "amount": float(parsed.get("amount", 0)),
        "currency": parsed.get("currency", "USD"),
        "sender_name": parsed.get("sender_name", ""),
        "sender_ref": "",
        "bank_reference": parsed.get("bank_reference", ""),
        "target_user_id": "",
        "target_user_email": "",
        "source": "gmail",
        "email_subject": email_data.get("subject", ""),
        "email_from": email_data.get("from", ""),
        "email_body_preview": email_data.get("body_preview", ""),
        "ai_parsed_data": parsed,
        "ai_confidence": parsed.get("confidence", 0),
        "rule_match": rule_result["reason"],
        "risk_level": dedup_result.get("risk_level", "clear"),
        "warning_text": dedup_result.get("warning_text", ""),
        "dedup_warnings": dedup_result.get("warnings", []),
        "dedup_matched_items": dedup_result.get("matched_items", []),
        "notes": parsed.get("summary", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "system:gmail",
        "reviewed_by": None,
        "reviewed_at": None,
    }
    await db[PENDING_COL].insert_one(doc)
    doc.pop("_id", None)

    # Mark email as processed
    await db[PROCESSED_COL].insert_one({
        "email_id": email_id,
        "processed_at": datetime.now(timezone.utc).isoformat(),
        "result": "created_pending",
        "topup_id": doc["id"],
        "parsed_data": parsed,
    })

    return {"created": True, "topup": doc, "parsed": parsed, "auto_approve": rule_result.get("auto_approve", False)}


gmail_service = GmailService()
