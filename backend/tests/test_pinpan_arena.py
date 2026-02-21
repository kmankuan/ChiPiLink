"""
PinPan Arena - Backend API Tests
Tests for the unified tournament management system:
- Tournament CRUD operations
- Registration flow
- Bracket generation
- Match result submission
- Access control for admin/moderator actions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


class TestArenaAuth:
    """Authentication tests for Arena endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        data = res.json()
        token = data.get("token") or data.get("access_token")
        assert token, f"No token in response: {data}"
        return token
    
    def test_auth_login_success(self):
        """Test admin login returns token"""
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert res.status_code == 200
        data = res.json()
        assert "token" in data or "access_token" in data


class TestArenaTournamentCRUD:
    """Tournament CRUD operations tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Auth headers for API calls"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_list_tournaments(self):
        """GET /api/pinpanclub/arena/tournaments - List all tournaments"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} tournaments")
    
    def test_create_tournament_requires_auth(self):
        """POST /api/pinpanclub/arena/tournaments - Requires authentication"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments", json={
            "name": "Test Tournament",
            "format": "single_elimination"
        })
        assert res.status_code in [401, 403], f"Expected auth error, got {res.status_code}"
    
    def test_create_tournament_single_elimination(self, auth_headers):
        """Create a Single Elimination tournament"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments", 
            json={
                "name": "TEST_Single_Elim_Tournament",
                "description": "Test tournament for backend testing",
                "format": "single_elimination",
                "max_players": 8,
                "best_of": 3,
                "third_place_match": True
            },
            headers=auth_headers
        )
        assert res.status_code == 200, f"Create failed: {res.text}"
        data = res.json()
        
        # Verify response structure
        assert "tournament_id" in data
        assert data["name"] == "TEST_Single_Elim_Tournament"
        assert data["format"] == "single_elimination"
        assert data["status"] == "draft"
        assert data["max_players"] == 8
        assert data["third_place_match"] == True
        
        print(f"Created tournament: {data['tournament_id']}")
        return data["tournament_id"]
    
    def test_create_tournament_round_robin(self, auth_headers):
        """Create a Round Robin tournament"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_Round_Robin_Tournament",
                "format": "round_robin",
                "max_players": 6,
                "best_of": 3,
                "points_win": 3,
                "points_loss": 1
            },
            headers=auth_headers
        )
        assert res.status_code == 200, f"Create failed: {res.text}"
        data = res.json()
        assert data["format"] == "round_robin"
        print(f"Created RR tournament: {data['tournament_id']}")
    
    def test_create_tournament_group_knockout(self, auth_headers):
        """Create a Group + Knockout tournament"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_Group_Knockout_Tournament",
                "format": "group_knockout",
                "max_players": 16,
                "num_groups": 4,
                "players_per_group_advance": 2
            },
            headers=auth_headers
        )
        assert res.status_code == 200, f"Create failed: {res.text}"
        data = res.json()
        assert data["format"] == "group_knockout"
        assert data["num_groups"] == 4
        print(f"Created Group+KO tournament: {data['tournament_id']}")
    
    def test_create_tournament_rapidpin(self, auth_headers):
        """Create a RapidPin Mode tournament"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_RapidPin_Tournament",
                "format": "rapidpin",
                "max_players": 10,
                "rapidpin_deadline_hours": 48
            },
            headers=auth_headers
        )
        assert res.status_code == 200, f"Create failed: {res.text}"
        data = res.json()
        assert data["format"] == "rapidpin"
        print(f"Created RapidPin tournament: {data['tournament_id']}")
    
    def test_get_tournament_details(self, auth_headers):
        """GET /api/pinpanclub/arena/tournaments/{id} - Get tournament details"""
        # First create a tournament
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Detail_Tournament", "format": "single_elimination"},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Then get details
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        assert res.status_code == 200
        data = res.json()
        assert data["tournament_id"] == tid
        assert data["name"] == "TEST_Detail_Tournament"
        print(f"Got details for tournament: {tid}")
    
    def test_get_nonexistent_tournament(self):
        """GET with invalid ID returns 404"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/nonexistent_123")
        assert res.status_code == 404
    
    def test_delete_tournament(self, auth_headers):
        """DELETE /api/pinpanclub/arena/tournaments/{id} - Delete tournament"""
        # Create tournament to delete
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Delete_Tournament", "format": "single_elimination"},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Delete it
        res = requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}",
            headers=auth_headers
        )
        assert res.status_code == 200
        
        # Verify deleted
        get_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        assert get_res.status_code == 404
        print(f"Successfully deleted tournament: {tid}")


class TestArenaRegistrationFlow:
    """Tournament registration flow tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def test_tournament(self, auth_headers):
        """Create a test tournament for registration tests"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Registration_Tournament", "format": "single_elimination", "max_players": 8},
            headers=auth_headers
        )
        return res.json()["tournament_id"]
    
    def test_open_registration(self, auth_headers, test_tournament):
        """POST /tournaments/{id}/open-registration - Open registration"""
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/open-registration",
            headers=auth_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "registration_open"
        print(f"Opened registration for: {test_tournament}")
    
    def test_register_player_admin(self, auth_headers, test_tournament):
        """POST /tournaments/{id}/register/{player_id} - Admin registers player"""
        # First open registration
        requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/open-registration",
            headers=auth_headers
        )
        
        # Get a player ID from players list
        players_res = requests.get(f"{BASE_URL}/api/pinpanclub/players?limit=5")
        if players_res.status_code == 200 and players_res.json():
            player_id = players_res.json()[0].get("jugador_id") or players_res.json()[0].get("player_id")
            if player_id:
                res = requests.post(
                    f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/register/{player_id}",
                    headers=auth_headers
                )
                assert res.status_code == 200
                data = res.json()
                assert data["total_participants"] >= 1
                print(f"Registered player {player_id}")
            else:
                pytest.skip("No player ID available")
        else:
            pytest.skip("No players available for registration test")
    
    def test_close_registration(self, auth_headers, test_tournament):
        """POST /tournaments/{id}/close-registration - Close registration"""
        # First open registration
        requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/open-registration",
            headers=auth_headers
        )
        
        # Then close it
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/close-registration",
            headers=auth_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "registration_closed"
        print(f"Closed registration for: {test_tournament}")


class TestArenaBracketGeneration:
    """Bracket generation and match tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture
    def tournament_with_players(self, auth_headers):
        """Create tournament with registered players for bracket tests"""
        # Create tournament
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Bracket_Tournament", "format": "single_elimination", "max_players": 8},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Open registration
        requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/open-registration",
            headers=auth_headers
        )
        
        # Get players and register at least 4
        players_res = requests.get(f"{BASE_URL}/api/pinpanclub/players?limit=4")
        if players_res.status_code == 200 and len(players_res.json()) >= 2:
            for player in players_res.json()[:4]:
                player_id = player.get("jugador_id") or player.get("player_id")
                if player_id:
                    requests.post(
                        f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/register/{player_id}",
                        headers=auth_headers
                    )
        
        return tid
    
    def test_apply_seeding(self, auth_headers, tournament_with_players):
        """POST /tournaments/{id}/apply-seeding - Apply seeding to participants"""
        tid = tournament_with_players
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/apply-seeding",
            headers=auth_headers
        )
        assert res.status_code == 200
        data = res.json()
        # Check participants have seeds
        if data.get("participants"):
            has_seeds = any(p.get("seed") for p in data["participants"])
            assert has_seeds, "Seeding not applied to participants"
            print(f"Applied seeding to {len(data['participants'])} participants")
    
    def test_generate_brackets(self, auth_headers, tournament_with_players):
        """POST /tournaments/{id}/generate-brackets - Generate brackets and start"""
        tid = tournament_with_players
        
        # Check if we have enough players
        tournament_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        if tournament_res.json().get("total_participants", 0) < 2:
            pytest.skip("Not enough players for bracket generation")
        
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/generate-brackets",
            headers=auth_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        assert "brackets" in data
        print(f"Generated brackets for tournament {tid}, status: {data['status']}")
    
    def test_get_tournament_matches(self, auth_headers, tournament_with_players):
        """GET /tournaments/{id}/matches - Get all matches"""
        tid = tournament_with_players
        
        # Generate brackets first if not already
        tournament_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        if tournament_res.json().get("status") != "in_progress":
            if tournament_res.json().get("total_participants", 0) >= 2:
                requests.post(
                    f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/generate-brackets",
                    headers=auth_headers
                )
        
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} matches in tournament")


class TestArenaMatchResults:
    """Match result submission tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_submit_match_result(self, auth_headers):
        """POST /tournaments/{id}/matches/{match_id}/result - Submit match result"""
        # Create tournament with players
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Match_Result_Tournament", "format": "single_elimination", "max_players": 4},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Open registration and register players
        requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/open-registration", headers=auth_headers)
        
        players_res = requests.get(f"{BASE_URL}/api/pinpanclub/players?limit=4")
        registered_players = []
        if players_res.status_code == 200:
            for player in players_res.json()[:4]:
                player_id = player.get("jugador_id") or player.get("player_id")
                if player_id:
                    reg_res = requests.post(
                        f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/register/{player_id}",
                        headers=auth_headers
                    )
                    if reg_res.status_code == 200:
                        registered_players.append(player_id)
        
        if len(registered_players) < 2:
            pytest.skip("Not enough players registered")
        
        # Generate brackets
        gen_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/generate-brackets",
            headers=auth_headers
        )
        
        # Get matches
        matches_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches")
        matches = matches_res.json()
        
        # Find a pending match with both players
        pending_match = None
        for m in matches:
            if m.get("status") == "pending" and m.get("player_a_id") and m.get("player_b_id"):
                pending_match = m
                break
        
        if not pending_match:
            print("No pending match with both players found, skipping result submission")
            return
        
        # Submit result
        winner_id = pending_match["player_a_id"]
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches/{pending_match['match_id']}/result",
            params={"winner_id": winner_id, "score_a": 3, "score_b": 1},
            headers=auth_headers
        )
        assert res.status_code == 200
        print(f"Submitted result for match {pending_match['match_id']}, winner: {winner_id}")


class TestArenaTournamentCompletion:
    """Tournament completion tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_complete_tournament(self, auth_headers):
        """POST /tournaments/{id}/complete - Manually complete tournament"""
        # Create a simple tournament
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_Complete_Tournament", "format": "single_elimination", "max_players": 4},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Open registration
        requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/open-registration", headers=auth_headers)
        
        # Try to complete (may fail if no matches, but endpoint should work)
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/complete",
            headers=auth_headers
        )
        # Either completes or returns error about incomplete matches
        assert res.status_code in [200, 400]
        print(f"Complete tournament result: {res.status_code}")


class TestArenaAccessControl:
    """Access control tests - verify only admin/moderator can manage"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_create_without_auth_fails(self):
        """Create tournament without auth returns 401/403"""
        res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "Unauthorized Tournament", "format": "single_elimination"}
        )
        assert res.status_code in [401, 403]
    
    def test_delete_without_auth_fails(self, auth_headers):
        """Delete tournament without auth returns 401/403"""
        # Create a tournament first
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={"name": "TEST_AccessControl_Tournament", "format": "single_elimination"},
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Try to delete without auth
        res = requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        assert res.status_code in [401, 403]
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)


class TestCleanup:
    """Cleanup test tournaments created during testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        res = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = res.json()
        return data.get("token") or data.get("access_token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_tournaments(self, auth_headers):
        """Remove all TEST_ prefixed tournaments"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments")
        if res.status_code == 200:
            tournaments = res.json()
            deleted = 0
            for t in tournaments:
                if t.get("name", "").startswith("TEST_"):
                    del_res = requests.delete(
                        f"{BASE_URL}/api/pinpanclub/arena/tournaments/{t['tournament_id']}",
                        headers=auth_headers
                    )
                    if del_res.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test tournaments")
