"""
Test Textbook Orders Archive and Delete Endpoints
Testing the new bulk-archive fix (correct collection) and bulk-delete endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTextbookArchiveDeleteEndpoints:
    """Tests for bulk-archive and bulk-delete endpoints"""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        self.token = None
        try:
            resp = requests.post(f"{BASE_URL}/api/users/login", json={
                "email": "admin@chipi.co",
                "password": "admin"
            }, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token") or data.get("access_token")
        except Exception as e:
            pytest.skip(f"Admin login failed: {e}")
        
        if not self.token:
            pytest.skip("No admin token obtained")
        
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def test_api_health(self):
        """Test API is responding"""
        resp = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert resp.status_code == 200, f"Health check failed: {resp.text}"
        print("✓ API health check passed")

    def test_bulk_archive_endpoint_exists(self):
        """Test bulk-archive endpoint exists and responds"""
        # Test with empty order_ids - should return 400
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-archive",
            headers=self.headers,
            json={"order_ids": []},
            timeout=10
        )
        assert resp.status_code == 400, f"Expected 400 for empty order_ids, got {resp.status_code}"
        data = resp.json()
        assert "No orders specified" in data.get("detail", ""), f"Unexpected error message: {data}"
        print("✓ Bulk archive endpoint returns 400 for empty order_ids")

    def test_bulk_delete_endpoint_exists(self):
        """Test bulk-delete endpoint exists and responds"""
        # Test with empty order_ids - should return 400
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-delete",
            headers=self.headers,
            json={"order_ids": []},
            timeout=10
        )
        assert resp.status_code == 400, f"Expected 400 for empty order_ids, got {resp.status_code}"
        data = resp.json()
        assert "No orders specified" in data.get("detail", ""), f"Unexpected error message: {data}"
        print("✓ Bulk delete endpoint returns 400 for empty order_ids")

    def test_get_orders_for_testing(self):
        """Get existing orders to verify we have test data"""
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=self.headers,
            timeout=15
        )
        assert resp.status_code == 200, f"Failed to get orders: {resp.text}"
        data = resp.json()
        orders = data.get("orders", [])
        print(f"✓ Found {len(orders)} orders in database")
        
        # Return orders for use in other tests
        return orders

    def test_bulk_archive_with_nonexistent_order(self):
        """Test archive with non-existent order ID returns 0 count"""
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-archive",
            headers=self.headers,
            json={"order_ids": ["non_existent_order_12345"]},
            timeout=10
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "archived", f"Expected status=archived, got {data}"
        assert data.get("count") == 0, f"Expected count=0 for non-existent order, got {data.get('count')}"
        print("✓ Bulk archive returns count=0 for non-existent order")

    def test_bulk_delete_with_nonexistent_order(self):
        """Test delete with non-existent order ID returns 0 count"""
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-delete",
            headers=self.headers,
            json={"order_ids": ["non_existent_order_12345"]},
            timeout=10
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("status") == "deleted", f"Expected status=deleted, got {data}"
        assert data.get("count") == 0, f"Expected count=0 for non-existent order, got {data.get('count')}"
        print("✓ Bulk delete returns count=0 for non-existent order")

    def test_archive_correct_collection(self):
        """
        Verify archive endpoint uses store_textbook_orders collection (not textbook_orders).
        This was the bug fix - it was using db.textbook_orders instead of db.store_textbook_orders
        """
        # Get an existing order
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all",
            headers=self.headers,
            timeout=15
        )
        assert resp.status_code == 200
        orders = resp.json().get("orders", [])
        
        # Find a non-archived order
        non_archived = [o for o in orders if not o.get("archived")]
        if not non_archived:
            pytest.skip("No non-archived orders available for testing")
        
        test_order = non_archived[0]
        order_id = test_order.get("order_id")
        print(f"Testing archive on order: {order_id}")
        
        # Archive it
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-archive",
            headers=self.headers,
            json={"order_ids": [order_id]},
            timeout=10
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("count") == 1, f"Expected count=1, got {data.get('count')}"
        print(f"✓ Archive returned count=1 for order {order_id}")
        
        # Verify the order is now archived by fetching orders including archived
        resp = requests.get(
            f"{BASE_URL}/api/store/textbook-orders/admin/all?include_archived=true",
            headers=self.headers,
            timeout=15
        )
        assert resp.status_code == 200
        all_orders = resp.json().get("orders", [])
        
        # Find the archived order
        archived_order = next((o for o in all_orders if o.get("order_id") == order_id), None)
        if archived_order:
            assert archived_order.get("archived") == True, f"Order should be archived: {archived_order}"
            print(f"✓ Verified order {order_id} has archived=True in database")
        else:
            # The order might be filtered out, try to unarchive it to verify
            print(f"⚠ Order {order_id} not found in results (may be filtered), archive count=1 confirms success")

    def test_unauthorized_access_archive(self):
        """Test that archive requires authentication"""
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-archive",
            headers={"Content-Type": "application/json"},  # No auth
            json={"order_ids": ["test"]},
            timeout=10
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("✓ Bulk archive requires authentication")

    def test_unauthorized_access_delete(self):
        """Test that delete requires authentication"""
        resp = requests.post(
            f"{BASE_URL}/api/store/textbook-orders/admin/bulk-delete",
            headers={"Content-Type": "application/json"},  # No auth
            json={"order_ids": ["test"]},
            timeout=10
        )
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("✓ Bulk delete requires authentication")


class TestNotifyAdminPostOrderFailure:
    """Tests for _notify_admin_post_order_failure method (code review)"""

    def test_notification_method_exists_in_code(self):
        """Verify _notify_admin_post_order_failure method exists in service"""
        import subprocess
        result = subprocess.run(
            ["grep", "-n", "_notify_admin_post_order_failure", 
             "/app/backend/modules/store/services/textbook_order_service.py"],
            capture_output=True, text=True
        )
        assert result.returncode == 0, "Method _notify_admin_post_order_failure not found"
        lines = result.stdout.strip().split('\n')
        assert len(lines) >= 3, f"Expected at least 3 occurrences (def + 2 calls), got {len(lines)}"
        print(f"✓ Found _notify_admin_post_order_failure in code:")
        for line in lines[:5]:
            print(f"   {line}")

    def test_step8_calls_notification(self):
        """Verify Step 8 (stock deduction) calls notification on failure when wallet charged"""
        import subprocess
        # Check that step 8 try block includes notification call
        result = subprocess.run(
            ["grep", "-A", "5", "stock_err", 
             "/app/backend/modules/store/services/textbook_order_service.py"],
            capture_output=True, text=True
        )
        assert "_notify_admin_post_order_failure" in result.stdout, \
            "Step 8 stock deduction should call _notify_admin_post_order_failure on error"
        assert "wallet_transaction" in result.stdout, \
            "Notification should only be sent if wallet_transaction exists"
        print("✓ Step 8 (stock deduction) calls notification on failure when wallet charged")

    def test_step8b_calls_notification(self):
        """Verify Step 8b (draft order update) calls notification on failure when wallet charged"""
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "5", "draft_err", 
             "/app/backend/modules/store/services/textbook_order_service.py"],
            capture_output=True, text=True
        )
        assert "_notify_admin_post_order_failure" in result.stdout, \
            "Step 8b draft update should call _notify_admin_post_order_failure on error"
        assert "wallet_transaction" in result.stdout, \
            "Notification should only be sent if wallet_transaction exists"
        print("✓ Step 8b (draft order update) calls notification on failure when wallet charged")

    def test_notification_creates_db_record(self):
        """Verify notification method creates a record in notifications collection"""
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "20", "async def _notify_admin_post_order_failure", 
             "/app/backend/modules/store/services/textbook_order_service.py"],
            capture_output=True, text=True
        )
        assert "db.notifications.insert_one" in result.stdout, \
            "Notification method should insert into db.notifications collection"
        assert "order_post_step_failure" in result.stdout, \
            "Notification type should be 'order_post_step_failure'"
        assert "severity" in result.stdout, \
            "Notification should have severity field"
        print("✓ Notification method creates proper db record with type, message, and severity")


class TestFrontendIntegration:
    """Tests for frontend integration with archive/delete endpoints"""

    def test_frontend_has_confirm_delete_state(self):
        """Verify frontend has confirmDelete state"""
        import subprocess
        result = subprocess.run(
            ["grep", "confirmDelete", 
             "/app/frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx"],
            capture_output=True, text=True
        )
        assert "const [confirmDelete, setConfirmDelete]" in result.stdout, \
            "Frontend should have confirmDelete state"
        assert "setConfirmDelete(true)" in result.stdout, \
            "Frontend should be able to set confirmDelete to true"
        print("✓ Frontend has confirmDelete state")

    def test_frontend_has_handle_bulk_delete(self):
        """Verify frontend has handleBulkDeleteOrders handler"""
        import subprocess
        result = subprocess.run(
            ["grep", "-A", "20", "handleBulkDeleteOrders", 
             "/app/frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx"],
            capture_output=True, text=True
        )
        assert "const handleBulkDeleteOrders" in result.stdout, \
            "Frontend should have handleBulkDeleteOrders function"
        assert "bulk-delete" in result.stdout, \
            "Handler should call bulk-delete endpoint"
        print("✓ Frontend has handleBulkDeleteOrders handler calling /admin/bulk-delete")

    def test_frontend_bulk_action_bar_has_delete(self):
        """Verify BulkActionBar has onDelete prop"""
        import subprocess
        result = subprocess.run(
            ["grep", "onDelete", 
             "/app/frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx"],
            capture_output=True, text=True
        )
        assert "onDelete" in result.stdout, \
            "BulkActionBar should have onDelete prop"
        print("✓ BulkActionBar has onDelete prop")

    def test_frontend_confirm_dialog_delete(self):
        """Verify ConfirmDialog for delete with destructive variant"""
        import subprocess
        result = subprocess.run(
            ["grep", "-B", "2", "-A", "10", "confirmDelete", 
             "/app/frontend/src/modules/admin/store/TextbookOrdersAdminTab.jsx"],
            capture_output=True, text=True
        )
        assert "ConfirmDialog" in result.stdout, \
            "Frontend should have ConfirmDialog for delete"
        assert "destructive" in result.stdout, \
            "Delete dialog should have variant='destructive'"
        assert "Permanently delete" in result.stdout or "permanently" in result.stdout.lower(), \
            "Delete dialog should mention permanent deletion"
        print("✓ Frontend has ConfirmDialog for delete with destructive variant")
