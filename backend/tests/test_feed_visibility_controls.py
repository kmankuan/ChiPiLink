"""
Test suite for Community Feed Visibility Controls
Tests: GET/PUT visibility settings, access checking, role-based filtering
Iteration 89: Tests visibility modes - all_users, admin_only, specific_roles
"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "admin"


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


class TestFeedAccessEndpoint:
    """Test GET /api/community-v2/feed/access"""

    def test_access_requires_auth(self):
        """Access check requires authentication"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/access")
        assert response.status_code in [401, 403]

    def test_access_returns_admin_status(self, headers):
        """Access check returns has_access and is_admin for admin user"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/access",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "has_access" in data
        assert "is_admin" in data
        assert "visibility" in data
        # Admin user should always have access and is_admin=true
        assert data["has_access"] is True
        assert data["is_admin"] is True


class TestGetVisibilitySettings:
    """Test GET /api/community-v2/feed/admin/visibility"""

    def test_visibility_requires_admin(self):
        """GET visibility requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/community-v2/feed/admin/visibility")
        assert response.status_code in [401, 403]

    def test_visibility_returns_settings_and_roles(self, headers):
        """GET visibility returns visibility, allowed_roles, and available_roles"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "visibility" in data
        assert "allowed_roles" in data
        assert "available_roles" in data
        
        # Check visibility is valid mode
        assert data["visibility"] in ["all_users", "admin_only", "specific_roles"]
        
        # Check available_roles structure (Spanish names)
        assert isinstance(data["available_roles"], list)
        if data["available_roles"]:
            role = data["available_roles"][0]
            assert "role_id" in role
            assert "name" in role  # Mapped from 'nombre'
            assert "color" in role

    def test_available_roles_include_expected_roles(self, headers):
        """Available roles include super_admin, admin, moderator, user"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            headers=headers
        )
        data = response.json()
        role_ids = [r["role_id"] for r in data["available_roles"]]
        
        assert "super_admin" in role_ids
        assert "admin" in role_ids
        assert "moderator" in role_ids
        assert "user" in role_ids

    def test_roles_have_spanish_names(self, headers):
        """Roles display Spanish names (nombre field)"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            headers=headers
        )
        data = response.json()
        names = {r["role_id"]: r["name"] for r in data["available_roles"]}
        
        # Check Spanish names mapped correctly
        assert "Administrador" in names.get("admin", "")
        assert "Moderador" in names.get("moderator", "")


class TestPutVisibilitySettings:
    """Test PUT /api/community-v2/feed/admin/visibility"""

    def test_put_requires_admin(self):
        """PUT visibility requires admin auth"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "all_users", "allowed_roles": []}
        )
        assert response.status_code in [401, 403]

    def test_set_visibility_all_users(self, headers):
        """Can set visibility to all_users"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "all_users", "allowed_roles": []},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["visibility"] == "all_users"

    def test_set_visibility_admin_only(self, headers):
        """Can set visibility to admin_only"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "admin_only", "allowed_roles": []},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["visibility"] == "admin_only"

    def test_set_visibility_specific_roles(self, headers):
        """Can set visibility to specific_roles with allowed_roles"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "specific_roles", "allowed_roles": ["admin", "moderator"]},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["visibility"] == "specific_roles"
        assert "admin" in data["allowed_roles"]
        assert "moderator" in data["allowed_roles"]

    def test_reject_invalid_visibility_mode(self, headers):
        """Invalid visibility mode returns 400"""
        response = requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "invalid_mode", "allowed_roles": []},
            headers=headers
        )
        assert response.status_code == 400
        assert "Invalid visibility mode" in response.text

    def test_visibility_change_persists(self, headers):
        """Visibility changes are persisted"""
        # Set to admin_only
        requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "admin_only", "allowed_roles": []},
            headers=headers
        )
        
        # Verify it persisted
        get_response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            headers=headers
        )
        assert get_response.json()["visibility"] == "admin_only"
        
        # Reset to all_users
        requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "all_users", "allowed_roles": []},
            headers=headers
        )


class TestFeedPostsWithVisibility:
    """Test GET /api/community-v2/feed/posts respects visibility"""

    def test_posts_with_all_users(self, headers):
        """Posts endpoint returns posts when visibility=all_users"""
        # Ensure visibility is all_users
        requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "all_users", "allowed_roles": []},
            headers=headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts",
            params={"page": 1, "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert data.get("access_denied") is None or data.get("access_denied") is False

    def test_admin_always_has_access(self, headers):
        """Admin always has access regardless of visibility setting"""
        # Set to admin_only
        requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "admin_only", "allowed_roles": []},
            headers=headers
        )
        
        # Admin should still get posts
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/posts",
            params={"page": 1, "limit": 10},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("access_denied") is None or data.get("access_denied") is False
        
        # Reset
        requests.put(
            f"{BASE_URL}/api/community-v2/feed/admin/visibility",
            json={"visibility": "all_users", "allowed_roles": []},
            headers=headers
        )


class TestAdminStatsWithVisibility:
    """Test /api/community-v2/feed/admin/stats includes visibility"""

    def test_stats_includes_visibility(self, headers):
        """Stats endpoint includes visibility and allowed_roles"""
        response = requests.get(
            f"{BASE_URL}/api/community-v2/feed/admin/stats",
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        assert "allowed_roles" in data


@pytest.fixture(autouse=True, scope="module")
def cleanup(headers):
    """Reset visibility to all_users after all tests"""
    yield
    # Cleanup: Reset to all_users
    requests.put(
        f"{BASE_URL}/api/community-v2/feed/admin/visibility",
        json={"visibility": "all_users", "allowed_roles": []},
        headers=headers
    )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
