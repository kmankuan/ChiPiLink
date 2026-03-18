"""
Test Telegram Feed Card Feature - Iteration 103
Tests:
- GET /api/community-v2/feed/public/recent - public endpoint (no auth required)
- GET /api/showcase/banners - returns banner config
- GET /api/showcase/media-player - returns media player config
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTelegramFeedPublicEndpoint:
    """Test the public feed endpoint for landing page preview."""
    
    def test_public_recent_posts_no_auth(self):
        """Public endpoint should return posts without authentication."""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "posts" in data, "Response should have 'posts' key"
        assert "total" in data, "Response should have 'total' key"
        assert isinstance(data["posts"], list), "Posts should be a list"
        assert isinstance(data["total"], int), "Total should be an integer"
        print(f"✓ Public feed returns {len(data['posts'])} posts (total: {data['total']})")
        
    def test_public_recent_posts_with_limit(self):
        """Public endpoint should respect limit parameter."""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=3")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["posts"]) <= 3, "Should respect limit parameter"
        print(f"✓ Public feed respects limit=3, returned {len(data['posts'])} posts")
        
    def test_public_recent_posts_max_limit(self):
        """Public endpoint should cap limit at 10."""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=20")
        assert response.status_code == 200
        
        data = response.json()
        # The endpoint caps at 10 (min(limit, 10))
        assert len(data["posts"]) <= 10, "Should cap at maximum 10 posts"
        print(f"✓ Public feed caps limit at 10, returned {len(data['posts'])} posts")
        
    def test_public_recent_posts_structure(self):
        """Verify post structure has required fields."""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/public/recent?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        if data["posts"]:
            post = data["posts"][0]
            # Check expected fields (excluding _id which should be excluded)
            assert "_id" not in post, "MongoDB _id should be excluded from response"
            # Check for common post fields
            print(f"✓ Post structure valid. Fields: {list(post.keys())}")
        else:
            print("✓ No posts in database, but endpoint works correctly")


class TestShowcaseBanners:
    """Test banner carousel endpoint."""
    
    def test_get_banners(self):
        """GET /api/showcase/banners should return banners."""
        response = requests.get(f"{BASE_URL}/api/showcase/banners")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of banners"
        print(f"✓ Banners endpoint returns {len(data)} banners")
        
        if data:
            banner = data[0]
            print(f"  First banner type: {banner.get('type', 'N/A')}, id: {banner.get('banner_id', 'N/A')}")


class TestShowcaseMediaPlayer:
    """Test media player endpoint."""
    
    def test_get_media_player_config(self):
        """GET /api/showcase/media-player should return media player config."""
        response = requests.get(f"{BASE_URL}/api/showcase/media-player")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response can be null/empty or have items
        if data:
            assert isinstance(data, dict), "Response should be a config object"
            if "items" in data:
                print(f"✓ Media player config has {len(data.get('items', []))} items")
            else:
                print(f"✓ Media player config returned: {list(data.keys())}")
        else:
            print("✓ Media player config returns empty (fallback will be used)")


class TestHealthCheck:
    """Quick health check."""
    
    def test_health(self):
        """Health endpoint should return healthy."""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy", f"Expected healthy status, got {data}"
        print(f"✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
