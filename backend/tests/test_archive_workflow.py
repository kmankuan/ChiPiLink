"""
Archive Workflow Tests - Testing archive system for orders and movements
Tests: GET archived items, archive items, restore items, permanent delete
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestArchiveEndpoints:
    """Archive endpoints tests for orders and movements"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.token = None
        login_resp = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_resp.status_code == 200:
            data = login_resp.json()
            self.token = data.get("token") or data.get("access_token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

    # ============ GET Archived Items ============
    def test_get_archived_orders(self):
        """GET /api/archive/orders returns archived orders list"""
        resp = requests.get(f"{BASE_URL}/api/archive/orders", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "items" in data, "Response should have 'items' array"
        assert "count" in data, "Response should have 'count'"
        assert isinstance(data["items"], list), "'items' should be a list"
        print(f"✓ GET /api/archive/orders: {data['count']} archived orders")

    def test_get_archived_movements(self):
        """GET /api/archive/movements returns archived movements list"""
        resp = requests.get(f"{BASE_URL}/api/archive/movements", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "items" in data, "Response should have 'items' array"
        assert "count" in data, "Response should have 'count'"
        assert isinstance(data["items"], list), "'items' should be a list"
        print(f"✓ GET /api/archive/movements: {data['count']} archived movements")

    # ============ Archive Endpoint Structure ============
    def test_archive_orders_endpoint_exists(self):
        """POST /api/archive/orders/archive endpoint exists"""
        # Test with empty array to verify endpoint exists
        resp = requests.post(f"{BASE_URL}/api/archive/orders/archive", 
            headers=self.headers, json={"ids": []})
        # Should return 200 with archived_count: 0
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "archived_count" in data, "Response should have success or archived_count"
        print(f"✓ POST /api/archive/orders/archive endpoint works")

    def test_archive_movements_endpoint_exists(self):
        """POST /api/archive/movements/archive endpoint exists"""
        resp = requests.post(f"{BASE_URL}/api/archive/movements/archive", 
            headers=self.headers, json={"ids": []})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "archived_count" in data, "Response should have success or archived_count"
        print(f"✓ POST /api/archive/movements/archive endpoint works")

    # ============ Restore Endpoint Structure ============
    def test_restore_orders_endpoint_exists(self):
        """POST /api/archive/orders/restore endpoint exists"""
        resp = requests.post(f"{BASE_URL}/api/archive/orders/restore", 
            headers=self.headers, json={"ids": []})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "restored_count" in data, "Response should have success or restored_count"
        print(f"✓ POST /api/archive/orders/restore endpoint works")

    def test_restore_movements_endpoint_exists(self):
        """POST /api/archive/movements/restore endpoint exists"""
        resp = requests.post(f"{BASE_URL}/api/archive/movements/restore", 
            headers=self.headers, json={"ids": []})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "restored_count" in data, "Response should have success or restored_count"
        print(f"✓ POST /api/archive/movements/restore endpoint works")

    # ============ Permanent Delete Endpoint Structure ============
    def test_permanent_delete_orders_endpoint_exists(self):
        """POST /api/archive/orders/permanent-delete endpoint exists"""
        resp = requests.post(f"{BASE_URL}/api/archive/orders/permanent-delete", 
            headers=self.headers, json={"ids": []})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "deleted_count" in data, "Response should have success or deleted_count"
        print(f"✓ POST /api/archive/orders/permanent-delete endpoint works")

    def test_permanent_delete_movements_endpoint_exists(self):
        """POST /api/archive/movements/permanent-delete endpoint exists"""
        resp = requests.post(f"{BASE_URL}/api/archive/movements/permanent-delete", 
            headers=self.headers, json={"ids": []})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data or "deleted_count" in data, "Response should have success or deleted_count"
        print(f"✓ POST /api/archive/movements/permanent-delete endpoint works")

    # ============ Archive Counts Endpoint ============
    def test_archive_counts_orders(self):
        """GET /api/archive/orders/counts returns active/archived counts"""
        resp = requests.get(f"{BASE_URL}/api/archive/orders/counts", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "active" in data, "Response should have 'active' count"
        assert "archived" in data, "Response should have 'archived' count"
        print(f"✓ GET /api/archive/orders/counts: active={data['active']}, archived={data['archived']}")

    def test_archive_counts_movements(self):
        """GET /api/archive/movements/counts returns active/archived counts"""
        resp = requests.get(f"{BASE_URL}/api/archive/movements/counts", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "active" in data, "Response should have 'active' count"
        assert "archived" in data, "Response should have 'archived' count"
        print(f"✓ GET /api/archive/movements/counts: active={data['active']}, archived={data['archived']}")

    # ============ Stock Orders Endpoint ============
    def test_stock_orders_list(self):
        """GET /api/store/stock-orders returns stock movements list"""
        resp = requests.get(f"{BASE_URL}/api/store/stock-orders", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "orders" in data, "Response should have 'orders' array"
        assert "total" in data, "Response should have 'total' count"
        print(f"✓ GET /api/store/stock-orders: {data['total']} stock movements")

    # ============ Textbook Orders Endpoint ============
    def test_textbook_orders_list(self):
        """GET /api/sysbook/orders/admin/all returns textbook orders"""
        resp = requests.get(f"{BASE_URL}/api/sysbook/orders/admin/all", headers=self.headers)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "orders" in data, "Response should have 'orders' array"
        print(f"✓ GET /api/sysbook/orders/admin/all: {len(data.get('orders', []))} orders")
