"""
Test Data Cleanup Feature
Tests for admin cleanup endpoints: preview, execute, students list
Covers: orders, CRM links, CRM messages, notifications, students, Monday.com items
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(admin_token):
    """Authenticated requests session"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


class TestCleanupStudentsList:
    """Tests for GET /api/cleanup/students endpoint"""
    
    def test_get_students_returns_list(self, api_client):
        """GET /api/cleanup/students should return student list with order counts"""
        response = api_client.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "students" in data, "Response should have 'students' key"
        assert isinstance(data["students"], list), "Students should be a list"
    
    def test_students_have_required_fields(self, api_client):
        """Each student should have order counts, demo flag, CRM status"""
        response = api_client.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code == 200
        
        data = response.json()
        if len(data["students"]) > 0:
            student = data["students"][0]
            
            # Required fields
            assert "student_id" in student, "Student should have student_id"
            assert "order_count" in student, "Student should have order_count"
            assert "total_amount" in student, "Student should have total_amount"
            assert "is_demo" in student, "Student should have is_demo flag"
            assert "crm_linked" in student, "Student should have crm_linked status"
            assert "monday_item_count" in student, "Student should have monday_item_count"
            
            # Data types
            assert isinstance(student["order_count"], int), "order_count should be int"
            assert isinstance(student["is_demo"], bool), "is_demo should be bool"
            assert isinstance(student["crm_linked"], bool), "crm_linked should be bool"
            assert isinstance(student["monday_item_count"], int), "monday_item_count should be int"
            
            print(f"✓ Sample student: {student['student_id']} - orders: {student['order_count']}, demo: {student['is_demo']}, crm: {student['crm_linked']}")
    
    def test_students_endpoint_requires_auth(self):
        """GET /api/cleanup/students should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/cleanup/students")
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"


class TestCleanupPreview:
    """Tests for POST /api/cleanup/preview endpoint"""
    
    def test_preview_with_student_ids(self, api_client):
        """POST /api/cleanup/preview with student_ids returns affected counts"""
        # First get a student ID
        students_resp = api_client.get(f"{BASE_URL}/api/cleanup/students")
        if students_resp.status_code != 200 or not students_resp.json().get("students"):
            pytest.skip("No students available for testing")
        
        student_id = students_resp.json()["students"][0]["student_id"]
        
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [student_id]
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Response should have 'status'"
        assert data["status"] == "preview", "Status should be 'preview'"
        assert "data" in data, "Response should have 'data'"
        
        preview = data["data"]
        # Check expected collections are in preview
        assert "orders" in preview, "Preview should include orders"
        assert "crm_links" in preview, "Preview should include crm_links"
        assert "crm_messages" in preview, "Preview should include crm_messages"
        assert "crm_notifications" in preview, "Preview should include crm_notifications"
        assert "students" in preview, "Preview should include students"
        
        print(f"✓ Preview for {student_id}: orders={preview['orders']['count']}, students={preview['students']['count']}")
    
    def test_preview_includes_sample_orders(self, api_client):
        """Preview should include sample orders data"""
        students_resp = api_client.get(f"{BASE_URL}/api/cleanup/students")
        if students_resp.status_code != 200 or not students_resp.json().get("students"):
            pytest.skip("No students available for testing")
        
        # Get a student with orders
        students = students_resp.json()["students"]
        student_with_orders = next((s for s in students if s.get("order_count", 0) > 0), None)
        if not student_with_orders:
            pytest.skip("No student with orders found")
        
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [student_with_orders["student_id"]]
        })
        
        assert response.status_code == 200
        preview = response.json()["data"]
        
        # Check orders structure
        assert "count" in preview["orders"], "Orders should have count"
        assert "samples" in preview["orders"], "Orders should have samples"
        
        if preview["orders"]["count"] > 0:
            assert len(preview["orders"]["samples"]) > 0, "Samples should not be empty when count > 0"
            sample = preview["orders"]["samples"][0]
            assert "order_id" in sample, "Sample order should have order_id"
            print(f"✓ Sample order: {sample['order_id']} - status: {sample.get('status')}")
    
    def test_preview_requires_auth(self):
        """POST /api/cleanup/preview should require admin auth"""
        response = requests.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": ["test123"]
        })
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"


class TestCleanupExecute:
    """Tests for POST /api/cleanup/execute endpoint"""
    
    def test_execute_without_filters_returns_400(self, api_client):
        """POST /api/cleanup/execute without any filter should return 400"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/execute", json={})
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "filter" in data["detail"].lower(), "Error should mention filter requirement"
        print(f"✓ Correctly returned 400: {data['detail']}")
    
    def test_execute_with_empty_student_ids_returns_400(self, api_client):
        """POST /api/cleanup/execute with empty student_ids should return 400"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/execute", json={
            "student_ids": []
        })
        
        # Empty array should be treated as no filter
        assert response.status_code == 400, f"Expected 400 for empty student_ids, got {response.status_code}"
    
    def test_execute_requires_auth(self):
        """POST /api/cleanup/execute should require admin auth"""
        response = requests.post(f"{BASE_URL}/api/cleanup/execute", json={
            "student_ids": ["test123"]
        })
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
    
    def test_execute_returns_deleted_counts(self, api_client):
        """
        POST /api/cleanup/execute with test data returns deleted counts.
        NOTE: This test creates test data then cleans it - doesn't touch real data.
        """
        # Create a unique test student ID that we'll clean up
        test_student_id = f"TEST_cleanup_{int(time.time())}"
        
        # First create a test order for this student via the store API
        order_payload = {
            "student_id": test_student_id,
            "student_name": "Test Cleanup Student",
            "grade": "G5",
            "items": [{"isbn": "TEST-ISBN-001", "quantity": 1, "unit_price": 10.0}],
            "total_amount": 10.0,
            "is_demo": True,
            "is_presale": False,
            "comments": "Test order for cleanup testing"
        }
        
        create_resp = api_client.post(f"{BASE_URL}/api/store/textbook-orders/submit", json=order_payload)
        
        if create_resp.status_code not in [200, 201]:
            # If we can't create test data, skip execution test
            print(f"Note: Could not create test data ({create_resp.status_code}), skipping execute test")
            pytest.skip("Unable to create test order for cleanup testing")
            return
        
        created_order = create_resp.json()
        print(f"✓ Created test order: {created_order.get('order', {}).get('order_id', 'unknown')}")
        
        # Now preview what would be deleted
        preview_resp = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [test_student_id]
        })
        assert preview_resp.status_code == 200
        preview_data = preview_resp.json()["data"]
        print(f"✓ Preview shows {preview_data['orders']['count']} orders to delete")
        
        # Execute the cleanup (with delete_monday_items=False to avoid live Monday API calls)
        execute_resp = api_client.post(f"{BASE_URL}/api/cleanup/execute", json={
            "student_ids": [test_student_id],
            "delete_monday_items": False  # Don't touch Monday.com in tests
        })
        
        assert execute_resp.status_code == 200, f"Execute failed: {execute_resp.text}"
        
        result = execute_resp.json()
        assert "status" in result, "Should have status field"
        assert result["status"] == "executed", "Status should be 'executed'"
        assert "results" in result, "Should have results field"
        
        results = result["results"]
        assert "orders" in results, "Results should include orders"
        assert "deleted" in results["orders"], "Orders should have deleted count"
        
        print(f"✓ Execute results: orders deleted={results['orders'].get('deleted', 0)}")
        
        # Verify the data is actually gone
        verify_preview = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [test_student_id]
        })
        verify_data = verify_preview.json()["data"]
        assert verify_data["orders"]["count"] == 0, f"Orders should be 0 after cleanup, got {verify_data['orders']['count']}"
        print("✓ Verified: test data successfully cleaned up")


class TestCleanupPreviewDemoOnly:
    """Tests for demo_only flag in cleanup"""
    
    def test_preview_with_demo_only_flag(self, api_client):
        """POST /api/cleanup/preview with demo_only=true should target demo data"""
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "demo_only": True
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "preview"
        
        preview = data["data"]
        print(f"✓ Demo-only preview: orders={preview['orders']['count']}, students={preview.get('students', {}).get('count', 0)}")


class TestCleanupEndpointStructure:
    """Structural tests for cleanup API responses"""
    
    def test_preview_response_structure(self, api_client):
        """Preview response should have consistent structure"""
        students_resp = api_client.get(f"{BASE_URL}/api/cleanup/students")
        if students_resp.status_code != 200 or not students_resp.json().get("students"):
            pytest.skip("No students available")
        
        student_id = students_resp.json()["students"][0]["student_id"]
        
        response = api_client.post(f"{BASE_URL}/api/cleanup/preview", json={
            "student_ids": [student_id]
        })
        
        data = response.json()
        
        # Top level structure
        assert "status" in data
        assert "data" in data
        
        preview = data["data"]
        
        # Each collection should have count
        for collection in ["orders", "crm_links", "crm_messages", "crm_notifications", "students", "order_messages"]:
            if collection in preview:
                assert "count" in preview[collection], f"{collection} should have count"
        
        print("✓ Response structure validated")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
