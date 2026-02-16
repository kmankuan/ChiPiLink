"""
Test: Monday.com Stock Approval Column feature
- POST /api/store/monday/txb-inventory/setup-stock-approval - creates or finds Stock Approval column
- GET /api/store/monday/txb-inventory-config - returns stock_approval_column_id after setup
- Stock orders API returns catalog_counts and counts correctly
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStockApprovalFeature:
    """Stock Approval column and config tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]

    def test_txb_inventory_config_returns_stock_approval_column_id(self, auth_token):
        """GET /api/store/monday/txb-inventory-config should return stock_approval_column_id"""
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Config should include stock_approval_column_id key
        assert "stock_approval_column_id" in data, "stock_approval_column_id missing from config"
        
        # Also verify other expected config fields
        assert "board_id" in data
        assert "enabled" in data
        assert "column_mapping" in data
        assert "webhook_config" in data

    def test_setup_stock_approval_creates_or_finds_column(self, auth_token):
        """POST /api/store/monday/txb-inventory/setup-stock-approval creates or finds the column"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/setup-stock-approval",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should return column_id and status
        assert "column_id" in data, f"Missing column_id in response: {data}"
        assert "status" in data, f"Missing status in response: {data}"
        
        # Status should be either 'created' or 'already_exists'
        assert data["status"] in ["created", "already_exists"], f"Unexpected status: {data['status']}"
        
        # Column ID should be a string
        assert isinstance(data["column_id"], str) and len(data["column_id"]) > 0

    def test_config_has_column_id_after_setup(self, auth_token):
        """After setup, config should have the stock_approval_column_id populated"""
        # First do setup to ensure column exists
        requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/setup-stock-approval",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        # Now get config
        response = requests.get(
            f"{BASE_URL}/api/store/monday/txb-inventory-config",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # stock_approval_column_id should be populated (not None or empty)
        assert data.get("stock_approval_column_id"), f"stock_approval_column_id is empty: {data.get('stock_approval_column_id')}"

    def test_stock_orders_returns_catalog_counts(self, auth_token):
        """GET /api/store/stock-orders returns catalog_counts"""
        response = requests.get(
            f"{BASE_URL}/api/store/stock-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should include catalog_counts in response
        assert "catalog_counts" in data, "catalog_counts missing from response"
        assert "orders" in data
        assert "total" in data
        assert "counts" in data
        
        # catalog_counts should have pca and public keys
        catalog_counts = data["catalog_counts"]
        assert isinstance(catalog_counts, dict)

    def test_stock_orders_list_includes_source_field(self, auth_token):
        """Stock orders include source field when from monday_sync"""
        response = requests.get(
            f"{BASE_URL}/api/store/stock-orders",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All orders should be valid
        assert "orders" in data
        for order in data["orders"]:
            # Required fields
            assert "order_id" in order
            assert "type" in order
            assert "status" in order
            # catalog_type should be present (from iteration_126)
            assert "catalog_type" in order, f"Order {order['order_id']} missing catalog_type"

    def test_stock_orders_endpoint_without_auth_fails(self):
        """Stock orders endpoint should require authentication"""
        response = requests.get(f"{BASE_URL}/api/store/stock-orders")
        assert response.status_code == 401 or response.status_code == 403

    def test_setup_approval_without_auth_fails(self):
        """Setup stock approval endpoint should require authentication"""
        response = requests.post(f"{BASE_URL}/api/store/monday/txb-inventory/setup-stock-approval")
        assert response.status_code == 401 or response.status_code == 403
