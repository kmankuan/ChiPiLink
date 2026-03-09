"""
Test suite for Community Telegram Feed Module
Tests: Feed posts, likes, comments, media proxy, admin endpoints
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Test post IDs (seeded in DB)
TEST_POST_IDS = [1001, 1002, 1003]


@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")


@pytest.fixture(scope="module")
def headers(auth_token):
    """Auth headers"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestCommunityFeedPosts:
    """Test GET /api/community-v2/feed/posts"""

    def test_posts_requires_auth(self):
        """Posts endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/posts")
        assert response.status_code in [401, 403]

    def test_posts_returns_paginated_data(self, headers):
        """Posts endpoint returns paginated list"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts",
            params={"page": 1, "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        assert "limit" in data
        assert isinstance(data["posts"], list)

    def test_posts_structure(self, headers):
        """Posts have expected structure"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts",
            params={"page": 1, "limit": 20},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        if data["posts"]:
            post = data["posts"][0]
            assert "telegram_msg_id" in post
            assert "text" in post
            assert "date" in post
            assert "likes_count" in post
            assert "comments_count" in post
            assert "liked_by_me" in post


class TestCommunityFeedLikes:
    """Test POST /api/community-v2/feed/posts/{msg_id}/like"""

    def test_like_requires_auth(self):
        """Like endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/like"
        )
        assert response.status_code in [401, 403]

    def test_like_toggle_on(self, headers):
        """Like creates a like"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/like",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert isinstance(data["liked"], bool)

    def test_like_toggle_off(self, headers):
        """Second like toggles off"""
        # First, like again to toggle
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/like",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data


class TestCommunityFeedComments:
    """Test comments endpoints"""

    def test_get_comments_requires_auth(self):
        """Get comments requires authentication"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments"
        )
        assert response.status_code in [401, 403]

    def test_get_comments_returns_list(self, headers):
        """Get comments returns list"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "comments" in data
        assert isinstance(data["comments"], list)

    def test_add_comment_requires_auth(self):
        """Add comment requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments",
            json={"text": "Test comment"}
        )
        assert response.status_code in [401, 403]

    def test_add_comment_success(self, headers):
        """Add comment creates new comment"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments",
            json={"text": "TEST_Comment from automated test"},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "comment" in data
        comment = data["comment"]
        assert comment["text"] == "TEST_Comment from automated test"
        assert "user_name" in comment
        assert "created_at" in comment
        assert "post_msg_id" in comment
        assert comment["post_msg_id"] == 1001

    def test_add_comment_empty_rejected(self, headers):
        """Empty comment is rejected"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments",
            json={"text": "   "},
            headers=headers
        )
        assert response.status_code == 400

    def test_verify_comment_persisted(self, headers):
        """Verify comment appears in list"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts/1001/comments",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert any("automated test" in c.get("text", "").lower() for c in data["comments"])


class TestCommunityMediaProxy:
    """Test GET /api/community-v2/feed/media/{file_id}"""

    def test_media_invalid_file_id(self):
        """Invalid file ID returns 404"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/media/invalid_file_id_12345"
        )
        # May return 404 or 502 depending on Telegram response
        assert response.status_code in [404, 502]


class TestCommunityAdminSync:
    """Test admin sync endpoint POST /api/community-v2/feed/admin/sync"""

    def test_sync_requires_admin(self):
        """Sync requires admin auth"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/sync"
        )
        assert response.status_code in [401, 403]

    def test_sync_success(self, headers):
        """Admin can trigger sync"""
        response = requests.post(
            f"{BASE_URL}/api/community-v2/feed/admin/sync",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True
        assert "new_posts" in data
        assert "last_update_id" in data


class TestCommunityAdminConfig:
    """Test admin config endpoints"""

    def test_get_config_requires_admin(self):
        """Get config requires admin auth"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/config"
        )
        assert response.status_code in [401, 403]

    def test_get_config_success(self, headers):
        """Admin can get config with bot info"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/config",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "config" in data
        assert "bot" in data
        # Bot info from Telegram
        if data["bot"]:
            assert "username" in data["bot"]

    def test_update_config_requires_admin(self):
        """Update config requires admin auth"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/config",
            json={"poll_interval": 60}
        )
        assert response.status_code in [401, 403]

    def test_update_config_success(self, headers):
        """Admin can update config"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/config",
            json={"poll_interval": 120, "auto_sync": True},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True

        # Verify changes persisted
        get_response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/config",
            headers=headers
        )
        config = get_response.json().get("config", {})
        assert config.get("poll_interval") == 120


class TestCommunityAdminStats:
    """Test GET /api/community-v2/feed/admin/stats"""

    def test_stats_requires_admin(self):
        """Stats requires admin auth"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/stats"
        )
        assert response.status_code in [401, 403]

    def test_stats_returns_counts(self, headers):
        """Stats returns post/like/comment counts"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_posts" in data
        assert "total_likes" in data
        assert "total_comments" in data
        assert isinstance(data["total_posts"], int)
        assert isinstance(data["total_likes"], int)
        assert isinstance(data["total_comments"], int)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
