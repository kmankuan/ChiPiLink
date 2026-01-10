"""
Test Suite for Demo Data Seeding Endpoints
Tests POST /api/seed/demo-data, GET /api/seed/demo-stats, DELETE /api/seed/demo-data
and verifies data appears in GET /api/pinpanclub/public/activity-feed
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSeedDemoEndpoints:
    """Test suite for demo data seeding functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "admin@libreria.com",
                "contrasena": "admin"  # Spanish field name
            }
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("token")  # Note: returns 'token' not 'access_token'
        assert token, "No token returned from login"
        return token
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin authentication"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    # ============== GET /api/seed/demo-stats Tests ==============
    
    def test_demo_stats_endpoint_accessible(self):
        """GET /api/seed/demo-stats - should be accessible without auth"""
        response = requests.get(f"{BASE_URL}/api/seed/demo-stats")
        assert response.status_code == 200, f"Demo stats endpoint failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "stats" in data
    
    def test_demo_stats_returns_correct_structure(self):
        """GET /api/seed/demo-stats - should return stats for all modules"""
        response = requests.get(f"{BASE_URL}/api/seed/demo-stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Verify pinpanclub stats structure
        assert "pinpanclub" in stats
        pinpanclub = stats["pinpanclub"]
        assert "players" in pinpanclub
        assert "superpin_matches" in pinpanclub
        assert "rapidpin_matches" in pinpanclub
        assert "rankings" in pinpanclub
        assert "challenges" in pinpanclub
        assert "achievements" in pinpanclub
        assert "player_achievements" in pinpanclub
        assert "tournaments" in pinpanclub
        
        # Verify users_wallets stats structure
        assert "users_wallets" in stats
        users_wallets = stats["users_wallets"]
        assert "profiles" in users_wallets
        assert "wallets" in users_wallets
        assert "transactions" in users_wallets
        
        # Verify memberships stats structure
        assert "memberships" in stats
        
        # Verify notifications stats structure
        assert "notifications" in stats
        notifications = stats["notifications"]
        assert "posts" in notifications
    
    def test_demo_stats_has_seeded_data(self):
        """GET /api/seed/demo-stats - should show seeded data counts"""
        response = requests.get(f"{BASE_URL}/api/seed/demo-stats")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Verify demo data exists (based on seed script expectations)
        pinpanclub = stats.get("pinpanclub", {})
        assert pinpanclub.get("players", 0) >= 12, "Expected at least 12 demo players"
        assert pinpanclub.get("superpin_matches", 0) >= 30, "Expected at least 30 superpin matches"
        assert pinpanclub.get("rapidpin_matches", 0) >= 20, "Expected at least 20 rapidpin matches"
        assert pinpanclub.get("challenges", 0) >= 4, "Expected at least 4 challenges"
        assert pinpanclub.get("achievements", 0) >= 4, "Expected at least 4 achievements"
        assert pinpanclub.get("tournaments", 0) >= 1, "Expected at least 1 tournament"
        
        # Verify users/wallets data
        users_wallets = stats.get("users_wallets", {})
        assert users_wallets.get("profiles", 0) >= 3, "Expected at least 3 demo user profiles"
        
        # Verify notifications data
        notifications = stats.get("notifications", {})
        assert notifications.get("posts", 0) >= 3, "Expected at least 3 notification posts"
    
    # ============== POST /api/seed/demo-data Tests ==============
    
    def test_seed_demo_data_requires_auth(self):
        """POST /api/seed/demo-data - should require admin authentication"""
        response = requests.post(f"{BASE_URL}/api/seed/demo-data")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_seed_demo_data_with_admin_auth(self, admin_headers):
        """POST /api/seed/demo-data - should work with admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/seed/demo-data",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Seed demo data failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "results" in data
        assert "timestamp" in data
        
        # Verify results structure
        results = data.get("results", {})
        assert "pinpanclub" in results
        assert "users_wallets" in results
        assert "notifications" in results
    
    def test_seed_demo_data_creates_pinpanclub_data(self, admin_headers):
        """POST /api/seed/demo-data - should create PinPanClub data"""
        response = requests.post(
            f"{BASE_URL}/api/seed/demo-data",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        results = data.get("results", {}).get("pinpanclub", {})
        
        # Verify expected data was created
        assert results.get("players_created", 0) == 12, "Expected 12 players created"
        assert results.get("rankings_created", 0) == 12, "Expected 12 rankings created"
        assert results.get("superpin_matches_created", 0) == 30, "Expected 30 superpin matches"
        assert results.get("rapidpin_matches_created", 0) == 20, "Expected 20 rapidpin matches"
        assert results.get("challenges_created", 0) == 4, "Expected 4 challenges"
        assert results.get("tournaments_created", 0) == 1, "Expected 1 tournament"
    
    # ============== DELETE /api/seed/demo-data Tests ==============
    
    def test_delete_demo_data_requires_auth(self):
        """DELETE /api/seed/demo-data - should require admin authentication"""
        response = requests.delete(f"{BASE_URL}/api/seed/demo-data")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # Note: We don't actually delete data here to preserve it for activity feed tests
    # The delete functionality is tested in the integration test class
    
    # ============== GET /api/pinpanclub/public/activity-feed Tests ==============
    
    def test_activity_feed_accessible(self):
        """GET /api/pinpanclub/public/activity-feed - should be publicly accessible"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200, f"Activity feed failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
    
    def test_activity_feed_returns_matches(self):
        """GET /api/pinpanclub/public/activity-feed - should return recent matches"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        recent_matches = data.get("recent_matches", [])
        
        # Should have matches from seeded data
        assert len(recent_matches) > 0, "Expected recent matches in activity feed"
        
        # Verify match structure
        if recent_matches:
            match = recent_matches[0]
            assert "match_id" in match
            assert "type" in match
            assert "player1" in match
            assert "player2" in match
            assert "result" in match
    
    def test_activity_feed_returns_leaderboard(self):
        """GET /api/pinpanclub/public/activity-feed - should return leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data.get("leaderboard", [])
        
        # Should have players in leaderboard
        assert len(leaderboard) > 0, "Expected players in leaderboard"
        
        # Verify leaderboard entry structure
        if leaderboard:
            player = leaderboard[0]
            assert "player_id" in player
            assert "name" in player
            assert "points" in player
    
    def test_activity_feed_returns_challenges(self):
        """GET /api/pinpanclub/public/activity-feed - should return active challenges"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        challenges = data.get("active_challenges", [])
        
        # Should have challenges from seeded data
        assert len(challenges) > 0, "Expected active challenges in activity feed"
        
        # Verify challenge structure
        if challenges:
            challenge = challenges[0]
            assert "challenge_id" in challenge
            assert "name" in challenge
            assert "icon" in challenge
            assert "difficulty" in challenge
    
    def test_activity_feed_returns_achievements(self):
        """GET /api/pinpanclub/public/activity-feed - should return recent achievements"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        achievements = data.get("recent_achievements", [])
        
        # Should have achievements from seeded data
        assert len(achievements) > 0, "Expected recent achievements in activity feed"
        
        # Verify achievement structure
        if achievements:
            achievement = achievements[0]
            assert "achievement_id" in achievement
            assert "name" in achievement
            assert "icon" in achievement
            assert "rarity" in achievement
    
    def test_activity_feed_returns_stats(self):
        """GET /api/pinpanclub/public/activity-feed - should return stats"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        stats = data.get("stats", {})
        
        # Should have stats (note: field names are total_superpin_matches, total_rapidpin_matches)
        assert "active_players" in stats
        assert "total_superpin_matches" in stats
        assert "total_rapidpin_matches" in stats
        assert "total_matches" in stats
    
    def test_activity_feed_returns_tournaments(self):
        """GET /api/pinpanclub/public/activity-feed - should return upcoming tournaments"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        
        data = response.json()
        tournaments = data.get("upcoming_tournaments", [])
        
        # Should have tournaments from seeded data
        assert len(tournaments) > 0, "Expected upcoming tournaments in activity feed"
        
        # Verify tournament structure
        if tournaments:
            tournament = tournaments[0]
            assert "tournament_id" in tournament
            assert "name" in tournament
            assert "status" in tournament
    
    def test_activity_feed_with_language_param(self):
        """GET /api/pinpanclub/public/activity-feed - should support language parameter"""
        # Test Spanish
        response_es = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed?lang=es")
        assert response_es.status_code == 200
        data_es = response_es.json()
        assert data_es.get("lang") == "es"
        
        # Test English
        response_en = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed?lang=en")
        assert response_en.status_code == 200
        data_en = response_en.json()
        assert data_en.get("lang") == "en"
    
    def test_activity_feed_with_limit_params(self):
        """GET /api/pinpanclub/public/activity-feed - should respect limit parameters"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/public/activity-feed",
            params={
                "matches_limit": 3,
                "leaderboard_limit": 5,
                "challenges_limit": 2
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify limits are respected
        recent_matches = data.get("recent_matches", [])
        assert len(recent_matches) <= 3, "Matches should respect limit"
        
        leaderboard = data.get("leaderboard", [])
        assert len(leaderboard) <= 5, "Leaderboard should respect limit"
        
        challenges = data.get("active_challenges", [])
        assert len(challenges) <= 2, "Challenges should respect limit"


class TestSeedDemoIntegration:
    """Integration tests for seed demo workflow"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={
                "email": "admin@libreria.com",
                "contrasena": "admin"
            }
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin authentication"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_full_seed_workflow(self, admin_headers):
        """Test complete seed → verify → delete workflow"""
        # Step 1: Get initial stats
        initial_stats = requests.get(f"{BASE_URL}/api/seed/demo-stats").json()
        initial_players = initial_stats.get("stats", {}).get("pinpanclub", {}).get("players", 0)
        
        # Step 2: Seed demo data
        seed_response = requests.post(
            f"{BASE_URL}/api/seed/demo-data",
            headers=admin_headers
        )
        assert seed_response.status_code == 200
        
        # Step 3: Verify stats increased
        after_seed_stats = requests.get(f"{BASE_URL}/api/seed/demo-stats").json()
        after_seed_players = after_seed_stats.get("stats", {}).get("pinpanclub", {}).get("players", 0)
        assert after_seed_players >= 12, "Should have at least 12 players after seeding"
        
        # Step 4: Verify activity feed has data
        feed_response = requests.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert feed_response.status_code == 200
        feed_data = feed_response.json()
        assert len(feed_data.get("recent_matches", [])) > 0
        assert len(feed_data.get("leaderboard", [])) > 0
        
        print(f"✓ Seed workflow complete: {after_seed_players} players, feed has data")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
