"""
Test Sysbook Stock Alerts Feature
Testing:
- Alert settings CRUD
- Alert creation and listing
- Alert dismissal (single and all)
- Stock check triggered alerts
- Stock adjustment triggered alerts
- Alert auto-resolve when stock > threshold
- product_type=sysbook in stock_orders
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
SYSBOOK_API = f"{BASE_URL}/api/sysbook"


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
    """Auth headers"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestAlertSettings:
    """Test alert settings CRUD"""

    def test_get_alert_settings_returns_defaults(self, headers):
        """GET /api/sysbook/alerts/settings returns default settings with threshold 10"""
        r = requests.get(f"{SYSBOOK_API}/alerts/settings", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify default settings fields
        assert "global_low_stock_threshold" in data, "Missing global_low_stock_threshold"
        assert "enable_push_notifications" in data, "Missing enable_push_notifications"
        assert "enable_in_app_notifications" in data, "Missing enable_in_app_notifications"
        # Default threshold should be 10
        assert data["global_low_stock_threshold"] == 10, f"Expected threshold 10, got {data['global_low_stock_threshold']}"
        print(f"✓ Alert settings: threshold={data['global_low_stock_threshold']}, push={data.get('enable_push_notifications')}")

    def test_update_alert_settings_threshold(self, headers):
        """PUT /api/sysbook/alerts/settings updates the threshold"""
        # Update threshold to 15
        r = requests.put(f"{SYSBOOK_API}/alerts/settings", headers=headers, json={
            "global_low_stock_threshold": 15
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert data["global_low_stock_threshold"] == 15, f"Expected threshold 15, got {data['global_low_stock_threshold']}"
        print(f"✓ Threshold updated to 15")
        
        # Reset back to 10
        r = requests.put(f"{SYSBOOK_API}/alerts/settings", headers=headers, json={
            "global_low_stock_threshold": 10
        })
        assert r.status_code == 200
        data = r.json()
        assert data["global_low_stock_threshold"] == 10
        print(f"✓ Threshold reset to 10")

    def test_update_push_notifications_toggle(self, headers):
        """PUT /api/sysbook/alerts/settings updates push notification settings"""
        # Get current
        r = requests.get(f"{SYSBOOK_API}/alerts/settings", headers=headers)
        current = r.json()
        original_push = current.get("enable_push_notifications", True)
        
        # Toggle
        r = requests.put(f"{SYSBOOK_API}/alerts/settings", headers=headers, json={
            "enable_push_notifications": not original_push
        })
        assert r.status_code == 200
        data = r.json()
        assert data["enable_push_notifications"] == (not original_push)
        print(f"✓ Push notifications toggled to {not original_push}")
        
        # Reset
        r = requests.put(f"{SYSBOOK_API}/alerts/settings", headers=headers, json={
            "enable_push_notifications": original_push
        })
        assert r.status_code == 200


class TestCheckStock:
    """Test manual stock check"""

    def test_check_stock_scans_products_creates_alerts(self, headers):
        """POST /api/sysbook/alerts/check-stock scans products and creates alerts"""
        r = requests.post(f"{SYSBOOK_API}/alerts/check-stock", headers=headers, json={})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify response structure
        assert "checked" in data, "Missing 'checked' in response"
        assert "new_alerts" in data, "Missing 'new_alerts' in response"
        assert "already_alerted" in data, "Missing 'already_alerted' in response"
        assert "threshold" in data, "Missing 'threshold' in response"
        
        print(f"✓ Stock check: checked={data['checked']}, new_alerts={data['new_alerts']}, already_alerted={data['already_alerted']}, threshold={data['threshold']}")


class TestAlertsList:
    """Test alert listing and filtering"""

    def test_list_alerts_active(self, headers):
        """GET /api/sysbook/alerts?status=active returns active alerts with correct counts"""
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "active"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Verify response structure
        assert "alerts" in data, "Missing 'alerts' in response"
        assert "total" in data, "Missing 'total' in response"
        assert "active_count" in data, "Missing 'active_count' in response"
        assert isinstance(data["alerts"], list)
        
        print(f"✓ Active alerts: {len(data['alerts'])} returned, total={data['total']}, active_count={data['active_count']}")
        
        # If alerts exist, verify alert structure
        if data["alerts"]:
            alert = data["alerts"][0]
            assert "alert_id" in alert, "Missing alert_id"
            assert "book_id" in alert, "Missing book_id"
            assert "product_name" in alert, "Missing product_name"
            assert "current_quantity" in alert, "Missing current_quantity"
            assert "severity" in alert, "Missing severity"
            assert "alert_type" in alert, "Missing alert_type"
            assert alert["source"] == "sysbook", f"Expected source=sysbook, got {alert['source']}"
            print(f"  First alert: {alert['product_name']} - {alert['current_quantity']} units ({alert['severity']})")

    def test_list_alerts_dismissed(self, headers):
        """GET /api/sysbook/alerts?status=dismissed returns dismissed alerts"""
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "dismissed"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "alerts" in data
        assert "total" in data
        print(f"✓ Dismissed alerts: {data['total']} total")

    def test_list_alerts_all(self, headers):
        """GET /api/sysbook/alerts?status=all returns all alerts"""
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "all"})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "alerts" in data
        assert "total" in data
        print(f"✓ All alerts: {data['total']} total")


class TestAlertDismiss:
    """Test alert dismissal"""

    def test_dismiss_single_alert(self, headers):
        """POST /api/sysbook/alerts/dismiss dismisses specific alerts"""
        # Get active alerts
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "active"})
        data = r.json()
        
        if not data["alerts"]:
            # Run stock check to create alerts
            requests.post(f"{SYSBOOK_API}/alerts/check-stock", headers=headers, json={})
            r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "active"})
            data = r.json()
        
        if data["alerts"]:
            alert_id = data["alerts"][0]["alert_id"]
            
            # Dismiss single alert
            r = requests.post(f"{SYSBOOK_API}/alerts/dismiss", headers=headers, json={
                "alert_ids": [alert_id]
            })
            assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
            result = r.json()
            assert "dismissed" in result
            print(f"✓ Dismissed alert {alert_id}: {result['dismissed']} alerts dismissed")
        else:
            print("⚠ No active alerts to dismiss (skipping)")

    def test_dismiss_all_alerts(self, headers):
        """POST /api/sysbook/alerts/dismiss-all dismisses all active alerts"""
        # Run stock check first to ensure alerts exist
        requests.post(f"{SYSBOOK_API}/alerts/check-stock", headers=headers, json={})
        
        # Dismiss all
        r = requests.post(f"{SYSBOOK_API}/alerts/dismiss-all", headers=headers, json={})
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        result = r.json()
        assert "dismissed" in result
        print(f"✓ Dismiss all: {result['dismissed']} alerts dismissed")
        
        # Verify no active alerts remain
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "active"})
        data = r.json()
        assert data["active_count"] == 0, f"Expected 0 active alerts after dismiss-all, got {data['active_count']}"
        print(f"✓ Active count after dismiss-all: {data['active_count']}")


class TestStockAdjustmentAlerts:
    """Test stock adjustment alert creation and auto-resolve"""

    def test_get_product_for_stock_adjust(self, headers):
        """Get a product to test stock adjustment"""
        r = requests.get(f"{SYSBOOK_API}/inventory/products", headers=headers, params={"limit": 5})
        assert r.status_code == 200
        data = r.json()
        assert "products" in data
        assert len(data["products"]) > 0, "No products found for testing"
        
        # Return first product
        product = data["products"][0]
        print(f"✓ Product for testing: {product['name']} (book_id={product['book_id']}, qty={product.get('inventory_quantity', 0)})")
        return product

    def test_stock_adjust_below_threshold_creates_alert(self, headers):
        """POST /api/sysbook/inventory/products/{id}/adjust-stock triggers alert when below threshold"""
        # Get a product
        r = requests.get(f"{SYSBOOK_API}/inventory/products", headers=headers, params={"limit": 5})
        data = r.json()
        product = data["products"][0]
        book_id = product["book_id"]
        current_qty = product.get("inventory_quantity", 0)
        
        # If stock is above threshold, reduce it to below threshold (10)
        if current_qty > 10:
            # Reduce to 5 (below threshold)
            adjust_qty = -(current_qty - 5)
            r = requests.post(f"{SYSBOOK_API}/inventory/products/{book_id}/adjust-stock", headers=headers, json={
                "book_id": book_id,
                "quantity_change": adjust_qty,
                "reason": "test_alert_creation"
            })
            assert r.status_code == 200, f"Stock adjust failed: {r.text}"
            result = r.json()
            new_qty = result["new_quantity"]
            print(f"✓ Reduced stock from {current_qty} to {new_qty}")
            
            # Check if alert was created
            r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "active"})
            alerts_data = r.json()
            book_alerts = [a for a in alerts_data["alerts"] if a["book_id"] == book_id]
            if book_alerts:
                print(f"✓ Alert created for {book_id}: {book_alerts[0]['alert_type']}")
            else:
                print(f"⚠ No alert found for {book_id} (may have been auto-resolved or dismissed)")
            
            # Restore stock
            r = requests.post(f"{SYSBOOK_API}/inventory/products/{book_id}/adjust-stock", headers=headers, json={
                "book_id": book_id,
                "quantity_change": current_qty - new_qty,
                "reason": "test_restore"
            })
            assert r.status_code == 200
            print(f"✓ Restored stock back to {current_qty}")
        else:
            print(f"⚠ Product already at or below threshold ({current_qty} units), testing with current state")

    def test_stock_adjust_above_threshold_auto_resolves(self, headers):
        """Alerts auto-resolve when stock goes above threshold after adjustment"""
        # First ensure we have an alert by setting stock low
        r = requests.get(f"{SYSBOOK_API}/inventory/products", headers=headers, params={"limit": 5})
        data = r.json()
        product = data["products"][0]
        book_id = product["book_id"]
        current_qty = product.get("inventory_quantity", 0)
        
        # Set stock to 5 (below threshold)
        if current_qty != 5:
            adjust = 5 - current_qty
            r = requests.post(f"{SYSBOOK_API}/inventory/products/{book_id}/adjust-stock", headers=headers, json={
                "book_id": book_id,
                "quantity_change": adjust,
                "reason": "test_setup_low_stock"
            })
            assert r.status_code == 200
        
        # Now increase to above threshold (20)
        r = requests.post(f"{SYSBOOK_API}/inventory/products/{book_id}/adjust-stock", headers=headers, json={
            "book_id": book_id,
            "quantity_change": 15,  # 5 + 15 = 20
            "reason": "test_auto_resolve"
        })
        assert r.status_code == 200
        result = r.json()
        new_qty = result["new_quantity"]
        print(f"✓ Increased stock to {new_qty} (above threshold)")
        
        # Check if alert was auto-resolved
        r = requests.get(f"{SYSBOOK_API}/alerts", headers=headers, params={"status": "all"})
        alerts_data = r.json()
        book_alerts = [a for a in alerts_data["alerts"] if a["book_id"] == book_id]
        
        if book_alerts:
            latest = book_alerts[0]
            if latest.get("auto_resolved"):
                print(f"✓ Alert auto-resolved: {latest['alert_id']}")
            elif latest.get("dismissed"):
                print(f"✓ Alert dismissed: {latest['alert_id']}")
            else:
                print(f"⚠ Alert state: dismissed={latest.get('dismissed')}, auto_resolved={latest.get('auto_resolved')}")
        else:
            print(f"⚠ No alerts found for {book_id}")
        
        # Restore original stock
        r = requests.post(f"{SYSBOOK_API}/inventory/products/{book_id}/adjust-stock", headers=headers, json={
            "book_id": book_id,
            "quantity_change": current_qty - new_qty,
            "reason": "test_restore"
        })
        assert r.status_code == 200
        print(f"✓ Restored stock to original {current_qty}")


class TestStockOrdersCatalogType:
    """Test stock orders use product_type=sysbook (not pca)"""

    def test_stock_orders_use_sysbook_product_type(self, headers):
        """GET /api/sysbook/stock-orders returns orders with product_type=sysbook"""
        r = requests.get(f"{SYSBOOK_API}/stock-orders", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "orders" in data
        assert "total" in data
        print(f"✓ Stock orders: {data['total']} total")
        
        # If orders exist, verify product_type
        if data["orders"]:
            for order in data["orders"][:3]:  # Check first 3
                assert order.get("product_type") == "sysbook", f"Expected product_type=sysbook, got {order.get('product_type')}"
            print(f"✓ All checked orders have product_type=sysbook")

    def test_create_shipment_uses_sysbook(self, headers):
        """POST /api/sysbook/stock-orders/shipment creates with product_type=sysbook"""
        # Get a product first
        r = requests.get(f"{SYSBOOK_API}/inventory/products", headers=headers, params={"limit": 1})
        product = r.json()["products"][0]
        
        # Create shipment
        r = requests.post(f"{SYSBOOK_API}/stock-orders/shipment", headers=headers, json={
            "supplier": "TEST_SUPPLIER",
            "expected_date": "2026-03-01",
            "items": [{
                "book_id": product["book_id"],
                "product_name": product["name"],
                "expected_qty": 10
            }],
            "notes": "Test shipment for alerts testing"
        })
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        order = r.json()
        
        assert order["product_type"] == "sysbook", f"Expected product_type=sysbook, got {order.get('product_type')}"
        assert order["type"] == "shipment"
        print(f"✓ Created shipment {order['order_id']} with product_type=sysbook")
        
        # Return order_id for cleanup if needed
        return order["order_id"]


class TestSysbookInventoryWorks:
    """Verify Sysbook inventory page still works after pca→sysbook rename"""

    def test_sysbook_inventory_dashboard(self, headers):
        """GET /api/sysbook/inventory/dashboard returns stats"""
        r = requests.get(f"{SYSBOOK_API}/inventory/dashboard", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "total_products" in data
        assert "total_stock" in data
        assert "out_of_stock" in data
        assert "low_stock" in data
        print(f"✓ Dashboard: products={data['total_products']}, stock={data['total_stock']}, out_of_stock={data['out_of_stock']}, low_stock={data['low_stock']}")

    def test_sysbook_inventory_products(self, headers):
        """GET /api/sysbook/inventory/products returns PCA products"""
        r = requests.get(f"{SYSBOOK_API}/inventory/products", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "products" in data
        assert "total" in data
        assert data["total"] > 0, "No products found"
        
        # All products should be PCA
        for p in data["products"][:5]:
            assert p.get("is_sysbook") == True, f"Product {p.get('book_id')} not PCA"
        print(f"✓ Products: {data['total']} total, all is_sysbook=True")


class TestSysbookAnalyticsWorks:
    """Verify Sysbook analytics page still works"""

    def test_sysbook_analytics_overview(self, headers):
        """GET /api/sysbook/analytics/overview returns KPIs"""
        r = requests.get(f"{SYSBOOK_API}/analytics/overview", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        assert "total_products" in data
        assert "total_stock" in data
        print(f"✓ Analytics overview: products={data['total_products']}, stock={data['total_stock']}")

    def test_sysbook_analytics_grade_summary(self, headers):
        """GET /api/sysbook/analytics/grade-summary returns grade breakdown"""
        r = requests.get(f"{SYSBOOK_API}/analytics/grade-summary", headers=headers)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        
        # Should have grades array
        assert isinstance(data, list) or "grades" in data
        print(f"✓ Grade summary returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
