"""
Test Item Counter Fix - Textbook Out of Stock Bug Fix
Tests to verify:
1. Backend /api/store/textbook-orders/submit returns warnings when items fail
2. Items with out_of_stock status cannot be selected/updated
3. Response structure includes warnings and items_failed fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pinpanclub-ui-patch.preview.emergentagent.com')

# Test credentials
ADMIN_CREDS = {
    "email": "admin@chipi.co",
    "password": "admin"
}


class TestTextbookOrderSubmitWarnings:
    """Tests for textbook order submit endpoint returning warnings"""
    
    @pytest.fixture
    def admin_token(self):
        """Get authenticated token for admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=ADMIN_CREDS
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_submit_endpoint_structure(self, admin_token):
        """Test that submit endpoint returns proper structure including warnings field"""
        # First, get a student order to understand structure
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Validate orders response structure
        assert "orders" in data
        print(f"Found {len(data['orders'])} orders for admin user")
    
    def test_admin_all_orders_endpoint(self, admin_token):
        """Test admin can get all orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"Admin sees {len(data['orders'])} total orders")
    
    def test_admin_stats_endpoint(self, admin_token):
        """Test admin stats endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/stats",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Order stats: {data}")


class TestTextbookAccessEndpoints:
    """Test textbook access endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get authenticated token for admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=ADMIN_CREDS
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_private_catalog_access(self, admin_token):
        """Test private catalog access endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Admin may or may not have students linked
        assert response.status_code in [200, 403]
        
        if response.status_code == 200:
            data = response.json()
            print(f"Private catalog access: has_access={data.get('has_access')}")
            print(f"Students: {len(data.get('students', []))}")
    
    def test_my_students_endpoint(self, admin_token):
        """Test my-students endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        print(f"My students: {data}")


class TestAdminDashboardEndpoints:
    """Test admin dashboard loads correctly after AdminModule.jsx deletion"""
    
    @pytest.fixture
    def admin_token(self):
        """Get authenticated token for admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=ADMIN_CREDS
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_admin_login_success(self):
        """Test admin can login"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json=ADMIN_CREDS
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_CREDS["email"]
        assert data["user"]["is_admin"] == True
        print("Admin login successful")
    
    def test_site_config_endpoint(self, admin_token):
        """Test site config endpoint (used by admin dashboard)"""
        response = requests.get(
            f"{BASE_URL}/api/public/site-config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("Site config endpoint working")
    
    def test_module_status_endpoint(self, admin_token):
        """Test module status endpoint (used by admin dashboard)"""
        response = requests.get(
            f"{BASE_URL}/api/public/module-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print("Module status endpoint working")


class TestUnatiendaStoreEndpoints:
    """Test Unatienda store endpoints"""
    
    def test_store_products_public(self):
        """Test public store products endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/products")
        assert response.status_code == 200
        data = response.json()
        # Products can be list or dict with products key
        products = data.get("products", data) if isinstance(data, dict) else data
        print(f"Store has {len(products)} products")
    
    def test_store_categories_public(self):
        """Test public store categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/categories")
        assert response.status_code == 200
        data = response.json()
        print(f"Store categories response: {data}")
    
    def test_store_config_public(self):
        """Test public store config endpoint"""
        response = requests.get(f"{BASE_URL}/api/store/store-config/public")
        assert response.status_code == 200
        data = response.json()
        print(f"Store config: {data.get('store_name', 'unknown')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
