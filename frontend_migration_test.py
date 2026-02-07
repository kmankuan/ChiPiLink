#!/usr/bin/env python3

import requests
import sys
import json

class FrontendMigrationTester:
    def __init__(self, base_url="https://admin-login-refactor.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
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
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)

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

    def test_frontend_migration_verification(self):
        """Test Frontend Migration to New API Endpoints - REVIEW REQUEST"""
        print("🔄 Testing Frontend Migration to New API Endpoints...")
        print("="*60)
        
        success = True
        
        # ============== AUTH MODULE (using new endpoints /api/auth-v2/*) ==============
        print("\n🔐 Testing Auth Module Migration...")
        
        # 1. POST /api/auth-v2/login - Login with email/password
        login_data = {
            "email": "admin@libreria.com",
            "contrasena": "admin"
        }
        
        login_result = self.run_test(
            "POST /api/auth-v2/login (admin@libreria.com/admin)",
            "POST",
            "auth-v2/login",
            200,
            login_data
        )
        
        auth_v2_token = None
        if login_result and 'token' in login_result:
            auth_v2_token = login_result['token']
            print(f"   ✅ Login successful - Token received")
        else:
            print(f"   ❌ Login failed - No token received")
            success = False
        
        if auth_v2_token:
            # Set token for authenticated requests
            self.token = auth_v2_token
            
            # 2. GET /api/auth-v2/me - Get current user info (requires auth)
            me_result = self.run_test(
                "GET /api/auth-v2/me",
                "GET",
                "auth-v2/me",
                200
            )
            
            if me_result and 'email' in me_result:
                print(f"   ✅ Current user info retrieved: {me_result.get('email')}")
            else:
                print(f"   ❌ Failed to get current user info")
                success = False
            
            # 3. GET /api/auth-v2/users/stats - Get user statistics (requires admin auth)
            stats_result = self.run_test(
                "GET /api/auth-v2/users/stats",
                "GET",
                "auth-v2/users/stats",
                200
            )
            
            if stats_result:
                print(f"   ✅ User statistics retrieved: {stats_result}")
            else:
                print(f"   ❌ Failed to get user statistics")
                success = False
        
        # ============== STORE MODULE (using new endpoints /api/store/*) ==============
        print("\n🏪 Testing Store Module Migration...")
        
        # Remove auth for public endpoints
        self.token = None
        
        # 1. GET /api/store/categories - Get categories
        categories = self.run_test(
            "GET /api/store/categories",
            "GET",
            "store/categories",
            200
        )
        
        if categories:
            if isinstance(categories, list):
                print(f"   ✅ Categories retrieved: {len(categories)} categories")
            else:
                print(f"   ✅ Categories data returned")
        else:
            print(f"   ❌ Failed to get categories")
            success = False
        
        # 2. GET /api/store/products - Get products
        products = self.run_test(
            "GET /api/store/products",
            "GET",
            "store/products",
            200
        )
        
        if products is not None:  # Allow empty arrays
            if isinstance(products, list):
                print(f"   ✅ Products retrieved: {len(products)} products (empty array is valid)")
            else:
                print(f"   ✅ Products data returned")
        else:
            print(f"   ❌ Failed to get products")
            success = False
        
        # 3. GET /api/store/public/grades - Get grade levels
        grades = self.run_test(
            "GET /api/store/public/grades",
            "GET",
            "store/public/grades",
            200
        )
        
        if grades:
            print(f"   ✅ Grade levels retrieved: {grades}")
        else:
            print(f"   ❌ Failed to get grade levels")
            success = False
        
        # ============== COMMUNITY MODULE (using new endpoints /api/community-v2/*) ==============
        print("\n🏘️ Testing Community Module Migration...")
        
        # 1. GET /api/community-v2/posts - Get posts
        posts = self.run_test(
            "GET /api/community-v2/posts",
            "GET",
            "community-v2/posts",
            200
        )
        
        if posts is not None:  # Allow empty arrays
            if isinstance(posts, list):
                print(f"   ✅ Posts retrieved: {len(posts)} posts (empty array is valid)")
            else:
                print(f"   ✅ Posts data returned")
        else:
            print(f"   ❌ Failed to get posts")
            success = False
        
        # 2. GET /api/community-v2/events - Get events
        events = self.run_test(
            "GET /api/community-v2/events",
            "GET",
            "community-v2/events",
            200
        )
        
        if events is not None:  # Allow empty arrays
            if isinstance(events, list):
                print(f"   ✅ Events retrieved: {len(events)} events (empty array is valid)")
            else:
                print(f"   ✅ Events data returned")
        else:
            print(f"   ❌ Failed to get events")
            success = False
        
        # 3. GET /api/community-v2/landing - Get landing data
        landing = self.run_test(
            "GET /api/community-v2/landing",
            "GET",
            "community-v2/landing",
            200
        )
        
        if landing is not None:  # Allow empty arrays
            print(f"   ✅ Landing data retrieved: {type(landing)}")
        else:
            print(f"   ❌ Failed to get landing data")
            success = False
        
        return success

    def run_test_suite(self):
        """Run the complete frontend migration test suite"""
        print("🚀 Frontend Migration Verification Test Suite")
        print(f"Testing against: {self.base_url}")
        print("="*60)
        
        # Run the main test
        migration_success = self.test_frontend_migration_verification()
        
        # Print summary
        print("\n" + "="*60)
        print("📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print("\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        print("\n" + "="*60)
        if migration_success:
            print("✅ FRONTEND MIGRATION VERIFICATION: SUCCESS")
            print("All new refactored endpoints are working correctly!")
        else:
            print("❌ FRONTEND MIGRATION VERIFICATION: ISSUES FOUND")
            print("Some endpoints need attention.")
        
        return migration_success

if __name__ == "__main__":
    tester = FrontendMigrationTester()
    success = tester.run_test_suite()
    sys.exit(0 if success else 1)