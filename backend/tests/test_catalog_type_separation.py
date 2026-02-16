"""
Catalog Type Separation Tests
Tests the separation between 'Public Store' and 'PCA Textbooks' inventory.
Features tested:
1. GET /api/store/stock-orders?catalog_type=pca|public filtering
2. GET /api/store/inventory/products?catalog_type=pca|public filtering
3. POST /api/store/stock-orders/shipment with catalog_type
4. POST /api/store/stock-orders/adjustment with catalog_type
5. Catalog counts in list response
"""
import pytest
import requests
import os
import uuid

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
def pca_product(auth_token):
    """Get a PCA product from inventory for testing."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    response = session.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "pca", "limit": 1})
    if response.status_code == 200:
        data = response.json()
        products = data.get("products", [])
        if products:
            return products[0]
    pytest.skip("No PCA products available for testing")


@pytest.fixture(scope="module")
def public_product(auth_token):
    """Get a Public product from inventory for testing."""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    response = session.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "public", "limit": 1})
    if response.status_code == 200:
        data = response.json()
        products = data.get("products", [])
        if products:
            return products[0]
    pytest.skip("No Public products available for testing")


# ================ PRODUCT FILTERING BY CATALOG TYPE ================

class TestProductCatalogTypeFiltering:
    """Test /api/store/inventory/products catalog_type filtering."""
    
    def test_products_pca_filter_returns_only_private_catalog(self, api_client):
        """GET /api/store/inventory/products?catalog_type=pca returns only PCA products."""
        response = api_client.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "pca", "limit": 50})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        
        # All returned products should be private catalog (is_private_catalog=True)
        for product in data.get("products", []):
            assert product.get("is_private_catalog") == True, f"Product {product.get('book_id')} is not PCA"
        
        print(f"PCA products returned: {data['total']}")
    
    def test_products_public_filter_returns_only_public_catalog(self, api_client):
        """GET /api/store/inventory/products?catalog_type=public returns only public products."""
        response = api_client.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "public", "limit": 50})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "products" in data
        
        # All returned products should NOT be private catalog
        for product in data.get("products", []):
            is_private = product.get("is_private_catalog", False)
            assert is_private in [False, None], f"Product {product.get('book_id')} is PCA, not public"
        
        print(f"Public products returned: {data['total']}")
    
    def test_products_no_filter_returns_all(self, api_client):
        """GET /api/store/inventory/products (no catalog_type) returns all products."""
        response = api_client.get(f"{BASE_URL}/api/store/inventory/products", params={"limit": 100})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        total_all = data.get("total", 0)
        
        # Get PCA and Public counts
        r_pca = api_client.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "pca", "limit": 1})
        r_pub = api_client.get(f"{BASE_URL}/api/store/inventory/products", params={"catalog_type": "public", "limit": 1})
        
        pca_count = r_pca.json().get("total", 0) if r_pca.status_code == 200 else 0
        pub_count = r_pub.json().get("total", 0) if r_pub.status_code == 200 else 0
        
        # Total should be at least the sum of PCA + Public
        assert total_all >= pca_count + pub_count, f"Total ({total_all}) should be >= PCA ({pca_count}) + Public ({pub_count})"
        print(f"All products: {total_all}, PCA: {pca_count}, Public: {pub_count}")


# ================ STOCK ORDERS FILTERING BY CATALOG TYPE ================

class TestStockOrdersCatalogTypeFiltering:
    """Test /api/store/stock-orders catalog_type filtering."""
    
    def test_stock_orders_list_returns_catalog_counts(self, api_client):
        """GET /api/store/stock-orders returns catalog_counts in response."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "catalog_counts" in data, "Response should include catalog_counts"
        
        catalog_counts = data["catalog_counts"]
        print(f"Catalog counts: {catalog_counts}")
        
        # Verify counts are integers
        for key, value in catalog_counts.items():
            assert isinstance(value, int), f"catalog_counts[{key}] should be int"
    
    def test_stock_orders_pca_filter(self, api_client):
        """GET /api/store/stock-orders?catalog_type=pca returns only PCA orders."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "pca"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for order in data.get("orders", []):
            assert order.get("catalog_type") == "pca", f"Order {order['order_id']} is not PCA"
        
        print(f"PCA orders: {len(data.get('orders', []))}")
    
    def test_stock_orders_public_filter(self, api_client):
        """GET /api/store/stock-orders?catalog_type=public returns only public orders."""
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "public"})
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        for order in data.get("orders", []):
            assert order.get("catalog_type") == "public", f"Order {order['order_id']} is not public"
        
        print(f"Public orders: {len(data.get('orders', []))}")


# ================ CREATE SHIPMENTS WITH CATALOG TYPE ================

class TestCreateShipmentWithCatalogType:
    """Test creating shipments with specific catalog_type."""
    
    def test_create_shipment_with_public_catalog_type(self, api_client, public_product):
        """POST /api/store/stock-orders/shipment with catalog_type=public creates a public shipment."""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "supplier": f"TEST_PublicSupplier_{unique_id}",
            "expected_date": "2026-02-01",
            "items": [{
                "book_id": public_product["book_id"],
                "product_name": public_product.get("name", "Public Product"),
                "expected_qty": 5
            }],
            "notes": "E2E test - public catalog shipment",
            "catalog_type": "public"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/shipment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["catalog_type"] == "public", f"Expected public catalog_type, got {data.get('catalog_type')}"
        assert data["type"] == "shipment"
        assert data["status"] == "draft"
        
        print(f"Created PUBLIC shipment: {data['order_id']}")
        
        # Verify it shows up in public filter
        r = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "public"})
        assert r.status_code == 200
        order_ids = [o["order_id"] for o in r.json().get("orders", [])]
        assert data["order_id"] in order_ids, "Public shipment should appear in public filter"
        
        self.__class__.test_public_shipment_id = data["order_id"]
    
    def test_create_shipment_with_pca_catalog_type(self, api_client, pca_product):
        """POST /api/store/stock-orders/shipment with catalog_type=pca creates a PCA shipment."""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "supplier": f"TEST_PCASupplier_{unique_id}",
            "expected_date": "2026-02-01",
            "items": [{
                "book_id": pca_product["book_id"],
                "product_name": pca_product.get("name", "PCA Product"),
                "expected_qty": 3
            }],
            "notes": "E2E test - pca catalog shipment",
            "catalog_type": "pca"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/shipment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["catalog_type"] == "pca", f"Expected pca catalog_type, got {data.get('catalog_type')}"
        
        print(f"Created PCA shipment: {data['order_id']}")
        
        # Verify it shows up in pca filter
        r = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "pca"})
        assert r.status_code == 200
        order_ids = [o["order_id"] for o in r.json().get("orders", [])]
        assert data["order_id"] in order_ids, "PCA shipment should appear in pca filter"
        
        self.__class__.test_pca_shipment_id = data["order_id"]


# ================ CREATE ADJUSTMENTS WITH CATALOG TYPE ================

class TestCreateAdjustmentWithCatalogType:
    """Test creating adjustments with specific catalog_type."""
    
    def test_create_adjustment_with_public_catalog_type(self, api_client, public_product):
        """POST /api/store/stock-orders/adjustment with catalog_type=public creates a public adjustment."""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "adjustment_reason": "Inventory correction",
            "items": [{
                "book_id": public_product["book_id"],
                "product_name": public_product.get("name", "Public Product"),
                "expected_qty": 2
            }],
            "notes": f"E2E test - public adjustment {unique_id}",
            "catalog_type": "public"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/adjustment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["catalog_type"] == "public", f"Expected public catalog_type, got {data.get('catalog_type')}"
        assert data["type"] == "adjustment"
        assert data["status"] == "requested"
        
        print(f"Created PUBLIC adjustment: {data['order_id']}")
        
        self.__class__.test_public_adjustment_id = data["order_id"]
    
    def test_create_adjustment_with_pca_catalog_type(self, api_client, pca_product):
        """POST /api/store/stock-orders/adjustment with catalog_type=pca creates a PCA adjustment."""
        unique_id = uuid.uuid4().hex[:6]
        payload = {
            "adjustment_reason": "Damaged / Write-off",
            "items": [{
                "book_id": pca_product["book_id"],
                "product_name": pca_product.get("name", "PCA Product"),
                "expected_qty": -1
            }],
            "notes": f"E2E test - pca adjustment {unique_id}",
            "catalog_type": "pca"
        }
        response = api_client.post(f"{BASE_URL}/api/store/stock-orders/adjustment", json=payload)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        data = response.json()
        assert data["catalog_type"] == "pca", f"Expected pca catalog_type, got {data.get('catalog_type')}"
        
        print(f"Created PCA adjustment: {data['order_id']}")


# ================ VERIFY ORDER DETAIL HAS CATALOG TYPE ================

class TestOrderDetailCatalogType:
    """Test that order details include catalog_type."""
    
    def test_order_detail_shows_catalog_type(self, api_client):
        """GET /api/store/stock-orders/{order_id} returns catalog_type."""
        # Get any order first
        r = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"limit": 1})
        assert r.status_code == 200
        orders = r.json().get("orders", [])
        if not orders:
            pytest.skip("No orders to test detail")
        
        order_id = orders[0]["order_id"]
        
        # Get detail
        response = api_client.get(f"{BASE_URL}/api/store/stock-orders/{order_id}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "catalog_type" in data, "Order detail should include catalog_type"
        assert data["catalog_type"] in ["pca", "public", None], f"Invalid catalog_type: {data['catalog_type']}"
        
        print(f"Order {order_id} catalog_type: {data['catalog_type']}")


# ================ CATALOG TYPE COUNTS VERIFICATION ================

class TestCatalogTypeCounts:
    """Test that catalog counts are accurate after creating orders."""
    
    def test_catalog_counts_update_correctly(self, api_client):
        """Verify catalog_counts in list response matches actual filter counts."""
        # Get counts from main list
        r = api_client.get(f"{BASE_URL}/api/store/stock-orders")
        assert r.status_code == 200
        main_data = r.json()
        reported_counts = main_data.get("catalog_counts", {})
        
        # Get actual counts via filters
        r_pca = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "pca"})
        r_public = api_client.get(f"{BASE_URL}/api/store/stock-orders", params={"catalog_type": "public"})
        
        actual_pca = len(r_pca.json().get("orders", [])) if r_pca.status_code == 200 else 0
        actual_public = len(r_public.json().get("orders", [])) if r_public.status_code == 200 else 0
        
        print(f"Reported: {reported_counts}")
        print(f"Actual PCA: {actual_pca}, Public: {actual_public}")
        
        # Counts should match
        assert reported_counts.get("pca", 0) == actual_pca, f"PCA count mismatch: {reported_counts.get('pca')} vs {actual_pca}"
        assert reported_counts.get("public", 0) == actual_public, f"Public count mismatch: {reported_counts.get('public')} vs {actual_public}"
