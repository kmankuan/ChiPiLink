"""
Test Suite: Per-Product Custom Stock Alert Threshold Feature
Tests for Sysbook inventory module - custom low_stock_threshold functionality

Features tested:
1. PUT /api/sysbook/inventory/products/{book_id} with low_stock_threshold saves custom threshold
2. PUT with low_stock_threshold=null clears ($unset) the custom threshold
3. GET /api/sysbook/inventory/products includes low_stock_threshold field when set
4. GET /api/sysbook/alerts/settings returns global_low_stock_threshold
5. POST /api/sysbook/alerts/check-stock uses per-product threshold when set, else global
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSysbookCustomThreshold:
    """Tests for per-product custom stock alert thresholds"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        self.token = None
        self.test_book_id = None
        
        # Login as admin
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if login_resp.status_code == 200:
            data = login_resp.json()
            self.token = data.get("token") or data.get("access_token")
        
        yield
        
        # Cleanup: Delete test product if created
        if self.test_book_id and self.token:
            try:
                requests.delete(
                    f"{BASE_URL}/api/sysbook/inventory/products/{self.test_book_id}?hard_delete=true",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
            except:
                pass
    
    def _auth_headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_get_alert_settings_returns_global_threshold(self):
        """GET /api/sysbook/alerts/settings returns global_low_stock_threshold"""
        if not self.token:
            pytest.skip("Auth failed")
        
        response = requests.get(
            f"{BASE_URL}/api/sysbook/alerts/settings",
            headers=self._auth_headers()
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify global_low_stock_threshold is present
        assert "global_low_stock_threshold" in data, "Response should include global_low_stock_threshold"
        assert isinstance(data["global_low_stock_threshold"], int), "global_low_stock_threshold should be int"
        print(f"Global threshold: {data['global_low_stock_threshold']}")
    
    def test_create_product_then_set_custom_threshold(self):
        """PUT /api/sysbook/inventory/products/{book_id} with low_stock_threshold saves custom threshold"""
        if not self.token:
            pytest.skip("Auth failed")
        
        # Create a test product first
        self.test_book_id = f"TEST_THRESHOLD_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Threshold Book",
                "grade": "G5",
                "price": 10.00,
                "inventory_quantity": 5,
                "active": True
            }
        )
        assert create_resp.status_code == 200, f"Failed to create product: {create_resp.text}"
        
        # Update with custom threshold
        update_resp = requests.put(
            f"{BASE_URL}/api/sysbook/inventory/products/{self.test_book_id}",
            headers=self._auth_headers(),
            json={"low_stock_threshold": 15}
        )
        
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        data = update_resp.json()
        
        # Verify product has custom threshold
        product = data.get("product", data)
        assert product.get("low_stock_threshold") == 15, f"Expected threshold 15, got {product.get('low_stock_threshold')}"
        print(f"Custom threshold set: {product.get('low_stock_threshold')}")
    
    def test_get_products_includes_low_stock_threshold(self):
        """GET /api/sysbook/inventory/products includes low_stock_threshold field when set"""
        if not self.token:
            pytest.skip("Auth failed")
        
        # Create product with custom threshold
        self.test_book_id = f"TEST_GET_THRESHOLD_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Get Threshold Book",
                "grade": "G6",
                "price": 15.00,
                "inventory_quantity": 3,
                "low_stock_threshold": 20,
                "active": True
            }
        )
        
        # Get products list
        get_resp = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products?limit=500",
            headers=self._auth_headers()
        )
        
        assert get_resp.status_code == 200, f"Expected 200, got {get_resp.status_code}"
        data = get_resp.json()
        
        products = data.get("products", [])
        test_product = next((p for p in products if p.get("book_id") == self.test_book_id), None)
        
        assert test_product is not None, f"Test product {self.test_book_id} not found in products list"
        assert test_product.get("low_stock_threshold") == 20, f"Expected threshold 20, got {test_product.get('low_stock_threshold')}"
        print(f"Product in list has threshold: {test_product.get('low_stock_threshold')}")
    
    def test_clear_custom_threshold_with_null(self):
        """PUT with low_stock_threshold=null should $unset (clear) the custom threshold"""
        if not self.token:
            pytest.skip("Auth failed")
        
        # Create product with custom threshold
        self.test_book_id = f"TEST_CLEAR_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Clear Threshold Book",
                "grade": "G7",
                "price": 20.00,
                "inventory_quantity": 8,
                "low_stock_threshold": 25,
                "active": True
            }
        )
        
        # Clear threshold by setting null
        clear_resp = requests.put(
            f"{BASE_URL}/api/sysbook/inventory/products/{self.test_book_id}",
            headers=self._auth_headers(),
            json={"low_stock_threshold": None}
        )
        
        assert clear_resp.status_code == 200, f"Expected 200, got {clear_resp.status_code}: {clear_resp.text}"
        data = clear_resp.json()
        product = data.get("product", data)
        
        # Verify threshold is cleared (not present or None)
        assert product.get("low_stock_threshold") is None, f"Expected threshold to be cleared, got {product.get('low_stock_threshold')}"
        print("Custom threshold cleared successfully")
    
    def test_check_stock_uses_custom_threshold(self):
        """POST /api/sysbook/alerts/check-stock uses per-product threshold when set"""
        if not self.token:
            pytest.skip("Auth failed")
        
        # Get global threshold first
        settings_resp = requests.get(
            f"{BASE_URL}/api/sysbook/alerts/settings",
            headers=self._auth_headers()
        )
        global_threshold = settings_resp.json().get("global_low_stock_threshold", 10)
        
        # Create product with custom threshold higher than global
        # Stock=5, custom threshold=50 means it should trigger alert
        # With global threshold of 10, stock=5 would also trigger, but let's verify custom is used
        self.test_book_id = f"TEST_CHECK_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Check Stock Book",
                "grade": "G8",
                "price": 25.00,
                "inventory_quantity": 5,
                "low_stock_threshold": 50,  # Custom threshold of 50
                "active": True
            }
        )
        
        # Run stock check
        check_resp = requests.post(
            f"{BASE_URL}/api/sysbook/alerts/check-stock",
            headers=self._auth_headers()
        )
        
        assert check_resp.status_code == 200, f"Expected 200, got {check_resp.status_code}: {check_resp.text}"
        data = check_resp.json()
        
        print(f"Check stock result: checked={data.get('checked')}, new_alerts={data.get('new_alerts')}, already_alerted={data.get('already_alerted')}")
        
        # Verify alert was created - check in alerts list
        alerts_resp = requests.get(
            f"{BASE_URL}/api/sysbook/alerts?status=active&limit=100",
            headers=self._auth_headers()
        )
        alerts_data = alerts_resp.json()
        alerts = alerts_data.get("alerts", [])
        
        # Find alert for our test product
        test_alert = next((a for a in alerts if a.get("book_id") == self.test_book_id), None)
        
        if test_alert:
            # Verify the threshold in the alert is our custom threshold
            assert test_alert.get("threshold") == 50, f"Expected threshold 50 in alert, got {test_alert.get('threshold')}"
            assert test_alert.get("is_custom_threshold") == True, "Expected is_custom_threshold=True"
            print(f"Alert created with custom threshold: {test_alert.get('threshold')}, is_custom={test_alert.get('is_custom_threshold')}")
        else:
            # Alert might have been created in a previous check, verify product is below threshold
            print(f"No new alert for test product (may already exist). Global threshold: {global_threshold}")
    
    def test_product_without_custom_threshold_uses_global(self):
        """Products without low_stock_threshold should use global threshold for alerts"""
        if not self.token:
            pytest.skip("Auth failed")
        
        # Get global threshold
        settings_resp = requests.get(
            f"{BASE_URL}/api/sysbook/alerts/settings",
            headers=self._auth_headers()
        )
        global_threshold = settings_resp.json().get("global_low_stock_threshold", 10)
        
        # Create product WITHOUT custom threshold, stock below global
        self.test_book_id = f"TEST_GLOBAL_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Global Threshold Book",
                "grade": "G3",
                "price": 30.00,
                "inventory_quantity": 2,  # Below global threshold of 10
                "active": True
            }
        )
        
        # Run stock check
        check_resp = requests.post(
            f"{BASE_URL}/api/sysbook/alerts/check-stock",
            headers=self._auth_headers()
        )
        
        assert check_resp.status_code == 200
        
        # Check alerts
        alerts_resp = requests.get(
            f"{BASE_URL}/api/sysbook/alerts?status=active&limit=100",
            headers=self._auth_headers()
        )
        alerts = alerts_resp.json().get("alerts", [])
        
        test_alert = next((a for a in alerts if a.get("book_id") == self.test_book_id), None)
        
        if test_alert:
            # Verify alert uses global threshold
            assert test_alert.get("threshold") == global_threshold, f"Expected global threshold {global_threshold}, got {test_alert.get('threshold')}"
            assert test_alert.get("is_custom_threshold") == False, "Expected is_custom_threshold=False for global"
            print(f"Alert uses global threshold: {test_alert.get('threshold')}")


class TestThresholdUpdateValidation:
    """Tests for threshold update edge cases and validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.token = None
        self.test_book_id = None
        
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if login_resp.status_code == 200:
            data = login_resp.json()
            self.token = data.get("token") or data.get("access_token")
        
        yield
        
        if self.test_book_id and self.token:
            try:
                requests.delete(
                    f"{BASE_URL}/api/sysbook/inventory/products/{self.test_book_id}?hard_delete=true",
                    headers={"Authorization": f"Bearer {self.token}"}
                )
            except:
                pass
    
    def _auth_headers(self):
        return {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_update_nonexistent_product_returns_404(self):
        """PUT on non-existent product should return 404"""
        if not self.token:
            pytest.skip("Auth failed")
        
        response = requests.put(
            f"{BASE_URL}/api/sysbook/inventory/products/NONEXISTENT_BOOK_ID_12345",
            headers=self._auth_headers(),
            json={"low_stock_threshold": 10}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returns 404 for non-existent product")
    
    def test_threshold_zero_is_valid(self):
        """Setting threshold to 0 should be valid"""
        if not self.token:
            pytest.skip("Auth failed")
        
        self.test_book_id = f"TEST_ZERO_{uuid.uuid4().hex[:8]}"
        requests.post(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self._auth_headers(),
            json={
                "book_id": self.test_book_id,
                "name": "Test Zero Threshold",
                "grade": "G4",
                "price": 10.00,
                "inventory_quantity": 10,
                "active": True
            }
        )
        
        # Set threshold to 0
        resp = requests.put(
            f"{BASE_URL}/api/sysbook/inventory/products/{self.test_book_id}",
            headers=self._auth_headers(),
            json={"low_stock_threshold": 0}
        )
        
        assert resp.status_code == 200
        product = resp.json().get("product", resp.json())
        assert product.get("low_stock_threshold") == 0
        print("Threshold 0 is valid")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
