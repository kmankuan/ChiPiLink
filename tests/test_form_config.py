"""
Form Configuration API Tests
Tests for dynamic form field configuration endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestPublicFormConfigEndpoints:
    """Tests for public form configuration endpoints"""
    
    def test_get_form_config_public(self, api_client):
        """GET /api/store/form-config/textbook_access - returns active fields only"""
        response = api_client.get(f"{BASE_URL}/api/store/form-config/textbook_access")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "form_type" in data
        assert data["form_type"] == "textbook_access"
        assert "fields" in data
        assert "total_fields" in data
        assert "required_fields" in data
        
        # Verify fields have required properties
        if data["fields"]:
            field = data["fields"][0]
            assert "field_id" in field
            assert "field_key" in field
            assert "field_type" in field
            assert "is_required" in field
            assert "label_es" in field
            # All returned fields should be active
            assert field.get("is_active", True) == True
        
        print(f"Public endpoint returned {data['total_fields']} fields, {data['required_fields']} required")
    
    def test_get_field_types(self, api_client):
        """GET /api/store/form-config/textbook_access/field-types - returns available field types"""
        response = api_client.get(f"{BASE_URL}/api/store/form-config/textbook_access/field-types")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "field_types" in data
        field_types = data["field_types"]
        
        # Verify expected field types exist
        type_values = [ft["value"] for ft in field_types]
        expected_types = ["text", "textarea", "select", "number", "file", "date", "email", "phone"]
        
        for expected in expected_types:
            assert expected in type_values, f"Missing field type: {expected}"
        
        # Verify field type structure
        for ft in field_types:
            assert "value" in ft
            assert "label_en" in ft
            assert "label_es" in ft
        
        print(f"Available field types: {type_values}")


class TestAdminFormConfigEndpoints:
    """Tests for admin form configuration endpoints"""
    
    def test_get_form_config_admin_requires_auth(self, api_client):
        """GET /api/store/form-config/admin/textbook_access - requires admin auth"""
        response = api_client.get(f"{BASE_URL}/api/store/form-config/admin/textbook_access")
        
        assert response.status_code == 401 or response.status_code == 403
        print("Admin endpoint correctly requires authentication")
    
    def test_get_form_config_admin_with_inactive(self, admin_client):
        """GET /api/store/form-config/admin/textbook_access?include_inactive=true - includes inactive fields"""
        response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access?include_inactive=true"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "form_type" in data
        assert data["form_type"] == "textbook_access"
        assert "fields" in data
        assert "total_fields" in data
        
        print(f"Admin endpoint returned {data['total_fields']} fields (including inactive)")
    
    def test_get_form_config_admin_default_fields_seeded(self, admin_client):
        """Verify default fields were seeded for textbook_access"""
        response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access?include_inactive=true"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that default fields exist
        field_keys = [f["field_key"] for f in data["fields"]]
        expected_keys = ["student_name", "school_id", "school_year", "grade", "relationship", "student_id_number"]
        
        for key in expected_keys:
            assert key in field_keys, f"Missing default field: {key}"
        
        print(f"Default fields verified: {expected_keys}")


class TestFieldCRUDOperations:
    """Tests for field CRUD operations"""
    
    def test_create_field_requires_auth(self, api_client):
        """POST /api/store/form-config/admin/textbook_access/fields - requires admin auth"""
        response = api_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": "test_field",
                "field_type": "text",
                "label_en": "Test Field",
                "label_es": "Campo de Prueba"
            }
        )
        
        assert response.status_code == 401 or response.status_code == 403
        print("Create field correctly requires authentication")
    
    def test_create_field_success(self, admin_client):
        """POST /api/store/form-config/admin/textbook_access/fields - creates new field"""
        unique_key = f"test_field_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "text",
                "is_required": False,
                "label_en": "Test Field",
                "label_es": "Campo de Prueba",
                "label_zh": "测试字段",
                "placeholder_en": "Enter test value",
                "placeholder_es": "Ingrese valor de prueba",
                "min_length": 1,
                "max_length": 50
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify created field
        assert "field_id" in data
        assert data["field_key"] == unique_key
        assert data["field_type"] == "text"
        assert data["is_required"] == False
        assert data["label_es"] == "Campo de Prueba"
        assert data["is_active"] == True
        
        # Store field_id for cleanup
        field_id = data["field_id"]
        print(f"Created field: {field_id}")
        
        # Cleanup - delete the test field
        cleanup_response = admin_client.delete(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true"
        )
        assert cleanup_response.status_code == 200
        print(f"Cleaned up test field: {field_id}")
    
    def test_create_field_duplicate_key_fails(self, admin_client):
        """POST /api/store/form-config/admin/textbook_access/fields - fails for duplicate key"""
        # Try to create a field with existing key
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": "student_name",  # Already exists
                "field_type": "text",
                "label_en": "Duplicate Field",
                "label_es": "Campo Duplicado"
            }
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "already exists" in data.get("detail", "").lower()
        print("Duplicate key correctly rejected")
    
    def test_create_select_field_with_options(self, admin_client):
        """POST /api/store/form-config/admin/textbook_access/fields - creates select field with options"""
        unique_key = f"test_select_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "select",
                "is_required": True,
                "label_en": "Test Select",
                "label_es": "Selección de Prueba",
                "options": [
                    {"value": "opt1", "label_en": "Option 1", "label_es": "Opción 1"},
                    {"value": "opt2", "label_en": "Option 2", "label_es": "Opción 2"},
                    {"value": "opt3", "label_en": "Option 3", "label_es": "Opción 3"}
                ]
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "select"
        assert len(data.get("options", [])) == 3
        
        field_id = data["field_id"]
        print(f"Created select field with 3 options: {field_id}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_update_field_success(self, admin_client):
        """PUT /api/store/form-config/admin/fields/{field_id} - updates field"""
        # First create a test field
        unique_key = f"test_update_{uuid.uuid4().hex[:8]}"
        create_response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "text",
                "label_en": "Original Label",
                "label_es": "Etiqueta Original"
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field_id"]
        
        # Update the field
        update_response = admin_client.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}",
            json={
                "label_en": "Updated Label",
                "label_es": "Etiqueta Actualizada",
                "is_required": True,
                "min_length": 5,
                "max_length": 100
            }
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        
        assert data["label_en"] == "Updated Label"
        assert data["label_es"] == "Etiqueta Actualizada"
        assert data["is_required"] == True
        assert data["min_length"] == 5
        assert data["max_length"] == 100
        
        print(f"Updated field: {field_id}")
        
        # Verify update persisted with GET
        get_response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}"
        )
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["label_en"] == "Updated Label"
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_update_field_not_found(self, admin_client):
        """PUT /api/store/form-config/admin/fields/{field_id} - returns 400 for non-existent field"""
        response = admin_client.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/fld_nonexistent123",
            json={"label_en": "Test"}
        )
        
        assert response.status_code == 400
        print("Update non-existent field correctly returns 400")
    
    def test_toggle_field_active(self, admin_client):
        """PUT /api/store/form-config/admin/fields/{field_id}/toggle - toggles active status"""
        # Create a test field
        unique_key = f"test_toggle_{uuid.uuid4().hex[:8]}"
        create_response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "text",
                "label_en": "Toggle Test",
                "label_es": "Prueba Toggle"
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field_id"]
        assert create_response.json()["is_active"] == True
        
        # Toggle to inactive
        toggle_response = admin_client.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}/toggle?is_active=false"
        )
        assert toggle_response.status_code == 200
        assert toggle_response.json()["is_active"] == False
        print(f"Toggled field {field_id} to inactive")
        
        # Verify field is not in public endpoint
        public_response = admin_client.get(f"{BASE_URL}/api/store/form-config/textbook_access")
        public_fields = [f["field_id"] for f in public_response.json()["fields"]]
        assert field_id not in public_fields, "Inactive field should not appear in public endpoint"
        
        # Toggle back to active
        toggle_back = admin_client.put(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}/toggle?is_active=true"
        )
        assert toggle_back.status_code == 200
        assert toggle_back.json()["is_active"] == True
        print(f"Toggled field {field_id} back to active")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_delete_field_soft(self, admin_client):
        """DELETE /api/store/form-config/admin/fields/{field_id} - soft deletes (deactivates)"""
        # Create a test field
        unique_key = f"test_soft_del_{uuid.uuid4().hex[:8]}"
        create_response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "text",
                "label_en": "Soft Delete Test",
                "label_es": "Prueba Borrado Suave"
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field_id"]
        
        # Soft delete (default)
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify field still exists but is inactive
        get_response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}"
        )
        assert get_response.status_code == 200
        assert get_response.json()["is_active"] == False
        print(f"Soft deleted field {field_id} - now inactive")
        
        # Hard delete for cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_delete_field_hard(self, admin_client):
        """DELETE /api/store/form-config/admin/fields/{field_id}?hard=true - permanently deletes"""
        # Create a test field
        unique_key = f"test_hard_del_{uuid.uuid4().hex[:8]}"
        create_response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "text",
                "label_en": "Hard Delete Test",
                "label_es": "Prueba Borrado Permanente"
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field_id"]
        
        # Hard delete
        delete_response = admin_client.delete(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true"
        )
        assert delete_response.status_code == 200
        assert delete_response.json()["success"] == True
        
        # Verify field no longer exists
        get_response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}"
        )
        assert get_response.status_code == 404
        print(f"Hard deleted field {field_id} - no longer exists")
    
    def test_delete_field_not_found(self, admin_client):
        """DELETE /api/store/form-config/admin/fields/{field_id} - returns 400 for non-existent"""
        response = admin_client.delete(
            f"{BASE_URL}/api/store/form-config/admin/fields/fld_nonexistent123"
        )
        
        assert response.status_code == 400
        print("Delete non-existent field correctly returns 400")


class TestFieldTypeSpecificFeatures:
    """Tests for field type specific features"""
    
    def test_create_number_field_with_validation(self, admin_client):
        """Create number field with min/max value validation"""
        unique_key = f"test_number_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "number",
                "is_required": True,
                "label_en": "Age",
                "label_es": "Edad",
                "min_value": 3,
                "max_value": 18
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "number"
        assert data["min_value"] == 3
        assert data["max_value"] == 18
        
        field_id = data["field_id"]
        print(f"Created number field with validation: min=3, max=18")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_create_file_field_with_settings(self, admin_client):
        """Create file field with allowed extensions and max size"""
        unique_key = f"test_file_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "file",
                "is_required": False,
                "label_en": "Document Upload",
                "label_es": "Subir Documento",
                "allowed_extensions": ["pdf", "doc", "docx"],
                "max_file_size_mb": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "file"
        assert data["allowed_extensions"] == ["pdf", "doc", "docx"]
        assert data["max_file_size_mb"] == 10
        
        field_id = data["field_id"]
        print(f"Created file field with extensions: {data['allowed_extensions']}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_create_email_field(self, admin_client):
        """Create email field"""
        unique_key = f"test_email_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "email",
                "is_required": True,
                "label_en": "Contact Email",
                "label_es": "Correo de Contacto"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "email"
        
        field_id = data["field_id"]
        print(f"Created email field: {field_id}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_create_date_field(self, admin_client):
        """Create date field"""
        unique_key = f"test_date_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "date",
                "is_required": False,
                "label_en": "Birth Date",
                "label_es": "Fecha de Nacimiento"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "date"
        
        field_id = data["field_id"]
        print(f"Created date field: {field_id}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")
    
    def test_create_phone_field(self, admin_client):
        """Create phone field"""
        unique_key = f"test_phone_{uuid.uuid4().hex[:8]}"
        
        response = admin_client.post(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access/fields",
            json={
                "field_key": unique_key,
                "field_type": "phone",
                "is_required": True,
                "label_en": "Phone Number",
                "label_es": "Número de Teléfono"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["field_type"] == "phone"
        
        field_id = data["field_id"]
        print(f"Created phone field: {field_id}")
        
        # Cleanup
        admin_client.delete(f"{BASE_URL}/api/store/form-config/admin/fields/{field_id}?hard=true")


class TestMultilingualSupport:
    """Tests for multilingual label support"""
    
    def test_field_has_multilingual_labels(self, admin_client):
        """Verify fields support en, es, zh labels"""
        response = admin_client.get(
            f"{BASE_URL}/api/store/form-config/admin/textbook_access?include_inactive=true"
        )
        
        assert response.status_code == 200
        fields = response.json()["fields"]
        
        # Check student_name field has all language labels
        student_name = next((f for f in fields if f["field_key"] == "student_name"), None)
        assert student_name is not None
        
        assert "label_en" in student_name
        assert "label_es" in student_name
        assert "label_zh" in student_name
        
        assert student_name["label_en"] == "Student Full Name"
        assert student_name["label_es"] == "Nombre Completo del Estudiante"
        assert student_name["label_zh"] == "学生全名"
        
        print("Multilingual labels verified for student_name field")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
