"""
Ticker Module Tests — Activity feed + Sponsor banner system
Tests: Public feed, Admin config, Sponsor CRUD
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://player-enhance-1.preview.emergentagent.com').rstrip('/')


class TestTickerPublicFeed:
    """Tests for GET /api/ticker/feed — public endpoint"""

    def test_feed_returns_200(self):
        """Feed endpoint should return 200"""
        res = requests.get(f"{BASE_URL}/api/ticker/feed")
        assert res.status_code == 200
        print(f"PASS: GET /api/ticker/feed returned 200")

    def test_feed_structure(self):
        """Feed should have enabled, activities, sponsors, config fields"""
        res = requests.get(f"{BASE_URL}/api/ticker/feed")
        data = res.json()
        assert "enabled" in data
        assert "activities" in data
        assert "sponsors" in data
        assert "config" in data
        print(f"PASS: Feed has required fields: enabled, activities, sponsors, config")

    def test_feed_config_has_style(self):
        """Feed config should include style settings"""
        res = requests.get(f"{BASE_URL}/api/ticker/feed")
        data = res.json()
        config = data.get("config", {})
        assert "style" in config
        assert "rotation_interval_ms" in config
        assert "pause_on_hover" in config
        assert "sponsor_frequency" in config
        print(f"PASS: Feed config has style, rotation_interval_ms, pause_on_hover, sponsor_frequency")

    def test_feed_has_real_activities(self):
        """Feed should return real activities from MongoDB"""
        res = requests.get(f"{BASE_URL}/api/ticker/feed")
        data = res.json()
        activities = data.get("activities", [])
        assert len(activities) > 0, "Expected at least 1 activity"
        # Check activity structure
        activity = activities[0]
        assert "type" in activity
        assert "text" in activity
        assert "icon" in activity
        assert "color" in activity
        print(f"PASS: Feed has {len(activities)} real activities with proper structure")

    def test_feed_activity_types(self):
        """Activities should have valid types from MongoDB data sources"""
        res = requests.get(f"{BASE_URL}/api/ticker/feed")
        data = res.json()
        activities = data.get("activities", [])
        valid_types = {"match", "new_user", "order", "community", "transaction", "custom"}
        for activity in activities:
            assert activity.get("type") in valid_types, f"Invalid type: {activity.get('type')}"
        print(f"PASS: All activity types are valid: {set(a.get('type') for a in activities)}")


class TestTickerAdminConfig:
    """Tests for admin ticker config endpoints"""

    def test_get_config_returns_200(self):
        """GET /api/admin/ticker/config should return 200"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        assert res.status_code == 200
        print(f"PASS: GET /api/admin/ticker/config returned 200")

    def test_config_structure(self):
        """Config should have all expected fields"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        data = res.json()
        required_fields = ["enabled", "rotation_interval_ms", "pause_on_hover", 
                          "sponsor_frequency", "max_activities", "show_on_pages", 
                          "hide_on_pages", "activity_sources", "sponsors", "style"]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        print(f"PASS: Config has all required fields")

    def test_config_activity_sources(self):
        """Config should have all activity sources"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        data = res.json()
        sources = data.get("activity_sources", {})
        expected_sources = ["matches", "new_users", "orders", "community", "transactions", "custom"]
        for source in expected_sources:
            assert source in sources, f"Missing source: {source}"
        print(f"PASS: Config has all activity sources: {list(sources.keys())}")

    def test_config_style_settings(self):
        """Config style should have color and size settings"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        data = res.json()
        style = data.get("style", {})
        assert "bg_color" in style
        assert "text_color" in style
        assert "accent_color" in style
        assert "height_px" in style
        print(f"PASS: Style has colors (bg: {style.get('bg_color')}, text: {style.get('text_color')})")

    def test_update_config_partial(self):
        """PUT /api/admin/ticker/config should do partial update"""
        # Get current config
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        original = res.json()
        original_interval = original.get("rotation_interval_ms", 4000)
        
        # Update rotation interval
        new_interval = 5000 if original_interval != 5000 else 4000
        res = requests.put(f"{BASE_URL}/api/admin/ticker/config", json={"rotation_interval_ms": new_interval})
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "ok"
        assert data.get("config", {}).get("rotation_interval_ms") == new_interval
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/ticker/config", json={"rotation_interval_ms": original_interval})
        print(f"PASS: PUT config partial update works (changed interval to {new_interval}, restored to {original_interval})")

    def test_update_config_deep_merge_style(self):
        """PUT config should deep merge style settings"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        original_style = res.json().get("style", {})
        
        # Update only bg_color
        res = requests.put(f"{BASE_URL}/api/admin/ticker/config", json={"style": {"bg_color": "#222222"}})
        assert res.status_code == 200
        updated_style = res.json().get("config", {}).get("style", {})
        
        # Other style fields should be preserved
        assert updated_style.get("text_color") == original_style.get("text_color")
        assert updated_style.get("accent_color") == original_style.get("accent_color")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/ticker/config", json={"style": original_style})
        print(f"PASS: PUT config deep merges style settings")


class TestTickerSponsorCRUD:
    """Tests for sponsor CRUD endpoints"""
    created_sponsor_id = None

    def test_create_sponsor(self):
        """POST /api/admin/ticker/sponsors should create new sponsor"""
        res = requests.post(f"{BASE_URL}/api/admin/ticker/sponsors", json={
            "name": "TEST_Sponsor",
            "label": "Test Sponsor Banner!",
            "link_url": "https://example.com/test",
            "bg_color": "#FF5500",
            "active": True
        })
        assert res.status_code == 200
        data = res.json()
        assert data.get("status") == "ok"
        sponsor = data.get("sponsor", {})
        assert sponsor.get("name") == "TEST_Sponsor"
        assert sponsor.get("label") == "Test Sponsor Banner!"
        assert "id" in sponsor
        TestTickerSponsorCRUD.created_sponsor_id = sponsor.get("id")
        print(f"PASS: Created sponsor with id: {TestTickerSponsorCRUD.created_sponsor_id}")

    def test_sponsor_appears_in_config(self):
        """Created sponsor should appear in config"""
        if not TestTickerSponsorCRUD.created_sponsor_id:
            pytest.skip("No sponsor created")
        
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        sponsors = res.json().get("sponsors", [])
        sponsor_ids = [s.get("id") for s in sponsors]
        assert TestTickerSponsorCRUD.created_sponsor_id in sponsor_ids
        print(f"PASS: Sponsor {TestTickerSponsorCRUD.created_sponsor_id} appears in config")

    def test_update_sponsor(self):
        """PUT /api/admin/ticker/sponsors/{id} should update sponsor"""
        if not TestTickerSponsorCRUD.created_sponsor_id:
            pytest.skip("No sponsor created")
        
        sponsor_id = TestTickerSponsorCRUD.created_sponsor_id
        res = requests.put(f"{BASE_URL}/api/admin/ticker/sponsors/{sponsor_id}", json={
            "label": "Updated Test Banner!"
        })
        assert res.status_code == 200
        assert res.json().get("status") == "ok"
        
        # Verify update
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        sponsors = res.json().get("sponsors", [])
        updated_sponsor = next((s for s in sponsors if s.get("id") == sponsor_id), None)
        assert updated_sponsor is not None
        assert updated_sponsor.get("label") == "Updated Test Banner!"
        print(f"PASS: Updated sponsor label to 'Updated Test Banner!'")

    def test_update_nonexistent_sponsor_returns_404(self):
        """PUT non-existent sponsor should return 404"""
        res = requests.put(f"{BASE_URL}/api/admin/ticker/sponsors/nonexistent123", json={
            "label": "Test"
        })
        assert res.status_code == 404
        print(f"PASS: PUT non-existent sponsor returns 404")

    def test_delete_sponsor(self):
        """DELETE /api/admin/ticker/sponsors/{id} should remove sponsor"""
        if not TestTickerSponsorCRUD.created_sponsor_id:
            pytest.skip("No sponsor created")
        
        sponsor_id = TestTickerSponsorCRUD.created_sponsor_id
        res = requests.delete(f"{BASE_URL}/api/admin/ticker/sponsors/{sponsor_id}")
        assert res.status_code == 200
        assert res.json().get("status") == "ok"
        
        # Verify deletion
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        sponsors = res.json().get("sponsors", [])
        sponsor_ids = [s.get("id") for s in sponsors]
        assert sponsor_id not in sponsor_ids
        print(f"PASS: Deleted sponsor {sponsor_id}")


class TestTickerActivitySources:
    """Tests for activity source toggle functionality"""

    def test_toggle_activity_source(self):
        """Should be able to enable/disable activity sources"""
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        original = res.json()
        original_enabled = original.get("activity_sources", {}).get("transactions", {}).get("enabled", False)
        
        # Toggle transactions (usually disabled by default)
        new_enabled = not original_enabled
        res = requests.put(f"{BASE_URL}/api/admin/ticker/config", json={
            "activity_sources": {
                "transactions": {"enabled": new_enabled}
            }
        })
        assert res.status_code == 200
        updated_sources = res.json().get("config", {}).get("activity_sources", {})
        assert updated_sources.get("transactions", {}).get("enabled") == new_enabled
        
        # Restore
        requests.put(f"{BASE_URL}/api/admin/ticker/config", json={
            "activity_sources": {
                "transactions": {"enabled": original_enabled}
            }
        })
        print(f"PASS: Toggled transactions source from {original_enabled} to {new_enabled}")


# Cleanup after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup(request):
    """Clean up any TEST_ prefixed sponsors after tests"""
    def clean():
        res = requests.get(f"{BASE_URL}/api/admin/ticker/config")
        if res.status_code == 200:
            sponsors = res.json().get("sponsors", [])
            for sponsor in sponsors:
                if sponsor.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/ticker/sponsors/{sponsor.get('id')}")
                    print(f"Cleaned up sponsor: {sponsor.get('name')}")
    request.addfinalizer(clean)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
