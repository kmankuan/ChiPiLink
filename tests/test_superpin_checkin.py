"""
Test Suite for Super Pin Check-in Feature (P1)
Tests:
1. Check-in endpoint POST /api/pinpanclub/superpin/leagues/{liga_id}/checkin
2. Check-out endpoint POST /api/pinpanclub/superpin/leagues/{liga_id}/checkout
3. Available players endpoint GET /api/pinpanclub/superpin/leagues/{liga_id}/available-players
4. i18n translations verification
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data from context
ACTIVE_LEAGUE_ID = "liga_01bc717ff842"  # Liga Demo 2025 - active
PLAYER_CARLOS_ID = "jugador_carlos_01"
PLAYER_MARIA_ID = "jugador_maria_01"

class TestCheckInEndpoints:
    """Test check-in/checkout API endpoints"""
    
    def test_get_available_players_endpoint(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id}/available-players"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/available-players")
        print(f"Available players response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Available players count: {len(data)}")
    
    def test_get_league_detail(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id} - verify checkin_config"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}")
        print(f"League detail response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get('estado') == 'active', f"League should be active, got {data.get('estado')}"
        
        # Check checkin_config exists
        checkin_config = data.get('checkin_config', {})
        print(f"Check-in config: {checkin_config}")
        
        # Verify methods are configured
        methods = checkin_config.get('methods', [])
        print(f"Configured check-in methods: {methods}")
        assert isinstance(methods, list), "methods should be a list"
    
    def test_get_players_list(self):
        """Test GET /api/pinpanclub/players - get available players"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        print(f"Players list response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total players: {len(data)}")
        
        # Find Carlos and Maria
        player_ids = [p.get('jugador_id') for p in data]
        print(f"Player IDs: {player_ids}")
    
    def test_checkin_manual_method(self):
        """Test POST /api/pinpanclub/superpin/leagues/{liga_id}/checkin with manual method"""
        # First get players to find a valid player ID
        players_response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        players = players_response.json()
        
        if not players:
            pytest.skip("No players available for check-in test")
        
        player_id = players[0].get('jugador_id')
        print(f"Testing check-in for player: {player_id}")
        
        # Perform check-in
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/checkin",
            params={
                "jugador_id": player_id,
                "method": "manual"
            }
        )
        print(f"Check-in response: {response.status_code}")
        print(f"Check-in response body: {response.text[:500]}")
        
        # Accept 200 (success) or 400 (already checked in)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert 'checkin_id' in data or 'jugador_id' in data, "Response should contain checkin data"
            print(f"Check-in successful: {data}")
    
    def test_checkout_endpoint(self):
        """Test POST /api/pinpanclub/superpin/leagues/{liga_id}/checkout"""
        # First get players
        players_response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        players = players_response.json()
        
        if not players:
            pytest.skip("No players available for checkout test")
        
        player_id = players[0].get('jugador_id')
        print(f"Testing checkout for player: {player_id}")
        
        # Perform checkout
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/checkout",
            params={"jugador_id": player_id}
        )
        print(f"Checkout response: {response.status_code}")
        print(f"Checkout response body: {response.text[:500]}")
        
        # Accept 200 (success) or 404 (not checked in)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert 'success' in data, "Response should contain success field"
            print(f"Checkout result: {data}")
    
    def test_checkin_qr_method(self):
        """Test POST /api/pinpanclub/superpin/leagues/{liga_id}/checkin with QR code method"""
        players_response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        players = players_response.json()
        
        if not players:
            pytest.skip("No players available for QR check-in test")
        
        player_id = players[0].get('jugador_id')
        qr_code = f"SUPERPIN_CHECKIN:{ACTIVE_LEAGUE_ID}:{player_id}"
        
        print(f"Testing QR check-in for player: {player_id}")
        print(f"QR code: {qr_code}")
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/checkin",
            params={
                "jugador_id": player_id,
                "method": "qr_code",
                "qr_code": qr_code
            }
        )
        print(f"QR Check-in response: {response.status_code}")
        print(f"QR Check-in response body: {response.text[:500]}")
        
        # Accept 200 (success) or 400 (already checked in)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
    
    def test_checkin_geolocation_without_coords(self):
        """Test geolocation check-in fails without coordinates"""
        players_response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        players = players_response.json()
        
        if not players:
            pytest.skip("No players available for geo check-in test")
        
        player_id = players[0].get('jugador_id')
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/checkin",
            params={
                "jugador_id": player_id,
                "method": "geolocation"
            }
        )
        print(f"Geo check-in without coords response: {response.status_code}")
        
        # Should fail with 400 because coordinates are required
        assert response.status_code == 400, f"Expected 400 for missing coordinates, got {response.status_code}"
    
    def test_checkin_geolocation_with_coords(self):
        """Test geolocation check-in with coordinates"""
        players_response = requests.get(f"{BASE_URL}/api/pinpanclub/players")
        players = players_response.json()
        
        if not players:
            pytest.skip("No players available for geo check-in test")
        
        player_id = players[0].get('jugador_id')
        
        # Use some test coordinates (Panama City area)
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/checkin",
            params={
                "jugador_id": player_id,
                "method": "geolocation",
                "latitude": 9.0,
                "longitude": -79.5
            }
        )
        print(f"Geo check-in with coords response: {response.status_code}")
        print(f"Geo check-in response body: {response.text[:500]}")
        
        # Accept 200 (success), 400 (already checked in or out of range)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"


class TestLeagueMatchesEndpoints:
    """Test league matches endpoints"""
    
    def test_get_league_matches(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id}/matches"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/matches",
            params={"limit": 20}
        )
        print(f"League matches response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total matches: {len(data)}")
    
    def test_get_league_ranking(self):
        """Test GET /api/pinpanclub/superpin/leagues/{liga_id}/ranking"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/superpin/leagues/{ACTIVE_LEAGUE_ID}/ranking")
        print(f"League ranking response: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Ranking data: {data}")


class TestI18nTranslations:
    """Test i18n translation files have required keys"""
    
    def test_es_translations_checkin(self):
        """Verify Spanish translations have superpin.checkin keys"""
        import json
        with open('/app/frontend/src/i18n/locales/es.json', 'r') as f:
            es = json.load(f)
        
        checkin = es.get('superpin', {}).get('checkin', {})
        required_keys = ['title', 'method', 'checkIn', 'checkOut', 'presentPlayers', 
                        'noPlayersCheckedIn', 'scanQrInstructions', 'selectForQr',
                        'confirmQr', 'geoInstructions', 'gettingLocation', 
                        'locationVerified', 'locationError', 'verifyAndCheckIn']
        
        for key in required_keys:
            assert key in checkin, f"Missing Spanish translation: superpin.checkin.{key}"
            print(f"ES superpin.checkin.{key}: {checkin[key]}")
    
    def test_en_translations_checkin(self):
        """Verify English translations have superpin.checkin keys"""
        import json
        with open('/app/frontend/src/i18n/locales/en.json', 'r') as f:
            en = json.load(f)
        
        checkin = en.get('superpin', {}).get('checkin', {})
        required_keys = ['title', 'method', 'checkIn', 'checkOut', 'presentPlayers', 
                        'noPlayersCheckedIn', 'scanQrInstructions', 'selectForQr',
                        'confirmQr', 'geoInstructions', 'gettingLocation', 
                        'locationVerified', 'locationError', 'verifyAndCheckIn']
        
        for key in required_keys:
            assert key in checkin, f"Missing English translation: superpin.checkin.{key}"
            print(f"EN superpin.checkin.{key}: {checkin[key]}")
    
    def test_zh_translations_checkin(self):
        """Verify Chinese translations have superpin.checkin keys"""
        import json
        with open('/app/frontend/src/i18n/locales/zh.json', 'r') as f:
            zh = json.load(f)
        
        checkin = zh.get('superpin', {}).get('checkin', {})
        required_keys = ['title', 'method', 'checkIn', 'checkOut', 'presentPlayers', 
                        'noPlayersCheckedIn', 'scanQrInstructions', 'selectForQr',
                        'confirmQr', 'geoInstructions', 'gettingLocation', 
                        'locationVerified', 'locationError', 'verifyAndCheckIn']
        
        for key in required_keys:
            assert key in checkin, f"Missing Chinese translation: superpin.checkin.{key}"
            print(f"ZH superpin.checkin.{key}: {checkin[key]}")
    
    def test_superpin_match_translations(self):
        """Verify SuperPinMatch.jsx translations exist in all languages"""
        import json
        
        # Load all translation files
        with open('/app/frontend/src/i18n/locales/es.json', 'r') as f:
            es = json.load(f)
        with open('/app/frontend/src/i18n/locales/en.json', 'r') as f:
            en = json.load(f)
        with open('/app/frontend/src/i18n/locales/zh.json', 'r') as f:
            zh = json.load(f)
        
        # Keys used in SuperPinMatch.jsx
        match_keys = ['title', 'sets', 'point', 'ace', 'set', 'bestOf', 'pointsPerSet', 
                     'setHistory', 'start', 'matchFinished', 'winner', 'notFound']
        status_keys = ['pending', 'live', 'finished']
        
        for key in match_keys:
            assert key in es.get('superpin', {}).get('matches', {}), f"Missing ES: superpin.matches.{key}"
            assert key in en.get('superpin', {}).get('matches', {}), f"Missing EN: superpin.matches.{key}"
            assert key in zh.get('superpin', {}).get('matches', {}), f"Missing ZH: superpin.matches.{key}"
        
        for key in status_keys:
            assert key in es.get('superpin', {}).get('matches', {}).get('status', {}), f"Missing ES: superpin.matches.status.{key}"
            assert key in en.get('superpin', {}).get('matches', {}).get('status', {}), f"Missing EN: superpin.matches.status.{key}"
            assert key in zh.get('superpin', {}).get('matches', {}).get('status', {}), f"Missing ZH: superpin.matches.status.{key}"
        
        print("All SuperPinMatch translations verified!")
    
    def test_superpin_league_detail_translations(self):
        """Verify SuperPinLeagueDetail.jsx translations exist in all languages"""
        import json
        
        with open('/app/frontend/src/i18n/locales/es.json', 'r') as f:
            es = json.load(f)
        with open('/app/frontend/src/i18n/locales/en.json', 'r') as f:
            en = json.load(f)
        with open('/app/frontend/src/i18n/locales/zh.json', 'r') as f:
            zh = json.load(f)
        
        # Keys used in SuperPinLeagueDetail.jsx
        ranking_keys = ['title', 'player', 'points', 'elo', 'played', 'won', 'lost', 'streak', 'change']
        league_keys = ['scoringElo', 'scoringSimple', 'notFound']
        
        for key in ranking_keys:
            assert key in es.get('superpin', {}).get('ranking', {}), f"Missing ES: superpin.ranking.{key}"
            assert key in en.get('superpin', {}).get('ranking', {}), f"Missing EN: superpin.ranking.{key}"
            assert key in zh.get('superpin', {}).get('ranking', {}), f"Missing ZH: superpin.ranking.{key}"
        
        for key in league_keys:
            assert key in es.get('superpin', {}).get('leagues', {}), f"Missing ES: superpin.leagues.{key}"
            assert key in en.get('superpin', {}).get('leagues', {}), f"Missing EN: superpin.leagues.{key}"
            assert key in zh.get('superpin', {}).get('leagues', {}), f"Missing ZH: superpin.leagues.{key}"
        
        print("All SuperPinLeagueDetail translations verified!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
