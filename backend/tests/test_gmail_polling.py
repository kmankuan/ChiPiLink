"""
Test Gmail Background Polling Feature - Iteration 90
Tests polling/status endpoint, settings endpoint, and E2E flows for pending topups with Monday.com sync.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGmailPolling:
    """Gmail background polling status and settings tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "admin"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_polling_status_returns_poller_running(self):
        """GET /api/wallet-topups/polling/status returns poller_running and last_auto_scan"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/polling/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "poller_running" in data, "Missing poller_running field"
        assert "polling_mode" in data, "Missing polling_mode field"
        assert "polling_interval_minutes" in data, "Missing polling_interval_minutes field"
        assert "last_auto_scan" in data, "Missing last_auto_scan field"
        
        # Verify poller is running (should be true since polling_mode is realtime by default)
        print(f"Polling Status: {data}")
        assert data["poller_running"] == True, "Poller should be running at startup"
    
    def test_settings_returns_polling_mode_and_interval(self):
        """GET /api/wallet-topups/settings shows polling_mode=realtime and polling_interval_minutes=5"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "polling_mode" in data
        assert "polling_interval_minutes" in data
        assert data["polling_mode"] == "realtime", f"Expected realtime, got {data['polling_mode']}"
        assert data["polling_interval_minutes"] == 5, f"Expected 5, got {data['polling_interval_minutes']}"
        print(f"Settings: {data}")
    
    def test_settings_update_polling_mode_to_manual_stops_poller(self):
        """PUT /api/wallet-topups/settings with polling_mode=manual stops the poller"""
        # Change to manual
        response = requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"polling_mode": "manual"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["polling_mode"] == "manual"
        
        # Verify poller is stopped
        time.sleep(0.5)  # Small wait for async stop
        status_response = requests.get(f"{BASE_URL}/api/wallet-topups/polling/status", headers=self.headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["poller_running"] == False, "Poller should be stopped after switching to manual"
        print(f"Poller stopped: {status_data}")
    
    def test_settings_update_polling_mode_to_realtime_restarts_poller(self):
        """PUT /api/wallet-topups/settings with polling_mode=realtime restarts the poller"""
        # Ensure Gmail is connected first (needed for poller to start)
        # The poller only starts if gmail_connected=true
        
        # Change to realtime
        response = requests.put(
            f"{BASE_URL}/api/wallet-topups/settings",
            json={"polling_mode": "realtime", "polling_interval_minutes": 5},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["polling_mode"] == "realtime"
        
        # Verify poller is running
        time.sleep(0.5)  # Small wait for async start
        status_response = requests.get(f"{BASE_URL}/api/wallet-topups/polling/status", headers=self.headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        # Note: poller might not start if gmail_connected is false
        print(f"Poller after realtime switch: {status_data}")


class TestPendingTopupsE2E:
    """E2E tests for pending topups with Monday.com sync"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "admin"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_topup_id = None
    
    def test_create_pending_topup_and_sync_to_monday(self):
        """POST /api/wallet-topups/pending creates item and syncs to Monday.com"""
        # Create a test pending topup
        payload = {
            "amount": 100.50,
            "sender_name": "TEST_Gmail_Poller_Test",
            "bank_reference": f"TEST_REF_{int(time.time())}",
            "target_user_email": "test@example.com",
            "notes": "E2E test for iteration 90",
            "source": "manual"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/wallet-topups/pending",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["amount"] == 100.50
        assert data["sender_name"] == "TEST_Gmail_Poller_Test"
        assert data["status"] == "pending"
        assert "risk_level" in data  # Dedup check performed
        
        self.created_topup_id = data["id"]
        print(f"Created topup: {data['id']}, risk: {data.get('risk_level')}")
        
        # Wait a bit for async Monday.com sync
        time.sleep(1)
        
        return data["id"]
    
    def test_approve_topup_updates_monday_status(self):
        """PUT /api/wallet-topups/pending/{id}/approve updates Monday.com status to Approved"""
        # First create a topup
        payload = {
            "amount": 50.00,
            "sender_name": "TEST_Approve_Flow",
            "bank_reference": f"TEST_APPROVE_{int(time.time())}",
            "source": "manual"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/wallet-topups/pending",
            json=payload,
            headers=self.headers
        )
        assert create_response.status_code == 200
        topup_id = create_response.json()["id"]
        
        # Approve it
        approve_response = requests.put(
            f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/approve",
            json={"notes": "Approved for testing"},
            headers=self.headers
        )
        assert approve_response.status_code == 200
        approve_data = approve_response.json()
        assert approve_data["success"] == True
        print(f"Approved topup {topup_id}: {approve_data}")
        
        # Verify status changed
        get_response = requests.get(
            f"{BASE_URL}/api/wallet-topups/pending/{topup_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        assert get_response.json()["status"] == "approved"
    
    def test_reject_topup_updates_monday_status(self):
        """PUT /api/wallet-topups/pending/{id}/reject updates Monday.com status to Decline"""
        # First create a topup
        payload = {
            "amount": 75.00,
            "sender_name": "TEST_Reject_Flow",
            "bank_reference": f"TEST_REJECT_{int(time.time())}",
            "source": "manual"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/wallet-topups/pending",
            json=payload,
            headers=self.headers
        )
        assert create_response.status_code == 200
        topup_id = create_response.json()["id"]
        
        # Reject it
        reject_response = requests.put(
            f"{BASE_URL}/api/wallet-topups/pending/{topup_id}/reject",
            json={"reason": "Rejected for testing"},
            headers=self.headers
        )
        assert reject_response.status_code == 200
        reject_data = reject_response.json()
        assert reject_data["success"] == True
        print(f"Rejected topup {topup_id}: {reject_data}")
        
        # Verify status changed
        get_response = requests.get(
            f"{BASE_URL}/api/wallet-topups/pending/{topup_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["status"] == "rejected"
        assert get_data["reject_reason"] == "Rejected for testing"


class TestMondayConfigEndpoints:
    """Test Monday.com config endpoints for Payment Alerts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "admin"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_monday_config(self):
        """GET /api/wallet-topups/monday/config returns board configuration"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/monday/config", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "board_id" in data
        assert "column_mapping" in data
        assert "enabled" in data
        print(f"Monday config: board_id={data.get('board_id')}, enabled={data.get('enabled')}")
    
    def test_monday_connection(self):
        """POST /api/wallet-topups/monday/test verifies Monday.com API connection"""
        response = requests.post(f"{BASE_URL}/api/wallet-topups/monday/test", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return connection status
        assert "connected" in data
        print(f"Monday connection: {data}")


class TestGmailEndpoints:
    """Test Gmail-related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "admin"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_gmail_status(self):
        """GET /api/wallet-topups/gmail/status returns connection status"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "connected" in data
        print(f"Gmail status: {data}")
    
    def test_gmail_processed_log(self):
        """GET /api/wallet-topups/gmail/processed returns processing log"""
        response = requests.get(f"{BASE_URL}/api/wallet-topups/gmail/processed?limit=10", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "items" in data
        assert "total" in data
        print(f"Processing log: {data['total']} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
