#!/usr/bin/env python3
"""
Integration Hub Migration Test - Focused test for background task migration
Tests the specific requirements mentioned in the review request
"""

import requests
import time
import json
import sys
from datetime import datetime

class IntegrationHubMigrationTester:
    def __init__(self):
        # Use production URLs from frontend/.env
        self.main_app_url = "https://chipi-main.preview.emergentagent.com"
        self.hub_url = "http://localhost:8002"  # Integration Hub
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

    def test_main_app_health(self):
        """Test main app health check with db=chipi_link"""
        print("\n🏥 Testing Main App Health...")
        
        try:
            response = requests.get(f"{self.main_app_url}/api/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy" and data.get("db") == "chipi_link":
                    self.log_test("Main app health: GET /api/health returns healthy with db=chipi_link", True)
                    return True
                else:
                    self.log_test("Main app health: GET /api/health returns healthy with db=chipi_link", False, 
                                f"Expected status=healthy and db=chipi_link, got status={data.get('status')} and db={data.get('db')}")
            else:
                self.log_test("Main app health: GET /api/health returns healthy with db=chipi_link", False, 
                            f"Expected 200, got {response.status_code}")
            
        except Exception as e:
            self.log_test("Main app health: GET /api/health returns healthy with db=chipi_link", False, f"Exception: {e}")
        
        return False

    def test_hub_health(self):
        """Test Integration Hub health with handlers list"""
        print("\n🔗 Testing Integration Hub Health...")
        
        try:
            response = requests.get(f"{self.hub_url}/health", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                expected_handlers = ["monday_api_call", "monday_webhook_sync", "gmail_scan"]
                
                if (data.get("status") == "ok" and 
                    "handlers" in data and 
                    set(expected_handlers).issubset(set(data["handlers"]))):
                    self.log_test("Hub health: GET /health returns ok with handlers list [monday_api_call, monday_webhook_sync, gmail_scan]", True)
                    return True
                else:
                    self.log_test("Hub health: GET /health returns ok with handlers list [monday_api_call, monday_webhook_sync, gmail_scan]", False,
                                f"Expected status=ok with handlers {expected_handlers}, got status={data.get('status')} with handlers={data.get('handlers')}")
            else:
                self.log_test("Hub health: GET /health returns ok with handlers list [monday_api_call, monday_webhook_sync, gmail_scan]", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Hub health: GET /health returns ok with handlers list [monday_api_call, monday_webhook_sync, gmail_scan]", False, f"Exception: {e}")
        
        return False

    def test_hub_dashboard_status(self):
        """Test Hub dashboard status endpoint"""
        print("\n📊 Testing Hub Dashboard Status...")
        
        try:
            response = requests.get(f"{self.hub_url}/api/dashboard/status", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                # The actual response has "jobs" field (not "job_stats") and "integrations" field
                if ("jobs" in data and "integrations" in data):
                    self.log_test("Hub dashboard: GET /api/dashboard/status returns job stats and integrations", True)
                    return True
                else:
                    self.log_test("Hub dashboard: GET /api/dashboard/status returns job stats and integrations", False,
                                f"Missing jobs or integrations in response: {data}")
            else:
                self.log_test("Hub dashboard: GET /api/dashboard/status returns job stats and integrations", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Hub dashboard: GET /api/dashboard/status returns job stats and integrations", False, f"Exception: {e}")
        
        return False

    def test_job_pipeline(self):
        """Test job creation and processing pipeline"""
        print("\n⚙️ Testing Job Pipeline...")
        
        # Test job trigger
        job_data = {
            "type": "monday_api_call",
            "payload": {
                "query": "{ me { name } }",
                "label": "test"
            }
        }
        
        try:
            # Create job
            response = requests.post(f"{self.hub_url}/api/jobs/trigger", json=job_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                if result and result.get("job", {}).get("job_id"):
                    job_id = result["job"]["job_id"]
                    self.log_test("Job pipeline: POST /api/jobs/trigger creates a job", True)
                    
                    # Wait 6 seconds for job processing
                    print("⏳ Waiting 6 seconds for job processing...")
                    time.sleep(6)
                    
                    # Check job status
                    jobs_response = requests.get(f"{self.hub_url}/api/jobs/", timeout=10)
                    
                    if jobs_response.status_code == 200:
                        jobs_data = jobs_response.json()
                        # Look for our job in the jobs list
                        found_job = None
                        if isinstance(jobs_data, list):
                            found_job = next((job for job in jobs_data if job.get("job_id") == job_id), None)
                        elif isinstance(jobs_data, dict) and "jobs" in jobs_data:
                            found_job = next((job for job in jobs_data["jobs"] if job.get("job_id") == job_id), None)
                        
                        if found_job and found_job.get("status") == "done":
                            skipped = found_job.get("result", {}).get("skipped", False)
                            if skipped:
                                self.log_test("Job pipeline: Job processed as 'done' with skipped=true (no API key in dev)", True)
                                return True
                            else:
                                self.log_test("Job pipeline: Job processed as 'done' with skipped=true (no API key in dev)", False,
                                            f"Job done but skipped={skipped}")
                        else:
                            status = found_job.get("status") if found_job else "not found"
                            self.log_test("Job pipeline: Job processed as 'done' with skipped=true (no API key in dev)", False,
                                        f"Job status: {status}")
                    else:
                        self.log_test("Job pipeline: Job processed as 'done' with skipped=true (no API key in dev)", False,
                                    f"Failed to get jobs list: {jobs_response.status_code}")
                else:
                    self.log_test("Job pipeline: POST /api/jobs/trigger creates a job", False, "No job_id in job response")
            else:
                self.log_test("Job pipeline: POST /api/jobs/trigger creates a job", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Job pipeline: POST /api/jobs/trigger creates a job", False, f"Exception: {e}")
        
        return False

    def test_admin_login(self):
        """Test main app admin login"""
        print("\n🔐 Testing Main App Admin Login...")
        
        login_data = {
            "email": "teck@koh.one",
            "password": "Acdb##0897"  # Use 'password' not 'contrasena'
        }
        
        try:
            response = requests.post(f"{self.main_app_url}/api/auth-v2/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.log_test("Main app admin login: POST /api/auth-v2/login with teck@koh.one returns token", True)
                    return True
                else:
                    self.log_test("Main app admin login: POST /api/auth-v2/login with teck@koh.one returns token", False,
                                "No token in response")
            else:
                self.log_test("Main app admin login: POST /api/auth-v2/login with teck@koh.one returns token", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Main app admin login: POST /api/auth-v2/login with teck@koh.one returns token", False, f"Exception: {e}")
        
        return False

    def test_main_app_logs_delegation(self):
        """Test main app logs show delegation messages and NOT polling messages"""
        print("\n📋 Testing Main App Log Messages...")
        
        # Check supervisor logs for main app
        import subprocess
        try:
            # Check backend logs for delegation messages
            result = subprocess.run(
                ["tail", "-n", "50", "/var/log/supervisor/backend.out.log"],
                capture_output=True, text=True, timeout=10
            )
            
            logs = result.stdout
            
            # Check for delegation messages (positive tests)
            delegation_messages = [
                "Monday background workers delegated to Integration Hub",
                "Background pollers delegated to Integration Hub"
            ]
            
            found_delegation = 0
            for msg in delegation_messages:
                if msg in logs:
                    found_delegation += 1
                    self.log_test(f"Main app logs show '{msg}'", True)
                else:
                    self.log_test(f"Main app logs show '{msg}'", False, "Message not found in logs")
            
            # Check for polling messages (negative tests - should NOT be present)
            polling_messages = [
                "Telegram community feed polling started",
                "[GmailPoller] Background polling started"
            ]
            
            found_polling = 0
            for msg in polling_messages:
                if msg in logs:
                    found_polling += 1
                    self.log_test(f"Main app does NOT run {msg.split()[0]} polling", False, f"Found '{msg}' in logs")
                else:
                    self.log_test(f"Main app does NOT run {msg.split()[0]} polling", True)
            
            return found_delegation >= 2 and found_polling == 0
            
        except Exception as e:
            self.log_test("Main app log analysis", False, f"Exception: {e}")
            return False

    def test_hub_connections(self):
        """Test Hub connections endpoint"""
        print("\n🔌 Testing Hub Connections...")
        
        try:
            response = requests.get(f"{self.hub_url}/api/debug/connections", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("connections", {}).get("mongodb", {}).get("status") == "connected":
                    self.log_test("Hub connections: GET /api/debug/connections shows mongodb=connected", True)
                    return True
                else:
                    self.log_test("Hub connections: GET /api/debug/connections shows mongodb=connected", False,
                                f"Expected mongodb=connected, got {data.get('connections', {}).get('mongodb', {}).get('status')}")
            else:
                self.log_test("Hub connections: GET /api/debug/connections shows mongodb=connected", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Hub connections: GET /api/debug/connections shows mongodb=connected", False, f"Exception: {e}")
        
        return False

    def test_hub_env(self):
        """Test Hub environment variables"""
        print("\n🌍 Testing Hub Environment Variables...")
        
        try:
            response = requests.get(f"{self.hub_url}/api/debug/env", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("MONGO_URL") == "set" and data.get("DB_NAME") == "set":
                    self.log_test("Hub env: GET /api/debug/env shows MONGO_URL=set, DB_NAME=set", True)
                    return True
                else:
                    self.log_test("Hub env: GET /api/debug/env shows MONGO_URL=set, DB_NAME=set", False,
                                f"Expected both set, got MONGO_URL={data.get('MONGO_URL')}, DB_NAME={data.get('DB_NAME')}")
            else:
                self.log_test("Hub env: GET /api/debug/env shows MONGO_URL=set, DB_NAME=set", False,
                            f"Expected 200, got {response.status_code}")
                            
        except Exception as e:
            self.log_test("Hub env: GET /api/debug/env shows MONGO_URL=set, DB_NAME=set", False, f"Exception: {e}")
        
        return False

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Integration Hub Migration Tests")
        print("=" * 60)
        
        test_results = []
        
        # Run all tests
        test_results.append(self.test_main_app_health())
        test_results.append(self.test_hub_health())
        test_results.append(self.test_hub_dashboard_status())
        test_results.append(self.test_job_pipeline())
        test_results.append(self.test_admin_login())
        test_results.append(self.test_main_app_logs_delegation())
        test_results.append(self.test_hub_connections())
        test_results.append(self.test_hub_env())
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0:.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for failed in self.failed_tests:
                print(f"  - {failed}")
        
        return all(test_results)

def main():
    tester = IntegrationHubMigrationTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())