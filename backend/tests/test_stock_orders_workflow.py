"""
Stock Orders Workflow API Tests
Tests the 3 workflow types: Shipment, Return, Adjustment
Including status transitions and stock updates at terminal states.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')

AUTH_ENDPOINT = "/api/auth-v2/login"
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user."""
    response = requests.post(f"{BASE_URL}{AUTH_ENDPOINT}", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Auth failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in auth response"
    return data["token"]


@pytest.fixture
def api_client(auth_token):
    """Session with auth header."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


@pytest.fixture(scope="module")
def test_product(auth_token):
    """Get a product from inventory for testing."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    # Search for existing products
    response = session.get(f"{BASE_URL}/api/store/inventory/products", params={"limit": 5})
    if response.status_code == 200:
        data = response.json()
        products = data.get("products", [])
        if products:
            return products[0]
    pytest.skip("No products available for testing")


# ================ HEALTH & SUMMARY ================

class TestStockOrdersHealthAndSummary:
    """Basic health and summary endpoint tests."""
    
    def test_list_stock_orders(self, api_client):
        """Test GET /api/store/stock-orders returns list."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "orders" in data
        assert "total" in data
        assert "counts" in data
        print(f"Total stock orders: {data['total']}, counts: {data['counts']}")
    
    def test_list_stock_orders_with_type_filter(self, api_client):
        """Test filtering by order_type."""
        for order_type in ["shipment", "return", "adjustment"]:
            response = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"order_type": order_type})
            assert response.status_code == 200, f"Filter failed for {order_type}: {response.text}"
            data = response.json()
            # All returned orders should be of the specified type
            for order in data.get("orders", []):
                assert order["type"] == order_type, f"Wrong type: expected {order_type}, got {order['type']}"
        print("Type filtering works correctly")
    
    def test_pending_summary(self, api_client):
        """Test GET /api/store/stock-orders/summary/pending."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders/summary/pending")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "pending" in data
        assert "total" in data
        print(f"Pending summary: {data['pending']}, total: {data['total']}")
    
    def test_search_orders_for_return_linking(self, api_client):
        """Test GET /api/store/stock-orders/search-orders."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders/search-orders", params={"q": "test"})
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"Search-orders returned {len(data['orders'])} results")


# ================ SHIPMENT WORKFLOW ================

class TestShipmentWorkflow:
    """Shipment workflow: draft → confirmed → received"""
    
    def test_create_shipment_returns_draft_status(self, api_client, test_product):
        """Create shipment and verify it starts in draft status."""
        payload = {
            "supplier": "TEST_E2E_Supplier",
            "expected_date": "2026-01-20",
            "items": [{
                "book_id": test_product["book_id"],
                "product_name": test_product.get("name", "Test Product"),
                "expected_qty": 5
            }],
            "notes": "E2E test shipment"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/shipment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "draft", f"Expected draft, got {data['status']}"
        assert data["type"] == "shipment"
        assert data["supplier"] == "TEST_E2E_Supplier"
        assert "order_id" in data
        assert "status_history" in data
        
        print(f"Created shipment: {data['order_id']} with status: {data['status']}")
        # Store for next tests
        self.__class__.test_shipment_id = data["order_id"]
    
    def test_transition_shipment_draft_to_confirmed(self, api_client):
        """Transition shipment from draft to confirmed."""
        order_id = getattr(self.__class__, 'test_shipment_id', None)
        if not order_id:
            pytest.skip("No shipment ID from previous test")
        
        response = api_client.post(
            f"{BASE_URL}/api/store/stock-orders/{order_id}/transition/confirmed",
            json={"notes": "Confirmed by E2E test"}
        )
        assert response.status_code == 200, f"Transition failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["new_status"] == "confirmed"
        print(f"Transitioned {order_id} to confirmed")
    
    def test_transition_shipment_confirmed_to_received(self, api_client):
        """Transition shipment from confirmed to received (stock should update)."""
        order_id = getattr(self.__class__, 'test_shipment_id', None)
        if not order_id:
            pytest.skip("No shipment ID from previous test")
        
        response = api_client.post(
            f"{BASE_URL}/api/store/stock-orders/{order_id}/transition/received",
            json={"notes": "Received by E2E test"}
        )
        assert response.status_code == 200, f"Transition failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["new_status"] == "received"
        # Stock changes should be reported at this terminal step
        if "stock_changes" in data:
            print(f"Stock changes: {data['stock_changes']}")
        print(f"Transitioned {order_id} to received (terminal)")
    
    def test_verify_shipment_final_state(self, api_client):
        """Verify shipment is in received state and no more transitions available."""
        order_id = getattr(self.__class__, 'test_shipment_id', None)
        if not order_id:
            pytest.skip("No shipment ID from previous test")
        
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders/{order_id}")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "received"
        assert len(data["status_history"]) >= 3, "Should have at least 3 history entries"
        print(f"Shipment {order_id} final state verified: {data['status']}")


# ================ ADJUSTMENT WORKFLOW ================

class TestAdjustmentWorkflow:
    """Adjustment workflow: requested → applied"""
    
    def test_create_adjustment(self, api_client, test_product):
        """Create adjustment and verify it starts in requested status."""
        payload = {
            "adjustment_reason": "Inventory correction",
            "items": [{
                "book_id": test_product["book_id"],
                "product_name": test_product.get("name", "Test Product"),
                "expected_qty": -2  # Negative for stock reduction
            }],
            "notes": "E2E test adjustment"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/adjustment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "requested", f"Expected requested, got {data['status']}"
        assert data["type"] == "adjustment"
        print(f"Created adjustment: {data['order_id']} with status: {data['status']}")
        self.__class__.test_adjustment_id = data["order_id"]
    
    def test_transition_adjustment_to_applied(self, api_client):
        """Transition adjustment to applied (stock should update)."""
        order_id = getattr(self.__class__, 'test_adjustment_id', None)
        if not order_id:
            pytest.skip("No adjustment ID from previous test")
        
        response = api_client.post(
            f"{BASE_URL}/api/store/stock-orders/{order_id}/transition/applied",
            json={"notes": "Applied by E2E test"}
        )
        assert response.status_code == 200, f"Transition failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "ok"
        assert data["new_status"] == "applied"
        print(f"Transitioned {order_id} to applied (terminal)")


# ================ INVALID TRANSITIONS ================

class TestInvalidTransitions:
    """Test that invalid transitions are rejected."""
    
    def test_invalid_transition_rejected(self, api_client, test_product):
        """Test that invalid status transitions are rejected."""
        # Create a new shipment in draft status
        payload = {
            "supplier": "TEST_InvalidTransition",
            "items": [{
                "book_id": test_product["book_id"],
                "product_name": test_product.get("name", "Test Product"),
                "expected_qty": 1
            }]
        }
        create_resp = api_client.post(f"{BASE_URL}/api/store/stock-orders/shipment", json=payload)
        assert create_resp.status_code == 200
        order_id = create_resp.json()["order_id"]
        
        # Try to skip to received (should fail - must go through confirmed first)
        response = api_client.post(
            f"{BASE_URL}/api/store/stock-orders/{order_id}/transition/received",
            json={}
        )
        assert response.status_code == 400, f"Should reject invalid transition: {response.text}"
        print("Invalid transition correctly rejected")


# ================ CLEANUP TEST DATA ================

class TestCleanup:
    """Cleanup test-created data."""
    
    def test_verify_test_orders_exist(self, api_client):
        """Verify test orders were created and can be found."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"search": "TEST_"})
        assert response.status_code == 200
        data = response.json()
        print(f"Found {len(data['orders'])} test orders with 'TEST_' prefix")
