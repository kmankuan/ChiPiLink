"""
Test Sysbook (School Textbooks) API separation.
Tests /api/sysbook/* endpoints that are scoped to PCA (is_private_catalog=True) products.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("REACT_APP_BACKEND_URL environment variable not set")

# Test credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token."""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Auth failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture
def headers(auth_token):
    """Headers with auth token."""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestSysbookInventoryDashboard:
    """Test /api/sysbook/inventory/dashboard endpoint"""
    
    def test_dashboard_returns_pca_only_stats(self, headers):
        """Dashboard should return stats for PCA products only (expected 25)."""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/dashboard", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "total_products" in data, "Response missing total_products"
        assert "total_stock" in data, "Response missing total_stock"
        assert "total_value" in data, "Response missing total_value"
        assert "out_of_stock" in data, "Response missing out_of_stock"
        assert "low_stock" in data, "Response missing low_stock"
        assert "recent_movements" in data, "Response missing recent_movements"
        assert "grade_breakdown" in data, "Response missing grade_breakdown"
        
        # Verify PCA count (should be 25 based on context)
        print(f"Dashboard total_products: {data['total_products']}")
        assert data["total_products"] == 25, f"Expected 25 PCA products, got {data['total_products']}"
        
    def test_dashboard_grade_breakdown_exists(self, headers):
        """Dashboard should return grade breakdown data."""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/dashboard", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        grades = data.get("grade_breakdown", [])
        print(f"Grade breakdown has {len(grades)} grades")
        assert isinstance(grades, list), "grade_breakdown should be a list"


class TestSysbookInventoryProducts:
    """Test /api/sysbook/inventory/products endpoint"""
    
    def test_products_returns_only_pca(self, headers):
        """Products list should only return PCA (is_private_catalog=True) products."""
        response = requests.get(f"{BASE_URL}/api/sysbook/inventory/products", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response missing products"
        assert "total" in data, "Response missing total"
        
        products = data["products"]
        total = data["total"]
        
        print(f"Sysbook inventory returned {len(products)} products, total: {total}")
        
        # Verify all products are PCA
        for p in products:
            assert p.get("is_private_catalog") == True, f"Product {p.get('book_id')} is not PCA"
        
        # Verify total matches expected (25 PCA products)
        assert total == 25, f"Expected 25 PCA products, got {total}"
        
    def test_products_pagination(self, headers):
        """Test products pagination works."""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=headers,
            params={"limit": 5, "skip": 0}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["products"]) <= 5, "Pagination limit not respected"
        
    def test_products_search(self, headers):
        """Test products search functionality."""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/inventory/products",
            headers=headers,
            params={"search": "Math"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Search results should be subset
        assert data["total"] <= 25, "Search should not return more than total PCA products"


class TestSysbookAnalyticsOverview:
    """Test /api/sysbook/analytics/overview endpoint"""
    
    def test_analytics_overview_returns_kpis(self, headers):
        """Analytics overview should return KPI data for Sysbook."""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/overview", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify KPI structure
        assert "total_products" in data, "Response missing total_products"
        assert "archived_products" in data, "Response missing archived_products"
        assert "total_stock" in data, "Response missing total_stock"
        assert "total_value" in data, "Response missing total_value"
        assert "recent_movements_7d" in data, "Response missing recent_movements_7d"
        assert "pending_stock_orders" in data, "Response missing pending_stock_orders"
        
        print(f"Analytics Overview - Products: {data['total_products']}, Stock: {data['total_stock']}, Value: ${data['total_value']}")


class TestSysbookAnalyticsGradeSummary:
    """Test /api/sysbook/analytics/grade-summary endpoint"""
    
    def test_grade_summary_returns_breakdown(self, headers):
        """Grade summary should return inventory breakdown by grade."""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/grade-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "grades" in data, "Response missing grades"
        
        grades = data["grades"]
        assert isinstance(grades, list), "grades should be a list"
        
        # Verify grade structure
        if grades:
            grade = grades[0]
            assert "grade" in grade, "Grade item missing grade field"
            assert "product_count" in grade, "Grade item missing product_count"
            assert "total_stock" in grade, "Grade item missing total_stock"
            
        print(f"Grade summary has {len(grades)} grade entries")


class TestSysbookAnalyticsSubjectSummary:
    """Test /api/sysbook/analytics/subject-summary endpoint"""
    
    def test_subject_summary_returns_breakdown(self, headers):
        """Subject summary should return inventory breakdown by subject."""
        response = requests.get(f"{BASE_URL}/api/sysbook/analytics/subject-summary", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subjects" in data, "Response missing subjects"
        
        subjects = data["subjects"]
        assert isinstance(subjects, list), "subjects should be a list"
        
        # Verify subject structure
        if subjects:
            subject = subjects[0]
            assert "subject" in subject, "Subject item missing subject field"
            assert "product_count" in subject, "Subject item missing product_count"
            assert "total_stock" in subject, "Subject item missing total_stock"
            
        print(f"Subject summary has {len(subjects)} subject entries")


class TestSysbookAnalyticsStockTrends:
    """Test /api/sysbook/analytics/stock-trends endpoint"""
    
    def test_stock_trends_returns_movement_data(self, headers):
        """Stock trends should return movement history for PCA products."""
        response = requests.get(
            f"{BASE_URL}/api/sysbook/analytics/stock-trends",
            headers=headers,
            params={"days": 30}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "trends" in data, "Response missing trends"
        assert "period_days" in data, "Response missing period_days"
        
        assert data["period_days"] == 30, f"Expected period_days=30, got {data['period_days']}"
        
        trends = data["trends"]
        assert isinstance(trends, list), "trends should be a list"
        
        # Verify trend structure if data exists
        if trends:
            trend = trends[0]
            assert "date" in trend, "Trend item missing date"
            assert "additions" in trend, "Trend item missing additions"
            assert "removals" in trend, "Trend item missing removals"
            assert "net_change" in trend, "Trend item missing net_change"
            
        print(f"Stock trends has {len(trends)} data points")


class TestSysbookStockOrders:
    """Test /api/sysbook/stock-orders endpoint"""
    
    def test_stock_orders_returns_pca_only(self, headers):
        """Stock orders should return only PCA catalog orders."""
        response = requests.get(f"{BASE_URL}/api/sysbook/stock-orders", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "orders" in data, "Response missing orders"
        assert "total" in data, "Response missing total"
        
        orders = data["orders"]
        
        # All orders should be catalog_type=pca
        for order in orders:
            assert order.get("catalog_type") == "pca", f"Order {order.get('order_id')} has wrong catalog_type"
            
        print(f"Stock orders returned {len(orders)} PCA orders, total: {data['total']}")
        
    def test_stock_orders_pending_summary(self, headers):
        """Test pending summary endpoint."""
        response = requests.get(f"{BASE_URL}/api/sysbook/stock-orders/summary/pending", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "pending" in data, "Response missing pending"
        assert "total" in data, "Response missing total"
        
        print(f"Pending stock orders: {data['total']}")


class TestUnatiendaStillWorks:
    """Verify original Unatienda endpoints still work (not broken by Sysbook separation)."""
    
    def test_store_products_endpoint(self, headers):
        """Original /api/store/products should still work."""
        response = requests.get(f"{BASE_URL}/api/store/products", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should return all active products (not just PCA)
        print(f"Store products returned {len(data)} products")
        
    def test_store_inventory_dashboard(self, headers):
        """Original /api/store/inventory/dashboard should still work."""
        response = requests.get(f"{BASE_URL}/api/store/inventory/dashboard", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_products" in data, "Response missing total_products"
        
        # Store dashboard should show all products (27 active), not just PCA (25)
        print(f"Store inventory dashboard total_products: {data['total_products']}")
        
    def test_private_catalog_admin_products(self, headers):
        """Original /api/store/private-catalog/admin/products should still work."""
        response = requests.get(f"{BASE_URL}/api/store/private-catalog/admin/products", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "products" in data, "Response missing products"
        
        print(f"Private catalog admin products: {len(data['products'])} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
