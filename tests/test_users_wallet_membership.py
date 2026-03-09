"""
Test Suite for User Management System and ChipiWallet (Phase 1)
Tests: User Types, Profile Fields, Wallet, Memberships, Check-in/Check-out
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "admin@libreria.com"
TEST_PASSWORD = "admin"


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""
    
    def test_get_user_types(self):
        """GET /api/users/types - returns list of user types"""
        response = requests.get(f"{BASE_URL}/api/users/types")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "types" in data
        assert data["count"] >= 1
        
        # Verify user type structure
        user_type = data["types"][0]
        assert "type_id" in user_type
        assert "name" in user_type
        assert "es" in user_type["name"]  # Multi-language support
        assert "icon" in user_type
        assert "color" in user_type
    
    def test_get_profile_fields(self):
        """GET /api/users/fields - returns profile fields"""
        response = requests.get(f"{BASE_URL}/api/users/fields")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "fields" in data
        assert data["count"] >= 1
        
        # Verify field structure
        field = data["fields"][0]
        assert "field_id" in field
        assert "field_key" in field
        assert "label" in field
        assert "field_type" in field
    
    def test_get_wallet_config(self):
        """GET /api/wallet/config - returns wallet configuration"""
        response = requests.get(f"{BASE_URL}/api/wallet/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "config" in data
        
        config = data["config"]
        assert "points_per_dollar" in config
        assert "conversion_rate" in config
        assert "allow_points_to_usd" in config
        assert "points_per_dollar_spent" in config
    
    def test_get_membership_plans(self):
        """GET /api/memberships/plans - returns available membership plans"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "plans" in data
        assert data["count"] >= 1
        
        # Verify plan structure
        plan = data["plans"][0]
        assert "plan_id" in plan
        assert "name" in plan
        assert "es" in plan["name"]  # Multi-language support
        assert "price" in plan
        assert "membership_type" in plan


class TestAuthentication:
    """Test authentication flow"""
    
    def test_login_success(self):
        """POST /api/auth-v2/login - successful login"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": TEST_EMAIL, "contrasena": TEST_PASSWORD}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "cliente" in data
        assert data["cliente"]["email"] == TEST_EMAIL
    
    def test_login_invalid_credentials(self):
        """POST /api/auth-v2/login - invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": "wrong@email.com", "contrasena": "wrongpass"}
        )
        assert response.status_code in [401, 404]


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth-v2/login",
        json={"email": TEST_EMAIL, "contrasena": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestWalletEndpoints:
    """Test wallet endpoints (authenticated)"""
    
    def test_get_my_wallet(self, auth_headers):
        """GET /api/wallet/me - returns user wallet"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "wallet" in data
        
        wallet = data["wallet"]
        assert "wallet_id" in wallet
        assert "user_id" in wallet
        assert "balance_usd" in wallet
        assert "balance_points" in wallet
        assert "is_locked" in wallet
    
    def test_get_wallet_summary(self, auth_headers):
        """GET /api/wallet/summary - returns wallet summary"""
        response = requests.get(
            f"{BASE_URL}/api/wallet/summary",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "summary" in data
        
        summary = data["summary"]
        assert "wallet_id" in summary
        assert "balance_usd" in summary
        assert "balance_points" in summary
        assert "points_value_usd" in summary
        assert "total_balance" in summary
        assert "stats" in summary
        assert "points_config" in summary
    
    def test_deposit_usd(self, auth_headers):
        """POST /api/wallet/deposit - deposit USD"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers=auth_headers,
            json={
                "amount": 25.0,
                "currency": "USD",
                "payment_method": "cash",
                "description": "Test deposit from pytest"
            }
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "transaction" in data
        
        txn = data["transaction"]
        assert txn["transaction_type"] == "deposit"
        assert txn["amount"] == 25.0
        assert txn["currency"] == "USD"
        assert txn["status"] == "completed"
        assert txn["balance_after"] > txn["balance_before"]
    
    def test_deposit_invalid_amount(self, auth_headers):
        """POST /api/wallet/deposit - invalid amount"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers=auth_headers,
            json={
                "amount": -10.0,
                "currency": "USD",
                "payment_method": "cash"
            }
        )
        assert response.status_code == 400
    
    def test_deposit_invalid_payment_method(self, auth_headers):
        """POST /api/wallet/deposit - invalid payment method"""
        response = requests.post(
            f"{BASE_URL}/api/wallet/deposit",
            headers=auth_headers,
            json={
                "amount": 10.0,
                "currency": "USD",
                "payment_method": "invalid_method"
            }
        )
        assert response.status_code == 400


class TestMembershipEndpoints:
    """Test membership endpoints (authenticated)"""
    
    def test_get_active_membership(self, auth_headers):
        """GET /api/memberships/me/active - returns active membership"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/me/active",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "membership" in data
        assert "has_active" in data
    
    def test_checkin(self, auth_headers):
        """POST /api/memberships/visits/checkin - check in to club"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/visits/checkin",
            headers=auth_headers,
            json={"check_in_method": "manual"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "visit" in data
        
        visit = data["visit"]
        assert "visit_id" in visit
        assert "user_id" in visit
        assert "check_in_time" in visit
        assert visit["check_out_time"] is None
    
    def test_checkout(self, auth_headers):
        """POST /api/memberships/visits/checkout - check out from club"""
        # First check in
        requests.post(
            f"{BASE_URL}/api/memberships/visits/checkin",
            headers=auth_headers,
            json={"check_in_method": "manual"}
        )
        
        # Then check out
        response = requests.post(
            f"{BASE_URL}/api/memberships/visits/checkout",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "visit" in data
        
        visit = data["visit"]
        assert visit["check_out_time"] is not None
        assert "duration_minutes" in visit
    
    def test_get_visit_stats(self, auth_headers):
        """GET /api/memberships/visits/stats - returns visit statistics"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/visits/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "stats" in data
    
    def test_get_visit_config(self):
        """GET /api/memberships/visits/config - returns visit configuration"""
        response = requests.get(f"{BASE_URL}/api/memberships/visits/config")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "config" in data


class TestUserProfileEndpoints:
    """Test user profile endpoints (authenticated)"""
    
    def test_get_my_profile(self, auth_headers):
        """GET /api/users/profile/me - returns user profile"""
        response = requests.get(
            f"{BASE_URL}/api/users/profile/me",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        # Profile may or may not exist
        assert "profile" in data
    
    def test_get_relationships(self, auth_headers):
        """GET /api/users/relationships - returns user relationships"""
        response = requests.get(
            f"{BASE_URL}/api/users/relationships",
            headers=auth_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] is True
        assert "relationships" in data


class TestMultiLanguageSupport:
    """Test multi-language support"""
    
    def test_user_types_spanish(self):
        """User types have Spanish translations"""
        response = requests.get(f"{BASE_URL}/api/users/types?lang=es")
        data = response.json()
        
        for user_type in data["types"]:
            assert "es" in user_type["name"]
    
    def test_user_types_english(self):
        """User types have English translations"""
        response = requests.get(f"{BASE_URL}/api/users/types?lang=en")
        data = response.json()
        
        for user_type in data["types"]:
            assert "en" in user_type["name"]
    
    def test_user_types_chinese(self):
        """User types have Chinese translations"""
        response = requests.get(f"{BASE_URL}/api/users/types?lang=zh")
        data = response.json()
        
        for user_type in data["types"]:
            assert "zh" in user_type["name"]
    
    def test_membership_plans_multilang(self):
        """Membership plans have multi-language support"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        data = response.json()
        
        for plan in data["plans"]:
            assert "es" in plan["name"]
            assert "en" in plan["name"]
            assert "zh" in plan["name"]


class TestWalletConfig:
    """Test wallet configuration details"""
    
    def test_config_has_required_fields(self):
        """Wallet config has all required fields"""
        response = requests.get(f"{BASE_URL}/api/wallet/config")
        config = response.json()["config"]
        
        required_fields = [
            "points_per_dollar",
            "conversion_rate",
            "allow_points_to_usd",
            "allow_usd_to_points",
            "min_points_to_convert",
            "points_per_dollar_spent"
        ]
        
        for field in required_fields:
            assert field in config, f"Missing field: {field}"
    
    def test_conversion_rate_valid(self):
        """Conversion rate is a valid positive number"""
        response = requests.get(f"{BASE_URL}/api/wallet/config")
        config = response.json()["config"]
        
        assert config["conversion_rate"] > 0
        assert config["points_per_dollar"] > 0


class TestMembershipPlans:
    """Test membership plan details"""
    
    def test_plans_have_required_fields(self):
        """Membership plans have all required fields"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json()["plans"]
        
        required_fields = [
            "plan_id", "name", "price", "membership_type",
            "duration_days", "is_active"
        ]
        
        for plan in plans:
            for field in required_fields:
                assert field in plan, f"Plan {plan.get('plan_id')} missing field: {field}"
    
    def test_featured_plan_exists(self):
        """At least one featured plan exists"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json()["plans"]
        
        featured = [p for p in plans if p.get("is_featured")]
        assert len(featured) >= 1, "No featured plan found"
    
    def test_trial_plan_is_free(self):
        """Trial plan has zero price"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json()["plans"]
        
        trial_plans = [p for p in plans if p.get("membership_type") == "trial"]
        for plan in trial_plans:
            assert plan["price"] == 0, f"Trial plan {plan['plan_id']} should be free"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
