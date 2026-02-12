"""
Super Pin Tournament System Tests (P2)
Tests for tournament creation, bracket generation, match results, and bracket retrieval
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://transaction-hub-55.preview.emergentagent.com').rstrip('/')

# Test data
LIGA_ID = "liga_01bc717ff842"
TORNEO_ID = "torneo_b4048a1816ec"
PLAYER_CARLOS_ID = "jugador_544167d88272"
PLAYER_MARIA_ID = "jugador_4a751551ad4b"
MATCH_ID = "R1_M1"


class TestTournamentEndpoints:
    """Test tournament API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    # ============== GET TOURNAMENT BRACKETS ==============
    
    def test_get_tournament_brackets_success(self):
        """GET /api/pinpanclub/superpin/tournaments/{torneo_id}/brackets - Should return brackets"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/brackets")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "torneo_id" in data
        assert data["torneo_id"] == TORNEO_ID
        assert "nombre" in data
        assert "estado" in data
        assert "brackets" in data
        assert "participantes" in data
        assert isinstance(data["brackets"], list)
        assert isinstance(data["participantes"], list)
        
        # Verify bracket structure
        if len(data["brackets"]) > 0:
            bracket = data["brackets"][0]
            assert "round" in bracket
            assert "name" in bracket
            assert "matches" in bracket
            
            if len(bracket["matches"]) > 0:
                match = bracket["matches"][0]
                assert "match_id" in match
                assert "player_a" in match
                assert "player_b" in match
                assert "estado" in match
    
    def test_get_tournament_brackets_not_found(self):
        """GET /api/pinpanclub/superpin/tournaments/{invalid_id}/brackets - Should return 404"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/invalid_torneo_id/brackets")
        
        assert response.status_code == 404
    
    # ============== GET TOURNAMENT BY ID ==============
    
    def test_get_tournament_by_id(self):
        """GET /api/pinpanclub/superpin/tournaments/{torneo_id} - Should return tournament details"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["torneo_id"] == TORNEO_ID
        assert "nombre" in data
        assert "liga_id" in data
        assert "estado" in data
        assert "participantes" in data
    
    # ============== GET LEAGUE TOURNAMENTS ==============
    
    def test_get_league_tournaments(self):
        """GET /api/pinpanclub/superpin/leagues/{liga_id}/tournaments - Should return tournaments list"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{LIGA_ID}/tournaments")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least the demo tournament
        assert len(data) >= 1
        
        # Verify tournament structure
        tournament = data[0]
        assert "torneo_id" in tournament
        assert "nombre" in tournament
        assert "liga_id" in tournament
    
    # ============== CREATE TOURNAMENT ==============
    
    def test_create_tournament_success(self):
        """POST /api/pinpanclub/superpin/tournaments - Should create new tournament"""
        tournament_name = f"TEST_Torneo_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        response = self.session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments", json={
            "liga_id": LIGA_ID,
            "nombre": tournament_name,
            "fecha_inicio": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "torneo_id" in data
        assert data["nombre"] == tournament_name
        assert data["liga_id"] == LIGA_ID
        assert data["estado"] == "pendiente"
        assert "participantes" in data
        assert isinstance(data["participantes"], list)
        
        # Store for cleanup
        self.created_torneo_id = data["torneo_id"]
    
    def test_create_tournament_invalid_league(self):
        """POST /api/pinpanclub/superpin/tournaments - Should fail with invalid league"""
        response = self.session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments", json={
            "liga_id": "invalid_liga_id",
            "nombre": "Test Tournament",
            "fecha_inicio": "2026-01-20"
        })
        
        assert response.status_code == 400
    
    def test_create_tournament_requires_auth(self):
        """POST /api/pinpanclub/superpin/tournaments - Should require admin auth"""
        # Create session without auth
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments", json={
            "liga_id": LIGA_ID,
            "nombre": "Unauthorized Tournament",
            "fecha_inicio": "2026-01-20"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ============== GENERATE BRACKETS ==============
    
    def test_generate_brackets_on_new_tournament(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/generate-brackets - Should generate brackets"""
        # First create a new tournament
        tournament_name = f"TEST_Bracket_Gen_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        create_response = self.session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments", json={
            "liga_id": LIGA_ID,
            "nombre": tournament_name,
            "fecha_inicio": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        })
        
        assert create_response.status_code == 200
        new_torneo_id = create_response.json()["torneo_id"]
        
        # Generate brackets
        response = self.session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{new_torneo_id}/generate-brackets")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "brackets" in data
        assert "total_rounds" in data
        assert isinstance(data["brackets"], list)
        assert len(data["brackets"]) > 0
        
        # Verify bracket structure
        first_round = data["brackets"][0]
        assert "round" in first_round
        assert "name" in first_round
        assert "matches" in first_round
    
    def test_generate_brackets_requires_auth(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/generate-brackets - Should require admin auth"""
        no_auth_session = requests.Session()
        
        response = no_auth_session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/generate-brackets")
        
        assert response.status_code in [401, 403]
    
    def test_generate_brackets_invalid_tournament(self):
        """POST /api/pinpanclub/superpin/tournaments/{invalid_id}/generate-brackets - Should return 404"""
        response = self.session.post(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/invalid_torneo/generate-brackets")
        
        assert response.status_code in [400, 404]
    
    # ============== UPDATE MATCH RESULT ==============
    
    def test_update_match_result_success(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/matches/{match_id}/result - Should update result"""
        # Use the existing tournament with pending match
        response = self.session.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/matches/{MATCH_ID}/result",
            params={
                "winner_id": PLAYER_CARLOS_ID,
                "score_a": 3,
                "score_b": 1
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "success" in data
        assert data["success"] == True
        assert "brackets" in data
        
        # Verify the match was updated
        brackets = data["brackets"]
        match_found = False
        for bracket in brackets:
            for match in bracket.get("matches", []):
                if match["match_id"] == MATCH_ID:
                    match_found = True
                    assert match["winner"] == PLAYER_CARLOS_ID
                    assert match["score_a"] == 3
                    assert match["score_b"] == 1
                    assert match["estado"] == "finalizado"
                    break
        
        assert match_found, "Match not found in brackets"
    
    def test_update_match_result_requires_auth(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/matches/{match_id}/result - Should require auth"""
        no_auth_session = requests.Session()
        
        response = no_auth_session.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/matches/{MATCH_ID}/result",
            params={
                "winner_id": PLAYER_CARLOS_ID,
                "score_a": 3,
                "score_b": 1
            }
        )
        
        assert response.status_code in [401, 403]
    
    def test_update_match_result_invalid_tournament(self):
        """POST /api/pinpanclub/superpin/tournaments/{invalid_id}/matches/{match_id}/result - Should return 400/404"""
        response = self.session.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/invalid_torneo/matches/{MATCH_ID}/result",
            params={
                "winner_id": PLAYER_CARLOS_ID,
                "score_a": 3,
                "score_b": 1
            }
        )
        
        assert response.status_code in [400, 404]
    
    def test_update_match_result_invalid_match(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/matches/{invalid_match}/result - Should return 400/404"""
        response = self.session.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/matches/invalid_match/result",
            params={
                "winner_id": PLAYER_CARLOS_ID,
                "score_a": 3,
                "score_b": 1
            }
        )
        
        assert response.status_code in [400, 404]


class TestTournamentI18n:
    """Test i18n translations for tournament features"""
    
    def test_spanish_tournament_translations(self):
        """Verify Spanish translations for tournament keys"""
        import json
        
        with open('/app/frontend/src/i18n/locales/es.json', 'r') as f:
            es = json.load(f)
        
        # Check superpin.tournaments keys
        tournaments = es.get("superpin", {}).get("tournaments", {})
        
        required_keys = [
            "title", "season", "participants", "notFound", "startTournament",
            "bye", "tbd", "thirdPlace", "semifinalLoser", "results",
            "champion", "runnerUp", "enterResult", "selectWinner",
            "createTournament", "tournamentName", "startDate"
        ]
        
        for key in required_keys:
            assert key in tournaments, f"Missing Spanish translation: superpin.tournaments.{key}"
        
        # Check status translations
        status = tournaments.get("status", {})
        status_keys = ["pendiente", "en_curso", "finalizado", "bye"]
        for key in status_keys:
            assert key in status, f"Missing Spanish translation: superpin.tournaments.status.{key}"
    
    def test_english_tournament_translations(self):
        """Verify English translations for tournament keys"""
        import json
        
        with open('/app/frontend/src/i18n/locales/en.json', 'r') as f:
            en = json.load(f)
        
        tournaments = en.get("superpin", {}).get("tournaments", {})
        
        required_keys = [
            "title", "season", "participants", "notFound", "startTournament",
            "bye", "tbd", "thirdPlace", "semifinalLoser", "results",
            "champion", "runnerUp", "enterResult", "selectWinner",
            "createTournament", "tournamentName", "startDate"
        ]
        
        for key in required_keys:
            assert key in tournaments, f"Missing English translation: superpin.tournaments.{key}"
        
        status = tournaments.get("status", {})
        status_keys = ["pendiente", "en_curso", "finalizado", "bye"]
        for key in status_keys:
            assert key in status, f"Missing English translation: superpin.tournaments.status.{key}"
    
    def test_chinese_tournament_translations(self):
        """Verify Chinese translations for tournament keys"""
        import json
        
        with open('/app/frontend/src/i18n/locales/zh.json', 'r') as f:
            zh = json.load(f)
        
        tournaments = zh.get("superpin", {}).get("tournaments", {})
        
        required_keys = [
            "title", "season", "participants", "notFound", "startTournament",
            "bye", "tbd", "thirdPlace", "semifinalLoser", "results",
            "champion", "runnerUp", "enterResult", "selectWinner",
            "createTournament", "tournamentName", "startDate"
        ]
        
        for key in required_keys:
            assert key in tournaments, f"Missing Chinese translation: superpin.tournaments.{key}"
        
        status = tournaments.get("status", {})
        status_keys = ["pendiente", "en_curso", "finalizado", "bye"]
        for key in status_keys:
            assert key in status, f"Missing Chinese translation: superpin.tournaments.status.{key}"


class TestBracketLogic:
    """Test bracket generation logic"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@libreria.com",
            "contrasena": "admin"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        yield
    
    def test_bracket_structure_with_2_players(self):
        """Verify bracket structure with 2 players (1 round - Final)"""
        # Get existing tournament with 2 players
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/brackets")
        
        assert response.status_code == 200
        data = response.json()
        
        # With 2 players, should have 1 round
        brackets = data["brackets"]
        assert len(brackets) >= 1
        
        # First round should have 1 match
        first_round = brackets[0]
        assert len(first_round["matches"]) == 1
        
        # Match should have both players
        match = first_round["matches"][0]
        assert match["player_a"] is not None
        assert match["player_b"] is not None
    
    def test_participants_from_ranking(self):
        """Verify participants are taken from league ranking"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TORNEO_ID}/brackets")
        
        assert response.status_code == 200
        data = response.json()
        
        participantes = data["participantes"]
        assert len(participantes) >= 2
        
        # Verify participant structure
        for p in participantes:
            assert "jugador_id" in p
            assert "posicion_ranking" in p
            assert "jugador_info" in p
            assert "nombre" in p["jugador_info"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
