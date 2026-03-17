#!/usr/bin/env python3
"""
Comprehensive Backend API Test Suite for ChiPi Sport Engine
Tests all endpoints as specified in the review request
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Read backend URL from frontend env
with open('/app/frontend/.env', 'r') as f:
    for line in f:
        if line.startswith('REACT_APP_BACKEND_URL='):
            BACKEND_URL = line.strip().split('=')[1]
            break
    else:
        BACKEND_URL = "http://localhost:8001"

print(f"Testing backend at: {BACKEND_URL}")

class TestResults:
    def __init__(self):
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.failures = []

    def record_test(self, test_name: str, passed: bool, message: str = ""):
        self.total_tests += 1
        if passed:
            self.passed_tests += 1
            print(f"✅ {test_name}")
        else:
            self.failed_tests += 1
            print(f"❌ {test_name}: {message}")
            self.failures.append(f"{test_name}: {message}")

    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total tests: {self.total_tests}")
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        
        if self.failures:
            print(f"\nFAILED TESTS:")
            for failure in self.failures:
                print(f"  - {failure}")
        
        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        print(f"{'='*60}")

results = TestResults()

# Global token storage
auth_token = None

def test_endpoint(method: str, endpoint: str, expected_status: int = 200, 
                 data: Optional[Dict] = None, headers: Optional[Dict] = None,
                 test_name: str = "", expected_data: Optional[Dict] = None) -> Optional[Dict]:
    """Generic test function for API endpoints"""
    global auth_token
    
    url = f"{BACKEND_URL}{endpoint}"
    
    # Add auth header if token exists and no custom headers provided
    if auth_token and not headers:
        headers = {"Authorization": f"Bearer {auth_token}"}
    elif auth_token and headers and "Authorization" not in headers:
        headers["Authorization"] = f"Bearer {auth_token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, json=data, headers=headers, timeout=10)
        else:
            results.record_test(test_name, False, f"Unsupported method: {method}")
            return None
        
        # Check status code
        if response.status_code != expected_status:
            results.record_test(test_name, False, 
                              f"Expected status {expected_status}, got {response.status_code}. Response: {response.text[:200]}")
            return None
        
        # Try to parse JSON
        try:
            response_data = response.json()
        except ValueError:
            if expected_status == 200:
                results.record_test(test_name, False, "Expected JSON response but got non-JSON")
                return None
            response_data = {}
        
        # Check expected data if provided
        if expected_data:
            for key, expected_value in expected_data.items():
                if key not in response_data:
                    results.record_test(test_name, False, f"Missing key '{key}' in response")
                    return None
                if response_data[key] != expected_value:
                    results.record_test(test_name, False, 
                                      f"Key '{key}': expected '{expected_value}', got '{response_data[key]}'")
                    return None
        
        results.record_test(test_name, True)
        return response_data
        
    except requests.RequestException as e:
        results.record_test(test_name, False, f"Request failed: {str(e)}")
        return None

print("Starting comprehensive backend API testing...\n")

# 1. Health Check
print("1. Testing Health Check Endpoint")
health_data = test_endpoint("GET", "/api/sport/health", 200,
                          test_name="Health Check",
                          expected_data={"status": "healthy", "service": "sport-engine"})

# 2. Players API
print("\n2. Testing Players API")

# Get all players
players_data = test_endpoint("GET", "/api/sport/players", 200, test_name="Get All Players")
if players_data and isinstance(players_data, list):
    if len(players_data) >= 5:
        results.record_test("Players Count (≥5)", True)
    else:
        results.record_test("Players Count (≥5)", False, f"Expected ≥5 players, got {len(players_data)}")
else:
    results.record_test("Players Response Format", False, "Expected list of players")

# Get specific player (Carlos)
carlos_data = test_endpoint("GET", "/api/sport/players/sp_test_001", 200, test_name="Get Carlos Player")
if carlos_data:
    if carlos_data.get("nickname") == "Carlos" and carlos_data.get("elo") == 1050:
        results.record_test("Carlos Player Data", True)
    else:
        results.record_test("Carlos Player Data", False, 
                          f"Expected Carlos with ELO 1050, got {carlos_data.get('nickname')} with ELO {carlos_data.get('elo')}")

# Get rankings
rankings_data = test_endpoint("GET", "/api/sport/rankings", 200, test_name="Get Player Rankings")
if rankings_data and isinstance(rankings_data, list) and len(rankings_data) > 0:
    first_player = rankings_data[0]
    if first_player.get("nickname") == "Carlos":
        results.record_test("Rankings Order (Carlos First)", True)
    else:
        results.record_test("Rankings Order (Carlos First)", False, 
                          f"Expected Carlos first, got {first_player.get('nickname')}")

# 3. Leagues API
print("\n3. Testing Leagues API")
leagues_data = test_endpoint("GET", "/api/sport/leagues", 200, test_name="Get All Leagues")
if leagues_data and isinstance(leagues_data, list):
    if len(leagues_data) >= 1:
        spring_league = None
        for league in leagues_data:
            if "Spring 2026" in league.get("name", ""):
                spring_league = league
                break
        
        if spring_league:
            results.record_test("Spring 2026 League Found", True)
        else:
            results.record_test("Spring 2026 League Found", False, "Spring 2026 league not found in response")
    else:
        results.record_test("Leagues Count (≥1)", False, f"Expected ≥1 league, got {len(leagues_data)}")

# 4. Matches API
print("\n4. Testing Matches API")

# Get all matches
matches_data = test_endpoint("GET", "/api/sport/matches", 200, test_name="Get All Matches")
if matches_data and isinstance(matches_data, list):
    if len(matches_data) >= 1:
        results.record_test("Matches Count (≥1)", True)
        
        # Look for Carlos vs Angel match
        carlos_angel_match = None
        for match in matches_data:
            player_a = match.get("player_a", {}).get("nickname", "")
            player_b = match.get("player_b", {}).get("nickname", "")
            if (("Carlos" in player_a and "Angel" in player_b) or 
                ("Angel" in player_a and "Carlos" in player_b)):
                carlos_angel_match = match
                break
        
        if carlos_angel_match:
            results.record_test("Carlos vs Angel Match Found", True)
        else:
            results.record_test("Carlos vs Angel Match Found", False, "Carlos vs Angel match not found")
    else:
        results.record_test("Matches Count (≥1)", False, f"Expected ≥1 match, got {len(matches_data)}")

# Get matches for Carlos
carlos_matches = test_endpoint("GET", "/api/sport/matches?player_id=sp_test_001", 200, 
                              test_name="Get Carlos Matches")
if carlos_matches and isinstance(carlos_matches, list):
    results.record_test("Carlos Matches Filter", True)

# 5. Tournaments API
print("\n5. Testing Tournaments API")
tournaments_data = test_endpoint("GET", "/api/sport/tournaments", 200, test_name="Get All Tournaments")
if tournaments_data and isinstance(tournaments_data, list):
    if len(tournaments_data) == 0:
        results.record_test("Empty Tournaments List", True)
    else:
        results.record_test("Empty Tournaments List", False, f"Expected empty list, got {len(tournaments_data)} tournaments")

# 6. Live Sessions API
print("\n6. Testing Live Sessions API")
live_sessions = test_endpoint("GET", "/api/sport/live", 200, test_name="Get Live Sessions")
if live_sessions and isinstance(live_sessions, list):
    if len(live_sessions) == 0:
        results.record_test("Empty Live Sessions List", True)
    else:
        results.record_test("Empty Live Sessions List", False, f"Expected empty list, got {len(live_sessions)} live sessions")

# 7. Settings API (Public TV Settings)
print("\n7. Testing Settings API (Public)")
tv_settings = test_endpoint("GET", "/api/sport/settings/tv", 200, test_name="Get TV Settings (Public)")
if tv_settings:
    expected_fields = ["theme", "accent_a", "accent_b", "show_elo"]
    missing_fields = [field for field in expected_fields if field not in tv_settings]
    if not missing_fields:
        results.record_test("TV Settings Fields", True)
    else:
        results.record_test("TV Settings Fields", False, f"Missing fields: {missing_fields}")

# 8. Authentication API
print("\n8. Testing Authentication API")
login_data = {
    "email": "teck@koh.one",
    "password": "Acdb##0897"
}

auth_response = test_endpoint("POST", "/api/auth-v2/login", 200, 
                            data=login_data, test_name="Admin Login")

if auth_response:
    if "token" in auth_response and "user" in auth_response:
        auth_token = auth_response["token"]
        user_data = auth_response["user"]
        
        if user_data.get("is_admin") is True:
            results.record_test("Admin User Status", True)
        else:
            results.record_test("Admin User Status", False, "User is not admin")
        
        results.record_test("Auth Response Format", True)
    else:
        results.record_test("Auth Response Format", False, "Missing token or user in response")

# 9. Authenticated Endpoints (requires auth token from login)
print("\n9. Testing Authenticated Endpoints")

if auth_token:
    # Get full settings (admin only)
    full_settings = test_endpoint("GET", "/api/sport/settings", 200,
                                headers={"Authorization": f"Bearer {auth_token}"},
                                test_name="Get Full Settings (Admin)")
    
    # Create new player (admin only)
    new_player_data = {
        "nickname": "TestPlayer",
        "name": "Test Player",
        "elo": 1000,
        "roles": ["player"]
    }
    
    created_player = test_endpoint("POST", "/api/sport/players", 200,
                                 data=new_player_data,
                                 headers={"Authorization": f"Bearer {auth_token}"},
                                 test_name="Create New Player (Admin)")
    
    if created_player and created_player.get("nickname") == "TestPlayer":
        results.record_test("Created Player Data", True)
else:
    results.record_test("Admin Authentication Required", False, "No auth token available")

# 10. Live Session Flow Testing
print("\n10. Testing Live Session Flow")

if auth_token:
    # Create live session
    live_session_data = {
        "player_a_id": "sp_test_001",  # Carlos
        "player_b_id": "sp_test_002",  # Angel
        "referee_id": "sp_test_003"    # Jimmy
    }
    
    created_session = test_endpoint("POST", "/api/sport/live", 200,
                                   data=live_session_data,
                                   headers={"Authorization": f"Bearer {auth_token}"},
                                   test_name="Create Live Session")
    
    if created_session and "session_id" in created_session:
        session_id = created_session["session_id"]
        results.record_test("Live Session Creation", True)
        
        # Score point for player A
        score_data = {"scored_by": "a"}
        score_response = test_endpoint("POST", f"/api/sport/live/{session_id}/score", 200,
                                     data=score_data,
                                     headers={"Authorization": f"Bearer {auth_token}"},
                                     test_name="Score Point for Player A")
        
        # Score point for player B
        score_data = {"scored_by": "b"}
        score_response = test_endpoint("POST", f"/api/sport/live/{session_id}/score", 200,
                                     data=score_data,
                                     headers={"Authorization": f"Bearer {auth_token}"},
                                     test_name="Score Point for Player B")
        
        # Get session to check score (should be 1-1)
        session_status = test_endpoint("GET", f"/api/sport/live/{session_id}", 200,
                                     test_name="Get Live Session Status")
        
        if session_status:
            score = session_status.get("score", {})
            if score.get("a") == 1 and score.get("b") == 1:
                results.record_test("Live Session Score (1-1)", True)
            else:
                results.record_test("Live Session Score (1-1)", False, 
                                  f"Expected score 1-1, got {score.get('a')}-{score.get('b')}")
        
        # Undo last point
        undo_response = test_endpoint("POST", f"/api/sport/live/{session_id}/undo", 200,
                                    headers={"Authorization": f"Bearer {auth_token}"},
                                    test_name="Undo Last Point")
        
        if undo_response:
            score = undo_response.get("score", {})
            if score.get("a") == 1 and score.get("b") == 0:
                results.record_test("Score After Undo (1-0)", True)
            else:
                results.record_test("Score After Undo (1-0)", False,
                                  f"Expected score 1-0 after undo, got {score.get('a')}-{score.get('b')}")
        
        # End session
        end_response = test_endpoint("POST", f"/api/sport/live/{session_id}/end", 200,
                                   headers={"Authorization": f"Bearer {auth_token}"},
                                   test_name="End Live Session")
        
        if end_response and end_response.get("status") == "completed":
            results.record_test("Live Session End Status", True)
        else:
            results.record_test("Live Session End Status", False, 
                              f"Expected completed status, got {end_response.get('status') if end_response else 'None'}")
    else:
        results.record_test("Live Session Flow", False, "Could not create live session")
else:
    results.record_test("Live Session Flow", False, "No auth token available")

# Print final results
results.print_summary()

# Return appropriate exit code
sys.exit(0 if results.failed_tests == 0 else 1)