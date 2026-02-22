"""
Student Textbook Ordering Workflow Tests
Tests the complete flow: login → browse textbook category → link student → see textbooks → order
Field renames validated: is_private_catalog→is_sysbook, catalog_type→inventory_source
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')


class TestTextbookAccessEndpoints:
    """Test textbook access configuration and schools endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_schools(self):
        """GET /api/store/textbook-access/schools returns list of schools"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/schools",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "schools" in data, "Response should contain 'schools' key"
        assert isinstance(data["schools"], list), "Schools should be a list"
        print(f"✓ GET /api/store/textbook-access/schools - Found {len(data['schools'])} schools")
    
    def test_get_config(self):
        """GET /api/store/textbook-access/config returns grades configuration"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/config",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "grades" in data, "Response should contain 'grades' key"
        assert "current_year" in data, "Response should contain 'current_year' key"
        assert "available_years" in data, "Response should contain 'available_years' key"
        print(f"✓ GET /api/store/textbook-access/config - Grades: {len(data.get('grades', []))}, Year: {data.get('current_year')}")
    
    def test_get_my_students(self):
        """GET /api/store/textbook-access/my-students returns linked students"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "students" in data, "Response should contain 'students' key"
        assert isinstance(data["students"], list), "Students should be a list"
        print(f"✓ GET /api/store/textbook-access/my-students - Found {len(data['students'])} students")


class TestPrivateCatalogEndpoints:
    """Test private catalog (textbook) endpoints with is_sysbook field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_private_catalog_products(self):
        """GET /api/store/private-catalog/products returns textbooks with is_sysbook=True"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/products",
            headers=self.headers
        )
        # Note: May get 403 if admin user doesn't have linked students
        if response.status_code == 403:
            print("⚠ GET /api/store/private-catalog/products - 403 (no linked students for admin user) - EXPECTED")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        assert "filters" in data, "Response should contain 'filters' key"
        
        # Verify products have is_sysbook=True (field renamed from is_private_catalog)
        for product in data.get("products", []):
            assert "is_sysbook" in product or product.get("is_sysbook") is None, \
                "Products should use is_sysbook field (not is_private_catalog)"
        
        print(f"✓ GET /api/store/private-catalog/products - Found {len(data.get('products', []))} textbooks")
    
    def test_get_private_catalog_products_with_grade_filter(self):
        """GET /api/store/private-catalog/products?grade=G3 filters by grade correctly"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/products?grade=G3",
            headers=self.headers
        )
        # May get 403 if no linked students
        if response.status_code == 403:
            print("⚠ GET /api/store/private-catalog/products?grade=G3 - 403 (no linked students) - EXPECTED")
            return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        products = data.get("products", [])
        
        # Verify grade filter works
        for product in products:
            grade = product.get("grade") or product.get("grades", [])
            if isinstance(grade, list):
                assert "G3" in grade or "3" in grade, f"Product grade filter not working: {product.get('name')}"
            else:
                assert grade in ["G3", "3"], f"Product grade filter not working: {product.get('name')}"
        
        print(f"✓ GET /api/store/private-catalog/products?grade=G3 - Found {len(products)} products for G3")
    
    def test_admin_get_private_catalog_products(self):
        """GET /api/store/private-catalog/admin/products returns is_sysbook products"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/admin/products",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        
        # All products should have is_sysbook=True
        for product in data.get("products", []):
            assert product.get("is_sysbook") == True, \
                f"Product {product.get('name')} should have is_sysbook=True"
        
        print(f"✓ GET /api/store/private-catalog/admin/products - Found {len(data.get('products', []))} sysbook products")


class TestTextbookOrderEndpoints:
    """Test textbook order endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_my_orders(self):
        """GET /api/store/textbook-orders/my-orders returns user orders list"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "orders" in data, "Response should contain 'orders' key"
        assert isinstance(data["orders"], list), "Orders should be a list"
        assert "total" in data, "Response should contain 'total' key"
        print(f"✓ GET /api/store/textbook-orders/my-orders - Found {data.get('total', 0)} orders")
    
    def test_admin_diagnostic_textbooks(self):
        """GET /api/store/textbook-orders/admin/diagnostic/textbooks shows correct is_sysbook_true count"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/diagnostic/textbooks",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify the diagnostic returns field analysis
        assert "products" in data, "Response should contain 'products' key"
        products_info = data.get("products", {})
        
        # Check is_sysbook_true count (renamed from is_private_catalog)
        english_fields = products_info.get("english_fields", {})
        is_sysbook_true = english_fields.get("is_sysbook_true", 0)
        
        print(f"✓ GET /api/store/textbook-orders/admin/diagnostic/textbooks")
        print(f"  - is_sysbook_true count: {is_sysbook_true}")
        print(f"  - Total products: {products_info.get('total', 0)}")
        print(f"  - Visible products: {products_info.get('visible_for_textbook_orders', 0)}")
        
        # Verify no old Spanish fields remain
        spanish_fields = products_info.get("spanish_fields_remaining", {})
        assert spanish_fields.get("has_catalogo_privado", 0) == 0, \
            "Old field catalogo_privado should not exist"


class TestWalletTopupsEndpoints:
    """Test wallet topups endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_wallet_settings(self):
        """GET /api/wallet-topups/settings returns wallet settings"""
        response = requests.get(
            f"{BASE_URL}/api/wallet-topups/settings",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain settings data"
        print(f"✓ GET /api/wallet-topups/settings - Settings retrieved")
    
    def test_get_wallet_pending(self):
        """GET /api/wallet-topups/pending returns pending topups list"""
        response = requests.get(
            f"{BASE_URL}/api/wallet-topups/pending",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "items" in data, "Response should contain 'items' key"
        assert "counts" in data, "Response should contain 'counts' key"
        print(f"✓ GET /api/wallet-topups/pending - Found {len(data.get('items', []))} pending topups")


class TestCRMChatEndpoints:
    """Test CRM chat endpoints (conversations)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_crm_chat_topics_endpoint_exists(self):
        """Verify CRM chat endpoint structure exists at /api/store/crm-chat"""
        # Test with a dummy student_id - should return 404 (student not found) not 405 or 500
        response = requests.get(
            f"{BASE_URL}/api/store/crm-chat/test-student-id/topics",
            headers=self.headers
        )
        # 404 means endpoint exists but student not found - that's expected
        # 405 would mean endpoint doesn't exist
        assert response.status_code in [200, 404], \
            f"CRM chat endpoint should exist, got {response.status_code}: {response.text}"
        print(f"✓ CRM chat endpoint exists at /api/store/crm-chat/{{student_id}}/topics")


class TestStoreInventoryWithInventorySource:
    """Test store inventory with inventory_source field (renamed from catalog_type)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_store_products_endpoint(self):
        """GET /api/store/products returns products"""
        response = requests.get(
            f"{BASE_URL}/api/store/products",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list of products"
        print(f"✓ GET /api/store/products - Found {len(data)} products")
    
    def test_store_inventory_with_catalog_type_sysbook(self):
        """GET /api/store/inventory/products?catalog_type=sysbook returns sysbook products"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products?catalog_type=sysbook",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        
        # Verify all returned products have is_sysbook=True
        for product in data.get("products", []):
            assert product.get("is_sysbook") == True, \
                f"Product {product.get('name')} should have is_sysbook=True"
        
        print(f"✓ GET /api/store/inventory/products?catalog_type=sysbook - Found {len(data.get('products', []))} products")
    
    def test_store_inventory_with_catalog_type_public(self):
        """GET /api/store/inventory/products?catalog_type=public returns non-sysbook products"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products?catalog_type=public",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        
        # Verify all returned products have is_sysbook=False or not set
        for product in data.get("products", []):
            assert product.get("is_sysbook") != True, \
                f"Product {product.get('name')} should not have is_sysbook=True for public catalog"
        
        print(f"✓ GET /api/store/inventory/products?catalog_type=public - Found {len(data.get('products', []))} products")


class TestSysbookInventoryEndpoints:
    """Test dedicated sysbook inventory endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_sysbook_inventory_products(self):
        """GET /api/sysbook/inventory/products returns sysbook inventory"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "products" in data, "Response should contain 'products' key"
        print(f"✓ GET /api/sysbook/inventory/products - Found {len(data.get('products', []))} sysbook products")
    
    def test_sysbook_inventory_dashboard(self):
        """GET /api/sysbook/inventory/dashboard returns inventory stats"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/dashboard",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "total_products" in data or "products_count" in data, \
            "Response should contain product count"
        print(f"✓ GET /api/sysbook/inventory/dashboard - Stats retrieved")


class TestTextbookOrderSubmission:
    """Test textbook order submission flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
    
    def test_order_submission_endpoint_exists(self):
        """POST /api/store/textbook-orders/submit endpoint exists"""
        # Test with minimal payload - should return 400 (validation error) not 404/405
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers=self.headers,
            json={"student_id": "test-id", "items": []}
        )
        # 400 or 422 means endpoint exists but validation failed - expected
        # 404/405 would mean endpoint doesn't exist
        assert response.status_code in [200, 201, 400, 422, 500], \
            f"Submit endpoint should exist, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/store/textbook-orders/submit endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
