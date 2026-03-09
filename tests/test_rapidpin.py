"""
Rapid Pin API Tests
Tests for the spontaneous match system: 2 players + 1 referee
Scoring: Victory +3, Defeat +1, Referee +2
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data
SEASON_ID = "rps_a4f4bd471c8c"  # Existing test season
PLAYERS = {
    "carlos": "jugador_544167d88272",
    "maria": "jugador_4a751551ad4b",
    "juan": "jugador_3cb000147513",
    "ana": "jugador_fc1be9bb2dc0"
}


class TestRapidPinSeasons:
    """Tests for Rapid Pin Season endpoints"""
    
    def test_get_all_seasons(self):
        """GET /api/pinpanclub/rapidpin/seasons - Get all seasons"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify season structure
        season = data[0]
        assert "season_id" in season
        assert "nombre" in season
        assert "estado" in season
        assert "fecha_inicio" in season
        assert "fecha_fin" in season
    
    def test_get_active_seasons(self):
        """GET /api/pinpanclub/rapidpin/seasons?active_only=true - Get active seasons"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons?active_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All returned seasons should be active
        for season in data:
            assert season["estado"] == "active"
    
    def test_get_season_by_id(self):
        """GET /api/pinpanclub/rapidpin/seasons/{season_id} - Get season details"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{SEASON_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["season_id"] == SEASON_ID
        assert data["nombre"] == "Diciembre 2025"
        assert data["estado"] == "active"
        
        # Verify prizes structure
        assert "player_prizes" in data
        assert "referee_prizes" in data
        assert len(data["player_prizes"]) >= 1
        assert len(data["referee_prizes"]) >= 1
    
    def test_get_nonexistent_season(self):
        """GET /api/pinpanclub/rapidpin/seasons/{invalid_id} - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/nonexistent_season")
        assert response.status_code == 404
    
    def test_create_season_requires_auth(self):
        """POST /api/pinpanclub/rapidpin/seasons - Requires admin auth"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons",
            json={
                "nombre": "Test Season",
                "fecha_inicio": "2025-12-01",
                "fecha_fin": "2025-12-31"
            }
        )
        # Should return 401 without auth
        assert response.status_code == 401


class TestRapidPinMatches:
    """Tests for Rapid Pin Match endpoints"""
    
    def test_register_match_success(self):
        """POST /api/pinpanclub/rapidpin/matches - Register a new match"""
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["carlos"],
            "jugador_b_id": PLAYERS["maria"],
            "arbitro_id": PLAYERS["juan"],
            "ganador_id": PLAYERS["carlos"],
            "score_ganador": 11,
            "score_perdedor": 5,
            "registrado_por_id": PLAYERS["carlos"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "match_id" in data
        assert data["estado"] == "pending"  # Match starts as pending
        assert data["ganador_id"] == PLAYERS["carlos"]
        assert data["perdedor_id"] == PLAYERS["maria"]
        assert data["arbitro_id"] == PLAYERS["juan"]
        
        # Points should be 0 until confirmed
        assert data["puntos_ganador"] == 0
        assert data["puntos_perdedor"] == 0
        assert data["puntos_arbitro"] == 0
        
        # Store match_id for confirmation test
        TestRapidPinMatches.pending_match_id = data["match_id"]
    
    def test_register_match_same_participants_fails(self):
        """POST /api/pinpanclub/rapidpin/matches - Same participant twice fails"""
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["carlos"],
            "jugador_b_id": PLAYERS["carlos"],  # Same as player A
            "arbitro_id": PLAYERS["juan"],
            "ganador_id": PLAYERS["carlos"],
            "score_ganador": 11,
            "score_perdedor": 5,
            "registrado_por_id": PLAYERS["carlos"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert response.status_code == 400
        assert "diferentes" in response.json()["detail"].lower() or "different" in response.json()["detail"].lower()
    
    def test_register_match_winner_must_be_player(self):
        """POST /api/pinpanclub/rapidpin/matches - Winner must be one of the players"""
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["carlos"],
            "jugador_b_id": PLAYERS["maria"],
            "arbitro_id": PLAYERS["juan"],
            "ganador_id": PLAYERS["juan"],  # Referee can't be winner
            "score_ganador": 11,
            "score_perdedor": 5,
            "registrado_por_id": PLAYERS["carlos"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert response.status_code == 400
        assert "ganador" in response.json()["detail"].lower() or "winner" in response.json()["detail"].lower()
    
    def test_register_match_registrant_must_be_participant(self):
        """POST /api/pinpanclub/rapidpin/matches - Registrant must be a participant"""
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["carlos"],
            "jugador_b_id": PLAYERS["maria"],
            "arbitro_id": PLAYERS["juan"],
            "ganador_id": PLAYERS["carlos"],
            "score_ganador": 11,
            "score_perdedor": 5,
            "registrado_por_id": PLAYERS["ana"]  # Ana is not a participant
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert response.status_code == 400
        assert "participante" in response.json()["detail"].lower() or "participant" in response.json()["detail"].lower()
    
    def test_confirm_match_by_different_participant(self):
        """POST /api/pinpanclub/rapidpin/matches/{match_id}/confirm - Confirm by different participant"""
        # Use the match created in previous test
        match_id = getattr(TestRapidPinMatches, 'pending_match_id', None)
        if not match_id:
            pytest.skip("No pending match to confirm")
        
        # María (player B) confirms the match
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm?confirmado_por_id={PLAYERS['maria']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["estado"] == "validated"
        assert data["confirmado_por_id"] == PLAYERS["maria"]
        
        # Points should now be applied
        assert data["puntos_ganador"] == 3  # Victory points
        assert data["puntos_perdedor"] == 1  # Defeat points
        assert data["puntos_arbitro"] == 2  # Referee points
    
    def test_confirm_match_by_same_registrant_fails(self):
        """POST /api/pinpanclub/rapidpin/matches/{match_id}/confirm - Same person can't confirm"""
        # Create a new match first
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["juan"],
            "jugador_b_id": PLAYERS["ana"],
            "arbitro_id": PLAYERS["carlos"],
            "ganador_id": PLAYERS["juan"],
            "score_ganador": 11,
            "score_perdedor": 8,
            "registrado_por_id": PLAYERS["juan"]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert create_response.status_code == 200
        match_id = create_response.json()["match_id"]
        
        # Try to confirm by the same person who registered
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm?confirmado_por_id={PLAYERS['juan']}"
        )
        assert response.status_code == 400
        assert "confirmar" in response.json()["detail"].lower() or "confirm" in response.json()["detail"].lower()
        
        # Store for cleanup - confirm with different participant
        TestRapidPinMatches.second_match_id = match_id
    
    def test_confirm_match_by_non_participant_fails(self):
        """POST /api/pinpanclub/rapidpin/matches/{match_id}/confirm - Non-participant can't confirm"""
        match_id = getattr(TestRapidPinMatches, 'second_match_id', None)
        if not match_id:
            pytest.skip("No match to test")
        
        # María is not a participant in this match
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm?confirmado_por_id={PLAYERS['maria']}"
        )
        assert response.status_code == 400
        assert "participante" in response.json()["detail"].lower() or "participant" in response.json()["detail"].lower()
    
    def test_get_match_by_id(self):
        """GET /api/pinpanclub/rapidpin/matches/{match_id} - Get match details"""
        match_id = getattr(TestRapidPinMatches, 'pending_match_id', None)
        if not match_id:
            pytest.skip("No match to get")
        
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["match_id"] == match_id
        assert "jugador_a_info" in data
        assert "jugador_b_info" in data
        assert "arbitro_info" in data
    
    def test_get_season_matches(self):
        """GET /api/pinpanclub/rapidpin/seasons/{season_id}/matches - Get season matches"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{SEASON_ID}/matches")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Should have at least the matches we created
        if len(data) > 0:
            match = data[0]
            assert "match_id" in match
            assert "estado" in match
            assert "ganador_id" in match


class TestRapidPinRanking:
    """Tests for Rapid Pin Ranking endpoints"""
    
    def test_get_player_ranking(self):
        """GET /api/pinpanclub/rapidpin/seasons/{season_id}/ranking - Get player ranking"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{SEASON_ID}/ranking")
        assert response.status_code == 200
        
        data = response.json()
        assert "season_id" in data
        assert "entries" in data
        assert isinstance(data["entries"], list)
        
        # Verify ranking entry structure
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            assert "ranking_id" in entry
            assert "jugador_id" in entry
            assert "puntos_totales" in entry
            assert "partidos_jugados" in entry
            assert "partidos_ganados" in entry
            assert "partidos_perdidos" in entry
            assert "partidos_arbitrados" in entry
    
    def test_get_referee_ranking(self):
        """GET /api/pinpanclub/rapidpin/seasons/{season_id}/ranking/referees - Get referee ranking"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{SEASON_ID}/ranking/referees")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # All entries should have refereed at least one match
        for entry in data:
            assert entry["partidos_arbitrados"] > 0
    
    def test_ranking_nonexistent_season(self):
        """GET /api/pinpanclub/rapidpin/seasons/{invalid_id}/ranking - Returns 404"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/nonexistent/ranking")
        assert response.status_code == 404


class TestRapidPinScoring:
    """Tests for Rapid Pin Scoring configuration"""
    
    def test_get_scoring_config(self):
        """GET /api/pinpanclub/rapidpin/scoring - Get scoring configuration"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/scoring")
        assert response.status_code == 200
        
        data = response.json()
        assert "scoring" in data
        assert "rules" in data
        
        # Verify scoring values
        scoring = data["scoring"]
        assert scoring["victory"] == 3
        assert scoring["defeat"] == 1
        assert scoring["referee"] == 2
        
        # Verify rules
        rules = data["rules"]
        assert "participants" in rules
        assert "validation" in rules


class TestRapidPinPointsValidation:
    """Tests to verify points are only applied after confirmation"""
    
    def test_points_not_applied_before_confirmation(self):
        """Verify points are 0 when match is pending"""
        # Create a new match
        match_data = {
            "season_id": SEASON_ID,
            "jugador_a_id": PLAYERS["carlos"],
            "jugador_b_id": PLAYERS["ana"],
            "arbitro_id": PLAYERS["maria"],
            "ganador_id": PLAYERS["carlos"],
            "score_ganador": 11,
            "score_perdedor": 3,
            "registrado_por_id": PLAYERS["carlos"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json=match_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["estado"] == "pending"
        assert data["puntos_ganador"] == 0
        assert data["puntos_perdedor"] == 0
        assert data["puntos_arbitro"] == 0
        
        # Store for next test
        TestRapidPinPointsValidation.test_match_id = data["match_id"]
    
    def test_points_applied_after_confirmation(self):
        """Verify points are applied after confirmation"""
        match_id = getattr(TestRapidPinPointsValidation, 'test_match_id', None)
        if not match_id:
            pytest.skip("No match to confirm")
        
        # Confirm by Ana (player B)
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm?confirmado_por_id={PLAYERS['ana']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["estado"] == "validated"
        assert data["puntos_ganador"] == 3
        assert data["puntos_perdedor"] == 1
        assert data["puntos_arbitro"] == 2


class TestRapidPinCleanup:
    """Cleanup test - confirm remaining pending matches"""
    
    def test_cleanup_pending_matches(self):
        """Confirm any remaining pending matches from tests"""
        # Confirm second match if still pending
        match_id = getattr(TestRapidPinMatches, 'second_match_id', None)
        if match_id:
            # Try to confirm with Ana (participant)
            response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm?confirmado_por_id={PLAYERS['ana']}"
            )
            # May succeed or fail if already confirmed - both are OK
            assert response.status_code in [200, 400]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
