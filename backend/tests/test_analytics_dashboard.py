"""
Analytics Dashboard API Tests
Tests for /api/pinpanclub/analytics endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsDashboard:
    """Tests for GET /api/pinpanclub/analytics/dashboard endpoint"""
    
    def test_dashboard_returns_200(self):
        """Dashboard endpoint should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        assert response.status_code == 200
        
    def test_dashboard_has_overview_fields(self):
        """Dashboard should include all overview statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        # Overview fields
        assert "total_players" in data
        assert "total_matches_week" in data
        assert "matches_change" in data
        assert isinstance(data["total_players"], int)
        assert isinstance(data["total_matches_week"], int)
        
    def test_dashboard_has_rapidpin_fields(self):
        """Dashboard should include RapidPin statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "rapidpin_matches_week" in data
        assert "rapidpin_change" in data
        
    def test_dashboard_has_league_fields(self):
        """Dashboard should include League statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "league_matches_week" in data
        assert "league_change" in data
        
    def test_dashboard_has_arena_fields(self):
        """Dashboard should include Arena tournament statistics"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "arena_tournaments_total" in data
        assert "arena_tournaments_active" in data
        assert "arena_tournaments_completed" in data
        assert "arena_matches_total" in data
        assert "arena_matches_week" in data
        assert "arena_change" in data
        
    def test_dashboard_has_referee_fields(self):
        """Dashboard should include referee statistics and top referee"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "total_referees" in data
        assert "top_referee" in data
        assert "name" in data["top_referee"]
        assert "matches" in data["top_referee"]
        assert "rating" in data["top_referee"]
        
    def test_dashboard_has_weekly_activity(self):
        """Dashboard should include 7-day weekly activity chart data"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "weekly_activity" in data
        assert isinstance(data["weekly_activity"], list)
        assert len(data["weekly_activity"]) == 7  # 7 days
        
        # Each day should have proper structure
        for day in data["weekly_activity"]:
            assert "label" in day  # Day name (Mon, Tue, etc.)
            assert "date" in day   # Date string
            assert "rapidpin" in day
            assert "league" in day
            assert "arena" in day
            assert "total" in day
            
    def test_dashboard_has_monthly_trend(self):
        """Dashboard should include 4-week trend data"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "monthly_trend" in data
        assert isinstance(data["monthly_trend"], list)
        assert len(data["monthly_trend"]) == 4  # 4 weeks
        
        for week in data["monthly_trend"]:
            assert "week" in week  # W1, W2, etc.
            assert "start" in week
            assert "rapidpin" in week
            assert "league" in week
            assert "arena" in week
            assert "total" in week
            
    def test_dashboard_has_mode_distribution(self):
        """Dashboard should include game mode distribution stats"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "mode_distribution" in data
        dist = data["mode_distribution"]
        assert "rapidpin" in dist
        assert "league" in dist
        assert "arena" in dist
        assert "total" in dist
        
        # Total should equal sum of all modes
        assert dist["total"] == dist["rapidpin"] + dist["league"] + dist["arena"]
        
    def test_dashboard_has_top_active_players(self):
        """Dashboard should include top active players list"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "top_active_players" in data
        assert isinstance(data["top_active_players"], list)
        
    def test_dashboard_has_recent_tournaments(self):
        """Dashboard should include recent tournaments list"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "recent_tournaments" in data
        assert isinstance(data["recent_tournaments"], list)
        
    def test_dashboard_has_hall_of_fame(self):
        """Dashboard should include Hall of Fame top 5"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "hall_of_fame_top" in data
        assert isinstance(data["hall_of_fame_top"], list)
        
        # If entries exist, verify structure
        if len(data["hall_of_fame_top"]) > 0:
            entry = data["hall_of_fame_top"][0]
            assert "player_id" in entry
            assert "player_name" in entry
            assert "total_points" in entry
            assert "rank" in entry
            
    def test_dashboard_has_new_players(self):
        """Dashboard should include new players this week"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard")
        data = response.json()
        
        assert "new_players" in data
        assert isinstance(data["new_players"], list)


class TestAnalyticsSummary:
    """Tests for GET /api/pinpanclub/analytics/summary endpoint"""
    
    def test_summary_returns_200(self):
        """Summary endpoint should return 200 OK"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/summary")
        assert response.status_code == 200
        
    def test_summary_has_required_fields(self):
        """Summary should include all required quick stats"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/summary")
        data = response.json()
        
        assert "total_players" in data
        assert "matches_this_week" in data
        assert "active_tournaments" in data
        
        assert isinstance(data["total_players"], int)
        assert isinstance(data["matches_this_week"], int)
        assert isinstance(data["active_tournaments"], int)
        
    def test_summary_values_are_non_negative(self):
        """Summary values should be non-negative integers"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/summary")
        data = response.json()
        
        assert data["total_players"] >= 0
        assert data["matches_this_week"] >= 0
        assert data["active_tournaments"] >= 0


class TestAnalyticsDataConsistency:
    """Tests for data consistency between endpoints"""
    
    def test_player_count_matches(self):
        """total_players should be consistent between dashboard and summary"""
        dashboard = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard").json()
        summary = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/summary").json()
        
        assert dashboard["total_players"] == summary["total_players"]
        
    def test_mode_distribution_totals_match_weekly(self):
        """Mode distribution total should be >= sum of weekly activity totals"""
        dashboard = requests.get(f"{BASE_URL}/api/pinpanclub/analytics/dashboard").json()
        
        # Mode distribution is all-time
        mode_total = dashboard["mode_distribution"]["total"]
        
        # Weekly activity is last 7 days
        weekly_total = sum(day["total"] for day in dashboard["weekly_activity"])
        
        # All-time should be >= last week
        assert mode_total >= weekly_total
