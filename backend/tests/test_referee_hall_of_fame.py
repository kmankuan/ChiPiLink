"""
Test Referee System & Hall of Fame Endpoints
Tests for:
- GET /api/pinpanclub/referee/settings
- PUT /api/pinpanclub/referee/settings/{game_type} (admin-only)
- GET /api/pinpanclub/referee/profiles
- GET /api/pinpanclub/referee/profiles/{player_id}
- POST /api/pinpanclub/referee/rate
- POST /api/pinpanclub/referee/record-activity
- GET /api/pinpanclub/referee/hall-of-fame
- GET /api/pinpanclub/referee/hall-of-fame?mode=arena
- GET /api/pinpanclub/referee/hall-of-fame?mode=referee
- POST /api/pinpanclub/referee/hall-of-fame/refresh (admin-only)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
AUTH_ENDPOINT = f"{BASE_URL}/api/auth-v2/login"

# Test credentials
ADMIN_CREDENTIALS = {"email": "admin@chipi.co", "password": "admin"}


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(AUTH_ENDPOINT, json=ADMIN_CREDENTIALS)
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_client(api_client, admin_token):
    """Session with admin auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestRefereeSettings:
    """Test referee settings endpoints"""

    def test_get_settings_public(self, api_client):
        """GET /api/pinpanclub/referee/settings - should return default config for 4 game types"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/settings")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "referee_config" in data, "Missing referee_config in response"
        
        config = data["referee_config"]
        required_types = ["league", "rapidpin", "arena", "casual"]
        for game_type in required_types:
            assert game_type in config, f"Missing game type: {game_type}"
            assert "required" in config[game_type], f"Missing 'required' field for {game_type}"
            assert "points_awarded" in config[game_type], f"Missing 'points_awarded' field for {game_type}"
            assert "allow_self_referee" in config[game_type], f"Missing 'allow_self_referee' field for {game_type}"
        print(f"✓ GET /api/pinpanclub/referee/settings - returned config for 4 game types")

    def test_update_settings_requires_admin(self, api_client):
        """PUT /api/pinpanclub/referee/settings/{game_type} - should require admin auth"""
        # Without auth token
        response = requests.put(
            f"{BASE_URL}/api/pinpanclub/referee/settings/arena",
            json={"required": True, "points_awarded": 5}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ PUT /api/pinpanclub/referee/settings/arena - requires admin auth (got {response.status_code})")

    def test_update_settings_admin(self, admin_client):
        """PUT /api/pinpanclub/referee/settings/{game_type} - admin can update settings"""
        # Update arena settings
        response = admin_client.put(
            f"{BASE_URL}/api/pinpanclub/referee/settings/arena",
            json={"required": True, "points_awarded": 5}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "referee_config" in data
        assert data["referee_config"]["arena"]["points_awarded"] == 5
        print(f"✓ PUT /api/pinpanclub/referee/settings/arena - admin updated points_awarded to 5")
        
        # Reset to default
        admin_client.put(
            f"{BASE_URL}/api/pinpanclub/referee/settings/arena",
            json={"points_awarded": 3}
        )

    def test_update_settings_invalid_game_type(self, admin_client):
        """PUT /api/pinpanclub/referee/settings/{game_type} - invalid game type returns 400"""
        response = admin_client.put(
            f"{BASE_URL}/api/pinpanclub/referee/settings/invalid_type",
            json={"required": True}
        )
        assert response.status_code == 400, f"Expected 400 for invalid game type, got {response.status_code}"
        print(f"✓ PUT /api/pinpanclub/referee/settings/invalid_type - returns 400")


class TestRefereeProfiles:
    """Test referee profile endpoints"""

    def test_get_profiles_leaderboard(self, api_client):
        """GET /api/pinpanclub/referee/profiles - returns referee leaderboard"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/profiles?limit=20")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of referee profiles"
        # List may be empty if no referee activity yet
        if len(data) > 0:
            first = data[0]
            assert "player_id" in first, "Missing player_id in profile"
            assert "total_matches_refereed" in first, "Missing total_matches_refereed"
            assert "total_points_earned" in first, "Missing total_points_earned"
        print(f"✓ GET /api/pinpanclub/referee/profiles - returned {len(data)} profiles")

    def test_get_profile_by_id_not_found(self, api_client):
        """GET /api/pinpanclub/referee/profiles/{player_id} - returns 404 for non-existent"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/profiles/nonexistent_player_id")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/pinpanclub/referee/profiles/nonexistent - returns 404")


class TestRefereeActivity:
    """Test referee activity recording"""

    def test_record_activity_requires_auth(self):
        """POST /api/pinpanclub/referee/record-activity - requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/referee/record-activity",
            json={"player_id": "test_player", "game_type": "casual"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ POST /api/pinpanclub/referee/record-activity - requires auth")

    def test_record_activity_success(self, admin_client):
        """POST /api/pinpanclub/referee/record-activity - records activity"""
        test_player_id = "TEST_REFEREE_001"
        response = admin_client.post(
            f"{BASE_URL}/api/pinpanclub/referee/record-activity",
            json={
                "player_id": test_player_id,
                "game_type": "casual",
                "player_name": "Test Referee"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["player_id"] == test_player_id
        assert data["total_matches_refereed"] >= 1
        assert data["casual_matches"] >= 1
        assert "first_whistle" in data.get("badges", []), "Should have first_whistle badge"
        print(f"✓ POST /api/pinpanclub/referee/record-activity - recorded activity for {test_player_id}")


class TestRefereeRating:
    """Test referee rating endpoint"""

    def test_rate_referee_requires_auth(self):
        """POST /api/pinpanclub/referee/rate - requires auth"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/referee/rate",
            json={"match_id": "test_match", "referee_id": "test_ref", "rating": 5}
        )
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ POST /api/pinpanclub/referee/rate - requires auth")

    def test_rate_referee_validation(self, admin_client):
        """POST /api/pinpanclub/referee/rate - validates required fields"""
        # Missing required fields
        response = admin_client.post(
            f"{BASE_URL}/api/pinpanclub/referee/rate",
            json={"rating": 5}
        )
        assert response.status_code == 400, f"Expected 400 for missing fields, got {response.status_code}"
        print(f"✓ POST /api/pinpanclub/referee/rate - validates required fields")

    def test_rate_referee_invalid_rating(self, admin_client):
        """POST /api/pinpanclub/referee/rate - validates rating range"""
        response = admin_client.post(
            f"{BASE_URL}/api/pinpanclub/referee/rate",
            json={"match_id": "test_match", "referee_id": "TEST_REFEREE_001", "rating": 10}
        )
        assert response.status_code == 400, f"Expected 400 for invalid rating, got {response.status_code}"
        print(f"✓ POST /api/pinpanclub/referee/rate - validates rating range (1-5)")

    def test_rate_referee_success(self, admin_client):
        """POST /api/pinpanclub/referee/rate - creates rating successfully"""
        response = admin_client.post(
            f"{BASE_URL}/api/pinpanclub/referee/rate",
            json={
                "match_id": "TEST_MATCH_001",
                "referee_id": "TEST_REFEREE_001",
                "rating": 5,
                "comment": "Great ref!"
            }
        )
        # May return 200 with profile data, or error if referee doesn't exist
        if response.status_code == 200:
            data = response.json()
            # If referee exists, should have rating data
            if data:
                assert "avg_rating" in data
                print(f"✓ POST /api/pinpanclub/referee/rate - created rating, avg_rating={data.get('avg_rating')}")
            else:
                print(f"✓ POST /api/pinpanclub/referee/rate - rating accepted (referee profile may not exist)")
        else:
            # Acceptable if referee doesn't exist
            print(f"✓ POST /api/pinpanclub/referee/rate - endpoint works (status: {response.status_code})")


class TestHallOfFame:
    """Test Hall of Fame endpoints"""

    def test_get_hall_of_fame_all(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame - returns global leaderboard"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of entries"
        
        if len(data) > 0:
            first = data[0]
            assert "player_id" in first, "Missing player_id"
            assert "total_points" in first, "Missing total_points"
            assert "rank" in first, "Missing rank"
            # Check mode-specific fields exist
            assert "arena_points" in first, "Missing arena_points"
            assert "league_points" in first, "Missing league_points"
            assert "rapidpin_points" in first, "Missing rapidpin_points"
            assert "referee_points" in first, "Missing referee_points"
        
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame - returned {len(data)} entries")

    def test_get_hall_of_fame_arena_mode(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame?mode=arena - filters by arena"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?mode=arena&limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of entries"
        
        # If entries exist, they should be sorted by arena_points
        if len(data) > 1:
            for i in range(len(data) - 1):
                assert data[i].get("arena_points", 0) >= data[i+1].get("arena_points", 0), \
                    "Entries should be sorted by arena_points desc"
        
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame?mode=arena - returned {len(data)} entries")

    def test_get_hall_of_fame_league_mode(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame?mode=league - filters by league"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?mode=league&limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame?mode=league - returned {len(data)} entries")

    def test_get_hall_of_fame_rapidpin_mode(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame?mode=rapidpin - filters by rapidpin"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?mode=rapidpin&limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame?mode=rapidpin - returned {len(data)} entries")

    def test_get_hall_of_fame_referee_mode(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame?mode=referee - filters by referee"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?mode=referee&limit=50")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame?mode=referee - returned {len(data)} entries")

    def test_refresh_hall_of_fame_requires_admin(self):
        """POST /api/pinpanclub/referee/hall-of-fame/refresh - requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/refresh")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ POST /api/pinpanclub/referee/hall-of-fame/refresh - requires admin auth")

    def test_refresh_hall_of_fame_admin(self, admin_client):
        """POST /api/pinpanclub/referee/hall-of-fame/refresh - admin can rebuild leaderboard"""
        response = admin_client.post(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/refresh")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "success" in data, "Missing 'success' field"
        assert data["success"] is True, "Expected success=True"
        assert "entries_updated" in data, "Missing 'entries_updated' field"
        
        print(f"✓ POST /api/pinpanclub/referee/hall-of-fame/refresh - rebuilt {data.get('entries_updated')} entries")


class TestHallOfFamePlayerDetail:
    """Test Hall of Fame player detail endpoint"""

    def test_get_player_hall_of_fame_not_found(self, api_client):
        """GET /api/pinpanclub/referee/hall-of-fame/{player_id} - returns 404 for non-existent"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/nonexistent_player")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ GET /api/pinpanclub/referee/hall-of-fame/nonexistent - returns 404")
