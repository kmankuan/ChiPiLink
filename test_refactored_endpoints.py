#!/usr/bin/env python3

import requests
import sys
import json

class RefactoredEndpointsTester:
    def __init__(self, base_url="https://securestore-3.preview.emergentagent.com"):
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
                    error_detail = response.json().get('detail', response.text[:200])
                    details += f" - {error_detail}"
                except:
                    details += f" - {response.text[:200]}"
            
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

    def test_auth_v2_endpoints(self):
        """Test Auth V2 Endpoints"""
        print("\n🔐 Testing Auth V2 Endpoints...")
        
        # 1. Login
        login_data = {
            "email": "teck@koh.one",
            "contrasena": "Acdb##0897"
        }
        
        login_result = self.run_test(
            "POST /api/auth-v2/login",
            "POST",
            "auth-v2/login",
            200,
            login_data
        )
        
        if login_result and 'token' in login_result:
            self.token = login_result['token']
            print(f"✅ Auth V2 token obtained: {self.token[:20]}...")
            
            # 2. Get current user
            me_result = self.run_test(
                "GET /api/auth-v2/me",
                "GET",
                "auth-v2/me",
                200
            )
            
            # 3. Get all users (admin only)
            users_result = self.run_test(
                "GET /api/auth-v2/users",
                "GET",
                "auth-v2/users",
                200
            )
            
            # 4. Get user stats (admin only)
            stats_result = self.run_test(
                "GET /api/auth-v2/users/stats",
                "GET",
                "auth-v2/users/stats",
                200
            )
            
            # 5. Get user by ID (admin only)
            if me_result and 'cliente_id' in me_result:
                user_id = me_result['cliente_id']
                user_by_id = self.run_test(
                    f"GET /api/auth-v2/users/{user_id}",
                    "GET",
                    f"auth-v2/users/{user_id}",
                    200
                )
            
            # 6. Logout
            logout_result = self.run_test(
                "POST /api/auth-v2/logout",
                "POST",
                "auth-v2/logout",
                200
            )
            
            return True
        else:
            print("❌ Auth V2 login failed, skipping other tests")
            return False

    def test_store_endpoints(self):
        """Test Store Endpoints"""
        print("\n🏪 Testing Store Endpoints...")
        
        # Remove auth for public endpoints
        self.token = None
        
        # 1. Categories
        categories = self.run_test(
            "GET /api/store/categories",
            "GET",
            "store/categories",
            200
        )
        
        # 2. Products
        products = self.run_test(
            "GET /api/store/products",
            "GET",
            "store/products",
            200
        )
        
        # 3. Featured Products
        featured = self.run_test(
            "GET /api/store/products/featured",
            "GET",
            "store/products/featured",
            200
        )
        
        # 4. Public Grades
        grades = self.run_test(
            "GET /api/store/public/grades",
            "GET",
            "store/public/grades",
            200
        )
        
        # 5. Public Subjects
        subjects = self.run_test(
            "GET /api/store/public/subjects",
            "GET",
            "store/public/subjects",
            200
        )
        
        return True

    def test_legacy_endpoints(self):
        """Test Legacy Endpoints"""
        print("\n🔄 Testing Legacy Endpoints...")
        
        # 1. Legacy auth login
        legacy_login_data = {
            "email": "teck@koh.one",
            "contrasena": "Acdb##0897"
        }
        
        legacy_auth = self.run_test(
            "POST /api/auth/login (Legacy)",
            "POST",
            "auth/login",
            200,
            legacy_login_data
        )
        
        # 2. Legacy categories
        legacy_categories = self.run_test(
            "GET /api/categorias (Legacy)",
            "GET",
            "categorias",
            200
        )
        
        # 3. Legacy grades
        legacy_grades = self.run_test(
            "GET /api/grados (Legacy)",
            "GET",
            "grados",
            200
        )
        
        return True

    def run_all_tests(self):
        """Run all refactored endpoint tests"""
        print("🚀 Testing Refactored Endpoints")
        print(f"Testing against: {self.base_url}")
        
        # Test Auth V2 endpoints
        self.test_auth_v2_endpoints()
        
        # Test Store endpoints
        self.test_store_endpoints()
        
        # Test Legacy endpoints
        self.test_legacy_endpoints()
        
        # Summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed tests:")
            for test in self.failed_tests:
                print(f"  - {test}")
        
        return len(self.failed_tests) == 0

if __name__ == "__main__":
    tester = RefactoredEndpointsTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)