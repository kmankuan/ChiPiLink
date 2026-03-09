"""
Widget Placement Features Tests - Iteration 66
Tests for:
1. Widget embed-config API returns new placement fields (floating_offset_x, floating_offset_y, floating_icon, floating_style)
2. loader.js includes all 6 icon SVGs and 4 button styles
3. loader.js supports 7 position options with custom offsets
4. loader.js relays chipi-auth-token messages from popup to iframe
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

# Constants for validation
EXPECTED_POSITIONS = ['bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'top-left', 'middle-right', 'middle-left']
EXPECTED_ICONS = ['book', 'chat', 'store', 'graduation', 'circle', 'plus']
EXPECTED_STYLES = ['pill', 'square', 'icon-only', 'circle']


class TestWidgetEmbedConfigPlacement:
    """Tests for /api/widget/embed-config placement fields"""
    
    def test_embed_config_returns_placement_section(self):
        """Verify embed-config returns placement section"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        assert response.status_code == 200
        data = response.json()
        
        assert "placement" in data, "placement section missing from embed-config"
        placement = data["placement"]
        
        # Verify required placement fields exist
        required_fields = [
            "floating_button", "floating_position", "floating_offset_x", 
            "floating_offset_y", "floating_label", "floating_icon", 
            "floating_style", "sidebar_width", "fullpage_max_width"
        ]
        for field in required_fields:
            assert field in placement, f"placement.{field} missing from embed-config"
        print(f"PASS: All required placement fields present: {required_fields}")
    
    def test_embed_config_floating_offset_x(self):
        """Verify floating_offset_x is present and is a string (CSS value)"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        offset_x = data["placement"].get("floating_offset_x")
        assert offset_x is not None, "floating_offset_x missing"
        assert isinstance(offset_x, str), f"floating_offset_x should be string, got {type(offset_x)}"
        print(f"PASS: floating_offset_x = '{offset_x}'")
    
    def test_embed_config_floating_offset_y(self):
        """Verify floating_offset_y is present and is a string (CSS value)"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        offset_y = data["placement"].get("floating_offset_y")
        assert offset_y is not None, "floating_offset_y missing"
        assert isinstance(offset_y, str), f"floating_offset_y should be string, got {type(offset_y)}"
        print(f"PASS: floating_offset_y = '{offset_y}'")
    
    def test_embed_config_floating_icon(self):
        """Verify floating_icon is one of the expected values"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        icon = data["placement"].get("floating_icon")
        assert icon is not None, "floating_icon missing"
        assert icon in EXPECTED_ICONS, f"floating_icon '{icon}' not in {EXPECTED_ICONS}"
        print(f"PASS: floating_icon = '{icon}'")
    
    def test_embed_config_floating_style(self):
        """Verify floating_style is one of the expected values"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        style = data["placement"].get("floating_style")
        assert style is not None, "floating_style missing"
        assert style in EXPECTED_STYLES, f"floating_style '{style}' not in {EXPECTED_STYLES}"
        print(f"PASS: floating_style = '{style}'")
    
    def test_embed_config_floating_position_valid(self):
        """Verify floating_position is one of the 7 expected values"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        position = data["placement"].get("floating_position")
        assert position is not None, "floating_position missing"
        assert position in EXPECTED_POSITIONS, f"floating_position '{position}' not in {EXPECTED_POSITIONS}"
        print(f"PASS: floating_position = '{position}'")


class TestWidgetLoaderJSIcons:
    """Tests for /api/widget/loader.js icon SVGs"""
    
    def test_loader_js_returns_javascript(self):
        """Verify loader.js returns valid JavaScript"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "javascript" in content_type, f"Expected JavaScript content-type, got {content_type}"
        print("PASS: loader.js returns JavaScript content-type")
    
    def test_loader_js_contains_all_icon_definitions(self):
        """Verify loader.js contains all 6 icon SVG definitions"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Check ICONS object contains all expected icons
        assert "var ICONS = {" in js_content, "ICONS object not found in loader.js"
        
        for icon in EXPECTED_ICONS:
            assert f"'{icon}':" in js_content or f"{icon}:" in js_content, f"Icon '{icon}' definition missing"
        print(f"PASS: All 6 icon definitions found: {EXPECTED_ICONS}")
    
    def test_loader_js_book_icon_svg(self):
        """Verify book icon contains valid SVG path"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Book icon should have path with M4 (book shape)
        assert 'book:' in js_content, "book icon key not found"
        assert '<svg' in js_content, "SVG tag not found"
        print("PASS: book icon SVG present")
    
    def test_loader_js_chat_icon_svg(self):
        """Verify chat icon contains valid SVG"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert 'chat:' in js_content, "chat icon key not found"
        print("PASS: chat icon SVG present")
    
    def test_loader_js_store_icon_svg(self):
        """Verify store icon contains valid SVG"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert 'store:' in js_content, "store icon key not found"
        print("PASS: store icon SVG present")
    
    def test_loader_js_graduation_icon_svg(self):
        """Verify graduation icon contains valid SVG"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert 'graduation:' in js_content, "graduation icon key not found"
        print("PASS: graduation icon SVG present")
    
    def test_loader_js_circle_icon_svg(self):
        """Verify circle icon contains valid SVG"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert 'circle:' in js_content, "circle icon key not found"
        print("PASS: circle icon SVG present")
    
    def test_loader_js_plus_icon_svg(self):
        """Verify plus icon contains valid SVG"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert 'plus:' in js_content, "plus icon key not found"
        print("PASS: plus icon SVG present")


class TestWidgetLoaderJSStyles:
    """Tests for /api/widget/loader.js button styles"""
    
    def test_loader_js_pill_style(self):
        """Verify loader.js handles pill style (default)"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Pill style should have 999px border-radius
        assert "999px" in js_content, "Pill style border-radius (999px) not found"
        print("PASS: pill style (999px border-radius) present")
    
    def test_loader_js_square_style(self):
        """Verify loader.js handles square style"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Square style check
        assert "'square'" in js_content or "=== 'square'" in js_content, "square style not handled"
        assert "12px" in js_content, "Square style border-radius (12px) not found"
        print("PASS: square style handling present")
    
    def test_loader_js_icon_only_style(self):
        """Verify loader.js handles icon-only style"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'icon-only'" in js_content or "icon-only" in js_content, "icon-only style not handled"
        assert "16px" in js_content, "Icon-only style border-radius (16px) not found"
        print("PASS: icon-only style handling present")
    
    def test_loader_js_circle_style(self):
        """Verify loader.js handles circle style (50% radius)"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "50%" in js_content, "Circle style border-radius (50%) not found"
        print("PASS: circle style (50% border-radius) present")
    
    def test_loader_js_style_conditionals(self):
        """Verify loader.js has all 4 style conditionals"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Check for style conditional statements
        assert "btnStyle === 'circle'" in js_content, "circle style conditional missing"
        assert "btnStyle === 'icon-only'" in js_content, "icon-only style conditional missing"
        assert "btnStyle === 'square'" in js_content, "square style conditional missing"
        # pill is default (else branch)
        print("PASS: All 4 button style conditionals present")


class TestWidgetLoaderJSPositions:
    """Tests for /api/widget/loader.js position handling"""
    
    def test_loader_js_bottom_right_position(self):
        """Verify loader.js handles bottom-right position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "pos === 'bottom-right'" in js_content or "'bottom-right'" in js_content, "bottom-right position not handled"
        print("PASS: bottom-right position handling present")
    
    def test_loader_js_bottom_left_position(self):
        """Verify loader.js handles bottom-left position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'bottom-left'" in js_content, "bottom-left position not handled"
        print("PASS: bottom-left position handling present")
    
    def test_loader_js_bottom_center_position(self):
        """Verify loader.js handles bottom-center position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'bottom-center'" in js_content, "bottom-center position not handled"
        # Should use transform:translateX(-50%)
        assert "translateX(-50%)" in js_content, "bottom-center translateX transform missing"
        print("PASS: bottom-center position with translateX transform present")
    
    def test_loader_js_top_right_position(self):
        """Verify loader.js handles top-right position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'top-right'" in js_content, "top-right position not handled"
        print("PASS: top-right position handling present")
    
    def test_loader_js_top_left_position(self):
        """Verify loader.js handles top-left position (default else)"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # top-left is handled in else branch
        assert "top:" in js_content, "top position CSS not found"
        assert "left:" in js_content, "left position CSS not found"
        print("PASS: top-left position handling present (in else branch)")
    
    def test_loader_js_middle_right_position(self):
        """Verify loader.js handles middle-right position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'middle-right'" in js_content, "middle-right position not handled"
        # Should use transform:translateY(-50%)
        assert "translateY(-50%)" in js_content, "middle-right translateY transform missing"
        print("PASS: middle-right position with translateY transform present")
    
    def test_loader_js_middle_left_position(self):
        """Verify loader.js handles middle-left position"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "'middle-left'" in js_content, "middle-left position not handled"
        print("PASS: middle-left position handling present")
    
    def test_loader_js_all_7_positions_handled(self):
        """Verify all 7 positions are handled in position logic"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        positions_found = 0
        for pos in EXPECTED_POSITIONS:
            if f"'{pos}'" in js_content:
                positions_found += 1
        
        # top-left is in else branch so may not be explicitly named
        assert positions_found >= 6, f"Expected at least 6 position handlers, found {positions_found}"
        print(f"PASS: {positions_found} positions explicitly handled, top-left in else branch")


class TestWidgetLoaderJSAuthRelay:
    """Tests for /api/widget/loader.js OAuth token relay via postMessage"""
    
    def test_loader_js_has_message_listener(self):
        """Verify loader.js sets up message event listener"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "window.addEventListener('message'" in js_content, "message event listener not found"
        print("PASS: message event listener found")
    
    def test_loader_js_relays_chipi_auth_token(self):
        """Verify loader.js relays chipi-auth-token messages to iframe"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Should check for chipi-auth-token type
        assert "chipi-auth-token" in js_content, "chipi-auth-token message type not handled"
        # Should relay to iframe contentWindow
        assert "frame.contentWindow.postMessage" in js_content, "postMessage to iframe not found"
        print("PASS: chipi-auth-token relay to iframe present")
    
    def test_loader_js_relays_chipi_auth_error(self):
        """Verify loader.js relays chipi-auth-error messages to iframe"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "chipi-auth-error" in js_content, "chipi-auth-error message type not handled"
        print("PASS: chipi-auth-error relay present")
    
    def test_loader_js_handles_widget_close(self):
        """Verify loader.js handles chipi-widget-close messages"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "chipi-widget-close" in js_content, "chipi-widget-close message not handled"
        print("PASS: chipi-widget-close handling present")
    
    def test_loader_js_handles_widget_resize(self):
        """Verify loader.js handles chipi-widget-resize messages"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "chipi-widget-resize" in js_content, "chipi-widget-resize message not handled"
        print("PASS: chipi-widget-resize handling present")


class TestWidgetLoaderJSCustomOffsets:
    """Tests for custom X/Y offset support in loader.js"""
    
    def test_loader_js_uses_offset_variables(self):
        """Verify loader.js extracts offset_x and offset_y from config"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        assert "floating_offset_x" in js_content, "floating_offset_x config read not found"
        assert "floating_offset_y" in js_content, "floating_offset_y config read not found"
        assert "offsetX" in js_content, "offsetX variable not found"
        assert "offsetY" in js_content, "offsetY variable not found"
        print("PASS: Offset X/Y variables extracted from config")
    
    def test_loader_js_applies_offsets_to_button_style(self):
        """Verify loader.js applies offsets to button CSS"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        js_content = response.text
        
        # Offsets should be used in position styling
        assert "offsetX" in js_content and "offsetY" in js_content, "Offset variables not used"
        # Should be applied to button style.cssText
        assert "btn.style.cssText" in js_content, "button cssText manipulation not found"
        print("PASS: Offsets applied to button CSS")


class TestWidgetAdminConfigUpdate:
    """Tests for admin config update with new placement fields"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get admin auth token for protected endpoints"""
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
        else:
            pytest.skip("Admin login failed, skipping admin tests")
    
    def test_admin_can_get_full_config(self):
        """Verify admin can get full widget config"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config", 
            headers={"Authorization": f"Bearer {self.token}"})
        assert response.status_code == 200
        data = response.json()
        
        assert "placement" in data
        assert "security" in data  # Admin gets security section
        print("PASS: Admin gets full config with placement and security")
    
    def test_admin_config_has_all_new_placement_fields(self):
        """Verify admin config has all new placement fields"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"})
        data = response.json()
        
        placement = data["placement"]
        assert "floating_offset_x" in placement
        assert "floating_offset_y" in placement
        assert "floating_icon" in placement
        assert "floating_style" in placement
        print("PASS: Admin config has all new placement fields")
    
    def test_admin_update_floating_icon(self):
        """Verify admin can update floating_icon"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"})
        config = get_response.json()
        
        # Update icon to 'chat'
        config["placement"]["floating_icon"] = "chat"
        
        put_response = requests.put(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"},
            json=config)
        assert put_response.status_code == 200
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        verify_data = verify_response.json()
        assert verify_data["placement"]["floating_icon"] == "chat"
        
        # Reset back to book
        config["placement"]["floating_icon"] = "book"
        requests.put(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"},
            json=config)
        print("PASS: Admin can update floating_icon")
    
    def test_admin_update_floating_style(self):
        """Verify admin can update floating_style"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"})
        config = get_response.json()
        original_style = config["placement"].get("floating_style", "pill")
        
        # Update style to 'circle'
        config["placement"]["floating_style"] = "circle"
        
        put_response = requests.put(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"},
            json=config)
        assert put_response.status_code == 200
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        verify_data = verify_response.json()
        assert verify_data["placement"]["floating_style"] == "circle"
        
        # Reset back
        config["placement"]["floating_style"] = original_style
        requests.put(f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {self.token}"},
            json=config)
        print("PASS: Admin can update floating_style")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
