#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ChiPiLinkTester:
    def __init__(self, base_url="https://sport-scoring-hub.preview.emergentagent.com"):
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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.admin_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)

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

    def test_health_endpoints(self):
        """Test health endpoints"""
        print("\n🏥 Testing Health Endpoints...")
        
        # Test /api/health endpoint
        health = self.run_test(
            "GET /api/health",
            "GET",
            "health",
            200
        )
        
        # Test basic health endpoint without /api prefix (should return frontend HTML)
        try:
            response = requests.get(f"{self.base_url}/health", timeout=10)
            success = response.status_code == 200
            if success:
                # Check if it's HTML response (frontend)
                if 'html' in response.text.lower():
                    self.log_test("GET /health (Frontend)", True, "Returns frontend HTML as expected")
                else:
                    self.log_test("GET /health (Frontend)", False, "Expected HTML but got different content")
            else:
                self.log_test("GET /health (Frontend)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /health (Frontend)", False, f"Exception: {str(e)}")
        
        return health is not None

    def test_admin_login(self):
        """Test admin login with specific credentials"""
        print("\n🔐 Testing Admin Authentication...")
        
        login_data = {
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        }
        
        result = self.run_test(
            "Admin Login (teck@koh.one)",
            "POST",
            "auth-v2/login",
            200,
            login_data
        )
        
        if result and 'token' in result:
            self.admin_token = result['token']
            return True
        return False

    def test_admin_protected_route(self):
        """Test admin protected route"""
        print("\n🛡️ Testing Admin Protected Routes...")
        
        if not self.admin_token:
            self.log_test("Admin Protected Route Test", False, "No admin token available")
            return False
        
        # Test GET /api/auth-v2/me with admin token
        result = self.run_test(
            "GET /api/auth-v2/me (with admin token)",
            "GET", 
            "auth-v2/me",
            200
        )
        
        if result:
            # Validate admin user info
            if result.get('is_admin'):
                self.log_test("Admin User Info Contains is_admin=true", True)
                return True
            else:
                self.log_test("Admin User Info Contains is_admin=true", False, f"is_admin: {result.get('is_admin')}")
        
        return False

    def test_admin_diagnostic(self):
        """Test admin diagnostic endpoint"""
        print("\n🩺 Testing Admin Diagnostic...")
        
        result = self.run_test(
            "GET /api/auth-v2/admin-diagnostic",
            "GET",
            "auth-v2/admin-diagnostic",
            200
        )
        
        if result:
            if result.get('status') == 'FOUND' and result.get('is_admin') and result.get('password_matches'):
                self.log_test("Admin Diagnostic Valid", True)
                return True
            else:
                self.log_test("Admin Diagnostic Valid", False, f"Invalid diagnostic result: {result}")
        
        return False

    def test_community_endpoints(self):
        """Test community/landing endpoints that should exist"""
        print("\n🌐 Testing Community Endpoints...")
        
        # Try to find an actual working endpoint
        # Let's test some common endpoints that might exist
        endpoints_to_try = [
            ("community/landing", "Community Landing"),
            ("community/posts", "Community Posts"),
            ("public/landing", "Public Landing"),
            ("public/config", "Public Config"),
            ("showcase/banners", "Showcase Banners"),
            ("landing/config", "Landing Config")
        ]
        
        working_endpoints = 0
        
        for endpoint, name in endpoints_to_try:
            result = self.run_test(
                f"GET /api/{endpoint}",
                "GET",
                endpoint,
                200
            )
            if result is not None:
                working_endpoints += 1
        
        # At least one endpoint should work
        if working_endpoints > 0:
            self.log_test("At least one community/public endpoint working", True, f"{working_endpoints} endpoints working")
            return True
        else:
            self.log_test("At least one community/public endpoint working", False, "No community endpoints working")
            return False

def main():
    # Setup
    tester = ChiPiLinkTester()
    
    print("🧪 ChiPi Link API Testing")
    print("=" * 50)
    
    # Run tests in order
    health_ok = tester.test_health_endpoints()
    admin_login_ok = tester.test_admin_login()
    
    if admin_login_ok:
        protected_route_ok = tester.test_admin_protected_route()
    else:
        tester.log_test("Skipped Admin Protected Routes", False, "Admin login failed")
        protected_route_ok = False
    
    admin_diag_ok = tester.test_admin_diagnostic()
    community_ok = tester.test_community_endpoints()
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for failed in tester.failed_tests:
            print(f"  - {failed}")
    
    # Exit code
    success_rate = tester.tests_passed / tester.tests_run if tester.tests_run > 0 else 0
    
    if success_rate >= 0.8:  # 80% success rate
        print(f"\n✅ Overall Status: PASS ({success_rate:.1%} success rate)")
        return 0
    else:
        print(f"\n❌ Overall Status: FAIL ({success_rate:.1%} success rate)")
        return 1

if __name__ == "__main__":
    sys.exit(main())