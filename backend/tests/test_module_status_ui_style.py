"""
Test Module Status and UI Style API endpoints
Tests P1 and P2 features: Admin UI for module status & UI style configuration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"


class TestPublicEndpoints:
    """Public endpoints - no authentication required"""
    
    def test_public_module_status_returns_default_statuses(self):
        """GET /api/public/module-status should return statuses without auth"""
        response = requests.get(f"{BASE_URL}/api/public/module-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "statuses" in data, "Response should contain 'statuses' key"
        
        statuses = data["statuses"]
        # Check expected modules exist
        expected_modules = ["home", "unatienda", "textbook_orders", "rapid_pin", "events"]
        for module in expected_modules:
            assert module in statuses, f"Module '{module}' should be in statuses"
        
        # Verify status structure
        for key, val in statuses.items():
            assert "status" in val, f"Module {key} should have 'status' field"
            assert val["status"] in ["production", "live_beta", "coming_soon", "maintenance"], \
                f"Module {key} has invalid status: {val['status']}"
        
        print(f"SUCCESS: Public module statuses returned with {len(statuses)} modules")

    def test_public_ui_style_returns_default_style(self):
        """GET /api/public/ui-style should return UI style without auth"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "style" in data, "Response should contain 'style' key"
        
        style = data["style"]
        # Check expected fields
        expected_fields = ["template", "primary_color", "font_family", "border_radius", "card_style"]
        for field in expected_fields:
            assert field in style, f"Style should have '{field}' field"
        
        # Validate template value
        assert style["template"] in ["default", "elegant", "warm", "ocean", "minimal"], \
            f"Invalid template: {style['template']}"
        
        print(f"SUCCESS: Public UI style returned: template={style['template']}, color={style['primary_color']}")


class TestAdminLogin:
    """Test admin login functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Login response should contain token"
        return data["token"]
    
    def test_admin_login_success(self):
        """POST /api/auth-v2/login with admin credentials should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["is_admin"] == True, "User should be admin"
        
        print(f"SUCCESS: Admin login successful for {data['user']['email']}")


class TestAdminModuleStatus:
    """Admin module status endpoints - authentication required"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_module_status_requires_auth(self):
        """GET /api/admin/module-status should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/module-status")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin module-status endpoint requires auth")
    
    def test_admin_get_module_status_with_auth(self, admin_token):
        """GET /api/admin/module-status should return statuses with module_names and available_statuses"""
        response = requests.get(
            f"{BASE_URL}/api/admin/module-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "statuses" in data, "Response should contain 'statuses'"
        assert "module_names" in data, "Response should contain 'module_names'"
        assert "available_statuses" in data, "Response should contain 'available_statuses'"
        
        # Verify available_statuses
        expected_statuses = ["production", "live_beta", "coming_soon", "maintenance"]
        assert data["available_statuses"] == expected_statuses, \
            f"available_statuses mismatch: {data['available_statuses']}"
        
        # Verify module_names structure
        for key in data["statuses"].keys():
            assert key in data["module_names"], f"Module '{key}' should have a name"
        
        print(f"SUCCESS: Admin module-status returned {len(data['statuses'])} modules with names and available statuses")
    
    def test_admin_update_module_status(self, admin_token):
        """PUT /api/admin/module-status should save and return success"""
        # First get current statuses
        get_response = requests.get(
            f"{BASE_URL}/api/admin/module-status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_statuses = get_response.json()["statuses"]
        
        # Update one module status
        updated_statuses = current_statuses.copy()
        updated_statuses["gallery"] = {"status": "live_beta", "customLabel": "TEST Beta"}
        
        response = requests.put(
            f"{BASE_URL}/api/admin/module-status",
            json={"statuses": updated_statuses},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify change is reflected in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/public/module-status")
        public_statuses = public_response.json()["statuses"]
        assert public_statuses["gallery"]["status"] == "live_beta", "Gallery status should be updated"
        assert public_statuses["gallery"]["customLabel"] == "TEST Beta", "Gallery customLabel should be updated"
        
        # Reset back to coming_soon
        updated_statuses["gallery"] = {"status": "coming_soon", "customLabel": ""}
        requests.put(
            f"{BASE_URL}/api/admin/module-status",
            json={"statuses": updated_statuses},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print("SUCCESS: Admin can update module statuses and changes reflect on public endpoint")


class TestAdminUIStyle:
    """Admin UI style endpoints - authentication required"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_ui_style_requires_auth(self):
        """GET /api/admin/ui-style should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin ui-style endpoint requires auth")
    
    def test_admin_get_ui_style_with_auth(self, admin_token):
        """GET /api/admin/ui-style should return style with available_templates"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ui-style",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "style" in data, "Response should contain 'style'"
        assert "available_templates" in data, "Response should contain 'available_templates'"
        
        # Verify 5 templates
        templates = data["available_templates"]
        assert len(templates) == 5, f"Expected 5 templates, got {len(templates)}"
        
        expected_template_ids = ["default", "elegant", "warm", "ocean", "minimal"]
        actual_ids = [t["id"] for t in templates]
        for tid in expected_template_ids:
            assert tid in actual_ids, f"Template '{tid}' should be available"
        
        # Verify template structure
        for tmpl in templates:
            assert "id" in tmpl, "Template should have 'id'"
            assert "name" in tmpl, "Template should have 'name'"
            assert "description" in tmpl, "Template should have 'description'"
            assert "preview_colors" in tmpl, "Template should have 'preview_colors'"
            assert len(tmpl["preview_colors"]) == 3, "Template should have 3 preview colors"
        
        print(f"SUCCESS: Admin ui-style returned {len(templates)} templates: {actual_ids}")
    
    def test_admin_update_ui_style(self, admin_token):
        """PUT /api/admin/ui-style should save and return success"""
        # First get current style
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ui-style",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_style = get_response.json()["style"]
        original_template = current_style.get("template", "default")
        
        # Update style to 'elegant'
        updated_style = current_style.copy()
        updated_style["template"] = "elegant"
        updated_style["primary_color"] = "#7c3aed"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            json={"style": updated_style},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        # Verify change is reflected in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/public/ui-style")
        public_style = public_response.json()["style"]
        assert public_style["template"] == "elegant", "Template should be updated to elegant"
        assert public_style["primary_color"] == "#7c3aed", "Primary color should be updated"
        
        # Reset back to original
        updated_style["template"] = original_template
        updated_style["primary_color"] = "#16a34a"
        requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            json={"style": updated_style},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print("SUCCESS: Admin can update UI style and changes reflect on public endpoint")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
