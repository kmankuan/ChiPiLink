"""
Test suite for pre-sale import UI fixes
Tests:
1. Order API returns book_code, price, quantity_ordered for each item
2. Orders list API returns proper columns (student_name, grade, items, total_amount, status)
3. Print API works with order_ids
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPresaleUIFixes:
    """Test the pre-sale import UI bug fixes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    # Order Detail Dialog Tests - Code, Price, Qty columns
    
    def test_orders_list_api_returns_items_with_book_code(self):
        """Bug 3: Verify orders have items with book_code field"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        assert len(orders) > 0, "No orders found"
        
        # Find the test order
        test_order = None
        for order in orders:
            if order.get("student_name") == "Test Student":
                test_order = order
                break
        
        assert test_order is not None, "Test Student order not found"
        
        # Verify items have book_code
        items = test_order.get("items", [])
        assert len(items) >= 2, f"Expected at least 2 items, got {len(items)}"
        
        for item in items:
            assert "book_code" in item, f"Item missing book_code: {item}"
            assert item["book_code"], f"book_code is empty: {item}"
        
        # Verify specific book codes
        book_codes = [i.get("book_code") for i in items]
        assert "MAT-5A" in book_codes, f"MAT-5A not found in {book_codes}"
        assert "ENG-5B" in book_codes, f"ENG-5B not found in {book_codes}"
        print(f"✓ Items have book_codes: {book_codes}")
    
    def test_orders_items_have_price(self):
        """Bug 1: Verify items have price field"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        test_order = next((o for o in orders if o.get("student_name") == "Test Student"), None)
        assert test_order is not None, "Test Student order not found"
        
        items = test_order.get("items", [])
        for item in items:
            assert "price" in item, f"Item missing price: {item}"
            assert item["price"] > 0, f"Price should be > 0: {item}"
        
        # Verify specific prices
        prices = {i.get("book_code"): i.get("price") for i in items}
        assert prices.get("MAT-5A") == 25.5, f"MAT-5A price wrong: {prices.get('MAT-5A')}"
        assert prices.get("ENG-5B") == 18.75, f"ENG-5B price wrong: {prices.get('ENG-5B')}"
        print(f"✓ Items have prices: {prices}")
    
    def test_orders_items_have_quantity_ordered(self):
        """Bug 1: Verify items have quantity_ordered field"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        test_order = next((o for o in orders if o.get("student_name") == "Test Student"), None)
        assert test_order is not None, "Test Student order not found"
        
        items = test_order.get("items", [])
        for item in items:
            assert "quantity_ordered" in item, f"Item missing quantity_ordered: {item}"
            assert item["quantity_ordered"] > 0, f"quantity_ordered should be > 0: {item}"
        
        quantities = {i.get("book_code"): i.get("quantity_ordered") for i in items}
        print(f"✓ Items have quantities: {quantities}")
    
    def test_order_total_amount_calculated(self):
        """Bug 1: Verify order has total_amount"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        test_order = next((o for o in orders if o.get("student_name") == "Test Student"), None)
        assert test_order is not None, "Test Student order not found"
        
        assert "total_amount" in test_order, "Order missing total_amount"
        assert test_order["total_amount"] == 63.0, f"Total should be 63.0, got {test_order['total_amount']}"
        print(f"✓ Order total_amount: ${test_order['total_amount']}")
    
    # Orders Table Tests - Student, User, Grade, Items, Total, Date, Status columns
    
    def test_orders_table_columns(self):
        """Bug 5: Verify orders API returns all required columns for table"""
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        assert len(orders) > 0, "No orders found"
        
        order = orders[0]
        
        # Required columns for orders table
        required_fields = [
            "student_name",   # Student column
            "grade",          # Grade column
            "items",          # Items column (array to count)
            "total_amount",   # Total column
            "status",         # Status column
            "created_at",     # Date column
        ]
        
        for field in required_fields:
            assert field in order, f"Order missing {field}: {order.keys()}"
        
        # User fields are optional for unlinked orders
        # But should have user_name and user_email when linked
        
        print(f"✓ Order has all required fields: {required_fields}")
    
    # Print API Tests
    
    def test_print_jobs_api(self):
        """Bug 2 & 4: Verify print API works with order_ids"""
        # First get an order_id
        response = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        assert len(orders) > 0, "No orders to print"
        
        order_id = orders[0].get("order_id")
        
        # Call print jobs API
        print_response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"order_ids": [order_id]}
        )
        
        assert print_response.status_code == 200, f"Print API failed: {print_response.text}"
        
        print_data = print_response.json()
        assert "orders" in print_data, f"Print response missing orders: {print_data}"
        assert len(print_data["orders"]) > 0, "No orders returned for print"
        
        # Verify print data has required fields
        printed_order = print_data["orders"][0]
        assert "student_name" in printed_order, "Print order missing student_name"
        assert "items" in printed_order or "books" in printed_order, "Print order missing items/books"
        
        print(f"✓ Print API works - returned {len(print_data['orders'])} order(s)")


class TestBulkActionAPIs:
    """Test bulk archive and delete APIs for orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_bulk_archive_endpoint_exists(self):
        """Verify bulk archive endpoint exists"""
        # Send empty array to test endpoint
        response = requests.post(
            f"{BASE_URL}/api/sysbook/orders/admin/bulk-archive",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"order_ids": []}
        )
        # Should not be 404
        assert response.status_code != 404, "Bulk archive endpoint not found"
        print(f"✓ Bulk archive endpoint exists (status: {response.status_code})")
    
    def test_bulk_delete_endpoint_exists(self):
        """Verify bulk delete endpoint exists"""
        # Send empty array to test endpoint
        response = requests.post(
            f"{BASE_URL}/api/sysbook/orders/admin/bulk-delete",
            headers={**self.headers, "Content-Type": "application/json"},
            json={"order_ids": []}
        )
        # Should not be 404
        assert response.status_code != 404, "Bulk delete endpoint not found"
        print(f"✓ Bulk delete endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
