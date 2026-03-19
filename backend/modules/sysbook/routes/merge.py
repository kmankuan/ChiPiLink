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
    """Detect duplicate products where one code is a clean code and another
    has the same code with extra text appended (from bad Monday.com import).
    
    Example duplicate: code "G7-6" vs code "G7-6 El Arte del Lenguaje"
    NOT duplicate: code "K4/5-4" vs code "K4/5-9" (different item numbers)
    """
    products = await db.store_products.find(
        {"is_sysbook": True, "archived": {"$ne": True}},
        {"_id": 0, "book_id": 1, "code": 1, "name": 1, "grade": 1, "price": 1,
         "inventory_quantity": 1, "reserved_quantity": 1}
    ).to_list(2000)

    # Build index of products by grade
    by_grade = {}
    for p in products:
        grade = p.get("grade", "")
        if grade not in by_grade:
            by_grade[grade] = []
        by_grade[grade].append(p)

    duplicates = []

    # For each grade, find products where one code is prefix of another + space
    for grade, items in by_grade.items():
        # Sort by code length (short codes first = likely the "correct" ones)
        items.sort(key=lambda x: len(x.get("code", "")))
        used = set()

        for i, item_a in enumerate(items):
            code_a = (item_a.get("code") or "").strip()
            if not code_a or item_a["book_id"] in used:
                continue

            group_items = [item_a]

            for j, item_b in enumerate(items):
                if i == j or item_b["book_id"] in used:
                    continue
                code_b = (item_b.get("code") or "").strip()
                if not code_b:
                    continue

                # Check: is code_b = code_a + " " + some_text?
                # This catches "G7-6 El Arte del Lenguaje" as duplicate of "G7-6"
                if code_b.startswith(code_a + " ") or code_b.startswith(code_a + "\t"):
                    group_items.append(item_b)
                    used.add(item_b["book_id"])

            if len(group_items) > 1:
                used.add(item_a["book_id"])
                duplicates.append({
                    "key": f"{code_a}|{grade}",
                    "normalized_code": code_a,
                    "grade": grade,
                    "items": [{
                        "book_id": p["book_id"],
                        "code": p.get("code", ""),
                        "name": p.get("name", ""),
                        "grade": grade,
                        "price": p.get("price", 0),
                        "stock": p.get("inventory_quantity", 0),
                        "reserved": p.get("reserved_quantity", 0),
                    } for p in group_items],
                    "suggested_keep": item_a["book_id"],  # shortest code = correct
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
