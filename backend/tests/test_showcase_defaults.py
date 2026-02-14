"""
Test Showcase Module - Default/Fallback Content Feature
Tests the seed_showcase_defaults function and fallback behavior when API returns empty.

Features tested:
1. Backend seed_showcase_defaults() seeds banners and media player items on startup
2. GET /api/showcase/banners - returns seeded default banners if none exist
3. GET /api/showcase/media-player - returns seeded default media items if none exist
4. Admin CRUD still works after seeding (create, delete banners/media items)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestShowcaseDefaults:
    """Test showcase module default/fallback content seeding"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try alternative auth endpoint
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_health_check(self):
        """Verify API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: API health check OK")
    
    def test_get_banners_returns_seeded_defaults(self):
        """GET /api/showcase/banners should return seeded default banners"""
        response = requests.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        
        # Should return at least 1 banner (seeded defaults or existing data)
        assert isinstance(data, list)
        assert len(data) >= 1, "Expected at least 1 banner to be returned"
        
        # Verify banner structure
        banner = data[0]
        assert "banner_id" in banner
        assert "type" in banner
        assert banner["type"] in ["image", "text"]
        
        print(f"PASS: GET /api/showcase/banners returns {len(data)} banners")
        print(f"First banner: id={banner['banner_id']}, type={banner['type']}")
    
    def test_get_media_player_returns_seeded_defaults(self):
        """GET /api/showcase/media-player should return seeded default media items"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        # Should return config with items
        assert "items" in data, "Expected 'items' key in media player response"
        items = data.get("items", [])
        assert len(items) >= 1, "Expected at least 1 media item"
        
        # Verify item structure
        item = items[0]
        assert "item_id" in item
        assert "type" in item
        assert "url" in item
        
        # Verify config properties
        assert "autoplay" in data
        assert "interval_ms" in data
        
        print(f"PASS: GET /api/showcase/media-player returns {len(items)} media items")
        print(f"First item: id={item['item_id']}, type={item['type']}")
    
    def test_banner_admin_create_still_works(self, admin_token):
        """POST /api/admin/showcase/banners should still work after seeding"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test banner
        test_banner = {
            "type": "text",
            "text": "TEST_Banner - Testing fallback feature",
            "bg_color": "#FF5733",
            "text_color": "#FFFFFF",
            "font_size": "lg",
            "active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            json=test_banner,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "banner_id" in data
        assert data["text"] == test_banner["text"]
        
        created_banner_id = data["banner_id"]
        print(f"PASS: Created test banner: {created_banner_id}")
        
        return created_banner_id
    
    def test_banner_admin_delete_still_works(self, admin_token):
        """DELETE /api/admin/showcase/banners/{id} should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First create a banner to delete
        test_banner = {
            "type": "text",
            "text": "TEST_Banner_ToDelete",
            "bg_color": "#333333",
            "active": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            json=test_banner,
            headers=headers
        )
        assert create_response.status_code == 200
        banner_id = create_response.json()["banner_id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/showcase/banners/{banner_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        print(f"PASS: Deleted test banner: {banner_id}")
    
    def test_media_player_add_item_still_works(self, admin_token):
        """POST /api/admin/showcase/media-player/add-item should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        test_item = {
            "type": "image",
            "url": "https://example.com/TEST_image.jpg",
            "caption": "TEST_MediaItem - Fallback test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            json=test_item,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("status") == "added"
        assert "item" in data
        
        created_item_id = data["item"]["item_id"]
        print(f"PASS: Added test media item: {created_item_id}")
        
        return created_item_id
    
    def test_media_player_delete_item_still_works(self, admin_token):
        """DELETE /api/admin/showcase/media-player/items/{id} should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First add an item to delete
        test_item = {
            "type": "image",
            "url": "https://example.com/TEST_delete_me.jpg",
            "caption": "TEST_ToDelete"
        }
        
        add_response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            json=test_item,
            headers=headers
        )
        assert add_response.status_code == 200
        item_id = add_response.json()["item"]["item_id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/showcase/media-player/items/{item_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        
        print(f"PASS: Deleted test media item: {item_id}")
    
    def test_banners_not_empty_after_seed(self):
        """Verify banners endpoint never returns empty array after seeding"""
        response = requests.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        
        # The main purpose of the fix - banners should never be empty
        assert len(data) > 0, "FAIL: Banners endpoint returns empty array - seed_showcase_defaults not working"
        
        print(f"PASS: Banners endpoint returns {len(data)} items (not empty)")
    
    def test_media_player_items_not_empty_after_seed(self):
        """Verify media player items never empty after seeding"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        
        items = data.get("items", [])
        # The main purpose of the fix - media items should never be empty
        assert len(items) > 0, "FAIL: Media player returns empty items - seed_showcase_defaults not working"
        
        print(f"PASS: Media player returns {len(items)} items (not empty)")


class TestCleanupTestData:
    """Clean up TEST_ prefixed data after tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_cleanup_test_banners(self, admin_token):
        """Clean up any TEST_ prefixed banners"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all banners
        response = requests.get(f"{BASE_URL}/api/admin/showcase/banners", headers=headers)
        if response.status_code != 200:
            print("SKIP: Could not get banners for cleanup")
            return
        
        banners = response.json()
        deleted = 0
        for banner in banners:
            text = banner.get("text", "") or banner.get("overlay_text", "")
            if text.startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/admin/showcase/banners/{banner['banner_id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"CLEANUP: Deleted {deleted} TEST_ banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
