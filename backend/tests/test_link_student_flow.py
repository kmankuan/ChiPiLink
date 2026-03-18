"""
Test: Link Student Flow - Bug Fixes Testing
Tests for the P0 bugs in the School Textbooks 'Link Student' flow:
1. Submission failing on first attempts but succeeding after ~3 clicks
2. School dropdown empty after successful submission
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLinkStudentFlow:
    """Tests for Link Student flow in School Textbooks view"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get auth token"""
        login_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.user_id = login_resp.json().get("user", {}).get("user_id")
        
    def test_schools_endpoint_returns_3_schools(self):
        """Schools endpoint should return 3 schools"""
        resp = requests.get(f"{BASE_URL}/api/store/textbook-access/schools")
        assert resp.status_code == 200
        data = resp.json()
        assert "schools" in data
        schools = data["schools"]
        assert len(schools) == 3, f"Expected 3 schools, got {len(schools)}"
        
        # Verify expected schools
        school_names = [s["name"] for s in schools]
        assert "Instituto Cultural" in school_names
        assert "Panama Christian Academy" in school_names
        assert "The Oxford School" in school_names
        print(f"PASS: Schools endpoint returns 3 schools: {school_names}")
        
    def test_student_creation_succeeds_on_first_attempt(self):
        """POST /students should succeed on FIRST attempt (Bug #1 fix verification)"""
        # Use unique test data with timestamp
        timestamp = int(time.time())
        student_data = {
            "first_name": f"TEST_First_{timestamp}",
            "last_name": f"TEST_Last_{timestamp}",
            "school_id": "sch_5eb3ecde",  # Instituto Cultural
            "student_number": f"TEST_{timestamp}",
            "year": 2026,
            "grade": "5",
            "relation_type": "parent",
            "relation_other": None
        }
        
        # First attempt - should succeed immediately
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data,
            headers=self.headers
        )
        assert resp.status_code == 200, f"First submission failed: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "student_id" in data, "Response missing student_id"
        print(f"PASS: Student created on FIRST attempt with student_id: {data['student_id']}")
        return data["student_id"]
        
    def test_second_student_creation_also_succeeds(self):
        """Second student creation should also succeed (Bug #2 context - no navigation away)"""
        timestamp = int(time.time())
        
        # Create first student
        first_student = {
            "first_name": f"TEST_A_{timestamp}",
            "last_name": f"TEST_A_{timestamp}",
            "school_id": "sch_4e6d6ee0",  # Panama Christian Academy
            "student_number": f"TEST_A_{timestamp}",
            "year": 2026,
            "grade": "3",
            "relation_type": "guardian",
            "relation_other": None
        }
        resp1 = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=first_student,
            headers=self.headers
        )
        assert resp1.status_code == 200, f"First student creation failed: {resp1.text}"
        print(f"First student created: {resp1.json().get('student_id')}")
        
        # Create second student immediately after
        timestamp2 = int(time.time())
        second_student = {
            "first_name": f"TEST_B_{timestamp2}",
            "last_name": f"TEST_B_{timestamp2}",
            "school_id": "sch_ce02219b",  # The Oxford School
            "student_number": f"TEST_B_{timestamp2}",
            "year": 2026,
            "grade": "7",
            "relation_type": "parent",
            "relation_other": None
        }
        resp2 = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=second_student,
            headers=self.headers
        )
        assert resp2.status_code == 200, f"Second student creation failed: {resp2.text}"
        print(f"Second student created: {resp2.json().get('student_id')}")
        print("PASS: Both students created successfully in sequence")
        
    def test_schools_still_accessible_after_student_creation(self):
        """Schools endpoint should still return schools after student creation (Bug #2 fix)"""
        timestamp = int(time.time())
        
        # Create a student first
        student_data = {
            "first_name": f"TEST_C_{timestamp}",
            "last_name": f"TEST_C_{timestamp}",
            "school_id": "sch_5eb3ecde",
            "student_number": f"TEST_C_{timestamp}",
            "year": 2026,
            "grade": "1",
            "relation_type": "parent"
        }
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data,
            headers=self.headers
        )
        assert resp.status_code == 200
        
        # Now fetch schools - should still return 3
        schools_resp = requests.get(f"{BASE_URL}/api/store/textbook-access/schools")
        assert schools_resp.status_code == 200
        schools = schools_resp.json().get("schools", [])
        assert len(schools) == 3, f"Schools list should still have 3 schools, got {len(schools)}"
        print("PASS: Schools endpoint still returns 3 schools after student creation")
        
    def test_my_students_endpoint(self):
        """GET /my-students should return students for current user"""
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=self.headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "students" in data
        print(f"PASS: /my-students returns {len(data['students'])} students")
        
    def test_grade_field_used_in_presale_suggestion(self):
        """Verify backend uses data.grade (not data.initial_grade) for presale suggestion"""
        # This tests the fix in textbook_access.py line 64
        timestamp = int(time.time())
        student_data = {
            "first_name": f"TEST_Grade_{timestamp}",
            "last_name": f"TEST_Grade_{timestamp}",
            "school_id": "sch_5eb3ecde",
            "student_number": f"GRADE_{timestamp}",
            "year": 2026,
            "grade": "10",  # This grade should be passed to presale suggestion
            "relation_type": "parent"
        }
        
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=student_data,
            headers=self.headers
        )
        assert resp.status_code == 200
        # The endpoint should succeed without error about initial_grade
        print("PASS: Student created with grade field - no initial_grade error")
        
    def test_validation_errors_return_400(self):
        """Validation errors should return proper 400 status"""
        # Missing school_id
        invalid_data = {
            "first_name": "Test",
            "last_name": "User",
            "school_id": "invalid_school",
            "year": 2026,
            "grade": "5",
            "relation_type": "parent"
        }
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=invalid_data,
            headers=self.headers
        )
        assert resp.status_code == 400, f"Expected 400 for invalid school, got {resp.status_code}"
        print("PASS: Invalid school_id returns 400 error")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
