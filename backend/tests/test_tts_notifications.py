"""
Tests for TTS (Text-to-Speech) Notifications API
Tests POST /api/admin/tts/speak, GET /api/admin/tts/settings, PUT /api/admin/tts/settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": "admin@chipi.co", "password": "admin"}
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


class TestTTSSettings:
    """Test TTS Settings API endpoints"""
    
    def test_get_tts_settings_returns_defaults(self, admin_token):
        """GET /api/admin/tts/settings returns default settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify default settings structure
        assert "enabled" in data, "Missing 'enabled' in settings"
        assert "voice" in data, "Missing 'voice' in settings"
        assert "speed" in data, "Missing 'speed' in settings"
        assert "language" in data, "Missing 'language' in settings"
        assert "enabled_events" in data, "Missing 'enabled_events' in settings"
        assert "volume" in data, "Missing 'volume' in settings"
        
        # Verify default values
        assert data["enabled"] == True, "Expected enabled=True by default"
        assert data["voice"] == "nova", f"Expected voice='nova', got {data['voice']}"
        assert data["speed"] == 1.0, f"Expected speed=1.0, got {data['speed']}"
        assert data["language"] == "es", f"Expected language='es', got {data['language']}"
        
        # Verify enabled_events contains expected events
        expected_events = [
            "order_submitted", "access_request", "access_request_approved",
            "access_request_rejected", "access_request_updated",
            "user_registered", "wallet_topup", "crm_message",
            "order_status_changed",
        ]
        for event in expected_events:
            assert event in data["enabled_events"], f"Missing event '{event}' in enabled_events"
        
        print(f"TTS settings retrieved successfully: {data}")
    
    def test_get_tts_settings_requires_auth(self):
        """GET /api/admin/tts/settings requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings")
        
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"Correctly rejected unauthenticated request: {response.status_code}")
    
    def test_update_tts_settings_voice(self, admin_token):
        """PUT /api/admin/tts/settings updates voice setting"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        current_settings = get_response.json()
        
        # Update voice to 'alloy'
        new_settings = {**current_settings, "voice": "alloy"}
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json=new_settings
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["voice"] == "alloy", f"Voice not updated, got {updated_settings['voice']}"
        
        # Restore original setting
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={**new_settings, "voice": "nova"}
        )
        
        print("Successfully updated and verified voice setting")
    
    def test_update_tts_settings_language(self, admin_token):
        """PUT /api/admin/tts/settings updates language setting"""
        # Update language to 'en'
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"language": "en"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify the change was persisted
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["language"] == "en", f"Language not updated, got {updated_settings['language']}"
        
        # Restore to Spanish
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"language": "es"}
        )
        
        print("Successfully updated and verified language setting")
    
    def test_update_tts_settings_speed(self, admin_token):
        """PUT /api/admin/tts/settings updates speed setting"""
        # Update speed to 1.5
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"speed": 1.5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["speed"] == 1.5, f"Speed not updated, got {updated_settings['speed']}"
        
        # Restore to 1.0
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"speed": 1.0}
        )
        
        print("Successfully updated and verified speed setting")
    
    def test_update_tts_settings_volume(self, admin_token):
        """PUT /api/admin/tts/settings updates volume setting"""
        # Update volume to 0.5
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"volume": 0.5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["volume"] == 0.5, f"Volume not updated, got {updated_settings['volume']}"
        
        # Restore to 0.8
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"volume": 0.8}
        )
        
        print("Successfully updated and verified volume setting")
    
    def test_update_tts_settings_enabled(self, admin_token):
        """PUT /api/admin/tts/settings updates enabled setting"""
        # Disable TTS
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"enabled": False}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["enabled"] == False, f"Enabled not updated, got {updated_settings['enabled']}"
        
        # Re-enable
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"enabled": True}
        )
        
        print("Successfully toggled enabled setting")
    
    def test_update_tts_settings_enabled_events(self, admin_token):
        """PUT /api/admin/tts/settings updates enabled_events list"""
        # Update to only a few events
        limited_events = ["order_submitted", "access_request"]
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"enabled_events": limited_events}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Verify
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        updated_settings = verify_response.json()
        assert updated_settings["enabled_events"] == limited_events, f"enabled_events not updated"
        
        # Restore full list
        full_events = [
            "order_submitted", "access_request", "access_request_approved",
            "access_request_rejected", "access_request_updated",
            "user_registered", "wallet_topup", "crm_message",
            "order_status_changed",
        ]
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"enabled_events": full_events}
        )
        
        print("Successfully updated and verified enabled_events")


class TestTTSSpeak:
    """Test TTS Speak API endpoint"""
    
    def test_tts_speak_generates_audio(self, admin_token):
        """POST /api/admin/tts/speak generates base64 audio from text"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"text": "Hello, this is a test notification."}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "audio" in data, "Missing 'audio' in response"
        assert "format" in data, "Missing 'format' in response"
        assert data["format"] == "mp3", f"Expected format='mp3', got {data['format']}"
        
        # Verify audio is base64 string
        audio = data["audio"]
        assert isinstance(audio, str), "Audio should be a string"
        assert len(audio) > 100, "Audio base64 seems too short"
        
        print(f"TTS speak generated audio successfully ({len(audio)} chars)")
    
    def test_tts_speak_with_custom_voice(self, admin_token):
        """POST /api/admin/tts/speak works with custom voice parameter"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "text": "Test with alloy voice",
                "voice": "alloy"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "audio" in data
        assert len(data["audio"]) > 100
        
        print("TTS speak with custom voice successful")
    
    def test_tts_speak_with_custom_speed(self, admin_token):
        """POST /api/admin/tts/speak works with custom speed parameter"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "text": "Test with fast speed",
                "speed": 1.5
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "audio" in data
        assert len(data["audio"]) > 100
        
        print("TTS speak with custom speed successful")
    
    def test_tts_speak_spanish_text(self, admin_token):
        """POST /api/admin/tts/speak works with Spanish text"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"text": "Notificacion de prueba. El sistema de voz funciona correctamente."}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "audio" in data
        
        print("TTS speak with Spanish text successful")
    
    def test_tts_speak_requires_text(self, admin_token):
        """POST /api/admin/tts/speak requires text parameter"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("TTS speak correctly rejected empty text")
    
    def test_tts_speak_requires_auth(self):
        """POST /api/admin/tts/speak requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={"Content-Type": "application/json"},
            json={"text": "Unauthorized test"}
        )
        
        assert response.status_code in [401, 403, 422], f"Expected 401/403/422, got {response.status_code}"
        print(f"TTS speak correctly rejected unauthenticated request: {response.status_code}")
    
    def test_tts_caching_same_text(self, admin_token):
        """POST /api/admin/tts/speak caches audio for same text"""
        text = "This is a caching test notification"
        
        # First request
        response1 = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"text": text}
        )
        
        assert response1.status_code == 200
        audio1 = response1.json()["audio"]
        
        # Second request (should be cached)
        response2 = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={"text": text}
        )
        
        assert response2.status_code == 200
        audio2 = response2.json()["audio"]
        
        # Both should return the same audio (cached)
        assert audio1 == audio2, "Cached audio should be identical"
        
        print("TTS caching verified - same text returns cached audio")


class TestTTSVoices:
    """Test all available OpenAI voices"""
    
    @pytest.mark.parametrize("voice", [
        "nova", "coral", "alloy", "shimmer", "echo", "onyx", "fable", "sage", "ash"
    ])
    def test_tts_voice_options(self, admin_token, voice):
        """POST /api/admin/tts/speak works with each available voice"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            json={
                "text": f"Test with {voice} voice",
                "voice": voice
            }
        )
        
        assert response.status_code == 200, f"Voice '{voice}' failed: {response.status_code}: {response.text}"
        
        data = response.json()
        assert "audio" in data
        
        print(f"Voice '{voice}' works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
