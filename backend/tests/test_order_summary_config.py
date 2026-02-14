"""
Tests for Order Summary Config API
Endpoint: /api/store/order-summary-config
Features:
- GET returns default config with all sections enabled (public)
- PUT updates config fields (admin only)
- PUT rejects non-admin users
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrderSummaryConfig:
    """Order Summary Config endpoint tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def non_admin_token(self):
        """Get non-admin user token by registering a test user"""
        import uuid
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        # First register a new user
        reg_response = requests.post(f"{BASE_URL}/api/auth-v2/register", json={
            "email": test_email,
            "password": "testpassword123",
            "name": "Test User"
        })
        if reg_response.status_code == 200:
            return reg_response.json().get("token")
        
        # If registration fails (maybe user exists or registration disabled), skip non-admin tests
        pytest.skip("Could not create non-admin test user")
    
    def test_get_config_public_access(self):
        """Test: GET /api/store/order-summary-config returns config without auth (public)"""
        response = requests.get(f"{BASE_URL}/api/store/order-summary-config")
        
        # Status code assertion
        assert response.status_code == 200, f"GET config failed: {response.text}"
        
        # Data assertions - validate response structure and default values
        data = response.json()
        assert "show_student_info" in data, "Missing show_student_info field"
        assert "show_book_list" in data, "Missing show_book_list field"
        assert "show_form_data" in data, "Missing show_form_data field"
        assert "show_wallet_balance" in data, "Missing show_wallet_balance field"
        assert "show_total" in data, "Missing show_total field"
        
        # All fields should be booleans
        assert isinstance(data["show_student_info"], bool)
        assert isinstance(data["show_book_list"], bool)
        assert isinstance(data["show_form_data"], bool)
        assert isinstance(data["show_wallet_balance"], bool)
        assert isinstance(data["show_total"], bool)
    
    def test_get_config_default_all_enabled(self):
        """Test: Default config has all sections enabled"""
        response = requests.get(f"{BASE_URL}/api/store/order-summary-config")
        
        assert response.status_code == 200
        data = response.json()
        
        # Default values should all be True
        assert data["show_student_info"] == True, "show_student_info should be True by default"
        assert data["show_book_list"] == True, "show_book_list should be True by default"
        assert data["show_form_data"] == True, "show_form_data should be True by default"
        assert data["show_wallet_balance"] == True, "show_wallet_balance should be True by default"
        assert data["show_total"] == True, "show_total should be True by default"
    
    def test_put_config_admin_success(self, admin_token):
        """Test: PUT /api/store/order-summary-config works for admin user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update a single field
        response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={"show_form_data": False},
            headers=headers
        )
        
        assert response.status_code == 200, f"PUT config failed: {response.text}"
        
        # Verify the update was applied
        data = response.json()
        assert data["show_form_data"] == False, "show_form_data should be False after update"
        
        # Verify with GET that change persisted
        get_response = requests.get(f"{BASE_URL}/api/store/order-summary-config")
        assert get_response.status_code == 200
        assert get_response.json()["show_form_data"] == False
        
        # Restore to default
        restore_response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={"show_form_data": True},
            headers=headers
        )
        assert restore_response.status_code == 200
        assert restore_response.json()["show_form_data"] == True
    
    def test_put_config_multiple_fields(self, admin_token):
        """Test: PUT can update multiple fields at once"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update multiple fields
        response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={
                "show_student_info": False,
                "show_wallet_balance": False
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["show_student_info"] == False
        assert data["show_wallet_balance"] == False
        # Other fields should remain unchanged (True)
        assert data["show_book_list"] == True
        assert data["show_total"] == True
        
        # Restore to defaults
        restore_response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={
                "show_student_info": True,
                "show_wallet_balance": True
            },
            headers=headers
        )
        assert restore_response.status_code == 200
    
    def test_put_config_rejects_unauthenticated(self):
        """Test: PUT /api/store/order-summary-config rejects unauthenticated requests"""
        response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={"show_form_data": False}
        )
        
        # Should return 401 or 403 for unauthenticated
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_put_config_rejects_non_admin(self, non_admin_token):
        """Test: PUT /api/store/order-summary-config rejects non-admin users"""
        headers = {"Authorization": f"Bearer {non_admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={"show_form_data": False},
            headers=headers
        )
        
        # Should return 403 for non-admin users
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}"
    
    def test_put_config_ignores_invalid_fields(self, admin_token):
        """Test: PUT ignores unknown fields and only updates valid ones"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={
                "show_total": False,
                "invalid_field": "should_be_ignored"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "invalid_field" not in data
        assert data["show_total"] == False
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/store/order-summary-config",
            json={"show_total": True},
            headers=headers
        )


class TestAdminLogin:
    """Verify admin login works correctly"""
    
    def test_admin_login(self):
        """Test: Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("email") == "admin@chipi.co"
