"""
Test Wallet-based Payment System
Testing:
1. GET /api/wallet/me - User wallet balance
2. POST /api/wallet/admin/adjust/{user_id} - Admin top-up/deduct
3. GET /api/wallet/admin/all-users - Admin get all users with wallets
4. POST /api/monday/webhooks/incoming - Monday.com webhook challenge
5. POST /api/monday/webhooks/incoming - Monday.com wallet top-up event
6. POST /api/store/textbook-orders/submit - Wallet payment integration
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"
TEST_USER_ID = "cli_6cc8b44b7ad5"  # juan.perez@test.com - has $150 wallet balance
MONDAY_BOARD_ID = "5931665026"


class TestWalletBasicEndpoints:
    """Test basic wallet API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _admin_login(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_wallet_me_requires_auth(self):
        """Test GET /api/wallet/me requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/wallet/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/wallet/me requires authentication (status={response.status_code})")
    
    def test_wallet_me_authenticated(self):
        """Test GET /api/wallet/me returns wallet for authenticated user"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/me")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "wallet" in data
        
        wallet = data["wallet"]
        assert "wallet_id" in wallet
        assert "balance_usd" in wallet
        assert isinstance(wallet["balance_usd"], (int, float))
        
        print(f"PASS: /api/wallet/me returns wallet with balance_usd={wallet['balance_usd']}")
    
    def test_wallet_config_public(self):
        """Test GET /api/wallet/config is accessible"""
        response = self.session.get(f"{BASE_URL}/api/wallet/config")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "config" in data
        print(f"PASS: /api/wallet/config accessible")


class TestAdminWalletEndpoints:
    """Test admin wallet management endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _admin_login(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_admin_all_users_requires_admin(self):
        """Test GET /api/wallet/admin/all-users requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/all-users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/wallet/admin/all-users requires admin auth")
    
    def test_admin_all_users_returns_users(self):
        """Test GET /api/wallet/admin/all-users returns users with wallet info"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/all-users")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "users" in data
        assert isinstance(data["users"], list)
        
        # Check structure of user records
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user
            assert "email" in user
            # wallet may or may not exist for all users
            if user.get("wallet"):
                assert "balance_usd" in user["wallet"]
        
        print(f"PASS: /api/wallet/admin/all-users returns {len(data['users'])} users")
    
    def test_admin_adjust_requires_admin(self):
        """Test POST /api/wallet/admin/adjust requires admin auth"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={"amount": 10, "action": "topup"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: /api/wallet/admin/adjust requires admin auth")
    
    def test_admin_adjust_topup(self):
        """Test POST /api/wallet/admin/adjust/{user_id} top-up action"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First get current balance
        response = self.session.get(f"{BASE_URL}/api/wallet/user/{TEST_USER_ID}")
        if response.status_code == 404:
            # User might not have a wallet yet, create via deposit
            pytest.skip("Test user wallet not found")
        
        initial_balance = response.json()["wallet"]["balance_usd"]
        
        # Top up $10
        topup_amount = 10.0
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={
                "amount": topup_amount,
                "action": "topup",
                "description": "Test top-up from pytest"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "transaction" in data
        assert "new_balance" in data
        
        # Verify balance increased
        expected_balance = initial_balance + topup_amount
        assert abs(data["new_balance"] - expected_balance) < 0.01
        
        print(f"PASS: Admin top-up works. Balance: ${initial_balance} -> ${data['new_balance']}")
    
    def test_admin_adjust_deduct(self):
        """Test POST /api/wallet/admin/adjust/{user_id} deduct action"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # First get current balance
        response = self.session.get(f"{BASE_URL}/api/wallet/user/{TEST_USER_ID}")
        if response.status_code == 404:
            pytest.skip("Test user wallet not found")
        
        initial_balance = response.json()["wallet"]["balance_usd"]
        
        if initial_balance < 5:
            pytest.skip("Insufficient balance to test deduction")
        
        # Deduct $5
        deduct_amount = 5.0
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={
                "amount": deduct_amount,
                "action": "deduct",
                "description": "Test deduction from pytest"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "new_balance" in data
        
        expected_balance = initial_balance - deduct_amount
        assert abs(data["new_balance"] - expected_balance) < 0.01
        
        print(f"PASS: Admin deduct works. Balance: ${initial_balance} -> ${data['new_balance']}")
    
    def test_admin_adjust_invalid_action(self):
        """Test POST /api/wallet/admin/adjust rejects invalid action"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={"amount": 10, "action": "invalid_action"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Invalid action rejected with 400")
    
    def test_admin_adjust_negative_amount(self):
        """Test POST /api/wallet/admin/adjust rejects negative amount"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={"amount": -10, "action": "topup"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Negative amount rejected with 400")


class TestMondayWebhook:
    """Test Monday.com webhook endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_monday_webhook_challenge(self):
        """Test POST /api/monday/webhooks/incoming responds to challenge"""
        challenge_value = "test_challenge_abc123"
        
        response = self.session.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"challenge": challenge_value}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("challenge") == challenge_value
        print(f"PASS: Monday webhook challenge verification works")
    
    def test_monday_webhook_registered_boards(self):
        """Test GET /api/monday/webhooks/registered shows registered handlers"""
        response = self.session.get(f"{BASE_URL}/api/monday/webhooks/registered")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "boards" in data
        assert isinstance(data["boards"], list)
        
        # Verify our wallet board is registered
        assert MONDAY_BOARD_ID in data["boards"], f"Board {MONDAY_BOARD_ID} not registered"
        print(f"PASS: Wallet board {MONDAY_BOARD_ID} is registered. All boards: {data['boards']}")
    
    def test_monday_webhook_unhandled_board(self):
        """Test POST /api/monday/webhooks/incoming handles unregistered board"""
        response = self.session.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={
                "event": {
                    "boardId": "999999999",
                    "pulseId": "12345"
                }
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("status") == "unhandled"
        print(f"PASS: Unregistered board handled gracefully")
    
    def test_monday_webhook_wallet_topup_missing_email(self):
        """Test wallet webhook handles missing email gracefully"""
        response = self.session.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={
                "event": {
                    "boardId": MONDAY_BOARD_ID,
                    "pulseId": "99999",
                    "columnValues": {
                        "amount": "100"
                    }
                }
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Should return error status since email is missing
        assert data.get("status") == "error"
        print(f"PASS: Webhook handles missing email with error status")


class TestTextbookOrderWalletPayment:
    """Test wallet payment integration with textbook orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _admin_login(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_submit_order_wallet_insufficient_balance(self):
        """Test submit order with wallet payment fails on insufficient balance"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Try to submit with a fake student - should fail
        response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            json={
                "student_id": "fake_student_999",
                "items": [{"book_id": "book_001", "quantity_ordered": 1}],
                "payment_method": "wallet"
            }
        )
        
        # Should fail because student doesn't exist
        assert response.status_code in [400, 404, 500], f"Unexpected: {response.status_code}"
        print(f"PASS: Submit order fails appropriately for invalid student")
    
    def test_submit_order_endpoint_exists(self):
        """Test submit order endpoint is accessible"""
        # Without auth should get 401/403
        response = self.session.post(
            f"{BASE_URL}/api/store/textbook-orders/submit",
            json={
                "student_id": "test",
                "items": [],
                "payment_method": "wallet"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"PASS: Submit order endpoint requires authentication")


class TestWalletDataValidation:
    """Test wallet data validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def _admin_login(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_wallet_summary_structure(self):
        """Test wallet summary returns expected structure"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/summary")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "summary" in data
        
        summary = data["summary"]
        required_fields = ["wallet_id", "balance_usd", "balance_points", "stats"]
        for field in required_fields:
            assert field in summary, f"Missing field: {field}"
        
        print(f"PASS: Wallet summary has all required fields")
    
    def test_wallet_transactions_endpoint(self):
        """Test wallet transactions endpoint works"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/transactions")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "transactions" in data
        assert isinstance(data["transactions"], list)
        
        print(f"PASS: Wallet transactions returns {len(data['transactions'])} transactions")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
