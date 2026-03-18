"""
Test UI Style Templates Application & Retail Inventory Management
Tests:
- P1: UI Style templates: GET /api/public/ui-style, PUT /api/admin/ui-style (template change flows)
- P2: Inventory management: dashboard, products, stock adjustments, movements, alerts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"


class TestUIStyleTemplates:
    """P1: UI Style template application tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_public_ui_style_returns_default_style_and_template(self):
        """GET /api/public/ui-style returns style with template and colors (no auth)"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "style" in data, "Response should contain 'style' key"
        
        style = data["style"]
        # Check required fields
        assert "template" in style, "Style should have 'template' field"
        assert "primary_color" in style, "Style should have 'primary_color' field"
        assert "font_family" in style, "Style should have 'font_family' field"
        assert "border_radius" in style, "Style should have 'border_radius' field"
        assert "card_style" in style, "Style should have 'card_style' field"
        
        # Validate template value
        valid_templates = ["default", "elegant", "warm", "ocean", "minimal"]
        assert style["template"] in valid_templates, f"Invalid template: {style['template']}"
        
        print(f"SUCCESS: Public UI style returns template='{style['template']}', primary_color='{style['primary_color']}'")
    
    def test_admin_change_template_to_elegant(self, admin_token):
        """PUT /api/admin/ui-style saves template change to 'elegant' (admin auth)"""
        # Update to elegant template
        elegant_style = {
            "template": "elegant",
            "primary_color": "#7c3aed",
            "font_family": "Inter",
            "border_radius": "0.75rem",
            "card_style": "elevated"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            json={"style": elegant_style},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        print("SUCCESS: Admin saved 'elegant' template successfully")
    
    def test_public_ui_style_reflects_elegant_after_save(self, admin_token):
        """GET /api/public/ui-style reflects the saved 'elegant' template after admin save"""
        # First set to elegant
        elegant_style = {
            "template": "elegant",
            "primary_color": "#7c3aed",
            "font_family": "Inter",
            "border_radius": "0.75rem",
            "card_style": "elevated"
        }
        requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            json={"style": elegant_style},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Now check public endpoint
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200
        
        data = response.json()
        style = data["style"]
        assert style["template"] == "elegant", f"Expected 'elegant' template, got '{style['template']}'"
        
        print(f"SUCCESS: Public UI style reflects 'elegant' template correctly")
    
    def test_admin_reset_template_to_default(self, admin_token):
        """PUT /api/admin/ui-style resets template back to 'default' (admin auth)"""
        default_style = {
            "template": "default",
            "primary_color": "#16a34a",
            "font_family": "Inter",
            "border_radius": "0.75rem",
            "card_style": "elevated"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            json={"style": default_style},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        # Verify reset
        public_response = requests.get(f"{BASE_URL}/api/public/ui-style")
        public_style = public_response.json()["style"]
        assert public_style["template"] == "default", f"Expected 'default', got '{public_style['template']}'"
        
        print("SUCCESS: Admin reset template to 'default' successfully")


class TestInventoryDashboard:
    """P2: Inventory dashboard endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_inventory_dashboard_requires_auth(self):
        """GET /api/store/inventory/dashboard requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/inventory/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Inventory dashboard requires authentication")
    
    def test_inventory_dashboard_returns_stats(self, admin_token):
        """GET /api/store/inventory/dashboard returns total_products, total_stock, total_value, low_stock, out_of_stock"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check required stats fields
        required_fields = ["total_products", "total_stock", "total_value", "low_stock", "out_of_stock"]
        for field in required_fields:
            assert field in data, f"Dashboard should contain '{field}' field"
            assert isinstance(data[field], (int, float)), f"'{field}' should be numeric"
        
        # Check optional fields
        assert "recent_movements" in data, "Dashboard should contain 'recent_movements'"
        assert "category_breakdown" in data, "Dashboard should contain 'category_breakdown'"
        
        print(f"SUCCESS: Dashboard returns total_products={data['total_products']}, total_stock={data['total_stock']}, total_value=${data['total_value']:.2f}, low_stock={data['low_stock']}, out_of_stock={data['out_of_stock']}")


class TestInventoryProducts:
    """P2: Inventory products list endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_inventory_products_returns_list(self, admin_token):
        """GET /api/store/inventory/products returns product list with stock data"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response should contain 'products' list"
        assert "total" in data, "Response should contain 'total' count"
        assert isinstance(data["products"], list), "Products should be a list"
        
        # If products exist, check structure
        if len(data["products"]) > 0:
            product = data["products"][0]
            # Check product has stock-related fields
            assert "book_id" in product or "libro_id" in product, "Product should have book_id or libro_id"
        
        print(f"SUCCESS: Inventory products returns {len(data['products'])} products (total: {data['total']})")
    
    def test_inventory_products_filter_out_of_stock(self, admin_token):
        """GET /api/store/inventory/products?stock_filter=out returns only out-of-stock products"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products",
            params={"stock_filter": "out"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all returned products are out of stock (qty <= 0 or not set)
        for product in data["products"]:
            qty = product.get("inventory_quantity", 0)
            assert qty <= 0, f"Product {product.get('name', product.get('book_id'))} has qty {qty}, should be out of stock"
        
        print(f"SUCCESS: stock_filter=out returns {len(data['products'])} out-of-stock products")


class TestStockAdjustments:
    """P2: Stock adjustment endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def test_product(self, admin_token):
        """Get a product to test adjustments on"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products",
            params={"limit": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        if len(data["products"]) == 0:
            pytest.skip("No products available for stock adjustment test")
        return data["products"][0]
    
    def test_stock_adjust_add(self, admin_token, test_product):
        """POST /api/store/inventory/adjust adds stock to a product and returns old/new quantity"""
        book_id = test_product.get("book_id") or test_product.get("libro_id")
        old_qty = test_product.get("inventory_quantity", 0)
        
        response = requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={
                "book_id": book_id,
                "quantity_change": 5,
                "reason": "restock",
                "notes": "Test stock addition"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "old_quantity" in data, "Response should contain old_quantity"
        assert "new_quantity" in data, "Response should contain new_quantity"
        assert "movement_id" in data, "Response should contain movement_id"
        
        # Verify quantity changed correctly
        expected_new_qty = max(0, old_qty + 5)
        assert data["new_quantity"] == expected_new_qty, f"Expected new_quantity={expected_new_qty}, got {data['new_quantity']}"
        
        print(f"SUCCESS: Added 5 stock to product {book_id}: {data['old_quantity']} -> {data['new_quantity']}")
        return data["movement_id"]
    
    def test_stock_adjust_remove(self, admin_token, test_product):
        """POST /api/store/inventory/adjust removes stock from a product"""
        book_id = test_product.get("book_id") or test_product.get("libro_id")
        
        # First add some stock to ensure we can remove
        requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={"book_id": book_id, "quantity_change": 10, "reason": "restock"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Now remove stock
        response = requests.post(
            f"{BASE_URL}/api/store/inventory/adjust",
            json={
                "book_id": book_id,
                "quantity_change": -3,
                "reason": "sold_offline",
                "notes": "Test stock removal"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data["old_quantity"] > data["new_quantity"] or data["new_quantity"] == 0, "Stock should decrease"
        
        print(f"SUCCESS: Removed 3 stock from product {book_id}: {data['old_quantity']} -> {data['new_quantity']}")


class TestInventoryMovements:
    """P2: Inventory movement history endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_inventory_movements_returns_history(self, admin_token):
        """GET /api/store/inventory/movements returns movement entries"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/movements",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "movements" in data, "Response should contain 'movements' list"
        assert "total" in data, "Response should contain 'total' count"
        
        # If movements exist, verify structure
        if len(data["movements"]) > 0:
            movement = data["movements"][0]
            expected_fields = ["movement_id", "book_id", "type", "quantity_change", "old_quantity", "new_quantity", "reason", "timestamp"]
            for field in expected_fields:
                assert field in movement, f"Movement should have '{field}' field"
            assert movement["type"] in ["addition", "removal"], f"Invalid movement type: {movement['type']}"
        
        print(f"SUCCESS: Movements endpoint returns {len(data['movements'])} entries (total: {data['total']})")


class TestLowStockAlerts:
    """P2: Low stock alerts endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_low_stock_alerts_with_threshold(self, admin_token):
        """GET /api/store/inventory/alerts returns low-stock products with threshold=50"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/alerts",
            params={"threshold": 50},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "alerts" in data, "Response should contain 'alerts' list"
        assert "threshold" in data, "Response should contain 'threshold'"
        assert "count" in data, "Response should contain 'count'"
        
        assert data["threshold"] == 50, f"Expected threshold=50, got {data['threshold']}"
        
        # Verify all products are below threshold
        for product in data["alerts"]:
            qty = product.get("inventory_quantity", 0)
            assert qty <= 50, f"Product {product.get('name')} has qty {qty}, should be <= 50"
        
        print(f"SUCCESS: Alerts endpoint returns {data['count']} products with stock <= 50")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
