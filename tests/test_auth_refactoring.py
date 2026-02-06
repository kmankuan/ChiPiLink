"""
Test Auth Refactoring - Spanish to English field names
Tests login, register, and /me endpoints with English field names
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://textbook-hub-4.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"


class TestAuthLogin:
    """Test login endpoint with English 'password' field"""
    
    def test_login_with_english_password_field(self):
        """Login should work with 'password' field (English)"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["es_admin"] == True
        assert "nombre" in data["user"], "User should have nombre field"
    
    def test_login_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpassword"}
        )
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
    
    def test_login_missing_password_field(self):
        """Login should fail if password field is missing"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL}
        )
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"


class TestAuthMe:
    """Test /me endpoint returns user data correctly"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_me_endpoint_returns_user_data(self, auth_token):
        """GET /me should return user data with correct fields"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/me",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        user = response.json()
        # Verify required fields exist
        assert "cliente_id" in user, "User should have cliente_id"
        assert "email" in user, "User should have email"
        assert "nombre" in user, "User should have nombre"
        assert "es_admin" in user, "User should have es_admin"
        
        # Verify values
        assert user["email"] == ADMIN_EMAIL
        assert user["es_admin"] == True
    
    def test_me_endpoint_without_token(self):
        """GET /me should fail without token"""
        response = requests.get(f"{BASE_URL}/api/auth-v2/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"


class TestAuthRegister:
    """Test register endpoint with English field names"""
    
    def test_register_with_english_fields(self):
        """Register should work with English field names (name, phone, address, password)"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={
                "email": unique_email,
                "name": "Test User",
                "phone": "1234567890",
                "address": "Test Address",
                "password": "TestPassword123"
            }
        )
        assert response.status_code in [200, 201], f"Register failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"] == unique_email
    
    def test_register_duplicate_email(self):
        """Register should fail with duplicate email"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={
                "email": ADMIN_EMAIL,  # Already exists
                "name": "Duplicate User",
                "password": "TestPassword123"
            }
        )
        assert response.status_code in [400, 409], f"Expected 400/409, got {response.status_code}"
    
    def test_register_missing_required_fields(self):
        """Register should fail if required fields are missing"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={"email": "test@test.com"}  # Missing name and password
        )
        assert response.status_code == 422, f"Expected 422 validation error, got {response.status_code}"


class TestAdminRedirection:
    """Test that admin users have correct es_admin flag for redirection"""
    
    def test_admin_user_has_es_admin_true(self):
        """Admin user should have es_admin=true for proper redirection"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        user = response.json()["user"]
        assert user["es_admin"] == True, "Admin user should have es_admin=true"
        # Frontend checks both es_admin and is_admin for compatibility
        # The backend returns es_admin from the database


class TestWelcomeMessage:
    """Test that user data contains name for welcome message"""
    
    def test_user_has_nombre_for_welcome(self):
        """User data should contain nombre field for welcome message"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        
        user = response.json()["user"]
        assert "nombre" in user, "User should have nombre field"
        assert user["nombre"] is not None, "nombre should not be None"
        assert len(user["nombre"]) > 0, "nombre should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
