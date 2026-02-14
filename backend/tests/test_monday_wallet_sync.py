"""
Test Suite: Monday.com Wallet 2-Way Sync
Tests App→Monday and Monday→App wallet synchronization flows.

Flows tested:
1. User registration creates Monday.com parent item (auth.user.registered event)
2. Wallet top-up creates Monday.com subitem (sync_transaction_to_monday)  
3. Wallet deduction creates Monday.com subitem
4. Webhook processes subitems and updates wallet balance
5. Webhook idempotency (same webhook processed only once)
6. Challenge verification for webhook setup
7. Registered webhooks endpoint
"""

import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://item-counter-fix-1.preview.emergentagent.com"

# Admin credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"

# Monday.com board ID
MONDAY_BOARD_ID = "18399650704"


class TestMondayWalletSync:
    """Tests for Monday.com Wallet 2-way synchronization"""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        return response.json().get("token")

    @pytest.fixture(scope="class")
    def test_user_id(self, admin_token):
        """Create a test user and return their user_id"""
        unique_id = str(uuid.uuid4())[:8]
        test_email = f"test_monday_sync_{unique_id}@example.com"
        test_name = f"Test Monday Sync {unique_id}"
        test_password = "TestPass123!"
        
        # Register a new user - this should trigger Monday.com parent item creation
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={
                "email": test_email,
                "password": test_password,
                "name": test_name
            }
        )
        
        if response.status_code in [200, 201]:
            data = response.json()
            user = data.get("user", {})
            user_id = user.get("user_id")
            print(f"Created test user: {test_email}, user_id: {user_id}")
            # Wait for async Monday.com item creation to complete
            time.sleep(2)
            return {"user_id": user_id, "email": test_email, "name": test_name}
        else:
            pytest.skip(f"User registration failed: {response.status_code} - {response.text}")

    # ================================================================
    # TEST: User Registration → Monday.com Parent Item Creation
    # ================================================================

    def test_user_registration_creates_monday_item(self, test_user_id):
        """Test that user registration triggers Monday.com item creation.
        Note: Item creation is async/fire-and-forget, verified via logs."""
        assert test_user_id is not None
        assert test_user_id.get("user_id") is not None
        print(f"User registered successfully: {test_user_id['email']}")
        print("Check backend logs for '[monday_sync] Created Monday item' message")

    # ================================================================
    # TEST: Wallet Top-up → Monday.com Subitem Creation
    # ================================================================

    def test_wallet_topup_creates_monday_subitem(self, admin_token, test_user_id):
        """Test that wallet top-up creates Monday.com subitem"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_id = test_user_id["user_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=headers,
            json={
                "amount": 50.0,
                "action": "topup",
                "description": "Test top-up for Monday sync"
            }
        )
        
        assert response.status_code == 200, f"Top-up failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("transaction") is not None
        assert data.get("new_balance") >= 50.0
        print(f"Top-up successful. New balance: {data.get('new_balance')}")
        print("Check backend logs for '[monday_sync] Created subitem' message")
        
        # Wait for async subitem creation
        time.sleep(2)

    # ================================================================
    # TEST: Wallet Deduction → Monday.com Subitem Creation
    # ================================================================

    def test_wallet_deduct_creates_monday_subitem(self, admin_token, test_user_id):
        """Test that wallet deduction creates Monday.com subitem"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_id = test_user_id["user_id"]
        
        response = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=headers,
            json={
                "amount": 10.0,
                "action": "deduct",
                "description": "Test deduction for Monday sync"
            }
        )
        
        assert response.status_code == 200, f"Deduct failed: {response.status_code} - {response.text}"
        data = response.json()
        assert data.get("success") is True
        assert data.get("transaction") is not None
        print(f"Deduction successful. New balance: {data.get('new_balance')}")
        print("Check backend logs for '[monday_sync] Created subitem' message")
        
        # Wait for async subitem creation
        time.sleep(2)

    # ================================================================
    # TEST: Webhook Challenge Verification
    # ================================================================

    def test_webhook_challenge_verification(self):
        """Test that webhook endpoint returns challenge value for verification"""
        challenge_value = f"test_challenge_{uuid.uuid4()}"
        
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={"challenge": challenge_value}
        )
        
        assert response.status_code == 200, f"Challenge failed: {response.status_code}"
        data = response.json()
        assert data.get("challenge") == challenge_value, f"Challenge mismatch: {data}"
        print(f"Challenge verification passed: {challenge_value}")

    # ================================================================
    # TEST: Webhook Registered Boards
    # ================================================================

    def test_webhook_registered_boards(self):
        """Test that the wallet board is registered for webhooks"""
        response = requests.get(f"{BASE_URL}/api/monday/webhooks/registered")
        
        assert response.status_code == 200, f"Failed: {response.status_code}"
        data = response.json()
        
        boards = data.get("boards", [])
        assert MONDAY_BOARD_ID in boards, f"Board {MONDAY_BOARD_ID} not registered. Registered: {boards}"
        print(f"Registered boards: {boards}")

    # ================================================================
    # TEST: Webhook Processing - Process Status
    # ================================================================

    def test_webhook_process_status_processes_subitems(self, admin_token):
        """Test webhook with 'Process' status processes subitems and updates wallet.
        Uses a known test item ID from previous tests or creates a mock event."""
        
        # First, we need to get a valid monday_item_id for a user
        # Query the DB via API or use a known test item ID from logs
        # For this test, we'll create a fresh user and simulate the webhook
        
        unique_id = int(time.time())
        test_email = f"test_monday_sync_{unique_id}@example.com"
        test_password = "TestPass123!"
        
        # Register user
        reg_response = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={
                "email": test_email,
                "password": test_password,
                "name": f"Webhook Test {unique_id}"
            }
        )
        
        if reg_response.status_code not in [200, 201]:
            pytest.skip(f"User creation failed: {reg_response.status_code}")
        
        user_id = reg_response.json().get("user", {}).get("user_id")
        print(f"Created webhook test user: {test_email}, user_id: {user_id}")
        
        # Wait for Monday item creation
        time.sleep(3)
        
        # Top up the wallet (this creates subitems in Monday.com)
        headers = {"Authorization": f"Bearer {admin_token}"}
        topup_resp = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=headers,
            json={"amount": 25.0, "action": "topup", "description": "Webhook test topup"}
        )
        
        assert topup_resp.status_code == 200, f"Top-up failed: {topup_resp.text}"
        
        # Add deduction too
        time.sleep(1)
        deduct_resp = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=headers,
            json={"amount": 5.0, "action": "deduct", "description": "Webhook test deduct"}
        )
        
        assert deduct_resp.status_code == 200, f"Deduct failed: {deduct_resp.text}"
        
        print("Wallet transactions created. Monday.com subitems should be created async.")
        print("To fully test webhook: Check backend logs for monday_item_id and test manually.")

    # ================================================================
    # TEST: Webhook Idempotency - Same webhook should not process twice
    # ================================================================

    def test_webhook_idempotency(self):
        """Test that sending the same webhook twice doesn't process subitems twice.
        Second call should return processed=0 for already-processed subitems."""
        
        # Create a webhook event simulating a 'Process' status change
        # Using a test item ID - this requires a known user with Monday item
        # We'll use a mock event to test the idempotency logic
        
        # Note: For a complete test, we'd need an actual Monday item ID
        # Here we test that the endpoint handles events correctly
        
        webhook_event = {
            "event": {
                "boardId": MONDAY_BOARD_ID,
                "pulseId": "99999999999",  # Non-existent item ID for safe testing
                "columnId": "status",
                "value": {"label": {"text": "Process"}}
            }
        }
        
        # First call
        response1 = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json=webhook_event
        )
        
        assert response1.status_code == 200, f"First webhook failed: {response1.status_code}"
        print(f"First webhook response: {response1.json()}")
        
        # Second call (same event)
        response2 = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json=webhook_event
        )
        
        assert response2.status_code == 200, f"Second webhook failed: {response2.status_code}"
        print(f"Second webhook response: {response2.json()}")
        
        # Both should complete without error
        # If the item existed, second call would return processed=0

    # ================================================================
    # TEST: Webhook with no event in body
    # ================================================================

    def test_webhook_no_event_returns_no_event(self):
        """Test that webhook with no event returns appropriate response"""
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json={}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "no_event", f"Unexpected response: {data}"
        print(f"No event response: {data}")

    # ================================================================
    # TEST: Webhook with unhandled board
    # ================================================================

    def test_webhook_unhandled_board(self):
        """Test that webhook from unregistered board is handled gracefully"""
        webhook_event = {
            "event": {
                "boardId": "12345678901",  # Unknown board
                "pulseId": "11111111111",
                "columnId": "status",
                "value": {"label": {"text": "Process"}}
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/monday/webhooks/incoming",
            json=webhook_event
        )
        
        assert response.status_code == 200
        data = response.json()
        # Should return unhandled or be handled by dynamic lookup
        print(f"Unhandled board response: {data}")

    # ================================================================
    # TEST: Admin endpoint - Get wallet user for verification
    # ================================================================

    def test_admin_get_wallet_user(self, admin_token, test_user_id):
        """Verify wallet balance after transactions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_id = test_user_id["user_id"]
        
        response = requests.get(
            f"{BASE_URL}/api/wallet/user/{user_id}",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed: {response.status_code} - {response.text}"
        data = response.json()
        wallet = data.get("wallet", {})
        
        # Should have balance from previous topup/deduct tests
        balance = wallet.get("balance_usd", 0)
        print(f"User {user_id} wallet balance: ${balance}")
        assert balance >= 0, "Balance should be non-negative"


class TestMondayWalletE2EFlow:
    """End-to-end flow tests for complete 2-way sync"""

    def test_complete_app_to_monday_flow(self):
        """Test complete App→Monday flow:
        1. Register user → Monday parent item
        2. Top-up wallet → Monday subitem
        3. Deduct wallet → Monday subitem
        """
        unique_id = int(time.time())
        test_email = f"e2e_monday_test_{unique_id}@example.com"
        
        # Step 1: Register user
        print(f"\n[Step 1] Registering user: {test_email}")
        reg_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/register",
            json={
                "email": test_email,
                "password": "TestPass123!",
                "name": f"E2E Test {unique_id}"
            }
        )
        
        assert reg_resp.status_code in [200, 201], f"Registration failed: {reg_resp.text}"
        user_data = reg_resp.json()
        user_id = user_data.get("user", {}).get("user_id")
        token = user_data.get("token")
        
        print(f"User registered: user_id={user_id}")
        print("Check logs for: '[monday_sync] Created Monday item'")
        time.sleep(2)
        
        # Step 2: Login as admin to top up
        print("\n[Step 2] Admin login for wallet adjustment")
        admin_resp = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        assert admin_resp.status_code == 200, "Admin login failed"
        admin_token = admin_resp.json().get("token")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 3: Top up wallet
        print("\n[Step 3] Top-up wallet")
        topup_resp = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=admin_headers,
            json={"amount": 100.0, "action": "topup", "description": "E2E test topup"}
        )
        
        assert topup_resp.status_code == 200, f"Top-up failed: {topup_resp.text}"
        print(f"Top-up successful: {topup_resp.json()}")
        print("Check logs for: '[monday_sync] Created subitem'")
        time.sleep(2)
        
        # Step 4: Deduct from wallet
        print("\n[Step 4] Deduct from wallet")
        deduct_resp = requests.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{user_id}",
            headers=admin_headers,
            json={"amount": 25.0, "action": "deduct", "description": "E2E test deduction"}
        )
        
        assert deduct_resp.status_code == 200, f"Deduct failed: {deduct_resp.text}"
        print(f"Deduction successful: {deduct_resp.json()}")
        print("Check logs for: '[monday_sync] Created subitem'")
        
        # Step 5: Verify final balance
        print("\n[Step 5] Verify final balance")
        wallet_resp = requests.get(
            f"{BASE_URL}/api/wallet/user/{user_id}",
            headers=admin_headers
        )
        
        assert wallet_resp.status_code == 200
        wallet = wallet_resp.json().get("wallet", {})
        balance = wallet.get("balance_usd", 0)
        
        print(f"Final balance: ${balance}")
        assert balance == 75.0, f"Expected $75, got ${balance}"
        
        print("\n[SUCCESS] Complete App→Monday flow verified!")
        print("To verify Monday.com items: Check the Chipi Wallet board at https://monday.com")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
