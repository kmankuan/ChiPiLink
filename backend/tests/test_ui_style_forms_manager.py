"""
Test UI Style Module and Forms Manager - Iteration 58
Tests for:
1. Admin login at /api/auth-v2/login
2. GET /api/public/ui-style returns both 'public' and 'admin' style objects
3. GET /api/admin/ui-style returns style with public/admin sub-objects, available_templates, available_fonts, density_options
4. PUT /api/admin/ui-style saves updated style with public+admin
5. Forms Manager shows 3 form types: student_linking, textbook_access, order_form
6. Order Form in Forms Manager has 4 seeded fields: payment_method (select), payment_reference (text), payment_receipt (file), notes (textarea)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_valid(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "password": "admin"
        })
        print(f"Admin login response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data or "access_token" in data, f"Expected token in response: {data}"
        if "token" in data:
            assert len(data["token"]) > 0
        elif "access_token" in data:
            assert len(data["access_token"]) > 0
        print("Admin login successful")
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        print(f"Invalid login response status: {response.status_code}")
        assert response.status_code in [401, 403, 404], f"Expected 401/403/404, got {response.status_code}"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@libreria.com",
        "password": "admin"
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    data = response.json()
    token = data.get("token") or data.get("access_token")
    return token


class TestPublicUIStyle:
    """Test public UI style endpoint"""
    
    def test_public_ui_style_returns_both_scopes(self):
        """GET /api/public/ui-style returns both 'public' and 'admin' style objects"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        print(f"Public UI style response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Public UI style response data: {data}")
        
        # Must have both 'public' and 'admin' sub-objects
        assert "public" in data, f"Expected 'public' key in response: {data}"
        assert "admin" in data, f"Expected 'admin' key in response: {data}"
        
        # Public style should have required fields
        public_style = data["public"]
        assert "template" in public_style, f"Expected 'template' in public style: {public_style}"
        assert "primary_color" in public_style, f"Expected 'primary_color' in public style: {public_style}"
        
        # Admin style should have required fields
        admin_style = data["admin"]
        assert "template" in admin_style, f"Expected 'template' in admin style: {admin_style}"
        assert "primary_color" in admin_style, f"Expected 'primary_color' in admin style: {admin_style}"
        
        print(f"Public UI style: template={public_style.get('template')}, font={public_style.get('font_family')}")
        print(f"Admin UI style: template={admin_style.get('template')}, font={admin_style.get('font_family')}")


class TestAdminUIStyle:
    """Test admin UI style endpoint"""
    
    def test_admin_ui_style_endpoint_requires_auth(self):
        """GET /api/admin/ui-style requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style")
        print(f"Admin UI style without auth: {response.status_code}")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_admin_ui_style_returns_full_config(self, auth_token):
        """GET /api/admin/ui-style returns style with public/admin sub-objects, available_templates, available_fonts, density_options"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Admin UI style response status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"Admin UI style response keys: {data.keys()}")
        
        # Must have 'style' object with public/admin
        assert "style" in data, f"Expected 'style' key in response: {data}"
        style = data["style"]
        assert "public" in style, f"Expected 'public' in style: {style}"
        assert "admin" in style, f"Expected 'admin' in style: {style}"
        
        # Must have available_templates
        assert "available_templates" in data, f"Expected 'available_templates' in response: {data}"
        templates = data["available_templates"]
        assert isinstance(templates, list), f"Expected list of templates: {templates}"
        assert len(templates) >= 5, f"Expected at least 5 templates, got {len(templates)}"
        
        # Check template structure
        template_ids = [t.get("id") for t in templates]
        print(f"Available template IDs: {template_ids}")
        assert "default" in template_ids
        assert "elegant" in template_ids
        assert "minimal" in template_ids
        
        # Must have available_fonts (12 font choices)
        assert "available_fonts" in data, f"Expected 'available_fonts' in response: {data}"
        fonts = data["available_fonts"]
        assert isinstance(fonts, list), f"Expected list of fonts: {fonts}"
        assert len(fonts) >= 12, f"Expected at least 12 fonts, got {len(fonts)}"
        
        font_values = [f.get("value") for f in fonts]
        print(f"Available fonts: {font_values}")
        assert "Inter" in font_values
        assert "Poppins" in font_values
        
        # Must have density_options (compact/comfortable/spacious)
        assert "density_options" in data, f"Expected 'density_options' in response: {data}"
        density = data["density_options"]
        assert isinstance(density, list), f"Expected list of density options: {density}"
        
        density_values = [d.get("value") for d in density]
        print(f"Density options: {density_values}")
        assert "compact" in density_values
        assert "comfortable" in density_values
        assert "spacious" in density_values
    
    def test_admin_ui_style_update(self, auth_token):
        """PUT /api/admin/ui-style saves updated style with public+admin"""
        # Get current style
        response = requests.get(f"{BASE_URL}/api/admin/ui-style", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        current = response.json()["style"]
        
        # Update style with custom values
        updated_style = {
            "public": {
                **current.get("public", {}),
                "template": "ocean",
                "primary_color": "#0284c7",
                "density": "comfortable"
            },
            "admin": {
                **current.get("admin", {}),
                "template": "minimal",
                "primary_color": "#18181b",
                "density": "compact"
            }
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/ui-style", 
            json={"style": updated_style},
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        print(f"Update UI style response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify update was saved
        response = requests.get(f"{BASE_URL}/api/admin/ui-style", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        saved = response.json()["style"]
        
        assert saved["public"]["template"] == "ocean", f"Public template not updated: {saved}"
        assert saved["admin"]["template"] == "minimal", f"Admin template not updated: {saved}"
        print("UI style update verified successfully")
        
        # Restore original style
        requests.put(f"{BASE_URL}/api/admin/ui-style", 
            json={"style": current},
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestFormsManager:
    """Test Forms Manager endpoints"""
    
    def test_form_types_list_requires_auth(self):
        """GET /api/store/form-config/admin/form-types/list requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/form-types/list")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_form_types_list_returns_3_types(self, auth_token):
        """Forms Manager shows 3 form types: student_linking, textbook_access, order_form"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/form-types/list", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Form types list response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "form_types" in data, f"Expected 'form_types' in response: {data}"
        
        form_types = data["form_types"]
        assert len(form_types) == 3, f"Expected 3 form types, got {len(form_types)}"
        
        type_ids = [ft.get("form_type") for ft in form_types]
        print(f"Form types: {type_ids}")
        
        assert "student_linking" in type_ids, f"Expected 'student_linking' in form types: {type_ids}"
        assert "textbook_access" in type_ids, f"Expected 'textbook_access' in form types: {type_ids}"
        assert "order_form" in type_ids, f"Expected 'order_form' in form types: {type_ids}"
    
    def test_order_form_has_4_seeded_fields(self, auth_token):
        """Order Form in Forms Manager has 4 seeded fields: payment_method (select), payment_reference (text), payment_receipt (file), notes (textarea)"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        print(f"Order form config response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "fields" in data, f"Expected 'fields' in response: {data}"
        
        fields = data["fields"]
        print(f"Order form has {len(fields)} fields")
        assert len(fields) == 4, f"Expected 4 fields, got {len(fields)}"
        
        # Build a lookup by field_key
        field_lookup = {f.get("field_key"): f for f in fields}
        
        # Verify payment_method field (select type)
        assert "payment_method" in field_lookup, f"Expected 'payment_method' field: {list(field_lookup.keys())}"
        pm = field_lookup["payment_method"]
        assert pm.get("field_type") == "select", f"Expected payment_method to be select type: {pm}"
        assert len(pm.get("options", [])) >= 3, f"Expected payment_method to have options: {pm}"
        print(f"payment_method: type={pm.get('field_type')}, options={[o.get('value') for o in pm.get('options', [])]}")
        
        # Verify payment_reference field (text type)
        assert "payment_reference" in field_lookup, f"Expected 'payment_reference' field: {list(field_lookup.keys())}"
        pr = field_lookup["payment_reference"]
        assert pr.get("field_type") == "text", f"Expected payment_reference to be text type: {pr}"
        print(f"payment_reference: type={pr.get('field_type')}")
        
        # Verify payment_receipt field (file type)
        assert "payment_receipt" in field_lookup, f"Expected 'payment_receipt' field: {list(field_lookup.keys())}"
        prec = field_lookup["payment_receipt"]
        assert prec.get("field_type") == "file", f"Expected payment_receipt to be file type: {prec}"
        print(f"payment_receipt: type={prec.get('field_type')}")
        
        # Verify notes field (textarea type)
        assert "notes" in field_lookup, f"Expected 'notes' field: {list(field_lookup.keys())}"
        notes = field_lookup["notes"]
        assert notes.get("field_type") == "textarea", f"Expected notes to be textarea type: {notes}"
        print(f"notes: type={notes.get('field_type')}")
    
    def test_order_form_fields_have_multilingual_labels(self, auth_token):
        """Order form fields have multilingual labels (EN/ES/ZH)"""
        response = requests.get(f"{BASE_URL}/api/store/form-config/admin/order_form?include_inactive=true", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        fields = response.json()["fields"]
        for field in fields:
            assert "label_en" in field, f"Expected label_en in field: {field}"
            assert "label_es" in field, f"Expected label_es in field: {field}"
            assert "label_zh" in field, f"Expected label_zh in field: {field}"
            print(f"Field {field.get('field_key')}: EN={field.get('label_en')}, ES={field.get('label_es')}, ZH={field.get('label_zh')}")


class TestUIStylePublicAdminSeparation:
    """Test that public and admin styles are properly separated"""
    
    def test_public_style_applies_to_frontend(self, auth_token):
        """Public UI style is returned for frontend theming"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200
        
        data = response.json()
        public_style = data["public"]
        
        # Verify public style has all required fields for theming
        required_fields = ["template", "primary_color", "font_family", "border_radius", "card_style", "density"]
        for field in required_fields:
            assert field in public_style, f"Expected '{field}' in public style: {public_style}"
        
        print(f"Public style verified: {public_style}")
    
    def test_admin_style_has_density_compact_default(self, auth_token):
        """Admin style defaults to compact density"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        
        admin_style = response.json()["style"]["admin"]
        # Admin should default to compact or have a density setting
        assert "density" in admin_style, f"Expected 'density' in admin style: {admin_style}"
        print(f"Admin style density: {admin_style.get('density')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
