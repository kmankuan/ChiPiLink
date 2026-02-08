"""
Layout Templates Testing
Tests for 7 layout options + china_panama color theme in UI Style module
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLayoutTemplatesAPI:
    """Test layout templates and china_panama color theme endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "password": "admin"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get('token')
            self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        else:
            pytest.skip("Admin login failed - skipping authenticated tests")
    
    # ========== GET /api/admin/ui-style Tests ==========
    
    def test_get_ui_style_returns_available_layouts(self):
        """GET /api/admin/ui-style returns available_layouts array"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        assert 'available_layouts' in data
        assert isinstance(data['available_layouts'], list)
        print(f"Found {len(data['available_layouts'])} layouts")
    
    def test_available_layouts_has_7_options(self):
        """available_layouts contains exactly 7 layout options"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        assert len(layouts) == 7, f"Expected 7 layouts, got {len(layouts)}"
        
        # Verify all expected layout IDs are present
        layout_ids = [l['id'] for l in layouts]
        expected_ids = ['mobile_app', 'storefront', 'portal', 'single_page', 'chat_app', 'card_grid', 'china_panama']
        
        for expected_id in expected_ids:
            assert expected_id in layout_ids, f"Missing layout: {expected_id}"
        
        print(f"All 7 layouts present: {layout_ids}")
    
    def test_layout_options_have_required_fields(self):
        """Each layout option has id, name, description, icon"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        for layout in layouts:
            assert 'id' in layout, f"Layout missing 'id': {layout}"
            assert 'name' in layout, f"Layout missing 'name': {layout}"
            assert 'description' in layout, f"Layout missing 'description': {layout}"
            assert 'icon' in layout, f"Layout missing 'icon': {layout}"
        
        print("All layouts have required fields")
    
    def test_available_templates_has_6_themes(self):
        """available_templates contains 6 color themes including china_panama"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        templates = data.get('available_templates', [])
        assert len(templates) == 6, f"Expected 6 templates, got {len(templates)}"
        
        template_ids = [t['id'] for t in templates]
        expected_ids = ['default', 'elegant', 'warm', 'ocean', 'minimal', 'china_panama']
        
        for expected_id in expected_ids:
            assert expected_id in template_ids, f"Missing template: {expected_id}"
        
        print(f"All 6 templates present: {template_ids}")
    
    def test_china_panama_template_has_preview_colors(self):
        """china_panama template has red/gold/blue preview colors"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        templates = data.get('available_templates', [])
        china_panama = next((t for t in templates if t['id'] == 'china_panama'), None)
        
        assert china_panama is not None, "china_panama template not found"
        assert 'preview_colors' in china_panama
        assert len(china_panama['preview_colors']) == 3
        
        # Check for red, gold, blue colors (hex format)
        colors = china_panama['preview_colors']
        print(f"China-Panama preview colors: {colors}")
        
        # Red should be #dc2626, gold #fbbf24, blue #1d4ed8
        assert '#dc2626' in colors, "Missing red color"
        assert '#fbbf24' in colors, "Missing gold color"
        assert '#1d4ed8' in colors, "Missing blue color"
    
    def test_style_object_contains_layout_field(self):
        """style object contains layout field"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        style = data.get('style', {})
        # Check root or public sub-object for layout
        has_layout = 'layout' in style or 'layout' in style.get('public', {})
        assert has_layout, "Layout field missing from style object"
        print(f"Layout field present in style")
    
    # ========== PUT /api/admin/ui-style Tests ==========
    
    def test_save_layout_choice(self):
        """PUT /api/admin/ui-style saves layout field correctly"""
        # First get current style
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert get_response.status_code == 200
        current_data = get_response.json()
        current_style = current_data.get('style', {})
        
        # Update public layout to china_panama
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'china_panama'
        
        # Save
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        print("Layout saved successfully")
        
        # Verify persistence
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        verify_data = verify_response.json()
        saved_layout = verify_data.get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'china_panama', f"Expected china_panama, got {saved_layout}"
        
        print(f"Layout persisted: {saved_layout}")
    
    def test_save_china_panama_template(self):
        """PUT /api/admin/ui-style saves china_panama template"""
        # Get current
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        # Update public template
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['template'] = 'china_panama'
        
        # Save
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        
        # Verify
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_template = verify_response.json().get('style', {}).get('public', {}).get('template')
        assert saved_template == 'china_panama', f"Expected china_panama template, got {saved_template}"
        print(f"Template saved and persisted: {saved_template}")
    
    # ========== GET /api/public/ui-style Tests ==========
    
    def test_public_ui_style_returns_layout(self):
        """GET /api/public/ui-style returns layout in public style object"""
        # Use unauthenticated request
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        # Public endpoint returns public sub-object
        public_style = data.get('public', {})
        assert 'layout' in public_style or 'layout' in data, "Layout field missing from public ui-style response"
        
        layout = public_style.get('layout') or data.get('layout')
        print(f"Public layout: {layout}")
    
    # ========== Reset Test Data ==========
    
    def test_cleanup_reset_to_default_layout(self):
        """Reset layout to mobile_app after tests"""
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'mobile_app'
        current_style['public']['template'] = 'default'
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        print("Reset to default layout and template")


class TestLayoutTemplatesUnauthorized:
    """Test that layout endpoints require proper authentication"""
    
    def test_admin_ui_style_requires_auth(self):
        """GET /api/admin/ui-style requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style")
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Admin endpoint properly requires authentication")
    
    def test_put_ui_style_requires_auth(self):
        """PUT /api/admin/ui-style requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': {'public': {'layout': 'china_panama'}}
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PUT endpoint properly requires authentication")
    
    def test_public_ui_style_is_public(self):
        """GET /api/public/ui-style is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Public endpoint should be accessible, got {response.status_code}"
        print("Public endpoint is accessible without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
