"""
Monday.com Wallet Webhook Handler
Handles wallet top-up events from the "Customers Admin" board (BDL Transferencia).

Flow:
1. Client makes a bank transfer
2. Bank sends email alert
3. Email is forwarded to Monday.com board "BDL Transferencia" / "Customers Admin"
4. Monday.com automation triggers this webhook
5. We identify the user and top up their wallet
"""
import logging
from typing import Dict, Optional

from core.database import db
from modules.users.services.wallet_service import wallet_service
from modules.users.models.wallet_models import Currency, PaymentMethod

logger = logging.getLogger(__name__)

# Board ID for "Customers Admin" board
CUSTOMERS_ADMIN_BOARD_ID = "5931665026"


async def handle_wallet_topup_webhook(event: Dict) -> Dict:
    """
    Handle incoming webhook from Monday.com Customers Admin board.
    Expects event with column values containing email and amount.
    """
    logger.info(f"[wallet_webhook] Received event: {event}")
    
    pulse_id = event.get("pulseId") or event.get("itemId")
    
    if not pulse_id:
        return {"status": "error", "detail": "No pulseId/itemId in event"}
    
    # Extract column values from the event
    column_values = event.get("columnValues", {})
    
    # Try to get email and amount from event data
    email = None
    amount = None
    customer_name = None
    reference = None
    
    # Parse column values - Monday.com sends these in various formats
    if isinstance(column_values, dict):
        for col_id, col_val in column_values.items():
            val = col_val if isinstance(col_val, str) else col_val.get("value", "") if isinstance(col_val, dict) else str(col_val)
            col_id_lower = col_id.lower()
            
            if "email" in col_id_lower or "correo" in col_id_lower:
                email = _extract_email(val)
            elif "amount" in col_id_lower or "monto" in col_id_lower or "valor" in col_id_lower:
                amount = _extract_amount(val)
            elif "name" in col_id_lower or "nombre" in col_id_lower or "cliente" in col_id_lower:
                customer_name = val
            elif "reference" in col_id_lower or "referencia" in col_id_lower:
                reference = val
    
    # If we don't have the data from columnValues, try to fetch from Monday.com API
    if not email or not amount:
        logger.info(f"[wallet_webhook] Missing data from event, fetching item {pulse_id} from Monday.com")
        item_data = await _fetch_monday_item(pulse_id)
        if item_data:
            if not email:
                email = item_data.get("email")
            if not amount:
                amount = item_data.get("amount")
            if not customer_name:
                customer_name = item_data.get("name")
            if not reference:
                reference = item_data.get("reference")
    
    if not email:
        logger.warning(f"[wallet_webhook] Could not extract email for item {pulse_id}")
        return {"status": "error", "detail": "Could not identify user email"}
    
    if not amount or amount <= 0:
        logger.warning(f"[wallet_webhook] Invalid amount for item {pulse_id}: {amount}")
        return {"status": "error", "detail": "Invalid or missing amount"}
    
    # Find user by email
    user = await db.auth_users.find_one(
        {"email": {"$regex": f"^{email}$", "$options": "i"}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1}
    )
    
    if not user:
        logger.warning(f"[wallet_webhook] User not found for email: {email}")
        return {
            "status": "error",
            "detail": f"User not found for email: {email}"
        }
    
    user_id = user["user_id"]
    
    # Top up wallet
    try:
        transaction = await wallet_service.deposit(
            user_id=user_id,
            amount=amount,
            currency=Currency.USD,
            payment_method=PaymentMethod.BANK_TRANSFER,
            reference=reference or f"monday_item_{pulse_id}",
            description=f"Bank transfer top-up via Monday.com (Item #{pulse_id})"
        )
        
        logger.info(
            f"[wallet_webhook] Wallet topped up: user={user_id}, email={email}, "
            f"amount=${amount:.2f}, txn={transaction.get('transaction_id')}"
        )
        
        # Update Monday.com item status to confirm processing
        await _update_monday_item_status(pulse_id, "processed")
        
        return {
            "status": "success",
            "user_id": user_id,
            "email": email,
            "amount": amount,
            "transaction_id": transaction.get("transaction_id")
        }
        
    except Exception as e:
        logger.error(f"[wallet_webhook] Failed to top up wallet: {e}")
        return {"status": "error", "detail": str(e)}


def _extract_email(value: str) -> Optional[str]:
    """Extract email from a column value string"""
    import re
    if not value:
        return None
    # Try to parse JSON first (Monday.com sometimes wraps values)
    try:
        import json
        parsed = json.loads(value)
        if isinstance(parsed, dict):
            return parsed.get("email") or parsed.get("text")
        return str(parsed)
    except (json.JSONDecodeError, TypeError):
        pass
    # Regex fallback
    match = re.search(r'[\w.+-]+@[\w-]+\.[\w.-]+', value)
    return match.group(0) if match else value.strip()


def _extract_amount(value: str) -> Optional[float]:
    """Extract numeric amount from a column value string"""
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
    # Remove currency symbols and commas
    cleaned = re.sub(r'[^\d.]', '', str(value))
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


async def _fetch_monday_item(item_id: str) -> Optional[Dict]:
    """Fetch item details from Monday.com API"""
    import os
    import httpx
    
    api_key = os.environ.get("MONDAY_API_KEY")
    if not api_key:
        logger.warning("[wallet_webhook] MONDAY_API_KEY not set")
        return None
    
    query = """
    query ($itemId: [ID!]) {
        items(ids: $itemId) {
            id
            name
            column_values {
                id
                title
                text
                value
            }
        }
    }
    """
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.monday.com/v2",
                json={"query": query, "variables": {"itemId": [str(item_id)]}},
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json"
                },
                timeout=10
            )
            data = response.json()
            
        items = data.get("data", {}).get("items", [])
        if not items:
            return None
        
        item = items[0]
        result = {"name": item.get("name", "")}
        
        for col in item.get("column_values", []):
            title = (col.get("title") or "").lower()
            text = col.get("text") or ""
            value = col.get("value") or ""
            
            if "email" in title or "correo" in title:
                result["email"] = _extract_email(text or value)
            elif "amount" in title or "monto" in title or "valor" in title:
                result["amount"] = _extract_amount(text or value)
            elif "reference" in title or "referencia" in title:
                result["reference"] = text
        
        return result
        
    except Exception as e:
        logger.error(f"[wallet_webhook] Failed to fetch Monday.com item: {e}")
        return None


async def _update_monday_item_status(item_id: str, status: str):
    """Update the Monday.com item to indicate it was processed"""
    # This is a best-effort update - we don't block on it
    try:
        import os
        import httpx
        
        api_key = os.environ.get("MONDAY_API_KEY")
        if not api_key:
            return
        
        # We'll add an update/note to the item
        mutation = """
        mutation ($itemId: ID!, $body: String!) {
            create_update(item_id: $itemId, body: $body) {
                id
            }
        }
        """
        
        body = f"Wallet top-up processed successfully. Status: {status}"
        
        async with httpx.AsyncClient() as client:
            await client.post(
                "https://api.monday.com/v2",
                json={
                    "query": mutation,
                    "variables": {"itemId": str(item_id), "body": body}
                },
                headers={
                    "Authorization": api_key,
                    "Content-Type": "application/json"
                },
                timeout=10
            )
    except Exception as e:
        logger.warning(f"[wallet_webhook] Failed to update Monday.com item status: {e}")
