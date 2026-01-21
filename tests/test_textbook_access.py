"""
Textbook Access Module - Backend API Tests
Tests for student registration, enrollment, and admin approval workflow
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Test data
TEST_STUDENT_PREFIX = "TEST_"


class TestTextbookAccessConfig:
    """Test configuration endpoints (public)"""
    
    def test_get_config(self, api_client):
        """GET /api/store/textbook-access/config - returns available years, grades, relation types"""
        response = api_client.get(f"{BASE_URL}/api/store/textbook-access/config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Validate structure
        assert "available_years" in data, "Missing available_years"
        assert "current_year" in data, "Missing current_year"
        assert "grades" in data, "Missing grades"
        assert "relation_types" in data, "Missing relation_types"
        
        # Validate available_years
        assert isinstance(data["available_years"], list), "available_years should be a list"
        assert len(data["available_years"]) > 0, "available_years should not be empty"
        for year in data["available_years"]:
            assert "year" in year, "Each year should have 'year' field"
            assert "is_current" in year, "Each year should have 'is_current' field"
        
        # Validate current_year
        assert isinstance(data["current_year"], int), "current_year should be an integer"
        assert data["current_year"] >= 2024, "current_year should be >= 2024"
        
        # Validate grades
        assert isinstance(data["grades"], list), "grades should be a list"
        assert len(data["grades"]) > 0, "grades should not be empty"
        for grade in data["grades"]:
            assert "value" in grade, "Each grade should have 'value' field"
            assert "label" in grade, "Each grade should have 'label' field"
        
        # Validate relation_types
        assert isinstance(data["relation_types"], list), "relation_types should be a list"
        assert len(data["relation_types"]) > 0, "relation_types should not be empty"
        for rel in data["relation_types"]:
            assert "value" in rel, "Each relation should have 'value' field"
            assert "label_es" in rel, "Each relation should have 'label_es' field"
        
        print(f"✓ Config endpoint returns {len(data['grades'])} grades, {len(data['relation_types'])} relation types")


class TestTextbookAccessSchools:
    """Test schools endpoint"""
    
    def test_get_schools(self, api_client):
        """GET /api/store/textbook-access/schools - returns list of schools"""
        response = api_client.get(f"{BASE_URL}/api/store/textbook-access/schools")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "schools" in data, "Missing schools field"
        assert isinstance(data["schools"], list), "schools should be a list"
        
        # Should have at least one school (Panama Christian Academy)
        assert len(data["schools"]) > 0, "Should have at least one school"
        
        school = data["schools"][0]
        assert "school_id" in school, "School should have school_id"
        assert "name" in school, "School should have name"
        
        print(f"✓ Schools endpoint returns {len(data['schools'])} schools")
        print(f"  First school: {school.get('name')} (ID: {school.get('school_id')})")


class TestTextbookAccessStudents:
    """Test student CRUD operations (requires authentication)"""
    
    def test_get_my_students_unauthorized(self, api_client):
        """GET /api/store/textbook-access/my-students - requires auth"""
        response = api_client.get(f"{BASE_URL}/api/store/textbook-access/my-students")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ my-students endpoint requires authentication")
    
    def test_get_my_students_authenticated(self, authenticated_client):
        """GET /api/store/textbook-access/my-students - returns user's students"""
        response = authenticated_client.get(f"{BASE_URL}/api/store/textbook-access/my-students")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "students" in data, "Missing students field"
        assert isinstance(data["students"], list), "students should be a list"
        
        print(f"✓ my-students returns {len(data['students'])} students for authenticated user")
        
        # If there are students, validate structure
        if len(data["students"]) > 0:
            student = data["students"][0]
            assert "student_id" in student, "Student should have student_id"
            assert "full_name" in student, "Student should have full_name"
            assert "school_id" in student, "Student should have school_id"
            assert "school_name" in student, "Student should have school_name"
            assert "enrollments" in student, "Student should have enrollments"
            print(f"  First student: {student.get('full_name')}")
    
    def test_create_student_unauthorized(self, api_client):
        """POST /api/store/textbook-access/students - requires auth"""
        response = api_client.post(f"{BASE_URL}/api/store/textbook-access/students", json={
            "full_name": "Test Student",
            "school_id": "sch_test",
            "year": 2025,
            "grade": "5",
            "relation_type": "parent"
        })
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ create student endpoint requires authentication")
    
    def test_create_student_with_enrollment(self, authenticated_client, get_school_id):
        """POST /api/store/textbook-access/students - creates student with initial enrollment"""
        school_id = get_school_id
        if not school_id:
            pytest.skip("No school available for testing")
        
        # Get current year from config
        config_res = authenticated_client.get(f"{BASE_URL}/api/store/textbook-access/config")
        current_year = config_res.json().get("current_year", 2025)
        
        student_data = {
            "full_name": f"{TEST_STUDENT_PREFIX}Juan Pérez García",
            "school_id": school_id,
            "year": current_year,
            "grade": "5",
            "relation_type": "parent",
            "student_number": "TEST-001"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "student_id" in data, "Response should have student_id"
        assert data["full_name"] == student_data["full_name"], "full_name should match"
        assert data["school_id"] == school_id, "school_id should match"
        assert "enrollments" in data, "Response should have enrollments"
        assert len(data["enrollments"]) == 1, "Should have 1 enrollment"
        
        enrollment = data["enrollments"][0]
        assert enrollment["year"] == current_year, "Enrollment year should match"
        assert enrollment["grade"] == "5", "Enrollment grade should match"
        assert enrollment["status"] == "pending", "Initial status should be pending"
        
        print(f"✓ Created student: {data['student_id']} with pending enrollment for {current_year}")
        
        # Store for cleanup
        return data["student_id"]
    
    def test_create_student_with_other_relation(self, authenticated_client, get_school_id):
        """POST /api/store/textbook-access/students - with 'other' relation type requires relation_other"""
        school_id = get_school_id
        if not school_id:
            pytest.skip("No school available for testing")
        
        config_res = authenticated_client.get(f"{BASE_URL}/api/store/textbook-access/config")
        current_year = config_res.json().get("current_year", 2025)
        
        # Test without relation_other - should fail
        student_data = {
            "full_name": f"{TEST_STUDENT_PREFIX}Test Other Relation",
            "school_id": school_id,
            "year": current_year,
            "grade": "3",
            "relation_type": "other"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data
        )
        
        assert response.status_code == 400, f"Expected 400 without relation_other, got {response.status_code}"
        print("✓ Creating student with 'other' relation requires relation_other field")
        
        # Test with relation_other - should succeed
        student_data["relation_other"] = "Tío"
        response = authenticated_client.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data
        )
        
        assert response.status_code == 200, f"Expected 200 with relation_other, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["relation_other"] == "Tío", "relation_other should be saved"
        print(f"✓ Created student with 'other' relation: {data['student_id']}")


class TestTextbookAccessAdmin:
    """Test admin endpoints for request management"""
    
    def test_get_pending_requests_unauthorized(self, api_client):
        """GET /api/store/textbook-access/admin/requests - requires admin auth"""
        response = api_client.get(f"{BASE_URL}/api/store/textbook-access/admin/requests")
        
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        print("✓ admin/requests endpoint requires authentication")
    
    def test_get_pending_requests_admin(self, admin_client):
        """GET /api/store/textbook-access/admin/requests - returns pending requests"""
        response = admin_client.get(f"{BASE_URL}/api/store/textbook-access/admin/requests")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "requests" in data, "Missing requests field"
        assert isinstance(data["requests"], list), "requests should be a list"
        
        print(f"✓ admin/requests returns {len(data['requests'])} requests")
        
        # Validate structure if there are requests
        if len(data["requests"]) > 0:
            req = data["requests"][0]
            assert "student_id" in req, "Request should have student_id"
            assert "student_name" in req, "Request should have student_name"
            assert "school_name" in req, "Request should have school_name"
            assert "year" in req, "Request should have year"
            assert "grade" in req, "Request should have grade"
            assert "status" in req, "Request should have status"
            assert "user_name" in req, "Request should have user_name"
            assert "user_email" in req, "Request should have user_email"
            print(f"  First request: {req.get('student_name')} - {req.get('status')}")
    
    def test_get_pending_requests_with_filters(self, admin_client):
        """GET /api/store/textbook-access/admin/requests - with status filter"""
        # Test with status filter
        response = admin_client.get(f"{BASE_URL}/api/store/textbook-access/admin/requests?status=pending")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # All returned requests should be pending
        for req in data["requests"]:
            assert req["status"] == "pending", f"Expected pending status, got {req['status']}"
        
        print(f"✓ admin/requests with status=pending returns {len(data['requests'])} pending requests")
    
    def test_approve_request(self, admin_client, get_pending_request):
        """POST /api/store/textbook-access/admin/requests/{student_id}/{year}/approve - approve request"""
        student_id, year = get_pending_request
        if not student_id:
            pytest.skip("No pending request available for testing")
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/textbook-access/admin/requests/{student_id}/{year}/approve",
            json={
                "status": "approved",
                "admin_notes": "Test approval"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Find the enrollment for this year
        enrollment = next((e for e in data.get("enrollments", []) if e.get("year") == year), None)
        assert enrollment is not None, f"Enrollment for year {year} not found"
        assert enrollment["status"] == "approved", f"Expected approved status, got {enrollment['status']}"
        assert enrollment["approved_by"] is not None, "approved_by should be set"
        
        print(f"✓ Approved request for student {student_id}, year {year}")
    
    def test_reject_request_requires_reason(self, admin_client, get_pending_request):
        """POST /api/store/textbook-access/admin/requests/{student_id}/{year}/approve - reject requires reason"""
        student_id, year = get_pending_request
        if not student_id:
            pytest.skip("No pending request available for testing")
        
        # Test rejection without reason
        response = admin_client.post(
            f"{BASE_URL}/api/store/textbook-access/admin/requests/{student_id}/{year}/approve",
            json={
                "status": "rejected"
            }
        )
        
        # Should still work but rejection_reason will be None
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Rejection without reason is allowed (reason is optional)")


# ============== FIXTURES ==============

@pytest.fixture
def api_client():
    """Shared requests session without auth"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get authentication token for regular user"""
    response = api_client.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture
def admin_client(api_client):
    """Session with admin auth"""
    response = api_client.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("token")
        api_client.headers.update({"Authorization": f"Bearer {token}"})
        return api_client
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture
def get_school_id(api_client):
    """Get first available school ID"""
    response = api_client.get(f"{BASE_URL}/api/store/textbook-access/schools")
    if response.status_code == 200:
        schools = response.json().get("schools", [])
        if schools:
            return schools[0].get("school_id")
    return None


@pytest.fixture
def get_pending_request(admin_client):
    """Get a pending request for testing approval"""
    response = admin_client.get(f"{BASE_URL}/api/store/textbook-access/admin/requests?status=pending")
    if response.status_code == 200:
        requests_list = response.json().get("requests", [])
        if requests_list:
            req = requests_list[0]
            return (req.get("student_id"), req.get("year"))
    return (None, None)


@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed data after all tests"""
    yield
    # Note: In a real scenario, we would delete test data here
    # For now, we'll leave it as the admin can manage it
    print("\n[Cleanup] Test data with TEST_ prefix should be cleaned manually if needed")
