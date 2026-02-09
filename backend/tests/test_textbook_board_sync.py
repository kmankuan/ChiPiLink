"""
Test: Textbook Board Sync (TXB Inventory Adapter)
Verifies the flow:
  1. For each book in an order, search the Textbooks board by book code
  2. If found → add student as subitem
  3. If NOT found → create the textbook item, then add the student as subitem

Run: cd /app/backend && python -m pytest tests/test_textbook_board_sync.py -v -s
"""
import asyncio
import pytest
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MONDAY_API_KEY = os.environ.get("MONDAY_API_KEY")
MONDAY_API_URL = "https://api.monday.com/v2"


async def monday_execute(query, timeout=20.0):
    """Direct Monday.com API call for verification"""
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            MONDAY_API_URL,
            json={"query": query},
            headers={"Authorization": str(MONDAY_API_KEY), "Content-Type": "application/json"},
            timeout=timeout,
        )
        data = resp.json()
        if "errors" in data:
            logger.error(f"Monday.com error: {data['errors']}")
            return None
        return data.get("data", {})


async def search_item_by_column(board_id, column_id, value):
    """Search for an item on a board by column value"""
    data = await monday_execute(f'''query {{
        items_page_by_column_values (
            board_id: {board_id}, limit: 5,
            columns: [{{column_id: "{column_id}", column_values: ["{value}"]}}]
        ) {{ items {{ id name column_values {{ id text value }} subitems {{ id name }} }} }}
    }}''')
    if data:
        return data.get("items_page_by_column_values", {}).get("items", [])
    return []


async def get_item_subitems(item_id):
    """Get subitems for a specific item"""
    data = await monday_execute(f'''query {{
        items(ids: [{item_id}]) {{
            id name
            subitems {{ id name column_values {{ id text value }} }}
        }}
    }}''')
    if data:
        items = data.get("items", [])
        return items[0].get("subitems", []) if items else []
    return []


async def delete_item(item_id):
    """Delete an item from Monday.com (cleanup)"""
    await monday_execute(f'mutation {{ delete_item (item_id: {item_id}) {{ id }} }}')


@pytest.fixture
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.mark.asyncio
async def test_textbook_board_sync_end_to_end():
    """
    End-to-end test of the TXB Inventory Adapter.
    
    Steps:
      1. Load config from DB to get board_id and column mappings
      2. Call update_inventory with test book codes
      3. Verify items were found/created on the Textbooks board
      4. Verify student subitems were added
      5. Clean up created test items
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = mongo_client[os.environ.get("DB_NAME", "chipilink_prod")]
    
    # 1. Load the TXB inventory config
    config = await db.monday_integration_config.find_one(
        {"config_key": "store.textbook_orders.txb_inventory"}, {"_id": 0}
    )
    assert config, "TXB inventory config not found in DB"
    
    board_id = config["board_id"]
    code_col = config["column_mapping"]["code"]
    enabled = config.get("enabled", False)
    
    logger.info(f"Config: board_id={board_id}, code_col={code_col}, enabled={enabled}")
    assert enabled, "TXB inventory sync is not enabled in config"
    assert board_id, "No board_id configured"
    assert code_col, "No code column mapped"
    
    # 2. Pick a test book code — use one from an actual order
    orders = await db.store_textbook_orders.find(
        {"status": {"$nin": ["cancelled", "draft"]}},
        {"_id": 0}
    ).limit(5).to_list(5)
    
    # Find an order with items that have book_code
    test_items = []
    test_student = "TEST-Sync-Student"
    test_order_ref = "TEST-ORD-001"
    
    for order in orders:
        for item in order.get("items", []):
            if item.get("book_code") and item.get("quantity_ordered", 0) > 0:
                test_items.append({
                    "book_code": item["book_code"],
                    "book_name": item["book_name"],
                    "quantity_ordered": item["quantity_ordered"],
                    "grade": order.get("grade", ""),
                    "price": item.get("price", 0),
                })
        if test_items:
            break
    
    assert test_items, "No test orders with book codes found in DB"
    logger.info(f"Test items: {json.dumps(test_items, indent=2)}")
    
    # 3. Check if these books already exist on the Textbooks board
    pre_existing = {}
    for item in test_items:
        found = await search_item_by_column(board_id, code_col, item["book_code"])
        if found:
            pre_existing[item["book_code"]] = {
                "item_id": found[0]["id"],
                "name": found[0]["name"],
                "subitems_before": len(found[0].get("subitems", []))
            }
            logger.info(f"Pre-existing: {item['book_code']} → item {found[0]['id']} ({len(found[0].get('subitems', []))} subitems)")
        else:
            logger.info(f"Not found on board: {item['book_code']} (will be created)")
    
    # 4. Run the adapter
    logger.info("\n=== Running TXB Inventory Adapter ===")
    
    # We need to initialize the app's DB connection for the adapter to work
    from core.database import db as app_db
    
    from modules.store.integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    
    result = await txb_inventory_adapter.update_inventory(
        ordered_items=test_items,
        student_name=test_student,
        order_reference=test_order_ref,
    )
    
    logger.info(f"Adapter result: {json.dumps(result, indent=2)}")
    
    assert not result.get("skipped"), f"Adapter skipped! Result: {result}"
    assert not result.get("error"), f"Adapter error: {result.get('error')}"
    
    # 5. Verify on Monday.com
    logger.info("\n=== Verifying on Monday.com ===")
    
    created_item_ids = []  # track items we created for cleanup
    
    for item in test_items:
        found = await search_item_by_column(board_id, code_col, item["book_code"])
        assert found, f"Book {item['book_code']} NOT found on Textbooks board after sync"
        
        monday_item = found[0]
        item_id = monday_item["id"]
        logger.info(f"Verified: {item['book_code']} → item {item_id}")
        
        # Check if this was newly created
        if item["book_code"] not in pre_existing:
            created_item_ids.append(item_id)
            logger.info(f"  (newly created)")
        
        # Check subitems — student should be there
        subitems = await get_item_subitems(item_id)
        subitem_names = [s["name"] for s in subitems]
        
        expected_name = f"{test_student} - {test_order_ref}"
        
        logger.info(f"  Subitems ({len(subitems)}): {subitem_names}")
        
        assert any(test_student in name for name in subitem_names), \
            f"Student '{test_student}' not found in subitems of {item['book_code']}. Subitems: {subitem_names}"
        
        # If pre-existing, verify subitem count increased
        if item["book_code"] in pre_existing:
            before = pre_existing[item["book_code"]]["subitems_before"]
            logger.info(f"  Subitems before: {before}, after: {len(subitems)}")
            assert len(subitems) > before, \
                f"Subitem count didn't increase for {item['book_code']} (before={before}, after={len(subitems)})"
    
    # 6. Summary
    logger.info("\n=== TEST PASSED ===")
    logger.info(f"Items created: {result.get('items_created', 0)}")
    logger.info(f"Subitems created: {result.get('subitems_created', 0)}")
    logger.info(f"Pre-existing items matched: {len(pre_existing)}")
    
    # Note: We intentionally do NOT clean up — the user wants to see results on Monday.com
    # To clean up test items, uncomment below:
    # for item_id in created_item_ids:
    #     await delete_item(item_id)
    #     logger.info(f"Cleaned up item {item_id}")
    
    mongo_client.close()


@pytest.mark.asyncio
async def test_textbook_board_sync_new_code():
    """
    Test that a brand-new book code gets CREATED on the Textbooks board.
    Uses a unique fake code that won't exist.
    """
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_client = AsyncIOMotorClient(os.environ.get("MONGO_URL"))
    db = mongo_client[os.environ.get("DB_NAME", "chipilink_prod")]
    
    config = await db.monday_integration_config.find_one(
        {"config_key": "store.textbook_orders.txb_inventory"}, {"_id": 0}
    )
    assert config and config.get("enabled"), "TXB config not enabled"
    
    board_id = config["board_id"]
    code_col = config["column_mapping"]["code"]
    
    import uuid
    unique_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    
    # Confirm it doesn't exist
    pre = await search_item_by_column(board_id, code_col, unique_code)
    assert not pre, f"Unique code {unique_code} somehow already exists"
    
    # Run adapter with this new code
    from core.database import db as app_db
    from modules.store.integrations.monday_txb_inventory_adapter import txb_inventory_adapter
    
    test_items = [{
        "book_code": unique_code,
        "book_name": f"Test Book {unique_code}",
        "quantity_ordered": 1,
        "grade": "3",
        "price": 15.99,
    }]
    
    result = await txb_inventory_adapter.update_inventory(
        ordered_items=test_items,
        student_name="New-Student-Test",
        order_reference="TEST-NEW-ORD",
    )
    
    logger.info(f"Result: {result}")
    assert result.get("items_created", 0) >= 1, f"Expected item creation, got: {result}"
    assert result.get("subitems_created", 0) >= 1, f"Expected subitem creation, got: {result}"
    
    # Verify on Monday.com
    found = await search_item_by_column(board_id, code_col, unique_code)
    assert found, f"New book {unique_code} was not created on Monday.com"
    
    item_id = found[0]["id"]
    subitems = await get_item_subitems(item_id)
    assert any("New-Student-Test" in s["name"] for s in subitems), \
        f"Student subitem not found under {unique_code}"
    
    logger.info(f"PASSED: Created item {item_id} with student subitem for code {unique_code}")
    
    # Cleanup: delete the test item
    await delete_item(item_id)
    logger.info(f"Cleaned up test item {item_id}")
    
    mongo_client.close()
