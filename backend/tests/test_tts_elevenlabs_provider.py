"""
Test TTS dual-provider feature: OpenAI + ElevenLabs
Tests the new endpoints and settings for ElevenLabs provider.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTTSProviders:
    """Test TTS providers endpoint - both OpenAI and ElevenLabs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_providers_returns_both(self):
        """GET /api/admin/tts/providers returns both openai and elevenlabs"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/providers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "openai" in data, "Missing openai provider"
        assert "elevenlabs" in data, "Missing elevenlabs provider"
        
        # OpenAI should be available (has EMERGENT_LLM_KEY)
        assert data["openai"]["available"] == True, "OpenAI should be available"
        assert data["openai"]["name"] == "OpenAI"
        
        # ElevenLabs should NOT be available (no ELEVENLABS_API_KEY)
        assert data["elevenlabs"]["available"] == False, "ElevenLabs should NOT be available (no API key)"
        assert data["elevenlabs"]["name"] == "ElevenLabs"
    
    def test_providers_requires_auth(self):
        """GET /api/admin/tts/providers requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/providers")
        assert response.status_code == 401


class TestTTSSettings:
    """Test TTS settings with new provider and ElevenLabs fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_settings_has_provider_field(self):
        """GET /api/admin/tts/settings returns provider field with default=openai"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "provider" in data, "Missing provider field in settings"
        # Default should be openai
        assert data["provider"] in ["openai", "elevenlabs"], "Provider should be openai or elevenlabs"
    
    def test_settings_has_elevenlabs_fields(self):
        """GET /api/admin/tts/settings returns ElevenLabs-specific fields"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "elevenlabs_voice_id" in data, "Missing elevenlabs_voice_id field"
        assert "elevenlabs_stability" in data, "Missing elevenlabs_stability field"
        assert "elevenlabs_similarity" in data, "Missing elevenlabs_similarity field"
        
        # Check default values
        assert isinstance(data["elevenlabs_stability"], (int, float))
        assert isinstance(data["elevenlabs_similarity"], (int, float))
        assert 0 <= data["elevenlabs_stability"] <= 1
        assert 0 <= data["elevenlabs_similarity"] <= 1
    
    def test_update_provider_to_elevenlabs(self):
        """PUT /api/admin/tts/settings can update provider to elevenlabs"""
        # First get current settings
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        current_settings = response.json()
        
        # Update to elevenlabs
        update_payload = {**current_settings, "provider": "elevenlabs"}
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "elevenlabs", "Provider should be updated to elevenlabs"
    
    def test_update_provider_back_to_openai(self):
        """PUT /api/admin/tts/settings can update provider back to openai"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        current_settings = response.json()
        
        # Update back to openai
        update_payload = {**current_settings, "provider": "openai"}
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        data = response.json()
        assert data["provider"] == "openai", "Provider should be updated back to openai"
    
    def test_update_elevenlabs_settings(self):
        """PUT /api/admin/tts/settings can update ElevenLabs-specific settings"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        current_settings = response.json()
        
        # Update ElevenLabs settings
        update_payload = {
            **current_settings,
            "elevenlabs_voice_id": "TxGEqnHWrfWFTfGW9XjX",  # Josh voice
            "elevenlabs_stability": 0.7,
            "elevenlabs_similarity": 0.85
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers=self.headers,
            json=update_payload
        )
        assert response.status_code == 200
        
        # Verify update persisted
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        data = response.json()
        assert data["elevenlabs_voice_id"] == "TxGEqnHWrfWFTfGW9XjX"
        assert data["elevenlabs_stability"] == 0.7
        assert data["elevenlabs_similarity"] == 0.85


class TestElevenLabsVoices:
    """Test ElevenLabs voices endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_get_elevenlabs_voices_returns_defaults(self):
        """GET /api/admin/tts/elevenlabs/voices returns default voices when no API key"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/elevenlabs/voices", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "voices" in data, "Missing voices array"
        assert len(data["voices"]) > 0, "Should return default voices"
        
        # Check voice structure
        first_voice = data["voices"][0]
        assert "id" in first_voice, "Voice should have id"
        assert "name" in first_voice, "Voice should have name"
        assert "label" in first_voice, "Voice should have label"
    
    def test_elevenlabs_default_voices_content(self):
        """GET /api/admin/tts/elevenlabs/voices returns expected default voices"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/elevenlabs/voices", headers=self.headers)
        data = response.json()
        
        # Check for some expected default voices
        voice_names = [v["name"] for v in data["voices"]]
        expected_voices = ["Rachel", "Domi", "Bella", "Antoni", "Josh", "Adam"]
        
        for expected in expected_voices:
            assert expected in voice_names, f"Missing expected default voice: {expected}"
    
    def test_elevenlabs_voices_requires_auth(self):
        """GET /api/admin/tts/elevenlabs/voices requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/elevenlabs/voices")
        assert response.status_code == 401


class TestTTSSpeak:
    """Test TTS speak endpoint with dual providers"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_speak_with_openai_provider(self):
        """POST /api/admin/tts/speak with provider=openai works correctly"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers=self.headers,
            json={
                "text": "Test with OpenAI provider",
                "provider": "openai",
                "voice": "nova"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "audio" in data, "Response should contain audio"
        assert data["format"] == "mp3", "Audio format should be mp3"
        assert data["provider"] == "openai", "Provider should be openai"
        assert len(data["audio"]) > 100, "Audio should be non-empty base64"
    
    def test_speak_with_elevenlabs_fails_gracefully(self):
        """POST /api/admin/tts/speak with provider=elevenlabs returns 500 (no key)"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers=self.headers,
            json={
                "text": "Test with ElevenLabs provider",
                "provider": "elevenlabs",
                "voice_id": "21m00Tcm4TlvDq8ikWAM"
            }
        )
        # Should return 500 because no ELEVENLABS_API_KEY
        assert response.status_code == 500, f"Expected 500 for missing ElevenLabs key, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Should have error detail"
    
    def test_speak_default_provider_uses_settings(self):
        """POST /api/admin/tts/speak uses provider from settings when not specified"""
        # First ensure settings have openai as provider
        settings_response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        current_settings = settings_response.json()
        
        # Update to openai
        requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers=self.headers,
            json={**current_settings, "provider": "openai"}
        )
        
        # Now call speak without provider param
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers=self.headers,
            json={"text": "Testing default provider from settings"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["provider"] == "openai", "Should use provider from settings"
    
    def test_speak_requires_text(self):
        """POST /api/admin/tts/speak requires text parameter"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            headers=self.headers,
            json={"provider": "openai"}
        )
        assert response.status_code == 400
    
    def test_speak_requires_auth(self):
        """POST /api/admin/tts/speak requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/admin/tts/speak",
            json={"text": "Test", "provider": "openai"}
        )
        assert response.status_code == 401


# Reset settings to default after tests
class TestCleanup:
    """Reset TTS settings to default after tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_reset_provider_to_openai(self):
        """Reset provider to openai after tests"""
        response = requests.get(f"{BASE_URL}/api/admin/tts/settings", headers=self.headers)
        current_settings = response.json()
        
        # Reset to openai
        reset_payload = {
            **current_settings,
            "provider": "openai",
            "elevenlabs_voice_id": "21m00Tcm4TlvDq8ikWAM",
            "elevenlabs_stability": 0.5,
            "elevenlabs_similarity": 0.75
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/tts/settings",
            headers=self.headers,
            json=reset_payload
        )
        assert response.status_code == 200
