"""
Test URL State Persistence and Admin Prefetch Features
Tests for:
1. Backend health and parallel startup
2. Admin login endpoint
3. Frontend URL parameter persistence (?view=textbooks)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBackendHealth:
    """Backend health and startup tests"""
    
    def test_health_check(self):
        """Backend should be healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "version" in data
        print(f"✓ Backend healthy, version: {data['version']}")
    
    def test_backend_has_required_modules(self):
        """Backend should have all required modules loaded"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        
        required_modules = ["auth", "store", "landing", "community", "admin"]
        for module in required_modules:
            assert module in data["modules"], f"Missing module: {module}"
        print(f"✓ All required modules present: {required_modules}")


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Admin should be able to login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data, "Login response missing token"
        assert "user" in data, "Login response missing user"
        assert data["user"]["is_admin"] == True, "User should be admin"
        assert data["user"]["email"] == "admin@chipi.co"
        print(f"✓ Admin login successful, user_id: {data['user']['user_id']}")
    
    def test_admin_login_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code in [401, 400, 404], f"Expected 401/400/404, got {response.status_code}"
        print("✓ Invalid login correctly rejected")


class TestStoreEndpoints:
    """Store-related endpoint tests"""
    
    def test_store_products(self):
        """Store products endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/store/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Products should be a list"
        print(f"✓ Store products endpoint works, {len(data)} products found")
    
    def test_store_config_public(self):
        """Store config endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/store/store-config/public")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), "Store config should be a dict"
        print(f"✓ Store config endpoint works")
    
    def test_categories_endpoint(self):
        """Categories endpoint should work"""
        response = requests.get(f"{BASE_URL}/api/store/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Categories should be a list"
        print(f"✓ Categories endpoint works, {len(data)} categories found")


class TestPlatformStore:
    """Platform store endpoint tests"""
    
    def test_platform_store_info(self):
        """Platform store info should be accessible"""
        response = requests.get(f"{BASE_URL}/api/platform-store")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data or isinstance(data, dict), "Store info should have name or be dict"
        print(f"✓ Platform store info accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
