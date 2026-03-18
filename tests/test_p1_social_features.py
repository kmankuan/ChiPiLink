"""
P1 Features Testing - Social Features, Weekly Challenges, Notifications, Prizes
Tests for:
- WebSocket notifications endpoint
- Notification API endpoints
- Weekly Challenges API
- Social follow API
- Comments API
- Prizes catalog
"""
import pytest
import requests
import os
import json
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@libreria.com"
TEST_PASSWORD = "admin"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": TEST_EMAIL,
        "contrasena": TEST_PASSWORD
    })
    if response.status_code == 200:
        data = response.json()
        return data.get("token") or data.get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


@pytest.fixture(scope="module")
def test_players(api_client):
    """Get test players for social features testing"""
    response = api_client.get(f"{BASE_URL}/api/pinpanclub/players?limit=5")
    if response.status_code == 200:
        players = response.json()
        if len(players) >= 2:
            return players[:2]
    pytest.skip("Need at least 2 players for social tests")


# ============== NOTIFICATIONS API TESTS ==============

class TestNotificationsAPI:
    """Tests for notification endpoints"""
    
    def test_get_notifications_endpoint_exists(self, api_client, test_players):
        """GET /api/pinpanclub/social/notifications/{user_id} - Returns 200"""
        user_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/notifications/{user_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
    
    def test_get_notifications_unread_only(self, api_client, test_players):
        """GET notifications with unread_only filter"""
        user_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/notifications/{user_id}?unread_only=true")
        assert response.status_code == 200
        
        data = response.json()
        assert "notifications" in data
    
    def test_get_unread_count(self, api_client, test_players):
        """GET /api/pinpanclub/social/notifications/{user_id}/unread-count"""
        user_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/notifications/{user_id}/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)


# ============== WEEKLY CHALLENGES API TESTS ==============

class TestWeeklyChallengesAPI:
    """Tests for weekly challenges endpoints"""
    
    def test_get_weekly_challenges(self, api_client):
        """GET /api/pinpanclub/challenges/weekly - Returns weekly challenges"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/challenges/weekly")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "week" in data or "challenges" in data
        
        # If challenges exist, validate structure
        if "challenges" in data and len(data["challenges"]) > 0:
            challenge = data["challenges"][0]
            assert "challenge_id" in challenge
            assert "name" in challenge
            assert "description" in challenge
            assert "target_value" in challenge
            assert "points_reward" in challenge
    
    def test_get_challenge_definitions(self, api_client):
        """GET /api/pinpanclub/challenges/definitions - Returns all challenges"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/challenges/definitions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_start_challenge(self, api_client, test_players):
        """POST /api/pinpanclub/challenges/start/{challenge_id} - Start a challenge"""
        # First get available challenges
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/challenges/weekly")
        if response.status_code != 200:
            pytest.skip("No weekly challenges available")
        
        data = response.json()
        challenges = data.get("challenges", [])
        if not challenges:
            pytest.skip("No challenges to start")
        
        challenge_id = challenges[0]["challenge_id"]
        jugador_id = test_players[0]["jugador_id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/pinpanclub/challenges/start/{challenge_id}?jugador_id={jugador_id}"
        )
        # 200 if started, 400 if already started
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_get_player_challenges(self, api_client, test_players):
        """GET /api/pinpanclub/challenges/player/{jugador_id} - Get player challenges"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/challenges/player/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "challenges" in data
        assert "stats" in data
    
    def test_get_challenges_leaderboard(self, api_client):
        """GET /api/pinpanclub/challenges/leaderboard - Returns leaderboard"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/challenges/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "entries" in data
        assert "total_participants" in data


# ============== SOCIAL FOLLOW API TESTS ==============

class TestSocialFollowAPI:
    """Tests for social follow endpoints"""
    
    def test_follow_player(self, api_client, test_players):
        """POST /api/pinpanclub/social/follow - Follow a player"""
        follower_id = test_players[0]["jugador_id"]
        following_id = test_players[1]["jugador_id"]
        
        response = api_client.post(f"{BASE_URL}/api/pinpanclub/social/follow", json={
            "follower_id": follower_id,
            "following_id": following_id
        })
        # 200 if followed, 400 if already following or same user
        assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}: {response.text}"
    
    def test_get_follow_stats(self, api_client, test_players):
        """GET /api/pinpanclub/social/follow-stats/{jugador_id} - Get follow stats"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/follow-stats/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "followers_count" in data
        assert "following_count" in data
    
    def test_is_following(self, api_client, test_players):
        """GET /api/pinpanclub/social/is-following - Check if following"""
        follower_id = test_players[0]["jugador_id"]
        following_id = test_players[1]["jugador_id"]
        
        response = api_client.get(
            f"{BASE_URL}/api/pinpanclub/social/is-following?follower_id={follower_id}&following_id={following_id}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "is_following" in data
        assert isinstance(data["is_following"], bool)
    
    def test_get_followers(self, api_client, test_players):
        """GET /api/pinpanclub/social/followers/{jugador_id} - Get followers"""
        jugador_id = test_players[1]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/followers/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "followers" in data
    
    def test_get_following(self, api_client, test_players):
        """GET /api/pinpanclub/social/following/{jugador_id} - Get following"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/following/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "following" in data


# ============== COMMENTS API TESTS ==============

class TestCommentsAPI:
    """Tests for comments endpoints"""
    
    def test_create_comment(self, api_client, test_players):
        """POST /api/pinpanclub/social/comments - Create a comment"""
        author_id = test_players[0]["jugador_id"]
        target_id = test_players[1]["jugador_id"]
        
        response = api_client.post(f"{BASE_URL}/api/pinpanclub/social/comments", json={
            "author_id": author_id,
            "target_id": target_id,
            "target_type": "player",
            "content": f"Test comment from P1 testing - {datetime.now().isoformat()}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "comment_id" in data
        assert "content" in data
        assert "author_id" in data
    
    def test_get_comments(self, api_client, test_players):
        """GET /api/pinpanclub/social/comments/{target_type}/{target_id} - Get comments"""
        target_id = test_players[1]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/comments/player/{target_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "target_id" in data
        assert "target_type" in data
        assert "comments" in data
        assert isinstance(data["comments"], list)


# ============== REACTIONS API TESTS ==============

class TestReactionsAPI:
    """Tests for reactions endpoints"""
    
    def test_add_reaction(self, api_client, test_players):
        """POST /api/pinpanclub/social/reactions - Add a reaction"""
        user_id = test_players[0]["jugador_id"]
        target_id = test_players[1]["jugador_id"]
        
        response = api_client.post(f"{BASE_URL}/api/pinpanclub/social/reactions", json={
            "user_id": user_id,
            "target_id": target_id,
            "target_type": "player",
            "reaction_type": "fire"
        })
        # 200 if added, or response with "removed" if toggled off
        assert response.status_code == 200
    
    def test_get_reactions(self, api_client, test_players):
        """GET /api/pinpanclub/social/reactions/{target_type}/{target_id} - Get reactions"""
        target_id = test_players[1]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/reactions/player/{target_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "target_id" in data
        assert "total" in data
        assert "by_type" in data


# ============== PRIZES CATALOG API TESTS ==============

class TestPrizesCatalogAPI:
    """Tests for prizes catalog endpoints"""
    
    def test_get_prize_catalog(self, api_client):
        """GET /api/pinpanclub/prizes/catalog - Returns prize catalog"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/prizes/catalog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Catalog should have prizes
        assert "prizes" in data or "catalog_id" in data
    
    def test_get_prize_definitions(self, api_client):
        """GET /api/pinpanclub/prizes/definitions - Returns all prizes"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/prizes/definitions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # If prizes exist, validate structure
        if len(data) > 0:
            prize = data[0]
            assert "prize_id" in prize
            assert "name" in prize
            assert "type" in prize
    
    def test_get_player_prizes(self, api_client, test_players):
        """GET /api/pinpanclub/prizes/player/{jugador_id} - Get player prizes"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/prizes/player/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "prizes" in data


# ============== WEBSOCKET STATS TESTS ==============

class TestWebSocketStats:
    """Tests for WebSocket management endpoints"""
    
    def test_get_websocket_stats(self, api_client):
        """GET /api/pinpanclub/ws/stats - Returns WebSocket stats"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/ws/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "total_connections" in data
        assert "global_watchers" in data
    
    def test_get_notification_stats(self, api_client):
        """GET /api/pinpanclub/ws/notifications/stats - Returns notification stats"""
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/ws/notifications/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert "connected_users" in data


# ============== ACTIVITY FEED TESTS ==============

class TestActivityFeed:
    """Tests for activity feed endpoints"""
    
    def test_get_player_feed(self, api_client, test_players):
        """GET /api/pinpanclub/social/feed/{jugador_id} - Get player feed"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/feed/{jugador_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "feed" in data
    
    def test_get_following_feed(self, api_client, test_players):
        """GET /api/pinpanclub/social/feed/{jugador_id}/following - Get following feed"""
        jugador_id = test_players[0]["jugador_id"]
        response = api_client.get(f"{BASE_URL}/api/pinpanclub/social/feed/{jugador_id}/following")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "feed" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
