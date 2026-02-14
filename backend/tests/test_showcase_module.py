"""
Showcase Module Tests - Banners & Media Player
Tests the async motor refactoring of the showcase module.
Features tested:
- GET /api/showcase/banners - public banners endpoint
- GET /api/showcase/media-player - public media player endpoint
- POST /api/admin/showcase/banners - create banner (admin)
- PUT /api/admin/showcase/banners/{banner_id} - update banner (admin)
- DELETE /api/admin/showcase/banners/{banner_id} - delete banner (admin)
- GET /api/admin/showcase/media-player - admin media player config
- PUT /api/admin/showcase/media-player - update media player config
- POST /api/admin/showcase/media-player/add-item - add media item
- DELETE /api/admin/showcase/media-player/items/{item_id} - delete media item
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestShowcasePublicEndpoints:
    """Test public showcase endpoints (no auth required)"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ Health check passed")

    def test_get_banners_returns_list(self):
        """GET /api/showcase/banners should return list of active banners"""
        response = requests.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200, f"GET banners failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Banners should be a list"
        
        # Verify banner structure if banners exist
        if len(data) > 0:
            banner = data[0]
            assert "banner_id" in banner, "Banner should have banner_id"
            assert "type" in banner, "Banner should have type"
            assert "active" in banner, "Banner should have active field"
            # Verify _id is excluded
            assert "_id" not in banner, "MongoDB _id should be excluded"
        
        print(f"✓ GET /api/showcase/banners returned {len(data)} banners")
        return data

    def test_get_media_player_returns_config(self):
        """GET /api/showcase/media-player should return media player config"""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200, f"GET media-player failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Media player config should be a dict"
        
        # Verify config structure
        assert "items" in data, "Config should have items array"
        assert "autoplay" in data or "interval_ms" in data, "Config should have playback settings"
        
        items = data.get("items", [])
        if len(items) > 0:
            item = items[0]
            assert "item_id" in item, "Item should have item_id"
            assert "url" in item, "Item should have url"
            assert "type" in item, "Item should have type"
        
        print(f"✓ GET /api/showcase/media-player returned config with {len(items)} items")
        return data


class TestShowcaseAdminEndpoints:
    """Test admin showcase endpoints (require auth)"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
        else:
            # Try alternative auth endpoint
            login_response = requests.post(
                f"{BASE_URL}/api/auth-v2/login",
                json={"email": "admin@chipi.co", "password": "admin"}
            )
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip(f"Auth failed: {login_response.status_code}")
        
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Authenticated as admin")

    def test_admin_get_banners(self):
        """GET /api/admin/showcase/banners should return all banners"""
        response = requests.get(
            f"{BASE_URL}/api/admin/showcase/banners",
            headers=self.headers
        )
        assert response.status_code == 200, f"Admin GET banners failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Admin banners should be a list"
        print(f"✓ Admin GET banners returned {len(data)} banners")

    def test_create_banner_and_verify(self):
        """POST /api/admin/showcase/banners should create a banner"""
        unique_id = str(uuid.uuid4())[:8]
        banner_payload = {
            "type": "text",
            "text": f"TEST_Banner_{unique_id}",
            "bg_color": "#FF5733",
            "text_color": "#FFFFFF",
            "active": True,
            "link_url": "/test-link"
        }
        
        # Create banner
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            headers=self.headers,
            json=banner_payload
        )
        assert response.status_code == 200, f"Create banner failed: {response.status_code} - {response.text}"
        
        created = response.json()
        assert "banner_id" in created, "Created banner should have banner_id"
        assert created["text"] == banner_payload["text"], "Text should match"
        assert created["bg_color"] == banner_payload["bg_color"], "bg_color should match"
        
        banner_id = created["banner_id"]
        print(f"✓ Created banner: {banner_id}")
        
        # Verify banner appears in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/showcase/banners")
        public_banners = public_response.json()
        created_in_public = any(b.get("banner_id") == banner_id for b in public_banners)
        assert created_in_public, "Created banner should appear in public list"
        print(f"✓ Banner {banner_id} verified in public endpoint")
        
        return banner_id

    def test_update_banner(self):
        """PUT /api/admin/showcase/banners/{banner_id} should update a banner"""
        # First create a banner to update
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            headers=self.headers,
            json={
                "type": "text",
                "text": f"TEST_UpdateBanner_{unique_id}",
                "bg_color": "#333333",
                "active": True
            }
        )
        assert create_response.status_code == 200
        banner_id = create_response.json()["banner_id"]
        
        # Update the banner
        update_payload = {
            "text": f"UPDATED_Banner_{unique_id}",
            "bg_color": "#00FF00"
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/showcase/banners/{banner_id}",
            headers=self.headers,
            json=update_payload
        )
        assert update_response.status_code == 200, f"Update banner failed: {update_response.status_code}"
        
        updated = update_response.json()
        assert updated["text"] == update_payload["text"], "Text should be updated"
        assert updated["bg_color"] == update_payload["bg_color"], "bg_color should be updated"
        print(f"✓ Updated banner: {banner_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/showcase/banners/{banner_id}", headers=self.headers)
        return banner_id

    def test_delete_banner(self):
        """DELETE /api/admin/showcase/banners/{banner_id} should delete a banner"""
        # First create a banner to delete
        unique_id = str(uuid.uuid4())[:8]
        create_response = requests.post(
            f"{BASE_URL}/api/admin/showcase/banners",
            headers=self.headers,
            json={
                "type": "text",
                "text": f"TEST_DeleteBanner_{unique_id}",
                "active": True
            }
        )
        assert create_response.status_code == 200
        banner_id = create_response.json()["banner_id"]
        
        # Delete the banner
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/showcase/banners/{banner_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Delete banner failed: {delete_response.status_code}"
        
        delete_data = delete_response.json()
        assert delete_data.get("status") == "deleted"
        print(f"✓ Deleted banner: {banner_id}")
        
        # Verify deletion
        public_response = requests.get(f"{BASE_URL}/api/showcase/banners")
        public_banners = public_response.json()
        deleted_exists = any(b.get("banner_id") == banner_id for b in public_banners)
        assert not deleted_exists, "Deleted banner should not appear in public list"
        print(f"✓ Banner {banner_id} verified deleted from public endpoint")

    def test_admin_get_media_player(self):
        """GET /api/admin/showcase/media-player should return full config"""
        response = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.headers
        )
        assert response.status_code == 200, f"Admin GET media-player failed: {response.status_code}"
        
        data = response.json()
        assert isinstance(data, dict), "Admin media player should be a dict"
        print(f"✓ Admin GET media-player returned config with {len(data.get('items', []))} items")

    def test_update_media_player_config(self):
        """PUT /api/admin/showcase/media-player should update config"""
        # Get current config
        current = requests.get(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.headers
        ).json()
        
        # Update with new interval
        new_interval = 7000 if current.get("interval_ms") != 7000 else 6000
        update_payload = {
            **current,
            "interval_ms": new_interval,
            "autoplay": True,
            "loop": True,
            "show_controls": True
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/showcase/media-player",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Update media-player failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "ok"
        print(f"✓ Updated media player interval to {new_interval}ms")

    def test_add_media_item(self):
        """POST /api/admin/showcase/media-player/add-item should add item"""
        unique_id = str(uuid.uuid4())[:8]
        item_payload = {
            "type": "image",
            "url": f"https://example.com/test-image-{unique_id}.jpg",
            "thumbnail_url": "",
            "caption": f"TEST_Caption_{unique_id}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            headers=self.headers,
            json=item_payload
        )
        assert response.status_code == 200, f"Add media item failed: {response.status_code}"
        
        data = response.json()
        assert data.get("status") == "added"
        assert "item" in data
        item_id = data["item"]["item_id"]
        print(f"✓ Added media item: {item_id}")
        
        # Verify item appears in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        public_items = public_response.json().get("items", [])
        item_exists = any(i.get("item_id") == item_id for i in public_items)
        assert item_exists, "Added item should appear in public media player"
        print(f"✓ Media item {item_id} verified in public endpoint")
        
        return item_id

    def test_delete_media_item(self):
        """DELETE /api/admin/showcase/media-player/items/{item_id} should delete item"""
        # First add an item to delete
        unique_id = str(uuid.uuid4())[:8]
        add_response = requests.post(
            f"{BASE_URL}/api/admin/showcase/media-player/add-item",
            headers=self.headers,
            json={
                "type": "image",
                "url": f"https://example.com/delete-test-{unique_id}.jpg",
                "caption": f"TEST_Delete_{unique_id}"
            }
        )
        assert add_response.status_code == 200
        item_id = add_response.json()["item"]["item_id"]
        
        # Delete the item
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/showcase/media-player/items/{item_id}",
            headers=self.headers
        )
        assert delete_response.status_code == 200, f"Delete media item failed: {delete_response.status_code}"
        
        delete_data = delete_response.json()
        assert delete_data.get("status") == "deleted"
        print(f"✓ Deleted media item: {item_id}")
        
        # Verify deletion
        public_response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        public_items = public_response.json().get("items", [])
        item_exists = any(i.get("item_id") == item_id for i in public_items)
        assert not item_exists, "Deleted item should not appear in public media player"
        print(f"✓ Media item {item_id} verified deleted from public endpoint")


class TestShowcaseAsyncBehavior:
    """Test that async motor is working correctly (no event loop blocking)"""
    
    def test_concurrent_requests(self):
        """Multiple concurrent requests should not block"""
        import concurrent.futures
        import time
        
        urls = [
            f"{BASE_URL}/api/showcase/banners",
            f"{BASE_URL}/api/showcase/media-player",
            f"{BASE_URL}/api/health",
        ]
        
        start = time.time()
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            futures = [executor.submit(requests.get, url) for url in urls]
            results = [f.result() for f in concurrent.futures.as_completed(futures)]
        elapsed = time.time() - start
        
        # All requests should succeed
        for r in results:
            assert r.status_code == 200, f"Request failed: {r.url}"
        
        # Should complete quickly (not blocked by sync MongoDB)
        assert elapsed < 5, f"Concurrent requests took too long ({elapsed:.2f}s) - possible event loop blocking"
        print(f"✓ 3 concurrent requests completed in {elapsed:.2f}s")


class TestCleanup:
    """Cleanup TEST_ prefixed data"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
        else:
            login_response = requests.post(
                f"{BASE_URL}/api/auth-v2/login",
                json={"email": "admin@chipi.co", "password": "admin"}
            )
            if login_response.status_code == 200:
                self.token = login_response.json().get("token")
            else:
                pytest.skip("Auth failed")
        self.headers = {"Authorization": f"Bearer {self.token}"}

    def test_cleanup_test_banners(self):
        """Remove TEST_ prefixed banners"""
        response = requests.get(f"{BASE_URL}/api/admin/showcase/banners", headers=self.headers)
        if response.status_code == 200:
            banners = response.json()
            deleted = 0
            for b in banners:
                text = b.get("text", "")
                if text.startswith("TEST_") or text.startswith("UPDATED_"):
                    requests.delete(
                        f"{BASE_URL}/api/admin/showcase/banners/{b['banner_id']}",
                        headers=self.headers
                    )
                    deleted += 1
            print(f"✓ Cleaned up {deleted} test banners")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
