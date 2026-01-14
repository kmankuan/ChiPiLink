"""
RBAC Roles Module - Backend API Tests
Tests for roles and permissions endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"
REGULAR_USER_EMAIL = "testuser@test.com"
REGULAR_USER_PASSWORD = "test123"


class TestRBACAuth:
    """Test authentication for RBAC testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "contrasena": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, f"No token in response: {data}"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def regular_user_token(self):
        """Get regular user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": REGULAR_USER_EMAIL,
            "contrasena": REGULAR_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Regular user login failed: {response.text}")
        data = response.json()
        return data.get("token")
    
    def test_admin_login(self, admin_token):
        """Test admin can login successfully"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✅ Admin login successful, token length: {len(admin_token)}")


class TestRolesEndpoints:
    """Test roles CRUD endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "contrasena": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_get_all_roles(self, admin_token):
        """GET /api/roles - List all roles (requires admin)"""
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get roles: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "roles" in data, f"No 'roles' key in response: {data}"
        roles = data["roles"]
        assert isinstance(roles, list), "Roles should be a list"
        
        # Verify default roles exist
        role_ids = [r.get("role_id") for r in roles]
        assert "super_admin" in role_ids, "super_admin role should exist"
        assert "admin" in role_ids, "admin role should exist"
        assert "moderator" in role_ids, "moderator role should exist"
        assert "user" in role_ids, "user role should exist"
        
        print(f"✅ GET /api/roles - Found {len(roles)} roles: {role_ids}")
        
        # Verify role structure
        for role in roles:
            assert "role_id" in role, f"Role missing role_id: {role}"
            assert "nombre" in role, f"Role missing nombre: {role}"
            assert "permisos" in role, f"Role missing permisos: {role}"
            
    def test_get_my_permissions(self, admin_token):
        """GET /api/roles/my-permissions - Get current user's role and permissions"""
        response = requests.get(
            f"{BASE_URL}/api/roles/my-permissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get my permissions: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "role" in data, f"No 'role' key in response: {data}"
        assert "permissions" in data, f"No 'permissions' key in response: {data}"
        
        role = data["role"]
        permissions = data["permissions"]
        
        # Admin should have super_admin role or admin role
        assert role is not None, "Role should not be None"
        assert role.get("role_id") in ["super_admin", "admin"], f"Admin should have super_admin or admin role, got: {role.get('role_id')}"
        
        # Super admin should have '*' permission (all permissions)
        if role.get("role_id") == "super_admin":
            assert "*" in permissions, f"Super admin should have '*' permission, got: {permissions}"
        
        print(f"✅ GET /api/roles/my-permissions - Role: {role.get('nombre')}, Permissions count: {len(permissions)}")
        
    def test_get_available_permissions(self, admin_token):
        """GET /api/roles/available-permissions - List all available permissions"""
        response = requests.get(
            f"{BASE_URL}/api/roles/available-permissions",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get available permissions: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "permissions" in data, f"No 'permissions' key in response: {data}"
        permissions = data["permissions"]
        
        # Verify expected permission modules exist
        expected_modules = ["admin", "users", "roles", "unatienda", "pinpanclub"]
        for module in expected_modules:
            assert module in permissions, f"Module '{module}' should exist in permissions"
        
        print(f"✅ GET /api/roles/available-permissions - Found {len(permissions)} permission modules")
        
    def test_check_permission(self, admin_token):
        """GET /api/roles/check/{permission} - Check if user has permission"""
        # Test admin.access permission
        response = requests.get(
            f"{BASE_URL}/api/roles/check/admin.access",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to check permission: {response.text}"
        data = response.json()
        
        assert "has_permission" in data, f"No 'has_permission' key in response: {data}"
        assert "permission" in data, f"No 'permission' key in response: {data}"
        assert data["permission"] == "admin.access"
        assert data["has_permission"] == True, "Admin should have admin.access permission"
        
        print(f"✅ GET /api/roles/check/admin.access - has_permission: {data['has_permission']}")
        
    def test_get_specific_role(self, admin_token):
        """GET /api/roles/{role_id} - Get a specific role"""
        response = requests.get(
            f"{BASE_URL}/api/roles/super_admin",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get role: {response.text}"
        data = response.json()
        
        assert data.get("role_id") == "super_admin"
        assert data.get("nombre") == "Super Administrador"
        assert "*" in data.get("permisos", []), "Super admin should have '*' permission"
        
        print(f"✅ GET /api/roles/super_admin - Role: {data.get('nombre')}")


class TestRoleAssignment:
    """Test role assignment endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "contrasena": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_assign_role_endpoint_exists(self, admin_token):
        """POST /api/roles/assign - Verify endpoint exists"""
        # Test with missing parameters to verify endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/roles/assign",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 422 (validation error) not 404
        assert response.status_code in [422, 400], f"Unexpected status: {response.status_code}, {response.text}"
        print(f"✅ POST /api/roles/assign - Endpoint exists (returns {response.status_code} for missing params)")
        
    def test_get_role_users(self, admin_token):
        """GET /api/roles/{role_id}/users - Get users with specific role"""
        response = requests.get(
            f"{BASE_URL}/api/roles/super_admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get role users: {response.text}"
        data = response.json()
        
        assert "users" in data, f"No 'users' key in response: {data}"
        assert "total" in data, f"No 'total' key in response: {data}"
        
        print(f"✅ GET /api/roles/super_admin/users - Found {data['total']} users with super_admin role")


class TestRegularUserPermissions:
    """Test that regular users have restricted access"""
    
    @pytest.fixture(scope="class")
    def regular_user_token(self):
        """Get regular user authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": REGULAR_USER_EMAIL,
            "contrasena": REGULAR_USER_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Regular user login failed - user may not exist: {response.text}")
        return response.json().get("token")
    
    def test_regular_user_cannot_list_roles(self, regular_user_token):
        """Regular user should NOT be able to list all roles"""
        if not regular_user_token:
            pytest.skip("No regular user token available")
            
        response = requests.get(
            f"{BASE_URL}/api/roles",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        # Should return 403 Forbidden
        assert response.status_code == 403, f"Regular user should not access /api/roles, got: {response.status_code}"
        print(f"✅ Regular user correctly denied access to GET /api/roles (403)")
        
    def test_regular_user_can_get_own_permissions(self, regular_user_token):
        """Regular user CAN get their own permissions"""
        if not regular_user_token:
            pytest.skip("No regular user token available")
            
        response = requests.get(
            f"{BASE_URL}/api/roles/my-permissions",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200, f"Regular user should access /api/roles/my-permissions: {response.text}"
        data = response.json()
        
        # Regular user should have 'user' role
        role = data.get("role", {})
        assert role.get("role_id") == "user", f"Regular user should have 'user' role, got: {role.get('role_id')}"
        
        # Regular user should NOT have admin permissions
        permissions = data.get("permissions", [])
        assert "*" not in permissions, "Regular user should not have '*' permission"
        assert "admin.access" not in permissions, "Regular user should not have admin.access"
        
        print(f"✅ Regular user can get own permissions - Role: {role.get('nombre')}, Permissions: {len(permissions)}")
        
    def test_regular_user_check_permission(self, regular_user_token):
        """Regular user can check their own permissions"""
        if not regular_user_token:
            pytest.skip("No regular user token available")
            
        response = requests.get(
            f"{BASE_URL}/api/roles/check/admin.access",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 200, f"Failed to check permission: {response.text}"
        data = response.json()
        
        # Regular user should NOT have admin.access
        assert data["has_permission"] == False, "Regular user should not have admin.access"
        print(f"✅ Regular user correctly does not have admin.access permission")


class TestUnauthenticatedAccess:
    """Test that unauthenticated users cannot access roles endpoints"""
    
    def test_unauthenticated_cannot_list_roles(self):
        """Unauthenticated user cannot list roles"""
        response = requests.get(f"{BASE_URL}/api/roles")
        assert response.status_code == 401, f"Unauthenticated should get 401, got: {response.status_code}"
        print(f"✅ Unauthenticated correctly denied access to GET /api/roles (401)")
        
    def test_unauthenticated_cannot_get_permissions(self):
        """Unauthenticated user cannot get permissions"""
        response = requests.get(f"{BASE_URL}/api/roles/my-permissions")
        assert response.status_code == 401, f"Unauthenticated should get 401, got: {response.status_code}"
        print(f"✅ Unauthenticated correctly denied access to GET /api/roles/my-permissions (401)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
