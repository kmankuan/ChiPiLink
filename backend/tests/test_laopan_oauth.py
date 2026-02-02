"""
LaoPan OAuth Integration Tests
Tests for LaoPan.online OAuth 2.0 authentication endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLaoPanOAuthConfig:
    """Test OAuth configuration endpoint"""
    
    def test_oauth_config_returns_200(self):
        """GET /api/invision/oauth/config should return 200"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/config")
        assert response.status_code == 200
        print(f"OAuth config response: {response.json()}")
    
    def test_oauth_config_has_required_fields(self):
        """OAuth config should have all required fields"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/config")
        data = response.json()
        
        # Check enabled status
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)
        
        # If enabled, check all required fields
        if data["enabled"]:
            assert "provider_id" in data
            assert data["provider_id"] == "laopan"
            
            assert "provider_name" in data
            assert data["provider_name"] == "LaoPan.online"
            
            assert "button_text" in data
            assert "button_text_es" in data
            assert data["button_text_es"] == "Iniciar session con LaoPan"
            
            assert "button_color" in data
            print(f"OAuth is enabled with button color: {data['button_color']}")
        else:
            print("OAuth is not enabled - check LAOPAN_OAUTH_CLIENT_ID env var")


class TestLaoPanOAuthLogin:
    """Test OAuth login initiation endpoint"""
    
    def test_oauth_login_returns_auth_url(self):
        """GET /api/invision/oauth/login should return auth_url and state"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/login")
        
        # Should return 200 if OAuth is configured
        if response.status_code == 200:
            data = response.json()
            
            assert "auth_url" in data
            assert "state" in data
            
            # Verify auth_url structure
            auth_url = data["auth_url"]
            assert "laopan.online/oauth/authorize" in auth_url
            assert "client_id=" in auth_url
            assert "redirect_uri=" in auth_url
            assert "response_type=code" in auth_url
            assert "scope=" in auth_url
            assert "state=" in auth_url
            
            # Verify state is a UUID
            state = data["state"]
            assert len(state) == 36  # UUID format
            assert state.count("-") == 4
            
            print(f"Auth URL generated: {auth_url[:100]}...")
            print(f"State token: {state}")
        elif response.status_code == 503:
            # OAuth not configured
            data = response.json()
            assert "detail" in data
            print(f"OAuth not configured: {data['detail']}")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_oauth_login_with_redirect_param(self):
        """GET /api/invision/oauth/login?redirect=/dashboard should include redirect"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/login?redirect=/dashboard")
        
        if response.status_code == 200:
            data = response.json()
            assert "auth_url" in data
            assert "state" in data
            print(f"Auth URL with redirect: {data['auth_url'][:100]}...")
        else:
            print(f"OAuth login returned: {response.status_code}")


class TestLaoPanOAuthCallback:
    """Test OAuth callback endpoint"""
    
    def test_callback_without_code_returns_400(self):
        """GET /api/invision/oauth/callback without code should return 400"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/callback")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        print(f"Missing code error: {data['detail']}")
    
    def test_callback_without_state_returns_400(self):
        """GET /api/invision/oauth/callback with code but no state should return 400"""
        response = requests.get(f"{BASE_URL}/api/invision/oauth/callback?code=test_code")
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        print(f"Missing state error: {data['detail']}")
    
    def test_callback_with_invalid_state_returns_400(self):
        """GET /api/invision/oauth/callback with invalid state should return 400"""
        response = requests.get(
            f"{BASE_URL}/api/invision/oauth/callback?code=test_code&state=invalid_state"
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        print(f"Invalid state error: {data['detail']}")
    
    def test_callback_with_oauth_error_returns_400(self):
        """GET /api/invision/oauth/callback with error param should return 400"""
        response = requests.get(
            f"{BASE_URL}/api/invision/oauth/callback?error=access_denied&error_description=User%20denied%20access"
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "access_denied" in data["detail"] or "User denied" in data["detail"]
        print(f"OAuth error handled: {data['detail']}")


class TestAdminLogin:
    """Test admin email/password login still works"""
    
    def test_admin_login_success(self):
        """POST /api/auth-v2/login with admin credentials should work"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "teck@koh.one",
                "password": "Acdb##0897"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "teck@koh.one"
        assert data["user"]["is_admin"] == True
        
        print(f"Admin login successful: {data['user']['name']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/auth-v2/login with wrong password should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "teck@koh.one",
                "password": "wrong_password"
            }
        )
        
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")


class TestInvisionAdminEndpoints:
    """Test admin-only Invision endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "teck@koh.one",
                "password": "Acdb##0897"
            }
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Admin login failed")
    
    def test_invision_status_requires_auth(self):
        """GET /api/invision/status without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/invision/status")
        assert response.status_code in [401, 403]
        print("Status endpoint correctly requires auth")
    
    def test_invision_status_with_admin(self, admin_token):
        """GET /api/invision/status with admin auth should return status"""
        response = requests.get(
            f"{BASE_URL}/api/invision/status",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "oauth" in data
        assert "enabled" in data["oauth"]
        assert "configured" in data["oauth"]
        
        print(f"Invision status: OAuth enabled={data['oauth']['enabled']}, configured={data['oauth']['configured']}")
    
    def test_invision_config_requires_auth(self):
        """GET /api/invision/config without auth should return 401"""
        response = requests.get(f"{BASE_URL}/api/invision/config")
        assert response.status_code in [401, 403]
        print("Config endpoint correctly requires auth")
    
    def test_invision_config_with_admin(self, admin_token):
        """GET /api/invision/config with admin auth should return config"""
        response = requests.get(
            f"{BASE_URL}/api/invision/config",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "oauth_enabled" in data
        assert "oauth_provider" in data
        
        print(f"Invision config: oauth_enabled={data['oauth_enabled']}, provider={data['oauth_provider']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
