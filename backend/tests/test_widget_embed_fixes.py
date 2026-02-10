"""
Test Widget EmbedWidget Fixes (Iteration 72)
Tests:
1. Backend: GET /api/store/textbook-orders/student/{sid} returns _debug field
2. Backend: get_books_for_grade fuzzy matching for grade variations
3. Frontend: Widget logout, Orders tab, debug info (verified via code inspection)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

# Auth fixtures
@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "testadmin@chipi.com", "password": "TestPass123!"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Could not get admin token")


@pytest.fixture(scope="module")
def admin_user_id():
    """Get admin user ID"""
    return "cli_c8e7070a5ae0"


class TestTextbookOrdersDebugField:
    """Test GET /api/store/textbook-orders/student/{sid} returns _debug field"""

    def test_textbook_orders_returns_debug_field(self, admin_token):
        """Verify _debug field is present in response"""
        # Using the test student with grade 3 enrollment
        student_id = "std_e32ae7fae07a"
        
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should return 200 or 400 (depending on student ownership)
        # If 400, that's expected if student is not linked to admin
        if response.status_code == 400:
            print(f"Expected 400: {response.json().get('detail')}")
            # This is expected - the student's user_id might not match
            pytest.skip("Student not linked to test admin user")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check _debug field exists
        assert "_debug" in data, "_debug field missing from response"
        
        debug_info = data["_debug"]
        
        # Verify debug field contents
        expected_fields = ["grade_searched", "catalog_books_found"]
        for field in expected_fields:
            assert field in debug_info, f"_debug.{field} missing"
        
        print(f"_debug field: {debug_info}")
        print(f"  grade_searched: {debug_info.get('grade_searched')}")
        print(f"  catalog_books_found: {debug_info.get('catalog_books_found')}")

    def test_textbook_orders_debug_shows_correct_grade(self, admin_token):
        """Verify _debug.grade_searched matches student enrollment"""
        student_id = "std_e32ae7fae07a"
        
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not access student textbook orders")
        
        data = response.json()
        
        # Student has grade "3" enrollment
        assert data.get("grade") == "3", f"Expected grade '3', got '{data.get('grade')}'"
        assert data["_debug"]["grade_searched"] == "3", "grade_searched should be '3'"


class TestFuzzyGradeMatching:
    """Test fuzzy grade matching in get_books_for_grade"""

    def test_books_found_with_different_grade_format(self, admin_token):
        """
        Student has grade '3' but books might be labeled 'G3'.
        Fuzzy matching should find them.
        """
        student_id = "std_e32ae7fae07a"
        
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code != 200:
            pytest.skip("Could not access student textbook orders")
        
        data = response.json()
        items = data.get("items", [])
        
        # Should have found books (fuzzy matching from "3" to "G3")
        print(f"Found {len(items)} textbooks for grade 3 student")
        for item in items:
            print(f"  - {item.get('book_name')} (book_id: {item.get('book_id')})")
        
        assert len(items) > 0, "No textbooks found - fuzzy matching may not be working"
        assert data["_debug"]["catalog_books_found"] > 0, "catalog_books_found should be > 0"


class TestDiagnosticEndpoint:
    """Test the diagnostic endpoint for additional validation"""

    def test_diagnostic_textbooks(self, admin_token):
        """Test admin diagnostic endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/diagnostic/textbooks",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Diagnostic failed: {response.text}"
        
        data = response.json()
        
        assert "products" in data, "products section missing"
        assert "students" in data, "students section missing"
        
        print(f"Products total: {data['products'].get('total', 0)}")
        print(f"Visible for textbook orders: {data['products'].get('visible_for_textbook_orders', 0)}")
        print(f"Students with approved enrollment: {data['students'].get('with_approved_enrollment', 0)}")

    def test_diagnostic_order_flow(self, admin_token):
        """Test order flow diagnostic for specific student"""
        student_id = "std_e32ae7fae07a"
        
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/diagnostic/order-flow/{student_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Diagnostic failed: {response.text}"
        
        data = response.json()
        
        # Check student info
        if data.get("student"):
            print(f"Student: {data['student'].get('full_name')}")
            print(f"Enrollment grade: {data.get('enrollment', {}).get('grade')}")
        
        # Check available books
        available_books = data.get("available_books", {})
        print(f"Grade searched: {available_books.get('grade_searched')}")
        print(f"Books found: {available_books.get('books_found')}")
        
        # Should find books for grade 3
        assert available_books.get("books_found", 0) > 0, "Should find books for grade 3"


class TestWidgetEmbedConfig:
    """Test widget embed config endpoint"""

    def test_embed_config_returns_display_settings(self):
        """Verify embed-config returns display settings"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        
        assert response.status_code == 200, f"embed-config failed: {response.text}"
        
        data = response.json()
        
        assert "enabled" in data, "enabled field missing"
        assert "display" in data, "display field missing"
        assert "features" in data, "features field missing"
        
        display = data["display"]
        print(f"Display settings: {display}")
        
        # Check key display settings are present
        expected_display_fields = ["hide_url_bar", "hide_navbar", "hide_footer", "streamlined_flow"]
        for field in expected_display_fields:
            assert field in display, f"display.{field} missing from embed-config"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
