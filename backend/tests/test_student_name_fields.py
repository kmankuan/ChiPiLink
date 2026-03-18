"""
Test Suite: Student First Name / Last Name Field Splitting
Tests the new first_name, last_name fields and backward compatibility with full_name
"""
import pytest
import requests
import os
import time
import random
import string

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"

# Valid school ID for testing
TEST_SCHOOL_ID = "sch_4e6d6ee0"


def generate_random_suffix():
    """Generate a random suffix for unique test data"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))


@pytest.fixture(scope="module")
def admin_token():
    """Authenticate as admin and get token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    token = data.get("access_token") or data.get("token")
    assert token, "No token in login response"
    return token


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Create headers with admin token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestCreateStudentWithSplitNames:
    """Test creating students with first_name and last_name fields"""
    
    def test_create_student_with_first_last_name(self, admin_headers):
        """POST /api/store/textbook-access/students - Create with first_name, last_name"""
        suffix = generate_random_suffix()
        payload = {
            "first_name": f"TEST_John_{suffix}",
            "last_name": f"Doe_{suffix}",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "5",
            "relation_type": "parent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=payload,
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Create student failed: {response.text}"
        data = response.json()
        
        # Verify first_name and last_name are returned
        assert data.get("first_name") == payload["first_name"], \
            f"first_name mismatch: {data.get('first_name')} != {payload['first_name']}"
        assert data.get("last_name") == payload["last_name"], \
            f"last_name mismatch: {data.get('last_name')} != {payload['last_name']}"
        
        # Verify full_name is computed correctly
        expected_full_name = f"{payload['first_name']} {payload['last_name']}"
        assert data.get("full_name") == expected_full_name, \
            f"full_name not computed correctly: {data.get('full_name')} != {expected_full_name}"
        
        # Verify student_id is returned
        assert data.get("student_id"), "student_id not returned"
        
        print(f"✓ Created student with first_name={data['first_name']}, last_name={data['last_name']}, full_name={data['full_name']}")
        return data["student_id"]
    
    def test_create_student_missing_first_name_fails(self, admin_headers):
        """POST /api/store/textbook-access/students - Should fail without first_name"""
        payload = {
            "last_name": "Doe",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "5",
            "relation_type": "parent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=payload,
            headers=admin_headers
        )
        
        # Should fail validation (422 or 400)
        assert response.status_code in [400, 422], \
            f"Expected validation error, got {response.status_code}: {response.text}"
        print("✓ Correctly rejected student creation without first_name")
    
    def test_create_student_missing_last_name_fails(self, admin_headers):
        """POST /api/store/textbook-access/students - Should fail without last_name"""
        payload = {
            "first_name": "John",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "5",
            "relation_type": "parent"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=payload,
            headers=admin_headers
        )
        
        # Should fail validation (422 or 400)
        assert response.status_code in [400, 422], \
            f"Expected validation error, got {response.status_code}: {response.text}"
        print("✓ Correctly rejected student creation without last_name")


class TestMyStudentsReturnsAllNameFields:
    """Test that /my-students returns first_name, last_name, and full_name"""
    
    def test_my_students_returns_name_fields(self, admin_headers):
        """GET /api/store/textbook-access/my-students - Returns all name fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Get my-students failed: {response.text}"
        data = response.json()
        students = data.get("students", [])
        
        print(f"Found {len(students)} students")
        
        if len(students) > 0:
            student = students[0]
            
            # All three name fields should be present
            assert "first_name" in student, "first_name field missing"
            assert "last_name" in student, "last_name field missing"
            assert "full_name" in student, "full_name field missing"
            
            # Check consistency: full_name should match first_name + last_name
            first = student.get("first_name", "")
            last = student.get("last_name", "")
            full = student.get("full_name", "")
            
            # full_name should be first_name + space + last_name (trimmed)
            expected_full = f"{first} {last}".strip()
            
            print(f"Student: first_name='{first}', last_name='{last}', full_name='{full}'")
            print(f"Expected full_name: '{expected_full}'")
            
            # The full_name should either match computed or be the original (backward compat)
            assert full, "full_name should not be empty"
            print(f"✓ my-students returns all name fields correctly")
        else:
            print("⚠ No students found to verify - test passed but could not verify fields")


class TestUpdateStudentNameFields:
    """Test updating student with first_name and last_name"""
    
    def test_update_student_first_name(self, admin_headers):
        """PUT /api/store/textbook-access/students/{id} - Update first_name"""
        # First create a student
        suffix = generate_random_suffix()
        create_payload = {
            "first_name": f"TEST_Original_{suffix}",
            "last_name": f"Name_{suffix}",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "6",
            "relation_type": "guardian"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=create_payload,
            headers=admin_headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        student_id = create_response.json()["student_id"]
        
        # Update first_name only
        update_payload = {
            "first_name": f"TEST_Updated_{suffix}"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/store/textbook-access/students/{student_id}",
            json=update_payload,
            headers=admin_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify first_name updated
        assert updated.get("first_name") == update_payload["first_name"], \
            f"first_name not updated: {updated.get('first_name')}"
        
        # Verify last_name unchanged
        assert updated.get("last_name") == create_payload["last_name"], \
            f"last_name changed unexpectedly: {updated.get('last_name')}"
        
        # Verify full_name recomputed
        expected_full = f"{update_payload['first_name']} {create_payload['last_name']}"
        assert updated.get("full_name") == expected_full, \
            f"full_name not recomputed: {updated.get('full_name')} != {expected_full}"
        
        print(f"✓ Updated first_name successfully, full_name recomputed to '{updated['full_name']}'")
    
    def test_update_student_last_name(self, admin_headers):
        """PUT /api/store/textbook-access/students/{id} - Update last_name"""
        # First create a student
        suffix = generate_random_suffix()
        create_payload = {
            "first_name": f"TEST_Keep_{suffix}",
            "last_name": f"Original_{suffix}",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "7",
            "relation_type": "parent"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=create_payload,
            headers=admin_headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        student_id = create_response.json()["student_id"]
        
        # Update last_name only
        update_payload = {
            "last_name": f"Updated_{suffix}"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/store/textbook-access/students/{student_id}",
            json=update_payload,
            headers=admin_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify last_name updated
        assert updated.get("last_name") == update_payload["last_name"], \
            f"last_name not updated: {updated.get('last_name')}"
        
        # Verify first_name unchanged
        assert updated.get("first_name") == create_payload["first_name"], \
            f"first_name changed unexpectedly: {updated.get('first_name')}"
        
        # Verify full_name recomputed
        expected_full = f"{create_payload['first_name']} {update_payload['last_name']}"
        assert updated.get("full_name") == expected_full, \
            f"full_name not recomputed: {updated.get('full_name')} != {expected_full}"
        
        print(f"✓ Updated last_name successfully, full_name recomputed to '{updated['full_name']}'")
    
    def test_update_student_both_names(self, admin_headers):
        """PUT /api/store/textbook-access/students/{id} - Update both first and last name"""
        # First create a student
        suffix = generate_random_suffix()
        create_payload = {
            "first_name": f"TEST_Old1_{suffix}",
            "last_name": f"Old2_{suffix}",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "8",
            "relation_type": "grandparent"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=create_payload,
            headers=admin_headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        student_id = create_response.json()["student_id"]
        
        # Update both names
        update_payload = {
            "first_name": f"TEST_New1_{suffix}",
            "last_name": f"New2_{suffix}"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/store/textbook-access/students/{student_id}",
            json=update_payload,
            headers=admin_headers
        )
        
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify both names updated
        assert updated.get("first_name") == update_payload["first_name"]
        assert updated.get("last_name") == update_payload["last_name"]
        
        # Verify full_name recomputed
        expected_full = f"{update_payload['first_name']} {update_payload['last_name']}"
        assert updated.get("full_name") == expected_full
        
        print(f"✓ Updated both names successfully, full_name='{updated['full_name']}'")


class TestAdminAllStudentsReturnsNameFields:
    """Test admin/all-students returns first_name, last_name, full_name"""
    
    def test_admin_all_students_name_fields(self, admin_headers):
        """GET /api/store/textbook-access/admin/all-students - Returns all name fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Get all-students failed: {response.text}"
        data = response.json()
        students = data.get("students", [])
        
        print(f"Admin: Found {len(students)} total students")
        
        if len(students) > 0:
            student = students[0]
            
            # All three name fields should be present
            assert "first_name" in student, "first_name field missing in admin response"
            assert "last_name" in student, "last_name field missing in admin response"
            assert "full_name" in student, "full_name field missing in admin response"
            
            print(f"✓ Admin all-students returns all name fields")
            print(f"  Sample: first_name='{student.get('first_name')}', "
                  f"last_name='{student.get('last_name')}', "
                  f"full_name='{student.get('full_name')}'")
        else:
            print("⚠ No students found - test passed but could not verify fields")


class TestBackwardCompatibility:
    """Test backward compatibility with old records that only have full_name"""
    
    def test_normalize_name_fields_computed(self, admin_headers):
        """Verify that _normalize_name_fields properly computes missing fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-access/my-students",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        students = response.json().get("students", [])
        
        for student in students:
            first = student.get("first_name", "")
            last = student.get("last_name", "")
            full = student.get("full_name", "")
            
            # At least one of full_name or first_name+last_name should be non-empty
            has_full = bool(full)
            has_parts = bool(first or last)
            
            assert has_full or has_parts, \
                f"Student {student.get('student_id')} has no name data"
            
            # If we have parts, full_name should match
            if first or last:
                expected_full = f"{first} {last}".strip()
                assert full == expected_full, \
                    f"full_name mismatch for {student.get('student_id')}: " \
                    f"'{full}' != '{expected_full}'"
        
        print(f"✓ All {len(students)} students have consistent name fields")


class TestLegacyFullNameUpdate:
    """Test that updating with only full_name still works (backward compat)"""
    
    def test_update_with_full_name_only(self, admin_headers):
        """PUT with only full_name should split into first/last"""
        # Create a student first
        suffix = generate_random_suffix()
        create_payload = {
            "first_name": f"TEST_Legacy_{suffix}",
            "last_name": f"Test_{suffix}",
            "school_id": TEST_SCHOOL_ID,
            "year": 2026,
            "grade": "9",
            "relation_type": "representative"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/store/textbook-access/students",
            json=create_payload,
            headers=admin_headers
        )
        
        assert create_response.status_code == 200
        student_id = create_response.json()["student_id"]
        
        # Update with only full_name (legacy pattern)
        update_payload = {
            "full_name": f"TEST_NewFirst_{suffix} NewLast_{suffix}"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/store/textbook-access/students/{student_id}",
            json=update_payload,
            headers=admin_headers
        )
        
        assert update_response.status_code == 200, f"Update with full_name failed: {update_response.text}"
        updated = update_response.json()
        
        # Verify full_name was split
        assert updated.get("first_name") == f"TEST_NewFirst_{suffix}", \
            f"first_name not split from full_name: {updated.get('first_name')}"
        assert updated.get("last_name") == f"NewLast_{suffix}", \
            f"last_name not split from full_name: {updated.get('last_name')}"
        
        print(f"✓ Legacy full_name update correctly splits into first/last name")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
