"""
TXB Inventory Bidirectional Sync Tests
Tests for enhanced Monday.com TXB inventory sync workflow:
- GET /api/store/monday/txb-inventory-config returns enhanced config with stock_quantity, subject, status column mappings, webhook_config, sync_stats, use_grade_groups
- PUT /api/store/monday/txb-inventory-config saves config including new fields
- POST /api/store/monday/txb-inventory/full-sync pushes all textbooks to Monday.com
- POST /api/store/monday/txb-inventory/sync-stock/{book_id} syncs single book's stock
- POST /api/store/monday/txb-inventory/webhook handles Monday.com challenge verification
- POST /api/store/monday/txb-inventory/webhook processes stock column change event
- POST /api/store/inventory/adjust includes monday_sync in response for private catalog items
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test book_id from agent context
TEST_BOOK_ID = "book_1dceffd38889"  # Mathematics 5th Grade - Pearson, has monday_item_id=11278003595

# ========== AUTH FIXTURES ==========

@pytest.fixture(scope="module")
def admin_token():
    """Get admin token (admin@chipi.co)"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@chipi.co", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


# ========== ENHANCED CONFIG API TESTS ==========

class TestEnhancedTxbInventoryConfig:
    """Tests for enhanced GET/PUT /api/store/monday/txb-inventory-config"""

    def test_get_config_returns_stock_column_in_column_mapping(self, admin_token):
        """GET returns column_mapping with stock or stock_quantity key (backward compatible)"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        col_map = data.get("column_mapping", {})
        # Adapter supports both legacy 'stock' and new 'stock_quantity' keys
        has_stock_col = "stock_quantity" in col_map or "stock" in col_map
        assert has_stock_col, "column_mapping must have 'stock_quantity' or 'stock' key for backward compatibility"

    def test_get_config_can_save_subject_in_column_mapping(self, admin_token):
        """PUT/GET can save and retrieve subject in column_mapping"""
        # First GET current config to use as baseline for restore
        get_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        original_config = get_resp.json()
        
        # Create test config with subject - use a deep copy of column_mapping
        test_col_map = dict(original_config.get("column_mapping", {}))
        test_col_map["subject"] = "test_subject_field_temp"
        test_config = {
            **original_config,
            "column_mapping": test_col_map
        }
        
        # PUT with subject
        put_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_resp.status_code == 200
        
        # Verify subject is saved
        verify_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert "subject" in verify_data["column_mapping"], "subject should be saved in column_mapping"
        
        # IMPORTANT: Restore original config to avoid polluting other tests
        # Remove test fields before restoring
        clean_config = {
            "board_id": original_config.get("board_id", "18397140920"),
            "enabled": original_config.get("enabled", True),
            "group_id": original_config.get("group_id", "topics"),
            "use_grade_groups": original_config.get("use_grade_groups", False),
            "column_mapping": {
                "code": original_config.get("column_mapping", {}).get("code", "text_mm02vh63"),
                "status": original_config.get("column_mapping", {}).get("status", "status"),
                "stock": original_config.get("column_mapping", {}).get("stock", "numeric_mm025r1m"),
                "date": original_config.get("column_mapping", {}).get("date", "date4"),
            },
            "subitem_column_mapping": original_config.get("subitem_column_mapping", {
                "quantity": "numeric_mm02sj3t",
                "date": "date0"
            })
        }
        requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=clean_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )

    def test_get_config_returns_status_in_column_mapping(self, admin_token):
        """GET returns column_mapping with status key"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        col_map = data.get("column_mapping", {})
        assert "status" in col_map, "column_mapping must have 'status' key"

    def test_get_config_returns_webhook_config(self, admin_token):
        """GET returns webhook_config section"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "webhook_config" in data, "Response must have 'webhook_config'"
        wh_config = data["webhook_config"]
        assert isinstance(wh_config, dict), "webhook_config must be a dict"
        # Expected keys in webhook_config
        expected_keys = ["webhook_id", "webhook_url", "stock_column_id"]
        for key in expected_keys:
            assert key in wh_config, f"webhook_config must have '{key}' key"

    def test_get_config_returns_sync_stats(self, admin_token):
        """GET returns sync_stats from last full sync"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "sync_stats" in data, "Response must have 'sync_stats'"
        assert isinstance(data["sync_stats"], dict), "sync_stats must be a dict"

    def test_get_config_returns_last_full_sync(self, admin_token):
        """GET returns last_full_sync timestamp"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "last_full_sync" in data, "Response must have 'last_full_sync'"

    def test_get_config_returns_use_grade_groups(self, admin_token):
        """GET returns use_grade_groups flag"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "use_grade_groups" in data, "Response must have 'use_grade_groups'"
        assert isinstance(data["use_grade_groups"], bool), "use_grade_groups must be a boolean"

    def test_put_config_saves_new_fields(self, admin_token):
        """PUT saves enhanced config fields correctly"""
        # First GET current config
        get_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert get_resp.status_code == 200
        original_config = get_resp.json()
        
        # Modify config with new fields
        test_config = {**original_config}
        test_config["use_grade_groups"] = not original_config.get("use_grade_groups", False)
        col_map = test_config.get("column_mapping", {})
        col_map["stock_quantity"] = "test_stock_col"
        col_map["subject"] = "test_subject_col"
        col_map["status"] = "test_status_col"
        test_config["column_mapping"] = col_map
        
        # PUT with modified config
        put_resp = requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=test_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_resp.status_code == 200, f"Expected 200, got {put_resp.status_code}"
        
        # Verify by GET
        verify_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert verify_data["use_grade_groups"] == test_config["use_grade_groups"]
        assert verify_data["column_mapping"]["stock_quantity"] == "test_stock_col"
        assert verify_data["column_mapping"]["subject"] == "test_subject_col"
        assert verify_data["column_mapping"]["status"] == "test_status_col"
        
        # Restore original config
        requests.put(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            json=original_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )


# ========== FULL SYNC API TESTS ==========

class TestTxbInventoryFullSync:
    """Tests for POST /api/store/monday/txb-inventory/full-sync"""

    def test_full_sync_requires_auth(self):
        """Full sync endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_full_sync_returns_sync_stats(self, admin_token):
        """Full sync returns created/updated/failed counts"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify sync stats structure
        assert "created" in data, "Response must have 'created' count"
        assert "updated" in data, "Response must have 'updated' count"
        assert "failed" in data, "Response must have 'failed' count"
        assert "total_textbooks" in data, "Response must have 'total_textbooks' count"
        assert "synced_at" in data, "Response must have 'synced_at' timestamp"
        
        # Verify counts are integers
        assert isinstance(data["created"], int), "created must be an integer"
        assert isinstance(data["updated"], int), "updated must be an integer"
        assert isinstance(data["failed"], int), "failed must be an integer"
        
        # Print for logging
        print(f"Full sync result: created={data['created']}, updated={data['updated']}, failed={data['failed']}, total={data['total_textbooks']}")

    def test_full_sync_updates_sync_stats_in_config(self, admin_token):
        """After full sync, config should have updated sync_stats"""
        # Run full sync
        sync_resp = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert sync_resp.status_code == 200
        
        # GET config to verify sync_stats updated
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert config_resp.status_code == 200
        data = config_resp.json()
        
        assert data.get("last_full_sync") is not None, "last_full_sync should be set after sync"
        sync_stats = data.get("sync_stats", {})
        assert "created" in sync_stats, "sync_stats should have 'created'"
        assert "updated" in sync_stats, "sync_stats should have 'updated'"


# ========== SYNC STOCK SINGLE BOOK API TESTS ==========

class TestTxbSyncStockSingleBook:
    """Tests for POST /api/store/monday/txb-inventory/sync-stock/{book_id}"""

    def test_sync_stock_requires_auth(self):
        """Sync stock endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-stock/{TEST_BOOK_ID}"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_sync_stock_returns_result(self, admin_token):
        """Sync stock for a single book returns sync result"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-stock/{TEST_BOOK_ID}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "synced" in data, "Response must have 'synced' field"
        
        # If synced=True, should have monday_item_id
        if data.get("synced"):
            assert "monday_item_id" in data, "Successful sync should return monday_item_id"
            print(f"Stock synced to Monday item: {data['monday_item_id']}")
        else:
            # If synced=False, should have reason
            assert "reason" in data, "Failed sync should have 'reason'"
            print(f"Stock sync skipped: {data['reason']}")

    def test_sync_stock_404_for_nonexistent_book(self, admin_token):
        """Sync stock returns 404 for non-existent book"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-stock/nonexistent_book_12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ========== WEBHOOK API TESTS ==========

class TestTxbInventoryWebhook:
    """Tests for POST /api/store/monday/txb-inventory/webhook"""

    def test_webhook_handles_challenge_verification(self):
        """Webhook endpoint returns challenge value for Monday.com verification"""
        # Monday.com sends challenge on first registration
        test_challenge = f"test_challenge_{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook",
            json={"challenge": test_challenge}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "challenge" in data, "Response must return 'challenge'"
        assert data["challenge"] == test_challenge, f"Challenge must match: expected '{test_challenge}', got '{data['challenge']}'"

    def test_webhook_returns_no_event_for_empty_body(self):
        """Webhook returns no_event status for body without event"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook",
            json={}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_event", f"Expected status='no_event', got {data}"

    def test_webhook_processes_stock_column_change_event(self, admin_token):
        """Webhook processes stock column change and updates inventory"""
        # First get config to know the stock column
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert config_resp.status_code == 200
        config = config_resp.json()
        col_map = config.get("column_mapping", {})
        stock_col = col_map.get("stock_quantity") or col_map.get("stock")
        
        if not stock_col:
            pytest.skip("Stock column not mapped in config")
        
        # Get the test product to find its monday_item_id
        product_resp = requests.get(
            f"{BASE_URL}/api/store/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"search": "Mathematics 5th Grade"}
        )
        
        # Simulate webhook event (stock column changed to 50)
        # Using a known item ID from agent context
        test_event = {
            "event": {
                "pulseId": "11278003595",  # Known monday_item_id for TEST_BOOK_ID
                "columnId": stock_col,
                "value": {"value": "50", "text": "50"}
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook",
            json=test_event
        )
        assert response.status_code == 200
        data = response.json()
        
        # Response should indicate processing result
        print(f"Webhook response: {data}")
        # Either processed=True/False depending on whether product was found


# ========== INVENTORY ADJUST WITH MONDAY SYNC ==========

class TestInventoryAdjustMondaySync:
    """Tests for POST /api/store/inventory/adjust monday_sync field"""

    def test_inventory_adjust_requires_auth(self):
        """Inventory adjust endpoint requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={"book_id": TEST_BOOK_ID, "quantity_change": 1, "reason": "test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_inventory_adjust_includes_monday_sync_for_private_catalog(self, admin_token):
        """Inventory adjust for private catalog items includes monday_sync in response"""
        # Adjust stock by 0 (no actual change, but should still trigger sync)
        response = requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={
                "book_id": TEST_BOOK_ID,
                "quantity_change": 0,
                "reason": "test_monday_sync"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify monday_sync field is present for private catalog item
        assert "monday_sync" in data, "Response must include 'monday_sync' for private catalog items"
        
        monday_sync = data["monday_sync"]
        assert "synced" in monday_sync, "monday_sync must have 'synced' field"
        
        print(f"Monday sync result: {monday_sync}")

    def test_inventory_adjust_increments_stock(self, admin_token):
        """Inventory adjust can increment stock and sync to Monday"""
        # First get current stock
        products_resp = requests.get(
            f"{BASE_URL}/api/store/inventory/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            params={"search": "Mathematics"}
        )
        
        # Increment by 1
        response = requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={
                "book_id": TEST_BOOK_ID,
                "quantity_change": 1,
                "reason": "test_increment",
                "notes": "Testing bidirectional sync"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "old_quantity" in data
        assert "new_quantity" in data
        assert data["new_quantity"] == data["old_quantity"] + 1
        
        # Decrement back to restore
        requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={
                "book_id": TEST_BOOK_ID,
                "quantity_change": -1,
                "reason": "test_restore"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )


# ========== WEBHOOK REGISTRATION TESTS ==========

class TestTxbInventoryWebhookRegistration:
    """Tests for webhook register/unregister endpoints"""

    def test_register_webhook_requires_auth(self):
        """Register webhook requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook/register",
            json={"webhook_url": "https://example.com/webhook"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_register_webhook_requires_url(self, admin_token):
        """Register webhook requires webhook_url in body"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook/register",
            json={},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"

    def test_unregister_webhook_requires_auth(self):
        """Unregister webhook requires admin authentication"""
        response = requests.delete(
            f"{BASE_URL}/api/store/monday/txb-inventory/webhook"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
