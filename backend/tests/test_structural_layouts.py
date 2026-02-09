"""
Structural Layouts Testing
Tests for 5 structural page layouts (Classic, Bento Grid, Tab Hub, Social Feed, Magazine)
and 6 CSS overlay layouts in the UI Style module.

Features tested:
1. GET /api/admin/ui-style returns all 11 layout options (5 structural + 6 CSS overlay)
2. Layout switching via PUT /api/admin/ui-style
3. GET /api/public/ui-style returns the public layout setting
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials for testing
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


class TestStructuralLayoutsAPI:
    """Test structural page layout options in UI Style module"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
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
        print(f"SUCCESS: Found {len(data['available_layouts'])} layouts")
    
    def test_available_layouts_has_11_options(self):
        """available_layouts contains exactly 11 layout options (5 structural + 6 CSS overlay)"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        assert len(layouts) == 11, f"Expected 11 layouts, got {len(layouts)}"
        print(f"SUCCESS: All 11 layouts present")
    
    def test_structural_layouts_present(self):
        """5 structural layouts are present: mobile_app, bento_grid, tab_hub, social_feed, magazine"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        layout_ids = [l['id'] for l in layouts]
        
        structural_expected = ['mobile_app', 'bento_grid', 'tab_hub', 'social_feed', 'magazine']
        
        for expected_id in structural_expected:
            assert expected_id in layout_ids, f"Missing structural layout: {expected_id}"
        
        # Verify they have 'structural' category
        structural_layouts = [l for l in layouts if l.get('category') == 'structural']
        assert len(structural_layouts) == 5, f"Expected 5 structural layouts, got {len(structural_layouts)}"
        
        print(f"SUCCESS: All 5 structural layouts present with correct category")
    
    def test_css_overlay_layouts_present(self):
        """6 CSS overlay layouts are present: storefront, portal, single_page, chat_app, card_grid, china_panama"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        layout_ids = [l['id'] for l in layouts]
        
        css_expected = ['storefront', 'portal', 'single_page', 'chat_app', 'card_grid', 'china_panama']
        
        for expected_id in css_expected:
            assert expected_id in layout_ids, f"Missing CSS overlay layout: {expected_id}"
        
        # Verify they have 'css_overlay' category
        css_layouts = [l for l in layouts if l.get('category') == 'css_overlay']
        assert len(css_layouts) == 6, f"Expected 6 CSS overlay layouts, got {len(css_layouts)}"
        
        print(f"SUCCESS: All 6 CSS overlay layouts present with correct category")
    
    def test_layout_options_have_required_fields(self):
        """Each layout option has id, name, description, icon, category"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        for layout in layouts:
            assert 'id' in layout, f"Layout missing 'id': {layout}"
            assert 'name' in layout, f"Layout missing 'name': {layout}"
            assert 'description' in layout, f"Layout missing 'description': {layout}"
            assert 'icon' in layout, f"Layout missing 'icon': {layout}"
            assert 'category' in layout, f"Layout missing 'category': {layout}"
        
        print("SUCCESS: All layouts have required fields (id, name, description, icon, category)")
    
    def test_structural_layout_descriptions(self):
        """Structural layouts have descriptive descriptions for the layout type"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        layouts = data.get('available_layouts', [])
        structural_layouts = {l['id']: l for l in layouts if l.get('category') == 'structural'}
        
        # mobile_app (Classic) should mention hero, carousel
        assert 'carousel' in structural_layouts['mobile_app']['description'].lower() or 'hero' in structural_layouts['mobile_app']['description'].lower()
        
        # bento_grid should mention asymmetric, tiles
        assert 'tile' in structural_layouts['bento_grid']['description'].lower() or 'asymmetric' in structural_layouts['bento_grid']['description'].lower()
        
        # tab_hub should mention tab
        assert 'tab' in structural_layouts['tab_hub']['description'].lower()
        
        # social_feed should mention stories or timeline
        assert 'stor' in structural_layouts['social_feed']['description'].lower() or 'timeline' in structural_layouts['social_feed']['description'].lower()
        
        # magazine should mention editorial or column
        assert 'editorial' in structural_layouts['magazine']['description'].lower() or 'column' in structural_layouts['magazine']['description'].lower()
        
        print("SUCCESS: Structural layouts have appropriate descriptions")
    
    # ========== PUT /api/admin/ui-style Layout Switching Tests ==========
    
    def test_save_bento_grid_layout(self):
        """PUT /api/admin/ui-style saves bento_grid layout correctly"""
        # First get current style
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert get_response.status_code == 200
        current_style = get_response.json().get('style', {})
        
        # Ensure public sub-object exists
        if 'public' not in current_style:
            current_style['public'] = {}
        
        # Set to bento_grid
        current_style['public']['layout'] = 'bento_grid'
        
        # Save
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        print("Bento grid layout saved")
        
        # Verify persistence
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_layout = verify_response.json().get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'bento_grid', f"Expected bento_grid, got {saved_layout}"
        
        print(f"SUCCESS: bento_grid layout persisted correctly")
    
    def test_save_tab_hub_layout(self):
        """PUT /api/admin/ui-style saves tab_hub layout correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'tab_hub'
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_layout = verify_response.json().get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'tab_hub', f"Expected tab_hub, got {saved_layout}"
        
        print(f"SUCCESS: tab_hub layout persisted correctly")
    
    def test_save_social_feed_layout(self):
        """PUT /api/admin/ui-style saves social_feed layout correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'social_feed'
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_layout = verify_response.json().get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'social_feed', f"Expected social_feed, got {saved_layout}"
        
        print(f"SUCCESS: social_feed layout persisted correctly")
    
    def test_save_magazine_layout(self):
        """PUT /api/admin/ui-style saves magazine layout correctly"""
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'magazine'
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_layout = verify_response.json().get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'magazine', f"Expected magazine, got {saved_layout}"
        
        print(f"SUCCESS: magazine layout persisted correctly")
    
    def test_restore_classic_layout(self):
        """PUT /api/admin/ui-style can restore classic (mobile_app) layout"""
        get_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        current_style = get_response.json().get('style', {})
        
        if 'public' not in current_style:
            current_style['public'] = {}
        current_style['public']['layout'] = 'mobile_app'
        
        put_response = self.session.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': current_style
        })
        assert put_response.status_code == 200
        
        verify_response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        saved_layout = verify_response.json().get('style', {}).get('public', {}).get('layout')
        assert saved_layout == 'mobile_app', f"Expected mobile_app, got {saved_layout}"
        
        print(f"SUCCESS: mobile_app (Classic) layout restored correctly")
    
    # ========== GET /api/public/ui-style Tests ==========
    
    def test_public_ui_style_returns_layout(self):
        """GET /api/public/ui-style returns layout in public style object"""
        # Use unauthenticated request
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        # Public endpoint returns public sub-object
        public_style = data.get('public', {})
        layout = public_style.get('layout')
        
        assert layout is not None, "Layout field missing from public ui-style response"
        print(f"SUCCESS: Public layout returned: {layout}")
    
    # ========== Admin Panel Not Affected Tests ==========
    
    def test_admin_style_separate_from_public(self):
        """Admin style settings are separate from public style settings"""
        response = self.session.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code == 200
        data = response.json()
        
        style = data.get('style', {})
        
        # Both public and admin sub-objects should exist
        assert 'public' in style, "Style missing 'public' sub-object"
        assert 'admin' in style, "Style missing 'admin' sub-object"
        
        # They should be separate objects
        assert style['public'] is not style['admin'], "public and admin should be separate objects"
        
        print("SUCCESS: Admin and public styles are separate objects")


class TestStructuralLayoutsUnauthorized:
    """Test that layout endpoints require proper authentication"""
    
    def test_admin_ui_style_requires_auth(self):
        """GET /api/admin/ui-style requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/ui-style")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin endpoint properly requires authentication")
    
    def test_put_ui_style_requires_auth(self):
        """PUT /api/admin/ui-style requires authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/ui-style", json={
            'style': {'public': {'layout': 'bento_grid'}}
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: PUT endpoint properly requires authentication")
    
    def test_public_ui_style_is_public(self):
        """GET /api/public/ui-style is publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Public endpoint should be accessible, got {response.status_code}"
        print("SUCCESS: Public endpoint is accessible without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
