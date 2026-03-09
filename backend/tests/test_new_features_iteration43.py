"""
Test New Features - Iteration 43
1. Re-order request flow on locked textbook items
2. Admin School Year configuration tab
3. Admin Student profile lock/unlock management
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def client_token():
    """Get client user token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "test@client.com", "password": "password"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.fail(f"Client login failed: {response.status_code}")

@pytest.fixture(scope="module")
def admin_token():
    """Get admin user token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "teck@koh.one", "password": "Acdb##0897"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.fail(f"Admin login failed: {response.status_code}")

class TestAuthLogin:
    """Test authentication endpoints"""
    
    def test_client_login(self):
        """Test client user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "test@client.com", "password": "password"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "test@client.com"
        assert data["user"]["is_admin"] == False
    
    def test_admin_login(self):
        """Test admin user login"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "password": "Acdb##0897"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["email"] == "teck@koh.one"
        assert data["user"]["is_admin"] == True


class TestSchoolYearConfig:
    """Test Admin School Year configuration endpoints"""
    
    def test_get_school_year_config(self, admin_token):
        """GET /api/store/school-year/config returns config"""
        response = requests.get(
            f"{BASE_URL}/api/store/school-year/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Required fields in config
        assert "calendar_type" in data
        assert "current_school_year" in data
        assert "enrollment_start_month" in data
        assert "enrollment_start_day" in data
        assert "auto_add_enabled" in data
        
        # Validate types
        assert data["calendar_type"] in ["official", "particular"]
        assert isinstance(data["current_school_year"], int)
        assert isinstance(data["enrollment_start_month"], int)
        assert isinstance(data["auto_add_enabled"], bool)
    
    def test_get_school_year_status(self, admin_token):
        """GET /api/store/school-year/status returns status with next_school_year"""
        response = requests.get(
            f"{BASE_URL}/api/store/school-year/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "config" in data
        assert "next_school_year" in data
        assert "should_add_new_enrollment" in data
        
        # next_school_year should be current_school_year + 1
        config = data["config"]
        assert data["next_school_year"] == config["current_school_year"] + 1
        assert isinstance(data["should_add_new_enrollment"], bool)
    
    def test_school_year_config_requires_admin(self, client_token):
        """Verify config endpoint requires admin privileges"""
        response = requests.get(
            f"{BASE_URL}/api/store/school-year/config",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        # Should be forbidden or unauthorized for non-admin
        assert response.status_code in [401, 403]


class TestStudentManagement:
    """Test Admin Student profile lock/unlock management"""
    
    def test_get_all_students(self, admin_token):
        """GET /api/store/textbook-access/admin/all-students returns list"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should have students list
        assert "students" in data
        students = data["students"]
        assert len(students) > 0
        
        # Each student should have required fields
        first_student = students[0]
        assert "full_name" in first_student
        # is_locked field may or may not exist, check it can be read
        # The field should be accessible on students
    
    def test_students_have_expected_fields(self, admin_token):
        """Verify student records have fields for lock/unlock"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        students = response.json().get("students", [])
        
        # Find Test Student Alpha
        test_student = next((s for s in students if "Alpha" in s.get("full_name", "")), None)
        assert test_student is not None, "Test Student Alpha not found"
        
        # Should have student_id for lock/unlock operations
        assert "student_id" in test_student or "sync_id" in test_student
    
    def test_student_lock_endpoint(self, admin_token):
        """Test POST /api/store/school-year/students/{id}/lock"""
        # Get a student ID first
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        students = response.json().get("students", [])
        test_student = next((s for s in students if "Alpha" in s.get("full_name", "")), None)
        student_id = test_student.get("student_id") or test_student.get("sync_id")
        
        # Test lock endpoint
        lock_response = requests.post(
            f"{BASE_URL}/api/store/school-year/students/{student_id}/lock",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert lock_response.status_code == 200
        lock_data = lock_response.json()
        assert lock_data.get("success") == True
    
    def test_student_unlock_endpoint(self, admin_token):
        """Test POST /api/store/school-year/students/{id}/unlock"""
        # Get a student ID first
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        students = response.json().get("students", [])
        test_student = next((s for s in students if "Alpha" in s.get("full_name", "")), None)
        student_id = test_student.get("student_id") or test_student.get("sync_id")
        
        # Test unlock endpoint
        unlock_response = requests.post(
            f"{BASE_URL}/api/store/school-year/students/{student_id}/unlock",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"reason": "Testing unlock"}
        )
        assert unlock_response.status_code == 200
        unlock_data = unlock_response.json()
        assert unlock_data.get("success") == True


class TestReorderFlow:
    """Test Re-order request flow on locked textbook items"""
    
    def test_get_pending_reorders(self, admin_token):
        """GET /api/store/textbook-orders/admin/pending-reorders returns reorders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/pending-reorders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "reorders" in data
        reorders = data["reorders"]
        
        # Should have at least one reorder (Student Alpha's item)
        assert len(reorders) > 0
        
        # Check reorder structure
        reorder = reorders[0]
        assert "student_id" in reorder
        assert "student_name" in reorder
        assert "item" in reorder
        assert reorder["item"]["status"] == "reorder_requested"
    
    def test_student_alpha_has_reorder_requested_item(self, client_token):
        """Verify Student Alpha has item with reorder_requested status"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/student/std_test_001",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert response.status_code == 200
        order = response.json()
        
        # Find the reorder_requested item
        items = order.get("items", [])
        reorder_item = next((i for i in items if i.get("status") == "reorder_requested"), None)
        
        assert reorder_item is not None, "No item with reorder_requested status found"
        assert reorder_item.get("book_name") == "English Grammar Workbook 3rd Grade"
    
    def test_reorder_item_has_reason(self, admin_token):
        """Verify reorder request includes the reason"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/pending-reorders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        reorders = response.json().get("reorders", [])
        
        # Find Student Alpha's reorder
        alpha_reorder = next((r for r in reorders if r.get("student_id") == "std_test_001"), None)
        assert alpha_reorder is not None
        
        # Check that reorder_reason is present
        assert "reorder_reason" in alpha_reorder.get("item", {})


class TestAllStudentsEndpoint:
    """Test all-students endpoint details"""
    
    def test_all_students_count(self, admin_token):
        """Verify expected number of students"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        students = response.json().get("students", [])
        
        # According to main agent context: "20 students"
        assert len(students) == 20
    
    def test_students_have_enrollments(self, admin_token):
        """Verify students have enrollment data"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        students = response.json().get("students", [])
        
        # Check first few students have enrollments
        students_with_enrollments = [s for s in students if s.get("enrollments")]
        assert len(students_with_enrollments) > 0, "No students have enrollments"
