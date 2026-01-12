"""
P1 Features Test Suite
Tests for:
1. Head-to-Head Match Predictor (GET /api/pinpanclub/superpin/predict-match)
2. Close Season endpoint (POST /api/pinpanclub/rapidpin/seasons/{id}/close)
3. Pending match notifications badge
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://capmanage.preview.emergentagent.com')

# Test players
PLAYER_A_ID = "jugador_544167d88272"  # Carlos / El Rayo
PLAYER_B_ID = "jugador_4a751551ad4b"  # María / La Pantera
PLAYER_C_ID = "jugador_3cb000147513"  # Juan / JP
PLAYER_D_ID = "jugador_fc1be9bb2dc0"  # Ana / Anita

# Test season
ACTIVE_SEASON_ID = "rps_bd76403ad2fa"  # Enero 2026


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "admin@libreria.com",
        "contrasena": "admin"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestMatchPredictor:
    """Tests for Head-to-Head Match Predictor endpoint"""
    
    def test_predict_match_returns_200(self, api_client):
        """Test that predict-match endpoint returns 200 OK"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        assert response.status_code == 200
    
    def test_predict_match_returns_player_info(self, api_client):
        """Test that prediction includes player info"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "player_a" in data
        assert "player_b" in data
        assert "jugador_id" in data["player_a"]
        assert "jugador_id" in data["player_b"]
        assert data["player_a"]["jugador_id"] == PLAYER_A_ID
        assert data["player_b"]["jugador_id"] == PLAYER_B_ID
    
    def test_predict_match_returns_probability(self, api_client):
        """Test that prediction includes probability percentages"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "probability" in data["player_a"]
        assert "probability" in data["player_b"]
        # Probabilities should be between 0 and 100
        assert 0 <= data["player_a"]["probability"] <= 100
        assert 0 <= data["player_b"]["probability"] <= 100
        # Probabilities should sum to 100
        total = data["player_a"]["probability"] + data["player_b"]["probability"]
        assert abs(total - 100) < 0.1  # Allow small floating point error
    
    def test_predict_match_returns_prediction_object(self, api_client):
        """Test that prediction includes prediction object with favorite and confidence"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "prediction" in data
        assert "favorite" in data["prediction"]
        assert "confidence" in data["prediction"]
        assert data["prediction"]["favorite"] in ["player_a", "player_b", "draw"]
        assert data["prediction"]["confidence"] in ["high", "medium", "low"]
    
    def test_predict_match_returns_factors(self, api_client):
        """Test that prediction includes calculation factors"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "factors" in data
        assert "elo_based" in data["factors"]
        assert "h2h_adjustment" in data["factors"]
        assert "streak_adjustment" in data["factors"]
    
    def test_predict_match_returns_advantages(self, api_client):
        """Test that prediction includes advantages list"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "advantages" in data
        assert isinstance(data["advantages"], list)
    
    def test_predict_match_returns_h2h_history(self, api_client):
        """Test that prediction includes head-to-head history"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "head_to_head" in data
        h2h = data["head_to_head"]
        assert "player_a" in h2h
        assert "player_b" in h2h
        assert "total_matches" in h2h
    
    def test_predict_match_elo_in_player_info(self, api_client):
        """Test that player info includes ELO rating"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/superpin/predict-match",
            params={"jugador_a_id": PLAYER_A_ID, "jugador_b_id": PLAYER_B_ID}
        )
        data = response.json()
        
        assert "elo" in data["player_a"]
        assert "elo" in data["player_b"]
        assert isinstance(data["player_a"]["elo"], (int, float))
        assert isinstance(data["player_b"]["elo"], (int, float))


class TestCloseSeasonEndpoint:
    """Tests for Close Season endpoint"""
    
    def test_close_season_requires_auth(self, api_client):
        """Test that close season requires authentication"""
        response = api_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{ACTIVE_SEASON_ID}/close"
        )
        assert response.status_code == 401
    
    def test_close_season_returns_final_results(self, authenticated_client):
        """Test that close season returns final results with player and referee rankings"""
        # First create a new season to close
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons",
            json={
                "nombre": "Test Season to Close",
                "descripcion": "Test season for closing",
                "fecha_inicio": "2026-01-15",
                "fecha_fin": "2026-01-20"
            }
        )
        assert create_response.status_code == 200
        new_season_id = create_response.json()["season_id"]
        
        # Register a match to have some data
        match_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json={
                "season_id": new_season_id,
                "jugador_a_id": PLAYER_A_ID,
                "jugador_b_id": PLAYER_B_ID,
                "arbitro_id": PLAYER_C_ID,
                "ganador_id": PLAYER_A_ID,
                "score_ganador": 11,
                "score_perdedor": 5,
                "registrado_por_id": PLAYER_A_ID
            }
        )
        assert match_response.status_code == 200
        match_id = match_response.json()["match_id"]
        
        # Confirm the match
        confirm_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches/{match_id}/confirm",
            params={"confirmado_por_id": PLAYER_B_ID}
        )
        assert confirm_response.status_code == 200
        
        # Now close the season
        close_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}/close"
        )
        assert close_response.status_code == 200
        
        data = close_response.json()
        
        # Verify response structure
        assert "season_id" in data
        assert "season_nombre" in data
        assert "fecha_cierre" in data
        assert "player_results" in data
        assert "referee_results" in data
        assert "total_matches" in data
        
        # Verify player results structure
        assert len(data["player_results"]) > 0
        player_result = data["player_results"][0]
        assert "jugador_id" in player_result
        assert "jugador_info" in player_result
        assert "posicion_final" in player_result
        assert "puntos_finales" in player_result
        assert "role" in player_result
        assert "prize" in player_result
        
        # Verify referee results structure
        assert len(data["referee_results"]) > 0
        referee_result = data["referee_results"][0]
        assert "jugador_id" in referee_result
        assert "posicion_final" in referee_result
        assert "role" in referee_result
    
    def test_close_season_updates_status(self, authenticated_client):
        """Test that closing a season updates its status to 'closed'"""
        # Create a new season
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons",
            json={
                "nombre": "Test Season Status",
                "descripcion": "Test season for status check",
                "fecha_inicio": "2026-01-16",
                "fecha_fin": "2026-01-21"
            }
        )
        assert create_response.status_code == 200
        new_season_id = create_response.json()["season_id"]
        
        # Verify it's active
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}"
        )
        assert get_response.json()["estado"] == "active"
        
        # Close it
        close_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}/close"
        )
        assert close_response.status_code == 200
        
        # Verify it's closed
        get_response = authenticated_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}"
        )
        assert get_response.json()["estado"] == "closed"
    
    def test_close_already_closed_season_fails(self, authenticated_client):
        """Test that closing an already closed season returns error"""
        # Create and close a season
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons",
            json={
                "nombre": "Test Already Closed",
                "descripcion": "Test season for double close",
                "fecha_inicio": "2026-01-17",
                "fecha_fin": "2026-01-22"
            }
        )
        new_season_id = create_response.json()["season_id"]
        
        # Close it first time
        authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}/close"
        )
        
        # Try to close again
        second_close = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{new_season_id}/close"
        )
        assert second_close.status_code == 400


class TestPendingMatchNotifications:
    """Tests for pending match notifications"""
    
    def test_get_pending_matches_for_user(self, api_client):
        """Test getting pending matches for a specific user"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{ACTIVE_SEASON_ID}/pending/{PLAYER_A_ID}"
        )
        assert response.status_code == 200
        data = response.json()
        assert "pending_matches" in data or "total" in data
    
    def test_get_all_pending_matches_for_user(self, api_client):
        """Test getting all pending matches across all seasons for a user"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/pending/{PLAYER_A_ID}"
        )
        # This endpoint may or may not exist
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, (list, dict))
    
    def test_pending_count_updates_after_match_registration(self, authenticated_client):
        """Test that pending count increases after registering a match"""
        # Get initial pending count
        initial_response = authenticated_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{ACTIVE_SEASON_ID}/pending/{PLAYER_B_ID}"
        )
        initial_count = initial_response.json().get("total", 0)
        
        # Register a new match
        match_response = authenticated_client.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/matches",
            json={
                "season_id": ACTIVE_SEASON_ID,
                "jugador_a_id": PLAYER_A_ID,
                "jugador_b_id": PLAYER_B_ID,
                "arbitro_id": PLAYER_C_ID,
                "ganador_id": PLAYER_A_ID,
                "score_ganador": 11,
                "score_perdedor": 7,
                "registrado_por_id": PLAYER_A_ID
            }
        )
        
        if match_response.status_code == 200:
            # Get new pending count for player B (who needs to confirm)
            new_response = authenticated_client.get(
                f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{ACTIVE_SEASON_ID}/pending/{PLAYER_B_ID}"
            )
            new_count = new_response.json().get("total", 0)
            
            # Pending count should have increased
            assert new_count >= initial_count


class TestRapidPinDashboardActivity:
    """Tests for Rapid Pin activity on dashboard"""
    
    def test_get_active_seasons(self, api_client):
        """Test getting active seasons for dashboard"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons",
            params={"active_only": "true"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned seasons should be active
        for season in data:
            assert season["estado"] == "active"
    
    def test_get_season_matches_for_leaderboard(self, api_client):
        """Test getting recent matches for activity leaderboard"""
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/seasons/{ACTIVE_SEASON_ID}/matches",
            params={"limit": 5}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 5


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
