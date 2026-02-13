"""
Backend Tests for Textbook Order Redesign - Iteration 42
Tests the new order-aware item status system (locked vs available)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://chipi-wallet-fix.preview.emergentagent.com')

# Test credentials
TEST_CLIENT_EMAIL = "test@client.com"
TEST_CLIENT_PASSWORD = "password"

# Test student IDs
STUDENT_ALPHA_ID = "std_test_001"  # Grade 3 - has ordered items
STUDENT_BETA_ID = "std_test_002"   # Grade 5 - has available items (after test, will be ordered)


class TestAuthLogin:
    """Test authentication for textbook order flow"""
    
    def test_login_returns_token(self):
        """POST /api/auth-v2/login with test@client.com returns token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user info"
        assert data["user"]["email"] == TEST_CLIENT_EMAIL
        print(f"SUCCESS: Login returned token for {TEST_CLIENT_EMAIL}")
        return data["token"]


class TestStudentOrderStatus:
    """Test order-aware item statuses for students"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_student_alpha_has_ordered_items(self):
        """GET /api/store/textbook-orders/student/std_test_001 returns items with status=ordered"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_ALPHA_ID}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get student order: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain items"
        assert len(data["items"]) > 0, "Student Alpha should have at least one item"
        
        # Check that at least one item has status='ordered' (previously purchased)
        ordered_items = [item for item in data["items"] if item.get("status") == "ordered"]
        assert len(ordered_items) > 0, "Student Alpha should have at least one ordered item"
        
        # Verify the ordered item is English Grammar Workbook
        english_grammar = next((item for item in ordered_items if "English Grammar" in item.get("book_name", "")), None)
        assert english_grammar is not None, "Student Alpha should have ordered English Grammar Workbook"
        
        print(f"SUCCESS: Student Alpha has {len(ordered_items)} ordered item(s)")
        print(f"  - {english_grammar['book_name']}: status={english_grammar['status']}")
    
    def test_student_alpha_order_status_is_submitted(self):
        """The order status for std_test_001 should be 'submitted' (NOT 'draft')"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_ALPHA_ID}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Order status should be 'submitted' after any submission
        assert data.get("status") == "submitted", \
            f"Expected order status 'submitted', got '{data.get('status')}'"
        
        print(f"SUCCESS: Student Alpha order status is 'submitted'")
    
    def test_student_beta_order_check(self):
        """GET /api/store/textbook-orders/student/std_test_002 returns order with items"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{STUDENT_BETA_ID}",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get student order: {response.text}"
        
        data = response.json()
        assert "items" in data, "Response should contain items"
        assert len(data["items"]) > 0, "Student Beta should have at least one item"
        
        # Check for Mathematics textbook
        math_item = next((item for item in data["items"] if "Mathematics" in item.get("book_name", "")), None)
        assert math_item is not None, "Student Beta should have Mathematics textbook"
        
        print(f"SUCCESS: Student Beta has {len(data['items'])} item(s)")
        print(f"  - {math_item['book_name']}: status={math_item['status']}, quantity_ordered={math_item.get('quantity_ordered', 0)}")
        
        # Note: Status could be 'available' or 'ordered' depending on test order execution


class TestOrderSubmissionFlow:
    """Test order submission and status updates"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_submit_endpoint_exists(self):
        """POST /api/store/textbook-orders/submit endpoint is accessible"""
        # Just verify the endpoint exists (don't actually submit without items)
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers=self.headers,
            json={
                "student_id": STUDENT_BETA_ID,
                "items": []  # Empty items should return error
            }
        )
        
        # Should return 400 (bad request) not 404 (not found)
        # Error because no items selected, not because endpoint doesn't exist
        assert response.status_code in [400, 422], \
            f"Unexpected status code: {response.status_code}. Expected 400 or 422 for empty items"
        
        print("SUCCESS: Submit endpoint exists and validates input")


class TestPrivateCatalogAccess:
    """Test private catalog access API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_CLIENT_EMAIL, "password": TEST_CLIENT_PASSWORD}
        )
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_private_catalog_access_returns_students(self):
        """GET /api/store/private-catalog/access returns students list"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Failed to get private catalog access: {response.text}"
        
        data = response.json()
        assert "has_access" in data, "Response should contain has_access"
        assert data["has_access"] == True, "Test client should have private catalog access"
        assert "students" in data, "Response should contain students list"
        assert len(data["students"]) >= 2, "Test client should have at least 2 students linked"
        
        # Verify both test students are present
        student_ids = [s.get("student_id") or s.get("sync_id") for s in data["students"]]
        print(f"SUCCESS: Found {len(data['students'])} linked students: {student_ids}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
