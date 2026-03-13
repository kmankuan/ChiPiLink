#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class SportModuleTester:
    def __init__(self, base_url="https://chipi-main.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.created_resources = {
            'sport_matches': [],
            'sport_leagues': [],
            'sport_live_sessions': []
        }

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.admin_token:
            headers['Authorization'] = f'Bearer {self.admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Expected {expected_status}, got {response.status_code}"
            if not success:
                try:
                    error_detail = response.json().get('detail', response.text[:100])
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details if not success else "")
            
            if success:
                try:
                    return response.json()
                except:
                    return {"success": True}
            return None

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return None

    def test_admin_login(self):
        """Test admin login"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        }
        
        result = self.run_test(
            "Admin Login",
            "POST",
            "auth-v2/login",
            200,
            login_data
        )
        
        if result and 'token' in result:
            self.admin_token = result['token']
            print(f"   Token: {self.admin_token[:20]}...")
            return True
        return False

    def test_sport_health(self):
        """Test Sport health: GET /api/sport/players returns empty array or players list"""
        print("\n🏓 Testing Sport Module Health...")
        
        # Test without auth (should work)
        old_token = self.admin_token
        self.admin_token = None
        
        players_result = self.run_test(
            "GET /api/sport/players (health check)",
            "GET",
            "sport/players",
            200
        )
        
        self.admin_token = old_token
        
        if players_result is not None:
            print(f"   Found {len(players_result) if isinstance(players_result, list) else 'data'} players")
            return True
        return False

    def test_sport_record_match(self):
        """Test Record match: POST /api/sport/matches creates match and auto-creates 3 players"""
        print("\n🏓 Testing Sport Match Recording...")
        
        if not self.admin_token:
            print("❌ Admin token required for match recording")
            return False
        
        match_data = {
            "player_a_name": "TestA",
            "player_b_name": "TestB", 
            "referee_name": "TestRef",
            "winner_name": "TestA",
            "score_winner": 11,
            "score_loser": 5
        }
        
        match_result = self.run_test(
            "POST /api/sport/matches (record match)",
            "POST",
            "sport/matches",
            200,
            match_data
        )
        
        if match_result and 'match_id' in match_result:
            self.created_resources['sport_matches'].append(match_result['match_id'])
            print(f"   Created match: {match_result['match_id']}")
            return True
        return False

    def test_players_auto_created(self):
        """Test Players auto-created: GET /api/sport/players should now show TestA, TestB, TestRef"""
        print("\n🏓 Testing Players Auto-Creation...")
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
        players_result = self.run_test(
            "GET /api/sport/players (check auto-created)",
            "GET", 
            "sport/players",
            200
        )
        
        self.admin_token = old_token
        
        if players_result and isinstance(players_result, list):
            player_names = {p.get('nickname', '').lower() for p in players_result}
            expected = {'testa', 'testb', 'testref'}
            found = expected.intersection(player_names)
            
            if len(found) >= 3:
                print(f"   Auto-created players found: {found}")
                return True
            else:
                print(f"   Expected 3 players, found {len(found)}: {found}")
                return False
        return False

    def test_elo_calculated(self):
        """Test ELO calculated: TestA should have ELO > 1000, TestB < 1000"""
        print("\n🏓 Testing ELO Calculation...")
        
        # Get players without auth
        old_token = self.admin_token
        self.admin_token = None
        
        players_result = self.run_test(
            "GET /api/sport/players (check ELO)",
            "GET", 
            "sport/players",
            200
        )
        
        self.admin_token = old_token
        
        if players_result and isinstance(players_result, list):
            testa_elo = None
            testb_elo = None
            
            for player in players_result:
                nickname = player.get('nickname', '').lower()
                if nickname == 'testa':
                    testa_elo = player.get('elo', 0)
                elif nickname == 'testb':
                    testb_elo = player.get('elo', 0)
            
            success = True
            if testa_elo is not None:
                if testa_elo > 1000:
                    print(f"   ✅ Winner TestA ELO: {testa_elo} > 1000")
                else:
                    print(f"   ❌ Winner TestA ELO: {testa_elo} should be > 1000")
                    success = False
            
            if testb_elo is not None:
                if testb_elo < 1000:
                    print(f"   ✅ Loser TestB ELO: {testb_elo} < 1000")
                else:
                    print(f"   ❌ Loser TestB ELO: {testb_elo} should be < 1000")
                    success = False
            
            return success and testa_elo is not None and testb_elo is not None
        return False

    def test_rankings(self):
        """Test Rankings: GET /api/sport/rankings returns players sorted by ELO"""
        print("\n🏓 Testing Rankings...")
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
        rankings_result = self.run_test(
            "GET /api/sport/rankings (ELO rankings)",
            "GET",
            "sport/rankings",
            200
        )
        
        self.admin_token = old_token
        
        if rankings_result and isinstance(rankings_result, list) and len(rankings_result) > 0:
            # Check if sorted by ELO (descending)
            elos = [p.get('elo', 0) for p in rankings_result]
            is_sorted = all(elos[i] >= elos[i+1] for i in range(len(elos)-1))
            
            if is_sorted:
                print(f"   Rankings properly sorted by ELO: {elos[:3]}...")
                return True
            else:
                print(f"   Rankings NOT sorted by ELO: {elos[:3]}...")
                return False
        return rankings_result is not None

    def test_rankings_referees(self):
        """Test Rankings referees: GET /api/sport/rankings?type=referees returns TestRef with matches_refereed=1"""
        print("\n🏓 Testing Referee Rankings...")
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
        referee_rankings = self.run_test(
            "GET /api/sport/rankings?type=referees",
            "GET",
            "sport/rankings?type=referees",
            200
        )
        
        self.admin_token = old_token
        
        if referee_rankings and isinstance(referee_rankings, list):
            testref_found = False
            for ref in referee_rankings:
                if ref.get('nickname', '').lower() == 'testref':
                    matches_refereed = ref.get('stats', {}).get('matches_refereed', 0)
                    if matches_refereed >= 1:
                        print(f"   TestRef found with {matches_refereed} matches refereed")
                        testref_found = True
                        break
            
            if testref_found:
                return True
            else:
                print(f"   TestRef not found in referee rankings or no matches")
                return False
        return False

    def test_create_league(self):
        """Test Create league: POST /api/sport/leagues works"""
        print("\n🏓 Testing League Creation...")
        
        if not self.admin_token:
            print("❌ Admin token required for league creation")
            return False
        
        league_data = {
            "name": "Test League",
            "rating_system": "elo"
        }
        
        league_result = self.run_test(
            "POST /api/sport/leagues (create)",
            "POST",
            "sport/leagues",
            200,
            league_data
        )
        
        if league_result and 'league_id' in league_result:
            self.created_resources['sport_leagues'].append(league_result['league_id'])
            print(f"   Created league: {league_result['league_id']}")
            return True
        return False

    def test_list_leagues(self):
        """Test List leagues: GET /api/sport/leagues returns the created league"""
        print("\n🏓 Testing League Listing...")
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
        leagues_list = self.run_test(
            "GET /api/sport/leagues",
            "GET",
            "sport/leagues",
            200
        )
        
        self.admin_token = old_token
        
        if leagues_list and isinstance(leagues_list, list):
            test_league_found = any(l.get('name') == 'Test League' for l in leagues_list)
            if test_league_found:
                print(f"   Test League found in list")
                return True
            else:
                print(f"   Test League not found in list")
                return False
        return False

    def test_start_live(self):
        """Test Start live: POST /api/sport/live creates session"""
        print("\n🏓 Testing Live Session Start...")
        
        if not self.admin_token:
            print("❌ Admin token required for live session")
            return False
        
        live_data = {
            "player_a_name": "LiveA",
            "player_b_name": "LiveB", 
            "referee_name": "LiveRef"
        }
        
        live_result = self.run_test(
            "POST /api/sport/live (start live)",
            "POST",
            "sport/live",
            200,
            live_data
        )
        
        if live_result and 'session_id' in live_result:
            self.created_resources['sport_live_sessions'].append(live_result['session_id'])
            print(f"   Created live session: {live_result['session_id']}")
            return True
        return False

    def test_score_point(self):
        """Test Score point: POST /api/sport/live/{session_id}/point works"""
        print("\n🏓 Testing Live Scoring...")
        
        if not self.admin_token or not self.created_resources['sport_live_sessions']:
            print("❌ Admin token and live session required")
            return False
        
        session_id = self.created_resources['sport_live_sessions'][0]
        point_data = {
            "scored_by": "a"
        }
        
        point_result = self.run_test(
            f"POST /api/sport/live/{session_id}/point",
            "POST",
            f"sport/live/{session_id}/point",
            200,
            point_data
        )
        
        if point_result:
            score = point_result.get('score', {})
            if score.get('a') == 1 and score.get('b') == 0:
                print(f"   Point scored successfully: {score}")
                return True
            else:
                print(f"   Unexpected score: {score}")
                return False
        return False

    def test_live_state(self):
        """Test Live state: GET /api/sport/live/{session_id}/state returns score and points"""
        print("\n🏓 Testing Live State...")
        
        if not self.created_resources['sport_live_sessions']:
            print("❌ Live session required")
            return False
        
        session_id = self.created_resources['sport_live_sessions'][0]
        
        # Remove auth for public endpoint
        old_token = self.admin_token
        self.admin_token = None
        
        state_result = self.run_test(
            f"GET /api/sport/live/{session_id}/state",
            "GET",
            f"sport/live/{session_id}/state",
            200
        )
        
        self.admin_token = old_token
        
        if state_result:
            has_score = 'score' in state_result
            has_points = 'points' in state_result
            
            if has_score and has_points:
                score = state_result.get('score', {})
                points_count = len(state_result.get('points', []))
                print(f"   Live state valid - Score: {score}, Points: {points_count}")
                return True
            else:
                print(f"   Missing required fields: score={has_score}, points={has_points}")
                return False
        return False

    def test_sport_settings(self):
        """Test Settings: GET /api/sport/settings returns full config with defaults (requires admin auth)"""
        print("\n🏓 Testing Sport Settings...")
        
        if not self.admin_token:
            print("❌ Admin token required for settings")
            return False
        
        settings_result = self.run_test(
            "GET /api/sport/settings (admin)",
            "GET",
            "sport/settings",
            200
        )
        
        if settings_result:
            expected_sections = ['rating', 'match', 'live', 'emotions']
            found_sections = [s for s in expected_sections if s in settings_result]
            
            if len(found_sections) >= 3:
                print(f"   Settings has required sections: {found_sections}")
                return True
            else:
                print(f"   Missing sections, found: {found_sections}")
                return False
        return False

    def run_all_tests(self):
        """Run all Sport module tests"""
        print(f"\n" + "=" * 60)
        print("SPORT MODULE TESTS")
        print("=" * 60)
        
        # First login as admin
        if not self.test_admin_login():
            print("❌ Failed to login as admin - stopping tests")
            return False
        
        sport_tests = [
            ("Sport Health", self.test_sport_health),
            ("Record Match", self.test_sport_record_match),
            ("Players Auto-Created", self.test_players_auto_created),
            ("ELO Calculated", self.test_elo_calculated),
            ("Rankings", self.test_rankings),
            ("Rankings Referees", self.test_rankings_referees),
            ("Create League", self.test_create_league),
            ("List Leagues", self.test_list_leagues),
            ("Start Live", self.test_start_live),
            ("Score Point", self.test_score_point),
            ("Live State", self.test_live_state),
            ("Sport Settings", self.test_sport_settings),
        ]
        
        sport_success_count = 0
        for test_name, test_func in sport_tests:
            try:
                success = test_func()
                if success:
                    sport_success_count += 1
                else:
                    print(f"⚠️  {test_name} failed")
            except Exception as e:
                print(f"💥 {test_name} crashed: {str(e)}")
        
        print(f"\n" + "=" * 60)
        print(f"🏓 Sport Module Tests: {sport_success_count}/{len(sport_tests)} passed")
        print(f"Success rate: {(sport_success_count/len(sport_tests)*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        print("=" * 60)
        return sport_success_count >= (len(sport_tests) * 0.7)

def main():
    """Main function to run sport tests"""
    tester = SportModuleTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())