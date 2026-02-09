"""
Push test orders to Monday.com boards (TB2026-Orders + subitems).
Uses the actual board column IDs discovered from the API.
"""
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import os
from datetime import datetime, timezone

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "chipilink_prod")
MONDAY_API_KEY = os.environ.get("MONDAY_API_KEY")
MONDAY_API_URL = "https://api.monday.com/v2"

# Board IDs
ORDERS_BOARD_ID = "18397140868"
TEXTBOOKS_BOARD_ID = "18397140920"

# Grade → Monday.com status label
GRADE_LABELS = {
    "1": "1ro", "2": "2do", "3": "3ro", "4": "4to", "5": "5to",
    "6": "6to", "7": "7mo", "8": "8vo", "9": "9no", "10": "10mo",
    "11": "11vo", "12": "12vo", "K4": "K4", "K5": "K5",
}

async def monday_execute(query, timeout=30.0):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
            timeout=timeout,
        )
        data = resp.json()
        if "errors" in data:
            print(f"  ERROR: {data['errors']}")
            return None
        return data.get("data", {})


async def create_order_item(order, user_email="", user_phone=""):
    """Create main order item on TB2026-Orders board"""
    grade_label = GRADE_LABELS.get(str(order["grade"]), str(order["grade"]))
    
    ordered_items = [i for i in order.get("items", []) if i.get("quantity_ordered", 0) > 0]
    total = sum(i["price"] * i["quantity_ordered"] for i in ordered_items)
    
    item_name = f"{order['student_name']} - {grade_label} - ${total:.2f}"
    
    column_values = {
        "text_mm026sg3": str(order["student_name"]),           # Estudiante
        "color_mm02xhw1": {"label": grade_label},              # Grado (status type)
        "status": {"label": "Working on it"},                   # Pedido Status
        "color_mm029pg2": {"label": "Working on it"},           # Pago Status
        "text_mm02tgaa": order.get("form_data", {}).get("notes", ""),  # Commentario
    }
    
    # Add email if available
    if user_email:
        column_values["email_mm021jhw"] = {"email": user_email, "text": user_email}
    
    # Add phone if available
    phone = order.get("form_data", {}).get("phone", "")
    if phone:
        column_values["phone_mm02j3vh"] = {"phone": phone, "countryShortName": "PA"}
    
    col_json = json.dumps(json.dumps(column_values))
    
    # Escape item name for GraphQL
    safe_name = item_name.replace('"', '\\"')
    
    query = f'''mutation {{
        create_item (
            board_id: {ORDERS_BOARD_ID},
            item_name: "{safe_name}",
            column_values: {col_json}
        ) {{ id }}
    }}'''
    
    data = await monday_execute(query)
    if data:
        item_id = data.get("create_item", {}).get("id")
        print(f"  Created order item: {item_id} — {item_name}")
        return item_id
    return None


async def create_order_subitems(parent_item_id, items):
    """Create subitems (books) for an order item"""
    subitems = []
    for item in items:
        if item.get("quantity_ordered", 0) == 0:
            continue
        
        subitem_name = f"{item['book_name']} (x{item['quantity_ordered']})"
        safe_name = subitem_name.replace('"', '\\"')
        
        column_values = {
            "numeric_mm02v6ym": str(item["price"]),                # Precio
            "status": {"label": "Recibido"},                        # Status → Recibido (default)
            "date0": {"date": datetime.now(timezone.utc).strftime("%Y-%m-%d")},
        }
        
        col_json = json.dumps(json.dumps(column_values))
        
        query = f'''mutation {{
            create_subitem (
                parent_item_id: {parent_item_id},
                item_name: "{safe_name}",
                column_values: {col_json}
            ) {{ id }}
        }}'''
        
        data = await monday_execute(query)
        if data:
            sub_id = data.get("create_subitem", {}).get("id")
            print(f"    Subitem: {sub_id} — {item['book_name']} ${item['price']:.2f}")
            subitems.append({"book_id": item["book_id"], "monday_subitem_id": sub_id})
    
    return subitems


async def create_order_update(item_id, order, user_email=""):
    """Add an update/note to the order item"""
    ordered_items = [i for i in order.get("items", []) if i.get("quantity_ordered", 0) > 0]
    total = sum(i["price"] * i["quantity_ordered"] for i in ordered_items)
    
    lines = [
        f"📋 New Textbook Order",
        f"",
        f"Student: {order['student_name']}",
        f"Grade: {order['grade']}",
        f"Year: {order.get('year', 2026)}",
        f"",
        f"Parent: {order.get('form_data', {}).get('parent_name', 'N/A')}",
        f"Email: {user_email}",
        f"Phone: {order.get('form_data', {}).get('phone', 'N/A')}",
        f"",
        f"Books Ordered:",
    ]
    for item in ordered_items:
        lines.append(f"  • {item['book_name']} — ${item['price']:.2f} x{item['quantity_ordered']}")
    lines.extend([f"", f"Total: ${total:.2f}", f"Order ID: {order['order_id']}"])
    
    if order.get("form_data", {}).get("notes"):
        lines.extend([f"", f"Notes: {order['form_data']['notes']}"])
    
    body = "\\n".join(lines)
    
    query = f'''mutation {{
        create_update (
            item_id: {item_id},
            body: "{body}"
        ) {{ id }}
    }}'''
    
    data = await monday_execute(query)
    if data:
        print(f"    Update added to item {item_id}")


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db_client = client[DB_NAME]
    
    # Get orders that haven't been synced yet (no monday_item_id or null)
    orders = await db_client.store_textbook_orders.find(
        {"$or": [{"monday_item_id": None}, {"monday_item_id": {"$exists": False}}]},
        {"_id": 0}
    ).to_list(50)
    
    # Only push non-cancelled, non-draft orders
    orders = [o for o in orders if o.get("status") not in ("cancelled", "draft")]
    
    print(f"Found {len(orders)} orders to sync to Monday.com\n")
    
    for order in orders:
        print(f"\n{'='*60}")
        print(f"Order: {order['order_id']} — {order['student_name']} (Grade {order['grade']}, {order['status']})")
        
        # Get user email
        user = await db_client.users.find_one({"user_id": order["user_id"]}, {"_id": 0, "email": 1})
        user_email = user.get("email", "") if user else ""
        
        # 1. Create main item
        item_id = await create_order_item(order, user_email=user_email)
        if not item_id:
            print(f"  FAILED to create item, skipping")
            continue
        
        # 2. Create subitems (books)
        subitems = await create_order_subitems(item_id, order.get("items", []))
        
        # 3. Add update/note
        await create_order_update(item_id, order, user_email=user_email)
        
        # 4. Update local order with Monday.com IDs
        update_data = {
            "monday_item_id": item_id,
            "monday_subitems": subitems,
            "last_synced_at": datetime.now(timezone.utc).isoformat(),
        }
        
        # Also update individual items with their subitem IDs
        items = order.get("items", [])
        for si in subitems:
            for item in items:
                if item["book_id"] == si["book_id"]:
                    item["monday_subitem_id"] = si["monday_subitem_id"]
                    break
        
        update_data["items"] = items
        
        await db_client.store_textbook_orders.update_one(
            {"order_id": order["order_id"]},
            {"$set": update_data}
        )
        print(f"  ✓ Synced: item_id={item_id}, {len(subitems)} subitems")
    
    client.close()
    print(f"\n{'='*60}")
    print(f"Done! Synced {len(orders)} orders to Monday.com TB2026-Orders board.")

asyncio.run(main())
