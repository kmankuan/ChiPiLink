"""
Test suite for new animation features:
- coding_scene and building_progress animation types
- Lottie URL animation support
- Backend icon-statuses API with new default types
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNewAnimationTypes:
    """Test new animation types in icon-statuses API"""
    
    def test_public_icon_statuses_endpoint(self):
        """Test that public icon-statuses endpoint returns statuses"""
        response = requests.get(f"{BASE_URL}/api/ticker/icon-statuses")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "statuses" in data, "Response should contain 'statuses' key"
        assert len(data["statuses"]) > 0, "Should have at least one status"
        print(f"SUCCESS: Public API returns {len(data['statuses'])} statuses")
    
    def test_admin_icon_statuses_returns_defaults(self):
        """Test that admin endpoint returns defaults with new animation types"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.status_code}"
        token = login_response.json().get("token")
        
        # Get admin icon statuses
        response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "defaults" in data, "Response should contain 'defaults' key"
        
        # Check for new animation types in defaults
        defaults = data["defaults"]
        default_values = [s["value"] for s in defaults]
        default_animations = [s["animation"] for s in defaults]
        
        # Verify coding_scene exists in defaults
        assert "coding_scene" in default_values, "coding_scene should be in defaults"
        assert "coding_scene" in default_animations, "coding_scene animation should exist"
        
        # Verify building_progress exists in defaults
        assert "building_progress" in default_values, "building_progress should be in defaults"
        assert "building_progress" in default_animations, "building_progress animation should exist"
        
        print(f"SUCCESS: Admin API defaults contain coding_scene and building_progress")
        print(f"  Defaults: {default_values}")
    
    def test_new_animation_types_have_correct_labels(self):
        """Test that new animation types have correct labels"""
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        defaults = response.json().get("defaults", [])
        
        # Check coding_scene label
        coding_scene = next((s for s in defaults if s["value"] == "coding_scene"), None)
        assert coding_scene is not None, "coding_scene should exist"
        assert coding_scene["label"] == "Person Coding", f"coding_scene label should be 'Person Coding', got '{coding_scene['label']}'"
        assert coding_scene["animation"] == "coding_scene", "coding_scene animation type should match"
        
        # Check building_progress label
        building_progress = next((s for s in defaults if s["value"] == "building_progress"), None)
        assert building_progress is not None, "building_progress should exist"
        assert building_progress["label"] == "Building 0-100%", f"building_progress label should be 'Building 0-100%', got '{building_progress['label']}'"
        assert building_progress["animation"] == "building_progress", "building_progress animation type should match"
        
        print("SUCCESS: New animation types have correct labels")
    
    def test_save_status_with_lottie_url(self):
        """Test saving a status with lottie_url animation type"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        # Get current statuses
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        current_statuses = get_response.json().get("statuses", [])
        
        # Add a new status with lottie_url animation
        test_id = f"lottie_test_{os.urandom(4).hex()}"
        new_status = {
            "value": test_id,
            "label": "Lottie Test Status",
            "color": "#9333ea",
            "animation": "lottie_url",
            "gif_url": "https://assets.lottiefiles.com/packages/lf20_UJNc2t.json"
        }
        
        updated_statuses = current_statuses + [new_status]
        
        # Save
        save_response = requests.put(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"statuses": updated_statuses}
        )
        assert save_response.status_code == 200, f"Expected 200, got {save_response.status_code}"
        
        # Verify saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        saved_statuses = verify_response.json().get("statuses", [])
        lottie_status = next((s for s in saved_statuses if s["value"] == test_id), None)
        
        assert lottie_status is not None, "Lottie status should be saved"
        assert lottie_status["animation"] == "lottie_url", "Animation should be lottie_url"
        assert lottie_status["gif_url"] == "https://assets.lottiefiles.com/packages/lf20_UJNc2t.json", "Lottie URL should be saved"
        
        print(f"SUCCESS: Saved status with lottie_url animation: {test_id}")
    
    def test_save_status_with_coding_scene(self):
        """Test saving a status with coding_scene animation type"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        # Get current statuses
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        current_statuses = get_response.json().get("statuses", [])
        
        # Add a status with coding_scene animation
        test_id = f"coding_scene_test_{os.urandom(4).hex()}"
        new_status = {
            "value": test_id,
            "label": "Coding Scene Test",
            "color": "#8b5cf6",
            "animation": "coding_scene",
            "gif_url": ""
        }
        
        updated_statuses = current_statuses + [new_status]
        
        # Save
        save_response = requests.put(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"statuses": updated_statuses}
        )
        assert save_response.status_code == 200, f"Expected 200, got {save_response.status_code}"
        
        # Verify saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        saved_statuses = verify_response.json().get("statuses", [])
        coding_status = next((s for s in saved_statuses if s["value"] == test_id), None)
        
        assert coding_status is not None, "Coding scene status should be saved"
        assert coding_status["animation"] == "coding_scene", "Animation should be coding_scene"
        
        print(f"SUCCESS: Saved status with coding_scene animation: {test_id}")
    
    def test_save_status_with_building_progress(self):
        """Test saving a status with building_progress animation type"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        # Get current statuses
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        current_statuses = get_response.json().get("statuses", [])
        
        # Add a status with building_progress animation
        test_id = f"building_progress_test_{os.urandom(4).hex()}"
        new_status = {
            "value": test_id,
            "label": "Building Progress Test",
            "color": "#d97706",
            "animation": "building_progress",
            "gif_url": ""
        }
        
        updated_statuses = current_statuses + [new_status]
        
        # Save
        save_response = requests.put(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            json={"statuses": updated_statuses}
        )
        assert save_response.status_code == 200, f"Expected 200, got {save_response.status_code}"
        
        # Verify saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        saved_statuses = verify_response.json().get("statuses", [])
        building_status = next((s for s in saved_statuses if s["value"] == test_id), None)
        
        assert building_status is not None, "Building progress status should be saved"
        assert building_status["animation"] == "building_progress", "Animation should be building_progress"
        
        print(f"SUCCESS: Saved status with building_progress animation: {test_id}")


class TestLayoutIconsWithNewAnimations:
    """Test layout icons can use new animation types"""
    
    def test_get_layout_icons(self):
        """Test that layout icons API works"""
        response = requests.get(f"{BASE_URL}/api/ticker/layout-icons")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "mosaic_community" in data, "Should have mosaic_community layout"
        print(f"SUCCESS: Got layout icons for {len(data)} layouts")
    
    def test_update_layout_icon_with_coding_scene_animation(self):
        """Test updating a layout icon to use coding_scene animation"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        # Get current icons
        get_response = requests.get(
            f"{BASE_URL}/api/admin/ticker/layout-icons",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        icons = data.get("resolved", {}).get("mosaic_community", [])
        
        if len(icons) > 0:
            # Update first icon to use coding_scene animation
            icons[0]["status_animation"] = "coding_scene"
            icons[0]["status"] = "coding_scene"
            
            # Save
            save_response = requests.put(
                f"{BASE_URL}/api/admin/ticker/layout-icons/mosaic_community",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json={"icons": icons}
            )
            assert save_response.status_code == 200, f"Expected 200, got {save_response.status_code}"
            print("SUCCESS: Updated layout icon with coding_scene animation")
        else:
            pytest.skip("No icons to update in mosaic_community layout")


class TestExistingIconStatusesPresent:
    """Verify existing icon statuses from DEFAULT_ICON_STATUSES are present"""
    
    def test_existing_default_statuses(self):
        """Test that original default statuses are present"""
        # Login
        login_response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        token = login_response.json().get("token")
        
        response = requests.get(
            f"{BASE_URL}/api/admin/ticker/icon-statuses",
            headers={"Authorization": f"Bearer {token}"}
        )
        defaults = response.json().get("defaults", [])
        default_values = [s["value"] for s in defaults]
        
        # Check original statuses
        required_statuses = ["ready", "building", "coming_soon", "maintenance"]
        for status in required_statuses:
            assert status in default_values, f"{status} should be in defaults"
        
        # Check cultural/construction statuses
        cultural_statuses = ["lantern", "dragon", "bamboo", "coding", "fireworks", "progress"]
        for status in cultural_statuses:
            assert status in default_values, f"{status} should be in defaults"
        
        # Check new scene-based statuses
        assert "coding_scene" in default_values, "coding_scene should be in defaults"
        assert "building_progress" in default_values, "building_progress should be in defaults"
        
        print(f"SUCCESS: All expected default statuses present: {len(defaults)} total")
        print(f"  Original: {required_statuses}")
        print(f"  Cultural: {cultural_statuses}")
        print(f"  New scenes: ['coding_scene', 'building_progress']")
