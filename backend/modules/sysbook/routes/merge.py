"""
Sysbook — Product Merge Tool
Merges duplicate products: moves all orders from source → target, combines counts, archives source.
Also detects potential duplicates by code prefix matching.
"""
from fastapi import APIRouter, HTTPException, Depends
from core.database import db
from core.auth import get_admin_user
import logging
import re

logger = logging.getLogger("sysbook.merge")
router = APIRouter(prefix="/merge", tags=["Sysbook - Merge"])


@router.get("/detect-duplicates")
async def detect_duplicates(admin: dict = Depends(get_admin_user)):
    """Detect potential duplicate products by normalized code matching.
    Returns groups of products that likely refer to the same book."""
    products = await db.store_products.find(
        {"is_sysbook": True, "archived": {"$ne": True}},
        {"_id": 0, "book_id": 1, "code": 1, "name": 1, "grade": 1, "price": 1,
         "inventory_quantity": 1, "reserved_quantity": 1}
    ).to_list(2000)

    # Normalize codes: extract the SHORT code (e.g., "G7-6" from "G7-6 El Arte del Lenguaje")
    def normalize_code(code_str):
        if not code_str:
            return ""
        # Extract leading code pattern: letter(s) + digits + optional hyphen/slash + digits
        m = re.match(r'^([A-Za-z][A-Za-z0-9]*[\-/]?\d+)', code_str.strip())
        return m.group(1).upper() if m else code_str.strip().upper()

    # Group products by normalized code + grade
    groups = {}
    for p in products:
        raw_code = p.get("code", "")
        norm = normalize_code(raw_code)
        grade = p.get("grade", "")
        key = f"{norm}|{grade}"

        if key not in groups:
            groups[key] = []
        groups[key].append({
            "book_id": p["book_id"],
            "code": raw_code,
            "normalized_code": norm,
            "name": p.get("name", ""),
            "grade": grade,
            "price": p.get("price", 0),
            "stock": p.get("inventory_quantity", 0),
            "reserved": p.get("reserved_quantity", 0),
        })

    # Filter to groups with 2+ items (actual duplicates)
    duplicates = []
    for key, items in groups.items():
        if len(items) >= 2:
            # The item with the shortest code is likely the "correct" one
            items.sort(key=lambda x: len(x["code"]))
            duplicates.append({
                "key": key,
                "normalized_code": items[0]["normalized_code"],
                "grade": items[0]["grade"],
                "items": items,
                "suggested_keep": items[0]["book_id"],  # shortest code = likely correct
            })

    return {"total_duplicates": len(duplicates), "groups": duplicates}


@router.post("/merge")
async def merge_products(data: dict, admin: dict = Depends(get_admin_user)):
    """Merge source product INTO target product.
    - Moves all order items referencing source → target
    - Adds source's stock/reserved to target
    - Archives the source product
    
    Body: { "source_book_id": "...", "target_book_id": "..." }
    """
    source_id = data.get("source_book_id", "")
    target_id = data.get("target_book_id", "")

    if not source_id or not target_id:
        raise HTTPException(400, "source_book_id and target_book_id required")
    if source_id == target_id:
        raise HTTPException(400, "Source and target must be different")

    # Load both products
    source = await db.store_products.find_one({"book_id": source_id, "is_sysbook": True})
    target = await db.store_products.find_one({"book_id": target_id, "is_sysbook": True})

    if not source:
        raise HTTPException(404, f"Source product {source_id} not found")
    if not target:
        raise HTTPException(404, f"Target product {target_id} not found")

    logger.info(f"Merging {source_id} ({source.get('code')}: {source.get('name')}) → {target_id} ({target.get('code')}: {target.get('name')})")

    # Step 1: Update all orders that reference the source book_id
    orders_updated = 0
    orders_cursor = db.store_textbook_orders.find(
        {"items.book_id": source_id},
        {"_id": 1, "order_id": 1, "items": 1}
    )
    async for order in orders_cursor:
        updated_items = []
        changed = False
        for item in order.get("items", []):
            if item.get("book_id") == source_id:
                item["book_id"] = target_id
                # Fix the book code if it was wrong
                if item.get("book_code") and len(item["book_code"]) > len(target.get("code", "")):
                    item["book_code"] = target.get("code", item.get("book_code", ""))
                if item.get("book_name"):
                    item["book_name"] = target.get("name", item.get("book_name", ""))
                changed = True
            updated_items.append(item)
        if changed:
            await db.store_textbook_orders.update_one(
                {"_id": order["_id"]},
                {"$set": {"items": updated_items}}
            )
            orders_updated += 1

    # Step 2: Merge stock and reserved quantities
    source_stock = source.get("inventory_quantity", 0) or 0
    source_reserved = source.get("reserved_quantity", 0) or 0
    target_stock = target.get("inventory_quantity", 0) or 0
    target_reserved = target.get("reserved_quantity", 0) or 0

    new_stock = target_stock + source_stock
    new_reserved = target_reserved + source_reserved

    await db.store_products.update_one(
        {"book_id": target_id},
        {"$set": {
            "inventory_quantity": new_stock,
            "reserved_quantity": new_reserved,
        }}
    )

    # Step 3: Move stock movements from source to target
    movements_updated = await db.sysbook_stock_movements.update_many(
        {"book_id": source_id},
        {"$set": {"book_id": target_id, "merged_from": source_id}}
    )

    # Step 4: Archive the source product
    await db.store_products.update_one(
        {"book_id": source_id},
        {"$set": {
            "archived": True,
            "merged_into": target_id,
            "inventory_quantity": 0,
            "reserved_quantity": 0,
        }}
    )

    result = {
        "success": True,
        "source": {"book_id": source_id, "code": source.get("code"), "name": source.get("name")},
        "target": {"book_id": target_id, "code": target.get("code"), "name": target.get("name")},
        "orders_updated": orders_updated,
        "stock_merged": {"source": source_stock, "target_before": target_stock, "target_after": new_stock},
        "reserved_merged": {"source": source_reserved, "target_before": target_reserved, "target_after": new_reserved},
        "movements_updated": movements_updated.modified_count,
    }
    logger.info(f"Merge complete: {result}")
    return result


@router.post("/merge-all-duplicates")
async def merge_all_duplicates(admin: dict = Depends(get_admin_user)):
    """Auto-merge all detected duplicates. Keeps the product with the shortest code."""
    detect_result = await detect_duplicates(admin)
    groups = detect_result["groups"]

    merged = 0
    errors = []
    for group in groups:
        target_id = group["suggested_keep"]
        for item in group["items"]:
            if item["book_id"] != target_id:
                try:
                    await merge_products(
                        {"source_book_id": item["book_id"], "target_book_id": target_id},
                        admin
                    )
                    merged += 1
                except Exception as e:
                    errors.append({"source": item["book_id"], "error": str(e)})

    return {"merged": merged, "errors": len(errors), "details": errors}
