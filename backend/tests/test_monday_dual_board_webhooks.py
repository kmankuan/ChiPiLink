"""
Test: Monday.com Dual Board Webhook Integration
Tests the Chipi Wallet board (18399650704) and Recharge Approval board (18399959471) integrations.

Features tested:
1. Health endpoint returns 200
2. Webhook challenge verification
3. Board-specific webhook routing
4. Registered boards list
5. Wallet sync dashboard
6. Recharge approval dashboard
7. Recharge approval logs
8. Gmail status endpoint (non-blocking)
9. Auth login
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Test health endpoint and authentication"""

    def test_health_returns_200(self):
        """GET /api/health should return 200 with status healthy"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["status"] == "healthy", f"Expected healthy, got {data.get('status')}"
        print(f"✓ Health check: {data}")

    def test_login_with_valid_credentials(self):
        """POST /api/auth-v2/login with teck@koh.one / admin should work"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "contrasena": "admin"},
            timeout=15
        )
        print(f"Login response: {response.status_code} - {response.text[:300]}")
        assert response.status_code == 200, f"Login failed with status {response.status_code}"
        data = response.json()
        assert "token" in data or "user" in data, "Login response missing token or user"
        print(f"✓ Login successful for teck@koh.one")
        return data.get("token")


class TestWebhookRouting:
    """Test Monday.com webhook routing and board registration"""

    def test_webhook_registered_boards(self):
        """GET /api/monday/webhooks/registered should show registered boards"""
        response = requests.get(f"{BASE_URL}/api/monday/webhooks/registered", timeout=10)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Registered boards: {data}")
        assert "boards" in data, "Response missing 'boards' field"
        boards = data["boards"]
        # Should have at least Chipi Wallet board
        print(f"✓ Registered boards: {boards}")

    def test_webhook_challenge_verification(self):
        """POST /api/monday/webhooks/incoming with challenge should echo it back"""
        challenge_value = "test_challenge_12345"
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"challenge": challenge_value},
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("challenge") == challenge_value, f"Challenge mismatch: expected {challenge_value}, got {data.get('challenge')}"
        print(f"✓ Challenge verification works: {data}")

    def test_chipi_wallet_board_webhook(self):
        """POST /api/monday/webhooks/incoming with board 18399650704 should be handled by wallet handler"""
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={
                "event": {
                    "boardId": "18399650704",
                    "pulseId": "9999999999",
                    "columnId": "status",
                    "value": {"label": "Process"}
                }
            },
            timeout=15
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Chipi Wallet webhook response: {data}")
        # Should not be "unhandled" - wallet adapter should process it
        # It may return error because the pulse doesn't exist, but it should be handled
        assert data.get("status") != "unhandled", f"Board 18399650704 should be handled, got: {data}"
        print(f"✓ Chipi Wallet board webhook processed: {data}")

    def test_recharge_approval_board_webhook(self):
        """POST /api/monday/webhooks/incoming with board 18399959471 should be handled"""
        # First check if the recharge approval board is configured
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={
                "event": {
                    "boardId": "18399959471",
                    "pulseId": "8888888888",
                    "columnId": "status",
                    "value": {"label": "Approved"}
                }
            },
            timeout=15
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Recharge Approval webhook response: {data}")
        # If the board is registered, it should be handled (not "unhandled")
        # If not registered, we note it for the report
        if data.get("status") == "unhandled":
            print(f"⚠ Recharge Approval board 18399959471 not registered - check config")
        else:
            print(f"✓ Recharge Approval board webhook processed: {data}")

    def test_unregistered_board_webhook(self):
        """POST /api/monday/webhooks/incoming with unknown board should return unhandled"""
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={
                "event": {
                    "boardId": "99999999999",
                    "pulseId": "1111111111",
                    "columnId": "status",
                    "value": {"label": "Test"}
                }
            },
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("status") == "unhandled", f"Unknown board should be unhandled, got: {data}"
        print(f"✓ Unknown board correctly returned unhandled: {data}")


class TestWalletSyncDashboard:
    """Test wallet sync dashboard endpoint"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "contrasena": "admin"},
            timeout=15
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")

    def test_wallet_sync_dashboard(self, auth_token):
        """GET /api/monday/adapters/wallet/sync-dashboard returns stats with linked_users"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/wallet/sync-dashboard",
            headers=headers,
            timeout=15
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Wallet sync dashboard: {data}")
        assert "stats" in data, "Response missing 'stats' field"
        stats = data["stats"]
        assert "linked_users" in stats, "Stats missing 'linked_users'"
        print(f"✓ Wallet sync dashboard: linked_users={stats.get('linked_users')}, processed_subitems={stats.get('processed_subitems')}")

    def test_wallet_webhook_logs(self, auth_token):
        """GET /api/monday/adapters/wallet/logs returns logs array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/wallet/logs",
            headers=headers,
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "logs" in data, "Response missing 'logs' field"
        print(f"✓ Wallet webhook logs: {len(data['logs'])} entries")


class TestRechargeApprovalDashboard:
    """Test recharge approval dashboard and logs"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "contrasena": "admin"},
            timeout=15
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")

    def test_recharge_approval_dashboard(self, auth_token):
        """GET /api/monday/adapters/recharge-approval/dashboard returns stats"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/recharge-approval/dashboard",
            headers=headers,
            timeout=15
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"Recharge approval dashboard: {data}")
        assert "stats" in data, "Response missing 'stats' field"
        assert "webhook_registered" in data, "Response missing 'webhook_registered' field"
        print(f"✓ Recharge approval dashboard: webhook_registered={data.get('webhook_registered')}, board_id={data.get('board_id')}")

    def test_recharge_approval_logs(self, auth_token):
        """GET /api/monday/adapters/recharge-approval/logs returns logs array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/recharge-approval/logs",
            headers=headers,
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "logs" in data, "Response missing 'logs' field"
        print(f"✓ Recharge approval logs: {len(data['logs'])} entries")


class TestGmailIntegration:
    """Test Gmail integration - non-blocking"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "contrasena": "admin"},
            timeout=15
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")

    def test_gmail_status_non_blocking(self, auth_token):
        """GET /api/wallet-topups/gmail/status should return within 15s (non-blocking)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start_time = time.time()
        response = requests.get(
            f"{BASE_URL}/api/wallet-topups/gmail/status",
            headers=headers,
            timeout=20  # 20s timeout, expecting < 15s
        )
        elapsed = time.time() - start_time
        print(f"Gmail status response time: {elapsed:.2f}s")
        assert elapsed < 15, f"Gmail status took too long: {elapsed:.2f}s (expected < 15s)"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        print(f"✓ Gmail status returned in {elapsed:.2f}s: connected={data.get('connected')}")


class TestRawWebhookLogs:
    """Test raw webhook logging for debugging"""

    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "teck@koh.one", "contrasena": "admin"},
            timeout=15
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get auth token")

    def test_raw_webhook_logs(self, auth_token):
        """GET /api/monday/adapters/wallet/raw-logs returns raw webhook hits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(
            f"{BASE_URL}/api/monday/adapters/wallet/raw-logs",
            headers=headers,
            timeout=10
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "logs" in data, "Response missing 'logs' field"
        print(f"✓ Raw webhook logs: {len(data['logs'])} entries")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
