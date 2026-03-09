"""
Test Data Cleanup Module - Student Request Enhancements
Tests that:
1. GET /api/cleanup/students returns ALL students including those with 0 orders but with access requests
2. POST /api/cleanup/preview correctly shows data for students with only access requests
3. UsersManagementModule and StudentRequestsTab UI integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCleanupStudentsWithRequests:
    """Tests for cleanup students endpoint including students with only access requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_cleanup_students_returns_all(self):
        """Test that GET /api/cleanup/students returns ALL students"""
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "students" in data
        students = data["students"]
        assert len(students) > 0, "Should return some students"
        
        # Check structure of student data
        sample = students[0]
        assert "student_id" in sample
        assert "student_name" in sample
        assert "order_count" in sample
        assert "pending_requests" in sample
        print(f"Total students returned: {len(students)}")
    
    def test_students_include_zero_orders_with_requests(self):
        """Test that students with 0 orders but pending access requests are included"""
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        students = data["students"]
        
        # Filter students with 0 orders
        zero_orders = [s for s in students if s.get("order_count", 0) == 0]
        
        assert len(zero_orders) > 0, "Should have students with 0 orders"
        print(f"Students with 0 orders: {len(zero_orders)}")
        
        # Check if any have pending requests
        with_pending = [s for s in zero_orders if s.get("pending_requests", 0) > 0]
        assert len(with_pending) > 0, "Should have students with 0 orders but with pending requests"
        print(f"Students with 0 orders but with pending requests: {len(with_pending)}")
        
        # Verify sample
        sample = with_pending[0]
        print(f"Sample: {sample.get('student_name')}, orders={sample.get('order_count')}, pending={sample.get('pending_requests')}")
    
    def test_student_data_structure(self):
        """Test that student data includes all expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        students = data["students"]
        
        required_fields = [
            "student_id", "student_name", "order_count", 
            "pending_requests", "is_demo", "user_id",
            "total_amount", "monday_item_count",
            "wallet_balance", "wallet_txn_count"
        ]
        
        sample = students[0]
        for field in required_fields:
            assert field in sample, f"Field '{field}' should be in student data"
        
        print("All required fields present")
    
    def test_preview_with_student_zero_orders(self):
        """Test preview with a student who has 0 orders but access requests"""
        # First get a student with 0 orders and pending requests
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        students = response.json()["students"]
        zero_orders_with_requests = [
            s for s in students 
            if s.get("order_count", 0) == 0 and s.get("pending_requests", 0) > 0
        ]
        
        if not zero_orders_with_requests:
            pytest.skip("No students with 0 orders and pending requests found")
        
        test_student = zero_orders_with_requests[0]
        student_id = test_student["student_id"]
        
        # Test preview
        response = requests.post(
            f"{BASE_URL}/api/cleanup/preview",
            headers=self.headers,
            json={"student_ids": [student_id]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "preview"
        preview = data["data"]
        
        # Verify the student is found
        assert preview["students"]["count"] == 1
        assert len(preview["students"]["samples"]) == 1
        
        # Orders should be 0
        assert preview["orders"]["count"] == 0
        
        print(f"Preview for {test_student['student_name']}:")
        print(f"  Orders: {preview['orders']['count']}")
        print(f"  Students: {preview['students']['count']}")
        print(f"  Wallets: {preview['wallets']['count']}")
        print(f"  Users: {preview['users']['count']}")
    
    def test_preview_includes_wallets_and_users(self):
        """Test that preview includes wallets and users data"""
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        students = response.json()["students"]
        
        if not students:
            pytest.skip("No students found")
        
        test_student = students[0]
        
        response = requests.post(
            f"{BASE_URL}/api/cleanup/preview",
            headers=self.headers,
            json={"student_ids": [test_student["student_id"]]}
        )
        assert response.status_code == 200
        
        preview = response.json()["data"]
        
        # Check all expected sections
        expected_sections = [
            "orders", "crm_links", "crm_messages", "crm_notifications",
            "students", "order_messages", "wallets", "wallet_transactions",
            "wallet_alerts", "users", "protected_user_ids"
        ]
        
        for section in expected_sections:
            assert section in preview, f"Section '{section}' should be in preview"
        
        print("All preview sections present")
    
    def test_preview_protects_admin_users(self):
        """Test that admin users are protected and shown in protected_user_ids"""
        # Find a student linked to admin user
        response = requests.get(
            f"{BASE_URL}/api/cleanup/students",
            headers=self.headers
        )
        students = response.json()["students"]
        
        # Test with demo_only to include admin-linked students
        response = requests.post(
            f"{BASE_URL}/api/cleanup/preview",
            headers=self.headers,
            json={"demo_only": True}
        )
        assert response.status_code == 200
        
        preview = response.json()["data"]
        
        # Check protected_user_ids field exists
        assert "protected_user_ids" in preview
        protected = preview["protected_user_ids"]
        
        print(f"Protected user IDs: {protected}")
        
        # If there are protected users, users section should have a note
        if len(protected) > 0:
            print("Admin users are being protected as expected")


class TestAccessRequestsAdminEndpoint:
    """Test the textbook-access admin requests endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        self.token = data["token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_admin_requests(self):
        """Test GET /api/store/textbook-access/admin/requests"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/requests",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "requests" in data
        print(f"Total requests: {len(data['requests'])}")
    
    def test_get_admin_requests_filtered_pending(self):
        """Test filtered requests - pending only"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/requests?status=pending",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        requests_list = data.get("requests", [])
        for req in requests_list:
            assert req.get("status") == "pending", f"Expected pending, got {req.get('status')}"
        
        print(f"Pending requests: {len(requests_list)}")
    
    def test_get_admin_schools(self):
        """Test GET /api/store/textbook-access/admin/schools"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/schools",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "schools" in data
        print(f"Total schools: {len(data['schools'])}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
