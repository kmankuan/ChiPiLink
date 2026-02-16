"""
Tests for Unatienda refactoring verification
Tests that all store APIs work correctly after refactoring
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://player-enhance-1.preview.emergentagent.com')

# Test credentials
CLIENT_EMAIL = "test@client.com"
CLIENT_PASSWORD = "password"
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"

# Test order IDs
TEST_ORDER_BETA = "ord_2f069060c203"  # Test Student Beta
TEST_ORDER_ALPHA = "ord_a3480a98d56d"  # Test Student Alpha


@pytest.fixture(scope="module")
def client_token():
    """Get client auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": CLIENT_EMAIL, "password": CLIENT_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Client authentication failed")


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


class TestHealthAndProducts:
    """Test health and product endpoints"""
    
    def test_health_endpoint(self):
        """Test /api/health returns healthy status"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "store" in data["modules"]
        print(f"Health check passed: version {data.get('version')}")
    
    def test_products_list(self):
        """Test GET /api/store/products returns products"""
        response = requests.get(f"{BASE_URL}/api/store/products")
        assert response.status_code == 200
        products = response.json()
        assert isinstance(products, list)
        assert len(products) > 0
        print(f"Found {len(products)} products")
        
        # Verify product structure
        first_product = products[0]
        assert "book_id" in first_product or "libro_id" in first_product
        assert "name" in first_product or "nombre" in first_product
        assert "price" in first_product or "precio" in first_product
    
    def test_store_categories(self):
        """Test GET /api/store/categories returns categories"""
        response = requests.get(f"{BASE_URL}/api/store/categories")
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list)
        print(f"Found {len(categories)} categories")
    
    def test_products_grades(self):
        """Test GET /api/store/products/grades returns grades"""
        response = requests.get(f"{BASE_URL}/api/store/products/grades")
        assert response.status_code == 200
        data = response.json()
        assert "grades" in data
        print(f"Grades available: {data['grades']}")
    
    def test_store_config_public(self):
        """Test GET /api/store/store-config/public returns config"""
        response = requests.get(f"{BASE_URL}/api/store/store-config/public")
        assert response.status_code == 200
        config = response.json()
        # Should have textbooks_category_enabled
        print(f"Store config keys: {list(config.keys())[:5]}...")


class TestTextbookOrders:
    """Test textbook order endpoints"""
    
    def test_my_orders_requires_auth(self):
        """Test GET /api/store/textbook-orders/my-orders requires auth"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/my-orders")
        assert response.status_code == 401 or response.status_code == 403
    
    def test_my_orders_authenticated(self, client_token):
        """Test GET /api/store/textbook-orders/my-orders with auth"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        print(f"User has {len(data['orders'])} orders")
        
        # Verify order structure if orders exist
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            assert "order_id" in order
            assert "student_name" in order
            assert "status" in order
            assert "items" in order
            print(f"First order: {order['order_id']} - {order['student_name']}")
    
    def test_private_catalog_access(self, client_token):
        """Test GET /api/store/private-catalog/access"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "has_access" in data
        print(f"Private catalog access: {data['has_access']}")
        
        if data.get("students"):
            print(f"Linked students: {len(data['students'])}")


class TestChatUpdates:
    """Test chat/updates endpoints"""
    
    def test_get_order_updates(self, client_token):
        """Test GET /api/store/textbook-orders/{order_id}/updates"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_BETA}/updates",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "updates" in data
        assert "has_monday_item" in data
        print(f"Order {TEST_ORDER_BETA} has {len(data['updates'])} updates")
    
    def test_post_order_update(self, client_token):
        """Test POST /api/store/textbook-orders/{order_id}/updates"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_BETA}/updates",
            headers={
                "Authorization": f"Bearer {client_token}",
                "Content-Type": "application/json"
            },
            json={"message": f"Test from refactoring tests {unique_id}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True or data.get("update_id") is not None
        print(f"Posted update with ID: {data.get('update_id', 'success')}")
    
    def test_get_updates_for_alpha_order(self, client_token):
        """Test GET updates for second order (Alpha)"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/{TEST_ORDER_ALPHA}/updates",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "updates" in data
        print(f"Order {TEST_ORDER_ALPHA} has {len(data['updates'])} updates")


class TestPlatformStore:
    """Test platform store endpoints"""
    
    def test_platform_store_info(self):
        """Test GET /api/platform-store"""
        response = requests.get(f"{BASE_URL}/api/platform-store")
        assert response.status_code == 200
        data = response.json()
        # Should have store name
        print(f"Store name: {data.get('name', 'Unatienda')}")


class TestTextbookAccess:
    """Test textbook access endpoints"""
    
    def test_my_students(self, client_token):
        """Test GET /api/store/textbook-access/my-students"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # Should return 200 or 404 if no students
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            print(f"My students response: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
