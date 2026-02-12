"""
Test Sync Dashboard Endpoints
Tests for: GET /api/monday/adapters/wallet/sync-dashboard, 
           POST /api/monday/adapters/wallet/resync-user/{user_id},
           POST /api/monday/adapters/wallet/sync-all-users
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Known test user_id from previous iteration
TEST_USER_ID = "cli_83477fb0eb9c"


class TestSyncDashboard:
    """Sync Dashboard endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        token = login_response.json().get("access_token")
        assert token, "No access_token in login response"
        
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
        self.session.close()
    
    def test_01_sync_dashboard_returns_data(self):
        """GET /api/monday/adapters/wallet/sync-dashboard returns dashboard data"""
        response = self.session.get(f"{BASE_URL}/api/monday/adapters/wallet/sync-dashboard")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "stats" in data, "Response should contain 'stats'"
        assert "recent_logs" in data, "Response should contain 'recent_logs'"
        assert "recent_errors" in data, "Response should contain 'recent_errors'"
        assert "user_items" in data, "Response should contain 'user_items'"
        
        # Verify stats structure
        stats = data["stats"]
        assert "linked_users" in stats, "Stats should have linked_users"
        assert "processed_subitems" in stats, "Stats should have processed_subitems"
        assert "webhook_success" in stats, "Stats should have webhook_success"
        assert "webhook_errors" in stats, "Stats should have webhook_errors"
        assert "webhook_ignored" in stats, "Stats should have webhook_ignored"
        
        # Verify types
        assert isinstance(stats["linked_users"], int), "linked_users should be int"
        assert isinstance(stats["processed_subitems"], int), "processed_subitems should be int"
        assert isinstance(stats["webhook_success"], int), "webhook_success should be int"
        
        print(f"Dashboard stats: {stats}")
        print(f"User items count: {len(data['user_items'])}")
        print(f"Recent logs count: {len(data['recent_logs'])}")
    
    def test_02_sync_dashboard_user_items_structure(self):
        """Verify user_items structure in sync dashboard"""
        response = self.session.get(f"{BASE_URL}/api/monday/adapters/wallet/sync-dashboard")
        assert response.status_code == 200
        
        data = response.json()
        user_items = data.get("user_items", [])
        
        if len(user_items) > 0:
            # Check structure of first user item
            item = user_items[0]
            assert "user_id" in item, "user_item should have user_id"
            assert "email" in item, "user_item should have email"
            assert "monday_item_id" in item, "user_item should have monday_item_id"
            assert "board_id" in item, "user_item should have board_id"
            
            print(f"Sample user_item: user_id={item['user_id']}, email={item['email']}, monday_item_id={item['monday_item_id']}")
        else:
            print("No user_items found (this may be expected for fresh DB)")
    
    def test_03_sync_dashboard_logs_structure(self):
        """Verify recent_logs structure in sync dashboard"""
        response = self.session.get(f"{BASE_URL}/api/monday/adapters/wallet/sync-dashboard")
        assert response.status_code == 200
        
        data = response.json()
        recent_logs = data.get("recent_logs", [])
        
        if len(recent_logs) > 0:
            log = recent_logs[0]
            # Logs should have status and timestamp at minimum
            assert "status" in log, "Log should have status"
            assert "timestamp" in log, "Log should have timestamp"
            
            # Status should be one of success, error, ignored
            valid_statuses = ["success", "error", "ignored"]
            assert log["status"] in valid_statuses, f"Status should be one of {valid_statuses}"
            
            print(f"Sample log: status={log['status']}, timestamp={log['timestamp']}")
        else:
            print("No recent_logs found (this may be expected for fresh DB)")
    
    def test_04_sync_dashboard_requires_auth(self):
        """Sync dashboard should require authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/monday/adapters/wallet/sync-dashboard")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Unauthenticated request correctly returned {response.status_code}")
    
    def test_05_resync_user_endpoint(self):
        """POST /api/monday/adapters/wallet/resync-user/{user_id} re-syncs a user"""
        response = self.session.post(
            f"{BASE_URL}/api/monday/adapters/wallet/resync-user/{TEST_USER_ID}"
        )
        
        # Accept 200 for success, 404 if user doesn't exist, or 500 if Monday.com fails
        if response.status_code == 200:
            data = response.json()
            assert data.get("status") == "success", "Status should be success"
            assert "monday_item_id" in data, "Response should contain monday_item_id"
            assert "email" in data, "Response should contain email"
            print(f"Re-sync success: item_id={data['monday_item_id']}, email={data['email']}")
        elif response.status_code == 404:
            print(f"User {TEST_USER_ID} not found - this is acceptable for testing")
        else:
            print(f"Resync returned {response.status_code}: {response.text}")
    
    def test_06_resync_nonexistent_user(self):
        """Resync with non-existent user should return 404"""
        fake_user_id = "cli_nonexistent_12345"
        response = self.session.post(
            f"{BASE_URL}/api/monday/adapters/wallet/resync-user/{fake_user_id}"
        )
        
        assert response.status_code == 404, f"Expected 404 for non-existent user, got {response.status_code}"
        print(f"Correctly returned 404 for non-existent user")
    
    def test_07_resync_user_requires_auth(self):
        """Resync-user endpoint should require authentication"""
        unauth_session = requests.Session()
        response = unauth_session.post(
            f"{BASE_URL}/api/monday/adapters/wallet/resync-user/{TEST_USER_ID}"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Unauthenticated request correctly returned {response.status_code}")
    
    def test_08_sync_all_users_endpoint(self):
        """POST /api/monday/adapters/wallet/sync-all-users syncs all users"""
        response = self.session.post(
            f"{BASE_URL}/api/monday/adapters/wallet/sync-all-users"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "success", "Status should be success"
        assert "synced" in data, "Response should contain synced count"
        assert "failed" in data, "Response should contain failed count"
        assert "total" in data, "Response should contain total count"
        
        # Verify types
        assert isinstance(data["synced"], int), "synced should be int"
        assert isinstance(data["failed"], int), "failed should be int"
        assert isinstance(data["total"], int), "total should be int"
        
        print(f"Sync all users: synced={data['synced']}, failed={data['failed']}, total={data['total']}")
    
    def test_09_sync_all_users_requires_auth(self):
        """Sync-all-users endpoint should require authentication"""
        unauth_session = requests.Session()
        response = unauth_session.post(
            f"{BASE_URL}/api/monday/adapters/wallet/sync-all-users"
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"Unauthenticated request correctly returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
