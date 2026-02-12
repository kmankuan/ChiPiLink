"""
Bank Alert Parser Tests - Tests for the Bank Alert parsing and processing feature
Iteration 78: ChipiLink Admin Bank Transfer Alert Parser
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Sample bank alert text (Panamanian bank format)
SAMPLE_ALERT_WITH_EMAIL = """Hola, Books de light:

KA SHUN FUNG te envió la siguiente transacción:

A tu: CUENTA CORRIENTE
Terminación de producto: 3325
Monto: US$386.55
Descripción: recarga teck@koh.one

Para más detalles, consulta los movimientos de tu CUENTA CORRIENTE en BANCA MOVIL."""

SAMPLE_ALERT_NO_EMAIL = """Hola, Books de light:

JOHN DOE te envió la siguiente transacción:

A tu: CUENTA CORRIENTE
Terminación de producto: 1234
Monto: US$100.00
Descripción: pago de servicios

Para más detalles, consulta los movimientos de tu CUENTA CORRIENTE en BANCA MOVIL."""

SAMPLE_ALERT_USD_FORMAT = """Transfer notification:
MARIA GARCIA te envió:
Monto: USD 50.00
Descripción: recarga nonexistent_user@test.com
Terminación de producto: 9999"""


class TestBankAlertParser:
    """Tests for Bank Alert Parser endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        
        data = login_response.json()
        self.token = data.get("token")
        assert self.token, "No token in login response"
        
        self.auth_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    # ========== Parse Bank Alert Tests ==========
    
    def test_parse_bank_alert_with_existing_user_email(self):
        """Parse bank alert with email that matches existing user - returns user_match"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            headers=self.auth_headers,
            json={"alert_text": SAMPLE_ALERT_WITH_EMAIL}
        )
        
        assert response.status_code == 200, f"Parse failed: {response.text}"
        data = response.json()
        
        # Check parsed data structure
        assert "parsed" in data
        parsed = data["parsed"]
        
        assert parsed.get("amount") == 386.55, f"Amount not extracted correctly: {parsed.get('amount')}"
        assert parsed.get("email") == "teck@koh.one", f"Email not extracted correctly: {parsed.get('email')}"
        assert parsed.get("sender") == "KA SHUN FUNG", f"Sender not extracted correctly: {parsed.get('sender')}"
        assert parsed.get("product") == "3325", f"Product not extracted correctly: {parsed.get('product')}"
        assert parsed.get("description") is not None, "Description should be extracted"
        
        # Check user_match (should find existing user teck@koh.one)
        assert "user_match" in data
        user_match = data["user_match"]
        assert user_match is not None, "user_match should not be None for existing email"
        assert user_match.get("email") == "teck@koh.one"
        assert "user_id" in user_match
        assert "current_balance" in user_match
        
        print(f"✓ Parse with existing user: amount=${parsed['amount']}, email={parsed['email']}, user found!")
    
    def test_parse_bank_alert_no_email_in_text(self):
        """Parse bank alert without email in description - user_match should be null"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            headers=self.auth_headers,
            json={"alert_text": SAMPLE_ALERT_NO_EMAIL}
        )
        
        assert response.status_code == 200, f"Parse failed: {response.text}"
        data = response.json()
        
        parsed = data["parsed"]
        assert parsed.get("amount") == 100.00, f"Amount not extracted: {parsed.get('amount')}"
        assert parsed.get("email") is None, "Email should be None when not present"
        assert parsed.get("sender") == "JOHN DOE"
        assert parsed.get("product") == "1234"
        
        # user_match should be None
        assert data.get("user_match") is None, "user_match should be null when no email"
        
        print("✓ Parse without email: amount extracted, no user_match as expected")
    
    def test_parse_bank_alert_nonexistent_user_email(self):
        """Parse bank alert with email that doesn't exist in system - user_match null"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            headers=self.auth_headers,
            json={"alert_text": SAMPLE_ALERT_USD_FORMAT}
        )
        
        assert response.status_code == 200, f"Parse failed: {response.text}"
        data = response.json()
        
        parsed = data["parsed"]
        assert parsed.get("amount") == 50.00, f"USD format amount not extracted: {parsed.get('amount')}"
        assert parsed.get("email") == "nonexistent_user@test.com"
        
        # user_match should be None since email doesn't exist
        assert data.get("user_match") is None, "user_match should be null for non-existent user"
        
        print("✓ Parse with non-existent email: email extracted but no user_match")
    
    def test_parse_bank_alert_requires_auth(self):
        """Parse bank alert endpoint requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            json={"alert_text": SAMPLE_ALERT_WITH_EMAIL}
            # No Authorization header
        )
        
        assert response.status_code in [401, 403], f"Should require auth: {response.status_code}"
        print("✓ Parse endpoint requires authentication")
    
    # ========== Process Bank Alert Tests ==========
    
    def test_process_bank_alert_success(self):
        """Process bank alert - top up existing user's wallet"""
        # First get current balance
        parse_response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            headers=self.auth_headers,
            json={"alert_text": SAMPLE_ALERT_WITH_EMAIL}
        )
        assert parse_response.status_code == 200
        user_match = parse_response.json().get("user_match")
        assert user_match, "Test requires existing user teck@koh.one"
        original_balance = user_match.get("current_balance", 0)
        
        # Process the alert with small amount for testing
        test_amount = 1.00  # Small test amount
        process_response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/process-bank-alert",
            headers=self.auth_headers,
            json={
                "alert_text": SAMPLE_ALERT_WITH_EMAIL,
                "email": "teck@koh.one",
                "amount": test_amount,
                "description": "Test bank alert top-up"
            }
        )
        
        assert process_response.status_code == 200, f"Process failed: {process_response.text}"
        data = process_response.json()
        
        # Verify response structure
        assert data.get("success") is True
        assert "user" in data
        assert data["user"]["email"] == "teck@koh.one"
        assert "transaction" in data
        assert "new_balance" in data
        
        # Verify balance increased
        new_balance = data["new_balance"]
        assert new_balance == original_balance + test_amount, \
            f"Balance should increase by {test_amount}: {original_balance} -> {new_balance}"
        
        print(f"✓ Process success: balance ${original_balance} -> ${new_balance}")
    
    def test_process_bank_alert_nonexistent_email_404(self):
        """Process bank alert with non-existent email returns 404"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/process-bank-alert",
            headers=self.auth_headers,
            json={
                "alert_text": "Test alert",
                "email": "this_email_does_not_exist_12345@fake.com",
                "amount": 10.00,
                "description": "Test"
            }
        )
        
        assert response.status_code == 404, f"Should return 404: {response.status_code} - {response.text}"
        assert "not found" in response.json().get("detail", "").lower()
        
        print("✓ Process with non-existent email returns 404")
    
    def test_process_bank_alert_requires_auth(self):
        """Process bank alert endpoint requires authentication"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/process-bank-alert",
            json={
                "alert_text": "Test",
                "email": "test@test.com",
                "amount": 10.00
            }
            # No Authorization header
        )
        
        assert response.status_code in [401, 403], f"Should require auth: {response.status_code}"
        print("✓ Process endpoint requires authentication")
    
    # ========== Bank Alert Logs Tests ==========
    
    def test_get_bank_alert_logs(self):
        """Get recent bank alert processing logs"""
        response = self.session.get(
            f"{BASE_URL}/api/wallet/admin/bank-alert-logs?limit=20",
            headers=self.auth_headers
        )
        
        assert response.status_code == 200, f"Get logs failed: {response.text}"
        data = response.json()
        
        assert "logs" in data
        logs = data["logs"]
        assert isinstance(logs, list)
        
        # If there are logs, verify structure
        if len(logs) > 0:
            log = logs[0]
            # Logs should have email, amount, processed_at
            assert "email" in log or "amount" in log, "Log should have basic fields"
        
        print(f"✓ Get logs: {len(logs)} logs returned")
    
    def test_get_bank_alert_logs_requires_auth(self):
        """Bank alert logs endpoint requires authentication"""
        response = self.session.get(f"{BASE_URL}/api/wallet/admin/bank-alert-logs")
        
        assert response.status_code in [401, 403], f"Should require auth: {response.status_code}"
        print("✓ Logs endpoint requires authentication")


class TestBankAlertParserEdgeCases:
    """Edge case tests for bank alert parser"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        login_response = self.session.post(f"{BASE_URL}/api/auth-v2/login", json={
            "email": "teck@koh.one",
            "password": "Acdb##0897"
        })
        assert login_response.status_code == 200
        self.token = login_response.json().get("token")
        self.auth_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def test_parse_different_amount_formats(self):
        """Test parsing different amount formats: US$, USD, $"""
        test_cases = [
            ("Monto: US$123.45", 123.45),
            ("Monto: USD 200.00", 200.00),
            ("Monto: $50.00", 50.00),
            ("Monto: US$1,234.56", 1234.56),  # With comma
        ]
        
        for alert_text, expected_amount in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
                headers=self.auth_headers,
                json={"alert_text": alert_text}
            )
            assert response.status_code == 200
            parsed = response.json().get("parsed", {})
            assert parsed.get("amount") == expected_amount, \
                f"Failed for '{alert_text}': expected {expected_amount}, got {parsed.get('amount')}"
        
        print("✓ All amount formats parsed correctly")
    
    def test_parse_empty_alert_text(self):
        """Test parsing empty or minimal alert text"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/admin/parse-bank-alert",
            headers=self.auth_headers,
            json={"alert_text": ""}
        )
        
        # Should still return 200 with null values
        assert response.status_code == 200
        parsed = response.json().get("parsed", {})
        assert parsed.get("amount") is None
        assert parsed.get("email") is None
        
        print("✓ Empty alert text handled gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
