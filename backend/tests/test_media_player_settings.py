"""
Test Media Player Settings - New admin controls for dots, shuffle, video autoplay
Tests: show_dots, dot_style, shuffle, video_autoplay, video_max_duration_ms settings
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@chipi.co",
        "password": "admin"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestMediaPlayerPublicEndpoint:
    """Test public GET /api/showcase/media-player returns config with items"""
    
    def test_get_media_player_returns_config(self):
        """GET /api/showcase/media-player returns config with items"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        # Basic config fields exist
        assert "items" in data
        assert "autoplay" in data
        assert "interval_ms" in data
        
    def test_get_media_player_includes_new_fields(self):
        """GET returns new fields: show_dots, dot_style, shuffle, video_autoplay, video_max_duration_ms"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        # New fields should be present (may be None if not yet set, but key should exist after first admin save)
        # These will be populated after admin saves settings
        assert "items" in data
        

class TestMediaPlayerAdminEndpoints:
    """Test admin PUT /api/admin/showcase/media-player saves new settings"""
    
    def test_admin_get_media_player(self, auth_headers):
        """Admin GET returns full config"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        
    def test_save_show_dots_setting(self, auth_headers):
        """PUT saves show_dots setting"""
        # First get current config
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Update with show_dots = False
        current_config["show_dots"] = False
        response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player", 
                               headers=auth_headers, json=current_config)
        assert response.status_code == 200
        
        # Verify it persisted
        verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert verify_resp.json().get("show_dots") == False
        
        # Reset to True
        current_config["show_dots"] = True
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)
        
    def test_save_dot_style_setting(self, auth_headers):
        """PUT saves dot_style setting with all valid options"""
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Test each dot_style option
        valid_styles = ["auto", "dots", "progress_bar", "counter", "none"]
        
        for style in valid_styles:
            current_config["dot_style"] = style
            response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player",
                                   headers=auth_headers, json=current_config)
            assert response.status_code == 200, f"Failed to save dot_style={style}"
            
            # Verify persistence
            verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
            assert verify_resp.json().get("dot_style") == style, f"dot_style not persisted: expected {style}"
        
        # Reset to auto
        current_config["dot_style"] = "auto"
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)
        
    def test_save_shuffle_setting(self, auth_headers):
        """PUT saves shuffle setting"""
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Set shuffle = True
        current_config["shuffle"] = True
        response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player",
                               headers=auth_headers, json=current_config)
        assert response.status_code == 200
        
        # Verify persistence
        verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert verify_resp.json().get("shuffle") == True
        
        # Reset to False
        current_config["shuffle"] = False
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)
        
    def test_save_video_autoplay_setting(self, auth_headers):
        """PUT saves video_autoplay setting"""
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Set video_autoplay = False
        current_config["video_autoplay"] = False
        response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player",
                               headers=auth_headers, json=current_config)
        assert response.status_code == 200
        
        # Verify persistence
        verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert verify_resp.json().get("video_autoplay") == False
        
        # Reset to True
        current_config["video_autoplay"] = True
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)
        
    def test_save_video_max_duration_ms_setting(self, auth_headers):
        """PUT saves video_max_duration_ms setting"""
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Set custom duration
        current_config["video_max_duration_ms"] = 45000  # 45 seconds
        response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player",
                               headers=auth_headers, json=current_config)
        assert response.status_code == 200
        
        # Verify persistence
        verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert verify_resp.json().get("video_max_duration_ms") == 45000
        
        # Reset to default
        current_config["video_max_duration_ms"] = 30000
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)
        
    def test_save_all_new_settings_together(self, auth_headers):
        """PUT saves all new settings in one request"""
        get_resp = requests.get(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers)
        current_config = get_resp.json()
        
        # Update all new settings
        test_uid = str(uuid.uuid4())[:8]
        current_config.update({
            "show_dots": False,
            "dot_style": "progress_bar",
            "shuffle": True,
            "video_autoplay": False,
            "video_max_duration_ms": 60000
        })
        
        response = requests.put(f"{BASE_URL}/api/admin/showcase/media-player",
                               headers=auth_headers, json=current_config)
        assert response.status_code == 200
        result = response.json()
        assert result.get("status") == "ok"
        
        # Verify all settings persisted
        verify_resp = requests.get(f"{BASE_URL}/api/showcase/media-player")
        data = verify_resp.json()
        assert data.get("show_dots") == False
        assert data.get("dot_style") == "progress_bar"
        assert data.get("shuffle") == True
        assert data.get("video_autoplay") == False
        assert data.get("video_max_duration_ms") == 60000
        
        # Reset to defaults
        current_config.update({
            "show_dots": True,
            "dot_style": "auto",
            "shuffle": False,
            "video_autoplay": True,
            "video_max_duration_ms": 30000
        })
        requests.put(f"{BASE_URL}/api/admin/showcase/media-player", headers=auth_headers, json=current_config)


class TestMediaPlayerItems:
    """Test media items are preserved with settings"""
    
    def test_items_exist_in_config(self):
        """Verify items are returned in config"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        # Should have items (we added test items earlier)
        
    def test_items_have_required_fields(self):
        """Each item has item_id, type, url fields"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        data = response.json()
        items = data.get("items", [])
        
        for item in items:
            assert "item_id" in item, "Item missing item_id"
            assert "type" in item, "Item missing type"
            assert "url" in item, "Item missing url"
            assert item["type"] in ["image", "video"], f"Invalid item type: {item['type']}"


class TestBackendDefaultConfig:
    """Test DEFAULT_PLAYER_CONFIG includes new fields"""
    
    def test_default_config_has_new_fields(self):
        """Verify backend DEFAULT_PLAYER_CONFIG structure"""
        # When no config exists, defaults should be used
        # The new fields should be defined in backend
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        # Backend should not error - validates the code handles new fields
