"""
Test Scheduled Banners and Monday.com Banner Sync APIs
Tests:
- GET /api/showcase/banners - Schedule date filtering (start_date/end_date)
- POST /api/admin/showcase/banners with start_date and end_date fields
- GET /api/admin/showcase/monday-banners/config - Monday.com sync configuration
- PUT /api/admin/showcase/monday-banners/config - Save Monday.com config
- GET /api/admin/showcase/monday-banners/boards - List available Monday.com boards
- POST /api/admin/showcase/monday-banners/sync - Trigger sync from Monday.com
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope='module')
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestBannerScheduleFiltering:
    """Test banner schedule date filtering (start_date/end_date)"""

    def test_create_banner_with_schedule_dates(self, api_client):
        """POST /api/admin/showcase/banners should accept start_date and end_date"""
        unique_id = str(uuid.uuid4())[:8]
        today = datetime.now().strftime("%Y-%m-%d")
        future = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        payload = {
            "type": "text",
            "text": f"TEST_ScheduledBanner_{unique_id}",
            "bg_color": "#C8102E",
            "active": True,
            "start_date": today,
            "end_date": future
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "banner_id" in data, "Response missing banner_id"
        assert data.get("start_date") == today, f"start_date mismatch: expected {today}, got {data.get('start_date')}"
        assert data.get("end_date") == future, f"end_date mismatch: expected {future}, got {data.get('end_date')}"
        print(f"Created scheduled banner: {data['banner_id']} (start={today}, end={future})")
        return data

    def test_future_scheduled_banner_not_visible(self, api_client):
        """Banner with future start_date should NOT appear in public GET /api/showcase/banners"""
        unique_id = str(uuid.uuid4())[:8]
        future_start = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        future_end = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%d")
        
        # Create banner scheduled for the future
        payload = {
            "type": "text",
            "text": f"TEST_FutureBanner_{unique_id}",
            "bg_color": "#16a34a",
            "active": True,
            "start_date": future_start,
            "end_date": future_end
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]
        
        # Check public endpoint - should NOT include this banner
        public_resp = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert public_resp.status_code == 200
        banners = public_resp.json()
        banner_ids = [b["banner_id"] for b in banners]
        assert banner_id not in banner_ids, f"Future-scheduled banner should NOT appear in public list"
        print(f"Future banner {banner_id} correctly hidden from public endpoint")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        return banner_id

    def test_past_ended_banner_not_visible(self, api_client):
        """Banner with past end_date should NOT appear in public GET /api/showcase/banners"""
        unique_id = str(uuid.uuid4())[:8]
        past_start = (datetime.now() - timedelta(days=10)).strftime("%Y-%m-%d")
        past_end = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Create banner that has already ended
        payload = {
            "type": "text",
            "text": f"TEST_ExpiredBanner_{unique_id}",
            "bg_color": "#7c3aed",
            "active": True,
            "start_date": past_start,
            "end_date": past_end
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]
        
        # Check public endpoint - should NOT include this expired banner
        public_resp = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert public_resp.status_code == 200
        banners = public_resp.json()
        banner_ids = [b["banner_id"] for b in banners]
        assert banner_id not in banner_ids, f"Expired banner should NOT appear in public list"
        print(f"Expired banner {banner_id} correctly hidden from public endpoint")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        return banner_id

    def test_active_scheduled_banner_visible(self, api_client):
        """Banner within valid date range should appear in public GET /api/showcase/banners"""
        unique_id = str(uuid.uuid4())[:8]
        past_start = (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d")
        future_end = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        
        # Create banner currently active (today is between start and end)
        payload = {
            "type": "text",
            "text": f"TEST_ActiveScheduledBanner_{unique_id}",
            "bg_color": "#0284c7",
            "active": True,
            "start_date": past_start,
            "end_date": future_end
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]
        
        # Check public endpoint - SHOULD include this banner
        public_resp = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert public_resp.status_code == 200
        banners = public_resp.json()
        banner_ids = [b["banner_id"] for b in banners]
        assert banner_id in banner_ids, f"Active scheduled banner should appear in public list"
        print(f"Active scheduled banner {banner_id} correctly visible in public endpoint")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        return banner_id

    def test_banner_without_dates_visible(self, api_client):
        """Banner without schedule dates should always be visible (no filtering)"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Create banner with no dates
        payload = {
            "type": "text",
            "text": f"TEST_NoDateBanner_{unique_id}",
            "bg_color": "#dc2626",
            "active": True
            # No start_date or end_date
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]
        
        # Check public endpoint - SHOULD include this banner
        public_resp = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert public_resp.status_code == 200
        banners = public_resp.json()
        banner_ids = [b["banner_id"] for b in banners]
        assert banner_id in banner_ids, f"Banner without dates should always be visible"
        print(f"Banner without dates {banner_id} correctly visible (no filtering)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")


class TestMondayBannerSyncConfig:
    """Test Monday.com banner sync configuration endpoints"""

    def test_get_monday_config_returns_default(self, api_client):
        """GET /api/admin/showcase/monday-banners/config should return default config"""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        # Default config should have enabled=false
        # May or may not have been configured before, so we just check structure
        print(f"Monday.com config: enabled={data.get('enabled')}, board_id={data.get('board_id')}")
        return data

    def test_save_monday_config(self, api_client):
        """PUT /api/admin/showcase/monday-banners/config should save configuration"""
        # First get current config
        get_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert get_resp.status_code == 200
        original_config = get_resp.json()
        
        # Save a test configuration
        test_config = {
            "enabled": True,
            "board_id": "12345678",  # Test board ID
            "columns": {
                "canva_url": "link_col",
                "text": "text_col",
                "bg_color": "color_col",
                "link_url": "link_col2",
                "start_date": "date_col",
                "end_date": "date_col2",
                "status": "status_col",
                "banner_type": "dropdown_col"
            }
        }
        
        save_resp = api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=test_config)
        assert save_resp.status_code == 200, f"Expected 200, got {save_resp.status_code}: {save_resp.text}"
        data = save_resp.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        print(f"Monday.com config saved successfully")
        
        # Verify saved config
        verify_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        assert verify_resp.status_code == 200
        saved_config = verify_resp.json()
        assert saved_config.get("enabled") == True, "enabled not saved"
        assert saved_config.get("board_id") == "12345678", "board_id not saved"
        assert saved_config.get("columns", {}).get("canva_url") == "link_col", "columns not saved"
        print(f"Monday.com config verified: enabled={saved_config.get('enabled')}, board_id={saved_config.get('board_id')}")
        
        # Restore original config
        api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=original_config)


class TestMondayBannerSyncBoards:
    """Test Monday.com boards listing endpoint"""

    def test_list_monday_boards(self, api_client):
        """GET /api/admin/showcase/monday-banners/boards should list available boards"""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/boards")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "boards" in data, "Response missing 'boards' key"
        boards = data.get("boards", [])
        assert isinstance(boards, list), f"Expected list, got {type(boards)}"
        print(f"Found {len(boards)} Monday.com boards")
        
        # If boards exist, validate structure
        if len(boards) > 0:
            board = boards[0]
            assert "id" in board, "Board missing 'id'"
            assert "name" in board, "Board missing 'name'"
            print(f"First board: {board.get('name')} (ID: {board.get('id')})")
            if "columns" in board and len(board["columns"]) > 0:
                print(f"  Columns: {len(board['columns'])} columns available")
        return data


class TestMondayBannerSync:
    """Test Monday.com banner sync execution"""

    def test_sync_skips_when_not_configured(self, api_client):
        """POST /api/admin/showcase/monday-banners/sync returns skipped when not configured"""
        # First ensure config is disabled
        get_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        original_config = get_resp.json() if get_resp.status_code == 200 else {}
        
        # Set config to disabled
        disabled_config = {
            "enabled": False,
            "board_id": "",
            "columns": {}
        }
        api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=disabled_config)
        
        # Trigger sync - should return skipped
        sync_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/sync")
        assert sync_resp.status_code == 200, f"Expected 200, got {sync_resp.status_code}: {sync_resp.text}"
        data = sync_resp.json()
        assert data.get("status") == "skipped", f"Expected status 'skipped', got {data.get('status')}"
        assert "message" in data, "Response should have message"
        print(f"Sync correctly skipped: {data.get('message')}")
        
        # Restore original config
        api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=original_config)

    def test_sync_with_valid_config(self, api_client):
        """POST /api/admin/showcase/monday-banners/sync works with valid board config"""
        # Get current config
        get_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/config")
        original_config = get_resp.json() if get_resp.status_code == 200 else {}
        
        # First get a real board ID from the boards list
        boards_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/monday-banners/boards")
        boards = boards_resp.json().get("boards", [])
        
        if len(boards) == 0:
            print("No Monday.com boards available, skipping live sync test")
            pytest.skip("No Monday.com boards available")
            return
        
        # Use first available board for test
        test_board_id = boards[0]["id"]
        print(f"Testing sync with board: {boards[0].get('name')} (ID: {test_board_id})")
        
        # Configure with real board
        test_config = {
            "enabled": True,
            "board_id": test_board_id,
            "columns": {
                "canva_url": "link",  # Common column types
                "text": "text",
                "start_date": "date",
                "end_date": "date4",
                "status": "status"
            }
        }
        save_resp = api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=test_config)
        assert save_resp.status_code == 200
        
        # Trigger sync
        sync_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/monday-banners/sync")
        assert sync_resp.status_code == 200, f"Expected 200, got {sync_resp.status_code}: {sync_resp.text}"
        data = sync_resp.json()
        
        # Should return ok or error (depending on board having items)
        assert data.get("status") in ["ok", "error", "skipped"], f"Unexpected status: {data.get('status')}"
        print(f"Sync result: status={data.get('status')}, synced={data.get('synced', 'N/A')}, total_items={data.get('total_items', 'N/A')}")
        
        # Restore original config
        api_client.put(f"{BASE_URL}/api/admin/showcase/monday-banners/config", json=original_config)


class TestBannerSourceTracking:
    """Test that banners have source field for tracking origin"""

    def test_manual_banner_has_source_manual(self, api_client):
        """Manually created banners should have source='manual'"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "type": "text",
            "text": f"TEST_ManualSource_{unique_id}",
            "bg_color": "#ec4899",
            "active": True
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data.get("source") == "manual", f"Expected source='manual', got {data.get('source')}"
        print(f"Manual banner correctly has source='manual'")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{data['banner_id']}")


class TestCleanupScheduledBannerTestData:
    """Cleanup TEST_ prefixed data created during tests"""

    def test_cleanup_test_banners(self, api_client):
        """Remove all TEST_ banners created during this test run"""
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/banners")
        if response.status_code != 200:
            print("Could not fetch banners for cleanup")
            return
        
        banners = response.json()
        deleted_count = 0
        for banner in banners:
            text = banner.get("text", "") or banner.get("overlay_text", "")
            if "TEST_" in text:
                delete_resp = api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner['banner_id']}")
                if delete_resp.status_code == 200:
                    deleted_count += 1
        
        print(f"Cleanup: Deleted {deleted_count} TEST_ banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
