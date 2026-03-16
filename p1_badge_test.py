#!/usr/bin/env python3
"""
ChiPi Link P1 Badge Configuration Tests
Tests for badge customization admin UI and APIs
"""

import requests
import sys
import json
from datetime import datetime

class P1BadgeConfigTester:
    def __init__(self, base_url="https://tutor-engine-ui.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append(f"{name}: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, requires_auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if requires_auth and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            if success:
                try:
                    response_data = response.json() if response.content else {}
                except:
                    response_data = {}
                self.log_test(name, True, f"Status: {response.status_code}")
                return True, response_data
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def admin_login(self):
        """Login as admin user"""
        login_data = {
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        }
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth-v2/login",
            200,
            data=login_data,
            requires_auth=False
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return True
        return False

    def test_badge_config_get(self):
        """Test GET /api/admin/badge-config returns default configuration"""
        success, response = self.run_test(
            "Get Badge Config (Admin)",
            "GET",
            "admin/badge-config",
            200
        )
        
        if success:
            # Verify response contains expected structure
            if 'order_statuses' in response and 'item_statuses' in response:
                # Check some expected default statuses
                order_statuses = response.get('order_statuses', {})
                item_statuses = response.get('item_statuses', {})
                
                expected_order_statuses = ['draft', 'submitted', 'processing', 'ready', 'delivered']
                expected_item_statuses = ['available', 'ordered', 'processing', 'delivered']
                
                missing_order = [s for s in expected_order_statuses if s not in order_statuses]
                missing_item = [s for s in expected_item_statuses if s not in item_statuses]
                
                if missing_order or missing_item:
                    self.log_test("Badge Config Structure Validation", False, 
                                f"Missing statuses - Order: {missing_order}, Item: {missing_item}")
                else:
                    self.log_test("Badge Config Structure Validation", True)
                    return response
            else:
                self.log_test("Badge Config Structure Validation", False, 
                            "Missing order_statuses or item_statuses in response")
        
        return None

    def test_badge_config_public(self):
        """Test GET /api/admin/badge-config/public works without auth"""
        success, response = self.run_test(
            "Get Badge Config (Public - No Auth)",
            "GET",
            "admin/badge-config/public",
            200,
            requires_auth=False
        )
        
        if success:
            # Verify same structure as admin endpoint
            if 'order_statuses' in response and 'item_statuses' in response:
                self.log_test("Public Badge Config Structure Validation", True)
                return response
            else:
                self.log_test("Public Badge Config Structure Validation", False, 
                            "Missing order_statuses or item_statuses in public response")
        
        return None

    def test_badge_config_update(self):
        """Test PUT /api/admin/badge-config saves configuration"""
        # First get current config
        current_config = self.test_badge_config_get()
        if not current_config:
            return False
        
        # Modify a status color
        test_config = current_config.copy()
        if 'order_statuses' in test_config and 'draft' in test_config['order_statuses']:
            test_config['order_statuses']['draft']['color'] = '#ff0000'  # Change to red
            test_config['order_statuses']['draft']['label'] = 'Test Draft'  # Change label
        
        # Update config
        success, response = self.run_test(
            "Update Badge Config",
            "PUT",
            "admin/badge-config",
            200,
            data=test_config
        )
        
        if success:
            # Verify the update was saved by getting config again
            updated_config = self.test_badge_config_get()
            if updated_config and \
               updated_config.get('order_statuses', {}).get('draft', {}).get('color') == '#ff0000' and \
               updated_config.get('order_statuses', {}).get('draft', {}).get('label') == 'Test Draft':
                self.log_test("Badge Config Update Verification", True)
                return True
            else:
                self.log_test("Badge Config Update Verification", False, 
                            "Config changes were not persisted")
        
        return False

    def test_badge_config_reset(self):
        """Test resetting badge config to defaults"""
        # Send empty config to reset to defaults
        success, response = self.run_test(
            "Reset Badge Config to Defaults",
            "PUT",
            "admin/badge-config",
            200,
            data={}
        )
        
        if success:
            # Verify reset worked by checking default values
            reset_config = self.test_badge_config_get()
            if reset_config and \
               'order_statuses' in reset_config and \
               'item_statuses' in reset_config:
                self.log_test("Badge Config Reset Verification", True)
                return True
            else:
                self.log_test("Badge Config Reset Verification", False, 
                            "Reset did not restore default config")
        
        return False

    def run_p1_badge_tests(self):
        """Run all P1 badge configuration tests"""
        print("🔧 Starting ChiPi Link P1 Badge Configuration Tests")
        print("=" * 60)
        
        # Login as admin
        if not self.admin_login():
            print("❌ Admin login failed, stopping tests")
            return False
        
        print(f"✅ Admin login successful")
        
        # Test badge configuration endpoints
        print("\n📋 Testing Badge Configuration APIs...")
        self.test_badge_config_get()
        self.test_badge_config_public()
        self.test_badge_config_update()
        self.test_badge_config_reset()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for failure in self.failed_tests:
                print(f"  - {failure}")
        
        return self.tests_passed == self.tests_run


def main():
    """Main function to run P1 badge tests"""
    tester = P1BadgeConfigTester()
    success = tester.run_p1_badge_tests()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())