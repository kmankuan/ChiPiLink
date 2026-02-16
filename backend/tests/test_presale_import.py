"""
Pre-Sale Import Backend Tests
Tests for the pre-sale import API endpoints:
- GET /api/store/presale-import/preview
- GET /api/store/presale-import/orders
- POST /api/store/presale-import/execute
- GET /api/store/presale-import/suggestions
- POST /api/store/presale-import/suggestions/{id}/confirm
- POST /api/store/presale-import/suggestions/{id}/reject
- POST /api/store/presale-import/unlink
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPreSaleImportAPI:
    """Pre-Sale Import API endpoints tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        data = login_resp.json()
        self.token = data.get("token") or data.get("access_token")
        assert self.token, "No token returned from login"
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_presale_preview_endpoint(self):
        """Test GET /api/store/presale-import/preview returns {count, items}"""
        response = self.session.get(f"{BASE_URL}/api/store/presale-import/preview")
        print(f"Preview response status: {response.status_code}")
        print(f"Preview response body: {response.text[:500]}")
        
        # Should return 200 with {count, items}
        assert response.status_code == 200, f"Preview endpoint failed: {response.text}"
        data = response.json()
        assert "count" in data, "Response missing 'count' field"
        assert "items" in data, "Response missing 'items' field"
        assert isinstance(data["count"], int), "count should be integer"
        assert isinstance(data["items"], list), "items should be list"
        # Expected 0 items since no Monday.com items have trigger set
        print(f"Preview returned {data['count']} items (expected 0 since no trigger column set)")
    
    def test_presale_orders_endpoint(self):
        """Test GET /api/store/presale-import/orders returns {orders, count}"""
        response = self.session.get(f"{BASE_URL}/api/store/presale-import/orders")
        print(f"Orders response status: {response.status_code}")
        print(f"Orders response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Orders endpoint failed: {response.text}"
        data = response.json()
        assert "orders" in data, "Response missing 'orders' field"
        assert "count" in data, "Response missing 'count' field"
        assert isinstance(data["orders"], list), "orders should be list"
        assert isinstance(data["count"], int), "count should be integer"
        print(f"Orders returned {data['count']} pre-sale orders")
    
    def test_presale_orders_with_filter(self):
        """Test GET /api/store/presale-import/orders?status=unlinked"""
        response = self.session.get(f"{BASE_URL}/api/store/presale-import/orders?status=unlinked")
        print(f"Filtered orders response status: {response.status_code}")
        
        assert response.status_code == 200, f"Filtered orders endpoint failed: {response.text}"
        data = response.json()
        assert "orders" in data
        assert "count" in data
        print(f"Unlinked orders: {data['count']}")
    
    def test_presale_execute_endpoint(self):
        """Test POST /api/store/presale-import/execute returns {imported, skipped, errors}"""
        response = self.session.post(f"{BASE_URL}/api/store/presale-import/execute")
        print(f"Execute response status: {response.status_code}")
        print(f"Execute response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Execute endpoint failed: {response.text}"
        data = response.json()
        assert "imported" in data, "Response missing 'imported' field"
        assert "skipped" in data, "Response missing 'skipped' field"
        assert "errors" in data, "Response missing 'errors' field"
        # Expected 0 imported since no items have trigger set
        print(f"Execute: imported={data['imported']}, skipped={data['skipped']}, errors={data['errors']}")
    
    def test_presale_endpoints_require_auth(self):
        """Test that all endpoints require admin authentication"""
        # Create a new session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/store/presale-import/preview"),
            ("GET", f"{BASE_URL}/api/store/presale-import/orders"),
            ("POST", f"{BASE_URL}/api/store/presale-import/execute"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = no_auth_session.get(url)
            else:
                response = no_auth_session.post(url)
            
            # Should return 401 or 403 without auth
            assert response.status_code in [401, 403], \
                f"Endpoint {method} {url} should require auth, got {response.status_code}"
            print(f"✓ {method} {url.split('/api')[-1]} correctly requires auth")


class TestSuggestionBasedLinking:
    """Tests for suggestion-based linking workflow: suggestions, confirm, reject, unlink"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        data = login_resp.json()
        self.token = data.get("token") or data.get("access_token")
        assert self.token, "No token returned from login"
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_suggestions_endpoint(self):
        """Test GET /api/store/presale-import/suggestions returns {suggestions, count, pending_count}"""
        response = self.session.get(f"{BASE_URL}/api/store/presale-import/suggestions")
        print(f"Suggestions response status: {response.status_code}")
        print(f"Suggestions response body: {response.text[:500]}")
        
        assert response.status_code == 200, f"Suggestions endpoint failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "suggestions" in data, "Response missing 'suggestions' field"
        assert "count" in data, "Response missing 'count' field"
        assert "pending_count" in data, "Response missing 'pending_count' field"
        assert isinstance(data["suggestions"], list), "suggestions should be list"
        assert isinstance(data["count"], int), "count should be integer"
        assert isinstance(data["pending_count"], int), "pending_count should be integer"
        
        print(f"Suggestions: total={data['count']}, pending={data['pending_count']}")
    
    def test_suggestions_with_status_filter(self):
        """Test GET /api/store/presale-import/suggestions?status=pending"""
        response = self.session.get(f"{BASE_URL}/api/store/presale-import/suggestions?status=pending")
        print(f"Pending suggestions response status: {response.status_code}")
        
        assert response.status_code == 200, f"Filtered suggestions endpoint failed: {response.text}"
        data = response.json()
        assert "suggestions" in data
        assert "count" in data
        assert "pending_count" in data
        print(f"Pending suggestions: {data['count']}")
    
    def test_confirm_nonexistent_suggestion(self):
        """Test POST /api/store/presale-import/suggestions/fake/confirm returns error"""
        response = self.session.post(f"{BASE_URL}/api/store/presale-import/suggestions/fake/confirm")
        print(f"Confirm fake suggestion status: {response.status_code}")
        print(f"Confirm fake suggestion body: {response.text}")
        
        # Should return 400 with "Suggestion not found" error
        assert response.status_code == 400, f"Expected 400 for non-existent suggestion, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        assert "not found" in data["detail"].lower(), f"Error should mention 'not found': {data['detail']}"
        print(f"✓ Correctly returns error: {data['detail']}")
    
    def test_reject_nonexistent_suggestion(self):
        """Test POST /api/store/presale-import/suggestions/fake/reject returns error"""
        response = self.session.post(f"{BASE_URL}/api/store/presale-import/suggestions/fake/reject")
        print(f"Reject fake suggestion status: {response.status_code}")
        print(f"Reject fake suggestion body: {response.text}")
        
        # Should return 400 with "Suggestion not found" error
        assert response.status_code == 400, f"Expected 400 for non-existent suggestion, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        assert "not found" in data["detail"].lower(), f"Error should mention 'not found': {data['detail']}"
        print(f"✓ Correctly returns error: {data['detail']}")
    
    def test_unlink_nonexistent_order(self):
        """Test POST /api/store/presale-import/unlink with fake order_id returns 'Order not found'"""
        response = self.session.post(
            f"{BASE_URL}/api/store/presale-import/unlink",
            json={"order_id": "fake"}
        )
        print(f"Unlink fake order status: {response.status_code}")
        print(f"Unlink fake order body: {response.text}")
        
        # Should return 400 with "Order not found" error
        assert response.status_code == 400, f"Expected 400 for non-existent order, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        assert "not found" in data["detail"].lower(), f"Error should mention 'not found': {data['detail']}"
        print(f"✓ Correctly returns error: {data['detail']}")
    
    def test_unlink_missing_order_id(self):
        """Test POST /api/store/presale-import/unlink without order_id returns error"""
        response = self.session.post(
            f"{BASE_URL}/api/store/presale-import/unlink",
            json={}
        )
        print(f"Unlink without order_id status: {response.status_code}")
        
        # Should return 400 with "order_id is required" error
        assert response.status_code == 400, f"Expected 400 for missing order_id, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Error response should have 'detail' field"
        print(f"✓ Correctly returns error: {data['detail']}")
    
    def test_suggestions_endpoints_require_auth(self):
        """Test that all suggestion endpoints require admin authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            ("GET", f"{BASE_URL}/api/store/presale-import/suggestions"),
            ("POST", f"{BASE_URL}/api/store/presale-import/suggestions/fake/confirm"),
            ("POST", f"{BASE_URL}/api/store/presale-import/suggestions/fake/reject"),
            ("POST", f"{BASE_URL}/api/store/presale-import/unlink"),
        ]
        
        for method, url in endpoints:
            if method == "GET":
                response = no_auth_session.get(url)
            else:
                response = no_auth_session.post(url, json={"order_id": "fake"})
            
            # Should return 401 or 403 without auth
            assert response.status_code in [401, 403], \
                f"Endpoint {method} {url} should require auth, got {response.status_code}"
            print(f"✓ {method} {url.split('/api')[-1]} correctly requires auth")


class TestTextbookOrdersAwaitingLinkStatus:
    """Test that awaiting_link status is handled correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test with admin token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_resp.status_code == 200
        data = login_resp.json()
        self.token = data.get("token") or data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_orders_admin_all_accepts_awaiting_link_filter(self):
        """Test that admin orders endpoint accepts awaiting_link status filter"""
        response = self.session.get(f"{BASE_URL}/api/store/textbook-orders/admin/all?status=awaiting_link")
        print(f"Admin orders with awaiting_link filter: {response.status_code}")
        
        # Should return 200 (endpoint accepts the filter)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "orders" in data
        print(f"Orders with awaiting_link status: {len(data.get('orders', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
