"""
Textbook Orders API Tests
Tests for the textbook ordering system endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Test data from existing order
STUDENT_ID = "std_e32ae7fae07a"
ORDER_ID = "ord_83369f164983"
BOOK_ID = "libro_d6e5db7c60a8"  # Ciencias Naturales 3ro - Norma
BOOK_ID_2 = "libro_36fbed0ccc3a"  # Ciencias Sociales 3ro - SM


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestTextbookOrdersUserEndpoints:
    """User endpoints for textbook orders"""
    
    def test_get_student_order_unauthorized(self):
        """Test that getting student order requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_ID}")
        assert response.status_code == 401
    
    def test_get_student_order_success(self, admin_headers):
        """Test getting or creating order for a student"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "order_id" in data
        assert data["student_id"] == STUDENT_ID
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0
        assert "total_amount" in data
        assert "status" in data
        
        # Verify item structure
        item = data["items"][0]
        assert "book_id" in item
        assert "book_name" in item
        assert "price" in item
        assert "quantity_ordered" in item
        assert "status" in item
    
    def test_get_student_order_invalid_student(self, admin_headers):
        """Test getting order for non-existent student"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/invalid_student_id",
            headers=admin_headers
        )
        assert response.status_code == 400
    
    def test_update_item_selection_select(self, admin_headers):
        """Test selecting a book (quantity=1)"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ID}/items/{BOOK_ID_2}?quantity=1",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Find the updated item
        item = next((i for i in data["items"] if i["book_id"] == BOOK_ID_2), None)
        assert item is not None
        assert item["quantity_ordered"] == 1
        
        # Verify total is updated
        assert data["total_amount"] > 0
    
    def test_update_item_selection_deselect(self, admin_headers):
        """Test deselecting a book (quantity=0)"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ID}/items/{BOOK_ID_2}?quantity=0",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Find the updated item
        item = next((i for i in data["items"] if i["book_id"] == BOOK_ID_2), None)
        assert item is not None
        assert item["quantity_ordered"] == 0
    
    def test_update_item_selection_invalid_order(self, admin_headers):
        """Test updating item in non-existent order"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/invalid_order/items/{BOOK_ID}?quantity=1",
            headers=admin_headers
        )
        assert response.status_code == 400
    
    def test_update_item_selection_invalid_book(self, admin_headers):
        """Test updating non-existent book in order"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ID}/items/invalid_book?quantity=1",
            headers=admin_headers
        )
        assert response.status_code == 400
    
    def test_get_my_orders_unauthorized(self):
        """Test that getting my orders requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/my-orders")
        assert response.status_code == 401
    
    def test_get_my_orders_success(self, admin_headers):
        """Test getting user's order history"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            assert "order_id" in order
            assert "student_name" in order
            assert "items" in order
            assert "total_amount" in order


class TestTextbookOrdersAdminEndpoints:
    """Admin endpoints for textbook orders"""
    
    def test_admin_get_all_orders_unauthorized(self):
        """Test that admin endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/admin/all")
        assert response.status_code == 401
    
    def test_admin_get_all_orders_success(self, admin_headers):
        """Test admin getting all orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        assert isinstance(data["orders"], list)
        
        if len(data["orders"]) > 0:
            order = data["orders"][0]
            assert "order_id" in order
            assert "student_name" in order
            assert "user_name" in order  # Admin view includes user info
            assert "user_email" in order
    
    def test_admin_get_all_orders_with_status_filter(self, admin_headers):
        """Test admin filtering orders by status"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all?status=draft",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders" in data
        # All returned orders should have draft status
        for order in data["orders"]:
            assert order["status"] == "draft"
    
    def test_admin_get_stats_unauthorized(self):
        """Test that stats endpoint requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/admin/stats")
        assert response.status_code == 401
    
    def test_admin_get_stats_success(self, admin_headers):
        """Test admin getting order statistics"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/stats",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "orders_by_status" in data
        assert "orders_by_grade" in data
        assert "top_books" in data
        assert "total_revenue" in data
        assert "pending_reorder_requests" in data
        assert "total_orders" in data
        
        # Verify data types
        assert isinstance(data["orders_by_status"], dict)
        assert isinstance(data["orders_by_grade"], dict)
        assert isinstance(data["top_books"], list)
        assert isinstance(data["total_orders"], int)
    
    def test_admin_update_order_status(self, admin_headers):
        """Test admin updating order status"""
        # Update to processing
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/admin/{ORDER_ID}/status?status=processing",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "processing"
        
        # Revert back to draft
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/admin/{ORDER_ID}/status?status=draft",
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()["status"] == "draft"
    
    def test_admin_update_order_status_invalid_order(self, admin_headers):
        """Test admin updating status of non-existent order"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/admin/invalid_order/status?status=processing",
            headers=admin_headers
        )
        assert response.status_code == 400
    
    def test_admin_get_pending_reorders(self, admin_headers):
        """Test admin getting pending reorder requests"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/pending-reorders",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "reorders" in data
        assert isinstance(data["reorders"], list)
    
    def test_admin_get_order_details(self, admin_headers):
        """Test admin getting specific order details"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/{ORDER_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["order_id"] == ORDER_ID
        assert "items" in data
        assert "student_name" in data


class TestTextbookOrdersValidation:
    """Validation tests for textbook orders"""
    
    def test_quantity_validation_negative(self, admin_headers):
        """Test that negative quantity is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ID}/items/{BOOK_ID}?quantity=-1",
            headers=admin_headers
        )
        # FastAPI should reject negative quantity due to ge=0 constraint
        assert response.status_code == 422
    
    def test_quantity_validation_exceeds_max(self, admin_headers):
        """Test that quantity exceeding max is rejected"""
        response = requests.put(
            f"{BASE_URL}/api/store/textbook-orders/{ORDER_ID}/items/{BOOK_ID}?quantity=11",
            headers=admin_headers
        )
        # FastAPI should reject quantity > 10 due to le=10 constraint
        assert response.status_code == 422


class TestTextbookOrdersTotalCalculation:
    """Tests for total amount calculation"""
    
    def test_total_calculation_on_selection(self, admin_headers):
        """Test that total is correctly calculated when selecting items"""
        # First get current order state
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_ID}",
            headers=admin_headers
        )
        assert response.status_code == 200
        initial_data = response.json()
        
        # Get price of book to select
        book_to_select = next(
            (i for i in initial_data["items"] if i["book_id"] == BOOK_ID_2 and i["quantity_ordered"] == 0),
            None
        )
        
        if book_to_select:
            expected_price = book_to_select["price"]
            initial_total = initial_data["total_amount"]
            
            # Select the book
            response = requests.put(
                f"{BASE_URL}/api/store/textbook-orders/{initial_data['order_id']}/items/{BOOK_ID_2}?quantity=1",
                headers=admin_headers
            )
            assert response.status_code == 200
            
            new_data = response.json()
            # Total should increase by the book price
            assert abs(new_data["total_amount"] - (initial_total + expected_price)) < 0.01
            
            # Deselect to restore state
            requests.put(
                f"{BASE_URL}/api/store/textbook-orders/{initial_data['order_id']}/items/{BOOK_ID_2}?quantity=0",
                headers=admin_headers
            )
