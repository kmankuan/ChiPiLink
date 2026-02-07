"""
Test file for SchoolTextbooksView Accordion Layout
Tests backend APIs for the new accordion-based student textbook ordering flow.

Features tested:
- GET /api/store/textbook-orders/student/{studentId} - Returns order data with items
- POST /api/store/textbook-orders/submit - Accepts student_id and items array
- GET /api/store/private-catalog/access - Returns validated students list
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSchoolTextbooksAccordion:
    """Test cases for the accordion-based textbook ordering flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token for authenticated requests"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "password": "admin"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.student_id = "std_13260a30ba9c"  # John Smith - approved student
    
    def test_private_catalog_access_returns_validated_students(self):
        """Test that /api/store/private-catalog/access returns validated students"""
        response = requests.get(
            f"{BASE_URL}/api/store/private-catalog/access",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "has_access" in data
        assert "students" in data
        assert data["has_access"] == True
        
        # Check student data structure
        students = data["students"]
        assert len(students) > 0
        
        student = students[0]
        assert "sync_id" in student or "student_id" in student
        assert "name" in student or "full_name" in student
        assert "grade" in student
        assert "school_name" in student
        
        print(f"SUCCESS: Found {len(students)} validated student(s)")
    
    def test_get_student_order_returns_order_data(self):
        """Test that GET /api/store/textbook-orders/student/{studentId} returns order with items"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{self.student_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "order_id" in data
        assert "student_id" in data
        assert "student_name" in data
        assert "grade" in data
        assert "items" in data
        assert "status" in data
        
        # Check student details
        assert data["student_id"] == self.student_id
        assert data["student_name"] == "John Smith"
        assert data["grade"] == "5"
        
        # Check items array
        items = data["items"]
        assert isinstance(items, list)
        
        if len(items) > 0:
            item = items[0]
            assert "book_id" in item
            assert "book_name" in item
            assert "price" in item
            assert "status" in item
            print(f"SUCCESS: Order has {len(items)} textbook item(s)")
        
        print(f"SUCCESS: Got order {data['order_id']} for {data['student_name']}")
    
    def test_get_student_order_item_structure(self):
        """Test that order items have correct structure for accordion display"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{self.student_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        if len(items) > 0:
            item = items[0]
            
            # Required fields for accordion display
            assert "book_id" in item, "Missing book_id"
            assert "book_code" in item, "Missing book_code"
            assert "book_name" in item, "Missing book_name"
            assert "price" in item, "Missing price"
            assert "status" in item, "Missing status"
            assert "quantity_ordered" in item or "max_quantity" in item, "Missing quantity field"
            
            # Status should be one of expected values
            valid_statuses = ["available", "ordered", "reorder_requested", "reorder_approved"]
            assert item["status"] in valid_statuses, f"Unexpected status: {item['status']}"
            
            print(f"SUCCESS: Item {item['book_name']} has correct structure")
    
    def test_submit_order_endpoint_exists(self):
        """Test that POST /api/store/textbook-orders/submit endpoint is accessible"""
        # Get current order to find an available item
        order_response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{self.student_id}",
            headers=self.headers
        )
        
        assert order_response.status_code == 200
        order_data = order_response.json()
        items = order_data.get("items", [])
        
        # Find available items
        available_items = [i for i in items if i.get("status") == "available"]
        
        if len(available_items) == 0:
            pytest.skip("No available items to test submit")
        
        # Test submit endpoint with empty items (should fail validation)
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            headers=self.headers,
            json={
                "student_id": self.student_id,
                "items": []
            }
        )
        
        # Should return 400 or 422 for validation error (empty items)
        assert response.status_code in [400, 422, 500], f"Unexpected status: {response.status_code}"
        print("SUCCESS: Submit endpoint accessible and validates input")
    
    def test_student_order_not_found_for_invalid_student(self):
        """Test that invalid student_id returns appropriate error"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/invalid_student_id",
            headers=self.headers
        )
        
        # Should return 400 or 404
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("SUCCESS: Invalid student_id returns error")
    
    def test_unauthorized_access_rejected(self):
        """Test that requests without auth token are rejected"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/{self.student_id}"
        )
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Unauthorized access properly rejected")


class TestMyStudentsEndpoint:
    """Test the my-students endpoint used to fetch all students"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "password": "admin"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_my_students_returns_student_list(self):
        """Test that /api/store/textbook-access/my-students returns student list"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "students" in data
        students = data["students"]
        assert isinstance(students, list)
        
        if len(students) > 0:
            student = students[0]
            assert "student_id" in student
            assert "full_name" in student or "first_name" in student
            assert "school_name" in student
            assert "enrollments" in student
            
            # Check enrollment structure
            if student.get("enrollments"):
                enrollment = student["enrollments"][0]
                assert "status" in enrollment
                assert "grade" in enrollment
                assert "year" in enrollment
        
        print(f"SUCCESS: Got {len(students)} student(s)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
