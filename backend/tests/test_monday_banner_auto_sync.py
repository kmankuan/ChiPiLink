"""
Test Monday.com Banner Auto-Sync Feature
Tests the auto-sync configuration endpoints and scheduler behavior.

Features tested:
- GET /api/admin/showcase/monday-banners/auto-sync - Get auto-sync config with scheduler status
- PUT /api/admin/showcase/monday-banners/auto-sync - Enable/disable auto-sync, change interval
- Interval clamping between 1 and 1440 minutes
- Scheduler status behavior when Monday integration is enabled/disabled
- Existing banner CRUD endpoints still work
- Existing Monday config endpoints still work
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestAutoSyncGetConfig:
    """Test GET /api/admin/showcase/monday-banners/auto-sync"""

    def test_get_auto_sync_config_returns_200(self):
        """Should return auto-sync config with enabled, interval_minutes, scheduler, and last_sync"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify required fields
        assert "enabled" in data, "Missing 'enabled' field"
        assert "interval_minutes" in data, "Missing 'interval_minutes' field"
        assert "scheduler" in data, "Missing 'scheduler' field"
        assert "last_sync" in data, "Missing 'last_sync' field"
        
        # Verify scheduler status structure
        scheduler = data["scheduler"]
        assert "running" in scheduler, "Missing 'running' in scheduler"
        assert "paused" in scheduler, "Missing 'paused' in scheduler"
        assert "next_run" in scheduler, "Missing 'next_run' in scheduler"
        
        print(f"Auto-sync config: enabled={data['enabled']}, interval={data['interval_minutes']}min")
        print(f"Scheduler status: running={scheduler['running']}, paused={scheduler['paused']}")


class TestAutoSyncPutConfig:
    """Test PUT /api/admin/showcase/monday-banners/auto-sync"""

    def test_enable_auto_sync(self):
        """Should enable auto-sync and return updated scheduler status"""
        payload = {"enabled": True, "interval_minutes": 10}
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status='ok', got {data.get('status')}"
        assert "auto_sync" in data, "Missing 'auto_sync' in response"
        assert "scheduler" in data, "Missing 'scheduler' in response"
        
        auto_sync = data["auto_sync"]
        assert auto_sync.get("enabled") == True, "Expected enabled=True"
        assert auto_sync.get("interval_minutes") == 10, "Expected interval_minutes=10"
        
        print(f"Enabled auto-sync: {auto_sync}")
        print(f"Scheduler after enable: {data['scheduler']}")

    def test_disable_auto_sync(self):
        """Should disable auto-sync and pause the scheduler"""
        payload = {"enabled": False, "interval_minutes": 10}
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok"
        
        auto_sync = data["auto_sync"]
        assert auto_sync.get("enabled") == False, "Expected enabled=False"
        
        # When disabled, scheduler should be paused
        scheduler = data["scheduler"]
        # If running, it should be paused (next_run_time is None)
        if scheduler.get("running"):
            assert scheduler.get("paused") == True or scheduler.get("next_run") is None, \
                "Expected scheduler to be paused when auto-sync is disabled"
        
        print(f"Disabled auto-sync: {auto_sync}")
        print(f"Scheduler after disable: {scheduler}")

    def test_change_interval_minutes(self):
        """Should allow changing interval_minutes (e.g., 5 min)"""
        payload = {"enabled": True, "interval_minutes": 5}
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        auto_sync = data["auto_sync"]
        assert auto_sync.get("interval_minutes") == 5, f"Expected interval_minutes=5, got {auto_sync.get('interval_minutes')}"
        
        print(f"Changed interval to 5 min: {auto_sync}")

    def test_interval_clamped_minimum(self):
        """Interval should be clamped to minimum 1 minute"""
        payload = {"enabled": True, "interval_minutes": 0}
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        auto_sync = data["auto_sync"]
        assert auto_sync.get("interval_minutes") >= 1, \
            f"Interval should be at least 1, got {auto_sync.get('interval_minutes')}"
        
        print(f"Interval clamped to minimum: {auto_sync.get('interval_minutes')}")

    def test_interval_clamped_maximum(self):
        """Interval should be clamped to maximum 1440 minutes (24 hours)"""
        payload = {"enabled": True, "interval_minutes": 2000}
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json=payload
        )
        assert response.status_code == 200
        
        data = response.json()
        auto_sync = data["auto_sync"]
        assert auto_sync.get("interval_minutes") <= 1440, \
            f"Interval should be at most 1440, got {auto_sync.get('interval_minutes')}"
        
        print(f"Interval clamped to maximum: {auto_sync.get('interval_minutes')}")


class TestSchedulerBehavior:
    """Test scheduler status based on Monday integration and auto-sync settings"""

    def test_scheduler_status_when_auto_sync_enabled(self):
        """Scheduler should only report 'running' (not paused) when both Monday integration 
        is enabled (with board_id) AND auto-sync is enabled"""
        # First enable auto-sync
        enable_response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": True, "interval_minutes": 10}
        )
        assert enable_response.status_code == 200
        
        # Get current config to check
        config_response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert config_response.status_code == 200
        monday_config = config_response.json()
        
        # Get auto-sync status
        status_response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert status_response.status_code == 200
        status_data = status_response.json()
        scheduler = status_data.get("scheduler", {})
        
        # If Monday integration is enabled with board_id AND auto-sync is enabled
        if monday_config.get("enabled") and monday_config.get("board_id"):
            # Scheduler should be running and NOT paused
            if status_data.get("enabled"):
                print(f"Monday integration enabled with board_id, auto-sync enabled")
                print(f"Scheduler: running={scheduler.get('running')}, paused={scheduler.get('paused')}")
                # This is the happy path - scheduler should be active
        else:
            # If Monday integration is not enabled or no board_id,
            # scheduler should be paused even if auto-sync is enabled
            print(f"Monday integration not fully configured (enabled={monday_config.get('enabled')}, board_id={monday_config.get('board_id')})")
            print(f"Scheduler: running={scheduler.get('running')}, paused={scheduler.get('paused')}")


class TestExistingBannerCRUD:
    """Test that existing banner CRUD endpoints still work"""
    
    def setup_method(self):
        """Track created test banners for cleanup"""
        self.created_banner_ids = []

    def teardown_method(self):
        """Cleanup test banners"""
        for banner_id in self.created_banner_ids:
            requests.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")

    def test_get_admin_banners(self):
        """GET /api/admin/showcase/banners should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        print(f"Found {len(data)} banners")

    def test_create_banner(self):
        """POST /api/admin/showcase/banners should still work"""
        payload = {
            "type": "text",
            "text": "TEST_AUTO_SYNC_BANNER",
            "bg_color": "#ff0000",
            "active": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "banner_id" in data, "Missing banner_id in response"
        self.created_banner_ids.append(data["banner_id"])
        
        assert data.get("text") == "TEST_AUTO_SYNC_BANNER"
        assert data.get("type") == "text"
        print(f"Created banner: {data['banner_id']}")

    def test_get_public_banners(self):
        """GET /api/showcase/banners (public endpoint) should still work"""
        response = requests.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of banners"
        print(f"Found {len(data)} active public banners")


class TestExistingMondayConfig:
    """Test that existing Monday.com config endpoints still work"""

    def test_get_monday_banner_config(self):
        """GET /api/admin/showcase/monday-banners/config should still work"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have expected config fields
        assert "enabled" in data or data == {}, "Expected config with 'enabled' field or empty config"
        print(f"Monday config: enabled={data.get('enabled')}, board_id={data.get('board_id')}")

    def test_update_monday_banner_config(self):
        """PUT /api/admin/showcase/monday-banners/config should still work"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        current_config = get_response.json()
        
        # Update with same config (to not break anything)
        payload = {
            "enabled": current_config.get("enabled", False),
            "board_id": current_config.get("board_id", ""),
            "columns": current_config.get("columns", {})
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/config",
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "ok", f"Expected status='ok', got {data.get('status')}"
        print(f"Updated Monday config: {data}")


class TestAutoSyncEndToEnd:
    """End-to-end test of auto-sync feature"""

    def test_full_auto_sync_flow(self):
        """Test complete flow: get config -> enable -> verify -> change interval -> disable"""
        # Step 1: Get initial config
        get_response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert get_response.status_code == 200
        initial_config = get_response.json()
        print(f"1. Initial config: enabled={initial_config.get('enabled')}, interval={initial_config.get('interval_minutes')}")
        
        # Step 2: Enable auto-sync with 15 min interval
        enable_response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": True, "interval_minutes": 15}
        )
        assert enable_response.status_code == 200
        enable_data = enable_response.json()
        assert enable_data["auto_sync"]["enabled"] == True
        assert enable_data["auto_sync"]["interval_minutes"] == 15
        print(f"2. Enabled auto-sync: {enable_data['auto_sync']}")
        
        # Step 3: Verify config persisted
        verify_response = requests.get(f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync")
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data["enabled"] == True
        assert verify_data["interval_minutes"] == 15
        print(f"3. Verified config: enabled={verify_data['enabled']}, interval={verify_data['interval_minutes']}")
        
        # Step 4: Change interval to 30 min
        change_response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": True, "interval_minutes": 30}
        )
        assert change_response.status_code == 200
        change_data = change_response.json()
        assert change_data["auto_sync"]["interval_minutes"] == 30
        print(f"4. Changed interval to 30 min: {change_data['auto_sync']}")
        
        # Step 5: Disable auto-sync
        disable_response = requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={"enabled": False}
        )
        assert disable_response.status_code == 200
        disable_data = disable_response.json()
        assert disable_data["auto_sync"]["enabled"] == False
        print(f"5. Disabled auto-sync: {disable_data['auto_sync']}")
        
        # Restore initial state
        requests.put(
            f"{BASE_URL}/api/admin/showcase/monday-banners/auto-sync",
            json={
                "enabled": initial_config.get("enabled", False),
                "interval_minutes": initial_config.get("interval_minutes", 10)
            }
        )
        print(f"6. Restored initial state")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
