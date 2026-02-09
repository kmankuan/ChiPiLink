"""
Test: Textbooks Board Sync
Verifies:
  1. Find textbook by code → add student as subitem
  2. Code not found → create textbook item with code+name → add student as subitem

Run: cd /app/backend && python tests/test_textbook_board_sync.py
"""
import asyncio
import os
import sys
import json
import uuid
import logging
import httpx
from pathlib import Path
from dotenv import load_dotenv

# Load .env from backend root
load_dotenv(Path(__file__).parent.parent / ".env")
sys.path.insert(0, str(Path(__file__).parent.parent))

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger(__name__)

MONDAY_API_KEY = os.environ.get("MONDAY_API_KEY", "").strip('"')
MONDAY_API_URL = "https://api.monday.com/v2"
TEXTBOOKS_BOARD_ID = "18397140920"


async def monday_query(query, timeout=20.0):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
            timeout=timeout,
        )
        data = resp.json()
        if "errors" in data:
            log.error(f"Monday API error: {data['errors']}")
            return None
        return data.get("data", {})


async def search_by_code(board_id, code_col, value):
    data = await monday_query(f'''query {{
        items_page_by_column_values (
            board_id: {board_id}, limit: 5,
            columns: [{{column_id: "{code_col}", column_values: ["{value}"]}}]
        ) {{ items {{ id name subitems {{ id name }} }} }}
    }}''')
    if data:
        return data.get("items_page_by_column_values", {}).get("items", [])
    return []


async def get_subitems(item_id):
    data = await monday_query(f'''query {{
        items(ids: [{item_id}]) {{ subitems {{ id name }} }}
    }}''')
    if data:
        items = data.get("items", [])
        return items[0].get("subitems", []) if items else []
    return []


async def delete_item(item_id):
    await monday_query(f'mutation {{ delete_item (item_id: {item_id}) {{ id }} }}')


async def run_test():
    from motor.motor_asyncio import AsyncIOMotorClient

    mongo = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = mongo[os.environ.get("DB_NAME", "chipilink_prod")]

    # ── Load config ──
    config = await db.monday_integration_config.find_one(
        {"config_key": "store.textbook_orders.txb_inventory"}, {"_id": 0}
    )
    assert config and config.get("enabled"), "TXB inventory config missing or disabled"
    board_id = config["board_id"]
    code_col = config["column_mapping"]["code"]
    log.info(f"Config OK: board={board_id}, code_col={code_col}\n")

    # ── Initialize app DB for the adapter ──
    import sys
    sys.path.insert(0, "/app/backend")
    from core import database as _db_mod
    _db_mod.db = mongo[os.environ.get("DB_NAME", "chipilink_prod")]
    from modules.store.integrations.monday_txb_inventory_adapter import txb_inventory_adapter

    # ── Find a real book code from an existing order ──
    orders = await db.store_textbook_orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}}, {"_id": 0}
    ).limit(10).to_list(10)

    real_code = None
    real_name = None
    for o in orders:
        for item in o.get("items", []):
            if item.get("book_code") and item.get("quantity_ordered", 0) > 0:
                real_code = item["book_code"]
                real_name = item["book_name"]
                break
        if real_code:
            break

    passed = 0
    failed = 0
    cleanup_ids = []

    # ================================================================
    # TEST 1: Existing code → find item → add student subitem
    # ================================================================
    log.info("=" * 60)
    log.info("TEST 1: Sync with EXISTING book code")
    log.info("=" * 60)

    if real_code:
        log.info(f"  Book code: {real_code} ({real_name})")

        # Check state before
        before = await search_by_code(board_id, code_col, real_code)
        if before:
            before_sub_count = len(before[0].get("subitems", []))
            log.info(f"  Found on board: item {before[0]['id']} with {before_sub_count} subitems")
        else:
            before_sub_count = 0
            log.info(f"  Not on board yet (adapter will create it)")

        # Run adapter
        result = await txb_inventory_adapter.update_inventory(
            ordered_items=[{
                "book_code": real_code,
                "book_name": real_name,
                "quantity_ordered": 1,
                "grade": "3",
                "price": 10.0,
            }],
            student_name="Test-Student-Existing",
            order_reference="TEST-ORD-EXIST",
        )
        log.info(f"  Adapter result: {json.dumps(result)}")

        # Verify
        after = await search_by_code(board_id, code_col, real_code)
        if after:
            item_id = after[0]["id"]
            subs = await get_subitems(item_id)
            sub_names = [s["name"] for s in subs]
            log.info(f"  Subitems after: {sub_names}")

            if any("Test-Student-Existing" in n for n in sub_names):
                log.info("  ✅ PASS — Student subitem found under existing textbook")
                passed += 1
            else:
                log.info(f"  ❌ FAIL — Student 'Test-Student-Existing' not in subitems: {sub_names}")
                failed += 1
        else:
            log.info("  ❌ FAIL — Book not found on board after sync")
            failed += 1
    else:
        log.info("  ⚠️  SKIP — No orders with book codes in DB")

    # ================================================================
    # TEST 2: New code → create item → add student subitem
    # ================================================================
    log.info("")
    log.info("=" * 60)
    log.info("TEST 2: Sync with NEW (non-existing) book code")
    log.info("=" * 60)

    new_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    new_name = f"Test Textbook {new_code}"
    log.info(f"  New code: {new_code}")

    # Confirm it doesn't exist
    pre = await search_by_code(board_id, code_col, new_code)
    assert not pre, f"Code {new_code} already exists?!"

    # Run adapter
    result2 = await txb_inventory_adapter.update_inventory(
        ordered_items=[{
            "book_code": new_code,
            "book_name": new_name,
            "quantity_ordered": 1,
            "grade": "5",
            "price": 25.50,
        }],
        student_name="Test-Student-New",
        order_reference="TEST-ORD-NEW",
    )
    log.info(f"  Adapter result: {json.dumps(result2)}")

    # Verify creation
    found = await search_by_code(board_id, code_col, new_code)
    if found:
        item_id = found[0]["id"]
        cleanup_ids.append(item_id)
        log.info(f"  Item created: {item_id} ({found[0]['name']})")

        subs = await get_subitems(item_id)
        sub_names = [s["name"] for s in subs]
        log.info(f"  Subitems: {sub_names}")

        if result2.get("items_created", 0) >= 1:
            log.info("  ✅ PASS — New textbook item was created")
            passed += 1
        else:
            log.info("  ❌ FAIL — items_created should be >= 1")
            failed += 1

        if any("Test-Student-New" in n for n in sub_names):
            log.info("  ✅ PASS — Student subitem added to new textbook")
            passed += 1
        else:
            log.info(f"  ❌ FAIL — Student not in subitems: {sub_names}")
            failed += 1
    else:
        log.info("  ❌ FAIL — New textbook item was NOT created on Monday.com")
        failed += 2

    # ================================================================
    # TEST 3: Same code again with different student → subitem added
    # ================================================================
    log.info("")
    log.info("=" * 60)
    log.info("TEST 3: Same code, SECOND student → adds another subitem")
    log.info("=" * 60)

    if found:
        result3 = await txb_inventory_adapter.update_inventory(
            ordered_items=[{
                "book_code": new_code,
                "book_name": new_name,
                "quantity_ordered": 1,
                "grade": "5",
                "price": 25.50,
            }],
            student_name="Second-Student",
            order_reference="TEST-ORD-002",
        )
        log.info(f"  Adapter result: {json.dumps(result3)}")

        subs2 = await get_subitems(item_id)
        sub_names2 = [s["name"] for s in subs2]
        log.info(f"  Subitems now: {sub_names2}")

        has_first = any("Test-Student-New" in n for n in sub_names2)
        has_second = any("Second-Student" in n for n in sub_names2)

        if has_first and has_second and len(subs2) >= 2:
            log.info("  ✅ PASS — Both students present as subitems")
            passed += 1
        else:
            log.info(f"  ❌ FAIL — Expected both students. first={has_first}, second={has_second}")
            failed += 1
    else:
        log.info("  ⚠️  SKIP — No item from Test 2 to reuse")

    # ================================================================
    # Cleanup
    # ================================================================
    log.info("")
    log.info("=" * 60)
    log.info("CLEANUP")
    for cid in cleanup_ids:
        await delete_item(cid)
        log.info(f"  Deleted test item {cid}")

    # ================================================================
    # Summary
    # ================================================================
    log.info("")
    log.info("=" * 60)
    total = passed + failed
    log.info(f"RESULTS: {passed}/{total} passed, {failed}/{total} failed")
    log.info("=" * 60)

    mongo.close()
    return failed == 0


if __name__ == "__main__":
    ok = asyncio.run(run_test())
    exit(0 if ok else 1)
