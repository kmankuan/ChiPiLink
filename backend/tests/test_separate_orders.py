"""
Test Separate Orders Functionality
Tests the fix where each order submission creates a NEW order document (no merging).

Key requirements:
1. POST /api/store/textbook-orders/submit should create a NEW order document every time
2. Multiple submissions for the same student result in multiple separate order rows
3. Each order has unique order_id, correct items, total_amount, status='submitted'
4. Admin stats correctly count separate orders
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://backend-cleanup-10.preview.emergentagent.com').rstrip('/')

# Test constants - provided by main agent
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"
TEST_STUDENT_ID = "std_test_admin_001"  # belongs to admin user cli_73ae14cdd22e, grade 3
TEST_BOOKS = [
    "book_bc08d0d297f3",  # English Grammar Workbook 3rd Grade - $29.99
    "book_66c9e5bf51e2",  # unknown - check if available
    "book_3b61a9ad39f7",  # Ciencias Naturales 3er Grado - $24.99
]


class TestSeparateOrdersFeature:
    """Tests for the separate orders functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for tests"""
        # Login as admin
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        data = login_resp.json()
        self.token = data.get("token")
        self.user_id = data.get("user", {}).get("user_id")
        assert self.token, "No token in login response"
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def get_orders_for_student(self, student_id: str) -> list:
        """Helper to get all orders for a specific student"""
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=self.headers
        )
        assert resp.status_code == 200
        orders = resp.json().get("orders", [])
        return [o for o in orders if o.get("student_id") == student_id]
    
    def test_1_login_and_get_baseline_orders(self):
        """Test: Admin can login and retrieve existing orders"""
        # Verify token works
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=self.headers
        )
        assert resp.status_code == 200, f"Failed to get orders: {resp.text}"
        
        orders = resp.json().get("orders", [])
        print(f"Total orders in system: {len(orders)}")
        
        # Check orders for test student
        test_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        print(f"Orders for test student {TEST_STUDENT_ID}: {len(test_orders)}")
        
        # Store baseline count
        self.baseline_count = len(test_orders)
        
        for o in test_orders:
            print(f"  - {o.get('order_id')}: status={o.get('status')}, total=${o.get('total_amount', 0):.2f}")
        
        assert len(orders) > 0, "No orders found in system"
    
    def test_2_existing_orders_are_separate(self):
        """Test: Existing orders for same student have unique order_ids"""
        test_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        
        # All orders should have unique IDs
        order_ids = [o.get("order_id") for o in test_orders]
        unique_ids = set(order_ids)
        
        print(f"Order IDs for student: {order_ids}")
        assert len(order_ids) == len(unique_ids), f"Duplicate order IDs found! {order_ids}"
        
        # Each submitted order should have proper fields
        for order in test_orders:
            if order.get("status") == "submitted":
                assert order.get("order_id"), f"Order missing order_id: {order}"
                assert order.get("total_amount", 0) >= 0, f"Order has invalid total: {order}"
                assert order.get("student_id") == TEST_STUDENT_ID
                assert order.get("status") == "submitted"
                print(f"  Verified order {order.get('order_id')}: ${order.get('total_amount', 0):.2f}")
    
    def test_3_submit_creates_new_order(self):
        """Test: POST /api/store/textbook-orders/submit creates a NEW order each time"""
        # Get baseline count
        baseline_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        baseline_count = len(baseline_orders)
        print(f"Baseline orders for student: {baseline_count}")
        
        # Get available books first
        books_resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{TEST_STUDENT_ID}",
            headers=self.headers
        )
        assert books_resp.status_code == 200, f"Failed to get books: {books_resp.text}"
        
        available_items = books_resp.json().get("items", [])
        available_books = [
            item for item in available_items 
            if item.get("status") == "available"
        ]
        
        assert len(available_books) > 0, "No available books to order"
        print(f"Available books: {len(available_books)}")
        
        # Pick first available book
        book_to_order = available_books[0]
        print(f"Ordering: {book_to_order.get('book_name')} (${book_to_order.get('price', 0):.2f})")
        
        # Submit new order
        submit_payload = {
            "student_id": TEST_STUDENT_ID,
            "items": [
                {"book_id": book_to_order.get("book_id"), "quantity": 1}
            ],
            "form_data": {"notes": f"TEST_Separate_Orders_{int(time.time())}"}
        }
        
        submit_resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers={**self.headers, "Content-Type": "application/json"},
            json=submit_payload
        )
        
        print(f"Submit response status: {submit_resp.status_code}")
        
        # Should succeed (200 or 201)
        assert submit_resp.status_code in [200, 201], f"Submit failed: {submit_resp.text}"
        
        new_order = submit_resp.json()
        new_order_id = new_order.get("order_id")
        print(f"New order created: {new_order_id}")
        
        # Verify new order has correct fields
        assert new_order_id, "New order missing order_id"
        assert new_order.get("status") == "submitted", f"Order status should be submitted, got: {new_order.get('status')}"
        assert new_order.get("student_id") == TEST_STUDENT_ID
        assert new_order.get("total_amount", 0) > 0, "Order total should be > 0"
        
        # Verify NEW order was created (not merged with existing)
        updated_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        print(f"Orders after submit: {len(updated_orders)}")
        
        assert len(updated_orders) == baseline_count + 1, \
            f"Expected {baseline_count + 1} orders, got {len(updated_orders)}. Order should have been created, not merged!"
        
        # Verify the new order ID is in the list
        all_order_ids = [o.get("order_id") for o in updated_orders]
        assert new_order_id in all_order_ids, f"New order {new_order_id} not found in orders list"
        
        print(f"SUCCESS: New order {new_order_id} created as separate document")
    
    def test_4_multiple_submissions_create_multiple_orders(self):
        """Test: Multiple submissions for same student result in multiple separate orders"""
        # Get baseline
        baseline_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        baseline_count = len(baseline_orders)
        
        # Get available books
        books_resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{TEST_STUDENT_ID}",
            headers=self.headers
        )
        assert books_resp.status_code == 200
        
        available_items = books_resp.json().get("items", [])
        available_books = [
            item for item in available_items 
            if item.get("status") == "available"
        ]
        
        if len(available_books) < 2:
            print("Not enough available books for multiple order test - using same book twice")
            book1 = available_books[0] if available_books else None
            book2 = available_books[0] if available_books else None
        else:
            book1 = available_books[0]
            book2 = available_books[1]
        
        assert book1 and book2, "No available books to test"
        
        # Submit first order
        order1_resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers={**self.headers, "Content-Type": "application/json"},
            json={
                "student_id": TEST_STUDENT_ID,
                "items": [{"book_id": book1.get("book_id"), "quantity": 1}],
                "form_data": {"notes": f"TEST_Multi_Order1_{int(time.time())}"}
            }
        )
        assert order1_resp.status_code in [200, 201], f"Order 1 failed: {order1_resp.text}"
        order1_id = order1_resp.json().get("order_id")
        print(f"Order 1 created: {order1_id}")
        
        # Submit second order
        order2_resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers={**self.headers, "Content-Type": "application/json"},
            json={
                "student_id": TEST_STUDENT_ID,
                "items": [{"book_id": book2.get("book_id"), "quantity": 1}],
                "form_data": {"notes": f"TEST_Multi_Order2_{int(time.time())}"}
            }
        )
        assert order2_resp.status_code in [200, 201], f"Order 2 failed: {order2_resp.text}"
        order2_id = order2_resp.json().get("order_id")
        print(f"Order 2 created: {order2_id}")
        
        # Verify both orders are separate
        assert order1_id != order2_id, f"Both orders have same ID! {order1_id}"
        
        # Verify count increased by 2
        final_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        print(f"Final order count: {len(final_orders)} (baseline was {baseline_count})")
        
        assert len(final_orders) == baseline_count + 2, \
            f"Expected {baseline_count + 2} orders, got {len(final_orders)}. Orders should be separate!"
        
        print(f"SUCCESS: Two separate orders created ({order1_id}, {order2_id})")
    
    def test_5_admin_stats_count_separate_orders(self):
        """Test: GET /api/store/textbook-orders/admin/stats correctly counts separate orders"""
        # Get stats
        stats_resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/stats",
            headers=self.headers
        )
        assert stats_resp.status_code == 200, f"Stats failed: {stats_resp.text}"
        
        stats = stats_resp.json()
        total_orders = stats.get("total_orders", 0)
        orders_by_status = stats.get("orders_by_status", {})
        total_revenue = stats.get("total_revenue", 0)
        
        print(f"Total orders: {total_orders}")
        print(f"Orders by status: {orders_by_status}")
        print(f"Total revenue: ${total_revenue:.2f}")
        
        # Verify stats match actual orders
        all_orders_resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=self.headers
        )
        actual_orders = all_orders_resp.json().get("orders", [])
        
        # Count orders by status manually
        manual_status_count = {}
        for o in actual_orders:
            status = o.get("status", "unknown")
            manual_status_count[status] = manual_status_count.get(status, 0) + 1
        
        print(f"Manual status count: {manual_status_count}")
        
        # Total should match
        assert total_orders == len(actual_orders), \
            f"Stats total ({total_orders}) doesn't match actual ({len(actual_orders)})"
        
        print(f"SUCCESS: Stats correctly count {total_orders} separate orders")
    
    def test_6_order_details_have_correct_structure(self):
        """Test: Each order has correct structure (order_id, items, total, status)"""
        # Get an order for the test student
        test_orders = self.get_orders_for_student(TEST_STUDENT_ID)
        assert len(test_orders) > 0, "No orders for test student"
        
        # Get details for first submitted order
        submitted_orders = [o for o in test_orders if o.get("status") == "submitted"]
        assert len(submitted_orders) > 0, "No submitted orders found"
        
        order = submitted_orders[0]
        order_id = order.get("order_id")
        
        # Get full details from admin endpoint
        details_resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/{order_id}",
            headers=self.headers
        )
        assert details_resp.status_code == 200, f"Get order details failed: {details_resp.text}"
        
        details = details_resp.json()
        
        # Verify structure
        assert details.get("order_id") == order_id
        assert details.get("status") == "submitted"
        assert details.get("student_id") == TEST_STUDENT_ID
        assert "items" in details
        assert "total_amount" in details
        assert details.get("total_amount", 0) >= 0
        
        # Verify items have correct structure
        items = details.get("items", [])
        ordered_items = [i for i in items if i.get("quantity_ordered", 0) > 0]
        
        print(f"Order {order_id} details:")
        print(f"  Status: {details.get('status')}")
        print(f"  Total: ${details.get('total_amount', 0):.2f}")
        print(f"  Ordered items: {len(ordered_items)}")
        
        for item in ordered_items:
            assert item.get("book_id"), "Item missing book_id"
            assert item.get("book_name"), "Item missing book_name"
            assert item.get("price", 0) >= 0, "Item has invalid price"
            print(f"    - {item.get('book_name')}: ${item.get('price', 0):.2f} x {item.get('quantity_ordered')}")
        
        print(f"SUCCESS: Order {order_id} has correct structure")


class TestStudentBrowsingEndpoint:
    """Tests for the student textbook browsing endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_student_endpoint_returns_books(self):
        """Test: GET /api/store/textbook-orders/student/{student_id} returns available books"""
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{TEST_STUDENT_ID}",
            headers=self.headers
        )
        assert resp.status_code == 200, f"Student endpoint failed: {resp.text}"
        
        data = resp.json()
        
        # Should return order structure with items
        assert "items" in data, "Response missing 'items'"
        items = data.get("items", [])
        
        print(f"Books available for student: {len(items)}")
        
        # Check book structure
        for item in items[:3]:
            assert item.get("book_id"), "Item missing book_id"
            assert item.get("book_name"), "Item missing book_name"
            assert "price" in item, "Item missing price"
            assert "status" in item, "Item missing status"
            print(f"  - {item.get('book_name')}: ${item.get('price', 0):.2f} ({item.get('status')})")
        
        print("SUCCESS: Student browsing endpoint returns books correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
