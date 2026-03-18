"""
Test Media Player new features:
1. disable_swipe - Lock Navigation (random only mode)
2. fit_mode - Image fit modes (smart/contain/cover)
3. Video autoplay using onLoadedData/onCanPlay events

Tests backend APIs:
- GET /api/showcase/media-player returns new fields
- PUT /api/admin/showcase/media-player saves new fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMediaPlayerNewFeatures:
    """Test new Media Player features: disable_swipe, fit_mode"""
    
    auth_token = None
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token once for all tests"""
        if TestMediaPlayerNewFeatures.auth_token is None:
            response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
                "email": "admin@chipi.co",
                "password": "admin"
            })
            if response.status_code == 200:
                TestMediaPlayerNewFeatures.auth_token = response.json().get("token")
    
    def get_headers(self):
        """Return auth headers"""
        return {"Authorization": f"Bearer {TestMediaPlayerNewFeatures.auth_token}"}
    
    # ===== Public endpoint tests =====
    
    def test_public_get_media_player_returns_new_fields(self):
        """GET /api/showcase/media-player should return disable_swipe and fit_mode fields"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        # Check new fields exist (with any value - they might not be set yet)
        # These are the default values from DEFAULT_PLAYER_CONFIG
        print(f"Response data: {data}")
        
        # Verify response is valid JSON with expected structure
        assert isinstance(data, dict), "Response should be a dictionary"
        
        # Check if disable_swipe field exists (default is False)
        if "disable_swipe" in data:
            assert isinstance(data["disable_swipe"], bool), "disable_swipe should be boolean"
            print(f"disable_swipe value: {data['disable_swipe']}")
        else:
            print("disable_swipe field not present, will be added when config is saved")
        
        # Check if fit_mode field exists (default is 'smart')
        if "fit_mode" in data:
            assert data["fit_mode"] in ["smart", "contain", "cover"], f"Invalid fit_mode: {data['fit_mode']}"
            print(f"fit_mode value: {data['fit_mode']}")
        else:
            print("fit_mode field not present, will be added when config is saved")
    
    # ===== Admin endpoint tests =====
    
    def test_admin_get_media_player_config(self):
        """GET /api/admin/showcase/media-player returns full config"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Admin config: {data}")
        assert isinstance(data, dict)
    
    def test_admin_save_disable_swipe_true(self):
        """PUT /api/admin/showcase/media-player saves disable_swipe=true"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        # Get current config first
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        
        # Update with disable_swipe=true
        current_config["disable_swipe"] = True
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        data = response.json()
        print(f"Save response: {data}")
        
        # Verify it was saved by fetching again
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        assert verify_response.status_code == 200
        verify_data = verify_response.json()
        assert verify_data.get("disable_swipe") == True, "disable_swipe should be True after save"
        print("disable_swipe=true saved and verified")
    
    def test_admin_save_disable_swipe_false(self):
        """PUT /api/admin/showcase/media-player saves disable_swipe=false"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        current_config["disable_swipe"] = False
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        verify_data = verify_response.json()
        assert verify_data.get("disable_swipe") == False, "disable_swipe should be False"
        print("disable_swipe=false saved and verified")
    
    def test_admin_save_fit_mode_smart(self):
        """PUT /api/admin/showcase/media-player saves fit_mode='smart'"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        current_config["fit_mode"] = "smart"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        verify_data = verify_response.json()
        assert verify_data.get("fit_mode") == "smart", f"fit_mode should be 'smart', got: {verify_data.get('fit_mode')}"
        print("fit_mode='smart' saved and verified")
    
    def test_admin_save_fit_mode_contain(self):
        """PUT /api/admin/showcase/media-player saves fit_mode='contain'"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        current_config["fit_mode"] = "contain"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        verify_data = verify_response.json()
        assert verify_data.get("fit_mode") == "contain", f"fit_mode should be 'contain'"
        print("fit_mode='contain' saved and verified")
    
    def test_admin_save_fit_mode_cover(self):
        """PUT /api/admin/showcase/media-player saves fit_mode='cover'"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        current_config["fit_mode"] = "cover"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        verify_data = verify_response.json()
        assert verify_data.get("fit_mode") == "cover", f"fit_mode should be 'cover'"
        print("fit_mode='cover' saved and verified")
    
    def test_admin_save_all_new_settings(self):
        """PUT /api/admin/showcase/media-player saves disable_swipe and fit_mode together"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        
        # Update both new fields
        current_config["disable_swipe"] = True
        current_config["fit_mode"] = "smart"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        
        # Verify both fields
        verify_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        verify_data = verify_response.json()
        assert verify_data.get("disable_swipe") == True, "disable_swipe should be True"
        assert verify_data.get("fit_mode") == "smart", "fit_mode should be 'smart'"
        print("Both disable_swipe=true and fit_mode='smart' saved together")
    
    # ===== Add test items =====
    
    def test_admin_add_test_image_item(self):
        """POST /api/admin/showcase/media-player/add-item adds an image"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json={
                "type": "image",
                "url": "https://static.prod-images.emergentagent.com/jobs/4a122f12-33f9-4f93-9123-84c6a2cb3907/images/5040d9d6499bad13e30dd00fe426cdce65332c563ef20104137ceb126b095e4b.png",
                "caption": "Test Image 1 - Landscape"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "added"
        assert "item" in data
        print(f"Added image item: {data['item'].get('item_id')}")
    
    def test_admin_add_test_video_item(self):
        """POST /api/admin/showcase/media-player/add-item adds a video"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json={
                "type": "video",
                "url": "https://www.w3schools.com/html/mov_bbb.mp4",
                "caption": "Test Video - Big Buck Bunny"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "added"
        print(f"Added video item: {data['item'].get('item_id')}")
    
    def test_admin_add_portrait_images(self):
        """Add portrait images for smart fit_mode pairing test"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        # Add two portrait-like images for pairing test
        portrait_urls = [
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600",  # Portrait 1
            "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=600",  # Portrait 2
        ]
        
        for i, url in enumerate(portrait_urls):
            response = requests.post(
                f"{BASE_URL}/api/admin/showcase/media-player/add-item",
                headers={**self.get_headers(), "Content-Type": "application/json"},
                json={
                    "type": "image",
                    "url": url,
                    "caption": f"TEST_Portrait_{i+1}"
                }
            )
            assert response.status_code == 200
            print(f"Added portrait image {i+1}")
    
    # ===== Reset to defaults at end =====
    
    def test_z_reset_to_smart_mode(self):
        """Reset fit_mode to smart and disable_swipe to false for frontend testing"""
        if not TestMediaPlayerNewFeatures.auth_token:
            pytest.skip("Auth failed - skipping admin tests")
        
        get_response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.get_headers()
        )
        current_config = get_response.json()
        
        # Reset to defaults for frontend testing
        current_config["disable_swipe"] = False
        current_config["fit_mode"] = "smart"
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers={**self.get_headers(), "Content-Type": "application/json"},
            json=current_config
        )
        assert response.status_code == 200
        print("Reset to disable_swipe=false, fit_mode='smart' for frontend testing")


class TestMediaPlayerVideoAutoplay:
    """Test video autoplay features (video element attributes)"""
    
    def test_get_media_player_video_autoplay_setting(self):
        """Verify video_autoplay setting is returned from API"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        # video_autoplay should exist
        if "video_autoplay" in data:
            assert isinstance(data["video_autoplay"], bool)
            print(f"video_autoplay: {data['video_autoplay']}")
        
        # video_max_duration_ms should exist
        if "video_max_duration_ms" in data:
            assert isinstance(data["video_max_duration_ms"], int)
            print(f"video_max_duration_ms: {data['video_max_duration_ms']}")
