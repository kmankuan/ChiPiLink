"""
Test cases for thermal printer output fix.
Bug: Physical output showed 'Item 1, Item 2...' instead of actual book codes and names.
Fix: Updated handleThermalPrint to use fetch+document.write pattern, backend returns correct HTML.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Test order IDs with proper book_code and book_name data
TEST_ORDER_IDS = ["ord_test001", "ord_test002"]

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]


class TestThermalPageEndpoint:
    """Tests for GET /api/print/thermal-page endpoint"""
    
    def test_thermal_page_returns_html_with_book_codes(self, auth_token):
        """Verify thermal-page returns HTML containing book codes"""
        ids = ",".join(TEST_ORDER_IDS)
        response = requests.get(
            f"{BASE_URL}/api/print/thermal-page",
            params={"order_ids": ids, "token": auth_token}
        )
        
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
        
        html = response.text
        # Verify book codes are present (not generic "Item 1, Item 2")
        assert "MAT-3A" in html, "Book code MAT-3A should be in thermal HTML"
        assert "ESP-3B" in html, "Book code ESP-3B should be in thermal HTML"
        assert "SCI-3C" in html, "Book code SCI-3C should be in thermal HTML"
        assert "HIS-5A" in html, "Book code HIS-5A should be in thermal HTML"
        assert "ENG-5B" in html, "Book code ENG-5B should be in thermal HTML"
        
    def test_thermal_page_returns_html_with_book_names(self, auth_token):
        """Verify thermal-page returns HTML containing book names"""
        ids = ",".join(TEST_ORDER_IDS)
        response = requests.get(
            f"{BASE_URL}/api/print/thermal-page",
            params={"order_ids": ids, "token": auth_token}
        )
        
        html = response.text
        # Verify book names are present
        assert "Matematicas" in html, "Book name 'Matematicas' should be in thermal HTML"
        assert "Espanol" in html, "Book name 'Espanol' should be in thermal HTML"
        assert "Ciencias" in html, "Book name 'Ciencias' should be in thermal HTML"
        assert "Historia" in html, "Book name 'Historia' should be in thermal HTML"
        
    def test_thermal_page_no_generic_item_names(self, auth_token):
        """Verify thermal HTML does NOT contain generic 'Item 1, Item 2' placeholders"""
        ids = ",".join(TEST_ORDER_IDS)
        response = requests.get(
            f"{BASE_URL}/api/print/thermal-page",
            params={"order_ids": ids, "token": auth_token}
        )
        
        html = response.text
        # Make sure we don't have generic placeholders
        assert "Item 1" not in html, "Should not have generic 'Item 1' placeholder"
        assert "Item 2" not in html, "Should not have generic 'Item 2' placeholder"


class TestPrintJobsEndpoint:
    """Tests for POST /api/print/jobs endpoint"""
    
    def test_print_jobs_returns_order_data_with_book_code(self, auth_token):
        """Verify print jobs endpoint returns orders with book_code field"""
        response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"order_ids": TEST_ORDER_IDS}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "orders" in data
        assert len(data["orders"]) == 2
        
        # Check first order (Maria Rodriguez)
        order1 = data["orders"][0]
        assert order1["order_id"] == "ord_test001"
        assert order1["student_name"] == "Maria Rodriguez"
        
        # Verify items have book_code
        for item in order1["items"]:
            assert "book_code" in item, "Each item should have book_code field"
            assert item["book_code"] != "", "book_code should not be empty"
            
    def test_print_jobs_returns_order_data_with_book_name(self, auth_token):
        """Verify print jobs endpoint returns orders with book_name field"""
        response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"order_ids": TEST_ORDER_IDS}
        )
        
        data = response.json()
        
        # Check all orders have items with book_name
        for order in data["orders"]:
            for item in order["items"]:
                assert "book_name" in item, "Each item should have book_name field"
                assert item["book_name"] != "", "book_name should not be empty"
                
    def test_print_jobs_returns_thermal_html(self, auth_token):
        """Verify print jobs endpoint returns pre-built thermal_html"""
        response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"order_ids": TEST_ORDER_IDS}
        )
        
        data = response.json()
        
        assert "thermal_html" in data, "Response should include thermal_html"
        assert "MAT-3A" in data["thermal_html"], "thermal_html should contain book codes"
        assert "Matematicas" in data["thermal_html"], "thermal_html should contain book names"
        
    def test_print_jobs_returns_format_config(self, auth_token):
        """Verify print jobs endpoint returns format configuration"""
        response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"order_ids": TEST_ORDER_IDS}
        )
        
        data = response.json()
        
        assert "format_config" in data
        config = data["format_config"]
        
        # Verify key format settings
        assert "body" in config
        assert config["body"]["show_item_code"] == True, "show_item_code should be enabled"
        assert config["body"]["show_item_name"] == True, "show_item_name should be enabled"


class TestPrintJobsNormalization:
    """Tests for item field normalization in print jobs"""
    
    def test_item_fields_normalized_for_frontend(self, auth_token):
        """Verify items have normalized fields for frontend compatibility"""
        response = requests.post(
            f"{BASE_URL}/api/print/jobs",
            headers={"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"},
            json={"order_ids": ["ord_test001"]}
        )
        
        data = response.json()
        item = data["orders"][0]["items"][0]
        
        # Verify all expected fields are present (normalization from backend)
        assert "book_code" in item
        assert "book_name" in item
        assert "name" in item  # Normalized field
        assert "title" in item  # Normalized field
        assert "quantity" in item  # Normalized field
        assert "quantity_ordered" in item or "quantity" in item
        
        # book_name and name should be the same
        assert item.get("name") == item.get("book_name"), "name should equal book_name"
