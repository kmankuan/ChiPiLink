"""
Test Sysbook Route Migration
Validates that routes have been moved from /api/store/* to /api/sysbook/*
Tests new route structure and ensures old routes return 404
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
    data = response.json()
    token = data.get("token") or data.get("access_token")
    if not token:
        pytest.skip(f"No token in response: {data}")
    return token


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with Bearer token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestAuthEndpoint:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Test admin can log in"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data or "access_token" in data
        print(f"Admin login successful")


class TestNewSysbookRoutes:
    """Test new /api/sysbook/* routes"""
    
    def test_browse_access(self, auth_headers):
        """GET /api/sysbook/browse/access - returns has_access"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/browse/access",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "has_access" in data, f"Missing has_access in response: {data}"
        print(f"Browse access: has_access={data.get('has_access')}, students={len(data.get('students', []))}")
    
    def test_access_my_students(self, auth_headers):
        """GET /api/sysbook/access/my-students - returns student list"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/access/my-students",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "students" in data, f"Missing students in response: {data}"
        print(f"My students: {len(data.get('students', []))} students found")
    
    def test_orders_my_orders(self, auth_headers):
        """GET /api/sysbook/orders/my-orders - returns orders"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data, f"Missing orders in response: {data}"
        print(f"My orders: {len(data.get('orders', []))} orders found")
    
    def test_presale_import_orders(self, auth_headers):
        """GET /api/sysbook/presale-import/orders - returns presale data"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/presale-import/orders",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data or "count" in data, f"Unexpected response structure: {data}"
        print(f"Presale orders: {data.get('count', len(data.get('orders', [])))} orders")
    
    def test_school_year_config(self, auth_headers):
        """GET /api/sysbook/school-year/config - returns school year config"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/school-year/config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"School year config: {data.get('current_school_year', 'N/A')}")
    
    def test_bulk_import_history(self, auth_headers):
        """GET /api/sysbook/bulk-import/history - returns import history"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/bulk-import/history",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        print(f"Bulk import history: {len(data.get('history', []))} records")
    
    def test_browse_products(self, auth_headers):
        """GET /api/sysbook/browse/products - returns sysbook products"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/browse/products",
            headers=auth_headers
        )
        # Could be 200 (has access) or 403 (no access)
        assert response.status_code in [200, 403], f"Unexpected status: {response.status_code}"
        print(f"Browse products: status={response.status_code}")
    
    def test_sysbook_inventory_products(self, auth_headers):
        """GET /api/sysbook/inventory/products - admin inventory"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, f"Missing products: {data}"
        print(f"Sysbook inventory: {data.get('total', len(data.get('products', [])))} products")


class TestOldRoutesRemoved:
    """Test old /api/store/* routes are removed (should return 404)"""
    
    def test_old_sysbook_catalog_access_404(self, auth_headers):
        """OLD: /api/store/sysbook-catalog/access should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/sysbook-catalog/access",
            headers=auth_headers
        )
        # Should be 404 since route was moved to /api/sysbook/browse/access
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old sysbook-catalog/access route correctly returns 404")
    
    def test_old_textbook_access_my_students_404(self, auth_headers):
        """OLD: /api/store/textbook-access/my-students should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old textbook-access/my-students route correctly returns 404")
    
    def test_old_textbook_orders_my_orders_404(self, auth_headers):
        """OLD: /api/store/textbook-orders/my-orders should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old textbook-orders/my-orders route correctly returns 404")
    
    def test_old_presale_import_orders_404(self, auth_headers):
        """OLD: /api/store/presale-import/orders should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/presale-import/orders",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old presale-import/orders route correctly returns 404")
    
    def test_old_school_year_config_404(self, auth_headers):
        """OLD: /api/store/school-year/config should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/school-year/config",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old school-year/config route correctly returns 404")
    
    def test_old_bulk_import_history_404(self, auth_headers):
        """OLD: /api/store/bulk-import/history should return 404"""
        response = requests.get(
            f"{BASE_URL}/api/store/bulk-import/history",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 (route removed), got {response.status_code}"
        print("Old bulk-import/history route correctly returns 404")


class TestAccessConfig:
    """Test access config endpoint"""
    
    def test_access_config_no_auth(self):
        """GET /api/sysbook/access/config - public endpoint for form config"""
        response = requests.get(f"{BASE_URL}/api/sysbook/access/config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "grades" in data or "available_years" in data, f"Unexpected response: {data}"
        print(f"Access config: grades={data.get('grades')}, years={data.get('available_years')}")


class TestAdminStudentRoutes:
    """Test admin student management routes"""
    
    def test_admin_all_students(self, auth_headers):
        """GET /api/sysbook/access/admin/all-students"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/access/admin/all-students",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "students" in data
        print(f"Admin all students: {len(data.get('students', []))} students")
    
    def test_admin_requests(self, auth_headers):
        """GET /api/sysbook/access/admin/requests"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/access/admin/requests",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "requests" in data
        print(f"Admin requests: {len(data.get('requests', []))} pending requests")


class TestAdminOrderRoutes:
    """Test admin order management routes"""
    
    def test_admin_all_orders(self, auth_headers):
        """GET /api/sysbook/orders/admin/all"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/admin/all",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"Admin all orders: {len(data.get('orders', []))} orders")
    
    def test_admin_order_stats(self, auth_headers):
        """GET /api/sysbook/orders/admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/admin/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Admin order stats retrieved successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
