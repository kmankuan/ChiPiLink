"""
Test Showcase Module - Banner Carousel and Media Player APIs
Tests:
- GET /api/showcase/banners - Public banners endpoint
- GET /api/showcase/media-player - Public media player config
- POST /api/admin/showcase/banners - Create banner
- PUT /api/admin/showcase/banners/{id} - Update banner
- DELETE /api/admin/showcase/banners/{id} - Delete banner
- POST /api/admin/showcase/media-player/add-item - Add media item
- DELETE /api/admin/showcase/media-player/items/{id} - Delete media item
- PUT /api/admin/showcase/media-player - Update player settings
- POST /api/admin/showcase/media-player/fetch-album - Fetch Google Photos album
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope='module')
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPublicBannerEndpoints:
    """Test public banner carousel endpoints"""

    def test_get_banners_returns_200(self, api_client):
        """GET /api/showcase/banners should return 200"""
        response = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ GET /api/showcase/banners returned 200")

    def test_get_banners_returns_list(self, api_client):
        """GET /api/showcase/banners should return a list"""
        response = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✅ Banners endpoint returns list with {len(data)} items")

    def test_get_banners_has_demo_data(self, api_client):
        """GET /api/showcase/banners should have demo banners seeded"""
        response = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        # Should have 3 demo banners as per main agent context
        assert len(data) >= 3, f"Expected at least 3 demo banners, got {len(data)}"
        print(f"✅ Found {len(data)} active banners (expected ≥3)")

    def test_banners_have_required_fields(self, api_client):
        """Each banner should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            banner = data[0]
            assert "banner_id" in banner, "Banner missing banner_id"
            assert "type" in banner, "Banner missing type"
            assert "active" in banner, "Banner missing active"
            assert banner["type"] in ["image", "text"], f"Invalid banner type: {banner['type']}"
            print(f"✅ Banner has required fields: banner_id, type, active")
            print(f"   First banner type: {banner['type']}")
        else:
            pytest.skip("No banners to validate")


class TestPublicMediaPlayerEndpoints:
    """Test public media player endpoints"""

    def test_get_media_player_returns_200(self, api_client):
        """GET /api/showcase/media-player should return 200"""
        response = api_client.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✅ GET /api/showcase/media-player returned 200")

    def test_media_player_returns_config(self, api_client):
        """GET /api/showcase/media-player should return config object"""
        response = api_client.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"
        print(f"✅ Media player returns config object")

    def test_media_player_has_items(self, api_client):
        """GET /api/showcase/media-player should have demo items seeded"""
        response = api_client.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        # Should have 4 demo media items as per main agent context
        assert len(items) >= 4, f"Expected at least 4 demo media items, got {len(items)}"
        print(f"✅ Found {len(items)} media items (expected ≥4)")

    def test_media_items_have_required_fields(self, api_client):
        """Each media item should have required fields"""
        response = api_client.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        if len(items) > 0:
            item = items[0]
            assert "item_id" in item, "Media item missing item_id"
            assert "type" in item, "Media item missing type"
            assert "url" in item, "Media item missing url"
            assert item["type"] in ["image", "video"], f"Invalid media type: {item['type']}"
            print(f"✅ Media item has required fields: item_id, type, url")
            print(f"   First item type: {item['type']}")
        else:
            pytest.skip("No media items to validate")

    def test_media_player_config_fields(self, api_client):
        """Media player config should have playback settings"""
        response = api_client.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200
        data = response.json()
        # Check optional config fields
        print(f"✅ Media player config: autoplay={data.get('autoplay')}, interval_ms={data.get('interval_ms')}, show_controls={data.get('show_controls')}")


class TestAdminBannerEndpoints:
    """Test admin banner management endpoints"""

    def test_create_banner(self, api_client):
        """POST /api/admin/showcase/banners should create a new banner"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "type": "text",
            "text": f"TEST_Banner_{unique_id}",
            "bg_color": "#C8102E",
            "bg_gradient": "linear-gradient(135deg, #C8102E 0%, #8B0000 100%)",
            "text_color": "#ffffff",
            "font_size": "lg",
            "active": True
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "banner_id" in data, "Response missing banner_id"
        assert data["type"] == "text", f"Expected type 'text', got {data['type']}"
        assert data["text"] == payload["text"], "Banner text mismatch"
        print(f"✅ Created text banner: {data['banner_id']}")
        return data

    def test_create_image_banner(self, api_client):
        """POST /api/admin/showcase/banners should create image banner"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "type": "image",
            "image_url": "https://example.com/test-banner.jpg",
            "overlay_text": f"TEST_Overlay_{unique_id}",
            "link_url": "/pinpanclub",
            "active": True
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["type"] == "image", f"Expected type 'image', got {data['type']}"
        assert data["image_url"] == payload["image_url"], "Image URL mismatch"
        print(f"✅ Created image banner: {data['banner_id']}")
        return data

    def test_update_banner(self, api_client):
        """PUT /api/admin/showcase/banners/{id} should update a banner"""
        # First create a banner to update
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "type": "text",
            "text": f"TEST_ToUpdate_{unique_id}",
            "bg_color": "#16a34a",
            "active": True
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=create_payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]

        # Now update it
        update_payload = {
            "text": f"TEST_Updated_{unique_id}",
            "bg_color": "#7c3aed",
            "active": False
        }
        update_resp = api_client.put(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}", json=update_payload)
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        data = update_resp.json()
        assert data["text"] == update_payload["text"], "Banner text not updated"
        assert data["bg_color"] == update_payload["bg_color"], "Banner bg_color not updated"
        assert data["active"] == False, "Banner active status not updated"
        print(f"✅ Updated banner: {banner_id}")
        return banner_id

    def test_delete_banner(self, api_client):
        """DELETE /api/admin/showcase/banners/{id} should delete a banner"""
        # First create a banner to delete
        unique_id = str(uuid.uuid4())[:8]
        create_payload = {
            "type": "text",
            "text": f"TEST_ToDelete_{unique_id}",
            "active": True
        }
        create_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/banners", json=create_payload)
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["banner_id"]

        # Now delete it
        delete_resp = api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}")
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        data = delete_resp.json()
        assert data.get("status") == "deleted", "Expected status: deleted"
        assert data.get("banner_id") == banner_id, "Deleted banner_id mismatch"
        print(f"✅ Deleted banner: {banner_id}")

    def test_delete_nonexistent_banner_returns_404(self, api_client):
        """DELETE /api/admin/showcase/banners/{id} with invalid id returns 404"""
        response = api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/nonexistent_banner_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Delete nonexistent banner returns 404")


class TestAdminMediaPlayerEndpoints:
    """Test admin media player management endpoints"""

    def test_add_media_item(self, api_client):
        """POST /api/admin/showcase/media-player/add-item should add an item"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "type": "image",
            "url": f"https://example.com/test-image-{unique_id}.jpg",
            "caption": f"TEST_Caption_{unique_id}"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/media-player/add-item", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("status") == "added", f"Expected status 'added', got {data.get('status')}"
        assert "item" in data, "Response missing 'item'"
        item = data["item"]
        assert "item_id" in item, "Item missing item_id"
        assert item["url"] == payload["url"], "Item URL mismatch"
        print(f"✅ Added media item: {item['item_id']}")
        return item

    def test_add_video_item(self, api_client):
        """POST /api/admin/showcase/media-player/add-item should add video"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "type": "video",
            "url": f"https://example.com/test-video-{unique_id}.mp4",
            "caption": f"TEST_Video_{unique_id}"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/media-player/add-item", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        item = data.get("item", {})
        assert item.get("type") == "video", f"Expected type 'video', got {item.get('type')}"
        print(f"✅ Added video item: {item.get('item_id')}")

    def test_delete_media_item(self, api_client):
        """DELETE /api/admin/showcase/media-player/items/{id} should remove item"""
        # First add an item to delete
        unique_id = str(uuid.uuid4())[:8]
        add_payload = {
            "type": "image",
            "url": f"https://example.com/to-delete-{unique_id}.jpg",
            "caption": f"TEST_ToDelete_{unique_id}"
        }
        add_resp = api_client.post(f"{BASE_URL}/api/admin/showcase/media-player/add-item", json=add_payload)
        assert add_resp.status_code == 200
        item_id = add_resp.json()["item"]["item_id"]

        # Now delete it
        delete_resp = api_client.delete(f"{BASE_URL}/api/admin/showcase/media-player/items/{item_id}")
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        data = delete_resp.json()
        assert data.get("status") == "deleted", "Expected status: deleted"
        print(f"✅ Deleted media item: {item_id}")

    def test_update_player_settings(self, api_client):
        """PUT /api/admin/showcase/media-player should update settings"""
        # First get current config
        get_resp = api_client.get(f"{BASE_URL}/api/admin/showcase/media-player")
        assert get_resp.status_code == 200
        current_config = get_resp.json()

        # Update with new settings
        updated_config = {
            **current_config,
            "autoplay": True,
            "interval_ms": 6000,
            "show_controls": True,
            "loop": True
        }
        update_resp = api_client.put(f"{BASE_URL}/api/admin/showcase/media-player", json=updated_config)
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}: {update_resp.text}"
        data = update_resp.json()
        assert data.get("status") == "ok", f"Expected status 'ok', got {data.get('status')}"
        print(f"✅ Updated media player settings")

    def test_fetch_album_graceful_response(self, api_client):
        """POST /api/admin/showcase/media-player/fetch-album handles protected albums gracefully"""
        payload = {
            "album_url": "https://photos.app.goo.gl/test-protected-album"
        }
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/media-player/fetch-album", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should return graceful response (no_items or error with message)
        assert "status" in data, "Response missing status"
        assert data["status"] in ["ok", "no_items", "error"], f"Unexpected status: {data['status']}"
        print(f"✅ Fetch album returns graceful response: status={data['status']}, message={data.get('message', 'N/A')}")

    def test_fetch_album_requires_url(self, api_client):
        """POST /api/admin/showcase/media-player/fetch-album requires album_url"""
        payload = {}
        response = api_client.post(f"{BASE_URL}/api/admin/showcase/media-player/fetch-album", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Fetch album without URL returns 400")


class TestCleanupTestData:
    """Cleanup TEST_ prefixed data created during tests"""

    def test_cleanup_test_banners(self, api_client):
        """Remove all TEST_ banners created during this test run"""
        # Get all banners via admin endpoint
        response = api_client.get(f"{BASE_URL}/api/admin/showcase/banners")
        if response.status_code != 200:
            print("⚠️ Could not fetch banners for cleanup")
            return
        
        banners = response.json()
        deleted_count = 0
        for banner in banners:
            if banner.get("text", "").startswith("TEST_") or banner.get("overlay_text", "").startswith("TEST_"):
                delete_resp = api_client.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner['banner_id']}")
                if delete_resp.status_code == 200:
                    deleted_count += 1
        
        print(f"✅ Cleanup: Deleted {deleted_count} TEST_ banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
