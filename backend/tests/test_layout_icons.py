"""
Backend Tests for Layout Preview & Icon Customization Feature
Tests: GET /api/ticker/layout-icons, GET /api/admin/ticker/layout-icons, PUT /api/admin/ticker/layout-icons/{layout_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://layout-engine-1.preview.emergentagent.com')


class TestPublicLayoutIconsAPI:
    """Public endpoint: GET /api/ticker/layout-icons"""
    
    def test_get_layout_icons_returns_200(self):
        """GET /api/ticker/layout-icons should return 200"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/ticker/layout-icons returns 200")
    
    def test_layout_icons_has_all_4_layouts(self):
        """Response should contain icons for all 4 layouts"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        data = response.json()
        expected_layouts = ['mosaic_community', 'living_grid', 'cinematic', 'horizon']
        for layout in expected_layouts:
            assert layout in data, f"Missing layout: {layout}"
        print(f"✓ All 4 layouts present: {expected_layouts}")
    
    def test_mosaic_community_has_6_default_icons(self):
        """mosaic_community layout should have 6 default icons"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        data = response.json()
        icons = data.get('mosaic_community', [])
        assert len(icons) == 6, f"Expected 6 icons, got {len(icons)}"
        print(f"✓ mosaic_community has 6 icons")
    
    def test_mosaic_community_icon_structure(self):
        """Each mosaic_community icon should have required fields"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        data = response.json()
        icons = data.get('mosaic_community', [])
        required_fields = ['key', 'label', 'to', 'type', 'icon', 'accent', 'accent_bg']
        
        for icon in icons:
            for field in required_fields:
                assert field in icon, f"Icon missing field: {field}"
        print(f"✓ All icons have required fields: {required_fields}")
    
    def test_mosaic_community_icon_keys(self):
        """Verify the 6 cultural nav icons are correct"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        data = response.json()
        icons = data.get('mosaic_community', [])
        expected_keys = ['pinpan', 'tienda', 'ranking', 'aprender', 'cultura', 'fe']
        actual_keys = [icon.get('key') for icon in icons]
        
        for key in expected_keys:
            assert key in actual_keys, f"Missing icon key: {key}"
        print(f"✓ All 6 cultural nav icons present: {expected_keys}")


class TestAdminLayoutIconsAPI:
    """Admin endpoint: GET /api/admin/ticker/layout-icons"""
    
    def test_admin_get_layout_icons_returns_200(self):
        """GET /api/admin/ticker/layout-icons should return 200 (no auth required for read)"""
        response = requests.get(f"{BASE_URL}/api/admin/ticker/layout-icons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/admin/ticker/layout-icons returns 200")
    
    def test_admin_response_structure(self):
        """Admin endpoint should return defaults, custom, and resolved"""
        response = requests.get(f"{BASE_URL}/api/admin/ticker/layout-icons")
        data = response.json()
        
        assert 'defaults' in data, "Missing 'defaults' in response"
        assert 'custom' in data, "Missing 'custom' in response"
        assert 'resolved' in data, "Missing 'resolved' in response"
        print("✓ Admin response has defaults, custom, resolved structure")
    
    def test_admin_defaults_match_public(self):
        """Admin 'resolved' should match public API when no custom config"""
        admin_response = requests.get(f"{BASE_URL}/api/admin/ticker/layout-icons")
        public_response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        
        admin_resolved = admin_response.json().get('resolved', {})
        public_data = public_response.json()
        
        # Compare mosaic_community icons count
        admin_mc_count = len(admin_resolved.get('mosaic_community', []))
        public_mc_count = len(public_data.get('mosaic_community', []))
        
        assert admin_mc_count == public_mc_count, f"Icon count mismatch: admin={admin_mc_count}, public={public_mc_count}"
        print("✓ Admin 'resolved' matches public API data")


class TestUIStyleLayout:
    """Verify mosaic_community layout is active"""
    
    def test_ui_style_returns_200(self):
        """GET /api/public/ui-style should return 200"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/public/ui-style returns 200")
    
    def test_mosaic_community_is_active_layout(self):
        """Active layout should be mosaic_community"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        data = response.json()
        
        # Layout can be in data.layout or data.public.layout
        layout = data.get('layout') or data.get('public', {}).get('layout')
        assert layout == 'mosaic_community', f"Expected layout 'mosaic_community', got '{layout}'"
        print("✓ Active layout is 'mosaic_community'")


class TestPutLayoutIconsAPI:
    """PUT endpoint: PUT /api/admin/ticker/layout-icons/{layout_id}"""
    
    def test_put_layout_icons_returns_200(self):
        """PUT /api/admin/ticker/layout-icons/mosaic_community should return 200 with status ok"""
        test_icons = [
            {"key": "test_icon", "label": "Test", "to": "/test", "type": "lucide", "icon": "Star", "image_url": "", "accent": "#000000", "accent_bg": "#FFFFFF"}
        ]
        response = requests.put(
            f"{BASE_URL}/api/admin/ticker/layout-icons/mosaic_community",
            json={"icons": test_icons}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('status') == 'ok', "Expected status 'ok'"
        assert data.get('layout_id') == 'mosaic_community', "Expected layout_id 'mosaic_community'"
        print("✓ PUT /api/admin/ticker/layout-icons/mosaic_community returns 200 with status ok")
    
    def test_put_layout_icons_persists_changes(self):
        """PUT should persist icon changes and reflect in GET"""
        # First restore original icons
        original_icons = [
            {"key": "pinpan", "label": "PinPan", "to": "/pinpanclub", "type": "lucide", "icon": "Gamepad2", "image_url": "", "accent": "#d97706", "accent_bg": "#FFF7ED"},
            {"key": "tienda", "label": "Tienda", "to": "/unatienda", "type": "lucide", "icon": "Store", "image_url": "", "accent": "#059669", "accent_bg": "#ECFDF5"},
            {"key": "ranking", "label": "Ranking", "to": "/pinpanclub/superpin/ranking", "type": "lucide", "icon": "Trophy", "image_url": "", "accent": "#C8102E", "accent_bg": "#FFF1F2"},
            {"key": "aprender", "label": "Aprender", "to": "/comunidad", "type": "lucide", "icon": "GraduationCap", "image_url": "", "accent": "#7c3aed", "accent_bg": "#F5F3FF"},
            {"key": "cultura", "label": "Cultura", "to": "/galeria", "type": "lucide", "icon": "Globe", "image_url": "", "accent": "#0284c7", "accent_bg": "#F0F9FF"},
            {"key": "fe", "label": "Fe", "to": "/comunidad", "type": "lucide", "icon": "Heart", "image_url": "", "accent": "#ec4899", "accent_bg": "#FDF2F8"},
        ]
        put_response = requests.put(
            f"{BASE_URL}/api/admin/ticker/layout-icons/mosaic_community",
            json={"icons": original_icons}
        )
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}"
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        data = get_response.json()
        assert len(data.get('mosaic_community', [])) == 6, "Expected 6 icons after PUT"
        print("✓ PUT persists changes and GET reflects updated icons")


class TestLandingPageIntegration:
    """Test landing page loads with dynamic icons"""
    
    def test_landing_images_api_works(self):
        """GET /api/ticker/landing-images should return 200"""
        response = requests.get(f"{BASE_URL}/api/ticker/landing-images")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/ticker/landing-images returns 200")
    
    def test_landing_images_has_mosaic_keys(self):
        """Landing images should include mosaic-specific keys"""
        response = requests.get(f"{BASE_URL}/api/ticker/landing-images")
        data = response.json()
        
        mosaic_keys = ['mosaic_pingpong_chess', 'mosaic_kids_learning', 'mosaic_culture', 'mosaic_gathering']
        for key in mosaic_keys:
            assert key in data, f"Missing mosaic image key: {key}"
        print(f"✓ All mosaic image keys present: {mosaic_keys}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
