"""
Super Pin Badges System - Backend API Tests
Tests for P3 Badge/Achievement system endpoints

Endpoints tested:
- GET /api/pinpanclub/superpin/badges/definitions - Get badge definitions
- GET /api/pinpanclub/superpin/players/{jugador_id}/badges - Get player badges
- GET /api/pinpanclub/superpin/badges/recent - Get recent badges
- GET /api/pinpanclub/superpin/badges/leaderboard - Badge leaderboard
- POST /api/pinpanclub/superpin/tournaments/{torneo_id}/award-badges - Award tournament badges
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data from context
PLAYER_CARLOS_ID = "jugador_544167d88272"
PLAYER_MARIA_ID = "jugador_4a751551ad4b"
TOURNAMENT_ID = "torneo_c7e3252bdbde"
LIGA_ID = "liga_01bc717ff842"


class TestBadgeDefinitions:
    """Tests for badge definitions endpoint"""
    
    def test_get_badge_definitions_success(self):
        """GET /api/pinpanclub/superpin/badges/definitions - Should return all badge definitions"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/definitions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have 11 badge types defined
        assert len(data) == 11, f"Expected 11 badge types, got {len(data)}"
        
        # Verify expected badge types exist
        expected_badges = [
            "tournament_champion",
            "tournament_runner_up", 
            "tournament_third",
            "season_mvp",
            "win_streak_5",
            "win_streak_10",
            "matches_50",
            "matches_100",
            "first_win",
            "perfect_set",
            "comeback_king"
        ]
        
        for badge_type in expected_badges:
            assert badge_type in data, f"Missing badge type: {badge_type}"
    
    def test_badge_definitions_have_translations(self):
        """Badge definitions should have ES/EN/ZH translations"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/definitions")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check tournament_champion has all translations
        champion = data.get("tournament_champion", {})
        assert "name" in champion, "Missing Spanish name"
        assert "name_en" in champion, "Missing English name"
        assert "name_zh" in champion, "Missing Chinese name"
        
        # Verify translation values
        assert champion["name"] == "Campeón de Torneo"
        assert champion["name_en"] == "Tournament Champion"
        assert champion["name_zh"] == "锦标赛冠军"
    
    def test_badge_definitions_have_rarity(self):
        """Badge definitions should have rarity levels"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/definitions")
        
        assert response.status_code == 200
        data = response.json()
        
        valid_rarities = ["common", "rare", "epic", "legendary"]
        
        for badge_type, badge_def in data.items():
            assert "rarity" in badge_def, f"Badge {badge_type} missing rarity"
            assert badge_def["rarity"] in valid_rarities, f"Invalid rarity for {badge_type}"
        
        # Verify specific rarities
        assert data["tournament_champion"]["rarity"] == "legendary"
        assert data["tournament_runner_up"]["rarity"] == "epic"
        assert data["tournament_third"]["rarity"] == "rare"
        assert data["first_win"]["rarity"] == "common"
    
    def test_badge_definitions_have_icons(self):
        """Badge definitions should have emoji icons"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/definitions")
        
        assert response.status_code == 200
        data = response.json()
        
        for badge_type, badge_def in data.items():
            assert "icon" in badge_def, f"Badge {badge_type} missing icon"
            assert len(badge_def["icon"]) > 0, f"Badge {badge_type} has empty icon"
        
        # Verify specific icons
        assert data["tournament_champion"]["icon"] == "🏆"
        assert data["tournament_runner_up"]["icon"] == "🥈"
        assert data["tournament_third"]["icon"] == "🥉"


class TestPlayerBadges:
    """Tests for player badges endpoint"""
    
    def test_get_player_badges_carlos(self):
        """GET /api/pinpanclub/superpin/players/{jugador_id}/badges - Carlos should have champion badge"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/players/{PLAYER_CARLOS_ID}/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "jugador_id" in data
        assert data["jugador_id"] == PLAYER_CARLOS_ID
        assert "badges" in data
        assert "total" in data
        assert data["total"] >= 1
        
        # Carlos should have tournament champion badge
        badge_types = [b["badge_type"] for b in data["badges"]]
        assert "tournament_champion" in badge_types, "Carlos should have tournament champion badge"
    
    def test_get_player_badges_maria(self):
        """GET /api/pinpanclub/superpin/players/{jugador_id}/badges - María should have runner-up badge"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/players/{PLAYER_MARIA_ID}/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["jugador_id"] == PLAYER_MARIA_ID
        assert data["total"] >= 1
        
        # María should have tournament runner-up badge
        badge_types = [b["badge_type"] for b in data["badges"]]
        assert "tournament_runner_up" in badge_types, "María should have tournament runner-up badge"
    
    def test_player_badge_structure(self):
        """Player badges should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/players/{PLAYER_CARLOS_ID}/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        if data["total"] > 0:
            badge = data["badges"][0]
            
            # Required fields
            assert "badge_id" in badge
            assert "jugador_id" in badge
            assert "badge_type" in badge
            assert "name" in badge
            assert "icon" in badge
            assert "earned_at" in badge
            assert "rarity" in badge
    
    def test_get_player_badges_nonexistent(self):
        """GET /api/pinpanclub/superpin/players/{jugador_id}/badges - Nonexistent player returns empty"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/players/nonexistent_player/badges")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["total"] == 0
        assert data["badges"] == []


class TestRecentBadges:
    """Tests for recent badges endpoint"""
    
    def test_get_recent_badges_success(self):
        """GET /api/pinpanclub/superpin/badges/recent - Should return recent badges"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/recent")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 2  # At least Carlos and María badges
    
    def test_recent_badges_with_limit(self):
        """GET /api/pinpanclub/superpin/badges/recent?limit=5 - Should respect limit"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/recent?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_recent_badges_have_player_info(self):
        """Recent badges should include player info"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/recent")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            badge = data[0]
            assert "jugador_info" in badge
            assert "nombre" in badge["jugador_info"]
    
    def test_recent_badges_sorted_by_date(self):
        """Recent badges should be sorted by earned_at descending"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/recent")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) >= 2:
            # First badge should be more recent or equal
            date1 = data[0].get("earned_at", "")
            date2 = data[1].get("earned_at", "")
            assert date1 >= date2, "Badges should be sorted by date descending"


class TestBadgeLeaderboard:
    """Tests for badge leaderboard endpoint"""
    
    def test_get_badge_leaderboard_success(self):
        """GET /api/pinpanclub/superpin/badges/leaderboard - Should return leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/leaderboard")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 2  # At least Carlos and María
    
    def test_leaderboard_with_limit(self):
        """GET /api/pinpanclub/superpin/badges/leaderboard?limit=5 - Should respect limit"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/leaderboard?limit=5")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
    
    def test_leaderboard_structure(self):
        """Leaderboard entries should have correct structure"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/leaderboard")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            entry = data[0]
            
            assert "_id" in entry  # jugador_id
            assert "total_badges" in entry
            assert "legendary" in entry
            assert "epic" in entry
            assert "jugador_info" in entry
    
    def test_leaderboard_sorted_by_rarity(self):
        """Leaderboard should be sorted by legendary, then epic, then total"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/badges/leaderboard")
        
        assert response.status_code == 200
        data = response.json()
        
        # Carlos (legendary champion) should be first
        if len(data) >= 2:
            first = data[0]
            assert first["_id"] == PLAYER_CARLOS_ID, "Carlos with legendary badge should be first"
            assert first["legendary"] >= 1


class TestAwardTournamentBadges:
    """Tests for award tournament badges endpoint (requires auth)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_award_badges_requires_auth(self):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/award-badges - Should require auth"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TOURNAMENT_ID}/award-badges"
        )
        
        assert response.status_code in [401, 403], "Should require authentication"
    
    def test_award_badges_with_auth(self, auth_token):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/award-badges - Should work with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/{TOURNAMENT_ID}/award-badges",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "awarded_badges" in data
        assert "total" in data
        # Badges already awarded, so should return empty (no duplicates)
        assert isinstance(data["awarded_badges"], list)
    
    def test_award_badges_invalid_tournament(self, auth_token):
        """POST /api/pinpanclub/superpin/tournaments/{torneo_id}/award-badges - Invalid tournament"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/tournaments/invalid_tournament/award-badges",
            headers=headers
        )
        
        # Should return 200 with empty badges (tournament not found or not finished)
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0


class TestBadgesInRanking:
    """Tests for badges integration in ranking"""
    
    def test_ranking_includes_player_ids_for_badges(self):
        """Ranking entries should include jugador_id for badge lookup"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{LIGA_ID}/ranking")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "entries" in data
        if len(data["entries"]) > 0:
            entry = data["entries"][0]
            assert "jugador_id" in entry, "Ranking entry should have jugador_id for badge lookup"
            assert "jugador_info" in entry, "Ranking entry should have jugador_info"


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
