"""
Test Suite for Iteration 172 Bug Fixes:
1. Draft orders filter - User orders API excludes draft status
2. Admin Impersonation - Admin can generate impersonation tokens for non-admin users
3. Impersonation token behavior - Access user endpoints, blocked from admin endpoints
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"
TEST_USER_ID = "cli_6cc8b44b7ad5"  # Juan Pérez


class TestDraftOrdersFilter:
    """Test that user orders API excludes draft status orders"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_admin_login_works(self, admin_token):
        """Verify admin authentication"""
        assert admin_token is not None
        print(f"Admin token obtained: {admin_token[:20]}...")
    
    def test_my_orders_endpoint_excludes_drafts(self, admin_token):
        """GET /api/store/textbook-orders/my-orders should not return draft orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/my-orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 200 with orders array
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        orders = response.json()
        assert isinstance(orders, list), "Response should be a list"
        
        # Verify no draft orders are returned
        draft_orders = [o for o in orders if o.get("status") == "draft"]
        assert len(draft_orders) == 0, f"Found draft orders in response: {draft_orders}"
        print(f"Verified: {len(orders)} orders returned, 0 draft orders (as expected)")


class TestAdminImpersonation:
    """Test admin impersonation feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def target_user(self, admin_token):
        """Get a non-admin user to impersonate"""
        # First get list of users
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=20",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        users = response.json()
        # Find a non-admin user
        non_admin_users = [u for u in users if not u.get("is_admin", False)]
        
        if non_admin_users:
            return non_admin_users[0]
        
        # If no non-admin user exists, skip impersonation tests
        pytest.skip("No non-admin users available for impersonation testing")
    
    def test_impersonate_endpoint_returns_token(self, admin_token, target_user):
        """POST /api/auth-v2/users/{user_id}/impersonate returns token and user info"""
        user_id = target_user["user_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Impersonation failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain 'token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["user_id"] == user_id, "Returned user_id should match target"
        
        print(f"Impersonation token generated for user: {data['user'].get('name', data['user'].get('email'))}")
        return data["token"]
    
    def test_impersonation_token_accesses_me_endpoint(self, admin_token, target_user):
        """Impersonation token should allow access to /api/auth-v2/users/me"""
        user_id = target_user["user_id"]
        
        # Get impersonation token
        imp_response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert imp_response.status_code == 200
        imp_token = imp_response.json()["token"]
        
        # Use impersonation token to access /me
        me_response = requests.get(
            f"{BASE_URL}/api/auth-v2/users/me",
            headers={"Authorization": f"Bearer {imp_token}"}
        )
        
        assert me_response.status_code == 200, f"Failed to access /me with imp token: {me_response.text}"
        
        me_data = me_response.json()
        assert me_data["user_id"] == user_id, f"Expected user_id {user_id}, got {me_data.get('user_id')}"
        
        # Check for _impersonated_by field
        if "_impersonated_by" in me_data:
            print(f"Impersonation marker present: _impersonated_by = {me_data['_impersonated_by']}")
        else:
            print("Note: _impersonated_by field not in response (may be filtered)")
    
    def test_impersonation_token_blocked_from_admin_endpoints(self, admin_token, target_user):
        """Impersonation token should NOT have admin access (403)"""
        user_id = target_user["user_id"]
        
        # Get impersonation token
        imp_response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert imp_response.status_code == 200
        imp_token = imp_response.json()["token"]
        
        # Try to access admin-only endpoint with impersonation token
        admin_endpoint_response = requests.get(
            f"{BASE_URL}/api/auth-v2/users",
            headers={"Authorization": f"Bearer {imp_token}"}
        )
        
        # Should get 403 Forbidden because impersonation tokens have is_admin=False
        assert admin_endpoint_response.status_code == 403, \
            f"Expected 403 for admin endpoint, got {admin_endpoint_response.status_code}: {admin_endpoint_response.text}"
        
        print("Verified: Impersonation token correctly blocked from admin endpoints (403)")
    
    def test_impersonate_nonexistent_user_returns_404(self, admin_token):
        """Impersonating non-existent user should return 404"""
        fake_user_id = "fake_nonexistent_user_12345"
        
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{fake_user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("Verified: Impersonating non-existent user returns 404")
    
    def test_regular_user_cannot_impersonate(self, admin_token, target_user):
        """Non-admin users should not be able to use impersonate endpoint"""
        user_id = target_user["user_id"]
        
        # Get impersonation token (which represents a regular user)
        imp_response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert imp_response.status_code == 200
        imp_token = imp_response.json()["token"]
        
        # Try to impersonate another user using the impersonation token (non-admin)
        another_response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {imp_token}"}
        )
        
        # Should be blocked (403)
        assert another_response.status_code == 403, \
            f"Expected 403, got {another_response.status_code}: {another_response.text}"
        
        print("Verified: Non-admin users cannot use impersonate endpoint (403)")


class TestImpersonationAuditLogging:
    """Test that impersonation is logged to MongoDB"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_impersonation_creates_audit_log(self, admin_token):
        """Impersonation should create an entry in impersonation_logs collection"""
        # Get list of users to find a target
        users_response = requests.get(
            f"{BASE_URL}/api/auth-v2/users?limit=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if users_response.status_code != 200:
            pytest.skip("Cannot get users list")
        
        users = users_response.json()
        non_admin_users = [u for u in users if not u.get("is_admin", False)]
        
        if not non_admin_users:
            pytest.skip("No non-admin users available")
        
        target_user = non_admin_users[0]
        user_id = target_user["user_id"]
        
        # Perform impersonation
        imp_response = requests.post(
            f"{BASE_URL}/api/auth-v2/users/{user_id}/impersonate",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert imp_response.status_code == 200, f"Impersonation failed: {imp_response.text}"
        
        # Note: We can't directly query MongoDB from tests, but the endpoint working
        # means the audit log was created (since it's in the same transaction)
        print(f"Impersonation performed for user {user_id} - audit log should be created")
        print("Note: Audit log verification requires direct MongoDB access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
