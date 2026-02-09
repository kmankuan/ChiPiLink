"""
Widget Display Configuration Tests
Tests the new widget display options: hide_url_bar, hide_navbar, hide_footer, 
streamlined_flow, and wallet feature.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials from previous testing iterations
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token") or response.json().get("token")
    pytest.skip("Admin authentication failed")


class TestPublicEmbedConfig:
    """Test the public embed-config endpoint (no auth required)"""
    
    def test_embed_config_returns_200(self):
        """GET /api/widget/embed-config returns 200"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ Embed config returns 200")
    
    def test_embed_config_has_display_section(self):
        """Embed config contains display section with all display options"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        assert response.status_code == 200
        data = response.json()
        
        assert "display" in data, "Missing 'display' section in embed config"
        display = data["display"]
        
        # Check all required display options
        assert "hide_url_bar" in display, "Missing hide_url_bar in display"
        assert "hide_navbar" in display, "Missing hide_navbar in display"
        assert "hide_footer" in display, "Missing hide_footer in display"
        assert "streamlined_flow" in display, "Missing streamlined_flow in display"
        
        print(f"✓ Display section contains: {list(display.keys())}")
    
    def test_embed_config_has_wallet_feature(self):
        """Embed config includes wallet in features list"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        assert response.status_code == 200
        data = response.json()
        
        assert "features" in data, "Missing 'features' section"
        features = data["features"]
        
        assert "wallet" in features, "Wallet feature not found in features list"
        wallet = features["wallet"]
        assert "label" in wallet, "Wallet feature missing label"
        assert "order" in wallet, "Wallet feature missing order"
        
        print(f"✓ Wallet feature present: {wallet}")
    
    def test_display_options_are_booleans(self):
        """Display options have correct boolean types"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        display = data.get("display", {})
        
        assert isinstance(display.get("hide_url_bar"), bool), "hide_url_bar should be boolean"
        assert isinstance(display.get("hide_navbar"), bool), "hide_navbar should be boolean"
        assert isinstance(display.get("hide_footer"), bool), "hide_footer should be boolean"
        assert isinstance(display.get("streamlined_flow"), bool), "streamlined_flow should be boolean"
        
        print(f"✓ All display options are boolean type")
    
    def test_embed_config_has_enabled_flag(self):
        """Embed config has enabled flag"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        assert "enabled" in data, "Missing 'enabled' flag"
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        print(f"✓ Widget enabled: {data['enabled']}")
    
    def test_embed_config_has_appearance(self):
        """Embed config has appearance settings"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        assert "appearance" in data, "Missing 'appearance' section"
        appearance = data["appearance"]
        
        assert "primary_color" in appearance, "Missing primary_color"
        assert "accent_color" in appearance, "Missing accent_color"
        assert "font_family" in appearance, "Missing font_family"
        
        print(f"✓ Appearance: primary={appearance.get('primary_color')}, accent={appearance.get('accent_color')}")
    
    def test_embed_config_has_placement(self):
        """Embed config has placement settings"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        
        assert "placement" in data, "Missing 'placement' section"
        placement = data["placement"]
        
        assert "floating_button" in placement, "Missing floating_button"
        assert "floating_position" in placement, "Missing floating_position"
        assert "sidebar_width" in placement, "Missing sidebar_width"
        
        print(f"✓ Placement: floating={placement.get('floating_button')}, position={placement.get('floating_position')}")


class TestAdminWidgetConfig:
    """Test admin widget config endpoints (require auth)"""
    
    def test_admin_config_requires_auth(self):
        """GET /api/widget/admin/config requires authentication"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Admin config requires auth")
    
    def test_admin_config_returns_full_config(self, admin_token):
        """Admin config returns full widget configuration"""
        response = requests.get(
            f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "enabled" in data
        assert "features" in data
        assert "display" in data
        assert "appearance" in data
        assert "placement" in data
        assert "security" in data  # Admin gets security section
        
        print("✓ Admin config returns all sections including security")
    
    def test_admin_config_has_display_options(self, admin_token):
        """Admin config contains all display options"""
        response = requests.get(
            f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        data = response.json()
        display = data.get("display", {})
        
        expected_options = ["hide_url_bar", "hide_navbar", "hide_footer", "streamlined_flow"]
        for opt in expected_options:
            assert opt in display, f"Missing {opt} in admin display config"
        
        print(f"✓ Admin display options: {display}")
    
    def test_admin_can_update_display_options(self, admin_token):
        """Admin can update display options via PUT"""
        # First get current config
        get_response = requests.get(
            f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_config = get_response.json()
        
        # Update display options
        current_config["display"]["hide_url_bar"] = True
        current_config["display"]["hide_navbar"] = True
        current_config["display"]["streamlined_flow"] = True
        
        put_response = requests.put(
            f"{BASE_URL}/api/widget/admin/config",
            json=current_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200, f"Expected 200, got {put_response.status_code}"
        
        # Verify the update persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_config = verify_response.json()
        
        assert updated_config["display"]["hide_url_bar"] == True
        assert updated_config["display"]["hide_navbar"] == True
        assert updated_config["display"]["streamlined_flow"] == True
        
        print("✓ Admin can update display options and changes persist")
    
    def test_admin_can_update_wallet_feature(self, admin_token):
        """Admin can enable/disable wallet feature"""
        # Get current config
        get_response = requests.get(
            f"{BASE_URL}/api/widget/admin/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_config = get_response.json()
        
        # Ensure wallet is enabled
        if "wallet" not in current_config.get("features", {}):
            current_config["features"]["wallet"] = {"enabled": True, "label": "Wallet", "order": 4}
        else:
            current_config["features"]["wallet"]["enabled"] = True
        
        put_response = requests.put(
            f"{BASE_URL}/api/widget/admin/config",
            json=current_config,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert put_response.status_code == 200
        
        # Verify in public config
        public_response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        public_data = public_response.json()
        
        assert "wallet" in public_data.get("features", {}), "Wallet should appear in public features"
        print("✓ Wallet feature can be toggled and appears in public config")


class TestWidgetReset:
    """Test widget reset functionality"""
    
    def test_reset_requires_auth(self):
        """POST /api/widget/admin/config/reset requires authentication"""
        response = requests.post(f"{BASE_URL}/api/widget/admin/config/reset")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Reset endpoint requires auth")
    
    def test_reset_returns_default_config(self, admin_token):
        """Reset returns config with default display settings"""
        response = requests.post(
            f"{BASE_URL}/api/widget/admin/config/reset",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        
        # Check display defaults
        assert "display" in data, "Reset should return display section"
        display = data["display"]
        
        # Default values should be True
        assert display.get("hide_url_bar") == True, "Default hide_url_bar should be True"
        assert display.get("hide_navbar") == True, "Default hide_navbar should be True"
        assert display.get("hide_footer") == True, "Default hide_footer should be True"
        assert display.get("streamlined_flow") == True, "Default streamlined_flow should be True"
        
        # Check wallet feature is present
        assert "wallet" in data.get("features", {}), "Reset should include wallet feature"
        
        print("✓ Reset returns config with correct display defaults and wallet feature")


class TestFeatureFlags:
    """Test feature flags in config"""
    
    def test_all_default_features_present(self):
        """All default features should be present"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        features = data.get("features", {})
        
        expected_features = ["textbook_orders", "my_students", "order_status", "notifications", "wallet"]
        for feat in expected_features:
            assert feat in features, f"Missing feature: {feat}"
        
        print(f"✓ All {len(expected_features)} default features present")
    
    def test_features_have_label_and_order(self):
        """Each feature has label and order properties"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        features = data.get("features", {})
        
        for key, feat in features.items():
            assert "label" in feat, f"Feature {key} missing label"
            assert "order" in feat, f"Feature {key} missing order"
        
        print("✓ All features have label and order properties")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
