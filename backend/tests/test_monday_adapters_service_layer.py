"""
Test Monday.com Adapters and Service Layer Refactoring
Tests:
- PinPanClub adapter config GET/PUT (/api/monday/adapters/pinpanclub/config)
- Memberships adapter config GET/PUT (/api/monday/adapters/memberships/config)
- Module status service layer (/api/admin/module-status, /api/public/module-status)
- UI style service layer (/api/admin/ui-style, /api/public/ui-style)
- Inventory dashboard (/api/store/inventory/dashboard)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@libreria.com", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip("Admin login failed - skipping authenticated tests")

@pytest.fixture
def auth_headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPinPanClubAdapterConfig:
    """Test PinPanClub Monday.com adapter config endpoints"""
    
    def test_get_pinpanclub_config(self, auth_headers):
        """GET /api/monday/adapters/pinpanclub/config - should return config with players_board_id, matches_board_id, auto_sync flags"""
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/pinpanclub/config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "config" in data, "Response should contain 'config' field"
        assert "module" in data, "Response should contain 'module' field"
        assert data["module"] == "pinpanclub"
        
        config = data["config"]
        # Verify expected fields exist (can be null if not configured)
        expected_fields = ["players_board_id", "matches_board_id", "auto_sync_players", "auto_sync_matches", "auto_sync_results"]
        for field in expected_fields:
            assert field in config, f"Config should contain '{field}' field"
        
        print(f"PinPanClub config: {config}")
    
    def test_update_pinpanclub_config(self, auth_headers):
        """PUT /api/monday/adapters/pinpanclub/config - should save config successfully"""
        new_config = {
            "config": {
                "players_board_id": "TEST_12345",
                "matches_board_id": "TEST_67890",
                "tournaments_board_id": None,
                "auto_sync_players": True,
                "auto_sync_matches": True,
                "auto_sync_results": False
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/monday/adapters/pinpanclub/config",
            headers=auth_headers,
            json=new_config
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify config was saved by reading it back
        get_response = requests.get(
            f"{BASE_URL}/api/monday/adapters/pinpanclub/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        saved_config = get_response.json()["config"]
        assert saved_config["players_board_id"] == "TEST_12345"
        assert saved_config["matches_board_id"] == "TEST_67890"
        assert saved_config["auto_sync_players"] == True
        
        print(f"Updated PinPanClub config successfully")
    
    def test_pinpanclub_config_requires_auth(self):
        """GET /api/monday/adapters/pinpanclub/config - should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/monday/adapters/pinpanclub/config")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestMembershipsAdapterConfig:
    """Test Memberships Monday.com adapter config endpoints"""
    
    def test_get_memberships_config(self, auth_headers):
        """GET /api/monday/adapters/memberships/config - should return config with board_id, column_mapping, enabled flag"""
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/memberships/config",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "config" in data, "Response should contain 'config' field"
        assert "module" in data, "Response should contain 'module' field"
        assert data["module"] == "memberships"
        
        config = data["config"]
        # Verify expected fields exist
        expected_fields = ["board_id", "column_mapping", "enabled"]
        for field in expected_fields:
            assert field in config, f"Config should contain '{field}' field"
        
        # column_mapping should be a dict
        assert isinstance(config["column_mapping"], dict), "column_mapping should be a dict"
        
        print(f"Memberships config: {config}")
    
    def test_update_memberships_config(self, auth_headers):
        """PUT /api/monday/adapters/memberships/config - should save config successfully"""
        new_config = {
            "config": {
                "board_id": "TEST_MEMBERS_123",
                "subscriptions_board_id": "TEST_SUBS_456",
                "column_mapping": {
                    "plan_name": "name",
                    "plan_type": "status",
                    "price": "numbers"
                },
                "auto_sync_plans": True,
                "auto_sync_subscriptions": False,
                "enabled": True
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/monday/adapters/memberships/config",
            headers=auth_headers,
            json=new_config
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Verify config was saved
        get_response = requests.get(
            f"{BASE_URL}/api/monday/adapters/memberships/config",
            headers=auth_headers
        )
        assert get_response.status_code == 200
        
        saved_config = get_response.json()["config"]
        assert saved_config["enabled"] == True
        
        print(f"Updated Memberships config successfully")
    
    def test_memberships_config_requires_auth(self):
        """GET /api/monday/adapters/memberships/config - should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/monday/adapters/memberships/config")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestModuleStatusServiceLayer:
    """Test module status endpoints using new service layer"""
    
    def test_get_admin_module_status(self, auth_headers):
        """GET /api/admin/module-status - should return statuses via service layer (admin auth)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/module-status",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "statuses" in data, "Response should contain 'statuses' field"
        assert "module_names" in data, "Response should contain 'module_names' field"
        assert "available_statuses" in data, "Response should contain 'available_statuses' field"
        
        # Verify known modules exist
        statuses = data["statuses"]
        assert "home" in statuses or "pinpanclub" in statuses, "Should contain known module statuses"
        
        print(f"Module statuses: {list(statuses.keys())}")
    
    def test_update_admin_module_status(self, auth_headers):
        """PUT /api/admin/module-status - should save via service layer (admin auth)"""
        new_statuses = {
            "statuses": {
                "home": {"status": "production", "customLabel": ""},
                "pinpanclub": {"status": "live_beta", "customLabel": "Testing Beta"}
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/module-status",
            headers=auth_headers,
            json=new_statuses
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        print("Module status update successful")
    
    def test_get_public_module_status(self):
        """GET /api/public/module-status - should return public statuses (no auth)"""
        response = requests.get(f"{BASE_URL}/api/public/module-status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "statuses" in data, "Response should contain 'statuses' field"
        
        statuses = data["statuses"]
        assert isinstance(statuses, dict), "Statuses should be a dict"
        
        print(f"Public module statuses count: {len(statuses)}")


class TestUIStyleServiceLayer:
    """Test UI style endpoints using new service layer"""
    
    def test_get_admin_ui_style(self, auth_headers):
        """GET /api/admin/ui-style - should return style via service layer (admin auth)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/ui-style",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "style" in data, "Response should contain 'style' field"
        assert "available_templates" in data, "Response should contain 'available_templates' field"
        
        style = data["style"]
        expected_fields = ["template", "primary_color", "font_family", "border_radius", "card_style"]
        for field in expected_fields:
            assert field in style, f"Style should contain '{field}' field"
        
        print(f"UI Style: template={style.get('template')}, color={style.get('primary_color')}")
    
    def test_update_admin_ui_style(self, auth_headers):
        """PUT /api/admin/ui-style - should save via service layer (admin auth)"""
        new_style = {
            "style": {
                "template": "elegant",
                "primary_color": "#7c3aed",
                "font_family": "Inter",
                "border_radius": "0.75rem",
                "card_style": "elevated"
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            headers=auth_headers,
            json=new_style
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # Reset to default after test
        reset_style = {
            "style": {
                "template": "default",
                "primary_color": "#16a34a",
                "font_family": "Inter",
                "border_radius": "0.75rem",
                "card_style": "elevated"
            }
        }
        requests.put(
            f"{BASE_URL}/api/admin/ui-style",
            headers=auth_headers,
            json=reset_style
        )
        
        print("UI style update successful")
    
    def test_get_public_ui_style(self):
        """GET /api/public/ui-style - should return public UI style (no auth)"""
        response = requests.get(f"{BASE_URL}/api/public/ui-style")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "style" in data, "Response should contain 'style' field"
        
        style = data["style"]
        assert "template" in style, "Style should contain 'template' field"
        
        print(f"Public UI Style: {style}")


class TestInventoryDashboard:
    """Test inventory dashboard endpoint"""
    
    def test_get_inventory_dashboard(self, auth_headers):
        """GET /api/store/inventory/dashboard - should return inventory stats (admin auth)"""
        response = requests.get(
            f"{BASE_URL}/api/store/inventory/dashboard",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify stats fields exist
        expected_fields = ["total_products", "total_stock", "total_value", "low_stock", "out_of_stock"]
        for field in expected_fields:
            assert field in data, f"Dashboard should contain '{field}' field"
        
        print(f"Inventory stats: products={data.get('total_products')}, stock={data.get('total_stock')}")
    
    def test_inventory_dashboard_requires_auth(self):
        """GET /api/store/inventory/dashboard - should require admin auth"""
        response = requests.get(f"{BASE_URL}/api/store/inventory/dashboard")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login(self):
        """POST /api/auth-v2/login - admin login should work with admin@libreria.com/admin"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "password": "admin"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data or "access_token" in data, "Response should contain token"
        
        # Verify user is admin
        user = data.get("user", {})
        assert user.get("is_admin") == True or user.get("role") == "admin", "User should be admin"
        
        print(f"Admin login successful: {user.get('email')}")
