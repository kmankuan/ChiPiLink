"""
Super Pin Feature Tests
Tests for the 3 improvements:
1. Multiple check-in methods selection (QR, manual, geo) when creating a league
2. "Volver a PinpanClub" button navigation
3. Player source tabs in new match modal (PinpanClub, Users, Monday.com)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests to get valid token"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "cliente" in data
        assert data["cliente"]["es_admin"] == True
        print(f"✅ Login successful for admin user")


class TestUsersEndpoint:
    """Tests for GET /api/auth-v2/users endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        return response.json()["token"]
    
    def test_get_users_list(self, auth_token):
        """Test GET /api/auth-v2/users returns list of users"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/users",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one user"
        
        # Verify user structure
        user = data[0]
        assert "email" in user
        assert "nombre" in user
        assert "cliente_id" in user
        print(f"✅ GET /api/auth-v2/users returned {len(data)} users")
    
    def test_get_users_requires_auth(self):
        """Test that users endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/auth-v2/users")
        assert response.status_code == 401 or response.status_code == 403
        print("✅ Users endpoint correctly requires authentication")


class TestMondayPlayersEndpoint:
    """Tests for GET /api/pinpanclub/monday/players endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        return response.json()["token"]
    
    def test_get_monday_players(self, auth_token):
        """Test GET /api/pinpanclub/monday/players endpoint exists and responds"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/monday/players",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return players array (may be empty if not configured)
        assert "players" in data, "Response should have 'players' key"
        assert isinstance(data["players"], list), "Players should be a list"
        
        # May have message if not configured
        if "message" in data:
            print(f"✅ Monday players endpoint returned message: {data['message']}")
        else:
            print(f"✅ Monday players endpoint returned {len(data['players'])} players")
    
    def test_monday_players_requires_auth(self):
        """Test that Monday players endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/monday/players")
        assert response.status_code == 401 or response.status_code == 403
        print("✅ Monday players endpoint correctly requires authentication")


class TestSuperPinLeagues:
    """Tests for Super Pin leagues endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        return response.json()["token"]
    
    def test_get_leagues(self):
        """Test GET /api/pinpanclub/superpin/leagues"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET leagues returned {len(data)} leagues")
    
    def test_league_has_checkin_config(self):
        """Test that leagues have checkin_config with methods array"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            league = data[0]
            assert "checkin_config" in league, "League should have checkin_config"
            checkin_config = league["checkin_config"]
            # Check for method or methods field
            assert "method" in checkin_config or "methods" in checkin_config, \
                "checkin_config should have method or methods"
            print(f"✅ League has checkin_config: {checkin_config}")
        else:
            pytest.skip("No leagues to test")
    
    def test_create_league_with_multiple_checkin_methods(self, auth_token):
        """Test creating a league with multiple check-in methods"""
        import uuid
        test_id = str(uuid.uuid4())[:8]
        
        league_data = {
            "nombre": f"TEST_Liga_{test_id}",
            "temporada": "2025",
            "descripcion": "Test league with multiple check-in methods",
            "scoring_config": {"system": "simple", "points_win": 3, "points_loss": 1},
            "checkin_config": {
                "methods": ["manual", "qr_code", "geolocation"],
                "require_all": False
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues",
            json=league_data,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert response.status_code in [200, 201], f"Failed to create league: {response.text}"
        data = response.json()
        
        # Verify the league was created with the correct config
        assert "liga_id" in data, "Response should have liga_id"
        assert "checkin_config" in data, "Response should have checkin_config"
        
        print(f"✅ Created league with multiple check-in methods: {data.get('liga_id')}")
        
        # Cleanup - delete the test league
        liga_id = data.get("liga_id")
        if liga_id:
            # Try to delete (may not have endpoint)
            requests.delete(
                f"{BASE_URL}/api/pinpanclub/superpin/leagues/{liga_id}",
                headers={"Authorization": f"Bearer {auth_token}"}
            )


class TestSuperPinLeagueDetail:
    """Tests for Super Pin league detail endpoints"""
    
    def test_get_league_detail(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id}"""
        # First get list of leagues
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues")
        assert response.status_code == 200
        leagues = response.json()
        
        if len(leagues) > 0:
            liga_id = leagues[0]["liga_id"]
            response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{liga_id}")
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert data["liga_id"] == liga_id
            print(f"✅ GET league detail for {liga_id}")
        else:
            pytest.skip("No leagues to test")
    
    def test_get_league_ranking(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id}/ranking"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues")
        leagues = response.json()
        
        if len(leagues) > 0:
            liga_id = leagues[0]["liga_id"]
            response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{liga_id}/ranking")
            assert response.status_code == 200, f"Failed: {response.text}"
            data = response.json()
            assert "entries" in data or "total_jugadores" in data
            print(f"✅ GET league ranking for {liga_id}")
        else:
            pytest.skip("No leagues to test")


class TestPinpanClubPlayers:
    """Tests for PinpanClub players endpoint"""
    
    def test_get_players(self):
        """Test GET /api/pinpanclub/players"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET players returned {len(data)} players")


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✅ API health check passed: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
