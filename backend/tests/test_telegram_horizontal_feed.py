"""
Backend API tests for Telegram Horizontal Feed Feature
Tests the new horizontal scroll layout with configurable card dimensions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')

class TestTelegramFeedPublicAPI:
    """Tests for public Telegram feed endpoints"""
    
    def test_public_containers_returns_new_fields(self):
        """Test that /api/community-v2/feed/public/containers returns layout_mode and card settings"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/containers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "containers" in data, "Response must have 'containers' key"
        
        if len(data["containers"]) > 0:
            container = data["containers"][0]
            # Verify new horizontal feed fields exist
            assert "layout_mode" in container, "Container must have layout_mode field"
            assert "card_width" in container, "Container must have card_width field"
            assert "card_height" in container, "Container must have card_height field"
            assert "description_max_lines" in container, "Container must have description_max_lines field"
            
            # Validate default values
            assert container["layout_mode"] in ["horizontal", "vertical"], f"Invalid layout_mode: {container['layout_mode']}"
            assert isinstance(container["card_width"], int), "card_width must be integer"
            assert isinstance(container["card_height"], int), "card_height must be integer"
            assert isinstance(container["description_max_lines"], int), "description_max_lines must be integer"
            
            # Validate posts are returned
            assert "posts" in container, "Container must have posts"
            assert "total_posts" in container, "Container must have total_posts"
            
            print(f"✓ Container has layout_mode={container['layout_mode']}, card_width={container['card_width']}, card_height={container['card_height']}, description_max_lines={container['description_max_lines']}")
        else:
            print("⚠ No containers found in response (may be expected if no containers configured)")
    
    def test_public_recent_posts(self):
        """Test that /api/community-v2/feed/public/recent returns posts"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=5")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "posts" in data, "Response must have 'posts' key"
        assert "total" in data, "Response must have 'total' key"
        
        print(f"✓ Got {len(data['posts'])} posts out of {data['total']} total")


class TestTelegramFeedAdminAPI:
    """Tests for admin Telegram feed container endpoints requiring authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                print(f"✓ Admin login successful")
                return token
        pytest.skip(f"Admin login failed with status {response.status_code}")
    
    def test_admin_get_containers(self, auth_token):
        """Test admin can list all containers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/admin/containers", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "containers" in data, "Response must have 'containers' key"
        print(f"✓ Admin got {len(data['containers'])} containers")
        
        return data["containers"]
    
    def test_admin_create_container_with_horizontal_settings(self, auth_token):
        """Test admin can create a container with horizontal layout settings"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        payload = {
            "title": "TEST_Horizontal_Feed",
            "subtitle": "Test horizontal scroll feed",
            "layout_mode": "horizontal",
            "card_width": 250,
            "card_height": 320,
            "description_max_lines": 3,
            "post_limit": 10,
            "is_active": False  # Keep inactive for testing
        }
        
        response = requests.post(f"{BASE_URL}/api/community-v2/feed/admin/containers", 
                                headers=headers, json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Create should return success=True"
        assert "container" in data, "Response must have 'container' key"
        
        container = data["container"]
        assert container["layout_mode"] == "horizontal", f"Expected horizontal, got {container['layout_mode']}"
        assert container["card_width"] == 250, f"Expected 250, got {container['card_width']}"
        assert container["card_height"] == 320, f"Expected 320, got {container['card_height']}"
        assert container["description_max_lines"] == 3, f"Expected 3, got {container['description_max_lines']}"
        
        print(f"✓ Created container with ID {container['container_id']}")
        return container["container_id"]
    
    def test_admin_update_container_horizontal_settings(self, auth_token):
        """Test admin can update container with new horizontal settings"""
        headers = {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
        
        # First create a container
        create_payload = {
            "title": "TEST_Update_Horizontal",
            "layout_mode": "vertical",
            "is_active": False
        }
        create_response = requests.post(f"{BASE_URL}/api/community-v2/feed/admin/containers",
                                       headers=headers, json=create_payload)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        container_id = create_response.json()["container"]["container_id"]
        
        # Now update to horizontal with new settings
        update_payload = {
            "layout_mode": "horizontal",
            "card_width": 280,
            "card_height": 350,
            "description_max_lines": 4
        }
        
        response = requests.put(f"{BASE_URL}/api/community-v2/feed/admin/containers/{container_id}",
                               headers=headers, json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Update should return success=True"
        
        print(f"✓ Updated container {container_id} with horizontal layout settings")
        
        # Cleanup - delete the test container
        delete_response = requests.delete(f"{BASE_URL}/api/community-v2/feed/admin/containers/{container_id}",
                                         headers=headers)
        print(f"✓ Cleaned up test container {container_id}")
        
        return container_id
    
    def test_admin_delete_test_containers(self, auth_token):
        """Cleanup: Delete all TEST_ prefixed containers"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all containers
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/admin/containers", headers=headers)
        if response.status_code != 200:
            print("⚠ Could not get containers for cleanup")
            return
        
        containers = response.json().get("containers", [])
        deleted_count = 0
        
        for container in containers:
            if container.get("title", "").startswith("TEST_"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/community-v2/feed/admin/containers/{container['container_id']}",
                    headers=headers
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test containers")


class TestTelegramFeedStats:
    """Test admin stats endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            if token:
                return token
        pytest.skip(f"Admin login failed with status {response.status_code}")
    
    def test_admin_stats(self, auth_token):
        """Test admin can get feed statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/admin/stats", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "total_posts" in data, "Response must have total_posts"
        assert "total_likes" in data, "Response must have total_likes"
        assert "total_comments" in data, "Response must have total_comments"
        
        print(f"✓ Stats: {data['total_posts']} posts, {data['total_likes']} likes, {data['total_comments']} comments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
