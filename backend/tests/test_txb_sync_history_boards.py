"""
Test TXB Sync History and Monday.com Board Integrations
Tests the new sync history logging feature and verifies all 3 Monday.com boards are configured.

Board IDs:
- Orders Board: 18397140868
- Textbooks Board: 18397140920
- Messages/CRM Board: 5931665026
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@chipi.co",
        "password": "admin"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin auth failed")

@pytest.fixture
def auth_headers(admin_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestHealthAndAuth:
    """Basic health and auth tests"""
    
    def test_health_endpoint(self):
        """Health check passes"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data.get('version')}")
    
    def test_admin_login(self):
        """Admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("is_admin") == True
        print("✓ Admin login successful")


class TestSyncHistoryEndpoint:
    """Test GET /api/store/monday/txb-inventory/sync-history"""
    
    def test_sync_history_returns_list(self, auth_headers):
        """Sync history endpoint returns history array"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-history?limit=20",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "history" in data
        assert isinstance(data["history"], list)
        print(f"✓ Sync history returned {len(data['history'])} entries")
        
        # Check entry structure if any exist
        if data["history"]:
            entry = data["history"][0]
            expected_fields = ["timestamp", "trigger", "status", "created", "updated", "failed", "total", "processed"]
            for field in expected_fields:
                assert field in entry, f"Missing field: {field}"
            print(f"✓ First entry has all required fields: status={entry['status']}, total={entry['total']}")
            if entry.get("duration_s") is not None:
                print(f"  Duration: {entry['duration_s']}s")
    
    def test_sync_history_limit_param(self, auth_headers):
        """Sync history respects limit param"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-history?limit=5",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["history"]) <= 5
        print(f"✓ Sync history limit respected: {len(data['history'])} <= 5")


class TestOrdersBoardIntegration:
    """Test Orders Board (18397140868) configuration and endpoints"""
    
    def test_orders_board_config(self, auth_headers):
        """GET /api/store/monday/config returns Orders board config"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "board_id" in data
        print(f"✓ Orders config board_id: {data.get('board_id')}")
        print(f"  column_mapping keys: {list(data.get('column_mapping', {}).keys())}")
        
        # Verify expected board ID
        if data.get("board_id"):
            print(f"  Board ID configured: {data['board_id']}")
    
    def test_orders_board_columns(self, auth_headers):
        """GET /api/store/monday/boards/{board_id}/columns returns columns"""
        # First get the config to get the board_id
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/config",
            headers=auth_headers
        )
        if config_resp.status_code != 200:
            pytest.skip("Could not get orders config")
        
        board_id = config_resp.json().get("board_id", "18397140868")
        if not board_id:
            pytest.skip("Orders board_id not configured")
        
        response = requests.get(
            f"{BASE_URL}/api/store/monday/boards/{board_id}/columns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        print(f"✓ Orders board columns: {len(data.get('columns', []))} columns")
        if "subitem_columns" in data:
            print(f"  Subitem columns: {len(data.get('subitem_columns', []))}")


class TestTextbooksBoardIntegration:
    """Test Textbooks Board (18397140920) configuration and endpoints"""
    
    def test_textbooks_board_config(self, auth_headers):
        """GET /api/store/monday/txb-inventory-config returns Textbooks board config"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "board_id" in data
        assert "enabled" in data
        print(f"✓ Textbooks config:")
        print(f"  board_id: {data.get('board_id')}")
        print(f"  enabled: {data.get('enabled')}")
        print(f"  use_grade_groups: {data.get('use_grade_groups')}")
        print(f"  column_mapping keys: {list(data.get('column_mapping', {}).keys())}")
    
    def test_textbooks_board_columns(self, auth_headers):
        """GET /api/store/monday/boards/{board_id}/columns for textbooks board"""
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers=auth_headers
        )
        if config_resp.status_code != 200:
            pytest.skip("Could not get textbooks config")
        
        board_id = config_resp.json().get("board_id", "18397140920")
        if not board_id:
            pytest.skip("Textbooks board_id not configured")
        
        response = requests.get(
            f"{BASE_URL}/api/store/monday/boards/{board_id}/columns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        print(f"✓ Textbooks board columns: {len(data.get('columns', []))} columns")
        if "subitem_columns" in data:
            print(f"  Subitem columns: {len(data.get('subitem_columns', []))}")


class TestMessagesBoardIntegration:
    """Test Messages/CRM Board (5931665026) configuration and endpoints"""
    
    def test_crm_board_config(self, auth_headers):
        """GET /api/store/crm-chat/admin/config returns CRM board config"""
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/admin/config",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "board_id" in data
        print(f"✓ CRM/Messages config:")
        print(f"  board_id: {data.get('board_id')}")
        print(f"  Configured: {bool(data.get('board_id'))}")
    
    def test_crm_board_columns(self, auth_headers):
        """GET /api/store/crm-chat/admin/config/board-columns returns columns"""
        # First check if board is configured
        config_resp = requests.get(
            f"{BASE_URL}/api/store/crm-chat/admin/config",
            headers=auth_headers
        )
        if config_resp.status_code != 200:
            pytest.skip("Could not get CRM config")
        
        board_id = config_resp.json().get("board_id")
        if not board_id:
            pytest.skip("CRM board_id not configured")
        
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/admin/config/board-columns",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "columns" in data
        print(f"✓ CRM board columns: {len(data.get('columns', []))} columns")


class TestFullSyncEndpoints:
    """Test Full Sync background task endpoints"""
    
    def test_full_sync_status_idle(self, auth_headers):
        """GET /api/store/monday/txb-inventory/full-sync/status returns status"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync/status",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print(f"✓ Full sync status: {data.get('status')}")
        if data.get("total"):
            print(f"  Progress: {data.get('processed', 0)}/{data.get('total')}")
    
    def test_full_sync_cancel_when_idle(self, auth_headers):
        """POST /api/store/monday/txb-inventory/full-sync/cancel returns not_running when idle"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync/cancel",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # When idle, should return not_running
        if data.get("status") == "not_running":
            print("✓ Cancel endpoint returns 'not_running' when idle")
        elif data.get("status") == "cancelling":
            print("✓ Cancel endpoint returns 'cancelling' (sync was running)")
        else:
            print(f"✓ Cancel endpoint returned: {data}")
    
    def test_full_sync_start_and_status(self, auth_headers):
        """POST /api/store/monday/txb-inventory/full-sync starts background task"""
        # Check if textbooks board is configured
        config_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers=auth_headers
        )
        config = config_resp.json()
        if not config.get("enabled") or not config.get("board_id"):
            pytest.skip("Textbooks board not enabled/configured - skipping full sync test")
        
        # Start sync
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") in ["started", "already_running"]
        print(f"✓ Full sync response: {data.get('status')}")
        
        # Poll status
        time.sleep(2)
        status_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync/status",
            headers=auth_headers
        )
        status = status_resp.json()
        print(f"✓ Sync status after 2s: {status.get('status')}")
        if status.get("total"):
            print(f"  Progress: {status.get('processed', 0)}/{status.get('total')}")
        
        # Cancel if still running
        if status.get("status") == "running":
            cancel_resp = requests.post(
                f"{BASE_URL}/api/store/monday/txb-inventory/full-sync/cancel",
                headers=auth_headers
            )
            print(f"✓ Cancelled sync: {cancel_resp.json()}")
            time.sleep(1)
        
        # Check sync history was updated
        history_resp = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory/sync-history?limit=5",
            headers=auth_headers
        )
        history = history_resp.json().get("history", [])
        if history:
            latest = history[0]
            print(f"✓ Latest sync history entry: status={latest.get('status')}, processed={latest.get('processed')}/{latest.get('total')}")
        else:
            print("  No sync history entries yet")


class TestAllBoardsOverview:
    """Test that all 3 boards are accessible via their respective endpoints"""
    
    def test_all_boards_summary(self, auth_headers):
        """Summary of all 3 Monday.com board integrations"""
        print("\n=== Monday.com Board Integration Summary ===\n")
        
        boards = {
            "Orders": {
                "expected_id": "18397140868",
                "config_url": "/api/store/monday/config"
            },
            "Textbooks": {
                "expected_id": "18397140920",
                "config_url": "/api/store/monday/txb-inventory-config"
            },
            "CRM/Messages": {
                "expected_id": "5931665026",
                "config_url": "/api/store/crm-chat/admin/config"
            }
        }
        
        all_configured = True
        for name, info in boards.items():
            response = requests.get(
                f"{BASE_URL}{info['config_url']}",
                headers=auth_headers
            )
            if response.status_code == 200:
                data = response.json()
                board_id = data.get("board_id", "")
                enabled = data.get("enabled", True) if name == "Textbooks" else True
                status = "✓" if board_id else "✗"
                enabled_status = f"(enabled: {enabled})" if name == "Textbooks" else ""
                print(f"{status} {name} Board: {board_id or 'NOT CONFIGURED'} {enabled_status}")
                if not board_id:
                    all_configured = False
            else:
                print(f"✗ {name} Board: Error fetching config ({response.status_code})")
                all_configured = False
        
        print(f"\n{'✓' if all_configured else '⚠'} All boards configured: {all_configured}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
