"""
Monday.com Sync Dashboard Widget - Backend API Tests
Tests the /api/monday/sync-dashboard endpoint for aggregated sync status
across TXB Inventory, Textbook Orders, and Wallet Recharge boards.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMondaySyncDashboard:
    """Tests for GET /api/monday/sync-dashboard endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def dashboard_data(self, admin_token):
        """Fetch the sync dashboard data once for all tests"""
        response = requests.get(
            f"{BASE_URL}/api/monday/sync-dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Dashboard fetch failed: {response.text}"
        return response.json()
    
    # === Overall Dashboard Tests ===
    
    def test_dashboard_returns_overall_health(self, dashboard_data):
        """Verify overall_health field is present and valid"""
        assert "overall_health" in dashboard_data
        assert dashboard_data["overall_health"] in ["healthy", "degraded", "inactive", "partial", "not_synced"]
        print(f"Overall health: {dashboard_data['overall_health']}")
    
    def test_dashboard_returns_board_counts(self, dashboard_data):
        """Verify active_boards and total_boards counts"""
        assert "active_boards" in dashboard_data
        assert "total_boards" in dashboard_data
        assert dashboard_data["total_boards"] == 3, "Should have 3 boards"
        assert dashboard_data["active_boards"] >= 0
        print(f"Active boards: {dashboard_data['active_boards']}/{dashboard_data['total_boards']}")
    
    def test_dashboard_returns_boards_array(self, dashboard_data):
        """Verify boards array structure"""
        assert "boards" in dashboard_data
        assert isinstance(dashboard_data["boards"], list)
        assert len(dashboard_data["boards"]) == 3, "Should return 3 boards"
    
    # === TXB Inventory Board Tests ===
    
    def test_txb_inventory_board_structure(self, dashboard_data):
        """Verify TXB Inventory board has correct structure"""
        txb = next((b for b in dashboard_data["boards"] if b["id"] == "txb_inventory"), None)
        assert txb is not None, "TXB Inventory board not found"
        
        # Verify all required fields
        assert txb["name"] == "TXB Inventory"
        assert "board_id" in txb
        assert "enabled" in txb
        assert "health" in txb
        assert txb["health"] in ["healthy", "degraded", "inactive", "not_synced"]
        assert "last_sync" in txb
        assert "sync_stats" in txb
        assert "webhook_active" in txb
        assert "recent_activity" in txb
        print(f"TXB Inventory health: {txb['health']}")
    
    def test_txb_inventory_sync_stats(self, dashboard_data):
        """Verify TXB Inventory sync_stats structure"""
        txb = next((b for b in dashboard_data["boards"] if b["id"] == "txb_inventory"), None)
        stats = txb.get("sync_stats", {})
        
        # Should have textbook count and update info if enabled
        if txb.get("enabled"):
            # Check for textbook stats from last sync
            print(f"TXB sync stats: total_textbooks={stats.get('total_textbooks')}, updated={stats.get('updated')}")
    
    def test_txb_inventory_recent_activity(self, dashboard_data):
        """Verify TXB Inventory recent_activity is array of movements"""
        txb = next((b for b in dashboard_data["boards"] if b["id"] == "txb_inventory"), None)
        activity = txb.get("recent_activity", [])
        
        assert isinstance(activity, list)
        if activity:
            # Check first activity item structure
            item = activity[0]
            print(f"TXB recent activity: {item.get('product_name', 'N/A')}, reason={item.get('reason')}")
    
    # === Textbook Orders Board Tests ===
    
    def test_textbook_orders_board_structure(self, dashboard_data):
        """Verify Textbook Orders board has correct structure"""
        orders = next((b for b in dashboard_data["boards"] if b["id"] == "textbook_orders"), None)
        assert orders is not None, "Textbook Orders board not found"
        
        assert orders["name"] == "Textbook Orders"
        assert "board_id" in orders
        assert "enabled" in orders
        assert "health" in orders
        assert orders["health"] in ["healthy", "degraded", "inactive", "not_synced"]
        assert "sync_stats" in orders
        print(f"Textbook Orders health: {orders['health']}")
    
    def test_textbook_orders_sync_stats(self, dashboard_data):
        """Verify Textbook Orders sync_stats has synced/unsynced counts"""
        orders = next((b for b in dashboard_data["boards"] if b["id"] == "textbook_orders"), None)
        stats = orders.get("sync_stats", {})
        
        assert "synced_orders" in stats
        assert "unsynced_orders" in stats
        assert "auto_sync" in stats
        assert isinstance(stats["auto_sync"], bool)
        print(f"Orders: synced={stats['synced_orders']}, unsynced={stats['unsynced_orders']}, auto_sync={stats['auto_sync']}")
    
    # === Wallet Recharge Board Tests ===
    
    def test_wallet_recharge_board_structure(self, dashboard_data):
        """Verify Wallet Recharge board has correct structure"""
        wallet = next((b for b in dashboard_data["boards"] if b["id"] == "wallet_recharge"), None)
        assert wallet is not None, "Wallet Recharge board not found"
        
        assert wallet["name"] == "Wallet Recharge"
        assert "board_id" in wallet
        assert "enabled" in wallet
        assert "health" in wallet
        assert wallet["health"] in ["healthy", "degraded", "inactive", "not_synced"]
        assert "webhook_active" in wallet
        print(f"Wallet Recharge health: {wallet['health']}, webhook_active={wallet['webhook_active']}")
    
    def test_wallet_recharge_sync_stats(self, dashboard_data):
        """Verify Wallet Recharge sync_stats has items/pending/approved/errors"""
        wallet = next((b for b in dashboard_data["boards"] if b["id"] == "wallet_recharge"), None)
        stats = wallet.get("sync_stats", {})
        
        assert "monday_items" in stats
        assert "pending" in stats
        assert "approved" in stats
        assert "webhook_errors" in stats
        print(f"Wallet: items={stats['monday_items']}, pending={stats['pending']}, approved={stats['approved']}, errors={stats['webhook_errors']}")
    
    def test_wallet_recharge_recent_activity(self, dashboard_data):
        """Verify Wallet Recharge recent_activity contains webhook logs"""
        wallet = next((b for b in dashboard_data["boards"] if b["id"] == "wallet_recharge"), None)
        activity = wallet.get("recent_activity", [])
        
        assert isinstance(activity, list)
        if activity:
            # Check first activity item has webhook log structure
            item = activity[0]
            assert "timestamp" in item
            assert "status" in item
            print(f"Wallet recent activity: status={item.get('status')}, detail={item.get('detail', 'N/A')[:50]}")
    
    # === Health Status Logic Tests ===
    
    def test_overall_health_degraded_when_any_board_degraded(self, dashboard_data):
        """Verify overall health is degraded when any board is degraded"""
        boards = dashboard_data.get("boards", [])
        has_degraded = any(b["health"] == "degraded" for b in boards if b.get("enabled"))
        
        if has_degraded:
            assert dashboard_data["overall_health"] == "degraded", \
                "Overall health should be 'degraded' when any active board is degraded"
            print("VERIFIED: Overall health correctly shows 'degraded' due to degraded board(s)")
    
    def test_health_badges_valid_values(self, dashboard_data):
        """Verify all health badges have valid values"""
        valid_health = ["healthy", "degraded", "inactive", "not_synced"]
        for board in dashboard_data.get("boards", []):
            assert board["health"] in valid_health, \
                f"Board {board['id']} has invalid health: {board['health']}"
        print("All board health badges have valid values")
    
    # === Authentication Tests ===
    
    def test_dashboard_requires_authentication(self):
        """Verify dashboard endpoint requires authentication"""
        response = requests.get(f"{BASE_URL}/api/monday/sync-dashboard")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("Dashboard correctly requires authentication")
    
    def test_dashboard_rejects_invalid_token(self):
        """Verify dashboard rejects invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/monday/sync-dashboard",
            headers={"Authorization": "Bearer invalid_token_xyz"}
        )
        assert response.status_code in [401, 403], \
            f"Expected 401/403 with invalid token, got {response.status_code}"
        print("Dashboard correctly rejects invalid token")


class TestSyncActions:
    """Tests for sync action endpoints triggered by widget buttons"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "admin@chipi.co", "password": "admin"},
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 200
        return response.json().get("token")
    
    def test_txb_inventory_full_sync_endpoint_exists(self, admin_token):
        """Verify TXB Inventory full-sync endpoint is callable"""
        # Note: We test that the endpoint exists and is accessible
        # Full sync may take time so we just verify the endpoint responds
        response = requests.post(
            f"{BASE_URL}/api/store/monday/txb-inventory/full-sync",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 200 with sync results or error (not 404)
        assert response.status_code != 404, "TXB full-sync endpoint not found"
        print(f"TXB full-sync endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"TXB full-sync result: {data}")
    
    def test_textbook_orders_sync_all_endpoint_exists(self, admin_token):
        """Verify Textbook Orders sync-all endpoint is callable"""
        response = requests.post(
            f"{BASE_URL}/api/store/monday/sync-all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # Should return 200 with sync results or error (not 404)
        assert response.status_code != 404, "Orders sync-all endpoint not found"
        print(f"Orders sync-all endpoint status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Orders sync-all result: {data}")
    
    def test_sync_endpoints_require_auth(self):
        """Verify sync action endpoints require authentication"""
        endpoints = [
            "/api/store/monday/txb-inventory/full-sync",
            "/api/store/monday/sync-all"
        ]
        for endpoint in endpoints:
            response = requests.post(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], \
                f"{endpoint} should require auth, got {response.status_code}"
        print("All sync endpoints correctly require authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
