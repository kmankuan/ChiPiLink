"""
Test PinPanClub Public Activity Feed Feature
Tests public endpoints for activity feed and stats summary
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPinPanClubPublicFeed:
    """Tests for PinPanClub public activity feed endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    # ==================== PUBLIC ACTIVITY FEED ====================
    
    def test_activity_feed_no_auth_required(self):
        """GET /api/pinpanclub/public/activity-feed - Should work without authentication"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert "timestamp" in data
        print(f"✓ Activity feed accessible without auth")
    
    def test_activity_feed_default_language(self):
        """GET /api/pinpanclub/public/activity-feed - Default language is Spanish"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        data = response.json()
        assert data["lang"] == "es"
        print(f"✓ Default language is Spanish (es)")
    
    def test_activity_feed_english_language(self):
        """GET /api/pinpanclub/public/activity-feed?lang=en - English language support"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed?lang=en")
        assert response.status_code == 200
        data = response.json()
        assert data["lang"] == "en"
        print(f"✓ English language (en) supported")
    
    def test_activity_feed_chinese_language(self):
        """GET /api/pinpanclub/public/activity-feed?lang=zh - Chinese language support"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed?lang=zh")
        assert response.status_code == 200
        data = response.json()
        assert data["lang"] == "zh"
        print(f"✓ Chinese language (zh) supported")
    
    def test_activity_feed_response_structure(self):
        """GET /api/pinpanclub/public/activity-feed - Verify response structure"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields are present
        assert "success" in data
        assert "timestamp" in data
        assert "lang" in data
        assert "recent_matches" in data
        assert "leaderboard" in data
        assert "active_challenges" in data
        assert "recent_achievements" in data
        assert "stats" in data
        assert "upcoming_tournaments" in data
        
        # Verify data types
        assert isinstance(data["recent_matches"], list)
        assert isinstance(data["leaderboard"], list)
        assert isinstance(data["active_challenges"], list)
        assert isinstance(data["recent_achievements"], list)
        assert isinstance(data["stats"], dict)
        assert isinstance(data["upcoming_tournaments"], list)
        
        print(f"✓ Response structure is correct with all expected fields")
    
    def test_activity_feed_stats_structure(self):
        """GET /api/pinpanclub/public/activity-feed - Verify stats structure"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed")
        assert response.status_code == 200
        data = response.json()
        
        stats = data["stats"]
        assert "active_players" in stats
        assert "total_superpin_matches" in stats
        assert "total_rapidpin_matches" in stats
        assert "total_matches" in stats
        
        # Verify stats are integers
        assert isinstance(stats["active_players"], int)
        assert isinstance(stats["total_superpin_matches"], int)
        assert isinstance(stats["total_rapidpin_matches"], int)
        assert isinstance(stats["total_matches"], int)
        
        print(f"✓ Stats structure is correct: {stats}")
    
    def test_activity_feed_section_toggles(self):
        """GET /api/pinpanclub/public/activity-feed - Test section toggle parameters"""
        # Disable all sections
        params = {
            "include_matches": "false",
            "include_leaderboard": "false",
            "include_challenges": "false",
            "include_achievements": "false",
            "include_stats": "false",
            "include_tournaments": "false"
        }
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed", params=params)
        assert response.status_code == 200
        data = response.json()
        
        # When disabled, sections should not be in response
        assert "recent_matches" not in data or data.get("recent_matches") is None
        assert "leaderboard" not in data or data.get("leaderboard") is None
        assert "active_challenges" not in data or data.get("active_challenges") is None
        assert "recent_achievements" not in data or data.get("recent_achievements") is None
        assert "stats" not in data or data.get("stats") is None
        assert "upcoming_tournaments" not in data or data.get("upcoming_tournaments") is None
        
        print(f"✓ Section toggles work correctly")
    
    def test_activity_feed_limit_parameters(self):
        """GET /api/pinpanclub/public/activity-feed - Test limit parameters"""
        params = {
            "matches_limit": 3,
            "leaderboard_limit": 5,
            "challenges_limit": 2,
            "achievements_limit": 4,
            "tournaments_limit": 1
        }
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/activity-feed", params=params)
        assert response.status_code == 200
        data = response.json()
        
        # Verify limits are respected (data may be empty but should not exceed limits)
        assert len(data.get("recent_matches", [])) <= 3
        assert len(data.get("leaderboard", [])) <= 5
        assert len(data.get("active_challenges", [])) <= 2
        assert len(data.get("recent_achievements", [])) <= 4
        assert len(data.get("upcoming_tournaments", [])) <= 1
        
        print(f"✓ Limit parameters work correctly")
    
    # ==================== PUBLIC STATS SUMMARY ====================
    
    def test_stats_summary_no_auth_required(self):
        """GET /api/pinpanclub/public/stats-summary - Should work without authentication"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/stats-summary")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print(f"✓ Stats summary accessible without auth")
    
    def test_stats_summary_response_structure(self):
        """GET /api/pinpanclub/public/stats-summary - Verify response structure"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/stats-summary")
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert "stats" in data
        
        stats = data["stats"]
        assert "active_players" in stats
        assert "total_matches" in stats
        assert "superpin_matches" in stats
        assert "rapidpin_matches" in stats
        assert "this_week_matches" in stats
        
        print(f"✓ Stats summary structure is correct: {stats}")
    
    def test_stats_summary_data_types(self):
        """GET /api/pinpanclub/public/stats-summary - Verify data types"""
        response = self.session.get(f"{BASE_URL}/api/pinpanclub/public/stats-summary")
        assert response.status_code == 200
        data = response.json()
        
        stats = data["stats"]
        assert isinstance(stats["active_players"], int)
        assert isinstance(stats["total_matches"], int)
        assert isinstance(stats["superpin_matches"], int)
        assert isinstance(stats["rapidpin_matches"], int)
        assert isinstance(stats["this_week_matches"], int)
        
        print(f"✓ Stats data types are correct (all integers)")


class TestBlockTemplates:
    """Tests for block templates including pinpanclub_feed"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with admin authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@libreria.com", "contrasena": "admin"}
        )
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Admin authentication failed")
    
    def test_block_templates_requires_auth(self):
        """GET /api/admin/block-templates - Requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/admin/block-templates")
        assert response.status_code == 401
        print(f"✓ Block templates requires authentication (401)")
    
    def test_block_templates_includes_pinpanclub_feed(self):
        """GET /api/admin/block-templates - Should include pinpanclub_feed template"""
        response = self.session.get(f"{BASE_URL}/api/admin/block-templates")
        assert response.status_code == 200
        data = response.json()
        
        assert "pinpanclub_feed" in data
        print(f"✓ pinpanclub_feed template is available")
    
    def test_pinpanclub_feed_template_structure(self):
        """GET /api/admin/block-templates - Verify pinpanclub_feed template structure"""
        response = self.session.get(f"{BASE_URL}/api/admin/block-templates")
        assert response.status_code == 200
        data = response.json()
        
        template = data["pinpanclub_feed"]
        
        # Verify template metadata
        assert template["nombre"] == "PinPanClub Activity Feed"
        assert "descripcion" in template
        assert "config_default" in template
        
        config = template["config_default"]
        
        # Verify multilingual titles
        assert "titulo" in config
        assert "es" in config["titulo"]
        assert "en" in config["titulo"]
        assert "zh" in config["titulo"]
        
        # Verify visibility settings
        assert "visibility" in config
        visibility = config["visibility"]
        assert "public" in visibility
        assert "registered" in visibility
        assert "moderator" in visibility
        assert "admin" in visibility
        assert "super_admin" in visibility
        assert "specific_users" in visibility
        
        # Verify sections configuration
        assert "sections" in config
        sections = config["sections"]
        expected_sections = [
            "recent_matches", "leaderboard", "active_challenges",
            "recent_achievements", "active_players", "upcoming_tournaments"
        ]
        for section in expected_sections:
            assert section in sections, f"Missing section: {section}"
            assert "enabled" in sections[section]
            assert "title" in sections[section]
            assert "visibility" in sections[section]
        
        # Verify style options
        assert "style" in config
        style = config["style"]
        assert "background" in style
        assert "card_style" in style
        assert "show_cta" in style
        assert "cta_text" in style
        assert "cta_url" in style
        
        print(f"✓ pinpanclub_feed template structure is complete and correct")
    
    def test_pinpanclub_feed_visibility_defaults(self):
        """GET /api/admin/block-templates - Verify default visibility is public"""
        response = self.session.get(f"{BASE_URL}/api/admin/block-templates")
        assert response.status_code == 200
        data = response.json()
        
        config = data["pinpanclub_feed"]["config_default"]
        
        # Main block visibility should be public by default
        assert config["visibility"]["public"] == True
        
        # All sections should be public by default
        for section_name, section in config["sections"].items():
            assert section["visibility"]["public"] == True, f"Section {section_name} should be public by default"
        
        print(f"✓ All sections have public visibility enabled by default")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
