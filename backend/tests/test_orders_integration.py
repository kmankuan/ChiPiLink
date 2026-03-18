"""
Test Orders Integration - Cart/Orders Refactoring
Tests for:
- GET /api/platform-store/my-orders (user's Unatienda orders)
- GET /api/sysbook/orders/my-orders (user's textbook orders)
- POST /api/platform-store/orders (create Unatienda order)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "teck@koh.one"
TEST_PASSWORD = "Acdb##0897"


class TestAuthentication:
    """Authentication tests to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for testing"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        return data["token"]
    
    def test_login_returns_token(self):
        """Verify login works and returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL


class TestPlatformStoreMyOrders:
    """Tests for GET /api/platform-store/my-orders endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["token"]
    
    def test_my_orders_returns_200_with_auth(self, auth_token):
        """GET /api/platform-store/my-orders returns 200 with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/platform-store/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_my_orders_returns_orders_array(self, auth_token):
        """Response contains orders array"""
        response = requests.get(
            f"{BASE_URL}/api/platform-store/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        assert isinstance(data["orders"], list), "Orders should be a list"
    
    def test_my_orders_returns_401_without_auth(self):
        """GET /api/platform-store/my-orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/platform-store/my-orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestSysbookMyOrders:
    """Tests for GET /api/sysbook/orders/my-orders endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["token"]
    
    def test_textbook_orders_returns_200_with_auth(self, auth_token):
        """GET /api/sysbook/orders/my-orders returns 200 with valid auth"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_textbook_orders_returns_orders_array(self, auth_token):
        """Response contains orders array with textbook orders"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        assert isinstance(data["orders"], list), "Orders should be a list"
    
    def test_textbook_orders_have_expected_fields(self, auth_token):
        """Textbook orders have expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            expected_fields = ["order_id", "student_name", "grade", "year", "items", "status"]
            for field in expected_fields:
                assert field in order, f"Order should have '{field}' field"
    
    def test_textbook_orders_returns_401_without_auth(self):
        """GET /api/sysbook/orders/my-orders returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/my-orders")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestPlatformStoreOrderCreation:
    """Tests for POST /api/platform-store/orders endpoint"""
    
    def test_create_order_with_english_field_names(self):
        """Create order accepts English field names (customer_name, customer_email, etc.)"""
        order_data = {
            "items": [
                {
                    "book_id": "test_book_001",
                    "name": "Test Book",
                    "quantity": 1,
                    "unit_price": 10.00
                }
            ],
            "customer_name": "Test Customer",
            "customer_email": "test@example.com",
            "customer_phone": "+507 6000-0000",
            "user_id": "test_user_001",
            "form_data": {"nombre": "Test Customer"},
            "subtotal": 10.00,
            "total": 10.00,
            "type": "unatienda"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/platform-store/orders",
            json=order_data
        )
        
        # Should succeed - endpoint is public
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response uses English field names
        assert "order_id" in data, "Response should contain 'order_id'"
        assert "total" in data, "Response should contain 'total'"
        assert "status" in data, "Response should contain 'status'"
        assert data["status"] == "created", "Status should be 'created'"
    
    def test_create_order_rejects_empty_cart(self):
        """Create order rejects request with empty items"""
        order_data = {
            "items": [],
            "customer_name": "Test Customer",
            "customer_email": "test@example.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/platform-store/orders",
            json=order_data
        )
        
        assert response.status_code == 400, f"Expected 400 for empty cart, got {response.status_code}"
    
    def test_order_returns_correct_order_id_format(self):
        """Created order returns order_id in UNA-XXXXXXXX format"""
        order_data = {
            "items": [
                {
                    "book_id": "test_book_format",
                    "name": "Test Format Book",
                    "quantity": 1,
                    "unit_price": 5.00
                }
            ],
            "customer_name": "Format Test",
            "customer_email": "format@test.com"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/platform-store/orders",
            json=order_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["order_id"].startswith("UNA-"), f"Order ID should start with 'UNA-', got {data['order_id']}"


class TestStatusFilterValues:
    """Tests to verify status values are English"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        return response.json()["token"]
    
    def test_store_orders_use_english_status_values(self, auth_token):
        """Store orders status values should be in English"""
        response = requests.get(
            f"{BASE_URL}/api/platform-store/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        valid_statuses = ["pending", "confirmed", "preparing", "shipped", "delivered", 
                         "cancelled", "paid", "payment_rejected", "payment_cancelled", "payment_expired"]
        
        for order in data.get("orders", []):
            if "status" in order:
                assert order["status"] in valid_statuses, f"Invalid status: {order['status']}"
    
    def test_textbook_orders_use_english_status_values(self, auth_token):
        """Textbook orders status values should be in English"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/orders/my-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        valid_statuses = ["draft", "submitted", "processing", "ready", "delivered", "cancelled"]
        
        for order in data.get("orders", []):
            if "status" in order:
                assert order["status"] in valid_statuses, f"Invalid status: {order['status']}, expected one of {valid_statuses}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
