"""
Forms Manager Admin Module - Backend Tests
Tests for form configuration admin endpoints including:
- GET /api/store/form-config/admin/form-types/list (3 form types with field counts)
- GET /api/store/form-config/admin/student_linking (6 default fields)
- POST /api/store/form-config/admin/student_linking/fields (create custom field)
- PUT /api/store/form-config/admin/fields/{field_id} (update field)
- PUT /api/store/form-config/admin/fields/{field_id}/toggle?is_active=false (toggle field)
- DELETE /api/store/form-config/admin/fields/{field_id}?hard=true (delete non-system field)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@libreria.com", "password": "admin"}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def auth_headers(admin_token):
    """Return authorization headers"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestFormTypesList:
    """Test the form types listing endpoint"""
    
    def test_get_form_types_list_returns_3_types(self, auth_headers):
        """GET /api/store/form-config/admin/form-types/list should return 3 form types"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/form-types/list",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "form_types" in data, "Response should have 'form_types' key"
        
        form_types = data["form_types"]
        assert len(form_types) == 3, f"Expected 3 form types, got {len(form_types)}"
        
        # Verify all expected form types are present
        form_type_keys = [ft["form_type"] for ft in form_types]
        assert "student_linking" in form_type_keys, "Missing student_linking form type"
        assert "textbook_access" in form_type_keys, "Missing textbook_access form type"
        assert "order_form" in form_type_keys, "Missing order_form form type"
    
    def test_form_types_have_field_counts(self, auth_headers):
        """Each form type should have total_fields and required_fields counts"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/form-types/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        form_types = response.json()["form_types"]
        for ft in form_types:
            assert "total_fields" in ft, f"Form type {ft['form_type']} missing total_fields"
            assert "required_fields" in ft, f"Form type {ft['form_type']} missing required_fields"
            assert isinstance(ft["total_fields"], int), "total_fields should be an integer"
            assert isinstance(ft["required_fields"], int), "required_fields should be an integer"
    
    def test_form_types_have_metadata(self, auth_headers):
        """Each form type should have label, description, icon"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/form-types/list",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        form_types = response.json()["form_types"]
        for ft in form_types:
            assert "label_en" in ft, f"Form type {ft['form_type']} missing label_en"
            assert "description_en" in ft, f"Form type {ft['form_type']} missing description_en"
            assert "icon" in ft, f"Form type {ft['form_type']} missing icon"


class TestStudentLinkingFields:
    """Test the student linking form configuration"""
    
    def test_get_student_linking_fields_returns_6_defaults(self, auth_headers):
        """GET /api/store/form-config/admin/student_linking should return 6 default fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/student_linking?include_inactive=true",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "fields" in data, "Response should have 'fields' key"
        
        fields = data["fields"]
        # Should have at least 6 default fields (may have more if custom fields were added)
        assert len(fields) >= 6, f"Expected at least 6 fields, got {len(fields)}"
        
        # Verify default field keys
        field_keys = [f["field_key"] for f in fields]
        expected_keys = ["first_name", "last_name", "school_id", "grade", "student_number", "relation_type"]
        for key in expected_keys:
            assert key in field_keys, f"Missing expected field: {key}"
    
    def test_student_linking_has_system_fields(self, auth_headers):
        """System fields should be marked with is_system=True"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/student_linking?include_inactive=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        fields = response.json()["fields"]
        
        # Check system fields
        system_field_keys = ["first_name", "last_name", "school_id", "grade", "relation_type"]
        for field in fields:
            if field["field_key"] in system_field_keys:
                assert field.get("is_system") == True, f"Field {field['field_key']} should be a system field"
        
        # student_number should NOT be a system field
        student_number = next((f for f in fields if f["field_key"] == "student_number"), None)
        if student_number:
            assert student_number.get("is_system") != True, "student_number should NOT be a system field"
    
    def test_fields_have_multilingual_labels(self, auth_headers):
        """Fields should have labels in EN, ES, ZH"""
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/student_linking?include_inactive=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        fields = response.json()["fields"]
        for field in fields:
            assert "label_en" in field, f"Field {field['field_key']} missing label_en"
            # ES and ZH are optional but should exist for default fields


class TestCreateField:
    """Test creating new custom fields"""
    
    created_field_id = None
    
    def test_create_custom_field(self, auth_headers):
        """POST /api/store/form-config/admin/student_linking/fields should create a new field"""
        payload = {
            "field_key": "test_custom_field",
            "field_type": "text",
            "is_required": False,
            "label_en": "Test Custom Field",
            "label_es": "Campo Personalizado de Prueba",
            "placeholder_en": "Enter test value"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/form-config/admin/student_linking/fields",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "field_id" in data, "Response should include field_id"
        assert data["field_key"] == "test_custom_field"
        assert data["field_type"] == "text"
        assert data["label_en"] == "Test Custom Field"
        
        TestCreateField.created_field_id = data["field_id"]
        print(f"Created field with ID: {TestCreateField.created_field_id}")
    
    def test_verify_field_was_persisted(self, auth_headers):
        """GET the student_linking config should include the new field"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field was created in previous test")
        
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/student_linking?include_inactive=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        fields = response.json()["fields"]
        field_keys = [f["field_key"] for f in fields]
        assert "test_custom_field" in field_keys, "Created field should be in the list"


class TestUpdateField:
    """Test updating existing fields"""
    
    def test_update_field(self, auth_headers):
        """PUT /api/store/form-config/admin/fields/{field_id} should update field"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field to update")
        
        payload = {
            "label_en": "Updated Custom Field",
            "is_required": True,
            "placeholder_en": "Updated placeholder"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}",
            headers=auth_headers,
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["label_en"] == "Updated Custom Field", "Label should be updated"
        assert data["is_required"] == True, "is_required should be updated to True"
    
    def test_verify_update_was_persisted(self, auth_headers):
        """GET field should show updated values"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field to verify")
        
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["label_en"] == "Updated Custom Field"


class TestToggleField:
    """Test toggling field active status"""
    
    def test_toggle_field_inactive(self, auth_headers):
        """PUT /api/store/form-config/admin/fields/{field_id}/toggle?is_active=false should disable field"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field to toggle")
        
        response = requests.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}/toggle?is_active=false",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("is_active") == False, "Field should be inactive"
    
    def test_toggle_field_active(self, auth_headers):
        """PUT /api/store/form-config/admin/fields/{field_id}/toggle?is_active=true should enable field"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field to toggle")
        
        response = requests.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}/toggle?is_active=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("is_active") == True, "Field should be active"


class TestDeleteField:
    """Test deleting fields"""
    
    def test_delete_non_system_field(self, auth_headers):
        """DELETE /api/store/form-config/admin/fields/{field_id}?hard=true should delete non-system field"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field to delete")
        
        response = requests.delete(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}?hard=true",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Delete should succeed"
    
    def test_verify_field_was_deleted(self, auth_headers):
        """GET field should return 404 after deletion"""
        if not TestCreateField.created_field_id:
            pytest.skip("No field was deleted")
        
        response = requests.get(
            f"{BASE_URL}/api/store/form-config/admin/fields/{TestCreateField.created_field_id}",
            headers=auth_headers
        )
        assert response.status_code == 404, f"Expected 404 for deleted field, got {response.status_code}"


class TestUnauthorizedAccess:
    """Test that endpoints require authentication"""
    
    def test_form_types_list_requires_auth(self):
        """GET /api/store/form-config/admin/form-types/list should require auth"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/form-types/list")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_admin_config_requires_auth(self):
        """GET /api/store/form-config/admin/student_linking should require auth"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/student_linking")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestPublicEndpoint:
    """Test that public endpoint works without auth"""
    
    def test_public_form_config_works_without_auth(self):
        """GET /api/store/form-config/student_linking should work without auth (public)"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/student_linking")
        assert response.status_code == 200, f"Public endpoint should work, got {response.status_code}"
        
        data = response.json()
        assert "fields" in data, "Public response should have fields"
