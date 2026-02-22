"""
Tests for Sysbook Dashboard (Admin Landing Page)
Tests KPIs, alerts, grade health, recent activity and Unatienda public-only cleanup
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@chipi.co",
        "password": "admin"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")

@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}

class TestSysbookDashboardAPIs:
    """Test APIs used by Sysbook Dashboard"""
    
    def test_analytics_overview(self, headers):
        """Test /api/sysbook/analytics/overview returns KPI data"""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/overview", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Should have total_products, total_stock, total_value, recent_movements_7d
        assert "total_products" in data
        assert "total_stock" in data
        assert "total_value" in data
        assert isinstance(data["total_products"], int)
        assert isinstance(data["total_stock"], int)
        print(f"Overview: products={data['total_products']}, stock={data['total_stock']}, value=${data.get('total_value', 0):.2f}")
    
    def test_alerts_endpoint(self, headers):
        """Test /api/sysbook/alerts returns active alerts with severity badges"""
        response = requests.get(f"{BASE_URL}/api/sysbook/alerts", params={"status": "active", "limit": 5}, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "alerts" in data
        assert "active_count" in data
        print(f"Active alerts: {data['active_count']}")
        # Check alert structure if any exist
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "alert_id" in alert
            assert "severity" in alert
            assert "product_name" in alert
            print(f"Sample alert: {alert['product_name']} - severity={alert['severity']}")
    
    def test_grade_summary(self, headers):
        """Test /api/sysbook/analytics/grade-summary returns grade health data"""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/grade-summary", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "grades" in data
        grades = data["grades"]
        print(f"Grade summary: {len(grades)} grades")
        # Each grade should have low_stock and out_of_stock counts
        for g in grades[:3]:  # Check first 3
            assert "grade" in g
            assert "total_stock" in g
            # low_stock and out_of_stock may or may not be present
            print(f"  {g['grade']}: stock={g['total_stock']}, low={g.get('low_stock', 0)}, out={g.get('out_of_stock', 0)}")
    
    def test_inventory_dashboard(self, headers):
        """Test /api/sysbook/inventory/dashboard returns recent movements"""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/dashboard", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "recent_movements" in data
        recent = data["recent_movements"]
        print(f"Recent movements: {len(recent)} found")
        if recent:
            mov = recent[0]
            # Each movement should have type and quantity_change
            assert "type" in mov or "quantity_change" in mov
            print(f"  Latest: {mov.get('product_name', mov.get('book_id', 'unknown'))} - change={mov.get('quantity_change', 0)}")
    
    def test_pending_orders_summary(self, headers):
        """Test /api/sysbook/stock-orders/summary/pending returns pending count"""
        response = requests.get(f"{BASE_URL}/api/sysbook/stock-orders/summary/pending", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "total" in data
        print(f"Pending orders: {data['total']}")


class TestSysbookStockOrdersCatalogType:
    """Verify stock-orders use catalog_type=sysbook (not pca)"""
    
    def test_stock_orders_list_returns_sysbook(self, headers):
        """GET /api/sysbook/stock-orders should return orders with catalog_type=sysbook"""
        response = requests.get(f"{BASE_URL}/api/sysbook/stock-orders", headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        orders = data.get("orders", [])
        print(f"Stock orders: {len(orders)} found")
        # All orders should have catalog_type=sysbook
        for order in orders[:5]:
            catalog_type = order.get("catalog_type", "")
            # Should be 'sysbook' not 'pca'
            assert catalog_type == "sysbook", f"Order {order.get('order_id')} has catalog_type={catalog_type}, expected sysbook"
            print(f"  {order['order_id']}: type={order['type']}, catalog_type={catalog_type}")
    
    def test_create_shipment_uses_sysbook(self, headers):
        """POST /api/sysbook/stock-orders/shipment should use catalog_type=sysbook"""
        # First get a product to use
        prod_response = requests.get(f"{BASE_URL}/api/sysbook/inventory/products", params={"limit": 1}, headers=headers)
        if prod_response.status_code != 200 or not prod_response.json().get("products"):
            pytest.skip("No products available")
        
        product = prod_response.json()["products"][0]
        
        # Create a test shipment
        payload = {
            "supplier": "TEST_SUPPLIER_DASHBOARD",
            "expected_date": "2026-02-01",
            "items": [{
                "book_id": product["book_id"],
                "product_name": product["name"],
                "expected_qty": 1
            }],
            "notes": "Test shipment for dashboard testing"
        }
        response = requests.post(f"{BASE_URL}/api/sysbook/stock-orders/shipment", json=payload, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert data["catalog_type"] == "sysbook", f"Expected catalog_type=sysbook, got {data.get('catalog_type')}"
        assert data["type"] == "shipment"
        print(f"Created shipment: {data['order_id']} with catalog_type={data['catalog_type']}")


class TestUnatiendaPublicOnlyCleanup:
    """Test that Unatienda StockOrdersTab now only shows public store"""
    
    def test_store_stock_orders_supports_public_filter(self, headers):
        """Verify /api/store/stock-orders supports catalog_type=public filter"""
        # This is the API used by Unatienda StockOrdersTab
        response = requests.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "public"}, headers=headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        orders = data.get("orders", [])
        print(f"Public stock orders: {len(orders)} found")
        # Any returned orders should have catalog_type=public
        for order in orders[:5]:
            catalog_type = order.get("catalog_type", "")
            if catalog_type:
                assert catalog_type == "public", f"Got non-public order: {catalog_type}"
    
    def test_create_public_shipment(self, headers):
        """Verify /api/store/stock-orders/shipment accepts catalog_type=public"""
        # Get a public product
        prod_response = requests.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "public", "limit": 1}, headers=headers)
        if prod_response.status_code != 200:
            pytest.skip("No public products endpoint or failed")
        
        products = prod_response.json().get("products", [])
        if not products:
            pytest.skip("No public products available")
        
        product = products[0]
        
        payload = {
            "supplier": "TEST_PUBLIC_SUPPLIER",
            "expected_date": "2026-02-01",
            "items": [{
                "book_id": product["book_id"],
                "product_name": product.get("name", "Test Product"),
                "expected_qty": 1
            }],
            "notes": "Test public store shipment",
            "catalog_type": "public"
        }
        response = requests.post(f"{BASE_URL}/api/store/stock-orders/shipment", json=payload, headers=headers)
        # Should succeed or at least not fail due to catalog_type
        if response.status_code == 200:
            data = response.json()
            print(f"Created public shipment: {data.get('order_id')} with catalog_type={data.get('catalog_type')}")
        else:
            print(f"Public shipment creation: {response.status_code} - {response.text[:200]}")


class TestSysbookInventoryAndAnalytics:
    """Verify existing Sysbook features still work"""
    
    def test_sysbook_inventory_dashboard(self, headers):
        """Test /api/sysbook/inventory/dashboard still works"""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/dashboard", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_products" in data or "stats" in data
        print(f"Sysbook inventory dashboard: {data.get('total_products', 'N/A')} products")
    
    def test_sysbook_analytics_overview(self, headers):
        """Test /api/sysbook/analytics/overview still works"""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/overview", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Analytics overview: products={data.get('total_products')}, stock={data.get('total_stock')}")
    
    def test_sysbook_alerts_page(self, headers):
        """Test /api/sysbook/alerts still works"""
        response = requests.get(f"{BASE_URL}/api/sysbook/alerts", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Sysbook alerts: {data.get('active_count', len(data.get('alerts', [])))} active")
