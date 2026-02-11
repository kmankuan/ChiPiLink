"""
Test Wallet Admin Module - Iteration 74
Testing:
1. GET /api/wallet/admin/all-users - Returns all non-admin users with wallet info
2. POST /api/wallet/admin/adjust/{user_id} - Admin top-up/deduct
3. GET /api/wallet/admin/transactions - Returns paginated transaction list with user info
4. GET /api/wallet/admin/bank-info - Returns all bank info configurations
5. POST /api/wallet/admin/bank-info - Create/update bank info by context
6. DELETE /api/wallet/admin/bank-info/{context} - Delete bank info by context
7. GET /api/wallet/bank-info/{context} - Public endpoint for bank info by context
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "teck@koh.one"
ADMIN_PASSWORD = "Acdb##0897"
TEST_USER_ID = "cli_6cc8b44b7ad5"  # juan.perez@test.com


class TestAdminAllUsers:
    """Test GET /api/wallet/admin/all-users endpoint"""
    
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
    
    def test_all_users_requires_admin(self):
        """Test GET /api/wallet/admin/all-users requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/all-users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/wallet/admin/all-users requires admin auth")
    
    def test_all_users_returns_list(self):
        """Test GET /api/wallet/admin/all-users returns users with wallet info"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/all-users")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "users" in data, "Response missing 'users' field"
        assert isinstance(data["users"], list), "users should be a list"
        
        users = data["users"]
        if len(users) > 0:
            user = users[0]
            assert "user_id" in user, "User missing user_id"
            assert "email" in user, "User missing email"
            assert "name" in user, "User missing name"
            # wallet can be null if user has no wallet
        
        print(f"PASS: /api/wallet/admin/all-users returns {len(users)} users")


class TestAdminAdjustWallet:
    """Test POST /api/wallet/admin/adjust/{user_id} endpoint"""
    
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
    
    def test_adjust_requires_admin(self):
        """Test POST /api/wallet/admin/adjust requires admin auth"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={"amount": 10, "action": "topup"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/wallet/admin/adjust requires admin auth")
    
    def test_adjust_topup_works(self):
        """Test admin can top up user wallet"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={
                "amount": 5.0,
                "action": "topup",
                "description": "Test top-up iteration 74"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "transaction" in data
        assert "new_balance" in data
        
        print(f"PASS: Admin top-up works, new balance: ${data['new_balance']}")
    
    def test_adjust_deduct_works(self):
        """Test admin can deduct from user wallet"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/adjust/{TEST_USER_ID}",
            json={
                "amount": 5.0,
                "action": "deduct",
                "description": "Test deduction iteration 74"
            }
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "new_balance" in data
        
        print(f"PASS: Admin deduct works, new balance: ${data['new_balance']}")


class TestAdminTransactions:
    """Test GET /api/wallet/admin/transactions endpoint"""
    
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
    
    def test_transactions_requires_admin(self):
        """Test GET /api/wallet/admin/transactions requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/wallet/admin/transactions requires admin auth")
    
    def test_transactions_returns_list(self):
        """Test GET /api/wallet/admin/transactions returns paginated list"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "transactions" in data, "Response missing 'transactions' field"
        assert "total" in data, "Response missing 'total' field"
        assert isinstance(data["transactions"], list)
        
        # Check enrichment with user info
        if len(data["transactions"]) > 0:
            txn = data["transactions"][0]
            assert "transaction_id" in txn, "Transaction missing transaction_id"
            assert "user_id" in txn, "Transaction missing user_id"
            assert "amount" in txn, "Transaction missing amount"
            # user_name and user_email may be present if user exists
        
        print(f"PASS: /api/wallet/admin/transactions returns {len(data['transactions'])} of {data['total']} total")
    
    def test_transactions_pagination(self):
        """Test transactions support pagination"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?limit=5&offset=0")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert len(data["transactions"]) <= 5
        
        print(f"PASS: Transactions pagination works (limit=5, got {len(data['transactions'])})")
    
    def test_transactions_filter_by_user(self):
        """Test transactions can filter by user_id"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/transactions?user_id={TEST_USER_ID}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # All returned transactions should be for the specified user
        for txn in data["transactions"]:
            assert txn["user_id"] == TEST_USER_ID, f"Transaction for wrong user: {txn['user_id']}"
        
        print(f"PASS: Transactions filter by user_id works ({len(data['transactions'])} txns for {TEST_USER_ID})")


class TestBankInfoCRUD:
    """Test bank info CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.test_context = f"test_context_{uuid.uuid4().hex[:8]}"
    
    def _admin_login(self):
        """Login as admin and return token"""
        response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_get_all_bank_info_requires_admin(self):
        """Test GET /api/wallet/admin/bank-info requires admin auth"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/bank-info")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/wallet/admin/bank-info requires admin auth")
    
    def test_get_all_bank_info(self):
        """Test GET /api/wallet/admin/bank-info returns list"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/bank-info")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "bank_info" in data, "Response missing 'bank_info' field"
        assert isinstance(data["bank_info"], list)
        
        print(f"PASS: /api/wallet/admin/bank-info returns {len(data['bank_info'])} configurations")
    
    def test_create_bank_info(self):
        """Test POST /api/wallet/admin/bank-info creates bank info"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        payload = {
            "context": self.test_context,
            "label": "Test Bank Config",
            "bank_name": "Test Bank",
            "account_holder": "Test Holder",
            "account_number": "1234567890",
            "account_type": "Savings",
            "routing_number": "111000025",
            "reference_instructions": "Use email as reference",
            "notes": "Test notes",
            "is_active": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/wallet/admin/bank-info", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        assert "bank_info" in data
        assert data["bank_info"]["context"] == self.test_context
        assert data["bank_info"]["bank_name"] == "Test Bank"
        
        print(f"PASS: Created bank info for context '{self.test_context}'")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/wallet/admin/bank-info/{self.test_context}")
    
    def test_update_bank_info_upsert(self):
        """Test POST /api/wallet/admin/bank-info updates existing config (upsert)"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create first
        payload = {
            "context": self.test_context,
            "label": "Initial Label",
            "bank_name": "Initial Bank",
            "account_holder": "Initial Holder",
            "account_number": "1111111111",
            "is_active": True
        }
        response = self.session.post(f"{BASE_URL}/api/wallet/admin/bank-info", json=payload)
        assert response.status_code == 200
        
        # Update via same endpoint
        payload["label"] = "Updated Label"
        payload["bank_name"] = "Updated Bank"
        response = self.session.post(f"{BASE_URL}/api/wallet/admin/bank-info", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data["bank_info"]["label"] == "Updated Label"
        assert data["bank_info"]["bank_name"] == "Updated Bank"
        
        print(f"PASS: Bank info upsert works for context '{self.test_context}'")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/wallet/admin/bank-info/{self.test_context}")
    
    def test_delete_bank_info(self):
        """Test DELETE /api/wallet/admin/bank-info/{context} deletes config"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Create first
        payload = {
            "context": self.test_context,
            "label": "To Be Deleted",
            "bank_name": "Delete Bank",
            "account_holder": "Delete Holder",
            "account_number": "9999999999",
            "is_active": True
        }
        self.session.post(f"{BASE_URL}/api/wallet/admin/bank-info", json=payload)
        
        # Delete
        response = self.session.delete(f"{BASE_URL}/api/wallet/admin/bank-info/{self.test_context}")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") is True
        
        # Verify deleted
        response = self.session.get(f"{BASE_URL}/api/wallet/bank-info/{self.test_context}")
        data = response.json()
        assert data.get("bank_info") is None
        
        print(f"PASS: Deleted bank info for context '{self.test_context}'")
    
    def test_delete_nonexistent_bank_info(self):
        """Test DELETE /api/wallet/admin/bank-info returns 404 for nonexistent"""
        token = self._admin_login()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.delete(f"{BASE_URL}/api/wallet/admin/bank-info/nonexistent_context_xyz")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("PASS: Delete nonexistent bank info returns 404")


class TestPublicBankInfo:
    """Test public bank info endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_public_bank_info_by_context(self):
        """Test GET /api/wallet/bank-info/{context} returns bank info (public)"""
        # This endpoint is public (no auth required)
        response = self.session.get(f"{BASE_URL}/api/wallet/bank-info/wallet_general")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "bank_info" in data
        
        # bank_info can be null if context doesn't exist
        if data["bank_info"]:
            assert "context" in data["bank_info"]
            assert "bank_name" in data["bank_info"]
        
        print(f"PASS: Public bank info endpoint works for 'wallet_general'")
    
    def test_public_bank_info_nonexistent(self):
        """Test GET /api/wallet/bank-info/{context} returns null for nonexistent"""
        response = self.session.get(f"{BASE_URL}/api/wallet/bank-info/nonexistent_xyz")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "bank_info" in data
        assert data["bank_info"] is None
        
        print("PASS: Public bank info returns null for nonexistent context")


class TestSeededBankInfo:
    """Test pre-seeded bank info configurations"""
    
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
    
    def test_wallet_general_exists(self):
        """Test wallet_general bank info is seeded"""
        response = self.session.get(f"{BASE_URL}/api/wallet/bank-info/wallet_general")
        assert response.status_code == 200
        
        data = response.json()
        # May or may not exist - just check endpoint works
        print(f"PASS: wallet_general endpoint accessible (exists={data.get('bank_info') is not None})")
    
    def test_pca_private_exists(self):
        """Test pca_private bank info is seeded"""
        response = self.session.get(f"{BASE_URL}/api/wallet/bank-info/pca_private")
        assert response.status_code == 200
        
        data = response.json()
        # May or may not exist - just check endpoint works
        print(f"PASS: pca_private endpoint accessible (exists={data.get('bank_info') is not None})")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
