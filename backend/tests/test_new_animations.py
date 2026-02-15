"""
Test for 10 new animation icon presets - iteration 120
Tests: Backend API for icon statuses with new defaults (10 total)
       Animation options: lantern, dragon, crane, bamboo, fireworks, coding, data_sync, progress_bar, temple, sparkle
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNewAnimationStatuses:
    """Tests for new animation icon presets API"""
    
    def test_public_icon_statuses_returns_10_defaults(self):
        """GET /api/ticker/icon-statuses should return 10 default statuses"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "statuses" in data, "Response should have 'statuses' key"
        statuses = data["statuses"]
        
        # Should have 10 default statuses
        assert len(statuses) >= 10, f"Expected at least 10 statuses, got {len(statuses)}"
        
        # Verify structure of each status
        for status in statuses:
            assert "value" in status, "Status should have 'value'"
            assert "label" in status, "Status should have 'label'"
            assert "color" in status, "Status should have 'color'"
            assert "animation" in status, "Status should have 'animation'"
    
    def test_new_animation_types_present_in_defaults(self):
        """Verify new animation types are in default statuses: lantern, dragon, bamboo, coding, fireworks, progress_bar"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        assert response.status_code == 200
        
        data = response.json()
        statuses = data["statuses"]
        
        # Extract animation values
        animations = [s["animation"] for s in statuses]
        
        # Check new animations are present
        expected_new = ["lantern", "dragon", "bamboo", "coding", "fireworks", "progress_bar"]
        for anim in expected_new:
            assert anim in animations, f"Animation '{anim}' should be in default statuses"
    
    def test_admin_icon_statuses_returns_defaults_field(self):
        """GET /api/admin/ticker/icon-statuses should return defaults field with 10 statuses"""
        response = requests.get(f"{BASE_URL}/api/admin/ticker/icon-statuses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "defaults" in data, "Admin response should have 'defaults' key"
        
        defaults = data["defaults"]
        assert len(defaults) == 10, f"Expected exactly 10 default statuses, got {len(defaults)}"
    
    def test_default_status_lantern_has_correct_animation(self):
        """Lantern status should use 'lantern' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        lantern = next((s for s in data["statuses"] if s["value"] == "lantern"), None)
        assert lantern is not None, "Lantern status should exist"
        assert lantern["animation"] == "lantern", f"Lantern should use 'lantern' animation, got {lantern['animation']}"
        assert lantern["label"] == "Lantern", f"Lantern label should be 'Lantern', got {lantern['label']}"
    
    def test_default_status_dragon_has_correct_animation(self):
        """Dragon status should use 'dragon' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        dragon = next((s for s in data["statuses"] if s["value"] == "dragon"), None)
        assert dragon is not None, "Dragon status should exist"
        assert dragon["animation"] == "dragon", f"Dragon should use 'dragon' animation, got {dragon['animation']}"
    
    def test_default_status_bamboo_has_correct_animation(self):
        """Bamboo status should use 'bamboo' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        bamboo = next((s for s in data["statuses"] if s["value"] == "bamboo"), None)
        assert bamboo is not None, "Bamboo status should exist"
        assert bamboo["animation"] == "bamboo", f"Bamboo should use 'bamboo' animation, got {bamboo['animation']}"
        assert bamboo["label"] == "Growing", f"Bamboo label should be 'Growing', got {bamboo['label']}"
    
    def test_default_status_coding_has_correct_animation(self):
        """Coding status should use 'coding' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        coding = next((s for s in data["statuses"] if s["value"] == "coding"), None)
        assert coding is not None, "Coding status should exist"
        assert coding["animation"] == "coding", f"Coding should use 'coding' animation, got {coding['animation']}"
        assert coding["label"] == "In Development", f"Coding label should be 'In Development', got {coding['label']}"
    
    def test_default_status_fireworks_has_correct_animation(self):
        """Fireworks status should use 'fireworks' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        fireworks = next((s for s in data["statuses"] if s["value"] == "fireworks"), None)
        assert fireworks is not None, "Fireworks status should exist"
        assert fireworks["animation"] == "fireworks", f"Fireworks should use 'fireworks' animation"
        assert fireworks["label"] == "Celebration", f"Fireworks label should be 'Celebration'"
    
    def test_default_status_progress_has_progress_bar_animation(self):
        """Progress status should use 'progress_bar' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        progress = next((s for s in data["statuses"] if s["value"] == "progress"), None)
        assert progress is not None, "Progress status should exist"
        assert progress["animation"] == "progress_bar", f"Progress should use 'progress_bar' animation"
        assert progress["label"] == "In Progress", f"Progress label should be 'In Progress'"
    
    def test_all_statuses_have_hex_color(self):
        """All statuses should have valid hex color codes"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        for status in data["statuses"]:
            color = status.get("color", "")
            assert color.startswith("#"), f"Color should be hex: {status['value']} has {color}"
            assert len(color) == 7, f"Hex color should be 7 chars: {status['value']} has {color}"


class TestLayoutIconsWithAnimations:
    """Test layout icons can use new animation types"""
    
    def test_layout_icons_endpoint_works(self):
        """GET /api/ticker/layout-icons should return icons config"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        assert response.status_code == 200
        
        data = response.json()
        assert "mosaic_community" in data, "Should have mosaic_community layout"
    
    def test_admin_layout_icons_returns_resolved(self):
        """GET /api/admin/ticker/layout-icons should return resolved icons"""
        response = requests.get(f"{BASE_URL}/api/admin/ticker/layout-icons")
        assert response.status_code == 200
        
        data = response.json()
        assert "resolved" in data, "Admin response should have 'resolved' key"


class TestOriginalStatusesStillWork:
    """Verify original statuses are unchanged"""
    
    def test_ready_status_exists(self):
        """Ready status should exist with 'none' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        ready = next((s for s in data["statuses"] if s["value"] == "ready"), None)
        assert ready is not None, "Ready status should exist"
        assert ready["animation"] == "none", "Ready should have 'none' animation"
    
    def test_building_status_exists(self):
        """Building status should exist with 'building_bars' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        building = next((s for s in data["statuses"] if s["value"] == "building"), None)
        assert building is not None, "Building status should exist"
        assert building["animation"] == "building_bars"
    
    def test_coming_soon_status_exists(self):
        """Coming Soon status should exist with 'pulse' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        coming_soon = next((s for s in data["statuses"] if s["value"] == "coming_soon"), None)
        assert coming_soon is not None, "Coming Soon status should exist"
        assert coming_soon["animation"] == "pulse"
    
    def test_maintenance_status_exists(self):
        """Maintenance status should exist with 'wrench' animation"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        data = response.json()
        
        maintenance = next((s for s in data["statuses"] if s["value"] == "maintenance"), None)
        assert maintenance is not None, "Maintenance status should exist"
        assert maintenance["animation"] == "wrench"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
