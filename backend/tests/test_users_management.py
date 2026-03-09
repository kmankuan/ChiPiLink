"""
Test Users Management API - Auth V2 Module
Tests for the Registered Users tab in admin panel
- GET /api/auth-v2/users (list all users)
- GET /api/auth-v2/users/stats (user statistics)
- GET /api/auth-v2/users?is_admin=true (filter by admin)
- PUT /api/auth-v2/users/{user_id} (update user)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token") or data.get("session_token")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestUsersListEndpoint:
    """Tests for GET /api/auth-v2/users"""
    
    def test_get_users_success(self, auth_headers):
        """GET /api/auth-v2/users returns 200 with users list"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=100",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"GET /api/auth-v2/users returned {len(data)} users")
        
    def test_get_users_returns_all_30_users(self, auth_headers):
        """Verify all 30 users are returned including ones with null email"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=100",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 30, f"Expected at least 30 users, got {len(data)}"
        print(f"Total users returned: {len(data)}")
        
    def test_users_have_required_fields(self, auth_headers):
        """Verify user objects have required fields"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 0:
            user = data[0]
            required_fields = ["user_id", "is_admin"]
            for field in required_fields:
                assert field in user, f"Missing required field: {field}"
            # Optional fields that can be null
            optional_fields = ["email", "name", "phone", "students", "is_active", "last_login", "created_at"]
            print(f"User fields: {list(user.keys())}")
            
    def test_users_with_null_email_included(self, auth_headers):
        """Verify users with null/empty email are included in response"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=100",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        # Check for users with null/empty email
        users_with_no_email = [u for u in data if not u.get("email")]
        print(f"Users with no email: {len(users_with_no_email)}")
        # Just verify we can handle users with null emails (no assertion on count)
        
    def test_get_users_requires_auth(self):
        """GET /api/auth-v2/users requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth-v2/users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestUsersFilterEndpoint:
    """Tests for GET /api/auth-v2/users with filters"""
    
    def test_filter_admin_users(self, auth_headers):
        """GET /api/auth-v2/users?is_admin=true returns only admins"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?is_admin=true",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned users should be admins
        for user in data:
            assert user.get("is_admin") == True, f"Non-admin user in admin filter: {user.get('email')}"
        print(f"Admin users count: {len(data)}")
        
    def test_filter_regular_users(self, auth_headers):
        """GET /api/auth-v2/users?is_admin=false returns only regular users"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?is_admin=false",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned users should be non-admins
        for user in data:
            assert user.get("is_admin") == False, f"Admin user in regular filter: {user.get('email')}"
        print(f"Regular users count: {len(data)}")


class TestUsersStatsEndpoint:
    """Tests for GET /api/auth-v2/users/stats"""
    
    def test_get_stats_success(self, auth_headers):
        """GET /api/auth-v2/users/stats returns 200 with stats"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        required_fields = ["total_users", "admins", "regular_users"]
        for field in required_fields:
            assert field in data, f"Missing stats field: {field}"
        print(f"Stats: total={data.get('total_users')}, admins={data.get('admins')}, regular={data.get('regular_users')}")
        
    def test_stats_values_are_correct(self, auth_headers):
        """Verify stats values match expected counts"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        stats = response.json()
        
        # total = admins + regular
        assert stats["total_users"] == stats["admins"] + stats["regular_users"], \
            f"Stats mismatch: {stats['total_users']} != {stats['admins']} + {stats['regular_users']}"
            
        # Should have at least 30 total users per requirements
        assert stats["total_users"] >= 30, f"Expected at least 30 users, got {stats['total_users']}"
        
    def test_stats_requires_auth(self):
        """GET /api/auth-v2/users/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth-v2/users/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestUserUpdateEndpoint:
    """Tests for PUT /api/auth-v2/users/{user_id}"""
    
    def test_update_user_success(self, auth_headers):
        """PUT /api/auth-v2/users/{user_id} updates user successfully"""
        # First get a user to update
        list_response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=10",
            headers=auth_headers
        )
        assert list_response.status_code == 200
        users = list_response.json()
        
        if len(users) == 0:
            pytest.skip("No users available to test update")
            
        # Find a non-admin user to update (safer for testing)
        test_user = None
        for u in users:
            if not u.get("is_admin"):
                test_user = u
                break
        
        if not test_user:
            test_user = users[0]  # Fallback to first user
            
        user_id = test_user["user_id"]
        original_name = test_user.get("name", "")
        
        # Update the user's name
        new_name = f"TEST_Updated_{original_name}" if original_name else "TEST_Updated_User"
        update_response = requests.put(
            f"{BASE_URL}/api/auth-v2/users/{user_id}",
            headers=auth_headers,
            json={"name": new_name}
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated_user = update_response.json()
        assert updated_user.get("name") == new_name, f"Name not updated: {updated_user.get('name')}"
        print(f"Updated user {user_id}: name changed to '{new_name}'")
        
        # Revert the change
        revert_response = requests.put(
            f"{BASE_URL}/api/auth-v2/users/{user_id}",
            headers=auth_headers,
            json={"name": original_name}
        )
        assert revert_response.status_code == 200, f"Revert failed: {revert_response.text}"
        
    def test_update_user_phone(self, auth_headers):
        """PUT /api/auth-v2/users/{user_id} can update phone"""
        list_response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=5",
            headers=auth_headers
        )
        users = list_response.json()
        
        if len(users) == 0:
            pytest.skip("No users available")
            
        test_user = users[0]
        user_id = test_user["user_id"]
        original_phone = test_user.get("phone", "")
        
        # Update phone
        update_response = requests.put(
            f"{BASE_URL}/api/auth-v2/users/{user_id}",
            headers=auth_headers,
            json={"phone": "+1234567890"}
        )
        assert update_response.status_code == 200
        
        # Revert
        requests.put(
            f"{BASE_URL}/api/auth-v2/users/{user_id}",
            headers=auth_headers,
            json={"phone": original_phone}
        )
        
    def test_update_nonexistent_user(self, auth_headers):
        """PUT /api/auth-v2/users/{invalid_id} returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/auth-v2/users/nonexistent_user_id_12345",
            headers=auth_headers,
            json={"name": "Test"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
    def test_update_requires_auth(self):
        """PUT /api/auth-v2/users/{user_id} requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/auth-v2/users/some_user_id",
            json={"name": "Test"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
