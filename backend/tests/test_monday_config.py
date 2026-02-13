"""
Test Monday.com Configuration APIs for Payment Alerts Module
Iteration 88: Testing the Monday.com Config tab functionality
- Test connection to Monday.com API
- Get/Save Monday.com board configuration
- Fetch boards and columns
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teck@koh.one"
TEST_PASSWORD = "admin"
TARGET_BOARD_ID = "18399959471"  # Recharge Approval board

class TestMondayConfigEndpoints:
    """Test Monday.com Configuration APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token") or data.get("access_token")
            if self.token:
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_01_monday_test_connection(self):
        """Test Monday.com connection endpoint"""
        response = self.session.post(f"{BASE_URL}/api/wallet-topups/monday/test")
        print(f"Monday test connection response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Connection result: {data}")
        
        # Should have connected status
        assert "connected" in data
        if data["connected"]:
            print(f"Connected as: {data.get('user')} ({data.get('account')})")
            assert "user" in data
            assert "account" in data
        else:
            print(f"Connection failed: {data.get('error', 'unknown')}")
    
    def test_02_get_monday_config(self):
        """Test GET /api/wallet-topups/monday/config returns config"""
        response = self.session.get(f"{BASE_URL}/api/wallet-topups/monday/config")
        print(f"Get Monday config response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Config: {data}")
        
        # Should have expected fields
        assert "board_id" in data
        assert "column_mapping" in data
        assert "enabled" in data
        assert "post_email_as_update" in data
    
    def test_03_get_monday_boards(self):
        """Test GET /api/wallet-topups/monday/boards returns list of boards"""
        response = self.session.get(f"{BASE_URL}/api/wallet-topups/monday/boards")
        print(f"Get Monday boards response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Boards count: {len(data.get('boards', []))}")
        
        # Should have boards list
        assert "boards" in data
        boards = data["boards"]
        
        if len(boards) > 0:
            print(f"Sample boards: {[b['name'] for b in boards[:5]]}")
            # Each board should have id and name
            for board in boards[:3]:
                assert "id" in board
                assert "name" in board
                print(f"  - {board['name']} (ID: {board['id']})")
    
    def test_04_get_board_columns(self):
        """Test GET /api/wallet-topups/monday/boards/{board_id}/columns returns columns and groups"""
        response = self.session.get(f"{BASE_URL}/api/wallet-topups/monday/boards/{TARGET_BOARD_ID}/columns")
        print(f"Get board columns response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have columns and groups
        assert "columns" in data
        assert "groups" in data
        
        columns = data["columns"]
        groups = data["groups"]
        
        print(f"Columns count: {len(columns)}")
        print(f"Groups count: {len(groups)}")
        
        if len(columns) > 0:
            print("Columns:")
            for col in columns:
                print(f"  - {col.get('title')} ({col.get('type')}) ID: {col.get('id')}")
        
        if len(groups) > 0:
            print("Groups:")
            for grp in groups:
                print(f"  - {grp.get('title')} ID: {grp.get('id')}")
    
    def test_05_save_monday_config(self):
        """Test PUT /api/wallet-topups/monday/config saves configuration"""
        # First get current config
        get_response = self.session.get(f"{BASE_URL}/api/wallet-topups/monday/config")
        current_config = get_response.json()
        
        # Save new config
        new_config = {
            "board_id": TARGET_BOARD_ID,
            "board_name": "Recharge Approval",
            "group_id": "",  # Will select later
            "enabled": True,
            "post_email_as_update": True,
            "column_mapping": {
                "amount": "",  # Will map in UI
                "sender_name": "",
                "status": "",
                "warning": "",
                "bank_reference": "",
                "email_date": "",
                "source": "",
                "confidence": "",
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json=new_config
        )
        print(f"Save Monday config response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        print(f"Saved config: {data}")
        
        # Verify saved fields
        assert data.get("board_id") == TARGET_BOARD_ID
        assert data.get("enabled") == True
        assert data.get("post_email_as_update") == True
    
    def test_06_save_column_mapping(self):
        """Test saving column mapping to Monday.com config"""
        # First get columns to find valid column IDs
        cols_response = self.session.get(f"{BASE_URL}/api/wallet-topups/monday/boards/{TARGET_BOARD_ID}/columns")
        if cols_response.status_code != 200:
            pytest.skip("Could not fetch columns")
        
        cols_data = cols_response.json()
        columns = cols_data.get("columns", [])
        groups = cols_data.get("groups", [])
        
        # Build column mapping based on available columns
        column_mapping = {}
        for col in columns:
            title = col.get("title", "").lower()
            col_id = col.get("id")
            
            # Map columns based on title patterns
            if "monto" in title or "amount" in title:
                column_mapping["amount"] = col_id
            elif "cliente" in title or "sender" in title or "name" in title:
                column_mapping["sender_name"] = col_id
            elif "status" in title:
                column_mapping["status"] = col_id
            elif "warning" in title or "risk" in title:
                column_mapping["warning"] = col_id
            elif "referencia" in title or "reference" in title:
                column_mapping["bank_reference"] = col_id
            elif "date" in title or "fecha" in title:
                column_mapping["email_date"] = col_id
        
        # Select first group if available
        group_id = groups[0]["id"] if groups else ""
        
        # Save config with mapping
        config = {
            "board_id": TARGET_BOARD_ID,
            "board_name": "Recharge Approval",
            "group_id": group_id,
            "enabled": True,
            "post_email_as_update": True,
            "column_mapping": column_mapping
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json=config
        )
        print(f"Save column mapping response: {response.status_code}")
        
        assert response.status_code == 200
        data = response.json()
        
        print(f"Mapped columns: {data.get('column_mapping', {})}")
        assert "column_mapping" in data
    
    def test_07_toggle_sync_enabled(self):
        """Test enabling/disabling Monday.com sync"""
        # Disable sync
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json={"enabled": False}
        )
        assert response.status_code == 200
        assert response.json().get("enabled") == False
        print("Sync disabled successfully")
        
        # Re-enable sync
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json={"enabled": True}
        )
        assert response.status_code == 200
        assert response.json().get("enabled") == True
        print("Sync re-enabled successfully")
    
    def test_08_toggle_post_update(self):
        """Test enabling/disabling post email as update"""
        # Disable
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json={"post_email_as_update": False}
        )
        assert response.status_code == 200
        assert response.json().get("post_email_as_update") == False
        print("Post update disabled")
        
        # Re-enable
        response = self.session.put(
            f"{BASE_URL}/api/wallet-topups/monday/config",
            json={"post_email_as_update": True}
        )
        assert response.status_code == 200
        assert response.json().get("post_email_as_update") == True
        print("Post update re-enabled")
    
    def test_09_auth_required(self):
        """Test that Monday.com endpoints require authentication"""
        # Create session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        # Test all Monday endpoints require auth
        endpoints = [
            ("GET", f"{BASE_URL}/api/wallet-topups/monday/config"),
            ("GET", f"{BASE_URL}/api/wallet-topups/monday/boards"),
            ("POST", f"{BASE_URL}/api/wallet-topups/monday/test"),
            ("PUT", f"{BASE_URL}/api/wallet-topups/monday/config"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                resp = no_auth_session.get(url)
            elif method == "POST":
                resp = no_auth_session.post(url)
            elif method == "PUT":
                resp = no_auth_session.put(url, json={})
            
            # Should be 401 or 403
            assert resp.status_code in [401, 403], f"{method} {url} returned {resp.status_code}"
            print(f"{method} {url} correctly requires auth: {resp.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
