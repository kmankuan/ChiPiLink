"""
Test: Spanish-to-English Field Renaming Refactoring
Tests that all PinPanClub APIs return English field names after migration.

Modules tested:
- RapidPin seasons/matches/rankings
- Referee system & Hall of Fame
- Seasons service
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestRapidPinSeasonsEnglishFields:
    """Test RapidPin seasons return English field names"""
    
    def test_get_seasons_returns_english_fields(self):
        """GET /api/pinpanclub/rapidpin/seasons - returns seasons with English field names"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            season = data[0]
            # Verify English field names
            assert "start_date" in season, "Missing English field: start_date"
            assert "end_date" in season, "Missing English field: end_date"
            assert "status" in season, "Missing English field: status"
            assert "name" in season, "Missing English field: name"
            assert "season_id" in season, "Missing English field: season_id"
            
            # Verify old Spanish names are NOT present
            assert "fecha_inicio" not in season, "Old Spanish field 'fecha_inicio' still present"
            assert "fecha_fin" not in season, "Old Spanish field 'fecha_fin' still present"
            assert "estado" not in season, "Old Spanish field 'estado' still present"
            assert "nombre" not in season, "Old Spanish field 'nombre' still present"
            assert "temporada_id" not in season, "Old Spanish field 'temporada_id' still present"
            
            print(f"✓ Season has English fields: start_date={season['start_date']}, status={season['status']}")
    
    def test_get_seasons_active_only(self):
        """GET /api/pinpanclub/rapidpin/seasons?active_only=true"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/seasons?active_only=true")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # All returned seasons should be active
        for season in data:
            assert season.get("status") == "active", f"Expected active status, got {season.get('status')}"


class TestRefereeSystemEnglishFields:
    """Test Referee system returns English field names"""
    
    def test_get_referee_settings_returns_english_fields(self):
        """GET /api/pinpanclub/referee/settings - returns global referee config"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/referee/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "referee_config" in data, "Missing referee_config"
        assert "settings_id" in data, "Missing settings_id"
        
        # Verify game types in config
        config = data.get("referee_config", {})
        assert "league" in config, "Missing league config"
        assert "rapidpin" in config, "Missing rapidpin config"
        assert "arena" in config, "Missing arena config"
        assert "casual" in config, "Missing casual config"
        
        # Verify English field names in each config
        for game_type in ["league", "rapidpin", "arena", "casual"]:
            game_config = config.get(game_type, {})
            assert "required" in game_config or "points_awarded" in game_config, f"Missing fields in {game_type} config"
        
        print(f"✓ Referee settings has 4 game types: {list(config.keys())}")
    
    def test_get_hall_of_fame_returns_english_fields(self):
        """GET /api/pinpanclub/referee/hall-of-fame - returns leaderboard with English field names"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Hall of Fame should return a list"
        
        if len(data) > 0:
            entry = data[0]
            
            # Verify English field names
            assert "player_id" in entry, "Missing English field: player_id"
            assert "player_name" in entry, "Missing English field: player_name"
            assert "total_points" in entry, "Missing English field: total_points"
            assert "total_matches" in entry, "Missing English field: total_matches"
            assert "total_wins" in entry, "Missing English field: total_wins"
            assert "rank" in entry, "Missing English field: rank"
            
            # Verify mode-specific points
            assert "arena_points" in entry, "Missing arena_points"
            assert "league_points" in entry, "Missing league_points"
            assert "rapidpin_points" in entry, "Missing rapidpin_points"
            assert "referee_points" in entry, "Missing referee_points"
            
            # Verify old Spanish names are NOT present
            assert "jugador_id" not in entry, "Old Spanish field 'jugador_id' still present"
            assert "puntos_totales" not in entry, "Old Spanish field 'puntos_totales' still present"
            assert "arbitro_id" not in entry, "Old Spanish field 'arbitro_id' still present"
            
            print(f"✓ Hall of Fame entry: player={entry['player_name']}, total_points={entry['total_points']}, rank={entry['rank']}")
    
    def test_hall_of_fame_filter_by_mode(self):
        """GET /api/pinpanclub/referee/hall-of-fame?mode=arena filters correctly"""
        modes = ["arena", "league", "rapidpin", "referee"]
        
        for mode in modes:
            response = requests.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame?mode={mode}")
            assert response.status_code == 200, f"Mode {mode} failed"
            data = response.json()
            assert isinstance(data, list), f"Mode {mode} should return list"
            print(f"✓ Hall of Fame mode={mode} returned {len(data)} entries")
    
    def test_get_referee_profiles_leaderboard(self):
        """GET /api/pinpanclub/referee/profiles - returns top referees"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/referee/profiles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Referee profiles returned {len(data)} referees")


class TestHallOfFameAdminEndpoints:
    """Test Hall of Fame admin endpoints"""
    
    def test_refresh_requires_admin_auth(self):
        """POST /api/pinpanclub/referee/hall-of-fame/refresh requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/refresh")
        # Should return 401 or 403 without auth
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print(f"✓ Hall of Fame refresh requires auth (got {response.status_code})")
    
    def test_get_player_hall_of_fame_not_found(self):
        """GET /api/pinpanclub/referee/hall-of-fame/{player_id} returns 404 for non-existent"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/NONEXISTENT_PLAYER")
        assert response.status_code == 404
        print("✓ Non-existent player returns 404")


class TestSeasonsServiceEnglishFields:
    """Test ranking seasons service returns English fields"""
    
    def test_get_current_season(self):
        """GET /api/pinpanclub/seasons/current - returns current season"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        # May return None if no active season
        if data.get("season"):
            season = data["season"]
            # Verify English field names
            assert "season_id" in season, "Missing season_id"
            assert "status" in season, "Missing status"
            assert "start_date" in season, "Missing start_date"
            assert "end_date" in season, "Missing end_date"
            print(f"✓ Current season: {season.get('season_id')}, status={season.get('status')}")
        else:
            print("✓ No active season (expected)")
    
    def test_get_all_seasons(self):
        """GET /api/pinpanclub/seasons/all - returns all seasons"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "seasons" in data
        assert "total" in data
        print(f"✓ All seasons returned {data['total']} entries")


class TestRapidPinMatchesEnglishFields:
    """Test RapidPin matches return English field names"""
    
    def test_rapidpin_scoring_config(self):
        """GET /api/pinpanclub/rapidpin/scoring - returns scoring config"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/scoring")
        assert response.status_code == 200
        
        data = response.json()
        assert "scoring" in data
        assert "rules" in data
        
        scoring = data["scoring"]
        assert "victory" in scoring
        assert "defeat" in scoring
        assert "referee" in scoring
        print(f"✓ Scoring: victory={scoring['victory']}, defeat={scoring['defeat']}, referee={scoring['referee']}")
    
    def test_rapidpin_queue_endpoints(self):
        """GET /api/pinpanclub/rapidpin/queue - returns queue matches"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/queue")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        if len(data) > 0:
            queue_item = data[0]
            # Verify English field names
            assert "queue_id" in queue_item, "Missing queue_id"
            assert "season_id" in queue_item, "Missing season_id"
            assert "player1_id" in queue_item, "Missing player1_id"
            assert "player2_id" in queue_item, "Missing player2_id"
            assert "status" in queue_item, "Missing status"
            
            # Verify old Spanish names NOT present
            assert "jugador1_id" not in queue_item, "Old Spanish field still present"
            assert "jugador2_id" not in queue_item, "Old Spanish field still present"
            assert "arbitro_id" not in queue_item, "Old Spanish field still present"
            assert "estado" not in queue_item, "Old Spanish field still present"
        
        print(f"✓ Queue returned {len(data)} matches")
    
    def test_rapidpin_public_feed(self):
        """GET /api/pinpanclub/rapidpin/public/feed - returns public feed"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/public/feed")
        assert response.status_code == 200
        
        data = response.json()
        # Should return structured feed data
        assert isinstance(data, dict)
        print(f"✓ Public feed keys: {list(data.keys())}")


class TestAuthenticatedAdminEndpoints:
    """Test admin endpoints with authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"}
        )
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("access_token") or data.get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip(f"Admin login failed: {response.status_code}")
    
    def test_admin_can_refresh_hall_of_fame(self):
        """POST /api/pinpanclub/referee/hall-of-fame/refresh - admin can rebuild"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/referee/hall-of-fame/refresh",
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        print(f"✓ Admin refreshed Hall of Fame: entries_updated={data.get('entries_updated')}")
    
    def test_admin_can_update_referee_settings(self):
        """PUT /api/pinpanclub/referee/settings/{game_type} - admin can update"""
        response = requests.put(
            f"{BASE_URL}/api/pinpanclub/referee/settings/arena",
            headers=self.headers,
            json={"points_awarded": 3}
        )
        assert response.status_code == 200
        print("✓ Admin updated arena referee settings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
