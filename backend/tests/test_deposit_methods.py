"""
Test suite for Wallet Deposit Methods endpoints
- GET /api/wallet/deposit-methods (user)
- GET /api/wallet/admin/deposit-methods (admin)
- PUT /api/wallet/admin/deposit-methods (admin update)
- POST /api/wallet/deposit (create pending topup)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth-v2/login", json={
        "email": "teck@koh.one",
        "password": "Acdb##0897"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture
def auth_headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestDepositMethodsUserEndpoint:
    """Tests for GET /api/wallet/deposit-methods (user endpoint)"""
    
    def test_get_deposit_methods_returns_4_methods(self, auth_headers):
        """User endpoint returns all 4 enabled methods"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "methods" in data
        methods = data["methods"]
        assert len(methods) == 4
        
        method_ids = [m["id"] for m in methods]
        assert "yappy" in method_ids
        assert "cash" in method_ids
        assert "card" in method_ids
        assert "transfer" in method_ids
    
    def test_yappy_method_has_correct_config(self, auth_headers):
        """Yappy method has use_platform_yappy config"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        methods = {m["id"]: m for m in response.json()["methods"]}
        yappy = methods["yappy"]
        
        assert yappy["label"] == "Yappy"
        assert yappy["status"] == "active"
        assert yappy["icon"] == "smartphone"
        assert yappy["config"].get("use_platform_yappy") == True
    
    def test_card_method_has_under_construction_status(self, auth_headers):
        """Card method shows under_construction status"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        methods = {m["id"]: m for m in response.json()["methods"]}
        card = methods["card"]
        
        assert card["status"] == "under_construction"
        assert "Coming Soon" in card["config"].get("under_construction_label", "")
    
    def test_cash_method_has_rich_text_instructions(self, auth_headers):
        """Cash method has HTML instructions"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        methods = {m["id"]: m for m in response.json()["methods"]}
        cash = methods["cash"]
        
        assert cash["status"] == "active"
        assert "<p>" in cash["instructions"]
        assert "<strong>" in cash["instructions"]
    
    def test_transfer_method_has_bank_details_and_alert_email(self, auth_headers):
        """Transfer method has bank details config with chipiwallet@gmail.com"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        methods = {m["id"]: m for m in response.json()["methods"]}
        transfer = methods["transfer"]
        
        assert transfer["status"] == "active"
        assert "chipiwallet@gmail.com" in transfer["instructions"]
        assert transfer["config"].get("alert_email") == "chipiwallet@gmail.com"
        # Bank detail fields exist (even if empty)
        assert "bank_name" in transfer["config"]
        assert "account_holder" in transfer["config"]
        assert "account_number" in transfer["config"]
    
    def test_requires_authentication(self):
        """Endpoint requires auth token"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-methods")
        assert response.status_code == 401


class TestDepositMethodsAdminEndpoint:
    """Tests for GET /api/wallet/admin/deposit-methods (admin endpoint)"""
    
    def test_admin_get_returns_full_config(self, auth_headers):
        """Admin endpoint returns full config with enabled field"""
        response = requests.get(f"{BASE_URL}/api/wallet/admin/deposit-methods", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "methods" in data
        methods = data["methods"]
        
        # Admin endpoint returns dict, not array
        assert isinstance(methods, dict)
        assert "yappy" in methods
        assert "cash" in methods
        assert "card" in methods
        assert "transfer" in methods
        
        # All methods have enabled field
        for method_id, method in methods.items():
            assert "enabled" in method


class TestDepositMethodsAdminUpdate:
    """Tests for PUT /api/wallet/admin/deposit-methods (admin update)"""
    
    def test_admin_can_toggle_method_enabled(self, auth_headers):
        """Admin can disable and re-enable a method"""
        # Get initial state
        response = requests.get(f"{BASE_URL}/api/wallet/admin/deposit-methods", headers=auth_headers)
        initial_state = response.json()["methods"]["yappy"]["enabled"]
        
        # Toggle to opposite
        new_state = not initial_state
        response = requests.put(
            f"{BASE_URL}/api/wallet/admin/deposit-methods",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"methods": {"yappy": {"enabled": new_state}}}
        )
        assert response.status_code == 200
        assert response.json()["success"] == True
        assert response.json()["methods"]["yappy"]["enabled"] == new_state
        
        # Restore to original state
        requests.put(
            f"{BASE_URL}/api/wallet/admin/deposit-methods",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"methods": {"yappy": {"enabled": initial_state}}}
        )
    
    def test_admin_can_update_label(self, auth_headers):
        """Admin can update method labels"""
        # Update label
        response = requests.put(
            f"{BASE_URL}/api/wallet/admin/deposit-methods",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"methods": {"cash": {"label": "Efectivo (Updated)"}}}
        )
        assert response.status_code == 200
        assert "Updated" in response.json()["methods"]["cash"]["label"]
        
        # Restore original label
        requests.put(
            f"{BASE_URL}/api/wallet/admin/deposit-methods",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"methods": {"cash": {"label": "Cash"}}}
        )
    
    def test_admin_update_requires_methods_field(self, auth_headers):
        """Update fails without methods field"""
        response = requests.put(
            f"{BASE_URL}/api/wallet/admin/deposit-methods",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={}
        )
        assert response.status_code == 400


class TestDepositEndpoint:
    """Tests for POST /api/wallet/deposit (create pending topup request)"""
    
    def test_deposit_creates_pending_topup(self, auth_headers):
        """Deposit creates a pending topup request"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"amount": 15.00, "currency": "USD", "payment_method": "cash"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert data["status"] == "pending"
        assert "topup_id" in data
        assert data["topup_id"].startswith("topup_")
    
    def test_deposit_with_yappy_payment_method(self, auth_headers):
        """Deposit works with yappy payment method"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"amount": 10.00, "currency": "USD", "payment_method": "yappy"}
        )
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_deposit_with_bank_transfer_payment_method(self, auth_headers):
        """Deposit works with bank_transfer payment method"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"amount": 50.00, "currency": "USD", "payment_method": "bank_transfer"}
        )
        assert response.status_code == 200
        assert response.json()["success"] == True
    
    def test_deposit_rejects_negative_amount(self, auth_headers):
        """Deposit rejects negative amounts"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"amount": -10.00, "currency": "USD", "payment_method": "cash"}
        )
        assert response.status_code == 400
    
    def test_deposit_rejects_zero_amount(self, auth_headers):
        """Deposit rejects zero amounts"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={**auth_headers, "Content-Type": "application/json"},
            json={"amount": 0, "currency": "USD", "payment_method": "cash"}
        )
        assert response.status_code == 400
    
    def test_deposit_requires_authentication(self):
        """Deposit requires auth token"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers={"Content-Type": "application/json"},
            json={"amount": 10.00, "currency": "USD", "payment_method": "cash"}
        )
        assert response.status_code == 401
