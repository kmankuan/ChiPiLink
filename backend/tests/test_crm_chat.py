"""
CRM Chat API Tests
Tests for multi-topic CRM chat system via Monday.com Admin Customers board.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://school-dropdown-fix.preview.emergentagent.com"


class TestCrmChatAdminConfig:
    """CRM Config endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed - skipping tests")

    def test_get_crm_config(self):
        """GET /api/store/crm-chat/admin/config - should return CRM board configuration"""
        response = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/config", headers=self.headers)
        print(f"GET /api/store/crm-chat/admin/config: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        # Should have board_id, email_column_id, name_column_id, column_mapping keys
        assert "board_id" in data
        assert "email_column_id" in data
        assert "column_mapping" in data

    def test_put_crm_config(self):
        """PUT /api/store/crm-chat/admin/config - should save CRM board config"""
        # First get current config
        get_resp = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/config", headers=self.headers)
        current_config = get_resp.json()
        
        # Save the same config (to not break anything)
        payload = {
            "board_id": current_config.get("board_id") or "5931665026",
            "email_column_id": current_config.get("email_column_id") or "email"
        }
        response = requests.put(
            f"{BASE_URL}/api/store/crm-chat/admin/config",
            headers={**self.headers, "Content-Type": "application/json"},
            json=payload
        )
        print(f"PUT /api/store/crm-chat/admin/config: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True

    def test_get_board_columns(self):
        """GET /api/store/crm-chat/admin/config/board-columns - should return columns from configured Monday.com board"""
        response = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/config/board-columns", headers=self.headers)
        print(f"GET /api/store/crm-chat/admin/config/board-columns: {response.status_code}")
        
        # Could be 400 if board not configured, or 200 with columns
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data}")
            assert "columns" in data
            assert isinstance(data["columns"], list)
        elif response.status_code == 400:
            data = response.json()
            print(f"Response (400): {data}")
            # Expected if board not configured
            assert "detail" in data
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")

    def test_get_admin_inbox(self):
        """GET /api/store/crm-chat/admin/inbox - should return conversations list"""
        response = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/inbox", headers=self.headers)
        print(f"GET /api/store/crm-chat/admin/inbox: {response.status_code}")
        print(f"Response: {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        assert "conversations" in data
        assert "total" in data
        assert isinstance(data["conversations"], list)
        assert isinstance(data["total"], int)

    def test_config_requires_auth(self):
        """Config endpoints should require admin authentication"""
        # Without auth
        response = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/config")
        assert response.status_code == 401, "Should require auth"
        
        response = requests.put(f"{BASE_URL}/api/store/crm-chat/admin/config", json={"board_id": "123"})
        assert response.status_code == 401, "Should require auth"
        
        response = requests.get(f"{BASE_URL}/api/store/crm-chat/admin/inbox")
        assert response.status_code == 401, "Should require auth"


class TestCrmChatClientEndpoints:
    """CRM Chat client endpoints - require regular user auth"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Authentication failed")

    def test_get_topics_for_invalid_student(self):
        """GET /api/store/crm-chat/{student_id}/topics with invalid student"""
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/invalid-student-id/topics",
            headers=self.headers
        )
        print(f"GET /api/store/crm-chat/invalid-student-id/topics: {response.status_code}")
        # Should return 404 for student not found
        assert response.status_code == 404

    def test_create_topic_requires_auth(self):
        """Creating topic should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/store/crm-chat/some-student/topics",
            json={"subject": "Test", "message": "Test message"}
        )
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
