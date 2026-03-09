"""
Test Telegram Feed Album Carousel & Container Management APIs
Tests:
- GET /api/community-v2/feed/public/recent - Media grouping into albums
- GET /api/community-v2/feed/public/containers - Public containers with posts
- POST /api/community-v2/feed/admin/containers - Create container
- PUT /api/community-v2/feed/admin/containers/{id} - Update container
- DELETE /api/community-v2/feed/admin/containers/{id} - Delete container
- GET /api/community-v2/feed/admin/containers - Admin list containers
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTelegramFeedPublicAPIs:
    """Test public feed endpoints - no auth required"""
    
    def test_public_recent_posts(self):
        """GET /api/community-v2/feed/public/recent - should return posts with album grouping"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=10")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should have 'posts' field"
        assert "total" in data, "Response should have 'total' field"
        assert isinstance(data["posts"], list), "posts should be a list"
        
        # Check for is_album field on posts
        for post in data["posts"]:
            assert "is_album" in post, f"Post should have is_album field: {post.get('telegram_msg_id')}"
            assert isinstance(post["is_album"], bool), "is_album should be boolean"
        
        print(f"✓ GET /api/community-v2/feed/public/recent returned {len(data['posts'])} posts, total={data['total']}")
    
    def test_public_recent_album_grouping(self):
        """Verify posts with same media_group_id are grouped into albums"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        album_posts = [p for p in data["posts"] if p.get("is_album") is True]
        
        print(f"✓ Found {len(album_posts)} album posts out of {len(data['posts'])} total")
        
        # Verify album posts have merged media arrays
        for album in album_posts:
            media = album.get("media", [])
            assert len(media) > 1, f"Album should have multiple media items: {album.get('telegram_msg_id')}"
            print(f"  - Album {album.get('telegram_msg_id')}: {len(media)} media items")
    
    def test_public_containers_endpoint(self):
        """GET /api/community-v2/feed/public/containers - should return active containers with posts"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/containers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "containers" in data, "Response should have 'containers' field"
        assert isinstance(data["containers"], list), "containers should be a list"
        
        # Each container should have required fields
        for container in data["containers"]:
            assert "title" in container, "Container should have 'title'"
            assert "posts" in container, "Container should have 'posts'"
            assert "total_posts" in container, "Container should have 'total_posts'"
            # Check container config fields
            assert "bg_color" in container, "Container should have 'bg_color'"
            assert "accent_color" in container, "Container should have 'accent_color'"
            assert "card_style" in container, "Container should have 'card_style'"
            assert "border_radius" in container, "Container should have 'border_radius'"
            print(f"  - Container: '{container['title']}' with {len(container['posts'])} posts")
        
        print(f"✓ GET /api/community-v2/feed/public/containers returned {len(data['containers'])} containers")


class TestTelegramFeedAdminAPIs:
    """Test admin container management endpoints - requires auth"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Login as admin and get token"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if login_res.status_code != 200:
            pytest.skip(f"Admin login failed: {login_res.status_code}")
        
        self.token = login_res.json().get("token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
        print(f"✓ Admin login successful")
    
    def test_admin_list_containers(self):
        """GET /api/community-v2/feed/admin/containers - list all containers"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "containers" in data, "Response should have 'containers' field"
        
        print(f"✓ GET /api/community-v2/feed/admin/containers returned {len(data['containers'])} containers")
        return data["containers"]
    
    def test_admin_create_container(self):
        """POST /api/community-v2/feed/admin/containers - create new container"""
        payload = {
            "title": "TEST_New Feed Container",
            "subtitle": "Test subtitle",
            "channel_id": None,
            "post_limit": 5,
            "bg_color": "#ffffff",
            "accent_color": "#ff5500",
            "header_bg": "#ffe0e0",
            "icon_color": "#ff5500",
            "card_style": "expanded",
            "show_footer": True,
            "cta_text": "View All Posts",
            "cta_link": "/comunidad",
            "border_radius": "xl",
            "show_post_count": True,
            "show_media_count": False,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Create should return success=True"
        assert "container" in data, "Response should have 'container' field"
        
        container = data["container"]
        assert "container_id" in container, "Container should have 'container_id'"
        assert container["title"] == payload["title"], "Title should match"
        assert container["accent_color"] == payload["accent_color"], "Accent color should match"
        assert container["card_style"] == payload["card_style"], "Card style should match"
        
        print(f"✓ POST /api/community-v2/feed/admin/containers created container_id={container['container_id']}")
        return container["container_id"]
    
    def test_admin_update_container(self):
        """PUT /api/community-v2/feed/admin/containers/{id} - update container"""
        # First create a container to update
        create_res = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers,
            json={"title": "TEST_Update Test", "is_active": True}
        )
        assert create_res.status_code == 200
        container_id = create_res.json()["container"]["container_id"]
        
        # Now update it
        update_payload = {
            "title": "TEST_Updated Title",
            "subtitle": "Updated subtitle",
            "accent_color": "#00ff00",
            "card_style": "minimal",
            "is_active": False
        }
        
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/containers/{container_id}",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Update should return success=True"
        
        # Verify update by fetching
        list_res = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers
        )
        containers = list_res.json()["containers"]
        updated = next((c for c in containers if c["container_id"] == container_id), None)
        assert updated is not None, "Updated container should exist"
        assert updated["title"] == update_payload["title"], "Title should be updated"
        assert updated["is_active"] == update_payload["is_active"], "is_active should be updated"
        
        print(f"✓ PUT /api/community-v2/feed/admin/containers/{container_id} updated successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/community-v2/feed/admin/containers/{container_id}",
            headers=self.headers
        )
    
    def test_admin_delete_container(self):
        """DELETE /api/community-v2/feed/admin/containers/{id} - delete container"""
        # First create a container to delete
        create_res = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers,
            json={"title": "TEST_Delete Test", "is_active": False}
        )
        assert create_res.status_code == 200
        container_id = create_res.json()["container"]["container_id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/community-v2/feed/admin/containers/{container_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") is True, "Delete should return success=True"
        
        # Verify deletion
        list_res = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers
        )
        containers = list_res.json()["containers"]
        deleted = next((c for c in containers if c["container_id"] == container_id), None)
        assert deleted is None, "Deleted container should not exist"
        
        print(f"✓ DELETE /api/community-v2/feed/admin/containers/{container_id} deleted successfully")
    
    def test_admin_delete_nonexistent_container(self):
        """DELETE non-existent container should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/community-v2/feed/admin/containers/nonexistent123",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ DELETE non-existent container returns 404 as expected")
    
    def test_admin_container_crud_no_auth(self):
        """Container admin endpoints should reject unauthenticated requests"""
        # No auth headers
        list_res = requests.get(f"{BASE_URL}/api/community-v2/feed/admin/containers")
        assert list_res.status_code in [401, 403], f"Expected 401/403 without auth, got {list_res.status_code}"
        
        create_res = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            json={"title": "Unauthorized"}
        )
        assert create_res.status_code in [401, 403], f"Expected 401/403 without auth, got {create_res.status_code}"
        
        print(f"✓ Admin endpoints correctly reject unauthenticated requests")


class TestTelegramFeedContainerConfig:
    """Test container configuration options"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Login as admin"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if login_res.status_code != 200:
            pytest.skip(f"Admin login failed: {login_res.status_code}")
        
        self.token = login_res.json().get("token")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def test_container_all_config_fields(self):
        """Test container with all configuration fields"""
        payload = {
            "title": "TEST_Full Config",
            "subtitle": "All fields populated",
            "channel_id": 12345,
            "post_limit": 10,
            "bg_color": "#f0f0f0",
            "accent_color": "#1234ab",
            "header_bg": "#abcdef",
            "icon_color": "#fedcba",
            "card_style": "compact",
            "show_footer": False,
            "cta_text": "Custom CTA",
            "cta_link": "/custom-link",
            "border_radius": "2xl",
            "show_post_count": False,
            "show_media_count": True,
            "is_active": True
        }
        
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=self.headers,
            json=payload
        )
        assert response.status_code == 200
        
        container = response.json()["container"]
        
        # Verify all fields
        for key, value in payload.items():
            assert container.get(key) == value, f"Field '{key}' should be {value}, got {container.get(key)}"
        
        print(f"✓ Container created with all config fields correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/community-v2/feed/admin/containers/{container['container_id']}",
            headers=self.headers
        )
    
    def test_container_card_styles(self):
        """Test different card styles: compact, expanded, minimal"""
        for style in ["compact", "expanded", "minimal"]:
            response = requests.post(
                f"{BASE_URL}/api/community-v2/feed/admin/containers",
                headers=self.headers,
                json={"title": f"TEST_{style} Style", "card_style": style, "is_active": False}
            )
            assert response.status_code == 200
            container = response.json()["container"]
            assert container["card_style"] == style
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/community-v2/feed/admin/containers/{container['container_id']}",
                headers=self.headers
            )
        
        print(f"✓ All card styles (compact, expanded, minimal) work correctly")
    
    def test_container_border_radius_options(self):
        """Test different border radius options"""
        for radius in ["none", "lg", "xl", "2xl"]:
            response = requests.post(
                f"{BASE_URL}/api/community-v2/feed/admin/containers",
                headers=self.headers,
                json={"title": f"TEST_{radius} Radius", "border_radius": radius, "is_active": False}
            )
            assert response.status_code == 200
            container = response.json()["container"]
            assert container["border_radius"] == radius
            
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/community-v2/feed/admin/containers/{container['container_id']}",
                headers=self.headers
            )
        
        print(f"✓ All border radius options work correctly")


class TestCleanupTestContainers:
    """Cleanup test containers after all tests"""
    
    def test_cleanup_test_containers(self):
        """Delete all containers with TEST_ prefix"""
        login_res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if login_res.status_code != 200:
            pytest.skip("Admin login failed")
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {login_res.json().get('token')}"
        }
        
        # Get all containers
        list_res = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/containers",
            headers=headers
        )
        if list_res.status_code != 200:
            return
        
        containers = list_res.json().get("containers", [])
        deleted_count = 0
        
        for container in containers:
            if container.get("title", "").startswith("TEST_"):
                del_res = requests.delete(
                    f"{BASE_URL}/api/community-v2/feed/admin/containers/{container['container_id']}",
                    headers=headers
                )
                if del_res.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test containers")
