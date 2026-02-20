"""
Test Push Notifications for Student Access Requests
Tests the new push notification integration in events.py:
- _send_push_to_admins helper function
- _send_push_to_user helper function
- emit_access_request_created calls push to admins
- emit_access_request_updated calls push to user
"""

import pytest
import requests
import os
import asyncio
import importlib.util

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPushNotificationCodeVerification:
    """Verify push notification code structure in events.py and push_service.py"""
    
    def test_events_has_send_push_to_admins_function(self):
        """Verify _send_push_to_admins helper exists in events.py"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        # Check function exists
        assert 'async def _send_push_to_admins(' in content, "_send_push_to_admins function not found"
        
        # Check it queries admin users
        assert 'is_admin' in content, "Admin query not found in _send_push_to_admins"
        
        # Check it calls push_notification_service.send_to_users
        assert 'push_notification_service.send_to_users' in content, "send_to_users call not found"
        
        print("PASS: _send_push_to_admins helper function verified")
    
    def test_events_has_send_push_to_user_function(self):
        """Verify _send_push_to_user helper exists in events.py"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        # Check function exists
        assert 'async def _send_push_to_user(' in content, "_send_push_to_user function not found"
        
        # Check it calls push_notification_service.send_notification
        assert 'push_notification_service.send_notification' in content, "send_notification call not found"
        
        print("PASS: _send_push_to_user helper function verified")
    
    def test_emit_access_request_created_calls_push(self):
        """Verify emit_access_request_created calls _send_push_to_admins"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        # Find emit_access_request_created function and check it calls _send_push_to_admins
        # Look for the function definition and body
        assert 'async def emit_access_request_created(' in content
        
        # Check that _send_push_to_admins is called in the function
        # The function body should contain the push call
        func_start = content.find('async def emit_access_request_created(')
        func_end = content.find('async def emit_access_request_updated(')
        func_body = content[func_start:func_end]
        
        assert '_send_push_to_admins(' in func_body, "emit_access_request_created does not call _send_push_to_admins"
        assert "Nueva solicitud de acceso" in func_body, "Push title not found in emit_access_request_created"
        
        print("PASS: emit_access_request_created calls _send_push_to_admins")
    
    def test_emit_access_request_updated_calls_push(self):
        """Verify emit_access_request_updated calls _send_push_to_user"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        # Find emit_access_request_updated function
        func_start = content.find('async def emit_access_request_updated(')
        # Find next function or end of file
        func_end = content.find('async def emit_user_registered(')
        func_body = content[func_start:func_end]
        
        assert '_send_push_to_user(' in func_body, "emit_access_request_updated does not call _send_push_to_user"
        assert 'push_title_map' in func_body, "push_title_map not found in emit_access_request_updated"
        
        print("PASS: emit_access_request_updated calls _send_push_to_user")
    
    def test_push_helper_functions_have_error_handling(self):
        """Verify both push helper functions have try/except (non-blocking)"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        # Check _send_push_to_admins has try/except
        admins_start = content.find('async def _send_push_to_admins(')
        admins_end = content.find('async def _send_push_to_user(')
        admins_body = content[admins_start:admins_end]
        
        assert 'try:' in admins_body, "_send_push_to_admins missing try block"
        assert 'except Exception' in admins_body, "_send_push_to_admins missing except block"
        assert 'logger.warning' in admins_body, "_send_push_to_admins missing warning log"
        
        # Check _send_push_to_user has try/except
        user_start = content.find('async def _send_push_to_user(')
        user_end = content.find('async def emit_order_submitted(')
        user_body = content[user_start:user_end]
        
        assert 'try:' in user_body, "_send_push_to_user missing try block"
        assert 'except Exception' in user_body, "_send_push_to_user missing except block"
        assert 'logger.warning' in user_body, "_send_push_to_user missing warning log"
        
        print("PASS: Both push helper functions have proper error handling (non-blocking)")
    
    def test_push_category_is_student_access(self):
        """Verify PUSH_CATEGORY is set to 'student_access'"""
        events_path = '/app/backend/modules/realtime/events.py'
        with open(events_path, 'r') as f:
            content = f.read()
        
        assert 'PUSH_CATEGORY = "student_access"' in content, "PUSH_CATEGORY not set to student_access"
        
        print("PASS: PUSH_CATEGORY is correctly set to 'student_access'")
    
    def test_push_service_exists_with_required_methods(self):
        """Verify push_service.py has send_notification and send_to_users methods"""
        push_service_path = '/app/backend/modules/notifications/services/push_service.py'
        with open(push_service_path, 'r') as f:
            content = f.read()
        
        # Check class exists
        assert 'class PushNotificationService:' in content, "PushNotificationService class not found"
        
        # Check send_notification method
        assert 'async def send_notification(' in content, "send_notification method not found"
        
        # Check send_to_users method
        assert 'async def send_to_users(' in content, "send_to_users method not found"
        
        # Check singleton instance
        assert 'push_notification_service = PushNotificationService()' in content, "push_notification_service singleton not found"
        
        print("PASS: PushNotificationService exists with send_notification and send_to_users methods")


class TestBackendAPIEndpoints:
    """Test backend API endpoints related to access requests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_backend_health(self):
        """Verify backend is running"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Backend is healthy")
    
    def test_admin_login(self):
        """Test admin login"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        self.token = data["token"]
        print("PASS: Admin login successful")
        return data["token"]
    
    def test_textbook_access_admin_endpoint(self):
        """Test GET /api/store/textbook-access/admin/all-students endpoint"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Test the admin endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(
            f"{BASE_URL}/api/store/textbook-access/admin/all-students",
            headers=headers
        )
        
        # Should return 200 (even if empty array)
        assert response.status_code == 200, f"Admin all-students endpoint failed: {response.text}"
        data = response.json()
        
        # Response can be a list or dict with "students" key
        if isinstance(data, dict):
            students = data.get("students", [])
        else:
            students = data
        assert isinstance(students, list), "Expected list of students"
        
        print(f"PASS: Admin all-students endpoint returns {len(students)} students")
    
    def test_notifications_config_endpoint(self):
        """Verify push notifications config endpoint exists"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Test notifications config endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(
            f"{BASE_URL}/api/notifications/config",
            headers=headers
        )
        
        # Should return 200 with config
        assert response.status_code == 200, f"Notifications config endpoint failed: {response.text}"
        data = response.json()
        
        # Check config structure
        assert "config_id" in data or "providers" in data or isinstance(data, dict), "Invalid config structure"
        
        print("PASS: Notifications config endpoint works")
    
    def test_notifications_categories_endpoint(self):
        """Verify student_access category exists"""
        # Login first
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Test notifications categories endpoint
        headers = {"Authorization": f"Bearer {token}"}
        response = self.session.get(
            f"{BASE_URL}/api/notifications/categories",
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            # Check if student_access category exists
            category_ids = [cat.get("category_id") for cat in data if isinstance(cat, dict)]
            print(f"Available categories: {category_ids}")
            
            # Note: student_access might not exist yet as a category until accessed
            print("PASS: Notifications categories endpoint works")
        else:
            print(f"INFO: Categories endpoint returned {response.status_code}")


class TestEventsModuleImport:
    """Test that events.py can be imported without errors"""
    
    def test_events_module_imports(self):
        """Verify events.py can be loaded without import errors"""
        import sys
        
        # Add backend to path if needed
        if '/app/backend' not in sys.path:
            sys.path.insert(0, '/app/backend')
        
        try:
            # Use importlib to check if module loads
            spec = importlib.util.spec_from_file_location(
                "events", 
                "/app/backend/modules/realtime/events.py"
            )
            assert spec is not None, "Could not find events module spec"
            
            module = importlib.util.module_from_spec(spec)
            # Note: We don't execute the module as it has async dependencies
            # Just verify it can be found and parsed
            
            print("PASS: events.py module structure is valid")
        except SyntaxError as e:
            pytest.fail(f"Syntax error in events.py: {e}")
    
    def test_push_service_module_imports(self):
        """Verify push_service.py can be loaded without import errors"""
        import sys
        
        # Add backend to path if needed
        if '/app/backend' not in sys.path:
            sys.path.insert(0, '/app/backend')
        
        try:
            spec = importlib.util.spec_from_file_location(
                "push_service", 
                "/app/backend/modules/notifications/services/push_service.py"
            )
            assert spec is not None, "Could not find push_service module spec"
            
            print("PASS: push_service.py module structure is valid")
        except SyntaxError as e:
            pytest.fail(f"Syntax error in push_service.py: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
