"""
Widget Module Backend Tests
Tests for embeddable widget configuration APIs:
- GET /api/widget/embed-config (public)
- GET /api/widget/admin/config (authenticated)
- PUT /api/widget/admin/config (authenticated)
- GET /api/widget/loader.js (public, returns JS)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWidgetPublicEndpoints:
    """Tests for public (no auth) widget endpoints"""
    
    def test_embed_config_returns_200(self):
        """GET /api/widget/embed-config should return public widget config"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/widget/embed-config returns 200")
    
    def test_embed_config_has_enabled_flag(self):
        """Embed config should have 'enabled' boolean"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        assert "enabled" in data, "Missing 'enabled' field"
        assert isinstance(data["enabled"], bool), "'enabled' should be boolean"
        print(f"✓ embed-config.enabled = {data['enabled']}")
    
    def test_embed_config_has_features(self):
        """Embed config should have features with label and order"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        assert "features" in data, "Missing 'features' field"
        features = data["features"]
        
        # Should have 4 feature keys
        expected_features = ["textbook_orders", "my_students", "order_status", "notifications"]
        for feat in expected_features:
            assert feat in features, f"Missing feature: {feat}"
            assert "label" in features[feat], f"Feature {feat} missing label"
            assert "order" in features[feat], f"Feature {feat} missing order"
        print(f"✓ embed-config has {len(features)} features: {list(features.keys())}")
    
    def test_embed_config_has_appearance(self):
        """Embed config should have appearance settings"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        assert "appearance" in data, "Missing 'appearance' field"
        appearance = data["appearance"]
        
        expected_keys = ["primary_color", "accent_color", "font_family", "border_radius", "compact_mode"]
        for key in expected_keys:
            assert key in appearance, f"Missing appearance key: {key}"
        print(f"✓ embed-config.appearance has: {list(appearance.keys())}")
    
    def test_embed_config_has_placement(self):
        """Embed config should have placement settings"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        assert "placement" in data, "Missing 'placement' field"
        placement = data["placement"]
        
        expected_keys = ["floating_button", "floating_position", "floating_label", "sidebar_width", "fullpage_max_width"]
        for key in expected_keys:
            assert key in placement, f"Missing placement key: {key}"
        print(f"✓ embed-config.placement has: {list(placement.keys())}")
    
    def test_embed_config_no_security_section(self):
        """Public embed config should NOT include security section"""
        response = requests.get(f"{BASE_URL}/api/widget/embed-config")
        data = response.json()
        assert "security" not in data, "Public config should NOT expose security section"
        print("✓ embed-config does NOT expose security section (as expected)")
    
    def test_loader_js_returns_javascript(self):
        """GET /api/widget/loader.js should return valid JavaScript"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "application/javascript" in response.headers.get("content-type", ""), "Should return application/javascript"
        print("✓ GET /api/widget/loader.js returns JavaScript content-type")
    
    def test_loader_js_has_api_url(self):
        """loader.js should contain API_URL variable"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        content = response.text
        assert "var API_URL" in content, "loader.js should define API_URL variable"
        assert BASE_URL in content or "emergentagent.com" in content, "loader.js should contain correct API URL"
        print("✓ loader.js contains API_URL variable with correct base URL")
    
    def test_loader_js_has_config(self):
        """loader.js should contain embedded CONFIG object"""
        response = requests.get(f"{BASE_URL}/api/widget/loader.js")
        content = response.text
        assert "var CONFIG" in content, "loader.js should define CONFIG variable"
        assert '"enabled"' in content, "CONFIG should have enabled property"
        assert '"features"' in content, "CONFIG should have features property"
        print("✓ loader.js contains embedded CONFIG object with enabled/features")


class TestWidgetAdminEndpoints:
    """Tests for admin-authenticated widget endpoints"""
    
    @pytest.fixture(autouse=True)
    def get_auth_token(self):
        """Get admin auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "password": "admin"}
        )
        if response.status_code != 200:
            pytest.skip("Could not authenticate - skipping admin tests")
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_config_returns_200(self):
        """GET /api/widget/admin/config should return full config (authenticated)"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/widget/admin/config returns 200 (authenticated)")
    
    def test_admin_config_has_security_section(self):
        """Admin config should include security section with allowed_origins"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        data = response.json()
        assert "security" in data, "Admin config should have security section"
        assert "allowed_origins" in data["security"], "Security should have allowed_origins"
        assert isinstance(data["security"]["allowed_origins"], list), "allowed_origins should be a list"
        print(f"✓ admin/config.security.allowed_origins = {data['security']['allowed_origins']}")
    
    def test_admin_config_has_all_features_with_enabled_flag(self):
        """Admin config features should have enabled flag (not just label/order)"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        data = response.json()
        features = data.get("features", {})
        
        for key, feat in features.items():
            assert "enabled" in feat, f"Feature {key} should have enabled flag in admin config"
            assert "label" in feat, f"Feature {key} should have label"
            assert "order" in feat, f"Feature {key} should have order"
        print(f"✓ All {len(features)} features have enabled/label/order in admin config")
    
    def test_update_config_returns_200(self):
        """PUT /api/widget/admin/config should save and return updated config"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        current_config = get_response.json()
        
        # Update with same config (no changes, just test the endpoint works)
        response = requests.put(
            f"{BASE_URL}/api/widget/admin/config",
            headers={**self.headers, "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ PUT /api/widget/admin/config returns 200")
    
    def test_update_config_persists_changes(self):
        """PUT should persist config changes (test toggle then restore)"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        original_config = get_response.json()
        original_label = original_config["placement"]["floating_label"]
        
        # Update floating_label
        test_label = "TEST_WidgetLabel"
        updated_config = {**original_config}
        updated_config["placement"]["floating_label"] = test_label
        
        put_response = requests.put(
            f"{BASE_URL}/api/widget/admin/config",
            headers={**self.headers, "Content-Type": "application/json"},
            json=updated_config
        )
        assert put_response.status_code == 200
        
        # Verify change persisted
        verify_response = requests.get(f"{BASE_URL}/api/widget/admin/config", headers=self.headers)
        verify_data = verify_response.json()
        assert verify_data["placement"]["floating_label"] == test_label, "Config change did not persist"
        print(f"✓ Config change persisted: floating_label = {test_label}")
        
        # Restore original
        updated_config["placement"]["floating_label"] = original_label
        requests.put(
            f"{BASE_URL}/api/widget/admin/config",
            headers={**self.headers, "Content-Type": "application/json"},
            json=updated_config
        )
        print(f"✓ Restored original floating_label: {original_label}")
    
    def test_unauthenticated_admin_config_fails(self):
        """GET /api/widget/admin/config without auth should return 401/403"""
        response = requests.get(f"{BASE_URL}/api/widget/admin/config")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ admin/config without auth returns {response.status_code} (expected)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
