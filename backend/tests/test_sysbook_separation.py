"""
Test suite for Sysbook/Store architectural separation - Iteration 192.
Verifies the complete module separation after moving services, models, and repositories.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


class TestBackendStartup:
    """Verify backend starts cleanly without import errors"""
    
    def test_health_check(self):
        """Backend should start and respond to health check"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("✓ Backend health check passed")


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_admin_login(self):
        """POST /api/auth-v2/login should return valid token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["is_admin"] == True
        print(f"✓ Admin login successful, token obtained")


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for subsequent tests"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15
    )
    if response.status_code != 200:
        pytest.skip("Authentication failed - cannot proceed with authenticated tests")
    return response.json()["token"]


class TestSysbookEndpoints:
    """Test all Sysbook module endpoints"""
    
    def test_sysbook_inventory_products(self, auth_token):
        """GET /api/sysbook/inventory/products should return products list"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        print(f"✓ Sysbook inventory: {len(data)} products returned")
    
    def test_sysbook_access_schools(self, auth_token):
        """GET /api/sysbook/access/schools should return schools list"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/access/schools",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of schools"
        print(f"✓ Sysbook schools: {len(data)} schools returned")
    
    def test_sysbook_stock_orders(self, auth_token):
        """GET /api/sysbook/stock-orders should return stock orders"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/stock-orders",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # Response could be a list or dict with orders key
        assert isinstance(data, (list, dict)), "Response should be list or dict"
        print(f"✓ Sysbook stock orders endpoint working")
    
    def test_sysbook_access_students(self, auth_token):
        """GET /api/sysbook/access/students should return student records"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/access/students",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        # 200 or 404 if no students exist
        assert response.status_code in [200, 404], f"Unexpected: {response.status_code} - {response.text}"
        print(f"✓ Sysbook students endpoint: {response.status_code}")
    
    def test_sysbook_analytics_dashboard(self, auth_token):
        """GET /api/sysbook/analytics/dashboard should return analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/analytics/dashboard",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, dict), "Response should be analytics dict"
        print(f"✓ Sysbook analytics dashboard working")


class TestStoreEndpoints:
    """Verify Store module still works independently"""
    
    def test_store_products(self, auth_token):
        """GET /api/store/products should return store products"""
        response = requests.get(
            f"{BASE_URL}/api/store/products",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        print(f"✓ Store products: {len(data)} products returned")


class TestSysbookImportRoutes:
    """Test sysbook-specific import routes"""
    
    def test_presale_import_orders(self, auth_token):
        """GET /api/sysbook/presale-import/orders should work"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/presale-import/orders",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ Presale import orders endpoint working")
    
    def test_bulk_import_history(self, auth_token):
        """GET /api/sysbook/bulk-import/history should work"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/bulk-import/history",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ Bulk import history endpoint working")
    
    def test_school_year_config(self, auth_token):
        """GET /api/sysbook/school-year/config should work"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/school-year/config",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ School year config endpoint working")


class TestSharedStoreRoutes:
    """Test routes shared between sysbook and store modules"""
    
    def test_monday_sync_config(self, auth_token):
        """GET /api/sysbook/monday/config should work (shared from store)"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/monday/config",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ Monday sync config endpoint working via sysbook prefix")


class TestSysbookBrowseRoutes:
    """Test sysbook browse (user-facing) routes"""
    
    def test_browse_access(self, auth_token):
        """GET /api/sysbook/browse/access should return access info"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/browse/access",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "has_access" in data or "students" in data, "Response should contain access info"
        print(f"✓ Browse access endpoint working")


class TestSysbookOrderRoutes:
    """Test sysbook order routes"""
    
    def test_my_orders(self, auth_token):
        """GET /api/sysbook/orders/my-orders should work"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ My orders endpoint working")
    
    def test_admin_all_orders(self, auth_token):
        """GET /api/sysbook/orders/admin/all should work (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/admin/all",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ Admin all orders endpoint working")


class TestAlertRoutes:
    """Test sysbook alert routes"""
    
    def test_alerts(self, auth_token):
        """GET /api/sysbook/alerts should work"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/alerts",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=15
        )
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        print(f"✓ Alerts endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
