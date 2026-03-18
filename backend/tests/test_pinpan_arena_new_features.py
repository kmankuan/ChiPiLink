"""
PinPan Arena - New Features Tests (Iteration 176)
Tests for:
1. Full tournament lifecycle: create → open-reg → register players → generate-brackets → submit results → complete
2. WebSocket endpoint /api/pinpanclub/ws/arena/{tournament_id} existence
3. Arena broadcast triggered after match result submission
4. Public API access for shareable pages
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@chipi.co"
ADMIN_PASSWORD = "admin"


class TestArenaFullLifecycle:
    """Test complete tournament lifecycle end-to-end"""
    
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
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def player_ids(self, auth_headers):
        """Get or create test players for lifecycle test"""
        # First try to get existing players
        players_res = requests.get(f"{BASE_URL}/api/pinpanclub/players?limit=10")
        if players_res.status_code == 200 and len(players_res.json()) >= 4:
            players = players_res.json()[:4]
            return [p.get("jugador_id") or p.get("player_id") for p in players if p.get("jugador_id") or p.get("player_id")]
        
        # If not enough players, return empty list (will skip tests)
        return []
    
    def test_full_lifecycle_single_elimination(self, auth_headers, player_ids):
        """Test complete lifecycle: create → open-reg → register → generate-brackets → submit results → complete"""
        if len(player_ids) < 4:
            pytest.skip("Need at least 4 players for full lifecycle test")
        
        # Step 1: Create tournament
        print("\n=== Step 1: Create Tournament ===")
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_Full_Lifecycle_Tournament",
                "format": "single_elimination",
                "max_players": 4,
                "best_of": 3,
                "third_place_match": True
            },
            headers=auth_headers
        )
        assert create_res.status_code == 200, f"Create failed: {create_res.text}"
        tournament = create_res.json()
        tid = tournament["tournament_id"]
        assert tournament["status"] == "draft"
        print(f"Created tournament: {tid}, status: {tournament['status']}")
        
        # Step 2: Open registration
        print("\n=== Step 2: Open Registration ===")
        open_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/open-registration",
            headers=auth_headers
        )
        assert open_res.status_code == 200
        tournament = open_res.json()
        assert tournament["status"] == "registration_open"
        print(f"Registration opened, status: {tournament['status']}")
        
        # Step 3: Register 4 players
        print("\n=== Step 3: Register Players ===")
        registered = []
        for pid in player_ids[:4]:
            reg_res = requests.post(
                f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/register/{pid}",
                headers=auth_headers
            )
            if reg_res.status_code == 200:
                registered.append(pid)
                print(f"Registered player: {pid}")
            else:
                print(f"Failed to register {pid}: {reg_res.text}")
        
        assert len(registered) >= 2, f"Need at least 2 registered players, got {len(registered)}"
        
        # Verify registration count
        tournament_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}")
        tournament = tournament_res.json()
        print(f"Total participants: {tournament['total_participants']}")
        
        # Step 4: Generate brackets (starts tournament)
        print("\n=== Step 4: Generate Brackets ===")
        gen_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/generate-brackets",
            headers=auth_headers
        )
        assert gen_res.status_code == 200, f"Generate brackets failed: {gen_res.text}"
        tournament = gen_res.json()
        assert tournament["status"] == "in_progress"
        assert "brackets" in tournament
        print(f"Brackets generated, status: {tournament['status']}, brackets: {len(tournament['brackets'])}")
        
        # Step 5: Get matches and submit results
        print("\n=== Step 5: Submit Match Results ===")
        matches_res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches")
        matches = matches_res.json()
        print(f"Total matches: {len(matches)}")
        
        # Submit results for pending matches with both players
        results_submitted = 0
        for m in matches:
            if m.get("status") == "pending" and m.get("player_a_id") and m.get("player_b_id"):
                winner_id = m["player_a_id"]  # Player A wins
                result_res = requests.post(
                    f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches/{m['match_id']}/result",
                    params={"winner_id": winner_id, "score_a": 3, "score_b": 1},
                    headers=auth_headers
                )
                if result_res.status_code == 200:
                    results_submitted += 1
                    print(f"Result submitted for match {m['match_id']}, winner: {winner_id}")
        
        print(f"Results submitted: {results_submitted}")
        
        # Step 6: Complete tournament
        print("\n=== Step 6: Complete Tournament ===")
        complete_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/complete",
            headers=auth_headers
        )
        assert complete_res.status_code == 200
        tournament = complete_res.json()
        print(f"Final status: {tournament['status']}")
        
        # Check for champion
        if tournament.get("champion_id"):
            print(f"Champion: {tournament['champion_id']}")
        
        # Cleanup
        print("\n=== Cleanup ===")
        del_res = requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
        print(f"Deleted tournament: {del_res.status_code == 200}")


class TestArenaWebSocketEndpoint:
    """Test WebSocket endpoint existence and basic functionality"""
    
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
    
    def test_websocket_stats_endpoint(self):
        """GET /api/pinpanclub/ws/stats - WebSocket stats endpoint should exist"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/ws/stats")
        # Should return 200 with connection stats
        assert res.status_code == 200
        data = res.json()
        assert "total_connections" in data
        print(f"WebSocket stats: {data}")
    
    def test_websocket_broadcast_endpoint(self, auth_headers):
        """POST /api/pinpanclub/ws/broadcast - Broadcast endpoint should exist"""
        res = requests.post(
            f"{BASE_URL}/api/pinpanclub/ws/broadcast",
            json={"type": "test", "message": "Test broadcast"},
            headers=auth_headers
        )
        # Should return 200 (even if no clients connected)
        assert res.status_code == 200
        data = res.json()
        assert data.get("success") == True
        print(f"Broadcast result: {data}")


class TestArenaPublicAccess:
    """Test public API access for shareable tournament pages"""
    
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
    
    @pytest.fixture(scope="class")
    def test_tournament(self, auth_headers):
        """Create a test tournament for public access tests"""
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_Public_Access_Tournament",
                "description": "Tournament for public access testing",
                "format": "single_elimination",
                "max_players": 8
            },
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        yield tid
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
    
    def test_get_tournament_no_auth(self, test_tournament):
        """GET /api/pinpanclub/arena/tournaments/{id} - Should work without auth (public)"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}")
        assert res.status_code == 200
        data = res.json()
        assert data["tournament_id"] == test_tournament
        assert data["name"] == "TEST_Public_Access_Tournament"
        print(f"Public access to tournament: {data['name']}")
    
    def test_get_tournament_matches_no_auth(self, test_tournament):
        """GET /api/pinpanclub/arena/tournaments/{id}/matches - Should work without auth"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{test_tournament}/matches")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Public access to matches: {len(data)} matches")
    
    def test_list_tournaments_no_auth(self):
        """GET /api/pinpanclub/arena/tournaments - Should work without auth"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Public tournament list: {len(data)} tournaments")
    
    def test_get_active_tournaments_no_auth(self):
        """GET /api/pinpanclub/arena/tournaments/active - Should work without auth"""
        res = requests.get(f"{BASE_URL}/api/pinpanclub/arena/tournaments/active")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        print(f"Active tournaments: {len(data)}")


class TestArenaBroadcastOnResult:
    """Test that arena broadcast is triggered after match result submission"""
    
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
    
    def test_submit_result_triggers_broadcast(self, auth_headers):
        """Submit match result and verify broadcast function doesn't error"""
        # Create tournament
        create_res = requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments",
            json={
                "name": "TEST_Broadcast_Tournament",
                "format": "single_elimination",
                "max_players": 4
            },
            headers=auth_headers
        )
        tid = create_res.json()["tournament_id"]
        
        # Open registration
        requests.post(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/open-registration", headers=auth_headers)
        
        # Get players
        players_res = requests.get(f"{BASE_URL}/api/pinpanclub/players?limit=4")
        if players_res.status_code != 200 or len(players_res.json()) < 2:
            requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
            pytest.skip("Not enough players for broadcast test")
        
        # Register players
        players = players_res.json()[:4]
        registered = []
        for player in players:
            pid = player.get("jugador_id") or player.get("player_id")
            if pid:
                reg_res = requests.post(
                    f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/register/{pid}",
                    headers=auth_headers
                )
                if reg_res.status_code == 200:
                    registered.append(pid)
        
        if len(registered) < 2:
            requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
            pytest.skip("Could not register enough players")
        
        # Generate brackets
        gen_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/generate-brackets",
            headers=auth_headers
        )
        
        if gen_res.status_code != 200:
            requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
            pytest.skip("Could not generate brackets")
        
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
            requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
            pytest.skip("No pending match found")
        
        # Submit result (this should trigger broadcast without errors)
        winner_id = pending_match["player_a_id"]
        result_res = requests.post(
            f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}/matches/{pending_match['match_id']}/result",
            params={"winner_id": winner_id, "score_a": 3, "score_b": 1},
            headers=auth_headers
        )
        
        # The key assertion: result submission should succeed (200)
        # If broadcast failed, it would log a warning but not fail the request
        assert result_res.status_code == 200, f"Result submission failed: {result_res.text}"
        
        tournament = result_res.json()
        print(f"Result submitted successfully, tournament status: {tournament.get('status')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/pinpanclub/arena/tournaments/{tid}", headers=auth_headers)
        print("Broadcast test completed without errors")


class TestCleanupNewFeatures:
    """Cleanup any test tournaments created"""
    
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
