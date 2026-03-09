"""
Test Data Manager Module - Admin Data Manager Routes
Tests for GET /api/data-manager/stats, POST /api/data-manager/clear, POST /api/data-manager/seed-demo
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.fail(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Headers with authentication"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestDataManagerStats:
    """Tests for GET /api/data-manager/stats endpoint"""
    
    def test_stats_returns_200(self, auth_headers):
        """Test that stats endpoint returns 200 for authenticated admin"""
        response = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_stats_returns_all_8_modules(self, auth_headers):
        """Test that stats returns all 8 modules defined in MODULE_COLLECTIONS"""
        response = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        expected_modules = ["pinpanclub", "sysbook", "store", "users", "wallets", "memberships", "community", "crm"]
        
        for module in expected_modules:
            assert module in data, f"Module '{module}' not found in stats response"
            assert "label" in data[module], f"Module '{module}' missing 'label'"
            assert "collections" in data[module], f"Module '{module}' missing 'collections'"
            assert "total" in data[module], f"Module '{module}' missing 'total'"
    
    def test_stats_returns_collection_level_counts(self, auth_headers):
        """Test that each module contains collection-level counts with labels"""
        response = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Check pinpanclub collections
        pinpan = data.get("pinpanclub", {})
        assert "pinpanclub_achievements" in pinpan.get("collections", {}), "pinpanclub_achievements collection missing"
        
        # Check users collections
        users = data.get("users", {})
        assert "auth_users" in users.get("collections", {}), "auth_users collection missing"
        
        # Verify collection structure
        for mod_key, mod_info in data.items():
            if mod_key == "_meta":
                continue
            for coll_name, coll_info in mod_info.get("collections", {}).items():
                assert "label" in coll_info, f"Collection {coll_name} missing 'label'"
                assert "count" in coll_info, f"Collection {coll_name} missing 'count'"
                assert isinstance(coll_info["count"], int), f"Collection {coll_name} count should be int"
    
    def test_stats_returns_meta_admin_count(self, auth_headers):
        """Test that stats includes _meta with admin_user_count"""
        response = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "_meta" in data, "_meta field missing"
        assert "admin_user_count" in data["_meta"], "admin_user_count missing in _meta"
        assert data["_meta"]["admin_user_count"] >= 1, "Should have at least 1 admin user"


class TestDataManagerClear:
    """Tests for POST /api/data-manager/clear endpoint"""
    
    def test_clear_without_confirm_returns_400(self, auth_headers):
        """Test that clear without confirm=true returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"collections": ["pinpanclub_achievements"], "confirm": False},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "confirm" in response.json().get("detail", "").lower(), "Error should mention confirm flag"
    
    def test_clear_without_module_or_collections_returns_400(self, auth_headers):
        """Test that clear without module or collections returns 400"""
        response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"confirm": True},
            headers=auth_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_clear_with_invalid_module_returns_404(self, auth_headers):
        """Test that clear with unknown module returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"module": "invalid_module_xyz", "confirm": True},
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_clear_collection_works_with_confirm_true(self, auth_headers):
        """Test that clearing a single collection works with confirm=true"""
        response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"collections": ["pinpanclub_achievements"], "confirm": True},
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "cleared", "Status should be 'cleared'"
        assert "results" in data, "Response should contain results"
        assert "pinpanclub_achievements" in data["results"], "Results should contain cleared collection"
        assert "deleted" in data["results"]["pinpanclub_achievements"], "Result should contain deleted count"


class TestDataManagerAdminProtection:
    """Tests for admin account protection during clear operations"""
    
    def test_clear_auth_users_protects_admins(self, auth_headers):
        """Test that clearing auth_users collection preserves admin accounts"""
        # First get the admin count
        stats_response = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        assert stats_response.status_code == 200
        admin_count_before = stats_response.json().get("_meta", {}).get("admin_user_count", 0)
        
        # Clear auth_users (should protect admins)
        clear_response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"collections": ["auth_users"], "confirm": True},
            headers=auth_headers
        )
        assert clear_response.status_code == 200, f"Clear failed: {clear_response.text}"
        
        result = clear_response.json()
        assert "note" in result.get("results", {}).get("auth_users", {}), "Should have protection note"
        assert "protected" in result["results"]["auth_users"]["note"].lower(), "Note should mention protected"
        
        # Verify admin count is still the same
        stats_after = requests.get(f"{BASE_URL}/api/data-manager/stats", headers=auth_headers)
        admin_count_after = stats_after.json().get("_meta", {}).get("admin_user_count", 0)
        assert admin_count_after >= admin_count_before, "Admin accounts should be preserved"


class TestDataManagerSeedDemo:
    """Tests for POST /api/data-manager/seed-demo endpoint"""
    
    def test_seed_demo_returns_success(self, auth_headers):
        """Test that seed-demo endpoint returns success"""
        response = requests.post(f"{BASE_URL}/api/data-manager/seed-demo", headers=auth_headers)
        # Expect either 200 or 201 for success
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"


class TestDataManagerUnauthenticated:
    """Tests for unauthenticated access"""
    
    def test_stats_requires_auth(self):
        """Test that stats endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/data-manager/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_clear_requires_auth(self):
        """Test that clear endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/data-manager/clear",
            json={"collections": ["test"], "confirm": True}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_seed_demo_requires_auth(self):
        """Test that seed-demo endpoint requires authentication"""
        response = requests.post(f"{BASE_URL}/api/data-manager/seed-demo")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
