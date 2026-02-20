"""
Test Store Checkout Form Configuration API
Tests the new checkout form config feature for public store checkout
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthSetup:
    """Login and get admin token"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]


class TestStoreCheckoutFormConfig(TestAuthSetup):
    """Tests for Store Checkout Form Config API endpoints"""
    
    def test_get_public_fields_requires_auth(self):
        """GET /api/store/checkout-form-config/fields requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/checkout-form-config/fields")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Public fields endpoint requires auth")
    
    def test_get_public_fields(self, admin_token):
        """GET /api/store/checkout-form-config/fields returns default fields"""
        response = requests.get(
            f"{BASE_URL}/api/store/checkout-form-config/fields",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "fields" in data, "Response should have 'fields' key"
        
        fields = data["fields"]
        # Should have 4 default fields: Full Name, Email, Phone, Delivery Address
        assert len(fields) >= 4, f"Expected at least 4 default fields, got {len(fields)}"
        
        # Check field structure
        for field in fields:
            assert "field_id" in field, "Field should have field_id"
            assert "field_type" in field, "Field should have field_type"
            assert "label" in field, "Field should have label"
        
        # Verify default field labels exist
        labels = [f["label"] for f in fields]
        assert "Full Name" in labels, "Missing 'Full Name' field"
        assert "Email" in labels, "Missing 'Email' field"
        assert "Phone" in labels, "Missing 'Phone' field"
        assert "Delivery Address" in labels, "Missing 'Delivery Address' field"
        
        print(f"✓ Got {len(fields)} checkout form fields")
        print(f"  Labels: {labels}")
    
    def test_get_field_types(self):
        """GET /api/store/checkout-form-config/field-types returns available types"""
        response = requests.get(f"{BASE_URL}/api/store/checkout-form-config/field-types")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "types" in data, "Response should have 'types' key"
        
        types = data["types"]
        assert len(types) > 0, "Should have at least some field types"
        
        # Check for common types
        type_names = [t["type"] for t in types]
        assert "text" in type_names, "Should have 'text' type"
        assert "email" in type_names, "Should have 'email' type"
        
        print(f"✓ Got {len(types)} field types: {type_names}")
    
    def test_get_admin_fields_requires_admin(self, admin_token):
        """GET /api/store/checkout-form-config/admin/fields requires admin"""
        response = requests.get(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "fields" in data, "Response should have 'fields' key"
        print(f"✓ Admin fields endpoint returns {len(data['fields'])} fields")
    
    def test_create_field(self, admin_token):
        """POST /api/store/checkout-form-config/admin/fields creates a new field"""
        new_field = {
            "field_type": "text",
            "label": "TEST_CustomField",
            "label_es": "TEST_CampoPersonalizado",
            "placeholder": "Enter custom data",
            "placeholder_es": "Ingrese datos personalizados",
            "required": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=new_field
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "field" in data, "Response should have 'field' key"
        assert "message" in data, "Response should have success message"
        
        created_field = data["field"]
        assert created_field["label"] == "TEST_CustomField", "Label should match"
        assert "field_id" in created_field, "Created field should have field_id"
        
        print(f"✓ Created field with id: {created_field['field_id']}")
        return created_field["field_id"]
    
    def test_update_field(self, admin_token):
        """PUT /api/store/checkout-form-config/admin/fields/{field_id} updates a field"""
        # First, create a field to update
        create_response = requests.post(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "field_type": "text",
                "label": "TEST_ToUpdate",
                "required": False
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field"]["field_id"]
        
        # Update the field
        update_data = {
            "label": "TEST_Updated",
            "required": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields/{field_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=update_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["field"]["label"] == "TEST_Updated", "Label should be updated"
        assert data["field"]["required"] == True, "Required should be updated"
        
        print(f"✓ Updated field {field_id}")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields/{field_id}?hard_delete=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_field(self, admin_token):
        """DELETE /api/store/checkout-form-config/admin/fields/{field_id} deletes a field"""
        # First, create a field to delete
        create_response = requests.post(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "field_type": "text",
                "label": "TEST_ToDelete",
                "required": False
            }
        )
        assert create_response.status_code == 200
        field_id = create_response.json()["field"]["field_id"]
        
        # Delete the field (hard delete)
        response = requests.delete(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields/{field_id}?hard_delete=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have success message"
        
        print(f"✓ Deleted field {field_id}")
    
    def test_delete_nonexistent_field(self, admin_token):
        """DELETE returns 404 for nonexistent field"""
        response = requests.delete(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields/nonexistent123?hard_delete=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Returns 404 for nonexistent field")


class TestExistingTextbookFormConfig(TestAuthSetup):
    """Tests to verify existing Textbook Order Form config still works"""
    
    def test_existing_textbook_form_config_works(self, admin_token):
        """GET /api/store/order-form-config/admin/fields still works"""
        response = requests.get(
            f"{BASE_URL}/api/store/order-form-config/admin/fields",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "fields" in data, "Response should have 'fields' key"
        print(f"✓ Textbook order form config still works, has {len(data['fields'])} fields")
    
    def test_textbook_form_field_types(self):
        """GET /api/store/order-form-config/field-types still works"""
        response = requests.get(f"{BASE_URL}/api/store/order-form-config/field-types")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Textbook order form field-types endpoint still works")


class TestCleanup(TestAuthSetup):
    """Cleanup test data"""
    
    def test_cleanup_test_fields(self, admin_token):
        """Remove any TEST_ prefixed fields from checkout form config"""
        response = requests.get(
            f"{BASE_URL}/api/store/checkout-form-config/admin/fields?include_inactive=true",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if response.status_code == 200:
            fields = response.json().get("fields", [])
            for field in fields:
                if field.get("label", "").startswith("TEST_"):
                    requests.delete(
                        f"{BASE_URL}/api/store/checkout-form-config/admin/fields/{field['field_id']}?hard_delete=true",
                        headers={"Authorization": f"Bearer {admin_token}"}
                    )
                    print(f"  Cleaned up test field: {field['label']}")
        
        print("✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
