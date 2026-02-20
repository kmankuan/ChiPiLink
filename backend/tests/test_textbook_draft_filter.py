"""
Test for textbook order draft filtering and useGuardedAction hook implementation
Tests: 1) Draft orders filtered from admin view, 2) Frontend components use useGuardedAction
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTextbookDraftFiltering:
    """Tests for draft order filtering from admin view"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@chipi.co",
            "password": "admin"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_api_health(self):
        """Test API is healthy"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
        print("✓ API health check passed")
    
    def test_admin_orders_requires_auth(self):
        """Test admin orders endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/store/textbook-orders/admin/all")
        assert response.status_code in [401, 403]
        print("✓ Admin orders endpoint requires authentication")
    
    def test_admin_orders_no_drafts(self, admin_token):
        """Test admin orders endpoint excludes draft orders"""
        response = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        data = response.json()
        orders = data.get("orders", [])
        
        # Check no order has status='draft'
        draft_orders = [o for o in orders if o.get("status") == "draft"]
        assert len(draft_orders) == 0, f"Found {len(draft_orders)} draft orders that should be filtered"
        
        # Log the statuses found
        statuses = set(o.get("status") for o in orders)
        print(f"✓ Admin orders returned {len(orders)} orders with statuses: {statuses}")
        print(f"✓ No draft orders found in admin view (draft filtering working)")


class TestUseGuardedActionHook:
    """Tests for useGuardedAction hook implementation in frontend"""
    
    def test_hook_file_exists(self):
        """Test useGuardedAction hook file exists"""
        hook_path = "/app/frontend/src/hooks/useGuardedAction.js"
        assert os.path.exists(hook_path), "useGuardedAction.js hook file does not exist"
        print(f"✓ useGuardedAction hook exists at {hook_path}")
    
    def test_hook_has_guard_ref(self):
        """Test hook uses ref-based guard for blocking"""
        hook_path = "/app/frontend/src/hooks/useGuardedAction.js"
        with open(hook_path, 'r') as f:
            content = f.read()
        
        assert "useRef" in content, "Hook should use useRef"
        assert "guardRef" in content, "Hook should have guardRef"
        assert "guardRef.current" in content, "Hook should check guardRef.current"
        print("✓ useGuardedAction hook uses ref-based guard")
    
    def test_hook_returns_execute_and_isrunning(self):
        """Test hook returns [execute, isRunning]"""
        hook_path = "/app/frontend/src/hooks/useGuardedAction.js"
        with open(hook_path, 'r') as f:
            content = f.read()
        
        assert "isRunning" in content, "Hook should have isRunning state"
        assert "return [execute, isRunning]" in content, "Hook should return [execute, isRunning]"
        print("✓ useGuardedAction hook returns [execute, isRunning]")


class TestSchoolTextbooksViewIntegration:
    """Tests for useGuardedAction integration in SchoolTextbooksView"""
    
    def test_imports_use_guarded_action(self):
        """Test SchoolTextbooksView imports useGuardedAction"""
        view_path = "/app/frontend/src/modules/unatienda/components/SchoolTextbooksView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        assert "import { useGuardedAction }" in content or "import {useGuardedAction}" in content, \
            "SchoolTextbooksView should import useGuardedAction"
        assert "from '@/hooks/useGuardedAction'" in content, \
            "Should import from @/hooks/useGuardedAction"
        print("✓ SchoolTextbooksView imports useGuardedAction")
    
    def test_uses_execute_submit(self):
        """Test SchoolTextbooksView uses executeSubmit wrapper"""
        view_path = "/app/frontend/src/modules/unatienda/components/SchoolTextbooksView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        assert "[executeSubmit, submitting] = useGuardedAction()" in content, \
            "Should destructure [executeSubmit, submitting] from useGuardedAction()"
        print("✓ SchoolTextbooksView uses [executeSubmit, submitting] = useGuardedAction()")
    
    def test_handle_confirm_order_uses_execute_submit(self):
        """Test handleConfirmOrder uses executeSubmit wrapper"""
        view_path = "/app/frontend/src/modules/unatienda/components/SchoolTextbooksView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        # Check handleConfirmOrder uses executeSubmit
        assert "handleConfirmOrder = () => executeSubmit(async ()" in content, \
            "handleConfirmOrder should use executeSubmit wrapper"
        print("✓ SchoolTextbooksView handleConfirmOrder uses executeSubmit wrapper")
    
    def test_no_manual_set_submitting(self):
        """Test SchoolTextbooksView doesn't use manual setSubmitting for order confirmation"""
        view_path = "/app/frontend/src/modules/unatienda/components/SchoolTextbooksView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        # Check that the main component doesn't have setSubmitting (the InlineStudentForm does use it, which is fine)
        # The key is that handleConfirmOrder doesn't use setSubmitting manually
        confirm_order_section = content[content.find("handleConfirmOrder"):content.find("handleReorderRequest")]
        assert "setSubmitting(true)" not in confirm_order_section, \
            "handleConfirmOrder should not manually call setSubmitting(true)"
        assert "setSubmitting(false)" not in confirm_order_section, \
            "handleConfirmOrder should not manually call setSubmitting(false)"
        print("✓ SchoolTextbooksView handleConfirmOrder doesn't use manual setSubmitting")


class TestTextbookOrderViewIntegration:
    """Tests for useGuardedAction integration in TextbookOrderView"""
    
    def test_imports_use_guarded_action(self):
        """Test TextbookOrderView imports useGuardedAction"""
        view_path = "/app/frontend/src/modules/unatienda/components/TextbookOrderView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        assert "import { useGuardedAction }" in content or "import {useGuardedAction}" in content, \
            "TextbookOrderView should import useGuardedAction"
        assert "from '@/hooks/useGuardedAction'" in content, \
            "Should import from @/hooks/useGuardedAction"
        print("✓ TextbookOrderView imports useGuardedAction")
    
    def test_uses_execute_submit(self):
        """Test TextbookOrderView uses executeSubmit wrapper"""
        view_path = "/app/frontend/src/modules/unatienda/components/TextbookOrderView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        assert "[executeSubmit, submitting] = useGuardedAction()" in content, \
            "Should destructure [executeSubmit, submitting] from useGuardedAction()"
        print("✓ TextbookOrderView uses [executeSubmit, submitting] = useGuardedAction()")
    
    def test_handle_confirm_submit_order_uses_execute_submit(self):
        """Test handleConfirmSubmitOrder uses executeSubmit wrapper"""
        view_path = "/app/frontend/src/modules/unatienda/components/TextbookOrderView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        # Check handleConfirmSubmitOrder uses executeSubmit
        assert "handleConfirmSubmitOrder = () => executeSubmit(async ()" in content, \
            "handleConfirmSubmitOrder should use executeSubmit wrapper"
        print("✓ TextbookOrderView handleConfirmSubmitOrder uses executeSubmit wrapper")
    
    def test_no_manual_set_submitting_in_confirm(self):
        """Test TextbookOrderView doesn't use manual setSubmitting in confirmation"""
        view_path = "/app/frontend/src/modules/unatienda/components/TextbookOrderView.jsx"
        with open(view_path, 'r') as f:
            content = f.read()
        
        # Check that handleConfirmSubmitOrder doesn't have setSubmitting
        confirm_section = content[content.find("handleConfirmSubmitOrder"):content.find("handleReorderRequest")]
        assert "setSubmitting(true)" not in confirm_section, \
            "handleConfirmSubmitOrder should not manually call setSubmitting(true)"
        assert "setSubmitting(false)" not in confirm_section, \
            "handleConfirmSubmitOrder should not manually call setSubmitting(false)"
        print("✓ TextbookOrderView handleConfirmSubmitOrder doesn't use manual setSubmitting")


class TestBackendRepositoryDraftFilter:
    """Tests for backend repository draft filtering"""
    
    def test_repository_get_all_excludes_drafts(self):
        """Test repository get_all method excludes draft orders"""
        repo_path = "/app/backend/modules/store/repositories/textbook_order_repository.py"
        with open(repo_path, 'r') as f:
            content = f.read()
        
        # Find the get_all method
        get_all_match = re.search(r'async def get_all\([^)]*\):[^}]+?query = \{([^}]+)\}', content, re.DOTALL)
        assert get_all_match, "get_all method should exist"
        
        query_content = get_all_match.group(1)
        assert '"status":' in query_content, "get_all should have status filter"
        assert '"$ne":' in query_content, "get_all should use $ne operator"
        assert '"draft"' in query_content, "get_all should filter out 'draft'"
        print("✓ Backend repository get_all method excludes draft orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
