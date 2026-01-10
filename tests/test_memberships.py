"""
Test Memberships API - Gestión de membresías y visitas
Tests for:
- GET /api/memberships/plans - list membership plans
- POST /api/memberships/plans - create new plan (admin)
- PUT /api/memberships/plans/{id} - update plan (admin)
- DELETE /api/memberships/plans/{id} - delete plan (admin)
- GET /api/memberships/me/active - get user's active membership
- POST /api/memberships/purchase - purchase membership (with pay_with_points option)
- POST /api/memberships/visits/checkin - register check-in
- POST /api/memberships/visits/checkout - register check-out
- GET /api/memberships/visits/me - user's recent visits
- GET /api/memberships/visits/current - current visitors (admin)
- POST /api/memberships/admin/grant - grant courtesy membership (admin)
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@libreria.com"
ADMIN_PASSWORD = "admin"


class TestMembershipPlans:
    """Test membership plans CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_plans_no_auth(self):
        """GET /api/memberships/plans - should work without auth"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "plans" in data
        assert "count" in data
        print(f"Found {data['count']} plans")
    
    def test_get_plans_structure(self):
        """GET /api/memberships/plans - verify plan structure"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        assert response.status_code == 200
        
        data = response.json()
        plans = data.get("plans", [])
        
        if len(plans) > 0:
            plan = plans[0]
            # Verify plan has required fields
            assert "plan_id" in plan
            assert "name" in plan
            assert "membership_type" in plan
            assert "price" in plan
            assert "duration_days" in plan
            print(f"Plan structure verified: {plan.get('plan_id')}")
    
    def test_get_plans_multilang(self):
        """GET /api/memberships/plans - verify multi-language support"""
        response = requests.get(f"{BASE_URL}/api/memberships/plans?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        plans = data.get("plans", [])
        
        if len(plans) > 0:
            plan = plans[0]
            # Name should be a dict with language keys
            name = plan.get("name", {})
            assert isinstance(name, dict), "Name should be a dict for multi-language"
            print(f"Multi-language name: {name}")
    
    def test_get_single_plan(self):
        """GET /api/memberships/plans/{plan_id} - get single plan"""
        # First get all plans
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        assert response.status_code == 200
        
        plans = response.json().get("plans", [])
        if len(plans) == 0:
            pytest.skip("No plans available to test")
        
        plan_id = plans[0].get("plan_id")
        
        # Get single plan
        response = requests.get(f"{BASE_URL}/api/memberships/plans/{plan_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("plan", {}).get("plan_id") == plan_id
        print(f"Retrieved plan: {plan_id}")
    
    def test_create_plan_requires_admin(self):
        """POST /api/memberships/plans - should require admin auth"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/plans",
            json={
                "name": {"es": "Test Plan", "en": "Test Plan", "zh": "测试计划"},
                "membership_type": "visits",
                "price": 100,
                "duration_days": 30
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Create plan correctly requires admin auth")
    
    def test_create_plan_admin(self, admin_headers):
        """POST /api/memberships/plans - admin can create plan"""
        unique_id = uuid.uuid4().hex[:6]
        plan_data = {
            "name": {
                "es": f"TEST_Plan Prueba {unique_id}",
                "en": f"TEST_Test Plan {unique_id}",
                "zh": f"TEST_测试计划 {unique_id}"
            },
            "description": {
                "es": "Plan de prueba para testing",
                "en": "Test plan for testing",
                "zh": "测试计划"
            },
            "membership_type": "visits",
            "price": 99.99,
            "price_in_points": 9999,
            "total_visits": 5,
            "duration_days": 30,
            "bonus_points": 100,
            "is_featured": False,
            "auto_renew": False
        }
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/plans",
            headers=admin_headers,
            json=plan_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "plan" in data
        
        created_plan = data["plan"]
        assert created_plan.get("price") == 99.99
        assert created_plan.get("total_visits") == 5
        assert created_plan.get("duration_days") == 30
        
        # Store plan_id for cleanup
        self.__class__.created_plan_id = created_plan.get("plan_id")
        print(f"Created plan: {self.__class__.created_plan_id}")
    
    def test_update_plan_admin(self, admin_headers):
        """PUT /api/memberships/plans/{id} - admin can update plan"""
        if not hasattr(self.__class__, 'created_plan_id'):
            pytest.skip("No plan created to update")
        
        plan_id = self.__class__.created_plan_id
        
        response = requests.put(
            f"{BASE_URL}/api/memberships/plans/{plan_id}",
            headers=admin_headers,
            json={
                "price": 149.99,
                "bonus_points": 200
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("plan", {}).get("price") == 149.99
        assert data.get("plan", {}).get("bonus_points") == 200
        print(f"Updated plan: {plan_id}")
    
    def test_delete_plan_admin(self, admin_headers):
        """DELETE /api/memberships/plans/{id} - admin can delete (deactivate) plan"""
        if not hasattr(self.__class__, 'created_plan_id'):
            pytest.skip("No plan created to delete")
        
        plan_id = self.__class__.created_plan_id
        
        response = requests.delete(
            f"{BASE_URL}/api/memberships/plans/{plan_id}",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        print(f"Deleted (deactivated) plan: {plan_id}")
        
        # Verify plan is deactivated
        response = requests.get(f"{BASE_URL}/api/memberships/plans/{plan_id}")
        assert response.status_code == 200
        plan = response.json().get("plan", {})
        assert plan.get("is_active") == False


class TestUserMemberships:
    """Test user membership operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_get_my_active_membership_requires_auth(self):
        """GET /api/memberships/me/active - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/memberships/me/active")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Get active membership correctly requires auth")
    
    def test_get_my_active_membership(self, admin_headers):
        """GET /api/memberships/me/active - get user's active membership"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/me/active",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "membership" in data
        assert "has_active" in data
        print(f"Has active membership: {data.get('has_active')}")
    
    def test_get_my_memberships(self, admin_headers):
        """GET /api/memberships/me - get all user memberships"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/me",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "memberships" in data
        assert "count" in data
        print(f"User has {data.get('count')} memberships")
    
    def test_purchase_membership_requires_auth(self):
        """POST /api/memberships/purchase - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/purchase",
            json={"plan_id": "plan_visits_12", "pay_with_points": False}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Purchase membership correctly requires auth")
    
    def test_purchase_membership_with_cash(self, admin_headers):
        """POST /api/memberships/purchase - purchase with cash"""
        # Get available plans first
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json().get("plans", [])
        
        if len(plans) == 0:
            pytest.skip("No plans available")
        
        # Find an active plan
        active_plan = next((p for p in plans if p.get("is_active")), None)
        if not active_plan:
            pytest.skip("No active plans available")
        
        plan_id = active_plan.get("plan_id")
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/purchase",
            headers=admin_headers,
            json={
                "plan_id": plan_id,
                "pay_with_points": False
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "membership" in data
        
        membership = data["membership"]
        assert membership.get("plan_id") == plan_id
        assert membership.get("status") == "active"
        assert membership.get("paid_with_points") == False
        
        self.__class__.purchased_membership_id = membership.get("membership_id")
        print(f"Purchased membership: {self.__class__.purchased_membership_id}")
    
    def test_purchase_membership_with_points(self, admin_headers):
        """POST /api/memberships/purchase - purchase with ChipiPoints"""
        # Get available plans first
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json().get("plans", [])
        
        # Find a plan with price_in_points
        plan_with_points = next((p for p in plans if p.get("is_active") and p.get("price_in_points", 0) > 0), None)
        if not plan_with_points:
            pytest.skip("No plans with points pricing available")
        
        plan_id = plan_with_points.get("plan_id")
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/purchase",
            headers=admin_headers,
            json={
                "plan_id": plan_id,
                "pay_with_points": True
            }
        )
        # This may fail if user doesn't have enough points, which is expected
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True
            assert data.get("membership", {}).get("paid_with_points") == True
            print(f"Purchased with points: {data.get('membership', {}).get('membership_id')}")
        else:
            # Expected if not enough points
            print(f"Purchase with points failed (expected if insufficient points): {response.status_code}")
            assert response.status_code == 400


class TestVisits:
    """Test visit check-in/check-out operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_checkin_requires_auth(self):
        """POST /api/memberships/visits/checkin - requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/visits/checkin",
            json={"check_in_method": "manual"}
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Check-in correctly requires auth")
    
    def test_checkin(self, admin_headers):
        """POST /api/memberships/visits/checkin - register check-in"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/visits/checkin",
            headers=admin_headers,
            json={
                "check_in_method": "manual"
            }
        )
        
        # May return 400 if already checked in
        if response.status_code == 400:
            data = response.json()
            if "Already checked in" in str(data):
                print("User already checked in - this is expected")
                self.__class__.already_checked_in = True
                return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "visit" in data
        
        visit = data["visit"]
        assert visit.get("check_in_time") is not None
        assert visit.get("check_out_time") is None
        
        self.__class__.visit_id = visit.get("visit_id")
        self.__class__.already_checked_in = False
        print(f"Checked in: {self.__class__.visit_id}")
    
    def test_checkout_requires_auth(self):
        """POST /api/memberships/visits/checkout - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/memberships/visits/checkout")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Check-out correctly requires auth")
    
    def test_checkout(self, admin_headers):
        """POST /api/memberships/visits/checkout - register check-out"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/visits/checkout",
            headers=admin_headers
        )
        
        # May return 400 if not checked in
        if response.status_code == 400:
            data = response.json()
            if "No active visit" in str(data):
                print("No active visit to check out - this is expected if not checked in")
                return
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "visit" in data
        
        visit = data["visit"]
        assert visit.get("check_out_time") is not None
        assert visit.get("duration_minutes") is not None
        print(f"Checked out. Duration: {visit.get('duration_minutes')} minutes")
    
    def test_get_my_visits_requires_auth(self):
        """GET /api/memberships/visits/me - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/memberships/visits/me")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Get visits correctly requires auth")
    
    def test_get_my_visits(self, admin_headers):
        """GET /api/memberships/visits/me - get user's recent visits"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/visits/me?limit=10",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "visits" in data
        assert "count" in data
        print(f"User has {data.get('count')} visits")
    
    def test_get_visit_stats(self, admin_headers):
        """GET /api/memberships/visits/stats - get user's visit statistics"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/visits/stats",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "stats" in data
        
        stats = data["stats"]
        assert "total_visits" in stats
        assert "visits_this_month" in stats
        assert "avg_duration_minutes" in stats
        print(f"Visit stats: {stats}")
    
    def test_get_current_visitors_requires_admin(self):
        """GET /api/memberships/visits/current - requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/memberships/visits/current")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Get current visitors correctly requires admin auth")
    
    def test_get_current_visitors(self, admin_headers):
        """GET /api/memberships/visits/current - get current visitors (admin)"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/visits/current",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "visitors" in data
        assert "count" in data
        print(f"Current visitors: {data.get('count')}")


class TestAdminMembershipOperations:
    """Test admin membership operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth-v2/login",
            json={"email": ADMIN_EMAIL, "contrasena": ADMIN_PASSWORD}
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("token") or data.get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Get headers with admin token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def admin_user_id(self, admin_headers):
        """Get admin user ID"""
        response = requests.get(
            f"{BASE_URL}/api/auth-v2/me",
            headers=admin_headers
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("user", {}).get("cliente_id") or data.get("cliente_id")
        return None
    
    def test_grant_membership_requires_admin(self):
        """POST /api/memberships/admin/grant - requires admin auth"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/admin/grant?user_id=test&plan_id=test"
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("Grant membership correctly requires admin auth")
    
    def test_grant_membership(self, admin_headers, admin_user_id):
        """POST /api/memberships/admin/grant - grant courtesy membership"""
        if not admin_user_id:
            pytest.skip("Could not get admin user ID")
        
        # Get available plans
        response = requests.get(f"{BASE_URL}/api/memberships/plans")
        plans = response.json().get("plans", [])
        
        # Find courtesy plan or any active plan
        courtesy_plan = next((p for p in plans if p.get("membership_type") == "courtesy" and p.get("is_active")), None)
        if not courtesy_plan:
            courtesy_plan = next((p for p in plans if p.get("is_active")), None)
        
        if not courtesy_plan:
            pytest.skip("No active plans available")
        
        plan_id = courtesy_plan.get("plan_id")
        
        response = requests.post(
            f"{BASE_URL}/api/memberships/admin/grant",
            headers=admin_headers,
            params={
                "user_id": admin_user_id,
                "plan_id": plan_id,
                "sponsor_note": "TEST_Courtesy membership for testing"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "membership" in data
        
        membership = data["membership"]
        assert membership.get("user_id") == admin_user_id
        assert membership.get("plan_id") == plan_id
        assert membership.get("sponsor_note") == "TEST_Courtesy membership for testing"
        print(f"Granted membership: {membership.get('membership_id')}")
    
    def test_get_visit_config(self, admin_headers):
        """GET /api/memberships/visits/config - get visit configuration"""
        response = requests.get(
            f"{BASE_URL}/api/memberships/visits/config",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "config" in data
        
        config = data["config"]
        assert "min_duration_minutes" in config
        assert "auto_checkout_hours" in config
        print(f"Visit config: {config}")
    
    def test_initialize_plans(self, admin_headers):
        """POST /api/memberships/plans/initialize - initialize default plans"""
        response = requests.post(
            f"{BASE_URL}/api/memberships/plans/initialize",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert "initialized" in data
        print(f"Initialized {data.get('initialized')} plans")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
