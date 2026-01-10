"""
Test Suite for QR Code Functionality
Tests: QR Code generation, scanning, payments (USD/Points), check-in, transactions
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@libreria.com"
TEST_PASSWORD = "admin"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for regular user"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": TEST_EMAIL, "contrasena": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def admin_headers(auth_token):
    """Admin headers (same as auth for admin user)"""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def user_qr_string(auth_headers):
    """Get user's QR string for testing"""
    response = requests.get(
        f"{BASE_URL}/api/qr/me",
        headers=auth_headers
    )
    if response.status_code == 200:
        data = response.json()
        return data.get("qr_code", {}).get("qr_string")
    return None


class TestQRCodeGeneration:
    """Test QR code generation endpoints"""
    
    def test_get_my_qr_code(self, auth_headers):
        """GET /api/qr/me - returns user's QR code"""
        response = requests.get(
            f"{BASE_URL}/api/qr/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "qr_code" in data
        
        qr_code = data["qr_code"]
        assert "qr_id" in qr_code
        assert "user_id" in qr_code
        assert "qr_string" in qr_code
        assert "qr_data" in qr_code
        assert "is_active" in qr_code
        assert qr_code["is_active"] is True
        
        # Verify QR data structure
        qr_data = qr_code["qr_data"]
        assert qr_data["type"] == "chipi_user"
        assert "version" in qr_data
        assert "user_id" in qr_data
        assert "qr_id" in qr_data
        print(f"✓ QR Code generated: {qr_code['qr_id']}")
    
    def test_get_my_qr_code_unauthorized(self):
        """GET /api/qr/me - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/qr/me")
        assert response.status_code in [401, 403]
    
    def test_regenerate_qr_code(self, auth_headers):
        """POST /api/qr/me/regenerate - regenerates QR code"""
        # Get current QR
        response1 = requests.get(
            f"{BASE_URL}/api/qr/me",
            headers=auth_headers
        )
        old_qr_id = response1.json()["qr_code"]["qr_id"]
        
        # Regenerate
        response = requests.post(
            f"{BASE_URL}/api/qr/me/regenerate",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "qr_code" in data
        assert "message" in data
        
        new_qr_id = data["qr_code"]["qr_id"]
        assert new_qr_id != old_qr_id  # New QR should have different ID
        assert data["qr_code"]["is_active"] is True
        
        # Verify message has multi-language support
        assert "es" in data["message"]
        assert "en" in data["message"]
        assert "zh" in data["message"]
        print(f"✓ QR Code regenerated: {old_qr_id} -> {new_qr_id}")


class TestQRCodeScanning:
    """Test QR code scanning endpoints (admin only)"""
    
    def test_scan_qr_code_valid(self, admin_headers, user_qr_string):
        """POST /api/qr/scan - scans valid QR code"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            headers=admin_headers,
            json={"qr_string": user_qr_string}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "scan_result" in data
        
        result = data["scan_result"]
        assert result["valid"] is True
        assert "qr_id" in result
        assert "user_id" in result
        assert "wallet" in result
        assert "available_actions" in result
        
        # Verify wallet info
        wallet = result["wallet"]
        assert "wallet_id" in wallet
        assert "balance_usd" in wallet
        assert "balance_points" in wallet
        assert "is_locked" in wallet
        
        print(f"✓ QR Scanned - User: {result['user_id'][:8]}..., Balance: ${wallet['balance_usd']}")
    
    def test_scan_qr_code_invalid(self, admin_headers):
        """POST /api/qr/scan - rejects invalid QR code"""
        response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            headers=admin_headers,
            json={"qr_string": "invalid_qr_string_here"}
        )
        assert response.status_code == 400
    
    def test_scan_qr_code_unauthorized(self, user_qr_string):
        """POST /api/qr/scan - requires admin authentication"""
        response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            json={"qr_string": user_qr_string or "test"}
        )
        assert response.status_code in [401, 403]


class TestQRPaymentUSD:
    """Test QR payment with USD"""
    
    def test_process_pay_usd_success(self, admin_headers, user_qr_string):
        """POST /api/qr/process - processes USD payment"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        # First check current balance
        scan_response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            headers=admin_headers,
            json={"qr_string": user_qr_string}
        )
        
        if scan_response.status_code != 200:
            pytest.skip("Could not scan QR")
        
        current_balance = scan_response.json()["scan_result"]["wallet"]["balance_usd"]
        
        if current_balance < 5:
            pytest.skip(f"Insufficient balance for test: ${current_balance}")
        
        # Process payment
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_usd",
                "amount": 5.0,
                "description": "Test QR payment from pytest"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "qr_transaction_id" in data
        assert data["action"] == "pay_usd"
        assert "result" in data
        
        result = data["result"]
        assert result["success"] is True
        assert "transaction" in result
        assert "new_balance" in result
        assert "message" in result
        
        # Verify balance decreased
        assert result["new_balance"] < current_balance
        
        # Verify message has multi-language support
        assert "es" in result["message"]
        assert "en" in result["message"]
        assert "zh" in result["message"]
        
        print(f"✓ USD Payment: ${5.0} - Balance: ${current_balance} -> ${result['new_balance']}")
    
    def test_process_pay_usd_invalid_amount(self, admin_headers, user_qr_string):
        """POST /api/qr/process - rejects invalid amount"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_usd",
                "amount": -10.0,
                "description": "Invalid payment"
            }
        )
        assert response.status_code == 400
    
    def test_process_pay_usd_missing_amount(self, admin_headers, user_qr_string):
        """POST /api/qr/process - requires amount for payment"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_usd"
            }
        )
        assert response.status_code == 400


class TestQRPaymentPoints:
    """Test QR payment with ChipiPoints"""
    
    def test_process_pay_points_success(self, admin_headers, user_qr_string):
        """POST /api/qr/process - processes ChipiPoints payment"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        # First check current balance
        scan_response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            headers=admin_headers,
            json={"qr_string": user_qr_string}
        )
        
        if scan_response.status_code != 200:
            pytest.skip("Could not scan QR")
        
        current_points = scan_response.json()["scan_result"]["wallet"]["balance_points"]
        
        if current_points < 100:
            pytest.skip(f"Insufficient points for test: {current_points}")
        
        # Process payment
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_points",
                "amount": 100,
                "description": "Test ChipiPoints payment from pytest"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "qr_transaction_id" in data
        assert data["action"] == "pay_points"
        assert "result" in data
        
        result = data["result"]
        assert result["success"] is True
        assert "transaction" in result
        assert "new_balance" in result
        assert "message" in result
        
        # Verify points decreased
        assert result["new_balance"] < current_points
        
        print(f"✓ Points Payment: 100 pts - Balance: {current_points} -> {result['new_balance']}")
    
    def test_process_pay_points_invalid_amount(self, admin_headers, user_qr_string):
        """POST /api/qr/process - rejects invalid points amount"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_points",
                "amount": -50,
                "description": "Invalid payment"
            }
        )
        assert response.status_code == 400


class TestQRCheckin:
    """Test QR check-in functionality"""
    
    def test_process_checkin(self, admin_headers, user_qr_string):
        """POST /api/qr/process - processes check-in"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "checkin"
            }
        )
        
        # Check-in may fail if no active membership, but endpoint should work
        if response.status_code == 200:
            data = response.json()
            assert data["success"] is True
            assert data["action"] == "checkin"
            assert "qr_transaction_id" in data
            print(f"✓ Check-in successful: {data['qr_transaction_id']}")
        else:
            # May fail due to no membership - that's expected
            data = response.json()
            print(f"✓ Check-in endpoint works (failed due to: {data.get('detail', 'no membership')})")
            assert response.status_code == 400
    
    def test_qr_checkin_endpoint(self, admin_headers, user_qr_string):
        """POST /api/qr/checkin - quick check-in endpoint"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/checkin",
            headers=admin_headers,
            json={"qr_string": user_qr_string}
        )
        
        # May succeed or fail based on membership status
        assert response.status_code in [200, 400]
        print(f"✓ Quick check-in endpoint works (status: {response.status_code})")


class TestQRTransactionHistory:
    """Test QR transaction history endpoints"""
    
    def test_get_my_qr_transactions(self, auth_headers):
        """GET /api/qr/transactions - returns user's QR transactions"""
        response = requests.get(
            f"{BASE_URL}/api/qr/transactions",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "transactions" in data
        assert "count" in data
        assert isinstance(data["transactions"], list)
        
        if len(data["transactions"]) > 0:
            txn = data["transactions"][0]
            assert "qr_transaction_id" in txn
            assert "qr_id" in txn
            assert "user_id" in txn
            assert "action" in txn
            assert "status" in txn
            assert "created_at" in txn
        
        print(f"✓ QR Transactions: {data['count']} found")
    
    def test_get_qr_transactions_with_filter(self, auth_headers):
        """GET /api/qr/transactions - with action filter"""
        response = requests.get(
            f"{BASE_URL}/api/qr/transactions?action=pay_usd&limit=10",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        
        # All transactions should be pay_usd
        for txn in data["transactions"]:
            assert txn["action"] == "pay_usd"
        
        print(f"✓ Filtered transactions (pay_usd): {data['count']} found")
    
    def test_admin_get_all_transactions(self, admin_headers):
        """GET /api/qr/admin/transactions - admin gets all transactions"""
        response = requests.get(
            f"{BASE_URL}/api/qr/admin/transactions?limit=50",
            headers=admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "transactions" in data
        assert "count" in data
        
        print(f"✓ Admin transactions: {data['count']} found")


class TestQRPaymentEndpoint:
    """Test dedicated QR payment endpoint"""
    
    def test_qr_pay_endpoint(self, admin_headers, user_qr_string):
        """POST /api/qr/pay - dedicated payment endpoint"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        # Check balance first
        scan_response = requests.post(
            f"{BASE_URL}/api/qr/scan",
            headers=admin_headers,
            json={"qr_string": user_qr_string}
        )
        
        if scan_response.status_code != 200:
            pytest.skip("Could not scan QR")
        
        current_balance = scan_response.json()["scan_result"]["wallet"]["balance_usd"]
        
        if current_balance < 2:
            pytest.skip(f"Insufficient balance: ${current_balance}")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/pay",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "pay_usd",
                "amount": 2.0,
                "description": "Test via /qr/pay endpoint"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        print(f"✓ /qr/pay endpoint works - Payment processed")
    
    def test_qr_pay_invalid_action(self, admin_headers, user_qr_string):
        """POST /api/qr/pay - rejects invalid action"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/pay",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "checkin",  # Not allowed in /pay endpoint
                "amount": 10.0
            }
        )
        assert response.status_code == 400


class TestQRInvalidActions:
    """Test invalid action handling"""
    
    def test_process_invalid_action(self, admin_headers, user_qr_string):
        """POST /api/qr/process - rejects invalid action"""
        if not user_qr_string:
            pytest.skip("No QR string available")
        
        response = requests.post(
            f"{BASE_URL}/api/qr/process",
            headers=admin_headers,
            json={
                "qr_string": user_qr_string,
                "action": "invalid_action",
                "amount": 10.0
            }
        )
        assert response.status_code == 400
        
        data = response.json()
        assert "invalid action" in data.get("detail", "").lower() or "Invalid action" in data.get("detail", "")


class TestAdminQREndpoints:
    """Test admin-specific QR endpoints"""
    
    def test_admin_get_user_qr(self, admin_headers, auth_headers):
        """GET /api/qr/admin/user/{user_id} - admin gets user's QR"""
        # First get user_id from current user's QR
        response = requests.get(
            f"{BASE_URL}/api/qr/me",
            headers=auth_headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not get user QR")
        
        user_id = response.json()["qr_code"]["user_id"]
        
        # Admin gets user's QR
        admin_response = requests.get(
            f"{BASE_URL}/api/qr/admin/user/{user_id}",
            headers=admin_headers
        )
        assert admin_response.status_code == 200
        
        data = admin_response.json()
        assert data["success"] is True
        assert "qr_code" in data
        assert data["qr_code"]["user_id"] == user_id
        
        print(f"✓ Admin retrieved QR for user: {user_id[:8]}...")


class TestQRPaymentSession:
    """Test payment session endpoints"""
    
    def test_create_payment_session(self, auth_headers):
        """POST /api/qr/session/create - creates payment session"""
        response = requests.post(
            f"{BASE_URL}/api/qr/session/create",
            headers=auth_headers,
            json={
                "amount": 50.0,
                "currency": "USD",
                "description": "Test payment session",
                "expires_minutes": 5
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "session" in data
        
        session = data["session"]
        assert "session_id" in session
        assert session["amount"] == 50.0
        assert session["currency"] == "USD"
        assert session["status"] == "pending"
        assert "expires_at" in session
        
        print(f"✓ Payment session created: {session['session_id']}")
        return session["session_id"]
    
    def test_create_payment_session_invalid_currency(self, auth_headers):
        """POST /api/qr/session/create - rejects invalid currency"""
        response = requests.post(
            f"{BASE_URL}/api/qr/session/create",
            headers=auth_headers,
            json={
                "amount": 50.0,
                "currency": "EUR",  # Invalid
                "description": "Test"
            }
        )
        assert response.status_code == 400
    
    def test_create_payment_session_invalid_amount(self, auth_headers):
        """POST /api/qr/session/create - rejects invalid amount"""
        response = requests.post(
            f"{BASE_URL}/api/qr/session/create",
            headers=auth_headers,
            json={
                "amount": -10.0,
                "currency": "USD",
                "description": "Test"
            }
        )
        assert response.status_code == 400


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
