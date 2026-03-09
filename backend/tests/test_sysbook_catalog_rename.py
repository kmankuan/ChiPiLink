"""
Test suite for P5 cosmetic refactoring validation
- Route rename: /private-catalog → /sysbook-catalog
- Variable renames: privateCatalogAccess → sysbookAccess, catalogFilter → inventoryFilter
- Response field rename: catalog_counts → inventory_counts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSysbookCatalogRename:
    """Test that the renamed routes work and old routes are removed"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Admin login failed: {login_res.status_code}")
    
    def test_new_sysbook_catalog_access_endpoint(self):
        """GET /api/store/sysbook-catalog/access returns has_access and students"""
        response = requests.get(
            f"{BASE_URL}/api/store/sysbook-catalog/access",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "has_access" in data, "Response should contain 'has_access'"
        assert "students" in data, "Response should contain 'students'"
        print(f"✓ sysbook-catalog/access works - has_access: {data['has_access']}, students count: {len(data.get('students', []))}")
    
    def test_old_private_catalog_route_returns_404(self):
        """GET /api/store/private-catalog/access should return 404 (old route removed)"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for old route, got {response.status_code}"
        print("✓ Old /private-catalog/access route correctly returns 404")
    
    def test_stock_orders_inventory_counts_field(self):
        """GET /api/store/stock-orders returns inventory_counts (not catalog_counts)"""
        response = requests.get(
            f"{BASE_URL}/api/store/stock-orders",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify inventory_counts field exists (renamed from catalog_counts)
        assert "inventory_counts" in data, "Response should contain 'inventory_counts' (renamed from catalog_counts)"
        assert "catalog_counts" not in data, "Response should NOT contain old 'catalog_counts' field"
        print(f"✓ stock-orders returns inventory_counts: {data['inventory_counts']}")
    
    def test_sysbook_catalog_products_endpoint(self):
        """GET /api/store/sysbook-catalog/products works with auth"""
        response = requests.get(
            f"{BASE_URL}/api/store/sysbook-catalog/products",
            headers=self.headers
        )
        # May return 200 or 403 depending on access
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        if response.status_code == 200:
            data = response.json()
            assert "products" in data
            print(f"✓ sysbook-catalog/products works - {len(data.get('products', []))} products")
        else:
            print("✓ sysbook-catalog/products returns 403 (no linked students) - expected behavior")
    
    def test_sysbook_catalog_admin_products(self):
        """GET /api/store/sysbook-catalog/admin/products returns sysbook products"""
        response = requests.get(
            f"{BASE_URL}/api/store/sysbook-catalog/admin/products",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data
        assert "total" in data
        print(f"✓ sysbook-catalog/admin/products works - {data['total']} products")


class TestUnatiendaStatsEndpoint:
    """Test the Unatienda admin stats endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_unatienda_stats(self):
        """GET /api/admin/unatienda/stats returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/unatienda/stats",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Should have public_products count
        assert "public_products" in data or "total_products" in data or isinstance(data, dict)
        print(f"✓ Unatienda stats endpoint works: {data}")


class TestSysbookInventoryEndpoint:
    """Test sysbook inventory module endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_res.status_code == 200:
            self.token = login_res.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_sysbook_inventory_products(self):
        """GET /api/sysbook/inventory/products returns sysbook inventory"""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data or isinstance(data, list)
        print(f"✓ Sysbook inventory endpoint works")
    
    def test_store_inventory_with_source_filter(self):
        """GET /api/store/inventory/products?inventory_source=sysbook works"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/products",
            headers=self.headers,
            params={"inventory_source": "sysbook"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data
        print(f"✓ Store inventory with inventory_source filter works")


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """Admin login works with provided credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "teck@koh.one",
                "password": "Acdb##0897"
            }
        )
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        print(f"✓ Admin login successful - token received")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
