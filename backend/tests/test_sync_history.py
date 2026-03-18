"""
Test Suite: Monday.com Banner Sync History Feature
Tests the NEW sync history log functionality:
- GET /api/admin/showcase/monday-banners/sync-history endpoint
- History entries created on sync attempts (success/error)
- History entry structure: timestamp, trigger, status, items_synced, error
"""
import pytest
import requests
from datetime import datetime

BASE_URL = "http://localhost:8001"


class TestSyncHistoryFeature:
    """Test the sync history feature for Monday.com banner sync"""
    
    # Module: Sync History Endpoint
    def test_sync_history_endpoint_returns_200(self):
        """GET /api/admin/showcase/monday-banners/sync-history should return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Sync history endpoint returns 200")
    
    def test_sync_history_response_structure(self):
        """Response should contain 'history' array"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        assert response.status_code == 200
        data = response.json()
        assert "history" in data, "Response should contain 'history' key"
        assert isinstance(data["history"], list), "history should be a list"
        print(f"✓ Sync history response has correct structure, contains {len(data['history'])} entries")
    
    # Module: Creating History Entries via Sync
    def test_get_initial_sync_history_count(self):
        """Record initial history count before triggering syncs"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        assert response.status_code == 200
        initial_count = len(response.json()["history"])
        print(f"✓ Initial sync history count: {initial_count}")
        return initial_count
    
    def test_enable_monday_config_for_sync(self):
        """Setup: Enable Monday config with fake board_id to trigger sync error"""
        # Get current config
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert get_resp.status_code == 200
        current_config = get_resp.json()
        
        # Save config with enabled=True and a fake board_id
        test_config = {
            **current_config,
            "enabled": True,
            "board_id": "99999999"  # Fake board_id will cause sync error
        }
        put_resp = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/config",
            json=test_config
        )
        assert put_resp.status_code == 200, f"Failed to update config: {put_resp.text}"
        print("✓ Monday config enabled with fake board_id for testing")
        return current_config  # Return original for cleanup
    
    def test_trigger_manual_sync_creates_history_entry(self):
        """POST /api/admin/showcase/monday-banners/sync should create history entry"""
        # Get initial count
        initial_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        initial_count = len(initial_resp.json()["history"])
        
        # Trigger manual sync (will error with fake board_id, but should log)
        sync_resp = requests.post(f"{BASE_URL}/api/admin/showcase/monday-banners/sync")
        # Sync may return error status but should still create history entry
        assert sync_resp.status_code == 200, f"Sync endpoint returned {sync_resp.status_code}: {sync_resp.text}"
        sync_result = sync_resp.json()
        print(f"  Sync result: {sync_result}")
        
        # Verify history count increased
        after_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        after_count = len(after_resp.json()["history"])
        
        assert after_count > initial_count, f"History count should increase after sync. Before: {initial_count}, After: {after_count}"
        print(f"✓ History entry created by manual sync. Count: {initial_count} -> {after_count}")
    
    def test_history_entry_has_required_fields(self):
        """History entries should contain timestamp, trigger, status, items_synced, error fields"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        assert response.status_code == 200
        history = response.json()["history"]
        
        if not history:
            pytest.skip("No history entries to validate")
        
        # Check the most recent entry (first in list since sorted by timestamp desc)
        latest_entry = history[0]
        required_fields = ["timestamp", "trigger", "status", "items_synced", "error"]
        
        for field in required_fields:
            assert field in latest_entry, f"History entry missing required field: {field}"
        
        print(f"✓ Latest history entry has all required fields: {list(latest_entry.keys())}")
        print(f"  Entry details: timestamp={latest_entry['timestamp']}, trigger={latest_entry['trigger']}, status={latest_entry['status']}, items_synced={latest_entry['items_synced']}")
    
    def test_manual_sync_trigger_value(self):
        """Manual sync should create history entry with trigger='manual'"""
        # Get current history
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        history = response.json()["history"]
        
        if not history:
            pytest.skip("No history entries to validate")
        
        # Look for manual trigger entry (should be most recent from our test)
        manual_entries = [e for e in history if e.get("trigger") == "manual"]
        assert len(manual_entries) > 0, "Should have at least one 'manual' trigger entry"
        
        latest_manual = manual_entries[0]
        assert latest_manual["trigger"] == "manual", f"Expected trigger='manual', got {latest_manual['trigger']}"
        print(f"✓ Found manual trigger entry: {latest_manual}")
    
    def test_history_entry_status_values(self):
        """History status should be 'success' or 'error'"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        history = response.json()["history"]
        
        if not history:
            pytest.skip("No history entries to validate")
        
        for entry in history:
            assert entry["status"] in ["success", "error"], f"Invalid status value: {entry['status']}"
        
        print(f"✓ All {len(history)} entries have valid status values (success/error)")
    
    def test_history_timestamp_is_valid_iso_format(self):
        """History timestamp should be valid ISO format"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        history = response.json()["history"]
        
        if not history:
            pytest.skip("No history entries to validate")
        
        latest_entry = history[0]
        timestamp = latest_entry["timestamp"]
        
        # Should be parseable as ISO datetime
        try:
            parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            print(f"✓ Timestamp is valid ISO format: {timestamp}")
        except ValueError as e:
            pytest.fail(f"Invalid timestamp format: {timestamp}, error: {e}")
    
    def test_items_synced_is_integer(self):
        """items_synced should be an integer >= 0"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        history = response.json()["history"]
        
        if not history:
            pytest.skip("No history entries to validate")
        
        for entry in history:
            assert isinstance(entry["items_synced"], int), f"items_synced should be int, got {type(entry['items_synced'])}"
            assert entry["items_synced"] >= 0, f"items_synced should be >= 0, got {entry['items_synced']}"
        
        print(f"✓ All items_synced values are valid integers")
    
    # Module: Existing Endpoints Still Work
    def test_auto_sync_get_endpoint_still_works(self):
        """GET /api/admin/showcase/monday-banners/auto-sync should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "enabled" in data or "scheduler" in data, "auto-sync response should have expected fields"
        print(f"✓ Auto-sync GET endpoint works, response keys: {list(data.keys())}")
    
    def test_auto_sync_put_endpoint_still_works(self):
        """PUT /api/admin/showcase/monday-banners/auto-sync should still work"""
        # Get current state
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        current = get_resp.json()
        
        # Try updating (toggle enabled)
        put_resp = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": not current.get("enabled", False), "interval_minutes": 10}
        )
        assert put_resp.status_code == 200, f"Expected 200, got {put_resp.status_code}"
        
        # Restore original
        requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": current.get("enabled", False), "interval_minutes": current.get("interval_minutes", 10)}
        )
        print("✓ Auto-sync PUT endpoint works")
    
    def test_banner_crud_still_works(self):
        """Banner CRUD endpoints should still function"""
        # Create
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            json={
                "type": "text",
                "text": "Test Sync History Banner",
                "bg_color": "#FF0000",
                "active": False
            }
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.status_code}"
        banner = create_resp.json()
        banner_id = banner["banner_id"]
        print(f"  Created test banner: {banner_id}")
        
        # Read
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/banners")
        assert get_resp.status_code == 200, "GET banners failed"
        
        # Delete
        del_resp = requests.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.status_code}"
        print(f"✓ Banner CRUD still works (created and deleted {banner_id})")


class TestSyncHistoryIntegrationFlow:
    """End-to-end integration test for sync history"""
    
    def test_full_sync_history_flow(self):
        """Complete flow: setup config -> sync -> verify history -> cleanup"""
        # Step 1: Get original config for cleanup
        config_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert config_resp.status_code == 200
        original_config = config_resp.json()
        
        # Step 2: Get initial history count
        hist_resp = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        initial_count = len(hist_resp.json()["history"])
        print(f"  Initial history count: {initial_count}")
        
        # Step 3: Enable Monday config with test board_id
        test_config = {
            **original_config,
            "enabled": True,
            "board_id": "12345678"  # Fake board ID
        }
        put_resp = requests.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=test_config)
        assert put_resp.status_code == 200
        print("  Enabled Monday config with test board_id")
        
        # Step 4: Trigger manual sync
        sync_resp = requests.post(f"{BASE_URL}/api/admin/showcase/monday-banners/sync")
        assert sync_resp.status_code == 200
        sync_result = sync_resp.json()
        print(f"  Sync result: status={sync_result.get('status')}, message={sync_result.get('message', 'N/A')}")
        
        # Step 5: Verify history entry was created
        hist_resp2 = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/sync-history")
        new_count = len(hist_resp2.json()["history"])
        history = hist_resp2.json()["history"]
        
        assert new_count > initial_count, f"History should have new entry. Before: {initial_count}, After: {new_count}"
        
        # Verify latest entry
        latest = history[0]
        assert latest["trigger"] == "manual", f"Expected trigger='manual', got {latest['trigger']}"
        assert latest["status"] in ["success", "error"], f"Invalid status: {latest['status']}"
        assert "timestamp" in latest
        assert "items_synced" in latest
        assert "error" in latest
        
        print(f"  New history entry: trigger={latest['trigger']}, status={latest['status']}, items_synced={latest['items_synced']}")
        
        # Step 6: Cleanup - restore original config
        requests.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=original_config)
        print("  Restored original config")
        
        print(f"✓ Full sync history flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
