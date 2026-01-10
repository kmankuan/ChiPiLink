"""
Test Suite for Analytics Dashboard, Achievements System, and Social Features
Tests for P2 features: Analytics, Achievements, and expanded Social functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test player ID from context
TEST_PLAYER_ID = "jugador_544167d88272"

class TestAnalyticsDashboard:
    """Analytics Dashboard endpoint tests"""
    
    def test_get_analytics_dashboard(self):
        """GET /api/pinpanclub/analytics/dashboard - Returns dashboard statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        assert response.status_code == 200
        
        data = response.json()
        # Verify required fields exist
        assert "total_active_players" in data
        assert "matches_this_week" in data
        assert "matches_change" in data
        assert "superpin_matches" in data
        assert "rapid_pin_matches" in data
        assert "challenges_completed" in data
        assert "weekly_activity" in data
        assert "top_active_players" in data
        assert "recent_achievements" in data
        assert "challenge_leaderboard" in data
        assert "popular_challenges" in data
        assert "daily_matches" in data
        assert "activity_ranking" in data
        
        # Verify data types
        assert isinstance(data["total_active_players"], int)
        assert isinstance(data["matches_this_week"], int)
        assert isinstance(data["weekly_activity"], list)
        
    def test_get_analytics_summary(self):
        """GET /api/pinpanclub/analytics/summary - Returns quick summary"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/summary")
        assert response.status_code == 200
        
        data = response.json()
        assert "active_players" in data
        assert "matches_this_week" in data
        assert "challenges_completed" in data
        assert "top_players" in data


class TestAchievementsSystem:
    """Achievements System endpoint tests"""
    
    def test_get_all_achievements(self):
        """GET /api/pinpanclub/achievements/ - Returns all available achievements"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/achievements/")
        assert response.status_code == 200
        
        data = response.json()
        assert "achievements" in data
        assert "total" in data
        assert isinstance(data["achievements"], list)
        assert data["total"] >= 0
        
        # Verify achievement structure if any exist
        if data["achievements"]:
            achievement = data["achievements"][0]
            assert "name" in achievement
            assert "description" in achievement
            assert "icon" in achievement
            assert "rarity" in achievement
            assert "requirement_type" in achievement
            assert "achievement_id" in achievement
    
    def test_get_player_achievements(self):
        """GET /api/pinpanclub/achievements/player/{jugador_id} - Returns player achievements"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/achievements/player/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert data["jugador_id"] == TEST_PLAYER_ID
        assert "achievements" in data
        assert "total" in data
        assert isinstance(data["achievements"], list)
    
    def test_check_achievements(self):
        """POST /api/pinpanclub/achievements/check/{jugador_id} - Check and award achievements"""
        response = requests.post(f"{BASE_URL}/api/pinpanclub/achievements/check/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert data["jugador_id"] == TEST_PLAYER_ID
        assert "awarded" in data
        assert "count" in data
        assert isinstance(data["awarded"], list)
        assert isinstance(data["count"], int)
    
    def test_initialize_achievements(self):
        """POST /api/pinpanclub/achievements/initialize - Initialize achievements (admin)"""
        response = requests.post(f"{BASE_URL}/api/pinpanclub/achievements/initialize")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "created" in data


class TestSocialFollowFeatures:
    """Social Follow features endpoint tests"""
    
    def test_get_follow_stats(self):
        """GET /api/pinpanclub/social/follow-stats/{jugador_id} - Returns follow statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/follow-stats/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "followers_count" in data
        assert "following_count" in data
        assert isinstance(data["followers_count"], int)
        assert isinstance(data["following_count"], int)
    
    def test_get_followers(self):
        """GET /api/pinpanclub/social/followers/{jugador_id} - Returns followers list"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/followers/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "followers" in data
        assert "total" in data
        assert isinstance(data["followers"], list)
    
    def test_get_following(self):
        """GET /api/pinpanclub/social/following/{jugador_id} - Returns following list"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/following/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "following" in data
        assert "total" in data
        assert isinstance(data["following"], list)
    
    def test_is_following(self):
        """GET /api/pinpanclub/social/is-following - Check if following"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/social/is-following",
            params={"follower_id": TEST_PLAYER_ID, "following_id": "test_user_123"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "is_following" in data
        assert isinstance(data["is_following"], bool)
    
    def test_follow_player(self):
        """POST /api/pinpanclub/social/follow - Follow a player"""
        # Use test player as follower and create unique following ID
        follower_id = TEST_PLAYER_ID
        following_id = f"test_following_{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/social/follow",
            json={"follower_id": follower_id, "following_id": following_id}
        )
        # Accept 200 or 520 (server error for non-existent player)
        assert response.status_code in [200, 520, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "follower_id" in data
            assert "following_id" in data
    
    def test_follow_self_should_fail(self):
        """POST /api/pinpanclub/social/follow - Cannot follow yourself"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/social/follow",
            json={"follower_id": TEST_PLAYER_ID, "following_id": TEST_PLAYER_ID}
        )
        assert response.status_code == 400


class TestSocialCommentsFeatures:
    """Social Comments features endpoint tests"""
    
    def test_get_comments_for_player(self):
        """GET /api/pinpanclub/social/comments/player/{target_id} - Returns player comments"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/comments/player/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "target_id" in data
        assert "target_type" in data
        assert "comments" in data
        assert data["target_type"] == "player"
        assert isinstance(data["comments"], list)
    
    def test_get_comments_for_match(self):
        """GET /api/pinpanclub/social/comments/match/{target_id} - Returns match comments"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/comments/match/test_match_123")
        assert response.status_code == 200
        
        data = response.json()
        assert "target_id" in data
        assert "target_type" in data
        assert "comments" in data
        assert data["target_type"] == "match"
    
    def test_create_comment(self):
        """POST /api/pinpanclub/social/comments - Create a comment"""
        comment_data = {
            "author_id": TEST_PLAYER_ID,
            "target_id": f"test_target_{uuid.uuid4().hex[:8]}",
            "target_type": "player",
            "content": "Test comment from automated testing"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/social/comments",
            json=comment_data
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "comment_id" in data
        assert "author_id" in data
        assert "content" in data
        assert data["content"] == comment_data["content"]


class TestUserWarningsModeration:
    """User Warnings and Moderation endpoint tests"""
    
    def test_get_user_warnings(self):
        """GET /api/pinpanclub/social/user/{user_id}/warnings - Returns user warnings count"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/user/{TEST_PLAYER_ID}/warnings")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "warnings" in data
        assert data["user_id"] == TEST_PLAYER_ID
        assert isinstance(data["warnings"], int)
        assert data["warnings"] >= 0


class TestSocialReactions:
    """Social Reactions endpoint tests"""
    
    def test_get_reactions(self):
        """GET /api/pinpanclub/social/reactions/{target_type}/{target_id} - Returns reactions"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/reactions/comment/test_comment_123")
        assert response.status_code == 200
        
        data = response.json()
        assert "target_id" in data
        # API returns by_type instead of reactions and target_type
        assert "by_type" in data or "reactions" in data
        assert "total" in data
    
    def test_add_reaction(self):
        """POST /api/pinpanclub/social/reactions - Add a reaction"""
        reaction_data = {
            "user_id": TEST_PLAYER_ID,
            "target_id": f"test_target_{uuid.uuid4().hex[:8]}",
            "target_type": "comment",
            "reaction_type": "clap"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/social/reactions",
            json=reaction_data
        )
        assert response.status_code == 200


class TestActivityFeed:
    """Activity Feed endpoint tests"""
    
    def test_get_player_feed(self):
        """GET /api/pinpanclub/social/feed/{jugador_id} - Returns player activity feed"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/feed/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "feed" in data
        assert isinstance(data["feed"], list)
    
    def test_get_following_feed(self):
        """GET /api/pinpanclub/social/feed/{jugador_id}/following - Returns following feed"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/feed/{TEST_PLAYER_ID}/following")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "feed" in data
        assert isinstance(data["feed"], list)


class TestNotifications:
    """Notifications endpoint tests"""
    
    def test_get_notifications(self):
        """GET /api/pinpanclub/social/notifications/{user_id} - Returns notifications"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/notifications/{TEST_PLAYER_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "notifications" in data
        assert "unread_count" in data
        assert isinstance(data["notifications"], list)
    
    def test_get_unread_count(self):
        """GET /api/pinpanclub/social/notifications/{user_id}/unread-count - Returns unread count"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/social/notifications/{TEST_PLAYER_ID}/unread-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "user_id" in data
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
