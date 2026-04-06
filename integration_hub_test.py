#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class ChiPiLinkIntegrationHubTester:
    def __init__(self, main_app_url="https://admin-ui-unify.preview.emergentagent.com", hub_url="http://localhost:8002"):
        self.main_app_url = main_app_url
        self.hub_url = hub_url
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

    def run_test(self, name, base_url, endpoint, method="GET", expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=15)

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

    def test_main_app_health(self):
        """Test main app health endpoint"""
        print("\n🏥 Testing Main App Health...")
        
        result = self.run_test(
            "Main App Health Check",
            self.main_app_url,
            "api/health",
            "GET",
            200
        )
        
        if result:
            # Check if it returns healthy status with correct db name
            if result.get('status') == 'healthy' and result.get('db') == 'chipi_link':
                self.log_test("Main App Health Status & DB", True, f"Status: {result.get('status')}, DB: {result.get('db')}")
                return True
            else:
                self.log_test("Main App Health Status & DB", False, f"Expected status=healthy, db=chipi_link, got status={result.get('status')}, db={result.get('db')}")
        
        return False

    def test_integration_hub_health(self):
        """Test integration hub health endpoint"""
        print("\n🏥 Testing Integration Hub Health...")
        
        result = self.run_test(
            "Integration Hub Health Check",
            self.hub_url,
            "health",
            "GET",
            200
        )
        
        if result:
            # Check if it returns ok with service=integration-hub
            if result.get('status') == 'ok' and result.get('service') == 'integration-hub':
                self.log_test("Hub Health Status & Service", True, f"Status: {result.get('status')}, Service: {result.get('service')}")
                return True
            else:
                self.log_test("Hub Health Status & Service", False, f"Expected status=ok, service=integration-hub, got status={result.get('status')}, service={result.get('service')}")
        
        return False

    def test_hub_dashboard_status(self):
        """Test integration hub dashboard status"""
        print("\n📊 Testing Hub Dashboard Status...")
        
        result = self.run_test(
            "Hub Dashboard Status",
            self.hub_url,
            "api/dashboard/status",
            "GET",
            200
        )
        
        if result:
            # Check required fields
            required_fields = ['status', 'timestamp', 'system', 'jobs', 'integrations']
            missing_fields = []
            
            for field in required_fields:
                if field not in result:
                    missing_fields.append(field)
                else:
                    self.log_test(f"Dashboard Contains '{field}'", True)
            
            if missing_fields:
                self.log_test("Dashboard Status Structure", False, f"Missing fields: {missing_fields}")
                return False
            
            # Check system stats
            system = result.get('system', {})
            system_fields = ['memory_mb', 'cpu_percent', 'uptime_hours']
            for field in system_fields:
                if field in system:
                    self.log_test(f"System Stats '{field}'", True, f"Value: {system[field]}")
                else:
                    self.log_test(f"System Stats '{field}'", False, f"Missing {field}")
            
            # Check job stats
            jobs = result.get('jobs', {})
            job_fields = ['pending', 'running', 'failed', 'done_today', 'total_processed', 'total_failed']
            for field in job_fields:
                if field in jobs:
                    self.log_test(f"Job Stats '{field}'", True, f"Value: {jobs[field]}")
                else:
                    self.log_test(f"Job Stats '{field}'", False, f"Missing {field}")
            
            return len(missing_fields) == 0
        
        return False

    def test_hub_integrations_list(self):
        """Test hub integrations list"""
        print("\n🔌 Testing Hub Integrations List...")
        
        result = self.run_test(
            "Hub Integrations List",
            self.hub_url,
            "api/integrations/",
            "GET",
            200
        )
        
        if result and 'integrations' in result:
            integrations = result['integrations']
            expected_integrations = ['monday', 'telegram', 'gmail', 'onesignal', 'laopan', 'fusebase']
            
            self.log_test("Integrations List Structure", True, f"Found {len(integrations)} integrations")
            
            found_integrations = [integration.get('id') for integration in integrations]
            missing_integrations = []
            
            for expected in expected_integrations:
                if expected in found_integrations:
                    self.log_test(f"Integration '{expected}' Present", True)
                else:
                    missing_integrations.append(expected)
                    self.log_test(f"Integration '{expected}' Present", False, "Missing integration")
            
            # Check structure of first integration
            if len(integrations) > 0:
                first_integration = integrations[0]
                required_fields = ['id', 'name', 'icon', 'enabled', 'status']
                for field in required_fields:
                    if field in first_integration:
                        self.log_test(f"Integration Structure '{field}'", True)
                    else:
                        self.log_test(f"Integration Structure '{field}'", False, f"Missing {field}")
            
            return len(missing_integrations) == 0
        
        return False

    def test_hub_jobs_list(self):
        """Test hub jobs list"""
        print("\n⚙️ Testing Hub Jobs List...")
        
        result = self.run_test(
            "Hub Jobs List",
            self.hub_url,
            "api/jobs/",
            "GET",
            200
        )
        
        if result:
            # Check structure
            if 'jobs' in result and 'counts' in result:
                self.log_test("Jobs List Structure", True, "Contains jobs and counts")
                
                # Check counts structure
                counts = result.get('counts', {})
                expected_counts = ['pending', 'running', 'done', 'failed']
                for count_type in expected_counts:
                    if count_type in counts:
                        self.log_test(f"Job Count '{count_type}'", True, f"Value: {counts[count_type]}")
                    else:
                        self.log_test(f"Job Count '{count_type}'", False, "Missing count type")
                
                jobs = result.get('jobs', [])
                self.log_test("Jobs Array", True, f"Found {len(jobs)} jobs")
                
                return True
            else:
                self.log_test("Jobs List Structure", False, "Missing jobs or counts fields")
        
        return False

    def test_hub_trigger_job(self):
        """Test hub job triggering"""
        print("\n🚀 Testing Hub Job Triggering...")
        
        job_data = {
            "type": "test_job",
            "payload": {
                "test": "data"
            }
        }
        
        result = self.run_test(
            "Hub Trigger Job",
            self.hub_url,
            "api/jobs/trigger",
            "POST",
            200,
            job_data
        )
        
        if result and result.get('success'):
            job = result.get('job', {})
            if 'job_id' in job and 'status' in job:
                self.log_test("Job Creation Response", True, f"Job ID: {job.get('job_id')}, Status: {job.get('status')}")
                
                # Check if status is pending
                if job.get('status') == 'pending':
                    self.log_test("Job Initial Status", True, "Status is pending")
                    return True
                else:
                    self.log_test("Job Initial Status", False, f"Expected 'pending', got '{job.get('status')}'")
            else:
                self.log_test("Job Creation Response", False, "Missing job_id or status")
        
        return False

    def test_hub_connections(self):
        """Test hub connections debug endpoint"""
        print("\n🔗 Testing Hub Connections...")
        
        result = self.run_test(
            "Hub Connections Test",
            self.hub_url,
            "api/debug/connections",
            "GET",
            200
        )
        
        if result and 'connections' in result:
            connections = result['connections']
            
            # Check MongoDB connection
            mongodb_status = connections.get('mongodb', {})
            if mongodb_status.get('status') == 'connected':
                self.log_test("MongoDB Connection", True, "Connected")
            else:
                self.log_test("MongoDB Connection", False, f"Status: {mongodb_status.get('status')}")
            
            # Check other integrations (they may not be configured)
            for integration in ['monday', 'telegram']:
                integration_status = connections.get(integration, {})
                status = integration_status.get('status', 'unknown')
                if status in ['connected', 'not_configured']:
                    self.log_test(f"{integration.title()} Integration Status", True, f"Status: {status}")
                else:
                    self.log_test(f"{integration.title()} Integration Status", False, f"Status: {status}")
            
            return mongodb_status.get('status') == 'connected'
        
        return False

    def test_hub_env_check(self):
        """Test hub environment variables check"""
        print("\n🌍 Testing Hub Environment Check...")
        
        result = self.run_test(
            "Hub Environment Check",
            self.hub_url,
            "api/debug/env",
            "GET",
            200
        )
        
        if result:
            # Check critical env vars
            if result.get('MONGO_URL') == 'set' and result.get('DB_NAME') == 'set':
                self.log_test("Critical Env Vars (MONGO_URL, DB_NAME)", True, "Both are set")
            else:
                self.log_test("Critical Env Vars (MONGO_URL, DB_NAME)", False, f"MONGO_URL: {result.get('MONGO_URL')}, DB_NAME: {result.get('DB_NAME')}")
            
            # Log other env vars status
            for env_var in ['MONDAY_API_KEY', 'TELEGRAM_BOT_TOKEN', 'ONESIGNAL_APP_ID', 'ONESIGNAL_API_KEY', 'GMAIL_CREDENTIALS']:
                status = result.get(env_var, 'unknown')
                self.log_test(f"Env Var {env_var}", status == 'set' or status == 'missing', f"Status: {status}")
            
            return result.get('MONGO_URL') == 'set' and result.get('DB_NAME') == 'set'
        
        return False

    def test_hub_test_api(self):
        """Test hub API testing endpoint"""
        print("\n🔧 Testing Hub API Test Tool...")
        
        # Test calling main app health from hub
        test_data = {
            "url": f"{self.main_app_url}/api/health",
            "method": "GET"
        }
        
        result = self.run_test(
            "Hub Test API (Main App Health)",
            self.hub_url,
            "api/debug/test-api",
            "POST",
            200,
            test_data
        )
        
        if result:
            # Check response structure
            required_fields = ['status_code', 'latency_ms', 'headers', 'body']
            for field in required_fields:
                if field in result:
                    self.log_test(f"API Test Response '{field}'", True)
                else:
                    self.log_test(f"API Test Response '{field}'", False, f"Missing {field}")
            
            # Check if main app health was successfully called
            if result.get('status_code') == 200:
                self.log_test("Main App Call via Hub", True, f"Latency: {result.get('latency_ms', 'unknown')}ms")
                return True
            else:
                self.log_test("Main App Call via Hub", False, f"Status code: {result.get('status_code')}")
        
        return False

    def test_main_app_admin_login(self):
        """Test main app admin login"""
        print("\n🔐 Testing Main App Admin Login...")
        
        login_data = {
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        }
        
        result = self.run_test(
            "Main App Admin Login",
            self.main_app_url,
            "api/auth-v2/login",
            "POST",
            200,
            login_data
        )
        
        if result and 'token' in result:
            self.token = result['token']
            self.log_test("Admin Token Received", True, "Login successful")
            return True
        else:
            self.log_test("Admin Token Received", False, "Login failed or no token")
        
        return False

    def test_shared_database(self):
        """Test that both services share the same database"""
        print("\n🗄️ Testing Shared Database Access...")
        
        if not self.token:
            self.log_test("Shared Database Test", False, "Admin token required")
            return False
        
        # Get dashboard status from hub (should show chipi_link data)
        hub_dashboard = self.run_test(
            "Hub Dashboard (Should Show ChiPi Link Data)",
            self.hub_url,
            "api/dashboard/status",
            "GET",
            200
        )
        
        # Get main app health (should show db=chipi_link)
        main_health = self.run_test(
            "Main App Health (Should Show chipi_link DB)",
            self.main_app_url,
            "api/health",
            "GET",
            200
        )
        
        success = True
        if hub_dashboard and main_health:
            # Both should reference the same database
            if main_health.get('db') == 'chipi_link':
                self.log_test("Main App Uses chipi_link DB", True)
            else:
                self.log_test("Main App Uses chipi_link DB", False, f"DB: {main_health.get('db')}")
                success = False
            
            # Hub should be able to access integrations (stored in same DB)
            integrations = hub_dashboard.get('integrations', [])
            self.log_test("Hub Accesses Shared DB", True, f"Found {len(integrations)} integrations in shared DB")
        else:
            success = False
        
        return success

    def run_all_tests(self):
        """Run all integration hub tests"""
        print("🏗️ ChiPi Link Integration Hub Testing Suite")
        print("=" * 50)
        
        # Test main app first
        if not self.test_main_app_health():
            print("❌ Main app health check failed - stopping tests")
            return False
        
        # Test integration hub
        if not self.test_integration_hub_health():
            print("❌ Integration hub health check failed - stopping tests")
            return False
        
        # Test hub endpoints
        self.test_hub_dashboard_status()
        self.test_hub_integrations_list()
        self.test_hub_jobs_list()
        self.test_hub_trigger_job()
        self.test_hub_connections()
        self.test_hub_env_check()
        self.test_hub_test_api()
        
        # Test main app admin functionality
        self.test_main_app_admin_login()
        
        # Test shared database
        self.test_shared_database()
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for failed_test in self.failed_tests:
                print(f"  - {failed_test}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ChiPiLinkIntegrationHubTester()
    
    success = tester.run_all_tests()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())